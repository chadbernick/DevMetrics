# setup-gemini.ps1
# Quick setup script for Gemini CLI integration on Windows

param (
    [Parameter(Mandatory=$true)]
    [string]$UserId,

    [Parameter(Mandatory=$true)]
    [string]$DashboardUrl
)

Write-Host "✨ Configuring Gemini CLI Telemetry..." -ForegroundColor Cyan

# 1. Set Environment Variables (User Scope)
Write-Host "📂 Setting environment variables..."
[System.Environment]::SetEnvironmentVariable("GEMINI_TELEMETRY_ENABLED", "true", "User")
[System.Environment]::SetEnvironmentVariable("GEMINI_TELEMETRY_OTLP_ENDPOINT", "$DashboardUrl/api/v1/integrations/gemini", "User")
[System.Environment]::SetEnvironmentVariable("GEMINI_TELEMETRY_OTLP_PROTOCOL", "http", "User")

# 2. Configure settings.json
$GeminiDir = Join-Path $HOME ".gemini"
$SettingsFile = Join-Path $GeminiDir "settings.json"

if (-not (Test-Path $GeminiDir)) {
    New-Item -ItemType Directory -Force -Path $GeminiDir | Out-Null
}

$Settings = @{}
if (Test-Path $SettingsFile) {
    try {
        $JsonContent = Get-Content $SettingsFile -Raw
        $Settings = ConvertFrom-Json $JsonContent -AsHashtable
    } catch {
        Write-Warning "Could not parse existing settings.json. creating new one."
    }
}

if (-not $Settings.ContainsKey("telemetry")) {
    $Settings["telemetry"] = @{}
}

$Settings["telemetry"]["enabled"] = $true
$Settings["telemetry"]["target"] = "local"
$Settings["telemetry"]["otlpProtocol"] = "http"
$Settings["telemetry"]["otlpEndpoint"] = "$DashboardUrl/api/v1/integrations/gemini?user=$UserId"

$NewJson = $Settings | ConvertTo-Json -Depth 10
Set-Content -Path $SettingsFile -Value $NewJson

Write-Host "✅ Updated $SettingsFile" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Setup complete! Restart your terminal/PowerShell for changes to take effect." -ForegroundColor Green
