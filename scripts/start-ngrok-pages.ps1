<#
.SYNOPSIS
  One-click: start ngrok + update Cloudflare Pages env + trigger redeploy
.USAGE
  powershell -ExecutionPolicy Bypass -File scripts\start-ngrok-pages.ps1
#>
$ErrorActionPreference = "Stop"

$CONFIG_FILE = Join-Path $PSScriptRoot ".ngrok-pages.env.json"
$NgrokPort = 8787
$PagesProjectName = "wenyun-platform"
$PagesEnvKey = "VITE_SD_API_URL"

if (Test-Path $CONFIG_FILE) {
    $cfg = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json
    Write-Host "[OK] Loaded config: Account=$($cfg.CloudflareAccountId) Project=$PagesProjectName" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Config file not found: $CONFIG_FILE" -ForegroundColor Red
    exit 1
}

$token = $cfg.CloudflareApiToken
$accountId = $cfg.CloudflareAccountId
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$baseUrl = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$PagesProjectName"

# ========== Step 1: Check ngrok ==========
Write-Host "`n========== Step 1: Check ngrok ==========" -ForegroundColor Cyan
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
    Write-Host "[ERROR] ngrok not found. Install from https://ngrok.com" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] ngrok: $($ngrok.Source)" -ForegroundColor Green

# ========== Step 2: Start ngrok ==========
Write-Host "`n========== Step 2: Start ngrok (port $NgrokPort) ==========" -ForegroundColor Cyan
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$ngrokProc = Start-Process -FilePath "ngrok" -ArgumentList "http", $NgrokPort -PassThru -NoNewWindow
Write-Host "[OK] ngrok started (PID=$($ngrokProc.Id)), waiting..." -ForegroundColor Green

$ngrokUrl = $null
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $waited += 2
    try {
        $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
        if ($tunnels.tunnels -and $tunnels.tunnels.Count -gt 0) {
            $ngrokUrl = $tunnels.tunnels[0].public_url
            break
        }
    } catch {}
    Write-Host "  Waiting... ($waited / $maxWait)s" -ForegroundColor DarkGray
}

if (-not $ngrokUrl) {
    Write-Host "[ERROR] ngrok timeout. Check authtoken: ngrok config check" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] ngrok tunnel: $ngrokUrl" -ForegroundColor Green

# ========== Step 3: Update Pages env ==========
Write-Host "`n========== Step 3: Update Pages env ==========" -ForegroundColor Cyan

# First GET current config
try {
    $project = Invoke-RestMethod -Uri $baseUrl -Headers $headers -TimeoutSec 10
} catch {
    Write-Host "[ERROR] Failed to get Pages config: $_" -ForegroundColor Red
    exit 1
}

# Extract existing env vars from production deployment_configs
$existingEnv = @{}
$prodConfig = $project.result.deployment_configs.production
if ($prodConfig.env_vars) {
    $existingEnv = $prodConfig.env_vars
}

# Update the target env var
$existingEnv[$PagesEnvKey] = @{ type = "plain_text"; value = $ngrokUrl }

# Build PATCH body
$body = @{
    deployment_configs = @{
        production = @{
            env_vars = $existingEnv
        }
    }
} | ConvertTo-Json -Depth 10

$updateResp = Invoke-RestMethod -Uri $baseUrl -Method PATCH -Headers $headers -Body $body -TimeoutSec 15
if ($updateResp.success) {
    Write-Host "[OK] $PagesEnvKey updated to $ngrokUrl" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Update failed: $($updateResp.errors)" -ForegroundColor Red
    exit 1
}

# ========== Step 4: Trigger redeploy ==========
Write-Host "`n========== Step 4: Trigger Pages redeploy ==========" -ForegroundColor Cyan
$deployResp = Invoke-RestMethod -Uri "$baseUrl/deployments" -Method POST -Headers $headers -Body '{"environment":"production"}' -TimeoutSec 15
if ($deployResp.success) {
    $deploymentId = $deployResp.result.id
    Write-Host "[OK] Deploy triggered, ID = $deploymentId" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Deploy failed: $($deployResp.errors)" -ForegroundColor Red
    exit 1
}

# ========== Done ==========
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  DONE!" -ForegroundColor Green
Write-Host "`n  ngrok URL:   $ngrokUrl" -ForegroundColor White
Write-Host "  Pages URL:   https://$PagesProjectName.pages.dev" -ForegroundColor White
Write-Host "  Env var:     $PagesEnvKey = $ngrokUrl" -ForegroundColor White
Write-Host "`n  Keep this window open (ngrok runs in background)." -ForegroundColor Yellow
Write-Host "  First visit to ngrok may need 'Visit Site' click." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green

Start-Process "http://127.0.0.1:4040" -ErrorAction SilentlyContinue
