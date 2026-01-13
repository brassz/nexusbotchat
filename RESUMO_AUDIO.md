# 🎵 Sistema de Áudio - NexusBOT

## ✅ Funcionalidade Implementada

O sistema agora permite enviar um áudio MP3 **antes** de cada mensagem de texto aos clientes.

## 📁 Estrutura

- **Pasta:** `public/audios/`
- **Arquivo:** `mensagem.mp3` (nome fixo)
- **Tamanho máximo:** 10MB
- **Formato:** MP3

## 🎯 Como Funciona

1. **Upload do Áudio:**
   - Faça upload do áudio MP3 pelo painel web
   - Ou transfira manualmente para `public/audios/mensagem.mp3`

2. **Envio Automático:**
   - Quando uma mensagem é enviada, o sistema verifica se existe `mensagem.mp3`
   - Se existir, envia o áudio primeiro
   - Aguarda 1 segundo
   - Depois envia a mensagem de texto

3. **Onde Funciona:**
   - ✅ Envio individual
   - ✅ Envio em lote (selecionados)
   - ✅ Envio automático (todos os dias às 9h)
   - ✅ Envio por data

## 📤 Upload pelo Painel

1. Acesse o painel web
2. Na seção "Áudio para Envio", clique em "Enviar Áudio MP3"
3. Selecione seu arquivo MP3
4. Aguarde o upload
5. O áudio será usado automaticamente em todos os envios

## 📋 Upload Manual (VPS)

### Criar diretório:
```bash
ssh root@212.85.19.210 "mkdir -p /var/www/nexusbot/public/audios"
```

### Transferir áudio:
```powershell
# PowerShell
scp public/audios/mensagem.mp3 root@212.85.19.210:/var/www/nexusbot/public/audios/
```

```bash
# Linux/Mac
scp public/audios/mensagem.mp3 root@212.85.19.210:/var/www/nexusbot/public/audios/
```

## 🔄 APIs Criadas

### POST `/api/audio/upload`
Faz upload do áudio MP3
- Body: FormData com campo `audio`
- Resposta: `{ success: true, filename: "mensagem.mp3" }`

### GET `/api/audio/status`
Verifica se existe áudio configurado
- Resposta: `{ success: true, exists: true/false, size, modified }`

### DELETE `/api/audio`
Remove o áudio configurado
- Resposta: `{ success: true, message: "Áudio removido com sucesso" }`

## ⚙️ Configuração

O áudio é opcional. Se não houver áudio configurado:
- O sistema envia apenas a mensagem de texto
- Não há erro, funciona normalmente

## 📝 Notas

- O arquivo sempre será salvo como `mensagem.mp3`
- Se fizer upload de um novo áudio, o anterior será substituído
- O áudio é enviado como PTT (Push to Talk) no WhatsApp
- Se o envio de áudio falhar, a mensagem de texto ainda será enviada

## 🐛 Troubleshooting

### Áudio não envia
- Verifique se o arquivo existe: `ls -la /var/www/nexusbot/public/audios/`
- Verifique os logs: `pm2 logs nexusbot`
- Certifique-se de que o arquivo é MP3 válido

### Erro no upload
- Verifique o tamanho (máximo 10MB)
- Verifique se é formato MP3
- Verifique permissões da pasta `public/audios/`

