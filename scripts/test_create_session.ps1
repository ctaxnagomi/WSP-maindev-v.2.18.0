<#
PowerShell script to test the Supabase Edge Function `create-session`.

Usage:
  - Set environment variables optionally:
      $env:SUPABASE_EDGE_URL (e.g. https://<project>.functions.supabase.co/create-session)
      $env:SUPABASE_SERVICE_ROLE_KEY (or any Bearer token for Authorization header)

  - Run interactively and follow prompts, or pass parameters:
      .\scripts\test_create_session.ps1 -LoginType qrggif -QrHash demo-hash-abc123

Examples:
  # interactive (prompts for missing values)
  .\scripts\test_create_session.ps1

  # non-interactive
  .\scripts\test_create_session.ps1 -EdgeUrl 'https://.../create-session' -AuthToken 'service_role_key' -LoginType 'qrggif' -QrHash 'demo-hash-abc123'
#>

param(
  [string]$EdgeUrl,
  [string]$AuthToken,
  [ValidateSet('guest','qrggif','email')]
  [string]$LoginType = 'qrggif',
  [string]$GuestPin,
  [string]$QrHash
)

function Read-EnvOrPrompt([string]$envName, [string]$prompt) {
  $val = [System.Environment]::GetEnvironmentVariable($envName)
  if ($val -and $val.Length -gt 0) { return $val }
  return Read-Host -Prompt $prompt
}

if (-not $EdgeUrl) { $EdgeUrl = Read-EnvOrPrompt 'SUPABASE_EDGE_URL' 'Enter Edge Function URL (SUPABASE_EDGE_URL)'}
if (-not $AuthToken) { $AuthToken = Read-EnvOrPrompt 'SUPABASE_SERVICE_ROLE_KEY' 'Enter Authorization token (SUPABASE_SERVICE_ROLE_KEY or Bearer token)'}

if (-not $EdgeUrl) { Write-Error 'Edge URL is required. Set SUPABASE_EDGE_URL or pass -EdgeUrl.'; exit 1 }
if (-not $AuthToken) { Write-Error 'Auth token is required. Set SUPABASE_SERVICE_ROLE_KEY or pass -AuthToken.'; exit 1 }

# Build payload based on login type
$payload = @{}
switch ($LoginType) {
  'qrggif' {
    if (-not $QrHash) { $QrHash = Read-Host -Prompt 'Enter QRGGIF hash (QrHash)'}
    $payload = @{ login_type = 'qrggif'; qrggif_data = @{ hash = $QrHash } }
  }
  'guest' {
    if (-not $GuestPin) { $GuestPin = Read-Host -Prompt 'Enter guest PIN' }
    $payload = @{ login_type = 'guest'; guest_pin = $GuestPin }
  }
  default {
    Write-Host "Using login_type=$LoginType. You can expand this script to include email/password payloads." -ForegroundColor Yellow
    $payload = @{ login_type = $LoginType }
  }
}

$headers = @{
  'Authorization' = "Bearer $AuthToken"
  'Content-Type'  = 'application/json'
}

Write-Host "POSTing to: $EdgeUrl" -ForegroundColor Cyan
Write-Host "Payload: $(ConvertTo-Json $payload -Depth 5)" -ForegroundColor Gray

try {
  $response = Invoke-RestMethod -Uri $EdgeUrl -Method Post -Headers $headers -Body (ConvertTo-Json $payload -Depth 5)
  Write-Host "Response:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  $_ | Format-List * -Force
  exit 1
}

# Quick verification helpers
Write-Host "\nTip: Verify auth_logs in Supabase SQL editor to see the logged attempt." -ForegroundColor Yellow
