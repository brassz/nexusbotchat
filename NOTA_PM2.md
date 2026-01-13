# ⚠️ Nota Importante sobre ecosystem.config.js

## 📋 Situação

O arquivo `ecosystem.config.js` está mantido no projeto, mas **não pode ser usado diretamente pelo PM2** quando o `package.json` tem `"type": "module"`.

## ❌ Por que não funciona?

O PM2 tenta carregar `ecosystem.config.js` usando `require()` (CommonJS), mas com `"type": "module"` no package.json, todos os arquivos `.js` são tratados como ES modules, causando o erro:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

## ✅ Solução: Usar Comando Direto

Ao invés de usar o arquivo de configuração, inicie o PM2 com parâmetros diretos:

```bash
pm2 start src/index.js --name nexusbot --update-env
```

Ou com mais opções:

```bash
pm2 start src/index.js \
  --name nexusbot \
  --instances 1 \
  --max-memory-restart 1G \
  --error ./logs/err.log \
  --output ./logs/out.log \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
  --merge-logs
```

## 🔄 Alternativas

### Opção 1: Renomear para .cjs (Recomendado)
Se quiser usar o arquivo de configuração, renomeie para `ecosystem.config.cjs`:

```bash
mv ecosystem.config.js ecosystem.config.cjs
pm2 start ecosystem.config.cjs
```

### Opção 2: Manter .js e usar comando direto (Atual)
Mantenha o arquivo como referência, mas use comandos diretos do PM2.

## 📝 Arquivo Mantido

O arquivo `ecosystem.config.js` é mantido no projeto como **referência/documentação** das configurações do PM2, mas os scripts de deploy usam comandos diretos.

