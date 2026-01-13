# 🎵 Transferir Áudio para VPS

## 📤 Comandos SCP para Transferir Áudio

### Windows PowerShell:
```powershell
# Criar diretório de áudios na VPS
ssh root@212.85.19.210 "mkdir -p /var/www/nexusbot/public/audios"

# Transferir áudio
scp public/audios/mensagem.mp3 root@212.85.19.210:/var/www/nexusbot/public/audios/
```

### Linux/Mac:
```bash
# Criar diretório de áudios na VPS
ssh root@212.85.19.210 "mkdir -p /var/www/nexusbot/public/audios"

# Transferir áudio
scp public/audios/mensagem.mp3 root@212.85.19.210:/var/www/nexusbot/public/audios/
```

## 📋 Como Usar

1. **Grave seu áudio em MP3** (máximo 10MB)
2. **Faça upload pelo painel** na seção "Áudio para Envio"
3. **Ou transfira manualmente** usando os comandos acima

## ✅ Verificar na VPS

```bash
ssh root@212.85.19.210 "ls -la /var/www/nexusbot/public/audios/"
```

Você deve ver o arquivo `mensagem.mp3` se foi transferido.

## 🔄 Após Transferir

Reinicie o bot:
```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 restart nexusbot"
```

