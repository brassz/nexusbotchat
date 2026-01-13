# ✅ Verificação de Transferência - src/ e public/

## 🔍 Verificar Antes do Deploy

Antes de fazer o deploy, verifique se as pastas estão prontas:

```bash
npm run verify
```

Este comando verifica:
- ✅ `src/` existe e tem conteúdo
- ✅ `public/` existe e tem conteúdo  
- ✅ `package.json` existe
- ✅ `.env` existe

## 📦 O que será Transferido

### ✅ OBRIGATÓRIO (sempre transferido):

1. **`src/`** - Todo o código do bot
   - `src/bot/whatsappBot.js`
   - `src/config/database.js`
   - `src/index.js`
   - `src/routes/api.js`
   - `src/services/loanService.js`
   - `src/services/messageService.js`

2. **`public/`** - Painel web completo
   - `public/index.html`
   - `public/styles.css`
   - `public/script.js`

3. **`package.json`** - Dependências do projeto

4. **`.env`** - Configurações e credenciais

### 📄 OPCIONAL (transferido se existir):

- `package-lock.json`
- `ecosystem.config.js`

## 🚀 Fazer Deploy

### Windows:
```powershell
npm run deploy:windows
```

### Linux/Mac:
```bash
npm run deploy
```

## ✅ Verificar na VPS

Após o deploy, verifique se tudo foi transferido:

```bash
ssh root@212.85.19.210 "ls -la /var/www/nexusbot"
```

Você deve ver:
```
drwxr-xr-x  src/
drwxr-xr-x  public/
-rw-r--r--  package.json
-rw-r--r--  .env
drwxr-xr-x  node_modules/
```

Verificar conteúdo das pastas:
```bash
# Verificar src/
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/src/"

# Verificar public/
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/public/"
```

## 🔧 Estrutura Esperada na VPS

```
/var/www/nexusbot/
├── src/
│   ├── bot/
│   │   └── whatsappBot.js
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   ├── loanService.js
│   │   └── messageService.js
│   └── index.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── package.json
├── .env
└── node_modules/
```

## ⚠️ Problemas Comuns

### "src/ não encontrado"
- Certifique-se de estar na raiz do projeto
- Verifique se a pasta `src/` existe

### "public/ não encontrado"  
- Certifique-se de estar na raiz do projeto
- Verifique se a pasta `public/` existe

### Arquivos não aparecem na VPS
- Verifique os logs do deploy
- Teste conexão SSH: `ssh root@212.85.19.210`
- Execute manualmente: `scp -r src root@212.85.19.210:/var/www/nexusbot/`

