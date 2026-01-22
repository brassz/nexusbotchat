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
        
        // Verificar se o QR Code está no formato correto
        if (!base64Qr) {
          console.error('❌ QR Code base64 está vazio!');
          return;
        }
        
        // Garantir que o QR Code está no formato correto (data:image/png;base64,)
        let qrCodeFormatted = base64Qr;
        if (!qrCodeFormatted.startsWith('data:image')) {
          // Se não começar com data:image, adicionar o prefixo
          qrCodeFormatted = `data:image/png;base64,${base64Qr}`;
        }
        
        // Armazenar QR Code para API
        currentQRCode = qrCodeFormatted;
        console.log('✅ QR Code armazenado (tamanho base64):', qrCodeFormatted ? qrCodeFormatted.length : 0);
        console.log('✅ QR Code formato:', qrCodeFormatted.substring(0, 50) + '...');
        
        // Notificar listeners
        qrCodeListeners.forEach(listener => {
          try {
            listener(qrCodeFormatted);
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

  // Verificar se o cliente ainda está válido (verificação mais flexível)
  // O wppconnect pode não expor browser/page diretamente, então verificamos se client existe e tem métodos
  if (!client || typeof client.sendPtt !== 'function' && typeof client.sendFile !== 'function') {
    console.error('❌ Cliente do WhatsApp não está mais válido ou métodos não disponíveis');
    throw new Error('WhatsApp desconectado. Reconecte o bot.');
  }

  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    // Verificar se o arquivo de áudio existe
    if (!fs.existsSync(audioPath)) {
      console.error(`❌ Arquivo de áudio não encontrado: ${audioPath}`);
      console.error(`   Verifique se o arquivo existe no caminho especificado.`);
      return false;
    }
    
    // Verificar se é um arquivo válido
    const stats = fs.statSync(audioPath);
    if (!stats.isFile()) {
      console.error(`❌ O caminho especificado não é um arquivo: ${audioPath}`);
      return false;
    }
    
    console.log(`📤 Tentando enviar áudio: ${audioPath} (${(stats.size / 1024).toFixed(2)} KB)`);
    
    // Tentar primeiro com sendPtt usando o caminho do arquivo diretamente
    // O wppconnect pode aceitar tanto base64 quanto caminho de arquivo
    if (client.sendPtt) {
      try {
        // Tentar primeiro com o caminho do arquivo (mais comum no wppconnect)
        await client.sendPtt(formattedNumber, audioPath);
        console.log(`✅ Áudio enviado (PTT - caminho) para ${phoneNumber}`);
        return true;
      } catch (pttError) {
        // Se falhar, tentar com base64
        if (pttError.message && !pttError.message.includes('No such file')) {
          // Verificar se é erro de frame desconectado
          if (pttError.message && (pttError.message.includes('detached Frame') || pttError.message.includes('Target closed'))) {
            throw pttError; // Vai para o catch externo
          }
          
          // Tentar com base64
          try {
            const audioBuffer = fs.readFileSync(audioPath);
            const audioBase64 = audioBuffer.toString('base64');
            await client.sendPtt(formattedNumber, audioBase64, 'mensagem.mp3');
            console.log(`✅ Áudio enviado (PTT - base64) para ${phoneNumber}`);
            return true;
          } catch (base64Error) {
            console.warn(`⚠️ Erro ao enviar PTT com base64, tentando método alternativo:`, base64Error.message);
            throw base64Error; // Vai para o catch externo para tentar sendFile
          }
        } else {
          // Se o erro for "No such file", tentar método alternativo diretamente
          console.warn(`⚠️ Erro ao enviar PTT (arquivo não encontrado), tentando método alternativo:`, pttError.message);
          throw pttError; // Vai para o catch externo para tentar sendFile
        }
      }
    } else {
      // Método alternativo: enviar como arquivo
      await client.sendFile(formattedNumber, audioPath);
      console.log(`✅ Áudio enviado (arquivo) para ${phoneNumber}`);
      return true;
    }
  } catch (error) {
    // Verificar se é erro de frame desconectado
    if (error.message && (error.message.includes('detached Frame') || error.message.includes('Target closed'))) {
      console.error(`❌ Erro: Navegador/frame desconectado ao enviar áudio para ${phoneNumber}`);
      console.error(`   Isso geralmente significa que o WhatsApp foi desconectado ou o navegador foi fechado.`);
      console.error(`   Recomendação: Reconecte o bot ou reinicie o servidor.`);
      return false;
    }
    
    console.error(`❌ Erro ao enviar áudio para ${phoneNumber}:`, error.message || error);
    
    // Verificar se o erro é relacionado a arquivo não encontrado
    const isFileError = error.message && (
      error.message.includes('No such file') || 
      error.message.includes('ENOENT') ||
      error.message.includes('cannot find') ||
      (typeof error === 'object' && error.text && error.text.includes('No such file'))
    );
    
    if (isFileError) {
      console.error(`❌ Erro: Arquivo de áudio não encontrado ou inválido: ${audioPath}`);
      console.error(`   Verifique se o arquivo existe e está acessível.`);
      return false;
    }
    
    // Tentar método alternativo apenas se não for erro de frame desconectado ou arquivo
    if (!error.message || (!error.message.includes('detached Frame') && !error.message.includes('Target closed') && !error.message.includes('WhatsApp desconectado') && !isFileError)) {
      try {
        // Verificar novamente se o cliente está válido
        if (!client || (typeof client.sendFile !== 'function' && typeof client.sendPtt !== 'function')) {
          console.error('❌ Cliente inválido, não é possível tentar método alternativo');
          return false;
        }
        
        // Verificar se o arquivo ainda existe antes de tentar método alternativo
        if (!fs.existsSync(audioPath)) {
          console.error(`❌ Arquivo de áudio não encontrado para método alternativo: ${audioPath}`);
          return false;
        }
        
        const formattedNumber = formatPhoneNumber(phoneNumber);
        await client.sendFile(formattedNumber, audioPath);
        console.log(`✅ Áudio enviado (método alternativo - sendFile) para ${phoneNumber}`);
        return true;
      } catch (error2) {
        // Verificar se é erro de frame desconectado também no método alternativo
        if (error2.message && (error2.message.includes('detached Frame') || error2.message.includes('Target closed'))) {
          console.error(`❌ Erro: Navegador/frame desconectado no método alternativo para ${phoneNumber}`);
          return false;
        }
        
        // Verificar se é erro de arquivo
        const isFileError2 = error2.message && (
          error2.message.includes('No such file') || 
          error2.message.includes('ENOENT') ||
          error2.message.includes('cannot find') ||
          (typeof error2 === 'object' && error2.text && error2.text.includes('No such file'))
        );
        
        if (isFileError2) {
          console.error(`❌ Erro: Arquivo de áudio não encontrado no método alternativo: ${audioPath}`);
          return false;
        }
        
        console.error(`❌ Erro ao enviar áudio (método alternativo):`, error2.message || error2);
        return false;
      }
    }
    
    return false;
  }
}

/**
 * Envia mensagem para um número de telefone
 */
export async function sendMessage(phoneNumber, message, sendAudioFirst = false) {
  if (!client) {
    throw new Error('Bot não inicializado');
  }

  if (!phoneNumber) {
    throw new Error('Número de telefone não fornecido');
  }

  // Verificar se o cliente ainda está válido (verificação mais flexível)
  if (!client || typeof client.sendText !== 'function') {
    console.error('❌ Cliente do WhatsApp não está mais válido ou métodos não disponíveis');
    throw new Error('WhatsApp desconectado. Reconecte o bot.');
  }

  try {
    // Formatar número (remover caracteres especiais e adicionar @c.us)
    let formattedNumber;
    try {
      formattedNumber = formatPhoneNumber(phoneNumber);
    } catch (formatError) {
      console.error(`❌ Erro ao formatar número ${phoneNumber}:`, formatError.message);
      throw new Error(`Número de telefone inválido: ${phoneNumber}. ${formatError.message}`);
    }
    
    // Se houver áudio configurado e sendAudioFirst for true, enviar áudio primeiro
    if (sendAudioFirst) {
      const audioPath = getAudioPath();
      if (audioPath) {
        try {
          const audioSent = await sendAudio(phoneNumber, audioPath);
          if (!audioSent) {
            console.warn(`⚠️ Áudio não foi enviado para ${phoneNumber}, mas continuando com mensagem de texto...`);
          }
          // Aguardar 5 minutos após enviar áudio antes de enviar o texto
          const DELAY_BETWEEN_AUDIO_AND_TEXT = 5 * 60 * 1000; // 5 minutos em milissegundos
          console.log(`⏳ Aguardando 5 minutos após enviar áudio antes de enviar texto...`);
          const startTime = Date.now();
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AUDIO_AND_TEXT));
          const elapsed = Date.now() - startTime;
          console.log(`✅ Delay concluído: ${elapsed}ms aguardados, enviando texto agora...`);
        } catch (error) {
          // Se for erro de frame desconectado, não continuar
          if (error.message && (error.message.includes('detached Frame') || error.message.includes('Target closed') || error.message.includes('WhatsApp desconectado'))) {
            console.error(`❌ WhatsApp desconectado ao enviar áudio para ${phoneNumber}. Abortando envio.`);
            throw error;
          }
          console.error(`⚠️ Erro ao enviar áudio, continuando com mensagem:`, error.message || error);
        }
      }
    }
    
    // Verificar se o número está no formato correto antes de enviar
    if (!formattedNumber.includes('@c.us')) {
      throw new Error(`Número formatado incorretamente: ${formattedNumber}`);
    }
    
    // Tentar enviar a mensagem
    try {
      await client.sendText(formattedNumber, message);
      console.log(`✅ Mensagem enviada para ${phoneNumber} (${formattedNumber})`);
      return true;
    } catch (sendError) {
      // Verificar se é erro de frame desconectado
      if (sendError.message && (sendError.message.includes('detached Frame') || sendError.message.includes('Target closed'))) {
        console.error(`❌ Erro: Navegador/frame desconectado ao enviar mensagem para ${phoneNumber}`);
        console.error(`   Isso geralmente significa que o WhatsApp foi desconectado ou o navegador foi fechado.`);
        throw new Error('WhatsApp desconectado. Reconecte o bot.');
      }
      
      // Se o erro for "No LID for user", o número pode não estar no WhatsApp
      if (sendError.message && sendError.message.includes('No LID for user')) {
        console.error(`❌ Número ${phoneNumber} (${formattedNumber}) não encontrado no WhatsApp ou formato inválido`);
        console.error(`   Dica: Verifique se o número está correto e se está registrado no WhatsApp`);
        // Tentar formatar novamente sem o @c.us e adicionar novamente
        const numberOnly = formattedNumber.replace('@c.us', '');
        if (numberOnly.length >= 12 && numberOnly.length <= 13) {
          console.log(`   Tentando reenviar com número: ${numberOnly}@c.us`);
          try {
            // Verificar novamente se o cliente está válido
            if (!client || typeof client.sendText !== 'function') {
              throw new Error('WhatsApp desconectado durante a segunda tentativa');
            }
            await client.sendText(numberOnly + '@c.us', message);
            console.log(`✅ Mensagem enviada na segunda tentativa para ${phoneNumber}`);
            return true;
          } catch (retryError) {
            if (retryError.message && (retryError.message.includes('detached Frame') || retryError.message.includes('Target closed'))) {
              console.error(`❌ Erro: Navegador/frame desconectado na segunda tentativa`);
              throw new Error('WhatsApp desconectado. Reconecte o bot.');
            }
            console.error(`❌ Erro na segunda tentativa:`, retryError.message);
          }
        }
      }
      throw sendError;
    }
  } catch (error) {
    // Verificar se é erro de frame desconectado
    if (error.message && (error.message.includes('detached Frame') || error.message.includes('Target closed') || error.message.includes('WhatsApp desconectado'))) {
      console.error(`❌ WhatsApp desconectado ao enviar mensagem para ${phoneNumber}`);
      console.error(`   Recomendação: Reconecte o bot ou reinicie o servidor.`);
      return false;
    }
    
    console.error(`❌ Erro ao enviar mensagem para ${phoneNumber}:`, error.message || error);
    // Log mais detalhado para debug
    if (error.message) {
      console.error(`   Mensagem de erro: ${error.message}`);
    }
    if (error.stack) {
      console.error(`   Stack trace: ${error.stack.substring(0, 200)}...`);
    }
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
 * @param {string} company - Empresa para buscar (franca, litoral, mogiana, imperatriz)
 */
export async function sendMessagesToOverdueClients(company = 'franca') {
  try {
    const loans = await getOverdueAndDueTodayLoans(null, company);
    
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
 * @param {string} phone - Número de telefone
 * @returns {string} Número formatado no padrão WhatsApp
 */
function formatPhoneNumber(phone) {
  if (!phone) {
    throw new Error('Número de telefone não fornecido');
  }
  
  // Remove caracteres especiais
  let cleaned = phone.replace(/\D/g, '');
  
  // Validar se o número tem pelo menos 10 dígitos (DDD + número mínimo)
  if (cleaned.length < 10) {
    throw new Error(`Número de telefone muito curto: ${phone} (${cleaned.length} dígitos). Número deve ter pelo menos 10 dígitos (DDD + número)`);
  }
  
  // Remove zeros à esquerda do DDD (ex: 016 -> 16)
  if (cleaned.length > 10 && cleaned.startsWith('550')) {
    cleaned = '55' + cleaned.substring(3);
  }
  
  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    // Se começar com 0, remove o 0 e adiciona 55
    if (cleaned.startsWith('0')) {
      cleaned = '55' + cleaned.substring(1);
    } else {
      // Verificar se já tem DDD (2 primeiros dígitos entre 11-99)
      const firstTwo = cleaned.substring(0, 2);
      const ddd = parseInt(firstTwo);
      
      // Se os dois primeiros dígitos são um DDD válido (11-99), adicionar 55
      if (ddd >= 11 && ddd <= 99 && cleaned.length >= 10) {
        cleaned = '55' + cleaned;
      } else {
        // Se não parece ter DDD, assumir que precisa adicionar
        cleaned = '55' + cleaned;
      }
    }
  }
  
  // Validar tamanho do número (deve ter pelo menos 12 dígitos: 55 + DDD + número)
  // Formato esperado: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
  if (cleaned.length < 12 || cleaned.length > 13) {
    console.warn(`⚠️ Número de telefone com tamanho inválido: ${cleaned} (${cleaned.length} dígitos) - Original: ${phone}`);
    
    // Tentar corrigir removendo zeros extras
    if (cleaned.length > 13) {
      // Pode ter zeros extras, tentar remover
      const match = cleaned.match(/^55(\d{2})(\d{8,9})/);
      if (match) {
        cleaned = '55' + match[1] + match[2];
        console.log(`✅ Número corrigido: ${cleaned}`);
      }
    }
  }
  
  // Garantir que o número tenha exatamente 12 ou 13 dígitos (55 + DDD + número)
  if (cleaned.length < 12) {
    throw new Error(`Número de telefone muito curto: ${phone} -> ${cleaned} (${cleaned.length} dígitos). Formato esperado: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos). Número mínimo: 12 dígitos`);
  }
  
  if (cleaned.length > 13) {
    throw new Error(`Número de telefone muito longo: ${phone} -> ${cleaned} (${cleaned.length} dígitos). Formato esperado: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos). Número máximo: 13 dígitos`);
  }
  
  // Validar que o DDD está no formato correto (após o 55)
  const ddd = cleaned.substring(2, 4);
  const dddNum = parseInt(ddd);
  if (dddNum < 11 || dddNum > 99) {
    throw new Error(`DDD inválido no número: ${phone} -> ${cleaned}. DDD deve estar entre 11 e 99`);
  }
  
  // Adiciona @c.us para o formato do WhatsApp
  const formatted = cleaned + '@c.us';
  console.log(`✅ Número formatado: ${phone} -> ${formatted}`);
  return formatted;
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

