# 📤 Transferir Arquivos - Sistema de Envio em Etapas

## ⚠️ Erro 404 - Rota não encontrada

O erro indica que a rota `/api/messages/send-selected-staged` não está disponível no servidor.

## 📋 Arquivos para Transferir

### 1. Backend (API)
```powershell
scp src/routes/api.js root@212.85.19.210:/var/www/nexusbot/src/routes/
scp package.json root@212.85.19.210:/var/www/nexusbot/
```

### 2. Frontend
```powershell
scp public/script.js root@212.85.19.210:/var/www/nexusbot/public/
scp public/index.html root@212.85.19.210:/var/www/nexusbot/public/
scp public/styles.css root@212.85.19.210:/var/www/nexusbot/public/
```

## 🔧 Passos para Corrigir

### 1. Instalar nova dependência (uuid)
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && npm install"
```

### 2. Verificar se o arquivo foi transferido corretamente
```bash
ssh root@212.85.19.210 "grep -n 'send-selected-staged' /var/www/nexusbot/src/routes/api.js"
```

Deve mostrar a linha com a rota.

### 3. Verificar logs do servidor
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot --lines 50"
```

Procure por erros de sintaxe ou importação.

### 4. Reiniciar o bot
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 restart nexusbot"
```

### 5. Verificar se a rota está disponível
```bash
ssh root@212.85.19.210 "curl -X POST http://localhost:3000/api/messages/send-selected-staged -H 'Content-Type: application/json' -d '{\"loanIds\":[]}'"
```

## ✅ Verificação Final

Após transferir e reiniciar, teste no navegador:
1. Abra o painel
2. Selecione alguns empréstimos
3. Clique em "Enviar Selecionados"
4. O modal de progresso deve abrir

Se ainda der erro 404, verifique:
- ✅ Arquivo `src/routes/api.js` foi transferido?
- ✅ Dependência `uuid` foi instalada?
- ✅ Servidor foi reiniciado?
- ✅ Não há erros nos logs?

