/**
 * Gera mensagem profissional para envio aos clientes
 * @param {Object} loan - Dados do empréstimo
 * @param {Object} client - Dados do cliente
 * @returns {string} Mensagem formatada
 */
export function generateMessage(loan, client) {
  const clientName = client.name || 'Cliente';
  const amount = formatCurrency(loan.remaining_amount || loan.total_amount || loan.amount);
  const dueDate = formatDate(loan.due_date);
  const daysOverdue = loan.days_overdue || 0;
  
  const pixKey = process.env.PIX_KEY || '54413674000147';
  const pixName = process.env.PIX_NAME || 'Tuane Carla Mendes Tomaz';

  let message = `Olá, ${clientName}! 👋\n\n`;
  message += `Aqui quem fala é o Rafael da equipe XPCRED!\n\n`;
  message += `Cobrança de pagamento:\n\n`;
  message += `📋 Empréstimo de ${amount}\n`;
  message += `🗓 Vencimento: ${dueDate}\n\n`;
  message += `Para regularizar, pague via PIX:\n\n`;
  message += `💳 Chave PIX: ${pixKey}\n`;
  message += `Titular: ${pixName}\n`;
  message += `Tipo: CNPJ\n\n`;
  message += `Envie o comprovante após o pagamento.\n`;
  message += `Qualquer dúvida, estou à disposição! 😊`;

  return message;
}

/**
 * Formata valor em moeda brasileira
 */
function formatCurrency(value) {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseFloat(value));
}

/**
 * Formata data em formato brasileiro
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

