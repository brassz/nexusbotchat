# Script para corrigir erros na VPS
# Execute no PowerShell

$VPS_HOST = "212.85.19.210"
$VPS_USER = "root"
$VPS_PATH = "/var/www/nexusbot"

Write-Host "🔧 Corrigindo erros na VPS..." -ForegroundColor Cyan
Write-Host ""

# Arquivos que precisam ser transferidos para corrigir os erros
$filesToFix = @(
    "src/bot/whatsappBot.js",
    "src/services/loanService.js",
    "src/routes/api.js"
)

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        Write-Host "📤 Transferindo $file..." -ForegroundColor Gray
        scp $file "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/$file"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $file transferido" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erro ao transferir $file" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⚠️  Arquivo não encontrado: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🔄 Reiniciando bot..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && pm2 restart nexusbot"

Write-Host ""
Write-Host "✅ Correções aplicadas!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Verificar logs:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 logs nexusbot --lines 20`"" -ForegroundColor Gray

