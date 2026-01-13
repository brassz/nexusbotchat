# Script de deploy para Windows PowerShell
# NexusBOT - Deploy para VPS

$VPS_HOST = $env:VPS_HOST
if (-not $VPS_HOST) {
    $VPS_HOST = "212.85.19.210"
}

$VPS_USER = $env:VPS_USER
if (-not $VPS_USER) {
    $VPS_USER = "root"
}

$VPS_PATH = $env:VPS_PATH
if (-not $VPS_PATH) {
    $VPS_PATH = "/var/www/nexusbot"
}

Write-Host "🚀 Iniciando deploy do NexusBOT para VPS..." -ForegroundColor Cyan
Write-Host "📡 Servidor: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Yellow
Write-Host "📁 Diretório: ${VPS_PATH}" -ForegroundColor Yellow
Write-Host ""

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Warning "⚠️  Arquivo .env não encontrado!"
    Write-Warning "   Certifique-se de criar o arquivo .env antes do deploy."
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s") {
        Write-Host "Deploy cancelado." -ForegroundColor Red
        exit 0
    }
}

# Verificar se SCP está disponível
$scpAvailable = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpAvailable) {
    Write-Host "❌ SCP não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Instale o OpenSSH Client no Windows:" -ForegroundColor Yellow
    Write-Host "   Configurações > Aplicativos > Recursos Opcionais > OpenSSH Client" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Use o Git Bash (se tiver Git instalado)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Use WinSCP ou outro cliente SCP para transferência manual" -ForegroundColor Yellow
    exit 1
}

# 1. Criar diretório no servidor
Write-Host "📋 Passo 1: Criando diretório no servidor..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}"

# 2. Transferir arquivos via SCP
Write-Host "📋 Passo 2: Transferindo arquivos..." -ForegroundColor Cyan
Write-Host ""

# Lista de arquivos e pastas para transferir (ORDEM IMPORTANTE: pastas primeiro)
$filesToTransfer = @(
    "src",              # ✅ Todo o código do bot
    "public",           # ✅ Painel web (HTML, CSS, JS)
    "package.json",     # Dependências
    "package-lock.json", # Lock de versões (opcional)
    ".env",             # Configurações
    "ecosystem.config.js" # Config PM2 (opcional - não usado diretamente)
)

foreach ($file in $filesToTransfer) {
    if (Test-Path $file) {
        $fileType = if (Test-Path $file -PathType Container) { "Pasta" } else { "Arquivo" }
        Write-Host "   📤 Transferindo $fileType $file..." -ForegroundColor Gray
        
        # Verificar se é pasta ou arquivo
        if (Test-Path $file -PathType Container) {
            # É uma pasta - transferir recursivamente
            $result = scp -r $file "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/" 2>&1
        } else {
            # É um arquivo
            $result = scp $file "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/" 2>&1
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $fileType $file transferido com sucesso" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erro ao transferir $file" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            exit 1
        }
    } else {
        # Arquivos opcionais não impedem o deploy
        if ($file -eq "package-lock.json" -or $file -eq "ecosystem.config.js") {
            Write-Host "   ⚠️  $file não encontrado (opcional, continuando...)" -ForegroundColor Yellow
        } else {
            Write-Warning "   ⚠️  Arquivo/pasta não encontrado: $file"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "✅ Todos os arquivos transferidos!" -ForegroundColor Green
Write-Host ""

# 3. Instalar dependências
Write-Host "📋 Passo 3: Instalando dependências..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && npm install --production"

# 4. Verificar PM2
Write-Host "📋 Passo 4: Verificando PM2..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "which pm2 || npm install -g pm2"

# 5. Parar processo anterior
Write-Host "📋 Passo 5: Parando processo anterior..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && pm2 stop nexusbot 2>&1 | Out-Null"

# 6. Iniciar aplicação
Write-Host "📋 Passo 6: Iniciando aplicação..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && pm2 start src/index.js --name nexusbot --update-env"

# 7. Salvar configuração PM2
Write-Host "📋 Passo 7: Salvando configuração do PM2..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "pm2 save"

# 8. Status
Write-Host "📋 Passo 8: Verificando status..." -ForegroundColor Cyan
ssh "${VPS_USER}@${VPS_HOST}" "pm2 status"

Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Acesse o painel em: http://${VPS_HOST}:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Para ver logs:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 logs nexusbot`"" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 Para reiniciar:" -ForegroundColor Yellow
Write-Host "   ssh ${VPS_USER}@${VPS_HOST} `"pm2 restart nexusbot`"" -ForegroundColor Gray

