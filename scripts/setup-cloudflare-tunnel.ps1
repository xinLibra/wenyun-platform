<#
.SYNOPSIS
  Cloudflare Tunnel 一次性部署脚本：把本地 sd_proxy (8787) 暴露为永久固定域名
  脚本幂等可重跑，已完成的步骤会跳过。

.PREREQ
  1. Cloudflare 账号（免费即可）
  2. 一个域名已托管到 Cloudflare（NS 已切到 Cloudflare）
  3. 本地 sd_proxy.py 已在 8787 端口运行（HOST=0.0.0.0）

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts\setup-cloudflare-tunnel.ps1
#>

$ErrorActionPreference = "Stop"
$WORKDIR = "$env:USERPROFILE\.cloudflared-wenyun"
$TUNNEL_NAME = "wenyun-sd-proxy"

function Write-Step($n, $msg) { Write-Host "`n========== Step $n: $msg ==========" -ForegroundColor Cyan }
function Write-Ok($msg)       { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info($msg)     { Write-Host "[i] $msg" -ForegroundColor Yellow }
function Pause-For-User       { Read-Host "`n按回车继续（如需先去浏览器操作）" | Out-Null }

# ---------- 0. 准备工作目录 ----------
New-Item -ItemType Directory -Force -Path $WORKDIR | Out-Null
$env:CLOUDFLARED_CONFIG_DIR = $WORKDIR  # cloudflared 把 cert.json / config.yml 都放这里
Write-Host "工作目录: $WORKDIR"

# ---------- Step 1: 检查 / 安装 cloudflared ----------
Write-Step 1 "检查 cloudflared"
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
    Write-Info "未找到 cloudflared，使用 winget 安装..."
    winget install --id Cloudflare.cloudflared --silent --accept-package-agreements --accept-source-agreements
    # 刷新当前会话 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $cf = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $cf) {
        Write-Host "winget 安装失败，请手动下载 https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Red
        exit 1
    }
}
Write-Ok "cloudflared: $($cf.Source)"

# ---------- Step 2: 登录 Cloudflare ----------
Write-Step 2 "登录 Cloudflare（浏览器授权）"
$certFile = Join-Path $WORKDIR "cert.pem"
if (Test-Path $certFile) {
    Write-Ok "已存在 cert.pem，跳过登录"
} else {
    Write-Info "即将打开浏览器，请在浏览器中选择你的域名根域（如 your-domain.com）授权"
    Pause-For-User
    cloudflared tunnel login
    if (-not (Test-Path $certFile)) {
        Write-Host "登录失败：未找到 cert.pem，请检查授权是否完成" -ForegroundColor Red
        exit 1
    }
    Write-Ok "登录完成，cert.pem 已生成"
}

# ---------- Step 3: 创建命名 Tunnel ----------
Write-Step 3 "创建命名 Tunnel: $TUNNEL_NAME"
$tunnels = cloudflared tunnel list 2>$null | Select-String $TUNNEL_NAME
$uuid = $null
if ($tunnels) {
    # 已存在，提取 UUID
    $line = ($tunnels | Select-Object -First 1).ToString()
    if ($line -match "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})") {
        $uuid = $matches[1]
    }
    Write-Ok "Tunnel 已存在，UUID = $uuid"
} else {
    Write-Info "正在创建 tunnel..."
    $createOutput = cloudflared tunnel create $TUNNEL_NAME
    if ($createOutput -match "Created tunnel ([0-9a-f-]{36})") {
        $uuid = $matches[1]
        Write-Ok "Tunnel 创建成功，UUID = $uuid"
    } elseif ($createOutput -match "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})") {
        $uuid = $matches[1]
        Write-Ok "Tunnel 创建成功，UUID = $uuid"
    } else {
        Write-Host "创建失败，原始输出：" -ForegroundColor Red
        Write-Host $createOutput
        exit 1
    }
}

if (-not $uuid) {
    Write-Host "无法获取 Tunnel UUID，请检查 cloudflared tunnel list 输出" -ForegroundColor Red
    exit 1
}

# ---------- Step 4: 绑定子域名 ----------
Write-Step 4 "绑定子域名（CNAME → tunnel）"
$zone = Read-Host "请输入你的根域名（如 your-domain.com）"
$subdomain = Read-Host "请输入子域名前缀（直接回车默认 sd-api）"
if (-not $subdomain) { $subdomain = "sd-api" }
$fullDomain = "$subdomain.$zone"
Write-Info "将为 $fullDomain 创建 CNAME → ${uuid}.cfargotunnel.com"
$confirm = Read-Host "确认执行？（y/N）"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    cloudflared tunnel route dns $TUNNEL_NAME $fullDomain
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "DNS 路由已创建，等待 1-2 分钟全球 DNS 生效"
    } else {
        Write-Host "DNS 路由创建失败（可能记录已存在，可忽略）" -ForegroundColor Yellow
    }
} else {
    Write-Info "跳过 DNS 绑定，后续可手动执行: cloudflared tunnel route dns $TUNNEL_NAME $fullDomain"
}

# ---------- Step 5: 生成 config.yml ----------
Write-Step 5 "生成 config.yml"
$configFile = Join-Path $WORKDIR "config.yml"
$credentialsFile = Join-Path $WORKDIR "$uuid.json"
$configContent = @"
tunnel: $uuid
credentials-file: $credentialsFile

ingress:
  - hostname: $fullDomain
    service: http://localhost:8787
  - service: http_status:404
"@
$configContent | Out-File -FilePath $configFile -Encoding utf8 -Force
Write-Ok "config.yml 已写入: $configFile"
Write-Host "--- config.yml ---"
Get-Content $configFile

# ---------- Step 6: 启动 Tunnel ----------
Write-Step 6 "启动 Tunnel（前台运行）"
Write-Host ""
Write-Host "永久固定地址：" -ForegroundColor Green
Write-Host "  https://$fullDomain" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "  1. 部署站后台（Netlify/Vercel）配置环境变量：" -ForegroundColor White
Write-Host "       VITE_SD_API_URL=https://$fullDomain" -ForegroundColor White
Write-Host "  2. 触发前端重新部署" -ForegroundColor White
Write-Host "  3. 在本窗口运行 tunnel（前台模式，便于看日志）：" -ForegroundColor White
Write-Host "       cloudflared tunnel --config `"$configFile`" run" -ForegroundColor White
Write-Host ""
Write-Host "  或者作为 Windows 服务安装（开机自启）：" -ForegroundColor White
Write-Host "       cloudflared service install" -ForegroundColor White
Write-Host "       （服务模式会自动读取 $configFile，前提是用绝对路径）" -ForegroundColor White
Write-Host ""
$runNow = Read-Host "是否现在前台启动 tunnel？（y/N）"
if ($runNow -eq "y" -or $runNow -eq "Y") {
    Write-Info "Tunnel 启动中，Ctrl+C 退出。请不要关闭此窗口。"
    cloudflared tunnel --config $configFile run
} else {
    Write-Ok "脚本结束。手动启动命令见上方说明。"
}
