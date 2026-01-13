#!/bin/bash
# Script para matar processos do navegador relacionados ao NexusBOT

echo "🔪 Matando processos do navegador do NexusBOT..."

# Matar processos do Chrome/Chromium relacionados à sessão nexusbot
pkill -f "chrome.*nexusbot" 2>/dev/null || true
pkill -f "chromium.*nexusbot" 2>/dev/null || true

# Aguardar um pouco
sleep 2

echo "✅ Processos do navegador finalizados"

