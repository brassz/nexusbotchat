const API_BASE = '/api';

// Estado da aplicação
let loans = [];
let filteredLoans = [];
let currentAction = null;
let selectedLoans = new Set();
let currentTab = 'all';
let qrCodeInterval = null;
let currentLoanIdForSend = null;
let currentSendOption = null;
let sendingInProgress = false;
let sendingProcessId = null;
let progressInterval = null;
let currentCompany = localStorage.getItem('selectedCompany') || 'franca';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeTabs();
    checkBotStatus();
    loadLoans();
    loadQRCode();
    checkAudioStatus();
    
    // Atualizar status a cada 30 segundos
    setInterval(checkBotStatus, 30000);
    // Atualizar QR Code a cada 5 segundos
    setInterval(loadQRCode, 5000);
});

// Inicializar sistema de abas
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Trocar de aba
function switchTab(tabName) {
    currentTab = tabName;
    
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // Renderizar conteúdo da aba
    if (tabName === 'all') {
        renderLoans('loansList', filteredLoans);
    } else if (tabName === 'overdue') {
        const overdueLoans = loans.filter(l => l.status === 'overdue' || (l.days_overdue && l.days_overdue > 0));
        renderLoans('overdueList', overdueLoans);
    } else if (tabName === 'due-today') {
        const dueTodayLoans = loans.filter(l => l.loan_type === 'due_today' || (l.days_overdue === 0 && l.status === 'active'));
        renderLoans('dueTodayList', dueTodayLoans);
    } else if (tabName === 'qr-code') {
        loadQRCode();
    }
    
    // Limpar seleção ao trocar de aba
    selectedLoans.clear();
    updateSelectionUI();
}

// Event Listeners
function initializeEventListeners() {
    // Botões de ação
    document.getElementById('btnRefresh').addEventListener('click', loadLoans);
    document.getElementById('btnSendAll').addEventListener('click', () => {
        showConfirmModal(
            'Enviar Todas as Mensagens',
            `Tem certeza que deseja enviar mensagens para todos os ${loans.length} clientes com empréstimos em atraso ou que vencem hoje?`,
            sendAllMessages
        );
    });
    document.getElementById('btnFilterDate').addEventListener('click', () => {
        document.getElementById('dateModal').classList.add('active');
    });
    document.getElementById('btnSendByDate').addEventListener('click', () => {
        document.getElementById('dateModal').classList.add('active');
        currentAction = 'send';
    });

    // Seleção múltipla
    document.getElementById('btnSelectAll').addEventListener('click', selectAllLoans);
    document.getElementById('btnDeselectAll').addEventListener('click', deselectAllLoans);
    document.getElementById('btnSendSelected').addEventListener('click', sendSelectedMessages);

    // QR Code
    document.getElementById('btnRefreshQR').addEventListener('click', loadQRCode);

    // Seletor de empresa
    const companySelect = document.getElementById('companySelect');
    companySelect.value = currentCompany;
    companySelect.addEventListener('change', (e) => {
        currentCompany = e.target.value;
        localStorage.setItem('selectedCompany', currentCompany);
        showToast(`Empresa alterada para: ${e.target.options[e.target.selectedIndex].text}`, 'info');
        // Limpar seleções e filtros
        selectedLoans.clear();
        filteredLoans = [];
        // Recarregar dados da nova empresa
        loadLoans();
    });

    // Áudio
    document.getElementById('audioFileInput').addEventListener('change', handleAudioUpload);
    document.getElementById('btnRemoveAudio').addEventListener('click', removeAudio);

    // Modal de data
    document.getElementById('closeDateModal').addEventListener('click', closeDateModal);
    document.getElementById('cancelDateFilter').addEventListener('click', closeDateModal);
    document.getElementById('applyDateFilter').addEventListener('click', applyDateFilter);

    // Modal de confirmação
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelConfirm').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmAction').addEventListener('click', executeConfirmedAction);

    // Modal de opções de envio
    document.getElementById('closeSendOptionsModal').addEventListener('click', closeSendOptionsModal);
    document.getElementById('cancelSendOptions').addEventListener('click', closeSendOptionsModal);
    
    // Opções de envio
    document.getElementById('optionAudioText').addEventListener('click', () => {
        selectSendOption('audio-text');
    });
    document.getElementById('optionText').addEventListener('click', () => {
        selectSendOption('text');
    });
    document.getElementById('optionAudio').addEventListener('click', () => {
        selectSendOption('audio');
    });

    // Modal de progresso
    document.getElementById('btnStopSending').addEventListener('click', stopSending);
    document.getElementById('btnCloseProgress').addEventListener('click', closeProgressModal);

    // Busca
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Fechar modais ao clicar fora
    document.getElementById('dateModal').addEventListener('click', (e) => {
        if (e.target.id === 'dateModal') closeDateModal();
    });
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmModal') closeConfirmModal();
    });
    document.getElementById('sendOptionsModal').addEventListener('click', (e) => {
        if (e.target.id === 'sendOptionsModal') closeSendOptionsModal();
    });
    document.getElementById('progressModal').addEventListener('click', (e) => {
        if (e.target.id === 'progressModal' && !sendingInProgress) {
            closeProgressModal();
        }
    });
}

// Verificar status do bot
async function checkBotStatus() {
    try {
        const response = await fetch(`${API_BASE}/loans/overdue?company=${currentCompany}`);
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (response.ok) {
            statusDot.classList.add('connected');
            statusDot.classList.remove('disconnected');
            statusText.textContent = 'Conectado';
        } else {
            statusDot.classList.add('disconnected');
            statusDot.classList.remove('connected');
            statusText.textContent = 'Desconectado';
        }
    } catch (error) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        statusDot.classList.add('disconnected');
        statusDot.classList.remove('connected');
        statusText.textContent = 'Desconectado';
    }
}

// Carregar empréstimos
async function loadLoans() {
    const loansList = document.getElementById('loansList');
    loansList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Carregando empréstimos...</p></div>';

    try {
        const response = await fetch(`${API_BASE}/loans/overdue?company=${currentCompany}`);
        const data = await response.json();

        if (data.success) {
            loans = data.data || [];
            filteredLoans = [...loans];
            renderLoans('loansList', filteredLoans);
            updateStats();
            showToast('Empréstimos carregados com sucesso!', 'success');
        } else {
            throw new Error(data.error || 'Erro ao carregar empréstimos');
        }
    } catch (error) {
        console.error('Erro ao carregar empréstimos:', error);
        loansList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar empréstimos</p>
                <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
        showToast('Erro ao carregar empréstimos', 'error');
    }
}

// Renderizar lista de empréstimos
function renderLoans(containerId, loansToRender) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (loansToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>Nenhum empréstimo encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = loansToRender.map(loan => {
        const client = loan.client || loan.clients;
        const isOverdue = loan.status === 'overdue' || (loan.days_overdue && loan.days_overdue > 0);
        const isDueToday = loan.loan_type === 'due_today' || (loan.days_overdue === 0 && loan.status === 'active');
        
        const badgeClass = isOverdue ? 'overdue' : 'due-today';
        const badgeText = isOverdue ? 'Em Atraso' : 'Vence Hoje';
        const daysText = loan.days_overdue > 0 ? `${loan.days_overdue} dias` : 'Hoje';
        const loanId = loan.id || loan.loan_id || String(loan.id) || String(loan.loan_id);
        const isSelected = selectedLoans.has(loanId);
        
        // Validar que temos um ID válido
        if (!loanId) {
            console.error('Erro: loanId não encontrado para empréstimo', loan);
        }

        return `
            <div class="loan-item ${isSelected ? 'selected' : ''}" data-loan-id="${loanId}">
                <input type="checkbox" class="loan-checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleLoanSelection('${loanId}', this.checked)">
                <div class="loan-item-content">
                    <div class="loan-header">
                        <div class="loan-client">
                            <h3>${client?.name || 'Cliente não encontrado'}</h3>
                            <p><i class="fas fa-phone"></i> ${client?.phone || 'N/A'}</p>
                        </div>
                        <span class="loan-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="loan-details">
                        <div class="loan-detail">
                            <label>Valor</label>
                            <value>${formatCurrency(loan.remaining_amount || loan.total_amount || loan.amount)}</value>
                        </div>
                        <div class="loan-detail">
                            <label>Vencimento</label>
                            <value>${formatDate(loan.due_date)}</value>
                        </div>
                        <div class="loan-detail">
                            <label>Dias em Atraso</label>
                            <value>${daysText}</value>
                        </div>
                        <div class="loan-detail">
                            <label>Status</label>
                            <value>${loan.status || 'N/A'}</value>
                        </div>
                    </div>
                    <div class="loan-actions">
                        <button class="btn-small primary" onclick="openSendOptionsModal('${loanId}')">
                            <i class="fas fa-paper-plane"></i> Enviar Mensagem
                        </button>
                        <button class="btn-small secondary" onclick="previewMessage('${loanId}')">
                            <i class="fas fa-eye"></i> Ver Mensagem
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle seleção de empréstimo
function toggleLoanSelection(loanId, isSelected) {
    if (isSelected) {
        selectedLoans.add(loanId);
    } else {
        selectedLoans.delete(loanId);
    }
    updateSelectionUI();
    // Atualizar visual do item
    const item = document.querySelector(`[data-loan-id="${loanId}"]`);
    if (item) {
        if (isSelected) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    }
}

// Selecionar todos
function selectAllLoans() {
    const currentLoans = getCurrentTabLoans();
    currentLoans.forEach(loan => {
        const loanId = loan.id || loan.loan_id;
        selectedLoans.add(loanId);
    });
    updateSelectionUI();
    // Re-renderizar para atualizar checkboxes
    if (currentTab === 'all') {
        renderLoans('loansList', filteredLoans);
    } else if (currentTab === 'overdue') {
        const overdueLoans = loans.filter(l => l.status === 'overdue' || (l.days_overdue && l.days_overdue > 0));
        renderLoans('overdueList', overdueLoans);
    } else if (currentTab === 'due-today') {
        const dueTodayLoans = loans.filter(l => l.loan_type === 'due_today' || (l.days_overdue === 0 && l.status === 'active'));
        renderLoans('dueTodayList', dueTodayLoans);
    }
}

// Desmarcar todos
function deselectAllLoans() {
    selectedLoans.clear();
    updateSelectionUI();
    // Re-renderizar
    if (currentTab === 'all') {
        renderLoans('loansList', filteredLoans);
    } else if (currentTab === 'overdue') {
        const overdueLoans = loans.filter(l => l.status === 'overdue' || (l.days_overdue && l.days_overdue > 0));
        renderLoans('overdueList', overdueLoans);
    } else if (currentTab === 'due-today') {
        const dueTodayLoans = loans.filter(l => l.loan_type === 'due_today' || (l.days_overdue === 0 && l.status === 'active'));
        renderLoans('dueTodayList', dueTodayLoans);
    }
}

// Obter empréstimos da aba atual
function getCurrentTabLoans() {
    if (currentTab === 'all') {
        return filteredLoans;
    } else if (currentTab === 'overdue') {
        return loans.filter(l => l.status === 'overdue' || (l.days_overdue && l.days_overdue > 0));
    } else if (currentTab === 'due-today') {
        return loans.filter(l => l.loan_type === 'due_today' || (l.days_overdue === 0 && l.status === 'active'));
    }
    return [];
}

// Atualizar UI de seleção
function updateSelectionUI() {
    const selectionActions = document.getElementById('selectionActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedLoans.size > 0) {
        selectionActions.style.display = 'flex';
        selectedCount.textContent = selectedLoans.size;
    } else {
        selectionActions.style.display = 'none';
    }
}

// Abrir modal de opções de envio
function openSendOptionsModal(loanId) {
    if (!loanId) {
        console.error('Erro: loanId não fornecido para openSendOptionsModal');
        showToast('Erro: ID do empréstimo não encontrado', 'error');
        return;
    }
    
    console.log('Abrindo modal para loanId:', loanId);
    currentLoanIdForSend = loanId;
    currentSendOption = null; // Resetar opção anterior
    document.getElementById('sendOptionsModal').classList.add('active');
    
    // Verificar se existe áudio configurado
    checkAudioStatusForModal();
}

// Verificar status do áudio para o modal
async function checkAudioStatusForModal() {
    try {
        const response = await fetch(`${API_BASE}/audio/status`);
        const data = await response.json();
        
        const optionAudio = document.getElementById('optionAudio');
        const optionAudioText = document.getElementById('optionAudioText');
        
        if (data.success && data.exists) {
            optionAudio.disabled = false;
            optionAudioText.disabled = false;
            optionAudio.style.opacity = '1';
            optionAudioText.style.opacity = '1';
        } else {
            optionAudio.disabled = true;
            optionAudioText.disabled = true;
            optionAudio.style.opacity = '0.5';
            optionAudioText.style.opacity = '0.5';
            optionAudio.title = 'Nenhum áudio configurado';
            optionAudioText.title = 'Nenhum áudio configurado';
        }
    } catch (error) {
        console.error('Erro ao verificar status do áudio:', error);
    }
}

// Selecionar opção de envio
function selectSendOption(option) {
    // Validar que temos o loanId antes de continuar
    if (!currentLoanIdForSend) {
        console.error('Erro: loanId não definido ao selecionar opção');
        showToast('Erro: ID do empréstimo não encontrado', 'error');
        closeSendOptionsModal();
        return;
    }
    
    currentSendOption = option;
    
    // Remover seleção anterior
    document.querySelectorAll('.send-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Converter option para ID do botão
    let buttonId = '';
    if (option === 'audio-text') {
        buttonId = 'optionAudioText';
    } else if (option === 'text') {
        buttonId = 'optionText';
    } else if (option === 'audio') {
        buttonId = 'optionAudio';
    }
    
    if (buttonId) {
        document.getElementById(buttonId).classList.add('selected');
    }
    
    // Enviar após pequeno delay para feedback visual
    setTimeout(() => {
        executeSendMessage();
    }, 300);
}

// Executar envio da mensagem
async function executeSendMessage() {
    // Guardar valores antes de limpar
    const loanId = currentLoanIdForSend;
    const sendOption = currentSendOption;
    
    if (!loanId || !sendOption) {
        console.error('Erro: loanId ou sendOption não definidos', { loanId, sendOption });
        showToast('Erro: Dados incompletos para envio', 'error');
        return;
    }
    
    // Fechar modal mas manter valores até enviar
    document.getElementById('sendOptionsModal').classList.remove('active');
    
    showToast('Enviando mensagem...', 'info');
    
    try {
        const requestBody = { 
            loanId: loanId,
            sendOption: sendOption
        };
        
        console.log('Enviando mensagem com:', requestBody);
        
        const response = await fetch(`${API_BASE}/messages/send-single-loan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast('Mensagem enviada com sucesso!', 'success');
            loadLoans(); // Recarregar lista
        } else {
            throw new Error(data.error || 'Erro ao enviar mensagem');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showToast(error.message || 'Erro ao enviar mensagem', 'error');
    } finally {
        // Limpar valores após envio
        currentLoanIdForSend = null;
        currentSendOption = null;
        
        // Limpar seleções visuais
        document.querySelectorAll('.send-option-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
}

// Fechar modal de opções
function closeSendOptionsModal() {
    document.getElementById('sendOptionsModal').classList.remove('active');
    currentLoanIdForSend = null;
    currentSendOption = null;
    
    // Limpar seleções
    document.querySelectorAll('.send-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// Enviar mensagem individual (função antiga - mantida para compatibilidade)
async function sendSingleMessage(loanId) {
    openSendOptionsModal(loanId);
}

// Enviar mensagens selecionadas
async function sendSelectedMessages() {
    if (selectedLoans.size === 0) {
        showToast('Selecione pelo menos um empréstimo', 'warning');
        return;
    }

    if (sendingInProgress) {
        showToast('Já existe um envio em andamento', 'warning');
        return;
    }

    showConfirmModal(
        'Enviar Mensagens Selecionadas',
        `Tem certeza que deseja enviar mensagens para ${selectedLoans.size} cliente(s) selecionado(s)?\n\nO processo será feito em duas etapas:\n1. Envio de áudios (2 minutos entre cada)\n2. Envio de textos`,
        async () => {
            await startSendingProcess(Array.from(selectedLoans));
        }
    );
}

// Iniciar processo de envio
async function startSendingProcess(loanIds) {
    sendingInProgress = true;
    
    // Abrir modal de progresso
    openProgressModal();
    resetProgress();
    
    // Iniciar envio
    try {
        const response = await fetch(`${API_BASE}/messages/send-selected-staged`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ loanIds, company: currentCompany })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Erro HTTP: ${response.status}` }));
            throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Erro ao iniciar envio');
        }

        sendingProcessId = data.processId;
        
        // Iniciar polling de progresso
        startProgressPolling();
        
        // Aguardar conclusão
        await waitForCompletion();
        
    } catch (error) {
        console.error('Erro ao iniciar envio:', error);
        showToast('Erro ao iniciar envio', 'error');
        closeProgressModal();
        sendingInProgress = false;
    }
}

// Polling de progresso
function startProgressPolling() {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(async () => {
        if (!sendingProcessId || !sendingInProgress) {
            clearInterval(progressInterval);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/messages/send-progress/${sendingProcessId}`);
            const data = await response.json();
            
            if (data.success) {
                updateProgress(data.progress);
                
                // Se concluído ou parado
                if (data.progress.status === 'completed' || data.progress.status === 'stopped') {
                    clearInterval(progressInterval);
                    sendingInProgress = false;
                    
                    if (data.progress.status === 'completed') {
                        showToast('Todas as mensagens foram enviadas!', 'success');
                        selectedLoans.clear();
                        updateSelectionUI();
                        loadLoans();
                    }
                    
                    document.getElementById('btnStopSending').style.display = 'none';
                    document.getElementById('btnCloseProgress').style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Erro ao buscar progresso:', error);
        }
    }, 1000); // Atualizar a cada 1 segundo
}

// Parar envio
async function stopSending() {
    if (!sendingProcessId) return;
    
    try {
        const response = await fetch(`${API_BASE}/messages/send-stop/${sendingProcessId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Envio interrompido', 'warning');
            sendingInProgress = false;
            clearInterval(progressInterval);
            document.getElementById('btnStopSending').style.display = 'none';
            document.getElementById('btnCloseProgress').style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao parar envio:', error);
    }
}

// Aguardar conclusão
async function waitForCompletion() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (!sendingInProgress) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 500);
    });
}

// Abrir modal de progresso
function openProgressModal() {
    document.getElementById('progressModal').classList.add('active');
    document.getElementById('btnStopSending').style.display = 'block';
    document.getElementById('btnCloseProgress').style.display = 'none';
}

// Fechar modal de progresso
function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('active');
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    sendingInProgress = false;
    sendingProcessId = null;
}

// Resetar progresso
function resetProgress() {
    updateProgress({
        total: 0,
        audioSent: 0,
        audioFailed: 0,
        textSent: 0,
        textFailed: 0,
        audioCurrent: 0,
        textCurrent: 0,
        status: 'starting'
    });
}

// Atualizar progresso visual
function updateProgress(progress) {
    const total = progress.total || 0;
    const audioSent = progress.audioSent || 0;
    const audioFailed = progress.audioFailed || 0;
    const textSent = progress.textSent || 0;
    const textFailed = progress.textFailed || 0;
    const audioCurrent = progress.audioCurrent || 0;
    const textCurrent = progress.textCurrent || 0;
    
    // Progresso de áudio
    const audioTotal = audioSent + audioFailed + audioCurrent;
    const audioPercent = total > 0 ? Math.round((audioTotal / total) * 100) : 0;
    
    document.getElementById('audioProgressFill').style.width = `${audioPercent}%`;
    document.getElementById('audioProgressPercent').textContent = `${audioPercent}%`;
    document.getElementById('audioProgressText').textContent = `${audioTotal} / ${total}`;
    
    if (progress.status === 'sending_audio') {
        document.getElementById('audioStatus').textContent = `Enviando áudio ${audioCurrent} de ${total}...`;
    } else if (progress.status === 'audio_complete') {
        document.getElementById('audioStatus').textContent = `Áudios concluídos: ${audioSent} enviados, ${audioFailed} falhas`;
    } else if (progress.status === 'starting') {
        document.getElementById('audioStatus').textContent = 'Iniciando envio de áudios...';
    } else {
        document.getElementById('audioStatus').textContent = 'Aguardando...';
    }
    
    // Progresso de texto
    const textTotal = textSent + textFailed + textCurrent;
    const textPercent = total > 0 ? Math.round((textTotal / total) * 100) : 0;
    
    document.getElementById('textProgressFill').style.width = `${textPercent}%`;
    document.getElementById('textProgressPercent').textContent = `${textPercent}%`;
    document.getElementById('textProgressText').textContent = `${textTotal} / ${total}`;
    
    if (progress.status === 'sending_text') {
        document.getElementById('textStatus').textContent = `Enviando texto ${textCurrent} de ${total}...`;
    } else if (progress.status === 'completed') {
        document.getElementById('textStatus').textContent = `Textos concluídos: ${textSent} enviados, ${textFailed} falhas`;
    } else if (progress.status === 'sending_audio' || progress.status === 'audio_complete') {
        document.getElementById('textStatus').textContent = 'Aguardando conclusão dos áudios...';
    } else {
        document.getElementById('textStatus').textContent = 'Aguardando...';
    }
    
    // Resumo
    document.getElementById('totalCount').textContent = total;
    document.getElementById('audioSentCount').textContent = audioSent;
    document.getElementById('textSentCount').textContent = textSent;
    document.getElementById('failedCount').textContent = audioFailed + textFailed;
}

// Carregar QR Code
async function loadQRCode() {
    const qrCodeBox = document.getElementById('qrCodeBox');
    
    try {
        const response = await fetch(`${API_BASE}/qr-code`);
        const data = await response.json();

        if (data.success && data.qrCode) {
            qrCodeBox.innerHTML = `<img src="data:image/png;base64,${data.qrCode}" alt="QR Code WhatsApp">`;
        } else {
            qrCodeBox.innerHTML = `
                <div class="qr-loading">
                    <i class="fas fa-qrcode"></i>
                    <p>${data.message || 'QR Code ainda não disponível'}</p>
                    <p style="font-size: 12px; margin-top: 8px;">Aguarde o bot inicializar...</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar QR Code:', error);
        qrCodeBox.innerHTML = `
            <div class="qr-loading">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar QR Code</p>
            </div>
        `;
    }
}

// Atualizar estatísticas
function updateStats() {
    const overdue = loans.filter(l => l.status === 'overdue' || (l.days_overdue && l.days_overdue > 0)).length;
    const dueToday = loans.filter(l => l.loan_type === 'due_today' || (l.days_overdue === 0 && l.status === 'active')).length;
    const total = loans.length;

    document.getElementById('overdueCount').textContent = overdue;
    document.getElementById('dueTodayCount').textContent = dueToday;
    document.getElementById('totalCount').textContent = total;
}

// Buscar empréstimos
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        filteredLoans = [...loans];
    } else {
        filteredLoans = loans.filter(loan => {
            const client = loan.client || loan.clients;
            const name = (client?.name || '').toLowerCase();
            const phone = (client?.phone || '').toLowerCase();
            const cpf = (client?.cpf || '').toLowerCase();
            
            return name.includes(searchTerm) || 
                   phone.includes(searchTerm) || 
                   cpf.includes(searchTerm);
        });
    }
    
    renderLoans('loansList', filteredLoans);
}

// Enviar todas as mensagens
async function sendAllMessages() {
    showToast('Enviando mensagens...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/messages/send-overdue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast(
                `Mensagens enviadas: ${data.sent} sucesso, ${data.failed} falhas`,
                data.failed > 0 ? 'warning' : 'success'
            );
            loadLoans();
        } else {
            throw new Error(data.error || 'Erro ao enviar mensagens');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagens:', error);
        showToast('Erro ao enviar mensagens', 'error');
    }
}

// Aplicar filtro por data
async function applyDateFilter() {
    const dateInput = document.getElementById('dateInput').value;
    
    if (!dateInput) {
        showToast('Por favor, selecione uma data', 'warning');
        return;
    }

    closeDateModal();

    if (currentAction === 'send') {
        showConfirmModal(
            'Enviar Mensagens por Data',
            `Tem certeza que deseja enviar mensagens para todos os empréstimos que vencem em ${formatDate(dateInput)}?`,
            () => sendMessagesByDate(dateInput)
        );
        currentAction = null;
    } else {
        try {
            const response = await fetch(`${API_BASE}/loans/by-date?date=${dateInput}&company=${currentCompany}`);
            const data = await response.json();

            if (data.success) {
                filteredLoans = data.data || [];
                renderLoans('loansList', filteredLoans);
                showToast(`${filteredLoans.length} empréstimos encontrados para a data selecionada`, 'info');
            } else {
                throw new Error(data.error || 'Erro ao filtrar empréstimos');
            }
        } catch (error) {
            console.error('Erro ao filtrar empréstimos:', error);
            showToast('Erro ao filtrar empréstimos', 'error');
        }
    }
}

// Enviar mensagens por data
async function sendMessagesByDate(date) {
    showToast('Enviando mensagens...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/messages/send-by-date`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date, company: currentCompany })
        });

        const data = await response.json();

        if (data.success) {
            showToast(
                `Mensagens enviadas: ${data.sent} sucesso, ${data.failed} falhas`,
                data.failed > 0 ? 'warning' : 'success'
            );
            loadLoans();
        } else {
            throw new Error(data.error || 'Erro ao enviar mensagens');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagens:', error);
        showToast('Erro ao enviar mensagens', 'error');
    }
}

// Preview da mensagem
async function previewMessage(loanId) {
    try {
        const response = await fetch(`${API_BASE}/preview-message?loanId=${loanId}&company=${currentCompany}`);
        const data = await response.json();

        if (data.success) {
            alert(`Preview da Mensagem:\n\n${data.message}`);
        } else {
            throw new Error(data.error || 'Erro ao gerar preview');
        }
    } catch (error) {
        console.error('Erro ao gerar preview:', error);
        showToast('Erro ao gerar preview da mensagem', 'error');
    }
}

// Modal de confirmação
function showConfirmModal(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    currentAction = callback;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    currentAction = null;
}

function executeConfirmedAction() {
    if (currentAction && typeof currentAction === 'function') {
        currentAction();
    }
    closeConfirmModal();
}

function closeDateModal() {
    document.getElementById('dateModal').classList.remove('active');
    document.getElementById('dateInput').value = '';
    currentAction = null;
}

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Formatação
function formatCurrency(value) {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(parseFloat(value));
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Gerenciar áudio
async function checkAudioStatus() {
    try {
        const response = await fetch(`${API_BASE}/audio/status`);
        const data = await response.json();

        if (data.success && data.exists) {
            updateAudioUI(data);
        } else {
            updateAudioUI(null);
        }
    } catch (error) {
        console.error('Erro ao verificar status do áudio:', error);
    }
}

function updateAudioUI(audioData) {
    const audioStatus = document.getElementById('audioStatus');
    const audioInfo = document.getElementById('audioInfo');
    const btnRemoveAudio = document.getElementById('btnRemoveAudio');
    const audioFileName = document.getElementById('audioFileName');
    const audioFileSize = document.getElementById('audioFileSize');

    if (audioData) {
        audioStatus.classList.add('has-audio');
        audioStatus.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <p>Áudio configurado: ${audioData.filename}</p>
        `;
        audioInfo.style.display = 'block';
        btnRemoveAudio.style.display = 'block';
        audioFileName.textContent = audioData.filename;
        audioFileSize.textContent = formatFileSize(audioData.size);
    } else {
        audioStatus.classList.remove('has-audio');
        audioStatus.innerHTML = `
            <i class="fas fa-music"></i>
            <p>Nenhum áudio configurado</p>
        `;
        audioInfo.style.display = 'none';
        btnRemoveAudio.style.display = 'none';
    }
}

async function handleAudioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
        showToast('Por favor, selecione um arquivo MP3', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('Arquivo muito grande. Máximo: 10MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    showToast('Enviando áudio...', 'info');

    try {
        const response = await fetch(`${API_BASE}/audio/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast('Áudio enviado com sucesso!', 'success');
            checkAudioStatus();
        } else {
            throw new Error(data.error || 'Erro ao enviar áudio');
        }
    } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        showToast('Erro ao enviar áudio', 'error');
    }

    // Limpar input
    e.target.value = '';
}

async function removeAudio() {
    if (!confirm('Tem certeza que deseja remover o áudio?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/audio`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Áudio removido com sucesso', 'success');
            checkAudioStatus();
        } else {
            throw new Error(data.error || 'Erro ao remover áudio');
        }
    } catch (error) {
        console.error('Erro ao remover áudio:', error);
        showToast('Erro ao remover áudio', 'error');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Exportar funções para uso global
window.previewMessage = previewMessage;
window.sendSingleMessage = sendSingleMessage;
window.openSendOptionsModal = openSendOptionsModal;
window.toggleLoanSelection = toggleLoanSelection;
