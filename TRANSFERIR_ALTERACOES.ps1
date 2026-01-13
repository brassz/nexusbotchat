# Script para transferir apenas os arquivos alterados
# Execute no PowerShell

$VPS_HOST = "212.85.19.210"
$VPS_USER = "root"
$VPS_PATH = "/var/www/nexusbot"

Write-Host "🚀 Transferindo arquivos alterados..." -ForegroundColor Cyan
Write-Host ""

# Arquivos alterados
$filesToTransfer = @(
    "public/index.html",
    "public/script.js",
    "public/styles.css",
    "src/bot/whatsappBot.js",
    "src/routes/api.js",
    "src/services/loanService.js",
    "src/index.js",
    "package.json"
)

foreach ($file in $filesToTransfer) {
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
Write-Host "✅ Transferência concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Instalando novas dependências (se houver)..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && npm install"
Write-Host ""
Write-Host "📁 Criando diretório de áudios..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}/public/audios"
Write-Host ""
Write-Host "🔄 Reinicie o bot na VPS:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"cd ${VPS_PATH} && pm2 restart nexusbot`"" -ForegroundColor Gray

