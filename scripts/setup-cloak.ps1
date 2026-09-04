#requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "ProfileDock CloakBrowser setup (Windows)"
Write-Host ""

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
	throw "pnpm is required. Install Node.js + pnpm first."
}

pnpm install
node scripts/setup-cloak.mjs

Write-Host ""
Write-Host "Windows note: use native PowerShell for CloakBrowser install and ProfileDock desktop testing."
Write-Host "WSL is not supported for CloakBrowser runtime validation."
