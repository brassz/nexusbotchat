# Correção: Navegador já está rodando

## Problema
O erro `The browser is already running for /var/www/nexusbot/tokens/nexusbot` ocorre quando o navegador não foi fechado corretamente antes de tentar inicializar novamente.

## Solução

### 1. Matar processos do navegador manualmente

Execute no servidor VPS:

```bash
ssh root@212.85.19.210

# Matar processos do Chrome/Chromium relacionados ao nexusbot
pkill -f "chrome.*nexusbot"
pkill -f "chromium.*nexusbot"

# Verificar se ainda há processos
ps aux | grep chrome | grep nexusbot
ps aux | grep chromium | grep nexusbot

# Se ainda houver processos, matar com força
killall -9 chrome 2>/dev/null || true
killall -9 chromium 2>/dev/null || true
```

### 2. Reiniciar o bot

```bash
cd /var/www/nexusbot
pm2 restart nexusbot
```

### 3. Verificar logs

```bash
pm2 logs nexusbot --lines 50
```

## Arquivos atualizados

Os seguintes arquivos foram atualizados para melhorar o fechamento do navegador:

- `src/bot/whatsappBot.js`:
  - Função `disconnectBot()` melhorada para fechar o navegador corretamente
  - Função `restartBot()` agora mata processos do navegador antes de reinicializar
  - Função `killBrowserProcesses()` adicionada para matar processos do navegador

## Transferir arquivos atualizados

```powershell
scp src/bot/whatsappBot.js root@212.85.19.210:/var/www/nexusbot/src/bot/
```

## Após transferir

1. Matar processos do navegador:
```bash
ssh root@212.85.19.210 "pkill -f 'chrome.*nexusbot'; pkill -f 'chromium.*nexusbot'; sleep 2"
```

2. Reiniciar o bot:
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 restart nexusbot"
```

3. Verificar se está funcionando:
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot --lines 30"
```

## Prevenção

O código agora:
- Verifica se já existe um cliente antes de inicializar
- Fecha o navegador corretamente ao desconectar
- Mata processos do navegador antes de reinicializar
- Aguarda tempo suficiente para garantir que tudo foi fechado

