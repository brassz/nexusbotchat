import wppconnect from '@wppconnect-team/wppconnect';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getOverdueAndDueTodayLoans, getLoansByDueDate } from '../services/loanService.js';
import { generateMessage } from '../services/messageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client = null;
let sessionName = null;
let currentQRCode = null;
let qrCodeListeners = [];

/**
 * Inicializa o bot WhatsApp
 */
export async function initializeBot() {
  sessionName = process.env.WHATSAPP_SESSION_NAME || 'nexusbot';

  try {
    client = await wppconnect.create({
      session: sessionName,
      catchQR: (base64Qr, asciiQR) => {
        console.log('Escaneie o QR Code:');
        console.log(asciiQR);
        // Armazenar QR Code para API
        currentQRCode = base64Qr;
        // Notificar listeners
        qrCodeListeners.forEach(listener => listener(base64Qr));
      },
      statusFind: (statusSession, session) => {
        console.log('Status da sessão:', statusSession);
        if (statusSession === 'isLogged') {
          console.log('Bot conectado com sucesso!');
        }
      },
      headless: true,
      devtools: false,
      useChrome: true,
      debug: false,
      logQR: true,
      browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      puppeteerOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      }
    });

    console.log('Bot WhatsApp inicializado com sucesso!');
    return client;
  } catch (error) {
    console.error('Erro ao inicializar bot:', error);
    throw error;
  }
}

/**
 * Envia áudio para um número de telefone
 * @param {string} phoneNumber - Número de telefone
 * @param {string} audioPath - Caminho do arquivo de áudio
 * @returns {Promise<boolean>} true se enviado com sucesso
 */
export async function sendAudio(phoneNumber, audioPath) {
  if (!client) {
    throw new Error('Bot não inicializado');
  }

  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    // Ler o arquivo de áudio como base64
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBase64 = audioBuffer.toString('base64');
    
    // Enviar áudio usando sendPtt (Push to Talk) - formato de áudio do WhatsApp
    // sendPtt espera: (number, base64Audio, filename)
    if (client.sendPtt) {
      await client.sendPtt(formattedNumber, audioBase64, 'mensagem.mp3');
      console.log(`Áudio enviado (PTT) para ${phoneNumber}`);
      return true;
    } else {
      // Método alternativo: enviar como arquivo
      await client.sendFile(formattedNumber, audioPath);
      console.log(`Áudio enviado (arquivo) para ${phoneNumber}`);
      return true;
    }
  } catch (error) {
    console.error(`Erro ao enviar áudio para ${phoneNumber}:`, error);
    // Tentar método alternativo com sendFile
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      await client.sendFile(formattedNumber, audioPath);
      console.log(`Áudio enviado (método alternativo) para ${phoneNumber}`);
      return true;
    } catch (error2) {
      console.error(`Erro ao enviar áudio (método alternativo):`, error2);
      return false;
    }
  }
}

/**
 * Envia mensagem para um número de telefone
 */
export async function sendMessage(phoneNumber, message, sendAudioFirst = false) {
  if (!client) {
    throw new Error('Bot não inicializado');
  }

  try {
    // Formatar número (remover caracteres especiais e adicionar @c.us)
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    // Se houver áudio configurado e sendAudioFirst for true, enviar áudio primeiro
    if (sendAudioFirst) {
      const audioPath = getAudioPath();
      if (audioPath) {
        try {
          await sendAudio(phoneNumber, audioPath);
          // Aguardar 1 segundo após enviar áudio
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Erro ao enviar áudio, continuando com mensagem:`, error);
        }
      }
    }
    
    await client.sendText(formattedNumber, message);
    console.log(`Mensagem enviada para ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * Obtém o caminho do áudio configurado
 */
function getAudioPath() {
  const audioDir = path.join(__dirname, '..', '..', 'public', 'audios');
  const audioFile = path.join(audioDir, 'mensagem.mp3');
  
  if (fs.existsSync(audioFile)) {
    return audioFile;
  }
  
  return null;
}

/**
 * Envia mensagens para todos os clientes com empréstimos overdue ou due_today
 */
export async function sendMessagesToOverdueClients() {
  try {
    const loans = await getOverdueAndDueTodayLoans();
    
    if (loans.length === 0) {
      console.log('Nenhum empréstimo encontrado para envio de mensagens.');
      return { sent: 0, failed: 0, total: 0 };
    }

    console.log(`Encontrados ${loans.length} empréstimos para processar.`);

    let sent = 0;
    let failed = 0;

    for (const loan of loans) {
      if (!loan.client || !loan.client.phone) {
        console.log(`Cliente sem telefone para empréstimo ${loan.id}`);
        failed++;
        continue;
      }

      const message = generateMessage(loan, loan.client);
      const success = await sendMessage(loan.client.phone, message, true); // true = enviar áudio primeiro

      if (success) {
        sent++;
        // Aguardar 2 segundos entre mensagens para evitar bloqueio
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        failed++;
      }
    }

    return { sent, failed, total: loans.length };
  } catch (error) {
    console.error('Erro ao enviar mensagens:', error);
    return { sent: 0, failed: 0, total: 0, error: error.message };
  }
}

/**
 * Envia mensagens para empréstimos de uma data específica
 */
export async function sendMessagesByDueDate(dueDate) {
  try {
    const loans = await getLoansByDueDate(dueDate);
    
    if (loans.length === 0) {
      console.log(`Nenhum empréstimo encontrado para a data ${dueDate.toLocaleDateString('pt-BR')}.`);
      return { sent: 0, failed: 0, total: 0 };
    }

    console.log(`Encontrados ${loans.length} empréstimos para a data especificada.`);

    let sent = 0;
    let failed = 0;

    for (const loan of loans) {
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

    return { sent, failed, total: loans.length };
  } catch (error) {
    console.error('Erro ao enviar mensagens por data:', error);
    return { sent: 0, failed: 0, total: 0, error: error.message };
  }
}

/**
 * Formata número de telefone para o formato do WhatsApp
 */
function formatPhoneNumber(phone) {
  // Remove caracteres especiais
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Adiciona @c.us para o formato do WhatsApp
  return cleaned + '@c.us';
}

/**
 * Obtém o cliente do bot
 */
export function getClient() {
  return client;
}

/**
 * Obtém o QR Code atual
 */
export function getQRCode() {
  return currentQRCode;
}

/**
 * Adiciona listener para mudanças no QR Code
 */
export function onQRCodeChange(callback) {
  qrCodeListeners.push(callback);
  // Se já existe QR Code, chamar callback imediatamente
  if (currentQRCode) {
    callback(currentQRCode);
  }
}

/**
 * Remove listener do QR Code
 */
export function removeQRCodeListener(callback) {
  qrCodeListeners = qrCodeListeners.filter(listener => listener !== callback);
}

