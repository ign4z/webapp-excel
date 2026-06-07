# afk-ralph.ps1 - Avvia Ralph (agente autonomo Claude Code) in modalita AFK
# Usage: .\afk-ralph.ps1 [-MaxIterations 50]

param(
    [int]$MaxIterations = 50
)

$SCRIPT_DIR = Join-Path $PSScriptRoot "scripts\ralph"
$RALPH_SCRIPT = Join-Path $SCRIPT_DIR "ralph.ps1"

if (-not (Test-Path $RALPH_SCRIPT)) {
    Write-Host "Errore: ralph.ps1 non trovato in $SCRIPT_DIR" -ForegroundColor Red
    exit 1
}

Write-Host "Avvio Ralph AFK - max $MaxIterations iterazioni" -ForegroundColor Cyan
Write-Host "PRD: prd.json | Branch: $(((Get-Content (Join-Path $PSScriptRoot 'prd.json') -Raw | ConvertFrom-Json).branchName))" -ForegroundColor Gray
Write-Host ""

& $RALPH_SCRIPT -Tool claude -MaxIterations $MaxIterations
