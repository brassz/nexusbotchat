import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { getOverdueAndDueTodayLoans, getLoansByDueDate } from '../services/loanService.js';
import { sendMessagesToOverdueClients, sendMessagesByDueDate, sendMessage, sendAudio, getQRCode, disconnectBot, isBotConnected, restartBot } from '../bot/whatsappBot.js';
import { generateMessage } from '../services/messageService.js';
import { v4 as uuidv4 } from 'uuid';
import { getAvailableCompanies } from '../config/database.js';

// Armazenar processos de envio em memória (em produção, usar Redis)
const sendingProcesses = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para upload de áudio
const audioDir = path.join(__dirname, '..', '..', 'public', 'audios');
fs.ensureDirSync(audioDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    // Sempre salvar como mensagem.mp3
    cb(null, 'mensagem.mp3');
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos MP3 são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

const router = express.Router();

/**
 * GET /api/companies
 * Retorna lista de empresas disponíveis
 */
router.get('/companies', (req, res) => {
  try {
    const companies = getAvailableCompanies();
    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/loans/overdue
 * Retorna lista de empréstimos overdue e due_today
 */
router.get('/loans/overdue', async (req, res) => {
  try {
    const company = req.query.company || 'franca';
    const loans = await getOverdueAndDueTodayLoans(null, company);
    res.json({ success: true, data: loans, count: loans.length, company });
  } catch (error) {
    console.error('Erro ao buscar empréstimos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/loans/by-date
 * Retorna empréstimos por data de vencimento
 */
router.get('/loans/by-date', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetro "date" é obrigatório (formato: YYYY-MM-DD)' 
      });
    }

    const dueDate = new Date(date);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Data inválida. Use o formato YYYY-MM-DD' 
      });
    }

    const company = req.query.company || 'franca';
    const loans = await getLoansByDueDate(dueDate, company);
    res.json({ success: true, data: loans, count: loans.length, company });
  } catch (error) {
    console.error('Erro ao buscar empréstimos por data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send-overdue
 * Envia mensagens para todos os clientes com empréstimos overdue ou due_today
 */
router.post('/messages/send-overdue', async (req, res) => {
  try {
    const result = await sendMessagesToOverdueClients();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Erro ao enviar mensagens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send-by-date
 * Envia mensagens para empréstimos de uma data específica
 */
router.post('/messages/send-by-date', async (req, res) => {
  try {
    const { date, company } = req.body;
    const selectedCompany = company || 'franca';
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "date" é obrigatório (formato: YYYY-MM-DD)' 
      });
    }

    const dueDate = new Date(date);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Data inválida. Use o formato YYYY-MM-DD'
      });
    }

    const loans = await getLoansByDueDate(dueDate, selectedCompany);
    
    if (loans.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0, total: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const loan of loans) {
      if (!loan.client || !loan.client.phone) {
        failed++;
        continue;
      }

      const message = generateMessage(loan, loan.client);
      const success = await sendMessage(loan.client.phone, message, true);

      if (success) {
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        failed++;
      }
    }

    res.json({ success: true, sent, failed, total: loans.length });
  } catch (error) {
    console.error('Erro ao enviar mensagens por data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send-single
 * Envia mensagem para um número específico
 */
router.post('/messages/send-single', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "phone" é obrigatório' 
      });
    }

    const messageText = message || 'Mensagem de teste do NexusBOT';
    const success = await sendMessage(phone, messageText);
    
    if (success) {
      res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } else {
      res.status(500).json({ success: false, error: 'Falha ao enviar mensagem' });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem única:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/preview-message
 * Gera preview da mensagem sem enviar
 */
router.get('/preview-message', async (req, res) => {
  try {
    const { loanId } = req.query;
    
    if (!loanId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetro "loanId" é obrigatório' 
      });
    }

    // Buscar empréstimo específico
    const loans = await getOverdueAndDueTodayLoans();
    const loan = loans.find(l => l.id === loanId || l.loan_id === loanId);
    
    if (!loan || !loan.client) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empréstimo não encontrado' 
      });
    }

    const message = generateMessage(loan, loan.client);
    res.json({ success: true, message, loan, client: loan.client });
  } catch (error) {
    console.error('Erro ao gerar preview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/qr-code
 * Retorna o QR Code atual do WhatsApp
 */
router.get('/qr-code', async (req, res) => {
  try {
    const qrCode = getQRCode();
    const isConnected = isBotConnected();
    
    console.log('GET /api/qr-code - QR Code:', qrCode ? 'Existe' : 'Não existe', '| Conectado:', isConnected);
    
    if (!qrCode && !isConnected) {
      return res.json({ 
        success: false, 
        qrCode: null, 
        isConnected: false,
        message: 'QR Code ainda não foi gerado. Aguarde o bot inicializar...' 
      });
    }

    if (isConnected && !qrCode) {
      return res.json({ 
        success: true, 
        qrCode: null, 
        isConnected: true,
        message: 'WhatsApp já está conectado' 
      });
    }

    if (qrCode) {
      console.log('Retornando QR Code (tamanho base64):', qrCode.length);
      return res.json({ success: true, qrCode, isConnected: false });
    }

    res.json({ 
      success: false, 
      qrCode: null, 
      isConnected: false,
      message: 'QR Code não disponível' 
    });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bot/status
 * Retorna o status de conexão do bot
 */
router.get('/bot/status', (req, res) => {
  try {
    const isConnected = isBotConnected();
    const qrCode = getQRCode();
    
    res.json({ 
      success: true, 
      isConnected,
      hasQRCode: qrCode !== null
    });
  } catch (error) {
    console.error('Erro ao verificar status do bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bot/disconnect
 * Desconecta o bot WhatsApp
 */
router.post('/bot/disconnect', async (req, res) => {
  try {
    const success = await disconnectBot();
    
    if (success) {
      res.json({ success: true, message: 'Bot desconectado com sucesso' });
    } else {
      res.json({ success: false, message: 'Bot já estava desconectado' });
    }
  } catch (error) {
    console.error('Erro ao desconectar bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bot/restart
 * Reinicia o bot (desconecta e reconecta)
 */
router.post('/bot/restart', async (req, res) => {
  try {
    await restartBot();
    res.json({ success: true, message: 'Bot reiniciado com sucesso. Novo QR Code será gerado.' });
  } catch (error) {
    console.error('Erro ao reiniciar bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send-selected
 * Envia mensagens para empréstimos selecionados (método antigo - mantido para compatibilidade)
 */
router.post('/messages/send-selected', async (req, res) => {
  try {
    const { loanIds } = req.body;
    
    if (!loanIds || !Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "loanIds" é obrigatório e deve ser um array não vazio' 
      });
    }

    const company = req.query.company || req.body.company || 'franca';
    const allLoans = await getOverdueAndDueTodayLoans(null, company);
    const selectedLoans = allLoans.filter(loan => 
      loanIds.includes(loan.id) || loanIds.includes(loan.loan_id)
    );

    if (selectedLoans.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nenhum empréstimo encontrado com os IDs fornecidos' 
      });
    }

    let sent = 0;
    let failed = 0;

    for (const loan of selectedLoans) {
      if (!loan.client || !loan.client.phone) {
        console.log(`Cliente sem telefone para empréstimo ${loan.id}`);
        failed++;
        continue;
      }

      const message = generateMessage(loan, loan.client);
      const success = await sendMessage(loan.client.phone, message, true); // true = enviar áudio primeiro

      if (success) {
        sent++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        failed++;
      }
    }

    res.json({ success: true, sent, failed, total: selectedLoans.length });
  } catch (error) {
    console.error('Erro ao enviar mensagens selecionadas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/messages/send-selected-staged
 * Envia mensagens em etapas: primeiro áudios, depois textos
 */
router.post('/messages/send-selected-staged', async (req, res) => {
  try {
    const { loanIds } = req.body;
    
    if (!loanIds || !Array.isArray(loanIds) || loanIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "loanIds" é obrigatório e deve ser um array não vazio' 
      });
    }

    const company = req.query.company || req.body.company || 'franca';
    const allLoans = await getOverdueAndDueTodayLoans(null, company);
    const selectedLoans = allLoans.filter(loan => 
      loanIds.includes(loan.id) || loanIds.includes(loan.loan_id)
    );

    if (selectedLoans.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nenhum empréstimo encontrado com os IDs fornecidos' 
      });
    }

    // Criar processo de envio
    const processId = uuidv4();
    const process = {
      id: processId,
      total: selectedLoans.length,
      audioSent: 0,
      audioFailed: 0,
      textSent: 0,
      textFailed: 0,
      audioCurrent: 0,
      textCurrent: 0,
      status: 'starting',
      stopped: false,
      loans: selectedLoans
    };

    sendingProcesses.set(processId, process);

    // Iniciar envio em background
    sendStagedMessages(processId, selectedLoans).catch(error => {
      console.error('Erro no processo de envio:', error);
      const p = sendingProcesses.get(processId);
      if (p) {
        p.status = 'error';
        p.error = error.message;
      }
    });

    res.json({ success: true, processId });
  } catch (error) {
    console.error('Erro ao iniciar envio em etapas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Função para envio automático de mensagens para todas as empresas
 * Usa a mesma lógica de envio intercalado
 */
export async function sendAutomaticMessages() {
  try {
    const companies = getAvailableCompanies();
    const results = [];

    for (const company of companies) {
      console.log(`\n📧 Iniciando envio automático para empresa: ${company.name} (${company.id})`);
      
      try {
        const loans = await getOverdueAndDueTodayLoans(null, company.id);
        
        if (loans.length === 0) {
          console.log(`✅ Nenhum empréstimo encontrado para ${company.name}`);
          results.push({
            company: company.name,
            total: 0,
            audioSent: 0,
            audioFailed: 0,
            textSent: 0,
            textFailed: 0
          });
          continue;
        }

        console.log(`📊 Encontrados ${loans.length} empréstimos para ${company.name}`);

        // Criar processo de envio automático (sem processId visível no frontend)
        const processId = `auto-${company.id}-${Date.now()}`;
        const process = {
          id: processId,
          total: loans.length,
          audioSent: 0,
          audioFailed: 0,
          textSent: 0,
          textFailed: 0,
          audioCurrent: 0,
          textCurrent: 0,
          status: 'starting',
          stopped: false,
          loans: loans
        };

        sendingProcesses.set(processId, process);

        // Enviar mensagens usando a mesma lógica intercalada
        await sendStagedMessages(processId, loans);

        const finalProcess = sendingProcesses.get(processId);
        results.push({
          company: company.name,
          total: finalProcess.total,
          audioSent: finalProcess.audioSent,
          audioFailed: finalProcess.audioFailed,
          textSent: finalProcess.textSent,
          textFailed: finalProcess.textFailed
        });

        // Limpar processo após conclusão
        sendingProcesses.delete(processId);

        console.log(`✅ Envio automático concluído para ${company.name}: ${finalProcess.textSent} textos enviados`);
      } catch (error) {
        console.error(`❌ Erro ao enviar mensagens para ${company.name}:`, error);
        results.push({
          company: company.name,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erro no envio automático:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Função para enviar mensagens em etapas com intercalação
 * Estratégia: Enviar 2 áudios (delay 5min entre cada), depois 1 texto (delay 5min), repetir
 * Intercala os envios para evitar bloqueios do WhatsApp
 */
async function sendStagedMessages(processId, loans) {
  const process = sendingProcesses.get(processId);
  if (!process) return;

  const AUDIO_DELAY = 5 * 60 * 1000; // 5 minutos em milissegundos
  const TEXT_DELAY = 5 * 60 * 1000;  // 5 minutos em milissegundos
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const audioDir = path.join(__dirname, '..', '..', 'public', 'audios');
  const audioFile = path.join(audioDir, 'mensagem.mp3');
  const hasAudio = fs.existsSync(audioFile);

  // Separar empréstimos para áudio e texto
  const audioQueue = [...loans];
  const textQueue = [...loans];
  
  let audioIndex = 0;
  let textIndex = 0;
  let audioCount = 0; // Contador para alternar: 2 áudios, 1 texto

  process.status = 'sending_audio';

  // Intercalar envios: 2 áudios, depois 1 texto, depois 2 áudios, etc.
  while ((audioIndex < audioQueue.length || textIndex < textQueue.length) && !process.stopped) {
    // Enviar 2 áudios primeiro
    if (audioCount < 2 && audioIndex < audioQueue.length) {
      const loan = audioQueue[audioIndex];
      process.audioCurrent = audioIndex + 1;
      process.status = 'sending_audio';

      if (loan.client && loan.client.phone) {
        if (hasAudio) {
          try {
            console.log(`Enviando áudio ${audioIndex + 1}/${audioQueue.length} para ${loan.client.phone}`);
            const success = await sendAudio(loan.client.phone, audioFile);
            if (success) {
              process.audioSent++;
            } else {
              process.audioFailed++;
            }
          } catch (error) {
            console.error(`Erro ao enviar áudio para ${loan.client.phone}:`, error);
            process.audioFailed++;
          }
        } else {
          // Se não tem áudio, marcar como enviado (pula)
          process.audioSent++;
        }
      } else {
        process.audioFailed++;
      }

      audioIndex++;
      audioCount++;

      // Delay de 5 minutos entre áudios (sempre que houver próximo áudio na sequência)
      if (audioIndex < audioQueue.length && audioCount < 2 && !process.stopped) {
        const delayMinutes = AUDIO_DELAY / 1000 / 60;
        console.log(`⏳ Aguardando ${delayMinutes} minutos antes do próximo áudio...`);
        await new Promise(resolve => setTimeout(resolve, AUDIO_DELAY));
      }
    } 
    // Depois enviar 1 texto
    else if (textIndex < textQueue.length) {
      const loan = textQueue[textIndex];
      process.textCurrent = textIndex + 1;
      process.status = 'sending_text';

      if (loan.client && loan.client.phone) {
        try {
          console.log(`Enviando texto ${textIndex + 1}/${textQueue.length} para ${loan.client.phone}`);
          const message = generateMessage(loan, loan.client);
          const success = await sendMessage(loan.client.phone, message, false); // false = não enviar áudio

          if (success) {
            process.textSent++;
          } else {
            process.textFailed++;
          }
        } catch (error) {
          console.error(`Erro ao enviar texto para ${loan.client.phone}:`, error);
          process.textFailed++;
        }
      } else {
        process.textFailed++;
      }

      textIndex++;
      audioCount = 0; // Resetar contador para enviar mais 2 áudios

      // Delay de 5 minutos entre textos (antes de voltar a enviar áudios)
      if (audioIndex < audioQueue.length && !process.stopped) {
        const delayMinutes = TEXT_DELAY / 1000 / 60;
        console.log(`⏳ Aguardando ${delayMinutes} minutos antes do próximo ciclo (2 áudios)...`);
        await new Promise(resolve => setTimeout(resolve, TEXT_DELAY));
      }
    } else {
      // Se não há mais nada para enviar, sair do loop
      break;
    }
  }

  // Se sobrou algum áudio ou texto, enviar o restante
  // Enviar áudios restantes
  while (audioIndex < audioQueue.length && !process.stopped) {
    const loan = audioQueue[audioIndex];
    process.audioCurrent = audioIndex + 1;
    process.status = 'sending_audio';

    if (loan.client && loan.client.phone) {
      if (hasAudio) {
        try {
          console.log(`Enviando áudio restante ${audioIndex + 1}/${audioQueue.length} para ${loan.client.phone}`);
          const success = await sendAudio(loan.client.phone, audioFile);
          if (success) {
            process.audioSent++;
          } else {
            process.audioFailed++;
          }
        } catch (error) {
          console.error(`Erro ao enviar áudio para ${loan.client.phone}:`, error);
          process.audioFailed++;
        }
      } else {
        process.audioSent++;
      }
    } else {
      process.audioFailed++;
    }

    audioIndex++;

    if (audioIndex < audioQueue.length && !process.stopped) {
      console.log(`Aguardando ${AUDIO_DELAY / 1000 / 60} minutos antes do próximo áudio...`);
      await new Promise(resolve => setTimeout(resolve, AUDIO_DELAY));
    }
  }

  // Enviar textos restantes
  while (textIndex < textQueue.length && !process.stopped) {
    const loan = textQueue[textIndex];
    process.textCurrent = textIndex + 1;
    process.status = 'sending_text';

    if (loan.client && loan.client.phone) {
      try {
        console.log(`Enviando texto restante ${textIndex + 1}/${textQueue.length} para ${loan.client.phone}`);
        const message = generateMessage(loan, loan.client);
        const success = await sendMessage(loan.client.phone, message, false);

        if (success) {
          process.textSent++;
        } else {
          process.textFailed++;
        }
      } catch (error) {
        console.error(`Erro ao enviar texto para ${loan.client.phone}:`, error);
        process.textFailed++;
      }
    } else {
      process.textFailed++;
    }

    textIndex++;

    if (textIndex < textQueue.length && !process.stopped) {
      console.log(`Aguardando ${TEXT_DELAY / 1000 / 60} minutos antes do próximo texto...`);
      await new Promise(resolve => setTimeout(resolve, TEXT_DELAY));
    }
  }

  // Resetar contadores atuais antes de marcar como concluído
  process.audioCurrent = 0;
  process.textCurrent = 0;
  process.status = 'completed';
  console.log('✅ Processo de envio concluído!');
}

/**
 * GET /api/messages/send-progress/:processId
 * Retorna o progresso de um processo de envio
 */
router.get('/messages/send-progress/:processId', (req, res) => {
  const { processId } = req.params;
  const process = sendingProcesses.get(processId);

  if (!process) {
    return res.status(404).json({
      success: false,
      error: 'Processo não encontrado'
    });
  }

  res.json({
    success: true,
    progress: {
      total: process.total,
      audioSent: process.audioSent,
      audioFailed: process.audioFailed,
      textSent: process.textSent,
      textFailed: process.textFailed,
      audioCurrent: process.audioCurrent,
      textCurrent: process.textCurrent,
      status: process.status
    }
  });
});

/**
 * POST /api/messages/send-stop/:processId
 * Para um processo de envio
 */
router.post('/messages/send-stop/:processId', (req, res) => {
  const { processId } = req.params;
  const process = sendingProcesses.get(processId);

  if (!process) {
    return res.status(404).json({
      success: false,
      error: 'Processo não encontrado'
    });
  }

  process.stopped = true;
  process.status = 'stopped';

  res.json({ success: true, message: 'Processo interrompido' });
});

/**
 * POST /api/messages/send-single-loan
 * Envia mensagem para um empréstimo específico
 */
router.post('/messages/send-single-loan', async (req, res) => {
  try {
    const { loanId, sendOption, company } = req.body;
    
    if (!loanId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campo "loanId" é obrigatório' 
      });
    }

    const selectedCompany = company || req.query.company || 'franca';
    console.log(`Buscando empréstimo ${loanId} na empresa ${selectedCompany}`);
    
    const allLoans = await getOverdueAndDueTodayLoans(null, selectedCompany);
    console.log(`Total de empréstimos encontrados: ${allLoans.length}`);
    
    const loan = allLoans.find(l => {
      const matchesId = l.id === loanId || l.loan_id === loanId;
      if (matchesId) {
        console.log(`Empréstimo encontrado:`, { id: l.id, loan_id: l.loan_id, client: l.client ? 'sim' : 'não' });
      }
      return matchesId;
    });
    
    if (!loan) {
      console.log(`Empréstimo não encontrado. IDs disponíveis (primeiros 5):`, 
        allLoans.slice(0, 5).map(l => ({ id: l.id, loan_id: l.loan_id }))
      );
      return res.status(404).json({ 
        success: false, 
        error: `Empréstimo não encontrado. Verifique se o ID está correto e se a empresa está selecionada corretamente.` 
      });
    }
    
    if (!loan.client) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente não encontrado para este empréstimo' 
      });
    }

    if (!loan.client.phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cliente não possui telefone cadastrado' 
      });
    }

    const message = generateMessage(loan, loan.client);
    let success = false;

    // Determinar o que enviar baseado na opção
    if (sendOption === 'audio-text') {
      // Enviar áudio primeiro, depois texto
      success = await sendMessage(loan.client.phone, message, true);
    } else if (sendOption === 'text') {
      // Enviar apenas texto
      success = await sendMessage(loan.client.phone, message, false);
    } else if (sendOption === 'audio') {
      // Enviar apenas áudio
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const audioDir = path.join(__dirname, '..', '..', 'public', 'audios');
      const audioFile = path.join(audioDir, 'mensagem.mp3');
      
      if (fs.existsSync(audioFile)) {
        success = await sendAudio(loan.client.phone, audioFile);
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Nenhum áudio configurado' 
        });
      }
    } else {
      // Padrão: enviar áudio + texto
      success = await sendMessage(loan.client.phone, message, true);
    }

    if (success) {
      res.json({ success: true, message: 'Mensagem enviada com sucesso' });
    } else {
      res.status(500).json({ success: false, error: 'Falha ao enviar mensagem' });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem única:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/audio/upload
 * Faz upload do áudio MP3
 */
router.post('/audio/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum arquivo enviado' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Áudio enviado com sucesso',
      filename: req.file.filename,
      path: `/audios/${req.file.filename}`
    });
  } catch (error) {
    console.error('Erro ao fazer upload do áudio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audio/status
 * Verifica se existe áudio configurado
 */
router.get('/audio/status', async (req, res) => {
  try {
    const audioPath = path.join(audioDir, 'mensagem.mp3');
    const exists = fs.existsSync(audioPath);
    
    if (exists) {
      const stats = fs.statSync(audioPath);
      res.json({ 
        success: true, 
        exists: true,
        filename: 'mensagem.mp3',
        size: stats.size,
        modified: stats.mtime
      });
    } else {
      res.json({ 
        success: true, 
        exists: false 
      });
    }
  } catch (error) {
    console.error('Erro ao verificar status do áudio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/audio
 * Remove o áudio configurado
 */
router.delete('/audio', async (req, res) => {
  try {
    const audioPath = path.join(audioDir, 'mensagem.mp3');
    
    if (fs.existsSync(audioPath)) {
      fs.removeSync(audioPath);
      res.json({ success: true, message: 'Áudio removido com sucesso' });
    } else {
      res.status(404).json({ success: false, error: 'Áudio não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao remover áudio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

