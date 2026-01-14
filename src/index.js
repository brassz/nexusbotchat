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
    console.log('═══════════════════════════════════════════');
    console.log('🚀 Inicializando NexusBOT...');
    console.log('═══════════════════════════════════════════');
    
    // Aguardar um pouco antes de inicializar para garantir que tudo está pronto
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await initializeBot();
    botInitialized = true;
    console.log('✅ Bot inicializado com sucesso!');
    console.log('📱 Aguardando QR Code ser gerado...');
    console.log('💡 Acesse o painel e vá na aba "QR Code" para visualizar');
    console.log('💡 O QR Code será exibido automaticamente quando gerado');
  } catch (error) {
    console.error('❌ Erro ao inicializar bot:', error);
    console.error('Detalhes:', error.message);
    console.log('⚠️  Servidor iniciado, mas bot não conectado.');
    console.log('💡 Tente reiniciar o servidor ou verificar os logs.');
    console.log('💡 Se o erro persistir, verifique se o Chrome está instalado e se há processos do navegador rodando.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Painel disponível em http://localhost:${PORT}`);
  });

  // Agendar envio automático de mensagens
  // 5:00 da manhã
  cron.schedule('0 5 * * *', async () => {
    if (botInitialized) {
      console.log('\n⏰ ============================================');
      console.log('📧 Iniciando envio automático (5:00 AM)...');
      console.log('============================================\n');
      try {
        const { sendAutomaticMessages } = await import('./routes/api.js');
        const result = await sendAutomaticMessages();
        console.log('\n✅ Envio automático (5:00 AM) concluído:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('❌ Erro no envio automático (5:00 AM):', error);
      }
    } else {
      console.log('⚠️  Bot não inicializado, pulando envio automático (5:00 AM)');
    }
  });

  // 12:00 (meio-dia)
  cron.schedule('0 12 * * *', async () => {
    if (botInitialized) {
      console.log('\n⏰ ============================================');
      console.log('📧 Iniciando envio automático (12:00 PM)...');
      console.log('============================================\n');
      try {
        const { sendAutomaticMessages } = await import('./routes/api.js');
        const result = await sendAutomaticMessages();
        console.log('\n✅ Envio automático (12:00 PM) concluído:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('❌ Erro no envio automático (12:00 PM):', error);
      }
    } else {
      console.log('⚠️  Bot não inicializado, pulando envio automático (12:00 PM)');
    }
  });

  // 18:30 (6:30 PM)
  cron.schedule('30 18 * * *', async () => {
    if (botInitialized) {
      console.log('\n⏰ ============================================');
      console.log('📧 Iniciando envio automático (18:30 PM)...');
      console.log('============================================\n');
      try {
        const { sendAutomaticMessages } = await import('./routes/api.js');
        const result = await sendAutomaticMessages();
        console.log('\n✅ Envio automático (18:30 PM) concluído:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('❌ Erro no envio automático (18:30 PM):', error);
      }
    } else {
      console.log('⚠️  Bot não inicializado, pulando envio automático (18:30 PM)');
    }
  });

  console.log('⏰ Agendamentos automáticos configurados:');
  console.log('   - 5:00 AM (diariamente)');
  console.log('   - 12:00 PM (diariamente)');
  console.log('   - 18:30 PM (diariamente)');
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

