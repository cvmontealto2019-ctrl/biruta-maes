const app = document.getElementById('app');
const toast = document.getElementById('toast');
const state = {
  config: null,
  participantId: localStorage.getItem('birutaMaeParticipantId') || null,
  name: localStorage.getItem('birutaMaeName') || '',
  whatsapp: localStorage.getItem('birutaMaeWhatsapp') || '',
  step: localStorage.getItem('birutaMaeStep') || 'register',
  answers: JSON.parse(localStorage.getItem('birutaMaeAnswers') || '[]'),
  profileName: localStorage.getItem('birutaMaeProfileName') || '',
  profilePhrase: localStorage.getItem('birutaMaeProfilePhrase') || '',
  prize: localStorage.getItem('birutaMaePrize') || '',
  completedAt: localStorage.getItem('birutaMaeCompletedAt') || ''
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function persist() {
  localStorage.setItem('birutaMaeParticipantId', state.participantId || '');
  localStorage.setItem('birutaMaeName', state.name || '');
  localStorage.setItem('birutaMaeWhatsapp', state.whatsapp || '');
  localStorage.setItem('birutaMaeStep', state.step || 'register');
  localStorage.setItem('birutaMaeAnswers', JSON.stringify(state.answers || []));
  localStorage.setItem('birutaMaeProfileName', state.profileName || '');
  localStorage.setItem('birutaMaeProfilePhrase', state.profilePhrase || '');
  localStorage.setItem('birutaMaePrize', state.prize || '');
  localStorage.setItem('birutaMaeCompletedAt', state.completedAt || '');
}

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR');
}

function confettiHtml() {
  const colors = ['#ff5e92','#ff90b4','#ffd27d','#fff0b8','#ffc2d8'];
  return `<div class="confetti">${Array.from({length:24}).map((_,i)=>`<span style="left:${Math.random()*100}%; background:${colors[i%colors.length]}; animation-delay:${(Math.random()*2).toFixed(2)}s"></span>`).join('')}</div>`;
}

function render() {
  if (!state.config) {
    app.innerHTML = `<div class="centered"><h1 class="heading-lg">Carregando...</h1></div>`;
    return;
  }

  if (!state.config.campaignActive && !state.prize) {
    app.innerHTML = `
      <div class="centered result-card">
        <div class="spark-badge">❤</div>
        <h1 class="heading-lg">Promoção encerrada</h1>
        <p class="subtitle">Essa campanha já foi finalizada. Se você ainda não participou, aguarde a próxima surpresa do Buffet Biruta Park.</p>
      </div>`;
    return;
  }

  switch (state.step) {
    case 'register': return renderRegister();
    case 'quiz-0':
    case 'quiz-1':
    case 'quiz-2': return renderQuiz(Number(state.step.split('-')[1]));
    case 'profile': return renderProfile();
    case 'gift': return renderGift();
    case 'prize': return renderPrize();
    default:
      state.step = 'register';
      persist();
      render();
  }
}

function renderRegister() {
  app.innerHTML = `
    <div>
      <h1 class="heading-xl">Promoção especial de Dia das Mães</h1>
      <p class="subtitle">Descubra seu perfil, conquiste sua cortesia e viva uma experiência linda com o Buffet Biruta Park.</p>
      <form id="registerForm" class="form-grid">
        <div>
          <label class="label">Nome completo</label>
          <input class="input" id="name" placeholder="Digite seu nome e sobrenome" value="${state.name || ''}" />
        </div>
        <div>
          <label class="label">WhatsApp</label>
          <input class="input" id="whatsapp" placeholder="(16) 99999-9999" value="${maskWhatsApp(state.whatsapp || '')}" />
        </div>
        <button class="primary-btn" type="submit">Começar agora</button>
      </form>
      <div class="logo-note">Para usar a logo flutuando no fundo, salve sua imagem em <strong>public/assets/logo-biruta.png</strong>. Se quiser trocar depois, é só substituir esse arquivo pelo mesmo nome.</div>
    </div>`;

  document.getElementById('whatsapp').addEventListener('input', e => {
    e.target.value = maskWhatsApp(e.target.value);
  });

  document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, whatsapp })
      });
      const data = await res.json();
      if (!res.ok) throw data;
      state.participantId = data.participantId;
      state.name = data.name;
      state.whatsapp = whatsapp;
      state.step = 'quiz-0';
      state.answers = [];
      persist();
      render();
    } catch (err) {
      showToast(err.error || 'Não foi possível continuar.');
    }
  });
}

function renderQuiz(index) {
  const q = state.config.questions[index];
  app.innerHTML = `
    <div>
      <div class="progress-shell">
        <div class="progress-text"><span>Pergunta ${index + 1} de 3</span><span>${Math.round(((index + 1) / 3) * 100)}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${((index + 1) / 3) * 100}%"></div></div>
      </div>
      <h2 class="heading-lg">${q.text}</h2>
      <div class="option-grid">
        ${q.options.map((option, i) => `<button class="option-btn" data-index="${i}">${option}</button>`).join('')}
      </div>
    </div>`;

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.answers[index] = Number(btn.dataset.index);
      persist();
      if (index < 2) {
        state.step = `quiz-${index + 1}`;
        persist();
        render();
      } else {
        try {
          const res = await fetch('/api/complete-quiz', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId: state.participantId, answers: state.answers })
          });
          const data = await res.json();
          if (!res.ok) throw data;
          state.profileName = data.profileName;
          state.profilePhrase = data.profilePhrase;
          state.step = 'profile';
          persist();
          render();
        } catch (err) {
          showToast(err.error || 'Erro ao finalizar quiz.');
        }
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
      <h2 class="heading-lg">Você é ${state.profileName}</h2>
      <p class="subtitle">${state.profilePhrase}</p>
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
    <div>
      <div class="centered">
        <h2 class="heading-lg">Escolha uma caixa e descubra sua cortesia</h2>
        <p class="subtitle">Selecione apenas uma opção. Sua escolha é única e especial.</p>
      </div>
      <div class="prize-scene">
        <div class="prize-grid">
          ${[1,2,3].map((n,i) => `
            <button class="gift-box" data-box="${i}">
              <div class="gift-bow"></div>
              <div class="gift-lid"></div>
              <div class="gift-body"></div>
              <div class="gift-ribbon-v"></div>
              <div class="gift-ribbon-h"></div>
              <div class="gift-label">Caixa ${n}</div>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  document.querySelectorAll('.gift-box').forEach(box => {
    box.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/claim-prize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: state.participantId, boxIndex: Number(box.dataset.box) })
        });
        const data = await res.json();
        if (!res.ok) throw data;
        state.prize = data.prize;
        state.completedAt = data.completedAt;
        state.step = 'prize';
        persist();
        render();
      } catch (err) {
        showToast(err.error || 'Não foi possível revelar a cortesia.');
      }
    });
  });
}

function renderPrize() {
  const message = encodeURIComponent(`Oi, tudo bem? Eu participei da promoção de Dia das Mães do Buffet Biruta Park, fui identificada como ${state.profileName} e ganhei a cortesia ${state.prize}. Gostaria de saber como utilizar meu prêmio.`);
  app.innerHTML = `
    <div class="result-card centered" style="position:relative; overflow:hidden;">
      ${confettiHtml()}
      <div class="spark-badge">🎁</div>
      <p class="small muted">Parabéns pela conquista</p>
      <h2 class="heading-lg">Você ganhou:</h2>
      <div class="pill" style="font-size:1rem; padding:12px 18px; margin: 10px auto 18px; background: rgba(255,79,135,0.16);">${state.prize}</div>
      <p class="subtitle">Seu prêmio foi liberado com sucesso. Agora é só falar com nossa equipe para usar sua cortesia.</p>
      <div class="rules">
        Válida para os pacotes <strong>Gourmet, Cheff, Biruta e Birutinha</strong>.<br>
        Válida para <strong>novos contratos</strong>.<br>
        Validade de <strong>5 dias</strong> a partir da conquista.<br>
        Registrado em: <strong>${formatDateTime(state.completedAt)}</strong>
      </div>
      <div class="card-actions" style="justify-content:center;">
        <a class="primary-btn" target="_blank" rel="noopener" href="https://wa.me/5516997913686?text=${message}">Entrar em contato com a equipe</a>
      </div>
    </div>`;
}

function maskWhatsApp(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

(async function init() {
  try {
    const res = await fetch('/api/config');
    state.config = await res.json();
    if (state.prize) state.step = 'prize';
    else if (state.profileName && state.step !== 'gift') state.step = 'profile';
    persist();
    render();
  } catch {
    showToast('Erro ao carregar a campanha.');
  }
})();
