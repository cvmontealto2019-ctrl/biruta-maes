const adminApp = document.getElementById('adminApp');
const toast = document.getElementById('toast');
const state = {
  token: localStorage.getItem('birutaAdminToken') || '',
  data: null,
  q: '',
  filterPrize: 'all'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

function renderLogin() {
  adminApp.innerHTML = `
    <section class="admin-login glass-card" style="width:min(480px,100%)">
      <div class="brand-chip">Área administrativa</div>
      <h1 class="heading-lg">Acessar painel</h1>
      <p class="subtitle">Entre com seu usuário e senha para controlar a campanha.</p>
      <form id="loginForm" class="form-grid">
        <div><label class="label">Usuário</label><input class="input" id="username" /></div>
        <div><label class="label">Senha</label><input class="input" id="password" type="password" /></div>
        <button class="primary-btn" type="submit">Entrar</button>
      </form>
    </section>`;

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('username').value,
          password: document.getElementById('password').value
        })
      });
      state.token = data.token;
      localStorage.setItem('birutaAdminToken', data.token);
      await loadData();
    } catch (err) {
      showToast(err.error || 'Falha ao entrar.');
    }
  });
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

function computeStats(participants) {
  const today = new Date().toLocaleDateString('pt-BR');
  const todayCount = participants.filter(p => new Date(p.createdAt).toLocaleDateString('pt-BR') === today).length;
  const byPrize = participants.reduce((acc, p) => {
    if (p.prize) acc[p.prize] = (acc[p.prize] || 0) + 1;
    return acc;
  }, {});
  const topPrize = Object.entries(byPrize).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
  return {
    total: participants.length,
    prizes: participants.filter(p => p.prize).length,
    today: todayCount,
    topPrize
  };
}

function filteredParticipants() {
  const participants = state.data?.participants || [];
  return participants.filter(p => {
    const matchesQ = !state.q || `${p.name} ${p.whatsappMasked} ${p.profileName || ''}`.toLowerCase().includes(state.q.toLowerCase());
    const matchesPrize = state.filterPrize === 'all' || p.prize === state.filterPrize;
    return matchesQ && matchesPrize;
  });
}

function renderPanel() {
  const participants = filteredParticipants();
  const all = state.data.participants;
  const stats = computeStats(all);
  const prizeOptions = [...new Set(all.filter(p => p.prize).map(p => p.prize))];

  adminApp.innerHTML = `
    <section class="admin-panel glass-card">
      <div class="admin-top">
        <div>
          <div class="brand-chip">Painel da campanha</div>
          <h1 class="heading-lg">Promoção Dia das Mães</h1>
        </div>
        <div class="card-actions">
          <span class="admin-badge">${state.data.campaign.active ? 'Campanha ativa' : 'Campanha encerrada'}</span>
          <button class="ghost-btn" id="toggleCampaign">${state.data.campaign.active ? 'Encerrar promoção' : 'Reativar promoção'}</button>
          <button class="primary-btn" id="printReport">Imprimir relatório</button>
          <button class="ghost-btn" id="logout">Sair</button>
        </div>
      </div>

      <div class="cards">
        <div class="stat-card"><div class="stat-label">Total de participantes</div><div class="stat-value">${stats.total}</div></div>
        <div class="stat-card"><div class="stat-label">Cortesias distribuídas</div><div class="stat-value">${stats.prizes}</div></div>
        <div class="stat-card"><div class="stat-label">Participações hoje</div><div class="stat-value">${stats.today}</div></div>
        <div class="stat-card"><div class="stat-label">Mais sorteada</div><div class="stat-value" style="font-size:1rem">${stats.topPrize}</div></div>
      </div>

      <div class="toolbar">
        <input class="input" id="searchInput" placeholder="Buscar por nome ou telefone" value="${state.q}" />
        <select class="input" id="prizeFilter">
          <option value="all">Todas as cortesias</option>
          ${prizeOptions.map(p => `<option ${state.filterPrize===p?'selected':''}>${p}</option>`).join('')}
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
            ${participants.map(p => {
              const dt = p.completedAt || p.createdAt;
              const date = new Date(dt);
              return `<tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.whatsappMasked}</td>
                <td>${p.profileName || '-'}</td>
                <td>${p.prize ? `<span class="pill">${p.prize}</span>` : '-'}</td>
                <td>${date.toLocaleDateString('pt-BR')}</td>
                <td>${date.toLocaleTimeString('pt-BR')}</td>
                <td>
                  <select class="input status-select" data-id="${p.id}" style="min-width:160px; padding:10px 12px; height:40px;">
                    ${['Participou','Entrou em contato','Convertido','Excluído'].map(s => `<option ${p.status===s?'selected':''}>${s}</option>`).join('')}
                  </select>
                </td>
                <td>
                  <div class="actions-inline">
                    <button class="tiny-btn detail-btn" data-id="${p.id}">Detalhes</button>
                    <button class="tiny-btn delete-btn" data-id="${p.id}">Excluir</button>
                  </div>
                </td>
              </tr>`;
            }).join('') || `<tr><td colspan="8" class="centered">Nenhum cadastro encontrado.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="print-shell" id="printShell"></div>
    </section>`;

  document.getElementById('searchInput').addEventListener('input', e => { state.q = e.target.value; renderPanel(); });
  document.getElementById('prizeFilter').addEventListener('change', e => { state.filterPrize = e.target.value; renderPanel(); });
  document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('birutaAdminToken');
    state.token = '';
    renderLogin();
  });
  document.getElementById('toggleCampaign').addEventListener('click', async () => {
    try {
      await api('/api/admin/campaign', { method: 'PATCH', body: JSON.stringify({ active: !state.data.campaign.active }) });
      await loadData();
      showToast('Status da campanha atualizado.');
    } catch (err) { showToast(err.error || 'Erro ao alterar campanha.'); }
  });
  document.getElementById('printReport').addEventListener('click', () => printReport(filteredParticipants()));

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await api(`/api/admin/participant/${sel.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
        await loadData();
      } catch (err) { showToast(err.error || 'Erro ao atualizar status.'); }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deseja realmente excluir este cadastro?')) return;
      try {
        await api(`/api/admin/participant/${btn.dataset.id}`, { method: 'DELETE' });
        await loadData();
        showToast('Cadastro excluído.');
      } catch (err) { showToast(err.error || 'Erro ao excluir cadastro.'); }
    });
  });

  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = state.data.participants.find(x => x.id === btn.dataset.id);
      const answers = (p.answers || []).map((a, i) => `Pergunta ${i + 1}: opção ${a + 1}`).join('\n');
      alert(`Nome: ${p.name}\nWhatsApp: ${p.whatsappMasked}\nPerfil: ${p.profileName || '-'}\nCortesia: ${p.prize || '-'}\nData: ${new Date(p.completedAt || p.createdAt).toLocaleString('pt-BR')}\nStatus: ${p.status}\n\nRespostas:\n${answers || '-'}`);
    });
  });
}

function printReport(participants) {
  const shell = document.getElementById('printShell');
  shell.innerHTML = `
    <h2 style="margin:0 0 8px;">Relatório - Promoção Dia das Mães</h2>
    <p style="margin:0 0 10px; font-size:11px;">Total de registros: ${participants.length}</p>
    <table class="print-table">
      <thead><tr><th>Nome</th><th>Telefone</th><th>Cortesia</th><th>Data</th><th>Hora</th></tr></thead>
      <tbody>
        ${participants.map(p => {
          const d = new Date(p.completedAt || p.createdAt);
          return `<tr><td>${p.name}</td><td>${p.whatsappMasked}</td><td>${p.prize || '-'}</td><td>${d.toLocaleDateString('pt-BR')}</td><td>${d.toLocaleTimeString('pt-BR')}</td></tr>`;
        }).join('')}
      </tbody>
    </table>`;
  window.print();
}

(async function init() {
  if (!state.token) return renderLogin();
  await loadData();
})();
