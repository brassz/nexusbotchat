# Script de Transferência Manual via SCP - NexusBOT
# Execute este script no PowerShell para transferir arquivos manualmente

$VPS_HOST = "212.85.19.210"
$VPS_USER = "root"
$VPS_PATH = "/var/www/nexusbot"

Write-Host "🚀 Transferência Manual de Arquivos - NexusBOT" -ForegroundColor Cyan
Write-Host "📡 Servidor: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Yellow
Write-Host "📁 Diretório: ${VPS_PATH}" -ForegroundColor Yellow
Write-Host ""

# Verificar se SCP está disponível
$scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpAvailable) {
    Write-Host "❌ SCP não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o OpenSSH Client:" -ForegroundColor Yellow
    Write-Host "Configurações > Aplicativos > Recursos Opcionais > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

# Criar diretório na VPS
Write-Host "📋 Passo 1: Criando diretório na VPS..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}"
Write-Host "✅ Diretório criado" -ForegroundColor Green
Write-Host ""

# Lista de arquivos para transferir
Write-Host "📋 Passo 2: Transferindo arquivos..." -ForegroundColor Cyan
Write-Host ""

# 1. Transferir src/
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "1️⃣  Transferindo src/ (Código do bot)..." -ForegroundColor Yellow
if (Test-Path "src") {
    scp -r src "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ src/ transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao transferir src/" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ Pasta src/ não encontrada!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Transferir public/
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "2️⃣  Transferindo public/ (Painel web)..." -ForegroundColor Yellow
if (Test-Path "public") {
    scp -r public "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ public/ transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao transferir public/" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ Pasta public/ não encontrada!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. Transferir package.json
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "3️⃣  Transferindo package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    scp package.json "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ package.json transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao transferir package.json" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ❌ Arquivo package.json não encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. Transferir .env
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "4️⃣  Transferindo .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    scp .env "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ .env transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erro ao transferir .env" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ⚠️  Arquivo .env não encontrado (opcional)" -ForegroundColor Yellow
}
Write-Host ""

# 5. Transferir package-lock.json (opcional)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "5️⃣  Transferindo package-lock.json (opcional)..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    scp package-lock.json "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ package-lock.json transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Erro ao transferir package-lock.json (opcional)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Arquivo package-lock.json não encontrado (opcional)" -ForegroundColor Yellow
}
Write-Host ""

# 6. Transferir ecosystem.config.js (opcional)
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "6️⃣  Transferindo ecosystem.config.js (opcional)..." -ForegroundColor Yellow
if (Test-Path "ecosystem.config.js") {
    scp ecosystem.config.js "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ ecosystem.config.js transferido com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Erro ao transferir ecosystem.config.js (opcional)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Arquivo ecosystem.config.js não encontrado (opcional)" -ForegroundColor Yellow
}
Write-Host ""

# Resumo
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Transferência concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Instalar dependências na VPS:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"cd ${VPS_PATH} && npm install --production`"" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Iniciar aplicação com PM2:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"cd ${VPS_PATH} && pm2 start src/index.js --name nexusbot`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Salvar configuração PM2:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 save`"" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verificar status:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 status`"" -ForegroundColor Gray
Write-Host ""

