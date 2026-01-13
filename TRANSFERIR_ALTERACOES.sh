#!/bin/bash
# Script para transferir apenas os arquivos alterados
# Execute no terminal Linux/Mac

VPS_HOST="212.85.19.210"
VPS_USER="root"
VPS_PATH="/var/www/nexusbot"

echo "🚀 Transferindo arquivos alterados..."
echo ""

# Arquivos alterados
files=(
    "public/index.html"
    "public/script.js"
    "public/styles.css"
    "src/bot/whatsappBot.js"
    "src/routes/api.js"
    "src/services/loanService.js"
    "src/index.js"
    "package.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "📤 Transferindo $file..."
        scp "$file" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/$file"
        if [ $? -eq 0 ]; then
            echo "   ✅ $file transferido"
        else
            echo "   ❌ Erro ao transferir $file"
        fi
    else
        echo "   ⚠️  Arquivo não encontrado: $file"
    fi
done

echo ""
echo "✅ Transferência concluída!"
echo ""
echo "📦 Instalando novas dependências (se houver)..."
ssh "${VPS_USER}@${VPS_HOST}" "cd ${VPS_PATH} && npm install"
echo ""
echo "📁 Criando diretório de áudios..."
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}/public/audios"
echo ""
echo "🔄 Reinicie o bot na VPS:"
echo "   ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && pm2 restart nexusbot'"

