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

  // Se já existe um cliente, não inicializar novamente
  if (client) {
    console.log('⚠️  Bot já está inicializado. Use disconnectBot() primeiro se quiser reinicializar.');
    return client;
  }

  try {
    // Matar processos do navegador antes de inicializar
    await killBrowserProcesses();
    
    console.log(`🚀 Inicializando bot com sessão: ${sessionName}`);
    console.log(`📁 Diretório de tokens: ${process.cwd()}/tokens/${sessionName}`);
    
    client = await wppconnect.create({
      session: sessionName,
      catchQR: (base64Qr, asciiQR) => {
        console.log('═══════════════════════════════════════════');
        console.log('📱 QR CODE GERADO - ESCANEIE COM O WHATSAPP');
        console.log('═══════════════════════════════════════════');
        console.log(asciiQR);
        console.log('═══════════════════════════════════════════');
        // Armazenar QR Code para API
        currentQRCode = base64Qr;
        console.log('✅ QR Code armazenado (tamanho base64):', base64Qr ? base64Qr.length : 0);
        // Notificar listeners
        qrCodeListeners.forEach(listener => {
          try {
            listener(base64Qr);
          } catch (error) {
            console.error('Erro ao notificar listener do QR Code:', error);
          }
        });
      },
      statusFind: (statusSession, session) => {
        console.log('Status da sessão:', statusSession);
        if (statusSession === 'isLogged') {
          console.log('Bot conectado com sucesso!');
          currentQRCode = null; // Limpar QR Code quando logado
          qrCodeListeners.forEach(listener => listener(null)); // Notificar listeners
        } else if (statusSession === 'notLogged' || statusSession === 'browserClose') {
          console.log('Bot desconectado. Novo QR Code pode ser necessário.');
          currentQRCode = null;
          qrCodeListeners.forEach(listener => listener(null));
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

/**
 * Desconecta o bot WhatsApp
 */
export async function disconnectBot() {
  try {
    if (client) {
      console.log('Desconectando bot e fechando navegador...');
      
      // Fechar o navegador primeiro
      try {
        if (client.browser) {
          console.log('Fechando navegador...');
          const pages = await client.browser.pages();
          for (const page of pages) {
            try {
              await page.close();
            } catch (e) {
              // Ignorar erros ao fechar páginas
            }
          }
          
          if (typeof client.browser.close === 'function') {
            await client.browser.close();
            console.log('Navegador fechado com sucesso');
          }
        }
      } catch (browserError) {
        console.log('Erro ao fechar navegador:', browserError.message);
      }
      
      // Tentar usar logoutSession primeiro, se não existir, usar logout
      try {
        if (typeof client.logoutSession === 'function') {
          await client.logoutSession();
        } else if (typeof client.logout === 'function') {
          await client.logout();
        }
      } catch (logoutError) {
        console.log('Erro ao fazer logout (pode ser normal):', logoutError.message);
      }
      
      // Limpar referências
      client = null;
      currentQRCode = null;
      
      // Notificar listeners
      qrCodeListeners.forEach(listener => {
        try {
          listener(null);
        } catch (e) {
          // Ignorar erros nos listeners
        }
      });
      
      // Aguardar um pouco para garantir que tudo foi fechado
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Bot desconectado com sucesso');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao desconectar bot:', error);
    // Mesmo com erro, limpar referências
    client = null;
    currentQRCode = null;
    qrCodeListeners.forEach(listener => {
      try {
        listener(null);
      } catch (e) {
        // Ignorar erros
      }
    });
    throw error;
  }
}

/**
 * Verifica se o bot está conectado
 */
export function isBotConnected() {
  return client !== null;
}

/**
 * Mata processos do navegador relacionados à sessão
 */
async function killBrowserProcesses() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('🔪 Matando processos do navegador...');
    
    // Tentar matar processos do Chrome/Chromium relacionados à sessão
    const commands = [
      `pkill -f "chrome.*nexusbot" || true`,
      `pkill -f "chromium.*nexusbot" || true`,
      `pkill -f "chrome.*${sessionName}" || true`,
      `pkill -f "chromium.*${sessionName}" || true`
    ];
    
    for (const cmd of commands) {
      try {
        await execAsync(cmd);
      } catch (e) {
        // Ignorar erros (processo pode não existir)
      }
    }
    
    console.log('✅ Processos do navegador finalizados');
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.log('⚠️  Erro ao matar processos do navegador:', error.message);
  }
}

/**
 * Reinicializa o bot (desconecta e reconecta)
 */
export async function restartBot() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('🔄 Iniciando reinicialização do bot...');
    console.log('═══════════════════════════════════════════');
    
    // Desconectar se estiver conectado
    if (client) {
      console.log('Desconectando bot atual...');
      await disconnectBot();
    } else {
      // Mesmo sem cliente, tentar matar processos do navegador
      console.log('Nenhum cliente ativo, matando processos do navegador...');
      await killBrowserProcesses();
    }
    
    // Limpar QR Code anterior
    currentQRCode = null;
    
    // Aguardar mais tempo para garantir que tudo foi fechado
    console.log('⏳ Aguardando 5 segundos para garantir que tudo foi fechado...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Reinicializar bot
    console.log('🚀 Reinicializando bot...');
    await initializeBot();
    
    console.log('✅ Bot reinicializado com sucesso!');
    console.log('📱 QR Code será gerado em breve...');
    return true;
  } catch (error) {
    console.error('❌ Erro ao reinicializar bot:', error);
    // Tentar matar processos do navegador em caso de erro
    await killBrowserProcesses();
    throw error;
  }
}

