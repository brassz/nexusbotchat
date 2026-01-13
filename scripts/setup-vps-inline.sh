#!/bin/bash
# Script inline para copiar e colar diretamente na VPS
# Execute: bash <(cat scripts/setup-vps-inline.sh) OU copie e cole na VPS

echo "🚀 Configurando VPS para NexusBOT..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt-get update -y
apt-get upgrade -y

# Instalar Node.js 18.x
echo "📦 Instalando Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js já está instalado: $(node --version)"
fi

# Instalar PM2 globalmente
echo "📦 Instalando PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 já está instalado: $(pm2 --version)"
fi

# Instalar dependências do sistema para Puppeteer
echo "📦 Instalando dependências do sistema..."
apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# Criar diretório da aplicação
echo "📁 Criando diretório da aplicação..."
mkdir -p /var/www/nexusbot
mkdir -p /var/www/nexusbot/logs

# Tentar obter o usuário atual, se não conseguir, usar root
CURRENT_USER=${SUDO_USER:-$USER}
if [ -z "$CURRENT_USER" ] || [ "$CURRENT_USER" = "root" ]; then
    CURRENT_USER="root"
fi

chown -R $CURRENT_USER:$CURRENT_USER /var/www/nexusbot 2>/dev/null || \
chown -R root:root /var/www/nexusbot

# Configurar PM2 para iniciar no boot
echo "⚙️  Configurando PM2 para iniciar no boot..."
pm2 startup 2>/dev/null || {
    echo "⚠️  Execute o comando que apareceu acima para configurar o PM2 no boot"
}

echo ""
echo "✅ Configuração da VPS concluída!"
echo ""
echo "📋 Verificações:"
echo "   Node.js: $(node --version 2>/dev/null || echo 'não instalado')"
echo "   NPM: $(npm --version 2>/dev/null || echo 'não instalado')"
echo "   PM2: $(pm2 --version 2>/dev/null || echo 'não instalado')"
echo ""
echo "Próximos passos:"
echo "1. Configure o arquivo .env em /var/www/nexusbot/.env"
echo "2. Execute o deploy do seu computador: npm run deploy"
echo "3. Acesse o painel em: http://212.85.19.210:3000"

