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
  message += `Sou *Rafael*, Gestor Financeiro da *XPCRED*.\n\n`;
  
  if (daysOverdue > 0) {
    message += `Identificamos que você possui um empréstimo em atraso há ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}.\n\n`;
  } else if (loan.loan_type === 'due_today') {
    message += `Identificamos que você possui um empréstimo com vencimento hoje.\n\n`;
  } else {
    message += `Identificamos que você possui um empréstimo pendente.\n\n`;
  }
  
  message += `📋 *Detalhes do empréstimo:*\n`;
  message += `• Valor: ${amount}\n`;
  message += `• Data de vencimento: ${dueDate}\n\n`;
  
  message += `Para regularizar sua situação, você pode realizar o pagamento através do PIX:\n\n`;
  message += `💳 *Dados para PIX:*\n`;
  message += `Chave PIX: ${pixKey}\n`;
  message += `Titular: ${pixName}\n`;
  message += `Tipo: CNPJ\n\n`;
  
  message += `Após o pagamento, envie o comprovante para que possamos atualizar seu cadastro.\n\n`;
  message += `Se tiver alguma dúvida ou precisar negociar condições especiais, estou à disposição para ajudar.\n\n`;
  message += `Atenciosamente,\n`;
  message += `*Rafael*\n`;
  message += `Gestor Financeiro - XPCRED 📞`;

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

