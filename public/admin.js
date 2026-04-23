const adminApp = document.getElementById('adminApp');
const toast = document.getElementById('toast');

const state = {
  token: localStorage.getItem('birutaAdminToken') || '',
  data: null,
  search: '',
  filterPrize: 'all'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw data;
  return data;
}

function renderLogin() {
  adminApp.innerHTML = `
    <section class="admin-login glass-card">
      <div class="brand-chip">Área administrativa</div>
      <h1 class="heading-lg">Acessar painel</h1>
      <form id="loginForm" class="form-grid">
        <div>
          <label class="label" for="username">Usuário</label>
          <input class="input" id="username" autocomplete="username" />
        </div>
        <div>
          <label class="label" for="password">Senha</label>
          <input class="input" id="password" type="password" autocomplete="current-password" />
        </div>
        <button class="primary-btn" type="submit">Entrar</button>
      </form>
    </section>`;

  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('username').value,
          password: document.getElementById('password').value
        })
      });
      state.token = data.token;
      localStorage.setItem('birutaAdminToken', state.token);
      await loadData();
    } catch (error) {
      showToast(error.error || 'Falha ao entrar.');
    }
  });
}

function computeStats(participants) {
  const today = new Date().toLocaleDateString('pt-BR');
  const todayCount = participants.filter((item) => new Date(item.createdAt).toLocaleDateString('pt-BR') === today).length;
  const prizes = participants.filter((item) => item.prize).length;
  const topPrize = Object.entries(participants.reduce((acc, item) => {
    if (item.prize) acc[item.prize] = (acc[item.prize] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  return { total: participants.length, prizes, todayCount, topPrize };
}

function getParticipants() {
  const participants = state.data?.participants || [];
  return participants.filter((item) => {
    const content = `${item.name} ${item.whatsappMasked} ${item.profileName || ''} ${item.prize || ''}`.toLowerCase();
    const matchesSearch = !state.search || content.includes(state.search.toLowerCase());
    const matchesPrize = state.filterPrize === 'all' || item.prize === state.filterPrize;
    return matchesSearch && matchesPrize;
  });
}

function renderPanel() {
  const all = state.data.participants;
  const participants = getParticipants();
  const stats = computeStats(all);
  const prizeOptions = [...new Set(all.filter((item) => item.prize).map((item) => item.prize))];

  adminApp.innerHTML = `
    <section class="admin-panel glass-card">
      <div class="admin-top">
        <div>
          <div class="brand-chip">Painel da campanha</div>
          <h1 class="heading-lg">Promoção Dia das Mães</h1>
        </div>
        <div class="card-actions wrap">
          <span class="admin-badge ${state.data.campaign.active ? 'active' : 'inactive'}">${state.data.campaign.active ? 'Campanha ativa' : 'Campanha encerrada'}</span>
          <button class="ghost-btn" id="toggleCampaign">${state.data.campaign.active ? 'Encerrar promoção' : 'Reativar promoção'}</button>
          <button class="primary-btn" id="printReport">Imprimir relatório</button>
          <button class="ghost-btn" id="logoutBtn">Sair</button>
        </div>
      </div>

      <div class="cards">
        <div class="stat-card"><span class="stat-label">Total de participantes</span><strong class="stat-value">${stats.total}</strong></div>
        <div class="stat-card"><span class="stat-label">Cortesias liberadas</span><strong class="stat-value">${stats.prizes}</strong></div>
        <div class="stat-card"><span class="stat-label">Participações hoje</span><strong class="stat-value">${stats.todayCount}</strong></div>
        <div class="stat-card"><span class="stat-label">Mais sorteada</span><strong class="stat-value small">${stats.topPrize}</strong></div>
      </div>

      <div class="toolbar">
        <input class="input" id="searchInput" placeholder="Buscar por nome, telefone ou cortesia" value="${state.search}" />
        <select class="input" id="prizeFilter">
          <option value="all">Todas as cortesias</option>
          ${prizeOptions.map((item) => `<option value="${item}" ${state.filterPrize === item ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>WhatsApp</th>
              <th>Tipo de mãe</th>
              <th>Cortesia</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${participants.map((item) => {
              const date = new Date(item.completedAt || item.createdAt);
              return `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.whatsappMasked}</td>
                  <td>${item.profileName || '-'}</td>
                  <td>${item.prize ? `<span class="pill">${item.prize}</span>` : '-'}</td>
                  <td>${date.toLocaleDateString('pt-BR')}</td>
                  <td>${date.toLocaleTimeString('pt-BR')}</td>
                  <td>
                    <select class="input status-select" data-id="${item.id}">
                      ${['Participou', 'Entrou em contato', 'Convertido', 'Excluído'].map((status) => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                  </td>
                  <td>
                    <div class="actions-inline">
                      <button class="tiny-btn detail-btn" data-id="${item.id}">Detalhes</button>
                      <button class="tiny-btn delete-btn" data-id="${item.id}">Excluir</button>
                    </div>
                  </td>
                </tr>`;
            }).join('') || '<tr><td colspan="8" class="centered table-empty">Nenhum cadastro encontrado.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div id="printShell"></div>
    </section>`;

  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.search = event.target.value;
    renderPanel();
  });

  document.getElementById('prizeFilter').addEventListener('change', (event) => {
    state.filterPrize = event.target.value;
    renderPanel();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.token = '';
    localStorage.removeItem('birutaAdminToken');
    renderLogin();
  });

  document.getElementById('toggleCampaign').addEventListener('click', async () => {
    try {
      await api('/api/admin/campaign', {
        method: 'PATCH',
        body: JSON.stringify({ active: !state.data.campaign.active })
      });
      await loadData();
      showToast('Status da campanha atualizado.');
    } catch (error) {
      showToast(error.error || 'Não foi possível atualizar a campanha.');
    }
  });

  document.getElementById('printReport').addEventListener('click', () => printReport(getParticipants()));

  document.querySelectorAll('.status-select').forEach((element) => {
    element.addEventListener('change', async () => {
      try {
        await api(`/api/admin/participant/${element.dataset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: element.value })
        });
        await loadData();
      } catch (error) {
        showToast(error.error || 'Não foi possível atualizar o status.');
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirm('Deseja realmente excluir este cadastro?')) return;
      try {
        await api(`/api/admin/participant/${button.dataset.id}`, { method: 'DELETE' });
        await loadData();
        showToast('Cadastro excluído com sucesso.');
      } catch (error) {
        showToast(error.error || 'Não foi possível excluir o cadastro.');
      }
    });
  });

  document.querySelectorAll('.detail-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const item = state.data.participants.find((participant) => participant.id === button.dataset.id);
      const answers = (item.answers || []).map((answer, index) => `Pergunta ${index + 1}: opção ${answer + 1}`).join('\n');
      alert(`Nome: ${item.name}\nWhatsApp: ${item.whatsappMasked}\nPerfil: ${item.profileName || '-'}\nCortesia: ${item.prize || '-'}\nData: ${new Date(item.completedAt || item.createdAt).toLocaleString('pt-BR')}\nStatus: ${item.status}\n\nRespostas:\n${answers || '-'}`);
    });
  });
}

function printReport(participants) {
  const shell = document.getElementById('printShell');
  shell.innerHTML = `
    <div class="print-only">
      <h2>Relatório - Promoção Dia das Mães</h2>
      <p>Total de registros: ${participants.length}</p>
      <table class="print-table">
        <thead><tr><th>Nome</th><th>Telefone</th><th>Cortesia</th><th>Data</th><th>Hora</th></tr></thead>
        <tbody>
          ${participants.map((item) => {
            const date = new Date(item.completedAt || item.createdAt);
            return `<tr><td>${item.name}</td><td>${item.whatsappMasked}</td><td>${item.prize || '-'}</td><td>${date.toLocaleDateString('pt-BR')}</td><td>${date.toLocaleTimeString('pt-BR')}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  window.print();
}

async function loadData() {
  try {
    state.data = await api('/api/admin/participants');
    renderPanel();
  } catch {
    state.token = '';
    localStorage.removeItem('birutaAdminToken');
    renderLogin();
  }
}

(async function init() {
  if (!state.token) {
    renderLogin();
    return;
  }
  await loadData();
})();
