# 🚀 Guia Rápido - NexusBOT

## Instalação Local

1. **Instalar dependências:**
```bash
npm install
```

2. **Criar arquivo .env:**
Copie o conteúdo de `env.example.txt` e crie um arquivo `.env` na raiz do projeto.

3. **Iniciar o bot:**
```bash
npm start
```

4. **Escanear QR Code:**
- Um QR Code aparecerá no terminal
- Abra o WhatsApp no celular
- Vá em Configurações > Aparelhos conectados > Conectar um aparelho
- Escaneie o QR Code

5. **Acessar o painel:**
Abra o navegador em: `http://localhost:3000`

## Deploy para VPS

### Pré-requisitos

1. **Acesso SSH configurado:**
```bash
# No Windows (PowerShell), instale OpenSSH se necessário
# Depois, copie sua chave SSH:
ssh-copy-id root@212.85.19.210
```

2. **Configurar VPS (primeira vez):**
```bash
# Conecte na VPS
ssh root@212.85.19.210

# Execute o script de setup
bash <(curl -s https://raw.githubusercontent.com/seu-repo/setup-vps.sh)
# OU copie o arquivo scripts/setup-vps.sh para a VPS e execute
```

### Deploy

1. **Certifique-se que o arquivo .env está configurado**

2. **Execute o deploy:**
```bash
npm run deploy
```

O script irá:
- Transferir arquivos via SCP
- Instalar dependências
- Configurar PM2
- Iniciar a aplicação

3. **Acessar o painel na VPS:**
```
http://212.85.19.210:3000
```

## Comandos Úteis

### Local
```bash
npm start          # Iniciar bot
npm run dev        # Modo desenvolvimento (com watch)
```

### VPS
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

## Mensagem Enviada aos Clientes

A mensagem inclui:
- Apresentação como Rafael, Gestor Financeiro da XPCRED
- Detalhes do empréstimo (valor, vencimento)
- Informações do PIX para pagamento
- Tom profissional e educado

## Troubleshooting

### Bot não conecta
- Verifique se o Chrome está instalado
- Delete a pasta `.wppconnect` e tente novamente
- Verifique se o WhatsApp Web não está aberto em outro lugar

### Erro ao buscar empréstimos
- Verifique as credenciais do Supabase no `.env`
- Confirme que as tabelas existem no banco
- Verifique a conexão com a internet

### Erro no deploy (Windows)
- Instale o OpenSSH Client no Windows
- Use Git Bash ou WSL para executar comandos SSH/SCP
- Ou use um cliente SCP como WinSCP para transferência manual

## Estrutura do Projeto

```
nexusbotchat/
├── src/
│   ├── bot/           # Bot WhatsApp
│   ├── config/         # Configurações
│   ├── routes/         # Rotas API
│   ├── services/       # Serviços (banco, mensagens)
│   └── index.js        # Entrada principal
├── public/             # Painel web
├── scripts/            # Scripts de deploy
└── package.json
```

## Suporte

Para problemas ou dúvidas, verifique:
- README.md para documentação completa
- Logs do PM2 na VPS
- Console do navegador (F12) para erros no painel

