# Diagnóstico: QR Code não está sendo gerado

## Problema
O QR code não está aparecendo no painel. Os logs mostram:
```
GET /api/qr-code - QR Code: Não existe | Conectado: false
```

## Possíveis Causas

### 1. Bot não está inicializando
O bot pode estar falhando na inicialização sem gerar erro visível.

**Verificar:**
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot --lines 100 | grep -i 'inicializando\|erro\|qr\|bot'"
```

**Procurar por:**
- "🚀 Inicializando bot com sessão"
- "Bot WhatsApp inicializado com sucesso!"
- "📱 QR CODE GERADO"
- Qualquer mensagem de erro

### 2. Navegador não está abrindo
O Chrome/Chromium pode não estar instalado ou não estar acessível.

**Verificar:**
```bash
ssh root@212.85.19.210 "which google-chrome || which chromium-browser || which chromium"
```

**Se não estiver instalado:**
```bash
ssh root@212.85.19.210 "apt-get update && apt-get install -y chromium-browser"
```

### 3. Processos do navegador travados
Processos antigos do navegador podem estar impedindo a inicialização.

**Solução:**
```bash
ssh root@212.85.19.210 "
pkill -9 -f chrome
pkill -9 -f chromium
rm -rf /var/www/nexusbot/tokens/nexusbot/.wppconnect
sleep 3
pm2 restart nexusbot
"
```

### 4. Diretório de tokens com problemas
O diretório de tokens pode estar corrompido.

**Solução:**
```bash
ssh root@212.85.19.210 "
cd /var/www/nexusbot
pm2 stop nexusbot
rm -rf tokens/nexusbot
mkdir -p tokens/nexusbot
chmod 755 tokens/nexusbot
pm2 restart nexusbot
"
```

### 5. Permissões insuficientes
O usuário pode não ter permissões para criar arquivos.

**Verificar:**
```bash
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/tokens/"
```

**Corrigir:**
```bash
ssh root@212.85.19.210 "chown -R root:root /var/www/nexusbot/tokens/"
```

## Solução Completa (Passo a Passo)

1. **Parar o bot:**
```bash
ssh root@212.85.19.210 "pm2 stop nexusbot"
```

2. **Matar todos os processos do navegador:**
```bash
ssh root@212.85.19.210 "
pkill -9 -f chrome
pkill -9 -f chromium
killall -9 chrome 2>/dev/null || true
killall -9 chromium 2>/dev/null || true
sleep 3
"
```

3. **Limpar diretório de tokens:**
```bash
ssh root@212.85.19.210 "
cd /var/www/nexusbot
rm -rf tokens/nexusbot
mkdir -p tokens/nexusbot
"
```

4. **Transferir arquivos atualizados:**
```powershell
scp src/bot/whatsappBot.js root@212.85.19.210:/var/www/nexusbot/src/bot/
scp src/index.js root@212.85.19.210:/var/www/nexusbot/src/
```

5. **Reiniciar o bot:**
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 restart nexusbot"
```

6. **Monitorar logs em tempo real:**
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot --lines 0"
```

**Procure por:**
- "🚀 Inicializando bot com sessão: nexusbot"
- "📱 QR CODE GERADO"
- Qualquer mensagem de erro

## Verificação Final

Após reiniciar, verifique se o QR code está sendo gerado:

1. **Verificar logs:**
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot --lines 50 | grep -i qr"
```

2. **Testar API diretamente:**
```bash
ssh root@212.85.19.210 "curl http://localhost:3000/api/qr-code"
```

3. **Acessar painel:**
Abra `http://212.85.19.210:3000` e vá na aba "QR Code"

## Se ainda não funcionar

1. **Verificar se o Chrome está instalado:**
```bash
ssh root@212.85.19.210 "chromium-browser --version || google-chrome --version"
```

2. **Instalar dependências do Chrome:**
```bash
ssh root@212.85.19.210 "
apt-get update
apt-get install -y chromium-browser chromium-chromedriver
"
```

3. **Verificar variáveis de ambiente:**
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && cat .env | grep -i session"
```

4. **Testar inicialização manual:**
```bash
ssh root@212.85.19.210 "
cd /var/www/nexusbot
node src/index.js
"
```

Observe os logs para identificar onde está falhando.

