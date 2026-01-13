# 📦 Informações sobre Deploy - NexusBOT

## ✅ Arquivos Transferidos via SCP

O script de deploy agora transfere **TODOS** os arquivos necessários via SCP:

### Arquivos Obrigatórios:
- ✅ `src/` - Todo o código fonte do bot
- ✅ `public/` - Painel web (HTML, CSS, JS)
- ✅ `package.json` - Dependências do projeto
- ✅ `.env` - Configurações e credenciais

### Arquivos Opcionais (se existirem):
- 📄 `package-lock.json` - Lock de versões (recomendado)
- 📄 `ecosystem.config.js` - Configuração PM2

## 🚀 Como Fazer Deploy

### Windows:
```powershell
npm run deploy:windows
```

### Linux/Mac:
```bash
npm run deploy
```

## 📋 O que o Script Faz

1. **Cria diretório na VPS** (`/var/www/nexusbot`)
2. **Transfere TODOS os arquivos via SCP:**
   - Pasta `src/` completa
   - Pasta `public/` completa (HTML, CSS, JS)
   - `package.json`
   - `package-lock.json` (se existir)
   - `.env`
   - `ecosystem.config.js` (se existir)
3. **Instala dependências** (`npm install --production`)
4. **Configura PM2** (gerenciador de processos)
5. **Inicia a aplicação** automaticamente
6. **Salva configuração** para iniciar no boot

## 🔍 Verificação

Após o deploy, verifique se todos os arquivos foram transferidos:

```bash
ssh root@212.85.19.210 "ls -la /var/www/nexusbot"
```

Você deve ver:
- `src/`
- `public/`
- `package.json`
- `.env`
- `node_modules/` (criado após npm install)

## ⚠️ Importante

- Certifique-se de que o arquivo `.env` existe antes do deploy
- O script verifica cada arquivo antes de transferir
- Arquivos opcionais não impedem o deploy se não existirem
- Todos os arquivos são transferidos individualmente para garantir sucesso

## 🐛 Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique se o arquivo existe no diretório local
- Certifique-se de estar executando o script na raiz do projeto

### Erro: "Permission denied" no SCP
- Verifique suas credenciais SSH
- Teste a conexão: `ssh root@212.85.19.210`

### Arquivos não aparecem na VPS
- Verifique os logs do deploy
- Execute manualmente: `scp -r src root@212.85.19.210:/var/www/nexusbot/`

