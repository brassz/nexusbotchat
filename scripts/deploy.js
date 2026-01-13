import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
dotenv.config();

const VPS_HOST = process.env.VPS_HOST || '212.85.19.210';
const VPS_USER = process.env.VPS_USER || 'root';
const VPS_PATH = process.env.VPS_PATH || '/var/www/nexusbot';

// Arquivos e pastas para transferir (ORDEM IMPORTANTE: pastas primeiro)
const filesToTransfer = [
    'src/',           // ✅ Todo o código do bot
    'public/',        // ✅ Painel web (HTML, CSS, JS)
    'package.json',   // Dependências
    'package-lock.json', // Lock de versões (opcional)
    '.env',           // Configurações
    'ecosystem.config.js' // Config PM2 (opcional)
];

/**
 * Transfere arquivos individualmente via SCP
 */
async function transferFiles() {
    console.log('📤 Transferindo arquivos via SCP...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of filesToTransfer) {
        // Remover barra final para verificação
        const filePath = file.replace(/\/$/, '');
        
        if (!fs.existsSync(filePath)) {
            // package-lock.json e ecosystem.config.js são opcionais
            if (file === 'package-lock.json' || file === 'ecosystem.config.js') {
                console.log(`   ⚠️  ${file} não encontrado (opcional, continuando...)`);
                continue;
            }
            console.warn(`   ⚠️  Arquivo/pasta não encontrado: ${file}`);
            failCount++;
            continue;
        }
        
        const description = file.endsWith('/') ? `Pasta ${file}` : `Arquivo ${file}`;
        console.log(`   📤 Transferindo ${description}...`);
        
        // Usar caminho absoluto para evitar problemas com espaços
        const absolutePath = path.resolve(file);
        
        // SCP: se destino termina com /, coloca dentro; se não, renomeia
        // Queremos colocar dentro de VPS_PATH, então sempre termina com /
        const scpCommand = `scp -r "${absolutePath}" ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/`;
        
        try {
            const { stdout, stderr } = await execAsync(scpCommand, {
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });
            
            if (stdout && !stdout.includes('Warning')) {
                console.log(`   ✅ ${description} transferido com sucesso`);
            }
            
            if (stderr && !stderr.includes('Warning') && !stderr.includes('Permanently added')) {
                console.warn(`   ⚠️  ${stderr}`);
            }
            
            successCount++;
        } catch (error) {
            console.error(`   ❌ Erro ao transferir ${description}`);
            console.error(`      ${error.message}`);
            failCount++;
            
            // Se for arquivo obrigatório, falhar
            if (file !== 'package-lock.json' && file !== 'ecosystem.config.js') {
                return false;
            }
        }
    }
    
    console.log(`\n✅ Transferência concluída: ${successCount} sucesso, ${failCount} falhas\n`);
    
    // Considerar sucesso se pelo menos os arquivos essenciais foram transferidos
    return successCount > 0;
}

/**
 * Cria comando SSH para executar no servidor
 */
function createSSHCommand(command) {
    return `ssh ${VPS_USER}@${VPS_HOST} "${command}"`;
}

/**
 * Executa comando no terminal
 */
async function runCommand(command, description) {
    console.log(`\n📦 ${description}...`);
    console.log(`Executando: ${command}\n`);
    
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        return true;
    } catch (error) {
        console.error(`❌ Erro: ${error.message}`);
        return false;
    }
}

/**
 * Verifica se o arquivo .env existe
 */
function checkEnvFile() {
    if (!fs.existsSync('.env')) {
        console.warn('⚠️  Arquivo .env não encontrado!');
        console.warn('   Certifique-se de criar o arquivo .env antes do deploy.');
        console.warn('   Você pode copiar o .env.example e ajustar os valores.');
        return false;
    }
    return true;
}

/**
 * Deploy principal
 */
async function deploy() {
    console.log('🚀 Iniciando deploy do NexusBOT para VPS...\n');
    console.log(`📡 Servidor: ${VPS_USER}@${VPS_HOST}`);
    console.log(`📁 Diretório: ${VPS_PATH}\n`);

    // Verificar .env
    if (!checkEnvFile()) {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question('Deseja continuar mesmo assim? (s/N): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 's') {
            console.log('Deploy cancelado.');
            process.exit(0);
        }
    }

    // 1. Criar diretório no servidor se não existir
    console.log('📋 Passo 1: Criando diretório no servidor...');
    const mkdirCommand = createSSHCommand(`mkdir -p ${VPS_PATH}`);
    await runCommand(mkdirCommand, 'Criando diretório');

    // 2. Transferir arquivos via SCP
    console.log('📋 Passo 2: Transferindo arquivos...');
    const transferSuccess = await transferFiles();

    if (!transferSuccess) {
        console.error('❌ Falha ao transferir arquivos. Verifique sua conexão SSH.');
        process.exit(1);
    }

    // 3. Instalar dependências no servidor
    console.log('📋 Passo 3: Instalando dependências...');
    const installCommand = createSSHCommand(`cd ${VPS_PATH} && npm install --production`);
    await runCommand(installCommand, 'Instalando dependências');

    // 4. Instalar PM2 se não estiver instalado
    console.log('📋 Passo 4: Verificando PM2...');
    const pm2CheckCommand = createSSHCommand('which pm2 || npm install -g pm2');
    await runCommand(pm2CheckCommand, 'Verificando/Instalando PM2');

    // 5. Parar processo anterior se existir
    console.log('📋 Passo 5: Parando processo anterior...');
    const stopCommand = createSSHCommand(`cd ${VPS_PATH} && pm2 stop nexusbot || true`);
    await runCommand(stopCommand, 'Parando processo anterior');

    // 6. Iniciar aplicação com PM2
    console.log('📋 Passo 6: Iniciando aplicação...');
    const startCommand = createSSHCommand(
        `cd ${VPS_PATH} && pm2 start src/index.js --name nexusbot --update-env`
    );
    await runCommand(startCommand, 'Iniciando aplicação com PM2');

    // 7. Salvar configuração do PM2
    console.log('📋 Passo 7: Salvando configuração do PM2...');
    const saveCommand = createSSHCommand('pm2 save');
    await runCommand(saveCommand, 'Salvando configuração');

    // 8. Mostrar status
    console.log('📋 Passo 8: Verificando status...');
    const statusCommand = createSSHCommand('pm2 status');
    await runCommand(statusCommand, 'Status do PM2');

    console.log('\n✅ Deploy concluído com sucesso!');
    console.log(`\n🌐 Acesse o painel em: http://${VPS_HOST}:3000`);
    console.log(`\n📊 Para ver logs: ssh ${VPS_USER}@${VPS_HOST} "pm2 logs nexusbot"`);
    console.log(`🔄 Para reiniciar: ssh ${VPS_USER}@${VPS_HOST} "pm2 restart nexusbot"`);
}

// Executar deploy
deploy().catch(error => {
    console.error('❌ Erro durante o deploy:', error);
    process.exit(1);
});

