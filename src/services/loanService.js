import { getSupabaseClient, getAvailableCompanies } from '../config/database.js';

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
    }
  }
  
  // 4. Se não encontrou nenhum valor, retornar 0
  return 0;
}

/**
 * Busca empréstimos com status overdue ou due_today
 * @param {Date} targetDate - Data para verificar vencimentos (opcional, usa hoje se não fornecido)
 * @param {string} company - Empresa para buscar (franca, litoral, mogiana, imperatriz)
 * @returns {Promise<Array>} Lista de empréstimos com informações do cliente
 */
export async function getOverdueAndDueTodayLoans(targetDate = null, company = 'franca') {
  const today = targetDate || new Date();
  const todayStr = today.toISOString().split('T')[0];
  const supabase = getSupabaseClient(company);

  try {
    // Buscar TODOS os empréstimos (não filtrar por status, buscar todos e filtrar depois)
    const { data: allLoansData, error: allLoansError } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          cpf,
          email
        )
      `)
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (allLoansError) {
      console.error('Erro ao buscar empréstimos:', allLoansError);
    }

    // Filtrar empréstimos overdue (vencidos) e due_today (vencem hoje)
    const overdueLoans = [];
    const dueTodayLoans = [];

    if (allLoansData) {
      allLoansData.forEach(loan => {
        if (!loan.clients) return; // Pular se não tiver cliente
        
        // Normalizar due_date para comparação (remover hora se houver)
        const loanDueDate = normalizeDate(loan.due_date);
        const daysOverdue = calculateDaysOverdue(loan.due_date);
        const isDueToday = loanDueDate === todayStr;
        const isOverdue = daysOverdue > 0 || loan.status === 'overdue';

        // Verificar se o empréstimo tem valor restante > 0
        const remainingAmount = calculateRemainingAmount(loan);
        if (remainingAmount <= 0) {
          return; // Pular empréstimos sem valor restante
        }

        if (isOverdue || isDueToday) {
          const loanData = {
            ...loan,
            client: loan.clients,
            days_overdue: daysOverdue,
            loan_type: isDueToday ? 'due_today' : 'overdue',
            company: company,
            remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
          };

          if (isDueToday && !isOverdue) {
            // Se vence hoje mas não está vencido, adicionar apenas em due_today
            dueTodayLoans.push(loanData);
          } else if (isOverdue) {
            // Se está vencido, adicionar em overdue
            overdueLoans.push(loanData);
            // Se também vence hoje, adicionar em due_today também
            if (isDueToday) {
              dueTodayLoans.push(loanData);
            }
          }
        }
      });
    }

    // Buscar também na tabela overdue_loans
    const { data: overdueLoansTable, error: overdueTableError } = await supabase
      .from('overdue_loans')
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          cpf,
          email
        )
      `)
      .in('collection_status', ['pending', 'in_progress']);

    if (overdueTableError) {
      console.error('Erro ao buscar da tabela overdue_loans:', overdueTableError);
    }

    // Buscar também na tabela partial_paid_loans que estão vencidos ou vencem hoje
    // Nota: Esta tabela pode não ter relacionamento direto com clients, buscar separadamente
    // Buscar apenas os que vencem hoje ou antes (não depois de hoje)
    const { data: partialPaidLoans, error: partialPaidError } = await supabase
      .from('partial_paid_loans')
      .select('*')
      .lte('due_date', todayStr)
      .gt('remaining_amount', 0);

    if (partialPaidError) {
      console.error('Erro ao buscar da tabela partial_paid_loans:', partialPaidError);
    }

    // Buscar clientes para os empréstimos partial_paid_loans
    let partialPaidLoansWithClients = [];
    if (partialPaidLoans && partialPaidLoans.length > 0) {
      const clientIds = [...new Set(partialPaidLoans.map(loan => loan.client_id).filter(Boolean))];
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone, cpf, email')
          .in('id', clientIds);

        if (!clientsError && clientsData) {
          const clientsMap = new Map(clientsData.map(c => [c.id, c]));
          
          partialPaidLoansWithClients = partialPaidLoans.map(loan => ({
            ...loan,
            clients: clientsMap.get(loan.client_id) || null
          }));
        }
      }
    }

    // Combinar e formatar os resultados
    const allLoans = [];

    // Processar empréstimos overdue da tabela loans
    overdueLoans.forEach(loan => {
      if (loan.client) {
        allLoans.push(loan);
      }
    });

    // Processar empréstimos que vencem hoje
    dueTodayLoans.forEach(loan => {
      if (loan.client) {
        allLoans.push(loan);
      }
    });

    // Processar empréstimos da tabela overdue_loans
    if (overdueLoansTable) {
      overdueLoansTable.forEach(loan => {
        if (loan.clients) {
          // Verificar se o empréstimo tem valor restante > 0
          const remainingAmount = calculateRemainingAmount(loan);
          if (remainingAmount <= 0) {
            return; // Pular empréstimos sem valor restante
          }
          
          const daysOverdue = loan.days_overdue || calculateDaysOverdue(loan.due_date);
          allLoans.push({
            ...loan,
            client: loan.clients,
            loan_type: 'overdue_table',
            days_overdue: daysOverdue,
            id: loan.loan_id || loan.id,
            company: company,
            remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
          });
        }
      });
    }

    // Processar empréstimos da tabela partial_paid_loans
    // Filtrar apenas os que vencem hoje ou estão vencidos (não os que vencem depois)
    if (partialPaidLoansWithClients && partialPaidLoansWithClients.length > 0) {
      partialPaidLoansWithClients.forEach(loan => {
        if (loan.clients) {
          // Verificar se o empréstimo tem valor restante > 0 (já filtrado na query, mas garantir)
          const remainingAmount = calculateRemainingAmount(loan);
          if (remainingAmount <= 0) {
            return; // Pular empréstimos sem valor restante
          }
          
          // Normalizar due_date para comparação
          const loanDueDate = normalizeDate(loan.due_date);
          const daysOverdue = calculateDaysOverdue(loan.due_date);
          const isDueToday = loanDueDate === todayStr;
          const isOverdue = daysOverdue > 0;
          
          // Só adicionar se vence hoje ou está vencido (não se vence depois)
          if (isDueToday || isOverdue) {
            allLoans.push({
              ...loan,
              client: loan.clients,
              loan_type: isDueToday ? 'due_today' : 'partial_paid',
              days_overdue: daysOverdue,
              id: loan.loan_id || loan.id,
              company: company,
              remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
            });
          }
        }
      });
    }

    // Remover duplicatas baseado no loan_id ou id
    const uniqueLoans = [];
    const seenIds = new Set();
    const seenClientLoan = new Set(); // Para evitar duplicatas por cliente+loan

    allLoans.forEach(loan => {
      if (!loan.client || !loan.client.id) {
        return; // Pular se não tiver cliente
      }

      const loanId = loan.loan_id || loan.id;
      const clientLoanKey = `${loan.client.id}_${loanId}`;
      
      // Evitar duplicatas: mesmo loan_id ou mesma combinação cliente+loan
      if (!seenIds.has(loanId) && !seenClientLoan.has(clientLoanKey)) {
        seenIds.add(loanId);
        seenClientLoan.add(clientLoanKey);
        uniqueLoans.push(loan);
      }
    });

    console.log(`Total de empréstimos encontrados: ${uniqueLoans.length}`);
    console.log(`- Overdue: ${uniqueLoans.filter(l => l.loan_type === 'overdue' || l.days_overdue > 0).length}`);
    console.log(`- Due Today: ${uniqueLoans.filter(l => l.loan_type === 'due_today').length}`);

    return uniqueLoans;
  } catch (error) {
    console.error('Erro ao buscar empréstimos:', error);
    return [];
  }
}

/**
 * Busca apenas empréstimos que vencem hoje (due_today) de uma empresa específica
 * @param {string} company - Empresa para buscar (franca, litoral, mogiana, imperatriz)
 * @returns {Promise<Array>} Lista de empréstimos que vencem hoje
 */
export async function getDueTodayLoans(company = 'franca') {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const supabase = getSupabaseClient(company);

  try {
    // Buscar empréstimos da tabela loans que vencem hoje
    const { data: loansData, error: loansError } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          cpf,
          email
        )
      `)
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (loansError) {
      console.error(`Erro ao buscar empréstimos de ${company}:`, loansError);
    }

    const dueTodayLoans = [];

    // Filtrar apenas os que vencem hoje (não os vencidos)
    if (loansData) {
      loansData.forEach(loan => {
        if (!loan.clients) return;
        
        const loanDueDate = normalizeDate(loan.due_date);
        const daysOverdue = calculateDaysOverdue(loan.due_date);
        const isDueToday = loanDueDate === todayStr;
        
        // Verificar se o empréstimo tem valor restante > 0
        const remainingAmount = calculateRemainingAmount(loan);
        if (remainingAmount <= 0) {
          return; // Pular empréstimos sem valor restante
        }
        
        // Apenas adicionar se vence hoje E não está vencido
        if (isDueToday && daysOverdue === 0) {
          dueTodayLoans.push({
            ...loan,
            client: loan.clients,
            days_overdue: 0,
            loan_type: 'due_today',
            company: company,
            remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
          });
        }
      });
    }

    // Buscar também na tabela partial_paid_loans que vencem hoje
    const { data: partialPaidLoans, error: partialPaidError } = await supabase
      .from('partial_paid_loans')
      .select('*')
      .eq('due_date', todayStr)
      .gt('remaining_amount', 0);

    if (partialPaidError) {
      console.error(`Erro ao buscar partial_paid_loans de ${company}:`, partialPaidError);
    }

    // Buscar clientes para os empréstimos partial_paid_loans
    if (partialPaidLoans && partialPaidLoans.length > 0) {
      const clientIds = [...new Set(partialPaidLoans.map(loan => loan.client_id).filter(Boolean))];
      
      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone, cpf, email')
          .in('id', clientIds);

        if (!clientsError && clientsData) {
          const clientsMap = new Map(clientsData.map(c => [c.id, c]));
          
          partialPaidLoans.forEach(loan => {
            // Verificar se o empréstimo tem valor restante > 0 (já filtrado na query, mas garantir)
            const remainingAmount = calculateRemainingAmount(loan);
            if (remainingAmount <= 0) {
              return; // Pular empréstimos sem valor restante
            }
            
            const client = clientsMap.get(loan.client_id);
            if (client) {
              dueTodayLoans.push({
                ...loan,
                client: client,
                loan_type: 'due_today',
                days_overdue: 0,
                company: company,
                id: loan.loan_id || loan.id,
                remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
              });
            }
          });
        }
      }
    }

    // Remover duplicatas
    const uniqueLoans = [];
    const seenIds = new Set();
    const seenClientLoan = new Set();

    dueTodayLoans.forEach(loan => {
      if (!loan.client || !loan.client.id) return;

      const loanId = loan.loan_id || loan.id;
      const clientLoanKey = `${loan.client.id}_${loanId}`;
      
      if (!seenIds.has(loanId) && !seenClientLoan.has(clientLoanKey)) {
        seenIds.add(loanId);
        seenClientLoan.add(clientLoanKey);
        uniqueLoans.push(loan);
      }
    });

    return uniqueLoans;
  } catch (error) {
    console.error(`Erro ao buscar empréstimos due_today de ${company}:`, error);
    return [];
  }
}

/**
 * Busca empréstimos que vencem hoje (due_today) de todas as empresas
 * @returns {Promise<Array>} Lista de empréstimos que vencem hoje de todas as empresas
 */
export async function getDueTodayLoansAllCompanies() {
  const companies = getAvailableCompanies();
  const allLoans = [];

  for (const company of companies) {
    try {
      const loans = await getDueTodayLoans(company.id);
      allLoans.push(...loans);
      console.log(`📊 ${company.name}: ${loans.length} empréstimos que vencem hoje`);
    } catch (error) {
      console.error(`❌ Erro ao buscar empréstimos de ${company.name}:`, error);
    }
  }

  console.log(`✅ Total de empréstimos que vencem hoje (todas as empresas): ${allLoans.length}`);
  return allLoans;
}

/**
 * Busca empréstimos por data de vencimento
 * @param {Date} dueDate - Data de vencimento
 * @returns {Promise<Array>} Lista de empréstimos
 */
export async function getLoansByDueDate(dueDate, company = 'franca') {
  const dueDateStr = dueDate.toISOString().split('T')[0];
  const supabase = getSupabaseClient(company);

  try {
    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        clients (
          id,
          name,
          phone,
          cpf,
          email
        )
      `)
      .eq('due_date', dueDateStr);

    if (error) {
      console.error('Erro ao buscar empréstimos por data:', error);
      return [];
    }

    // Filtrar apenas empréstimos com valor restante > 0
    return data
      .map(loan => {
        const remainingAmount = calculateRemainingAmount(loan);
        if (remainingAmount <= 0) {
          return null; // Filtrar empréstimos sem valor restante
        }
        return {
          ...loan,
          client: loan.clients,
          days_overdue: calculateDaysOverdue(loan.due_date),
          company: company,
          remaining_amount: remainingAmount // Garantir que sempre temos o valor restante
        };
      })
      .filter(loan => loan !== null); // Remover nulls
  } catch (error) {
    console.error('Erro ao buscar empréstimos por data:', error);
    return [];
  }
}

/**
 * Normaliza uma data para string no formato YYYY-MM-DD
 */
function normalizeDate(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao normalizar data:', dateString, error);
    return null;
  }
}

/**
 * Calcula dias em atraso
 */
function calculateDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = today - due;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

