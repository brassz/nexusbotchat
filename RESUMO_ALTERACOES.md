# 📋 Resumo das Alterações e Transferência

## 🔧 Correções Implementadas

### 1. Busca de Empréstimos Melhorada
- ✅ Agora busca TODOS os empréstimos (não apenas com status específicos)
- ✅ Filtra corretamente empréstimos vencidos e que vencem hoje
- ✅ Inclui empréstimos das tabelas:
  - `loans` (todos exceto paid/cancelled)
  - `overdue_loans` (em processo de cobrança)
  - `partial_paid_loans` (parcialmente pagos e vencidos)
- ✅ Remove duplicatas inteligentemente
- ✅ Logs para debug mostrando quantos empréstimos foram encontrados

### 2. Arquivos Alterados
- `public/index.html` - Sistema de abas
- `public/script.js` - Lógica de abas, seleção múltipla, QR Code
- `public/styles.css` - Estilos para abas e novos componentes
- `src/bot/whatsappBot.js` - Exposição do QR Code via API
- `src/routes/api.js` - Novas rotas (QR Code, envio individual, envio selecionado)
- `src/services/loanService.js` - **Busca melhorada de empréstimos**

## 🚀 Como Transferir

### Opção 1: Script Automatizado (Recomendado)

**Windows PowerShell:**
```powershell
powershell -ExecutionPolicy Bypass -File TRANSFERIR_ALTERACOES.ps1
```

**Linux/Mac:**
```bash
bash TRANSFERIR_ALTERACOES.sh
```

### Opção 2: Comandos Individuais

Veja o arquivo `COMANDOS_SCP_ALTERACOES.txt` para comandos individuais.

### Opção 3: Copiar e Colar

```powershell
# PowerShell
scp public/index.html root@212.85.19.210:/var/www/nexusbot/public/
scp public/script.js root@212.85.19.210:/var/www/nexusbot/public/
scp public/styles.css root@212.85.19.210:/var/www/nexusbot/public/
scp src/bot/whatsappBot.js root@212.85.19.210:/var/www/nexusbot/src/bot/
scp src/routes/api.js root@212.85.19.210:/var/www/nexusbot/src/routes/
scp src/services/loanService.js root@212.85.19.210:/var/www/nexusbot/src/services/
```

## 🔄 Após Transferir

Reinicie o bot na VPS:

```bash
ssh root@212.85.19.210 "cd /var/www/nexusbot && pm2 restart nexusbot"
```

Ou use o comando do script que já inclui isso.

## ✅ Verificar se Funcionou

1. Acesse o painel: `http://212.85.19.210:3000`
2. Verifique se as abas aparecem
3. Verifique se mais empréstimos aparecem na lista
4. Teste a aba QR Code
5. Teste seleção múltipla e envio

## 📊 O que Foi Melhorado na Busca

**Antes:**
- Buscava apenas empréstimos com status 'overdue'
- Buscava apenas empréstimos 'active' que vencem hoje
- Não incluía empréstimos parcialmente pagos

**Agora:**
- Busca TODOS os empréstimos (exceto paid/cancelled)
- Calcula dinamicamente quais estão vencidos
- Inclui empréstimos de todas as tabelas relevantes
- Remove duplicatas inteligentemente
- Mostra logs para debug

## 🐛 Se Ainda Faltarem Empréstimos

1. Verifique os logs do servidor:
```bash
ssh root@212.85.19.210 "pm2 logs nexusbot"
```

2. Verifique se há empréstimos no banco com:
   - Status diferente de 'paid' ou 'cancelled'
   - Data de vencimento no passado ou hoje
   - Cliente associado

3. Os logs mostrarão quantos empréstimos foram encontrados

