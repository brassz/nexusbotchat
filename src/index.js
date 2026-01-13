import express from 'express';
import dotenv from 'dotenv';
import { initializeBot } from './bot/whatsappBot.js';
import apiRoutes from './routes/api.js';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Criar pasta de áudios se não existir
const audioDir = path.join(__dirname, '..', 'public', 'audios');
fs.ensureDirSync(audioDir);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Rotas
app.use('/api', apiRoutes);

// Rota principal - redireciona para o painel
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Inicializar bot
let botInitialized = false;

async function startServer() {
  try {
    console.log('Inicializando NexusBOT...');
    await initializeBot();
    botInitialized = true;
    console.log('Bot inicializado com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar bot:', error);
    console.log('Servidor iniciado, mas bot não conectado. Tente reiniciar.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Painel disponível em http://localhost:${PORT}`);
  });

  // Agendar envio automático de mensagens (diariamente às 9h)
  cron.schedule('0 9 * * *', async () => {
    if (botInitialized) {
      console.log('Iniciando envio automático de mensagens...');
      try {
        const { sendMessagesToOverdueClients } = await import('./bot/whatsappBot.js');
        const result = await sendMessagesToOverdueClients();
        console.log('Envio automático concluído:', result);
      } catch (error) {
        console.error('Erro no envio automático:', error);
      }
    }
  });

  console.log('⏰ Agendamento automático configurado: diariamente às 9h');
}

startServer();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});

process.on('SIGINT', () => {
  console.log('\nEncerrando servidor...');
  process.exit(0);
});

