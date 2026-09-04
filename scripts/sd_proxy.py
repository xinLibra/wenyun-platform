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

    # ---------- 两段合成：框（几何）+ 花（花卉） ----------
    def _composite_fusion(self, frame_bytes: bytes, flower_bytes: bytes) -> bytes:
        frame = Image.open(io.BytesIO(frame_bytes)).convert("RGBA")
        flower = Image.open(io.BytesIO(flower_bytes)).convert("RGBA")
        w, h = frame.size
        target = max(64, int(min(w, h) * 0.62))
        # 花：等比缩放 + 中心裁方
        fw, fh = flower.size
        side = min(fw, fh)
        left, top = (fw - side) // 2, (fh - side) // 2
        flower = flower.crop((left, top, left + side, top + side)).resize(
            (target, target), Image.LANCZOS
        )
        # 径向软边蒙版：中心不透明，边缘渐隐，让花像嵌进开窗里
        mask = Image.new("L", (target, target), 0)
        mpx = mask.load()
        center = (target - 1) / 2.0
        radius = target / 2.0
        feather = max(1.0, radius * 0.22)
        for y in range(target):
            for x in range(target):
                dist = math.hypot(x - center, y - center)
                if dist <= radius - feather:
                    mpx[x, y] = 255
                elif dist <= radius:
                    mpx[x, y] = int(255 * (radius - dist) / feather)
        px = (w - target) // 2
        py = (h - target) // 2
        frame.paste(flower, (px, py), mask)
        out = io.BytesIO()
        frame.convert("RGB").save(out, format="PNG")
        return out.getvalue()

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
            print("[sd_proxy] composite failed, fallback to frame: %s" % e, flush=True)
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
