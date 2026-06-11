# ============================================================================
#  K-MER EVENT — Lancer le sondage en ligne (tunnel Cloudflare)
#  Démarre MySQL si besoin, applique la migration, lance le backend, ouvre un
#  tunnel public HTTPS et affiche le lien à partager.
#  Usage : clic droit > "Exécuter avec PowerShell"  (ou .\start-survey.ps1)
# ============================================================================
$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot      # racine du repo
$backend = Join-Path $root 'backend'

function Info($m){ Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m){ Write-Host "[OK] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[!]  $m" -ForegroundColor Yellow }

# --- 1. MySQL ---------------------------------------------------------------
Info "Vérification de MySQL (port 3306)..."
$mysqlUp = (Test-NetConnection 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $mysqlUp) {
  Warn "MySQL n'écoute pas. Tentative de démarrage du service (UAC)..."
  try {
    Start-Process -Verb RunAs -Wait powershell -ArgumentList '-NoProfile','-Command','Start-Service MySQL80'
    Start-Sleep -Seconds 3
    $mysqlUp = (Test-NetConnection 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded
  } catch { }
}
if (-not $mysqlUp) { Warn "Impossible de joindre MySQL. Démarre-le manuellement puis relance."; Read-Host "Entrée pour quitter"; exit 1 }
Ok "MySQL accessible."

# --- 2. Migration (idempotente) --------------------------------------------
Info "Application de la migration du sondage..."
Push-Location $backend
npm run migrate:survey
Pop-Location

# --- 3. Backend -------------------------------------------------------------
Info "Démarrage du backend (port 4000)..."
$alreadyUp = (Test-NetConnection 127.0.0.1 -Port 4000 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $alreadyUp) {
  Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location `"$backend`"; node server.js" -WindowStyle Minimized
}
foreach ($i in 1..20) {
  try { Invoke-RestMethod "http://localhost:4000/api/health" -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep 1 }
}
Ok "Backend en ligne."

# --- 4. Tunnel Cloudflare ---------------------------------------------------
Info "Recherche de cloudflared..."
$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) {
  $cf = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $cf) { Warn "cloudflared introuvable. Installe-le : winget install Cloudflare.cloudflared"; Read-Host "Entrée pour quitter"; exit 1 }

$log = Join-Path $PSScriptRoot 'tunnel.log'
if (Test-Path $log) { Remove-Item $log -Force }
Info "Ouverture du tunnel public..."
# Force HTTP/2 (TCP) instead of QUIC/UDP — far more reliable on unstable or
# UDP-restricted networks (avoids "no recent network activity" drops).
Start-Process -FilePath $cf -ArgumentList 'tunnel','--no-autoupdate','--protocol','http2','--url','http://localhost:4000' `
  -RedirectStandardError $log -RedirectStandardOutput "$log.out" -WindowStyle Hidden

$public = $null
foreach ($i in 1..40) {
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) { $public = $m.Matches[0].Value; break }
  }
  Start-Sleep 1
}

Write-Host ""
if ($public) {
  Write-Host "==================================================================" -ForegroundColor Green
  Write-Host "  LIEN A PARTAGER (formulaire)  : $public/survey/" -ForegroundColor Green
  Write-Host "  Tableau de bord (admin)       : $public/survey/results.html" -ForegroundColor Green
  Write-Host "==================================================================" -ForegroundColor Green
  Write-Host ""
  Warn "Laisse cette fenêtre + le backend OUVERTS pendant la collecte."
  Warn "Le lien change à chaque relance du script."
} else {
  Warn "Tunnel lancé mais URL non détectée. Voir $log"
}
Read-Host "Entrée pour arrêter le tunnel et fermer"
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
