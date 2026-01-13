# ⚡ Como Configurar a VPS - Guia Rápido

## ⚠️ IMPORTANTE

O script `setup-vps.sh` **NÃO** deve ser executado no seu Windows! Ele deve ser executado **na VPS (servidor Linux)**.

## 🚀 Método Mais Rápido

### 1. Conecte na VPS via SSH:
```bash
ssh root@212.85.19.210
```

### 2. Execute este comando completo (copie e cole):
```bash
apt-get update -y && apt-get upgrade -y && \
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
apt-get install -y nodejs && \
npm install -g pm2 && \
apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils && \
mkdir -p /var/www/nexusbot/logs && \
pm2 startup && \
echo "✅ Configuração concluída! Node: $(node --version) | PM2: $(pm2 --version)"
```

### 3. Siga as instruções do PM2 que aparecerem

### 4. Pronto! Agora faça o deploy do seu computador:
```bash
npm run deploy
```

## 📋 Método Alternativo (Transferir Script)

### 1. Do seu Windows, transfira o script:
```powershell
# No PowerShell
scp scripts/setup-vps.sh root@212.85.19.210:/tmp/
```

### 2. Conecte na VPS:
```bash
ssh root@212.85.19.210
```

### 3. Execute o script:
```bash
chmod +x /tmp/setup-vps.sh
bash /tmp/setup-vps.sh
```

## ✅ Verificar se Funcionou

Na VPS, execute:
```bash
node --version   # Deve mostrar v18.x ou superior
npm --version
pm2 --version
```

Se todos os comandos funcionarem, a VPS está pronta!

## 🔄 Próximo Passo: Deploy

Depois de configurar a VPS, volte para o seu computador Windows e execute:

```bash
npm run deploy
```

Ou se preferir PowerShell:

```bash
npm run deploy:windows
```

