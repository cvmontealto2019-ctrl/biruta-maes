const app = document.getElementById('app');
const toast = document.getElementById('toast');
const heroImage = document.getElementById('heroImage');
const heroFallback = document.getElementById('heroFallback');

const storage = {
  participantId: 'birutaMaeParticipantId',
  name: 'birutaMaeName',
  whatsapp: 'birutaMaeWhatsapp',
  step: 'birutaMaeStep',
  answers: 'birutaMaeAnswers',
  profileName: 'birutaMaeProfileName',
  profilePhrase: 'birutaMaeProfilePhrase',
  prize: 'birutaMaePrize',
  completedAt: 'birutaMaeCompletedAt'
};

const state = {
  config: null,
  participantId: localStorage.getItem(storage.participantId) || null,
  name: localStorage.getItem(storage.name) || '',
  whatsapp: localStorage.getItem(storage.whatsapp) || '',
  step: localStorage.getItem(storage.step) || 'register',
  answers: JSON.parse(localStorage.getItem(storage.answers) || '[]'),
  profileName: localStorage.getItem(storage.profileName) || '',
  profilePhrase: localStorage.getItem(storage.profilePhrase) || '',
  prize: localStorage.getItem(storage.prize) || '',
  completedAt: localStorage.getItem(storage.completedAt) || ''
};

const WHATSAPP_NUMBER = '5516997913686';
const VALIDITY_TEXT = 'Válida por 5 dias para novos contratos nos pacotes Gourmet, Cheff, Biruta e Birutinha';

heroImage?.addEventListener('error', () => {
  heroImage.style.display = 'none';
  heroFallback.style.display = 'flex';
});
heroImage?.addEventListener('load', () => {
  heroFallback.style.display = 'none';
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function persist() {
  localStorage.setItem(storage.participantId, state.participantId || '');
  localStorage.setItem(storage.name, state.name || '');
  localStorage.setItem(storage.whatsapp, state.whatsapp || '');
  localStorage.setItem(storage.step, state.step || 'register');
  localStorage.setItem(storage.answers, JSON.stringify(state.answers || []));
  localStorage.setItem(storage.profileName, state.profileName || '');
  localStorage.setItem(storage.profilePhrase, state.profilePhrase || '');
  localStorage.setItem(storage.prize, state.prize || '');
  localStorage.setItem(storage.completedAt, state.completedAt || '');
}

function confettiHtml() {
  const colors = ['#ff5c8f', '#ff9abd', '#ffd668', '#fff0ba', '#ffb8d4'];
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: 28 }).map((_, index) =>
    `<span style="left:${Math.random() * 100}%; background:${colors[index % colors.length]}; animation-delay:${(Math.random() * 1.8).toFixed(2)}s"></span>`
  ).join('')}</div>`;
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function maskWhatsApp(raw) {
  const digits = String(raw).replace(/\D/g, '').slice(-11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function resetProgress(keepContact = false) {
  state.participantId = null;
  state.step = 'register';
  state.answers = [];
  state.profileName = '';
  state.profilePhrase = '';
  state.prize = '';
  state.completedAt = '';
  if (!keepContact) {
    state.name = '';
    state.whatsapp = '';
  }
  persist();
}

function render() {
  if (!state.config) {
    app.innerHTML = `<div class="empty-state"><div class="loader"></div><p>Carregando campanha...</p></div>`;
    return;
  }

  if (!state.config.campaignActive && !state.prize) {
    app.innerHTML = `
      <div class="result-card centered" style="position:relative; overflow:hidden;">
        <div class="spark-badge">❤</div>
        <p class="small muted">Promoção encerrada</p>
        <h2 class="heading-lg">Essa campanha já foi finalizada</h2>
        <p class="subtitle">Se você ainda não participou, aguarde a próxima surpresa especial do Buffet Biruta Park.</p>
      </div>`;
    return;
  }

  switch (state.step) {
    case 'register':
      renderRegister();
      break;
    case 'quiz-0':
    case 'quiz-1':
    case 'quiz-2':
      renderQuiz(Number(state.step.split('-')[1]));
      break;
    case 'profile':
      renderProfile();
      break;
    case 'gift':
      renderGift();
      break;
    case 'prize':
      renderPrize();
      break;
    default:
      resetProgress();
      renderRegister();
  }
}

function renderRegister() {
  app.innerHTML = `
    <div class="content-stack">
      <div>
        <h2 class="heading-xl">Descubra seu presente especial</h2>
        <p class="subtitle">Responda 3 perguntas rápidas, descubra que tipo de mãe você é e revele sua cortesia especial.</p>
      </div>
      <form id="registerForm" class="form-grid">
        <div>
          <label class="label" for="name">Nome completo</label>
          <input class="input" id="name" placeholder="Digite seu nome e sobrenome" value="${escapeHtml(state.name)}" />
        </div>
        <div>
          <label class="label" for="whatsapp">WhatsApp</label>
          <input class="input" id="whatsapp" placeholder="(16) 99999-9999" value="${maskWhatsApp(state.whatsapp)}" maxlength="15" />
        </div>
        <button class="primary-btn" type="submit">Começar agora</button>
      </form>
    </div>`;

  document.getElementById('whatsapp').addEventListener('input', (event) => {
    event.target.value = maskWhatsApp(event.target.value);
  });

  document.getElementById('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, whatsapp })
      });
      const data = await response.json();
      if (!response.ok) throw data;
      state.participantId = data.participantId;
      state.name = data.name;
      state.whatsapp = data.whatsappMasked;
      state.answers = [];
      state.profileName = '';
      state.profilePhrase = '';
      state.prize = '';
      state.completedAt = '';
      state.step = 'quiz-0';
      persist();
      render();
    } catch (error) {
      showToast(error.error || 'Não foi possível iniciar agora.');
    }
  });
}

function renderQuiz(index) {
  const question = state.config.questions[index];
  app.innerHTML = `
    <div class="content-stack">
      <div class="progress-shell">
        <div class="progress-text"><span>Pergunta ${index + 1} de 3</span><span>${Math.round(((index + 1) / 3) * 100)}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${((index + 1) / 3) * 100}%"></div></div>
      </div>
      <h2 class="heading-lg">${question.text}</h2>
      <div class="option-grid">
        ${question.options.map((option, optionIndex) => `
          <button class="option-btn" data-index="${optionIndex}">
            <span class="option-number">0${optionIndex + 1}</span>
            <span>${option}</span>
          </button>`).join('')}
      </div>
    </div>`;

  document.querySelectorAll('.option-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      state.answers[index] = Number(button.dataset.index);
      persist();
      if (index < 2) {
        state.step = `quiz-${index + 1}`;
        persist();
        render();
        return;
      }
      try {
        const response = await fetch('/api/complete-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: state.participantId, answers: state.answers })
        });
        const data = await response.json();
        if (!response.ok) throw data;
        state.profileName = data.profileName;
        state.profilePhrase = data.profilePhrase;
        state.step = 'profile';
        persist();
        render();
      } catch (error) {
        showToast(error.error || 'Não foi possível finalizar o quiz.');
      }
    });
  });
}

function renderProfile() {
  app.innerHTML = `
    <div class="result-card centered" style="position:relative; overflow:hidden;">
      ${confettiHtml()}
      <div class="spark-badge">👑</div>
      <p class="small muted">Parabéns</p>
      <h2 class="heading-lg">Você é ${escapeHtml(state.profileName)}</h2>
      <p class="subtitle">${escapeHtml(state.profilePhrase)}</p>
      <button class="primary-btn" id="goGift">Acessar minha cortesia</button>
    </div>`;

  document.getElementById('goGift').addEventListener('click', () => {
    state.step = 'gift';
    persist();
    render();
  });
}

function renderGift() {
  app.innerHTML = `
    <div class="content-stack gift-stack">
      <div class="centered">
        <h2 class="heading-lg">Escolha uma caixa</h2>
        <p class="subtitle">Escolha uma das três caixas para revelar sua cortesia exclusiva.</p>
      </div>
      <div class="prize-scene">
        <div class="gift-halo halo-1"></div>
        <div class="gift-halo halo-2"></div>
        <div class="prize-grid">
          ${[1, 2, 3].map((number, index) => `
            <button class="gift-box" data-box="${index}">
              <span class="gift-bow"></span>
              <span class="gift-lid"></span>
              <span class="gift-body"></span>
              <span class="gift-ribbon-v"></span>
              <span class="gift-ribbon-h"></span>
              <span class="gift-label">Caixa ${number}</span>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  document.querySelectorAll('.gift-box').forEach((box) => {
    box.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/claim-prize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: state.participantId, boxIndex: Number(box.dataset.box) })
        });
        const data = await response.json();
        if (!response.ok) throw data;
        state.prize = data.prize;
        state.completedAt = data.completedAt;
        state.step = 'prize';
        persist();
        render();
      } catch (error) {
        showToast(error.error || 'Não foi possível revelar sua cortesia.');
      }
    });
  });
}

function renderPrize() {
  const text = encodeURIComponent(`Oi, tudo bem? Eu participei da promoção de Mês das Mães do Buffet Biruta Park, fui identificada como ${state.profileName} e ganhei a cortesia ${state.prize}. Gostaria de saber como utilizar meu prêmio.`);
  app.innerHTML = `
    <div class="result-card centered" style="position:relative; overflow:hidden;">
      ${confettiHtml()}
      <div class="spark-badge">🎁</div>
      <p class="small muted">Cortesia liberada</p>
      <h2 class="heading-lg">Você ganhou:</h2>
      <div class="prize-pill big">${escapeHtml(state.prize)}</div>
      <p class="subtitle">${VALIDITY_TEXT}.</p>
      <div class="button-stack">
        <a class="primary-btn" href="https://wa.me/${WHATSAPP_NUMBER}?text=${text}" target="_blank" rel="noopener">Entrar em contato com a equipe</a>
        <button class="ghost-btn" id="restartBtn">Tela inicial</button>
      </div>
    </div>`;

  document.getElementById('restartBtn').addEventListener('click', () => {
    resetProgress(true);
    render();
  });
}

(async function init() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    state.config = data;
    if (state.prize && state.completedAt) {
      state.step = 'prize';
      persist();
    }
    render();
  } catch {
    showToast('Erro ao carregar a campanha.');
  }
})();
