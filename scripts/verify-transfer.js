import fs from 'fs';
import path from 'path';

/**
 * Script para verificar se as pastas src/ e public/ existem e têm conteúdo
 */

console.log('🔍 Verificando arquivos para transferência...\n');

const requiredFiles = [
    { path: 'src/', name: 'Código do bot', type: 'pasta' },
    { path: 'public/', name: 'Painel web', type: 'pasta' },
    { path: 'package.json', name: 'Dependências', type: 'arquivo' },
    { path: '.env', name: 'Configurações', type: 'arquivo' }
];

const optionalFiles = [
    { path: 'package-lock.json', name: 'Lock de versões', type: 'arquivo' },
    { path: 'ecosystem.config.js', name: 'Config PM2', type: 'arquivo' }
];

let allOk = true;

console.log('📋 Arquivos Obrigatórios:');
console.log('─'.repeat(50));

for (const file of requiredFiles) {
    const exists = fs.existsSync(file.path);
    const status = exists ? '✅' : '❌';
    const type = file.type === 'pasta' ? '📁' : '📄';
    
    console.log(`${status} ${type} ${file.name} (${file.path})`);
    
    if (!exists) {
        allOk = false;
        console.log(`   ⚠️  ERRO: ${file.path} não encontrado!`);
    } else if (file.type === 'pasta') {
        // Verificar se a pasta tem conteúdo
        try {
            const contents = fs.readdirSync(file.path);
            if (contents.length === 0) {
                console.log(`   ⚠️  AVISO: ${file.path} está vazia!`);
            } else {
                console.log(`   ✓ Contém ${contents.length} item(ns)`);
            }
        } catch (error) {
            console.log(`   ⚠️  Erro ao ler ${file.path}: ${error.message}`);
        }
    }
}

console.log('\n📋 Arquivos Opcionais:');
console.log('─'.repeat(50));

for (const file of optionalFiles) {
    const exists = fs.existsSync(file.path);
    const status = exists ? '✅' : '⚠️';
    const type = file.type === 'pasta' ? '📁' : '📄';
    
    console.log(`${status} ${type} ${file.name} (${file.path})`);
}

console.log('\n' + '─'.repeat(50));

if (allOk) {
    console.log('✅ Todos os arquivos obrigatórios estão presentes!');
    console.log('🚀 Pronto para fazer deploy!\n');
    process.exit(0);
} else {
    console.log('❌ Faltam arquivos obrigatórios!');
    console.log('⚠️  Corrija os problemas antes de fazer deploy.\n');
    process.exit(1);
}

