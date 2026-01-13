# NexusBOT - Bot de Conversa para Cobrança de Empréstimos

Bot automatizado para envio de mensagens via WhatsApp para clientes com empréstimos em atraso ou que vencem hoje, integrado com Supabase e wppconnect.

## 🚀 Funcionalidades

- ✅ Integração com WhatsApp via wppconnect
- ✅ Conexão com banco de dados Supabase
- ✅ Busca automática de empréstimos overdue e due_today
- ✅ Busca por data de vencimento
- ✅ Painel web moderno e intuitivo
- ✅ Envio automático de mensagens profissionais
- ✅ Deploy automatizado para VPS via SCP

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Acesso SSH à VPS
- Conta WhatsApp para o bot
- Chaves de acesso ao Supabase

## 🔧 Instalação

1. Clone o repositório ou baixe os arquivos

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
SUPABASE_URL=https://mhtxyxizfnxupwmilith.supabase.co
SUPABASE_KEY=sua_chave_aqui
WHATSAPP_SESSION_NAME=nexusbot
PORT=3000
PIX_KEY=54413674000147
PIX_NAME=Tuane Carla Mendes Tomaz
VPS_HOST=212.85.19.210
VPS_USER=root
VPS_PATH=/var/www/nexusbot
```

## 🎯 Uso Local

1. Inicie o servidor:
```bash
npm start
```

2. Escaneie o QR Code que aparecerá no terminal para conectar o WhatsApp

3. Acesse o painel em: `http://localhost:3000`

## 📊 Painel Web

O painel web oferece:
- Visualização de estatísticas (empréstimos em atraso, que vencem hoje, total)
- Lista de empréstimos com detalhes
- Busca de clientes
- Envio manual de mensagens
- Filtro por data de vencimento
- Preview de mensagens

## 🤖 Funcionalidades do Bot

### Envio Automático
O bot envia mensagens automaticamente todos os dias às 9h para clientes com:
- Empréstimos com status `overdue`
- Empréstimos que vencem hoje (`due_today`)

### Mensagem Personalizada
A mensagem inclui:
- Apresentação como Rafael, Gestor Financeiro da XPCRED
- Detalhes do empréstimo (valor, data de vencimento)
- Informações do PIX para pagamento
- Tom profissional e educado

## 🚀 Deploy para VPS

### Configuração da VPS (Primeira Vez)

**⚠️ IMPORTANTE:** O script de setup deve ser executado **na VPS**, não no Windows!

1. **Conecte na VPS:**
```bash
ssh root@212.85.19.210
```

2. **Execute o setup (copie e cole na VPS):**
```bash
apt-get update -y && apt-get upgrade -y && \
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
apt-get install -y nodejs && \
npm install -g pm2 && \
apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils && \
mkdir -p /var/www/nexusbot/logs && \
pm2 startup
```

3. **Siga as instruções do PM2 que aparecerem**

4. **Volte para seu computador e faça o deploy:**
```bash
npm run deploy
```

Veja `COMO_CONFIGURAR_VPS.md` para instruções detalhadas.

### Configuração SSH

Certifique-se de ter acesso SSH configurado:
```bash
ssh-copy-id root@212.85.19.210
```

### Executar Deploy

```bash
npm run deploy
```

O script irá:
1. Criar o diretório no servidor
2. Transferir arquivos via SCP
3. Instalar dependências
4. Configurar PM2 para gerenciar o processo
5. Iniciar a aplicação

### Gerenciamento no Servidor

```bash
# Ver logs
ssh root@212.85.19.210 "pm2 logs nexusbot"

# Reiniciar
ssh root@212.85.19.210 "pm2 restart nexusbot"

# Parar
ssh root@212.85.19.210 "pm2 stop nexusbot"

# Status
ssh root@212.85.19.210 "pm2 status"
```

## 📡 API Endpoints

### GET `/api/loans/overdue`
Retorna lista de empréstimos overdue e due_today

### GET `/api/loans/by-date?date=YYYY-MM-DD`
Retorna empréstimos por data de vencimento

### POST `/api/messages/send-overdue`
Envia mensagens para todos os clientes com empréstimos overdue/due_today

### POST `/api/messages/send-by-date`
Body: `{ "date": "YYYY-MM-DD" }`
Envia mensagens para empréstimos de uma data específica

### POST `/api/messages/send-single`
Body: `{ "phone": "5511999999999", "message": "Texto da mensagem" }`
Envia mensagem para um número específico

### GET `/api/preview-message?loanId=uuid`
Gera preview da mensagem sem enviar

## 🗄️ Estrutura do Banco de Dados

O bot utiliza as seguintes tabelas do Supabase:
- `clients` - Dados dos clientes
- `loans` - Empréstimos principais
- `overdue_loans` - Empréstimos em processo de cobrança
- `partial_paid_loans` - Empréstimos parcelados

## 🔒 Segurança

- Nunca commite o arquivo `.env` no repositório
- Mantenha as chaves do Supabase seguras
- Use autenticação SSH por chave para a VPS
- Configure firewall adequadamente na VPS

## 📝 Notas

- O bot aguarda 2 segundos entre cada mensagem para evitar bloqueios
- Certifique-se de que o WhatsApp está conectado antes de enviar mensagens
- O QR Code precisa ser escaneado apenas na primeira vez

## 🐛 Troubleshooting

### Bot não conecta
- Verifique se o Chrome/Chromium está instalado
- Tente deletar a pasta `.wppconnect` e reconectar

### Erro ao buscar empréstimos
- Verifique as credenciais do Supabase
- Confirme que as tabelas existem no banco

### Erro no deploy
- Verifique acesso SSH
- Confirme que o diretório na VPS tem permissões adequadas
- Verifique se o Node.js está instalado na VPS

## 📄 Licença

ISC

## 👤 Autor

XPCRED - Desenvolvido para gestão financeira

