# 📤 Transferência Manual via PowerShell

## 🚀 Método 1: Script Automatizado

Execute o script completo:

```powershell
.\scripts\transfer-manual.ps1
```

Ou com caminho completo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\transfer-manual.ps1
```

## 📋 Método 2: Comandos Individuais

Execute cada comando no PowerShell, um por vez:

### 1. Criar diretório na VPS
```powershell
ssh root@212.85.19.210 "mkdir -p /var/www/nexusbot"
```

### 2. Transferir src/ (Código do bot)
```powershell
scp -r src root@212.85.19.210:/var/www/nexusbot/
```

### 3. Transferir public/ (Painel web)
```powershell
scp -r public root@212.85.19.210:/var/www/nexusbot/
```

### 4. Transferir package.json
```powershell
scp package.json root@212.85.19.210:/var/www/nexusbot/
```

### 5. Transferir .env
```powershell
scp .env root@212.85.19.210:/var/www/nexusbot/
```

### 6. Transferir package-lock.json (opcional)
```powershell
scp package-lock.json root@212.85.19.210:/var/www/nexusbot/
```

### 7. Transferir ecosystem.config.js (opcional)
```powershell
scp ecosystem.config.js root@212.85.19.210:/var/www/nexusbot/
```

**Nota:** O PM2 não consegue usar `ecosystem.config.js` diretamente quando o projeto usa `"type": "module"`. Use o comando direto para iniciar:
```bash
pm2 start src/index.js --name nexusbot
```

## ✅ Verificar Transferência

Após transferir, verifique se os arquivos estão na VPS:

```powershell
ssh root@212.85.19.210 "ls -la /var/www/nexusbot"
```

Verificar conteúdo das pastas:

```powershell
# Verificar src/
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/src/"

# Verificar public/
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/public/"
```

## 🔧 Próximos Passos Após Transferência

### 1. Instalar Dependências
```powershell
ssh root@212.85.19.210 "cd /var/www/nexusbot && npm install --production"
```

### 2. Iniciar com PM2
```powershell
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 start src/index.js --name nexusbot"
```

### 3. Salvar Configuração PM2
```powershell
ssh root@212.85.19.210 "pm2 save"
```

### 4. Verificar Status
```powershell
ssh root@212.85.19.210 "pm2 status"
```

### 5. Ver Logs
```powershell
ssh root@212.85.19.210 "pm2 logs nexusbot"
```

## ⚠️ Troubleshooting

### Erro: "scp: command not found"
Instale o OpenSSH Client no Windows:
- Configurações > Aplicativos > Recursos Opcionais > OpenSSH Client

### Erro: "Permission denied"
Verifique suas credenciais SSH:
```powershell
ssh root@212.85.19.210
```

### Erro: "No such file or directory"
Certifique-se de estar na raiz do projeto ao executar os comandos:
```powershell
cd C:\Users\USER\nexusbotchat
```

### Verificar se arquivos existem localmente
```powershell
# Verificar src/
Test-Path src
ls src

# Verificar public/
Test-Path public
ls public

# Verificar package.json
Test-Path package.json

# Verificar .env
Test-Path .env
```

## 📝 Exemplo Completo (Copiar e Colar)

Execute todos os comandos de uma vez:

```powershell
# Configurações
$VPS = "root@212.85.19.210"
$PATH = "/var/www/nexusbot"

# Criar diretório
ssh $VPS "mkdir -p $PATH"

# Transferir arquivos
scp -r src "$VPS`:$PATH/"
scp -r public "$VPS`:$PATH/"
scp package.json "$VPS`:$PATH/"
scp .env "$VPS`:$PATH/"

# Verificar
ssh $VPS "ls -la $PATH"
```

## 🎯 Estrutura Esperada na VPS

Após a transferência, você deve ter:

```
/var/www/nexusbot/
├── src/
│   ├── bot/
│   ├── config/
│   ├── routes/
│   ├── services/
│   └── index.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── package.json
├── .env
└── (node_modules/ será criado após npm install)
```

