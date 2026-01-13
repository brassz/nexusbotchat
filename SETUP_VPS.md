# 🚀 Configuração da VPS - NexusBOT

## ⚠️ Importante

O script `setup-vps.sh` deve ser executado **na VPS (servidor Linux)**, não no seu computador Windows!

## Método 1: Executar o script na VPS

### Passo 1: Conectar na VPS
```bash
ssh root@212.85.19.210
```

### Passo 2: Transferir o script para a VPS

**Opção A - Usando SCP (do seu Windows):**
```powershell
# No PowerShell do Windows
scp scripts/setup-vps.sh root@212.85.19.210:/tmp/setup-vps.sh
```

**Opção B - Criar o script diretamente na VPS:**
```bash
# Já conectado na VPS via SSH
nano /tmp/setup-vps.sh
# Cole o conteúdo do script (veja abaixo)
```

### Passo 3: Executar o script na VPS
```bash
# Na VPS
chmod +x /tmp/setup-vps.sh
bash /tmp/setup-vps.sh
```

## Método 2: Executar comandos manualmente na VPS

Se preferir, você pode executar os comandos diretamente na VPS:

```bash
# Conecte na VPS
ssh root@212.85.19.210

# Atualizar sistema
apt-get update -y
apt-get upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar dependências do sistema para Puppeteer
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
mkdir -p /var/www/nexusbot
mkdir -p /var/www/nexusbot/logs

# Configurar PM2 para iniciar no boot
pm2 startup
# Siga as instruções que aparecerem
```

## Método 3: Usar script inline (copiar e colar)

Você pode copiar e colar este comando completo na VPS:

```bash
ssh root@212.85.19.210 << 'EOF'
echo "🚀 Configurando VPS para NexusBOT..."
apt-get update -y && apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
npm install -g pm2
apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
mkdir -p /var/www/nexusbot/logs
pm2 startup
echo "✅ Configuração concluída!"
EOF
```

## Verificar instalação

Após executar o script, verifique se tudo está instalado:

```bash
# Na VPS
node --version    # Deve mostrar v18.x ou superior
npm --version     # Deve mostrar versão do npm
pm2 --version     # Deve mostrar versão do PM2
```

## Próximos passos

Após configurar a VPS:

1. **Criar arquivo .env na VPS:**
```bash
# Na VPS
nano /var/www/nexusbot/.env
# Cole o conteúdo do seu .env local
```

2. **Fazer o deploy:**
```bash
# No seu computador Windows
npm run deploy
# ou
npm run deploy:windows
```

3. **Acessar o painel:**
```
http://212.85.19.210:3000
```

## Troubleshooting

### Erro: "Permission denied"
```bash
# Execute com sudo
sudo bash /tmp/setup-vps.sh
```

### Erro: "command not found: node"
```bash
# Recarregue o shell
source ~/.bashrc
# ou
exec bash
```

### Erro ao instalar dependências
```bash
# Tente atualizar os repositórios
apt-get update
# Execute novamente
```

