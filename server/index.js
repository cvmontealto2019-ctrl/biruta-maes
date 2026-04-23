import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataFile = path.join(rootDir, 'data', 'participants.json');
const publicDir = path.join(rootDir, 'public');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'biruta';
const ADMIN_PASS = process.env.ADMIN_PASS || 'biruta@2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.createHash('sha256').update(`${ADMIN_USER}:${ADMIN_PASS}`).digest('hex');

function send(res, status, data, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(contentType.includes('application/json') ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function readDb() {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify({ campaign: { active: true, updatedAt: null }, participants: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}
function writeDb(db) { fs.writeFileSync(dataFile, JSON.stringify(db, null, 2)); }
function normalizeWhatsApp(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 11) return digits;
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2);
  return digits;
}
function maskWhatsApp(digits) {
  const d = normalizeWhatsApp(digits);
  if (d.length !== 11) return digits;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function hasTooManyRepeats(str) { return /(.)\1{3,}/i.test(str); }
function validateName(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'Informe seu nome completo.';
  const parts = clean.split(' ');
  if (parts.length < 2) return 'Digite nome e sobrenome.';
  if (clean.length < 8) return 'Digite um nome completo válido.';
  const forbidden = ['teste', 'abc', 'asdf', 'qwerty', 'nome', 'na na na', 'aaaa', 'xxxxx', 'fulano'];
  if (forbidden.some(f => clean.toLowerCase().includes(f))) return 'Digite um nome real para continuar.';
  if (hasTooManyRepeats(clean.replace(/\s/g, ''))) return 'Digite um nome real para continuar.';
  const vowelCount = (clean.match(/[aeiouáéíóúâêôãõ]/gi) || []).length;
  if (vowelCount < 3) return 'Digite um nome real para continuar.';
  for (const p of parts) if (p.length < 2) return 'Digite nome e sobrenome.';
  return null;
}
function validateWhatsApp(raw) {
  const digits = normalizeWhatsApp(raw);
  if (digits.length !== 11) return 'Digite um WhatsApp válido com DDD.';
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return 'DDD inválido.';
  if (digits[2] !== '9') return 'O número precisa ser um celular com 9.';
  const numberPart = digits.slice(2);
  const badPatterns = ['123456789', '987654321', '999999999', '000000000', '111111111', '222222222', '333333333'];
  if (badPatterns.includes(numberPart) || /^(\d)\1+$/.test(numberPart)) return 'Digite um WhatsApp real para continuar.';
  return null;
}

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
  { id: 1, text: 'No dia a dia com sua família, você é mais:', options: [
    { text: 'A que organiza tudo com carinho', tags: ['rainha', 'majestosa', 'ouro'] },
    { text: 'A que protege todo mundo', tags: ['fortaleza', 'luz', 'doceAbraco'] },
    { text: 'A que anima qualquer momento', tags: ['estrela', 'encantadora', 'brilhante'] },
    { text: 'A que acolhe e aconselha', tags: ['inspiradora', 'doceAbraco', 'luz'] } ] },
  { id: 2, text: 'Em uma comemoração perfeita, você prefere:', options: [
    { text: 'Tudo lindo e bem planejado', tags: ['majestosa', 'rainha', 'brilhante'] },
    { text: 'Todo mundo feliz e unido', tags: ['doceAbraco', 'ouro', 'luz'] },
    { text: 'Muita diversão e energia', tags: ['estrela', 'encantadora', 'brilhante'] },
    { text: 'Momentos emocionantes e especiais', tags: ['inspiradora', 'luz', 'majestosa'] } ] },
  { id: 3, text: 'Quem é você como mãe?', options: [
    { text: 'Forte e determinada', tags: ['fortaleza', 'rainha', 'ouro'] },
    { text: 'Carinhosa e acolhedora', tags: ['doceAbraco', 'encantadora', 'luz'] },
    { text: 'Elegante e cheia de presença', tags: ['majestosa', 'brilhante', 'rainha'] },
    { text: 'Divertida e contagiante', tags: ['estrela', 'encantadora', 'inspiradora'] } ] }
];
const prizes = ['R$300,00 de desconto', '10 convidados adicionais', '10 convidados + 5 crianças de até 10 anos', '25 crianças de 0 a 10 anos'];
function deriveProfile(answerIndexes) {
  const scores = Object.fromEntries(Object.keys(motherProfiles).map(k => [k, 0]));
  answerIndexes.forEach((answerIndex, qIndex) => {
    const option = quizQuestions[qIndex]?.options?.[answerIndex];
    if (!option) return;
    option.tags.forEach((tag, i) => { scores[tag] += 3 - i; });
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return motherProfiles[sorted[0][0]];
}
function isAuthed(req) { return (req.headers.authorization || '').replace('Bearer ', '') === ADMIN_TOKEN; }

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

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) return send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
  const ext = path.extname(filePath).toLowerCase();
  send(res, 200, fs.readFileSync(filePath), mime[ext] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/api/config' && req.method === 'GET') {
      const db = readDb();
      return send(res, 200, { campaignActive: db.campaign.active, questions: quizQuestions.map(q => ({ id: q.id, text: q.text, options: q.options.map(o => o.text) })), prizes });
    }
    if (pathname === '/api/register' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { name, whatsapp } = await readBody(req);
      const nameError = validateName(name); if (nameError) return send(res, 400, { error: nameError });
      const whatsappError = validateWhatsApp(whatsapp); if (whatsappError) return send(res, 400, { error: whatsappError });
      const normalized = normalizeWhatsApp(whatsapp);
      const existing = db.participants.find(p => p.whatsapp === normalized);
      if (existing) return send(res, 409, { error: 'Esse WhatsApp já participou da campanha.', participant: { name: existing.name, profileName: existing.profileName, prize: existing.prize, completedAt: existing.completedAt } });
      const id = crypto.randomUUID();
      const participant = { id, name: String(name).trim().replace(/\s+/g, ' '), whatsapp: normalized, whatsappMasked: maskWhatsApp(normalized), answers: [], profileName: null, profilePhrase: null, prize: null, status: 'Participou', completedAt: null, createdAt: new Date().toISOString() };
      db.participants.push(participant); writeDb(db);
      return send(res, 200, { participantId: id, name: participant.name, whatsappMasked: participant.whatsappMasked });
    }
    if (pathname === '/api/complete-quiz' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { participantId, answers } = await readBody(req);
      const participant = db.participants.find(p => p.id === participantId);
      if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      if (!Array.isArray(answers) || answers.length !== 3) return send(res, 400, { error: 'Responda as três perguntas.' });
      if (participant.profileName) return send(res, 200, { profileName: participant.profileName, profilePhrase: participant.profilePhrase });
      const invalid = answers.some((a, i) => typeof a !== 'number' || a < 0 || a > quizQuestions[i].options.length - 1);
      if (invalid) return send(res, 400, { error: 'Respostas inválidas.' });
      const profile = deriveProfile(answers);
      participant.answers = answers; participant.profileName = profile.name; participant.profilePhrase = profile.phrase; writeDb(db);
      return send(res, 200, { profileName: profile.name, profilePhrase: profile.phrase });
    }
    if (pathname === '/api/claim-prize' && req.method === 'POST') {
      const db = readDb();
      if (!db.campaign.active) return send(res, 403, { error: 'A campanha foi encerrada.' });
      const { participantId, boxIndex } = await readBody(req);
      const participant = db.participants.find(p => p.id === participantId);
      if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      if (!participant.profileName) return send(res, 400, { error: 'Finalize o quiz primeiro.' });
      if (participant.prize) return send(res, 200, { prize: participant.prize, completedAt: participant.completedAt });
      if (![0, 1, 2].includes(boxIndex)) return send(res, 400, { error: 'Caixa inválida.' });
      const seed = participant.whatsapp.split('').reduce((acc, n) => acc + Number(n), 0) + boxIndex * 7 + participant.name.length;
      const prize = prizes[seed % prizes.length];
      participant.prize = prize; participant.completedAt = new Date().toISOString(); writeDb(db);
      return send(res, 200, { prize, completedAt: participant.completedAt });
    }
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      if (username === ADMIN_USER && password === ADMIN_PASS) return send(res, 200, { token: ADMIN_TOKEN });
      return send(res, 401, { error: 'Usuário ou senha inválidos.' });
    }
    if (pathname === '/api/admin/participants' && req.method === 'GET') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb();
      return send(res, 200, { campaign: db.campaign, participants: db.participants.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
    }
    if (pathname === '/api/admin/campaign' && req.method === 'PATCH') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb(); const body = await readBody(req); db.campaign.active = !!body.active; db.campaign.updatedAt = new Date().toISOString(); writeDb(db);
      return send(res, 200, { campaign: db.campaign });
    }
    if (pathname.startsWith('/api/admin/participant/') && req.method === 'PATCH') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb(); const id = pathname.split('/').pop(); const participant = db.participants.find(p => p.id === id); if (!participant) return send(res, 404, { error: 'Cadastro não encontrado.' });
      const { status } = await readBody(req); const allowed = ['Participou', 'Entrou em contato', 'Convertido', 'Excluído']; if (status && allowed.includes(status)) participant.status = status; writeDb(db);
      return send(res, 200, { participant });
    }
    if (pathname.startsWith('/api/admin/participant/') && req.method === 'DELETE') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Não autorizado.' });
      const db = readDb(); const id = pathname.split('/').pop(); const index = db.participants.findIndex(p => p.id === id); if (index === -1) return send(res, 404, { error: 'Cadastro não encontrado.' });
      db.participants.splice(index, 1); writeDb(db); return send(res, 200, { ok: true });
    }

    if (pathname === '/admin') return serveFile(res, path.join(publicDir, 'admin.html'));

    let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(publicDir)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);
    return serveFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => console.log(`Biruta Mães rodando em http://localhost:${PORT}`));
