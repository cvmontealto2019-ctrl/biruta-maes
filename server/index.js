import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(rootDir, 'data');
const dbFile = path.join(dataDir, 'participants.json');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USER = 'biruta';
const ADMIN_PASS = 'biruta@2026';
const ADMIN_TOKEN = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64');

const motherProfiles = {
  rainha: { name: 'Mãe Rainha', phrase: 'Você cuida de tudo com força, presença e um coração enorme.' },
  majestosa: { name: 'Mãe Majestosa', phrase: 'Sua elegância e seu jeito de amar fazem tudo ao seu redor florescer.' },
  encantadora: { name: 'Mãe Encantadora', phrase: 'Seu carinho transforma momentos simples em memórias especiais.' },
  luz: { name: 'Mãe Luz', phrase: 'Sua energia ilumina a família e deixa qualquer ambiente mais leve.' },
  fortaleza: { name: 'Mãe Fortaleza', phrase: 'Você protege, acolhe e enfrenta tudo com coragem.' },
  doceAbraco: { name: 'Mãe Doce Abraço', phrase: 'Seu amor é aconchego, cuidado e aquele colo que cura tudo.' },
  inspiradora: { name: 'Mãe Inspiradora', phrase: 'Seu jeito de viver e amar inspira todos ao seu redor.' },
  brilhante: { name: 'Mãe Brilhante', phrase: 'Você tem presença marcante e um coração que faz tudo ficar mais bonito.' },
  ouro: { name: 'Mãe de Ouro', phrase: 'Seu valor é imenso e seu amor é daqueles que nunca passam despercebidos.' },
  estrela: { name: 'Mãe Estrela', phrase: 'Você nasceu para brilhar e deixar a vida de quem ama ainda mais especial.' }
};

const quizQuestions = [
  {
    id: 1,
    text: 'No dia a dia com sua família, você é mais:',
    options: [
      { text: 'A que organiza tudo com carinho', tags: ['rainha', 'majestosa', 'ouro'] },
      { text: 'A que protege todo mundo', tags: ['fortaleza', 'luz', 'doceAbraco'] },
      { text: 'A que anima qualquer momento', tags: ['estrela', 'encantadora', 'brilhante'] },
      { text: 'A que acolhe e aconselha', tags: ['inspiradora', 'doceAbraco', 'luz'] }
    ]
  },
  {
    id: 2,
    text: 'Em uma comemoração perfeita, você prefere:',
    options: [
      { text: 'Tudo lindo e bem planejado', tags: ['majestosa', 'rainha', 'brilhante'] },
      { text: 'Todo mundo feliz e unido', tags: ['doceAbraco', 'ouro', 'luz'] },
      { text: 'Muita diversão e energia', tags: ['estrela', 'encantadora', 'brilhante'] },
      { text: 'Momentos emocionantes e especiais', tags: ['inspiradora', 'luz', 'majestosa'] }
    ]
  },
  {
    id: 3,
    text: 'Quem é você como mãe?',
    options: [
      { text: 'Forte e determinada', tags: ['fortaleza', 'rainha', 'ouro'] },
      { text: 'Carinhosa e acolhedora', tags: ['doceAbraco', 'encantadora', 'luz'] },
      { text: 'Elegante e cheia de presença', tags: ['majestosa', 'brilhante', 'rainha'] },
      { text: 'Divertida e contagiante', tags: ['estrela', 'encantadora', 'inspiradora'] }
    ]
  }
];

const prizes = [
  'R$300,00 de desconto',
  '10 convidados adicionais',
  '5 convidados adultos + 5 crianças de até 10 anos',
  '20 crianças de 0 a 10 anos',
  '30 crianças de 0 a 8 anos'
];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ campaign: { active: true, updatedAt: null }, participants: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function send(res, statusCode, payload, contentType = 'application/json; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  if (contentType.includes('application/json')) {
    res.end(JSON.stringify(payload));
    return;
  }
  res.end(payload);
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  send(res, 200, fs.readFileSync(filePath), mime[ext] || 'application/octet-stream');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeName(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function normalizeWhatsApp(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  return digits.slice(0, 11);
}

function maskWhatsApp(value = '') {
  const digits = normalizeWhatsApp(value);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function hasRepeatedOrSequentialPattern(text) {
  const lower = text.toLowerCase();
  const compact = lower.replace(/\s/g, '');
  if (/^(.)\1+$/.test(compact)) return true;
  if (/([a-záàâãéèêíìîóòôõúùûç])\1{3,}/i.test(compact)) return true;
  const suspicious = ['teste', 'asdf', 'qwerty', 'abc', 'abcd', 'nome', 'fulano', 'cliente', 'teste/teste', 'aaa', 'bbb'];
  return suspicious.some((item) => lower.includes(item));
}

function validateName(name) {
  const value = normalizeName(name);
  if (!value) return 'Por favor, digite seu nome completo corretamente.';
  if (value.length < 8) return 'Por favor, digite seu nome completo corretamente.';
  if (hasRepeatedOrSequentialPattern(value)) return 'Por favor, digite seu nome completo corretamente.';
  const parts = value.split(' ').filter(Boolean);
  if (parts.length < 2) return 'Por favor, digite seu nome completo corretamente.';
  const invalidPart = parts.some((part) => (!/^(da|de|do|das|dos|e)$/i.test(part) && part.length < 3) || /[^a-záàâãéèêíìîóòôõúùûç'-]/i.test(part));
  if (invalidPart) return 'Por favor, digite seu nome completo corretamente.';
  const shortParts = parts.filter((part) => part.length < 3 && !/^(da|de|do|das|dos|e)$/i.test(part));
  if (shortParts.length) return 'Por favor, digite seu nome completo corretamente.';
  const allSame = parts.every((part) => part.toLowerCase() === parts[0].toLowerCase());
  if (allSame) return 'Por favor, digite seu nome completo corretamente.';
  const uniqueLetters = new Set(value.toLowerCase().replace(/[^a-záàâãéèêíìîóòôõúùûç]/g, ''));
  if (uniqueLetters.size < 4) return 'Por favor, digite seu nome completo corretamente.';
  return null;
}

function validateWhatsApp(whatsapp) {
  const digits = normalizeWhatsApp(whatsapp);
  if (digits.length !== 11) return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  if (digits[2] !== '9') return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  if (/^(\d)\1+$/.test(digits)) return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  if (/9999999|8888888|7777777|6666666|5555555|4444444|3333333|2222222|1111111|0000000/.test(digits.slice(2))) return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  if (/(01234|12345|23456|34567|45678|56789|67890|98765)/.test(digits)) return 'Número de WhatsApp inválido. Verifique e tente novamente.';
  return null;
}

function deriveProfile(answerIndexes) {
  const scores = Object.fromEntries(Object.keys(motherProfiles).map((key) => [key, 0]));
  answerIndexes.forEach((answerIndex, questionIndex) => {
    const option = quizQuestions[questionIndex]?.options?.[answerIndex];
    if (!option) return;
    option.tags.forEach((tag, index) => {
      scores[tag] += 3 - index;
    });
  });
  const [winner] = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return motherProfiles[winner[0]];
}

function isAuthed(req) {
  return (req.headers.authorization || '').replace('Bearer ', '') === ADMIN_TOKEN;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/api/config' && req.method === 'GET') {
      const db = readDb();
      return send(res, 200, {
        campaignActive: db.campaign.active,
        questions: quizQuestions.map((question) => ({
          id: question.id,
          text: question.text,
          options: question.options.map((option) => option.text)
        }))
      });
    }

    if (pathname === '/api/register' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { name, whatsapp } = await readBody(req);
      const nameError = validateName(name);
      if (nameError) return send(res, 400, { error: nameError });
      const whatsappError = validateWhatsApp(whatsapp);
      if (whatsappError) return send(res, 400, { error: whatsappError });

      const normalizedWhatsapp = normalizeWhatsApp(whatsapp);
      const existing = db.participants.find((item) => item.whatsapp === normalizedWhatsapp);
      if (existing) return send(res, 409, { error: 'Esse WhatsApp já participou da campanha.' });

      const participant = {
        id: crypto.randomUUID(),
        name: normalizeName(name),
        whatsapp: normalizedWhatsapp,
        whatsappMasked: maskWhatsApp(normalizedWhatsapp),
        answers: [],
        profileName: null,
        profilePhrase: null,
        prize: null,
        status: 'Participou',
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      db.participants.push(participant);
      writeDb(db);
      return send(res, 200, {
        participantId: participant.id,
        name: participant.name,
        whatsappMasked: participant.whatsappMasked
      });
    }

    if (pathname === '/api/complete-quiz' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { participantId, answers } = await readBody(req);
      const participant = db.participants.find((item) => item.id === participantId);
      if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      if (!Array.isArray(answers) || answers.length !== 3) return send(res, 400, { error: 'Responda as três perguntas.' });
      if (participant.profileName) return send(res, 200, { profileName: participant.profileName, profilePhrase: participant.profilePhrase });
      const invalid = answers.some((answer, index) => typeof answer !== 'number' || answer < 0 || answer > quizQuestions[index].options.length - 1);
      if (invalid) return send(res, 400, { error: 'Respostas inválidas.' });
      const profile = deriveProfile(answers);
      participant.answers = answers;
      participant.profileName = profile.name;
      participant.profilePhrase = profile.phrase;
      writeDb(db);
      return send(res, 200, { profileName: profile.name, profilePhrase: profile.phrase });
    }

    if (pathname === '/api/claim-prize' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { participantId, boxIndex } = await readBody(req);
      const participant = db.participants.find((item) => item.id === participantId);
      if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      if (!participant.profileName) return send(res, 400, { error: 'Finalize o quiz primeiro.' });
      if (participant.prize) return send(res, 200, { prize: participant.prize, completedAt: participant.completedAt });
      if (![0, 1, 2].includes(boxIndex)) return send(res, 400, { error: 'Caixa inválida.' });

      const seed = participant.whatsapp.split('').reduce((sum, digit) => sum + Number(digit), 0) + participant.name.length + boxIndex * 11;
      participant.prize = prizes[seed % prizes.length];
      participant.completedAt = new Date().toISOString();
      writeDb(db);
      return send(res, 200, { prize: participant.prize, completedAt: participant.completedAt });
    }

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      if (username === ADMIN_USER && password === ADMIN_PASS) return send(res, 200, { token: ADMIN_TOKEN });
      return send(res, 401, { error: 'Usuário ou senha inválidos.' });
    }

    if (pathname === '/api/admin/participants' && req.method === 'GET') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb();
      return send(res, 200, {
        campaign: db.campaign,
        participants: db.participants.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      });
    }

    if (pathname === '/api/admin/campaign' && req.method === 'PATCH') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb();
      const body = await readBody(req);
      db.campaign.active = !!body.active;
      db.campaign.updatedAt = new Date().toISOString();
      writeDb(db);
      return send(res, 200, { campaign: db.campaign });
    }

    if (pathname.startsWith('/api/admin/participant/') && req.method === 'PATCH') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb();
      const id = pathname.split('/').pop();
      const participant = db.participants.find((item) => item.id === id);
      if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      const { status } = await readBody(req);
      const allowed = ['Participou', 'Entrou em contato', 'Convertido', 'Excluído'];
      if (allowed.includes(status)) participant.status = status;
      writeDb(db);
      return send(res, 200, { participant });
    }

    if (pathname.startsWith('/api/admin/participant/') && req.method === 'DELETE') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb();
      const id = pathname.split('/').pop();
      const index = db.participants.findIndex((item) => item.id === id);
      if (index === -1) return send(res, 404, { error: 'Cadastro não encontrado.' });
      db.participants.splice(index, 1);
      writeDb(db);
      return send(res, 200, { ok: true });
    }

    if (pathname === '/admin') return serveFile(res, path.join(publicDir, 'admin.html'));

    const filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(publicDir)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);
    return serveFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`Biruta Mães rodando em http://localhost:${PORT}`);
});
