// Configuração de empresas com nome e dados PIX
const COMPANY_CONFIG = {
  franca: {
    name: 'XPCRED',
    pixBank: 'CNPJ',
    pixName: 'Tuane Carla Mendes Tomaz',
    pixKey: '54413674000147',
    pixType: 'CNPJ'
  },
  litoral: {
    name: 'LITORAL CRED',
    pixBank: 'COOP SICREDI',
    pixName: 'Fabiana Cristina Muniz Veronezi',
    pixKey: '16988037753',
    pixType: 'CPF'
  },
  mogiana: {
    name: 'MOGIANA CRED',
    pixBank: 'Banco do Brasil',
    pixName: 'Fabiana Cristina Muniz Veronezi',
    pixKey: 'financeiro.mogiana@outlook.com',
    pixType: 'Email'
  },
  imperatriz: {
    name: 'IMPERATRIZ CRED',
    pixBank: 'Banco Santander',
    pixName: 'Fabiana Cristina Muniz Veronezi',
    pixKey: 'financeiro.n7full@gmail.com',
    pixType: 'Email'
  }
};

/**
 * Obtém configuração da empresa
 * @param {string} company - ID da empresa (franca, litoral, mogiana, imperatriz)
 * @returns {Object} Configuração da empresa
 */
function getCompanyConfig(company = 'franca') {
  const normalizedCompany = company.toLowerCase();
  return COMPANY_CONFIG[normalizedCompany] || COMPANY_CONFIG.franca;
}

/**
 * Calcula o valor restante do empréstimo
 * Tenta diferentes campos e cálculos para obter o valor correto
 * @param {Object} loan - Dados do empréstimo
 * @returns {number} Valor restante
 */
function calculateRemainingAmount(loan) {
  // 1. Se existe remaining_amount diretamente e é maior que 0, usar
  if (loan.remaining_amount !== null && loan.remaining_amount !== undefined) {
    const remaining = parseFloat(loan.remaining_amount);
    if (!isNaN(remaining) && remaining > 0) {
      return remaining;
    }
  }
  
  // 2. Se existe total_amount, tentar calcular com paid_amount
  if (loan.total_amount !== null && loan.total_amount !== undefined) {
    const total = parseFloat(loan.total_amount);
    if (!isNaN(total) && total > 0) {
      // Tentar diferentes nomes de campos para valor pago
      const paid = parseFloat(
        loan.paid_amount || 
        loan.amount_paid || 
        loan.paid || 
        0
      ) || 0;
      const remaining = total - paid;
      if (remaining > 0) {
        return remaining;
      }
      // Se remaining é 0 ou negativo, mas total existe, retornar total
      if (remaining <= 0 && total > 0) {
        return total;
      }
    }
  }
  
  // 3. Se existe amount (sem paid_amount), usar amount como restante
  if (loan.amount !== null && loan.amount !== undefined) {
    const amount = parseFloat(loan.amount);
    if (!isNaN(amount) && amount > 0) {
      // Tentar calcular se houver paid_amount
      const paid = parseFloat(
        loan.paid_amount || 
        loan.amount_paid || 
        loan.paid || 
        0
      ) || 0;
      const remaining = amount - paid;
      if (remaining > 0) {
        return remaining;
      }
      // Se não tem paid ou remaining é 0, retornar amount
      return amount;
    }
  }
  
  // 4. Se não encontrou nenhum valor, retornar 0
  console.warn('Não foi possível calcular valor restante para empréstimo:', loan.id || loan.loan_id);
  return 0;
}

/**
 * Gera mensagem profissional para envio aos clientes
 * @param {Object} loan - Dados do empréstimo (deve conter propriedade 'company')
 * @param {Object} client - Dados do cliente
 * @returns {string} Mensagem formatada
 */
export function generateMessage(loan, client) {
  const clientName = client.name || 'Cliente';
  // Calcular o valor restante corretamente
  const remainingAmount = calculateRemainingAmount(loan);
  const amount = formatCurrency(remainingAmount);
  const dueDate = formatDate(loan.due_date);
  const daysOverdue = loan.days_overdue || 0;
  
  // Obter configuração da empresa (do loan ou padrão franca)
  const companyId = loan.company || 'franca';
  const companyConfig = getCompanyConfig(companyId);

  let message = `Olá, ${clientName}! 👋\n\n`;
  message += `Aqui quem fala é o Rafael da equipe ${companyConfig.name}!\n\n`;
  message += `Cobrança de pagamento:\n\n`;
  message += `📋 Empréstimo de ${amount}\n`;
  message += `🗓 Vencimento: ${dueDate}\n\n`;
  message += `Para regularizar, pague via PIX:\n\n`;
  message += `💳 Chave PIX: ${companyConfig.pixKey}\n`;
  message += `Titular: ${companyConfig.pixName}\n`;
  message += `Tipo: ${companyConfig.pixType}\n\n`;
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

