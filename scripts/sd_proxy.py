"""
纹样生成本地代理（零依赖，仅用 Python 标准库）

作用：
    接收前端 /sd-api/generate 请求 → 转发到本机 A1111 WebUI /sdapi/v1/txt2img
    → 把返回的 images[0]（base64）整理成 data URL 返回前端

启动：
    python scripts/sd_proxy.py
默认监听：http://127.0.0.1:8787

环境变量：
    SDAPI_URL       默认 http://127.0.0.1:7860
    SD_PROXY_HOST   默认 127.0.0.1
    SD_PROXY_PORT   默认 8787
    SD_PROXY_OUTPUT_DIR  若设置，会把图片同时落盘到该目录，并在响应里返回 file_path

测试：
    curl -X POST http://127.0.0.1:8787/generate ^
      -H "Content-Type: application/json" ^
      -d "{\"prompt\":\"a tiger\",\"negative_prompt\":\"blurry\",\"steps\":10}"
"""
from __future__ import annotations

import base64
import io
import json
import os
import time
import uuid
import math
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import request, error

try:
    from PIL import Image  # 仅用于「几何框 + 花卉」两段合成；缺失时退化返回框底图
    _HAS_PIL = True
except Exception:  # noqa: BLE001
    _HAS_PIL = False

# ---------- 配置 ----------
SDAPI_URL = os.environ.get("SDAPI_URL", "http://127.0.0.1:7860").rstrip("/")
HOST = os.environ.get("SD_PROXY_HOST", "0.0.0.0")
try:
    PORT = int(os.environ.get("SD_PROXY_PORT", "8787"))
except ValueError:
    PORT = 8787
OUTPUT_DIR = os.environ.get("SD_PROXY_OUTPUT_DIR", "")
TXT2IMG_ENDPOINT = SDAPI_URL + "/sdapi/v1/txt2img"
OPTIONS_ENDPOINT = SDAPI_URL + "/sdapi/v1/options"
LORAS_ENDPOINT = SDAPI_URL + "/sdapi/v1/loras"

# 默认推理参数（与前端 patternGeneration.ts 的 SD_DEFAULTS 对齐）
DEFAULT_BODY = {
    "width": 512,
    "height": 512,
    "steps": 28,
    "cfg_scale": 7,
    "sampler_name": "Euler a",
    "seed": -1,
    "batch_size": 1,
    "n_iter": 1,
    "do_not_save_samples": True,
}

CORS_HEADERS = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type"),
]


class ProxyHandler(BaseHTTPRequestHandler):
    # 让日志走 stdout，便于排查
    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args), flush=True)

    # ---------- 通用回应 ----------
    def _send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        for k, v in CORS_HEADERS:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _handle_cors(self) -> None:
        self.send_response(204)
        for k, v in CORS_HEADERS:
            self.send_header(k, v)
        self.end_headers()

    # ---------- 路由 ----------
    def do_OPTIONS(self) -> None:
        self._handle_cors()

    def do_GET(self) -> None:
        if self.path in ("/", "/health"):
            self._send_json(200, {
                "ok": True,
                "service": "sd_proxy",
                "sdapi_url": SDAPI_URL,
            })
            return
        if self.path == "/sd-status":
            try:
                with request.urlopen(OPTIONS_ENDPOINT, timeout=5) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                self._send_json(200, {
                    "ok": True,
                    "sd_model_checkpoint": payload.get("sd_model_checkpoint"),
                })
                return
            except Exception as e:  # noqa: BLE001
                self._send_json(502, {"ok": False, "error": str(e)})
                return
        if self.path == "/loras":
            try:
                with request.urlopen(LORAS_ENDPOINT, timeout=10) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                names = [item.get("name") for item in payload if isinstance(item, dict)]
                self._send_json(200, {"ok": True, "loras": names, "count": len(names)})
                return
            except Exception as e:  # noqa: BLE001
                self._send_json(502, {"ok": False, "error": str(e)})
                return
        self._send_json(404, {"error": "not found", "path": self.path})

    # ---------- 复用：单次 txt2img ----------
    def _call_txt2img(self, body: dict) -> tuple[bytes, int, str, str]:
        data = json.dumps(body).encode("utf-8")
        req_obj = request.Request(
            TXT2IMG_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        t0 = time.time()
        try:
            with request.urlopen(req_obj, timeout=10 * 60) as resp:
                resp_bytes = resp.read()
        except error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError("WebUI HTTP %d: %s" % (e.code, detail)) from e
        except Exception as e:  # noqa: BLE001
            raise RuntimeError("WebUI unreachable: %s" % e) from e
        elapsed = time.time() - t0
        print("[sd_proxy] <- txt2img elapsed=%.1fs" % elapsed, flush=True)

        payload = json.loads(resp_bytes.decode("utf-8"))
        images = payload.get("images") or []
        if not images:
            raise RuntimeError("WebUI returned no images: %s" % str(payload)[:300])
        b64 = images[0]
        if isinstance(b64, dict):
            b64 = b64.get("image") or b64.get("b64_json") or ""
        if not isinstance(b64, str) or not b64:
            raise RuntimeError("WebUI returned empty image payload")
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        img_bytes = base64.b64decode(b64, validate=True)
        if len(img_bytes) < 10 * 1024:
            raise RuntimeError("WebUI image too small: %d bytes" % len(img_bytes))

        seed = -1
        info = payload.get("info")
        if isinstance(info, str):
            try:
                seed = int(json.loads(info).get("seed", -1))
            except Exception:  # noqa: BLE001
                pass
        elif isinstance(info, dict):
            seed = int(info.get("seed", -1))
        return img_bytes, seed, json.dumps(info) if not isinstance(info, str) else (info or ""), b64

    # ---------- 两段合成辅助：内区检测 / 背景采样 / 色键抠底 ----------
    @staticmethod
    def _ring_median(img, edge_frac: float = 0.03):
        """取图像四周边带（默认 3%）抽样像素的各通道中位数，作为背景色参考。

        用于定位 flower 层背景（浅素底）。返回 (r,g,b)；无样本返回 None。
        """
        w, h = img.size
        edge = max(3, int(min(w, h) * edge_frac))
        rs, gs, bs = [], [], []
        step = 5
        for y in range(0, h, step):
            for x in range(0, w, step):
                if x < edge or y < edge or x >= w - edge or y >= h - edge:
                    p = img.getpixel((x, y))
                    rs.append(p[0])
                    gs.append(p[1])
                    bs.append(p[2])
        if not rs:
            return None
        n = len(rs) // 2
        rs.sort()
        gs.sort()
        bs.sort()
        return (rs[n], gs[n], bs[n])

    @staticmethod
    def _detect_inner_rect(img):
        """检测「空心开窗」frame 图里的大面积留白内区，返回原图坐标 (l, t, r, b)。

        思路：128px 缩略图做边缘检测；在排除四角的中心带内，沿上下左右四方向从图像中心
        向外扫描「高纹理 run（允许 ≤2px 缝隙，容忍双层框间隙）」，run 的最内侧起点即边框
        内缘。四方向中 ≥2 个方向找不到框 → 判定不是空心开窗图，返回 None。
        """
        try:
            from PIL import ImageFilter
        except Exception:  # noqa: BLE001
            return None
        W, H = img.size
        gwh = 128
        small = img.convert("L").resize((gwh, gwh), Image.BILINEAR)
        edges = small.filter(ImageFilter.FIND_EDGES)
        ed = edges.load()
        band = max(6, int(0.2 * gwh))  # 中心带半宽（排除四角装饰）
        cx = cy = gwh // 2
        th = 30

        def col_tex(x, y0, y1):
            n = y1 - y0
            if n <= 0:
                return 0.0
            cnt = 0
            for y in range(y0, y1):
                if ed[x, y] > th:
                    cnt += 1
            return cnt / n

        def row_tex(y, x0, x1):
            n = x1 - x0
            if n <= 0:
                return 0.0
            cnt = 0
            for x in range(x0, x1):
                if ed[x, y] > th:
                    cnt += 1
            return cnt / n

        def scan(start, step, measure, lo, hi):
            """从中心向外扫：返回高纹理 run 的起点（= 边框带内侧边缘）；找不到返回 None。"""
            run_start = None
            gap = 0
            x = start
            while lo <= x <= hi:
                if measure(x) > 0.28:
                    if run_start is None:
                        run_start = x
                    gap = 0
                elif run_start is not None:
                    gap += 1
                    if gap > 2:
                        run_start = None
                        gap = 0
                x += step
            return run_start

        y0b, y1b = cy - band, cy + band  # 竖中心带（测左右框）
        x0b, x1b = cx - band, cx + band  # 横中心带（测上下框）
        left = scan(cx, -1, lambda x: col_tex(x, y0b, y1b), 0, cx)
        right = scan(cx, 1, lambda x: col_tex(x, y0b, y1b), cx, gwh - 1)
        top = scan(cy, -1, lambda y: row_tex(y, x0b, x1b), 0, cy)
        bottom = scan(cy, 1, lambda y: row_tex(y, x0b, x1b), cy, gwh - 1)
        found = sum(1 for v in (left, right, top, bottom) if v is not None)
        if found < 2:
            return None

        # 缺某一方向边框时按对称默认补齐（边框厚 ≈ 全图 9%）
        dfl = int(gwh * 0.09)
        if left is None:
            left = dfl
        if right is None:
            right = gwh - 1 - dfl
        if top is None:
            top = dfl
        if bottom is None:
            bottom = gwh - 1 - dfl
        if right < left + 2:
            right = left + 2
        if bottom < top + 2:
            bottom = top + 2

        # 缩回原图并各向内收 1.5% 防切到边框描边
        mx = max(2, W // 64)
        my = max(2, H // 64)
        l = max(0, int(left * W / gwh) + mx)
        t = max(0, int(top * H / gwh) + my)
        r = min(W - 1, int(right * W / gwh) - mx)
        b = min(H - 1, int(bottom * H / gwh) - my)
        if r <= l or b <= t:
            return None
        return (l, t, r, b)

    @staticmethod
    def _color_key_mask(flower_rgb, bg):
        """色键抠底：把与背景色接近的像素 alpha 置 0（浅素底 → 挖空），
        花/枝/叶（与 bg 色距大）保留，中间态线性过渡（无灰圆补丁）。
        返回 (RGBA 图, 前景像素占比)。
        """
        fa = flower_rgb.convert("RGBA")
        fpx = fa.load()
        tw, th = fa.size
        t1 = 90 * 90  # 距 bg 欧氏平方 ≤ t1 → 全透明
        t2 = 320 * 320  # ≥ t2 → 全保留
        bg_r, bg_g, bg_b = bg
        fg = 0
        tot = max(1, tw * th)
        for y in range(th):
            for x in range(tw):
                r, g, b, a = fpx[x, y]
                dr = r - bg_r
                dg = g - bg_g
                db = b - bg_b
                d = dr * dr + dg * dg + db * db
                if d <= t1:
                    av = 0
                elif d >= t2:
                    av = 255
                else:
                    av = int(255 * (d - t1) / (t2 - t1))
                fpx[x, y] = (r, g, b, av)
                if av > 96:
                    fg += 1
        return fa, fg / tot

    # ---------- 两段合成：框（几何）+ 花（花卉） ----------
    def _composite_fusion(self, frame_bytes: bytes, flower_bytes: bytes) -> bytes:
        """两段合成 v2（2026-09-04 开窗版）：开窗几何框 + 内区色地 + 中心枝态花。

        不再用「小半径圆形径向软边把花缩成圆牌」：
        1) 检测 frame 图内区留白矩形，找不到用默认中心 72% 矩形并打 warning；
        2) flower 图等比放进内区 70–85%（取 0.78）中心——形状跟花图，不裁正圆徽章；
        3) 色键抠底（挖浅素背景）→ 露出的全是 frame 内区色地（无灰补丁）；
        4) 边框像素原样保留。
        """
        try:
            frame = Image.open(io.BytesIO(frame_bytes)).convert("RGB")
            flower = Image.open(io.BytesIO(flower_bytes)).convert("RGB")
        except Exception:  # noqa: BLE001
            print("[sd_proxy] composite failed: cannot decode frame/flower", flush=True)
            return None
        w, h = frame.size

        # 1) 内区矩形（开窗留白区）
        inner = self._detect_inner_rect(frame)
        if inner is None:
            print("[sd_proxy] warn: no empty inner field detected, use default 72% center rect", flush=True)
            mg = int(min(w, h) * 0.14)
            inner = (mg, mg, w - mg, h - mg)
        l0, t0, r0, b0 = inner
        iw, ih = r0 - l0, b0 - t0
        if iw < 16 or ih < 16:
            print("[sd_proxy] composite failed: inner rect too small %s" % (inner,), flush=True)
            return None

        # 2) 花层等比放进内区 78%（宁可小一圈也不裁切边框）
        fw, fh = flower.size
        if fw < 8 or fh < 8:
            print("[sd_proxy] composite failed: flower image too small", flush=True)
            return None
        box_w = max(16, int(iw * 0.78))
        box_h = max(16, int(ih * 0.78))
        ratio = min(box_w / fw, box_h / fh)
        tw, th = max(8, int(fw * ratio)), max(8, int(fh * ratio))
        flower2 = flower.resize((tw, th), Image.LANCZOS)

        # 3) 背景色键抠底
        bg = self._ring_median(flower2)
        if bg is None:
            bg = (245, 245, 245)
        try:
            flower_a, fg_ratio = self._color_key_mask(flower2, bg)
        except Exception as exc:  # noqa: BLE001
            print("[sd_proxy] composite failed: color-key error %r" % (exc,), flush=True)
            return None
        print(
            "[sd_proxy] composite: inner=(%d,%d,%d,%d) flower %dx%d -> %dx%d bg=%s fg_ratio=%.2f"
            % (l0, t0, r0, b0, fw, fh, tw, th, str(bg), fg_ratio),
            flush=True,
        )

        # 4) 贴进内区中心（保留边框像素）
        out = frame.convert("RGBA")
        ox = l0 + (iw - tw) // 2
        oy = t0 + (ih - th) // 2
        if fg_ratio < 0.12:
            # 花层几乎被抠空（背景不匀 / 花图异常）→ 明确日志 + 退化为内区软矩形贴图，
            # 不再退回「只有框底图糊弄」：花图仍以羽化矩形叠进内区。
            print(
                "[sd_proxy] warn: color-key cleared most flower pixels (fg=%.2f), fallback to soft-rect overlay" % fg_ratio,
                flush=True,
            )
            rect = Image.new("L", (tw, th), 0)
            fx = max(4, tw // 40)
            fy = max(4, th // 40)
            rp = rect.load()
            for yy in range(th):
                for xx in range(tw):
                    axx = min(xx, tw - 1 - xx) / fx
                    ayy = min(yy, th - 1 - yy) / fy
                    a = min(axx, ayy, 1.0)
                    rp[xx, yy] = int(255 * min(a, 0.92))
            out.paste(flower2, (ox, oy), rect)
        else:
            out.paste(flower_a, (ox, oy), flower_a)

        print("[sd_proxy] composite ok: inner=%s flower->%s" % (str(inner), str((tw, th))), flush=True)
        buf = io.BytesIO()
        out.convert("RGB").save(buf, format="PNG")
        return buf.getvalue()

    def _handle_composite(self, req: dict) -> None:
        if not _HAS_PIL:
            self._send_json(502, {"error": "composite requires PIL (pip install pillow)"})
            return
        comp = req.get("composite") or {}
        frame_cfg = comp.get("frame") or {}
        flower_cfg = comp.get("flower") or {}
        if not frame_cfg.get("prompt") or not flower_cfg.get("prompt"):
            self._send_json(400, {"error": "composite needs frame.prompt and flower.prompt"})
            return

        base = dict(DEFAULT_BODY)
        for k in ("width", "height", "steps", "cfg_scale", "sampler_name", "seed"):
            if k in req:
                base[k] = req[k]
        frame_body = dict(base)
        frame_body["prompt"] = frame_cfg["prompt"]
        frame_body["negative_prompt"] = frame_cfg.get("negative_prompt", "")
        flower_body = dict(base)
        flower_body["prompt"] = flower_cfg["prompt"]
        flower_body["negative_prompt"] = flower_cfg.get("negative_prompt", "")

        try:
            frame_bytes, _, _, _ = self._call_txt2img(frame_body)
            flower_bytes, flower_seed, _, _ = self._call_txt2img(flower_body)
        except Exception as e:  # noqa: BLE001
            self._send_json(502, {"error": str(e)})
            return

        try:
            merged = self._composite_fusion(frame_bytes, flower_bytes)
        except Exception as e:  # noqa: BLE001
            print("[sd_proxy] composite FAILED, fallback to frame-only (flower lost): %s" % e, flush=True)
            merged = frame_bytes

        merged_b64 = base64.b64encode(merged).decode("ascii")
        data_url = "data:image/png;base64," + merged_b64
        gen_id = "sd-%d-%s" % (int(time.time() * 1000), uuid.uuid4().hex[:6])
        print("[sd_proxy] composite ok: frame=%d flower=%d merged=%d" % (
            len(frame_bytes), len(flower_bytes), len(merged)), flush=True)
        file_path = None
        if OUTPUT_DIR:
            try:
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                fpath = os.path.join(OUTPUT_DIR, "pattern_%s.png" % gen_id)
                with open(fpath, "wb") as f:
                    f.write(merged)
                file_path = fpath
            except Exception as e:  # noqa: BLE001
                print("[sd_proxy] warn: save composite failed: %s" % e, flush=True)
        self._send_json(200, {
            "image_url": data_url,
            "generation_id": gen_id,
            "seed": flower_seed,
            "elapsed_ms": None,
            "file_path": file_path,
            "info": "composite: frame + flower",
        })

    def do_POST(self) -> None:
        if self.path != "/generate":
            self._send_json(404, {"error": "not found", "path": self.path})
            return

        # 读 body
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            length = 0
        raw = self.rfile.read(length) if length > 0 else b""
        if not raw:
            self._send_json(400, {"error": "empty body"})
            return

        try:
            req = json.loads(raw.decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            self._send_json(400, {"error": "invalid json: %s" % e})
            return

        # 几何+花卉「两段合成」：frame + flower 分开出图再合成
        if isinstance(req, dict) and req.get("composite"):
            self._handle_composite(req)
            return

        # 合并默认值；前端可覆盖
        body = dict(DEFAULT_BODY)
        for k in ("prompt", "negative_prompt", "width", "height", "steps",
                  "cfg_scale", "sampler_name", "seed"):
            if k in req:
                body[k] = req[k]
        # 没传 negative_prompt 就空串
        body.setdefault("negative_prompt", "")
        if not body.get("prompt"):
            self._send_json(400, {"error": "missing prompt"})
            return

        gen_id = "sd-%d-%s" % (int(time.time() * 1000), uuid.uuid4().hex[:6])
        print("[sd_proxy] -> txt2img prompt=%r steps=%s cfg=%s seed=%s lora_in_prompt=%s"
              % (body.get("prompt", "")[:120], body.get("steps"), body.get("cfg_scale"),
                 body.get("seed"), "<lora:" in body.get("prompt", "")), flush=True)

        # 转发
        data = json.dumps(body).encode("utf-8")
        req_obj = request.Request(
            TXT2IMG_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        t0 = time.time()
        try:
            with request.urlopen(req_obj, timeout=10 * 60) as resp:
                resp_bytes = resp.read()
        except error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")[:500]
            self._send_json(502, {
                "error": "WebUI HTTP %d" % e.code,
                "detail": body_text,
            })
            return
        except Exception as e:  # noqa: BLE001
            self._send_json(502, {"error": "WebUI unreachable: %s" % e})
            return

        elapsed = time.time() - t0
        print("[sd_proxy] <- txt2img elapsed=%.1fs" % elapsed, flush=True)

        try:
            payload = json.loads(resp_bytes.decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            self._send_json(502, {"error": "bad response from WebUI: %s" % e})
            return

        images = payload.get("images") or []
        if not images:
            self._send_json(502, {"error": "WebUI returned no images", "raw": str(payload)[:300]})
            return

        b64 = images[0]
        # A1111 返回的 base64 字符串里有时会带 data: 前缀；统一剥掉再重新拼
        if isinstance(b64, dict):
            b64 = b64.get("image") or b64.get("b64_json") or ""
        if not isinstance(b64, str) or not b64:
            self._send_json(502, {"error": "WebUI returned empty image payload"})
            return
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]

        # 解码并校验：只把有效的 PNG/JPEG 当成功返回；空/损坏/极小图一律 502
        try:
            img_bytes = base64.b64decode(b64, validate=True)
        except Exception as e:  # noqa: BLE001
            self._send_json(502, {"error": "WebUI image is not valid base64: %s" % e})
            return
        if len(img_bytes) < 10 * 1024:
            self._send_json(502, {
                "error": "WebUI image too small: %d bytes" % len(img_bytes),
            })
            return
        is_png = img_bytes[:8] == b"\x89PNG\r\n\x1a\n"
        is_jpeg = img_bytes[:3] == b"\xff\xd8\xff"
        if not (is_png or is_jpeg):
            self._send_json(502, {
                "error": "WebUI image header invalid: %r" % img_bytes[:8].hex(),
            })
            return

        data_url = "data:image/png;base64," + b64
        print("[sd_proxy] image ok: b64_len=%d decoded_bytes=%d header=%s"
              % (len(b64), len(img_bytes), img_bytes[:8].hex()), flush=True)

        # 解析 info 里的 seed
        seed = -1
        info_text = ""
        info = payload.get("info")
        if isinstance(info, str):
            info_text = info
            try:
                info_obj = json.loads(info)
                seed = int(info_obj.get("seed", -1))
            except Exception:  # noqa: BLE001
                pass
        elif isinstance(info, dict):
            seed = int(info.get("seed", -1))
            info_text = json.dumps(info)

        # 可选：落盘
        file_path = None
        if OUTPUT_DIR:
            try:
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                fname = "pattern_%s.png" % gen_id
                fpath = os.path.join(OUTPUT_DIR, fname)
                with open(fpath, "wb") as f:
                    f.write(base64.b64decode(b64))
                file_path = fpath
            except Exception as e:  # noqa: BLE001
                print("[sd_proxy] warn: save to disk failed: %s" % e, flush=True)

        self._send_json(200, {
            "image_url": data_url,
            "generation_id": gen_id,
            "seed": seed,
            "elapsed_ms": int(elapsed * 1000),
            "file_path": file_path,
            "info": info_text,
        })


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), ProxyHandler)
    print("=" * 60, flush=True)
    print("sd_proxy listening on http://%s:%d" % (HOST, PORT), flush=True)
    print("  WebUI SDAPI:        %s" % SDAPI_URL, flush=True)
    print("  txt2img endpoint:   %s" % TXT2IMG_ENDPOINT, flush=True)
    if OUTPUT_DIR:
        print("  output dir:         %s" % OUTPUT_DIR, flush=True)
    print("Routes:", flush=True)
    print("  GET  /health        健康检查", flush=True)
    print("  GET  /sd-status     探测 WebUI 当前模型", flush=True)
    print("  GET  /loras         列出 WebUI 已加载 LoRA", flush=True)
    print("  POST /generate      转发 txt2img（前端用）", flush=True)
    print("=" * 60, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[sd_proxy] shutting down", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
