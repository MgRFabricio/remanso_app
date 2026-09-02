const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { db, run, all } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET || 'remanso-secret-local';

function isValidDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

const mockState = {
  idosos: [
    { id: 1, nome: 'Maria Silva', idade: 78, responsavel: 'João Silva', contato: '(65) 99999-1111', presenca: true },
    { id: 2, nome: 'Antônio Santos', idade: 82, responsavel: 'Ana Santos', contato: '(65) 99999-2222', presenca: false },
  ],
  checklists: [
    { id: 1, tipo: 'diario', item: 'Verificação de Sinais Vitais', status: 'OK', observacao: '' },
    { id: 2, tipo: 'diario', item: 'Higienização dos Ambientes', status: 'NaoConforme', observacao: 'Piso escorregadio na sala 2' },
  ],
  avisos: [
    { id: 1, origem: 'Checklist Diário', descricao: 'Piso escorregadio na sala 2', data: '2026-08-28', resolvido: false },
  ],
};

const localUsers = [
  { id: 1, nome: 'Administrador Remanso', username: 'admin', senha: 'remanso123', perfil: 'Administrador' },
  { id: 2, nome: 'Operador de Acompanhamento', username: 'operador', senha: 'remanso123', perfil: 'Operador' },
];

const localUsuarios = [...localUsers];
const localIdosos = [
  { id: 1, nome: 'Maria Silva', dataNascimento: '1946-05-15', sexo: 'Feminino', cpf: '123.456.789-10', celularPessoal: '(65) 99999-0001', endereco: { logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'Cáceres', uf: 'MT', pontoReferencia: 'Perto da praça' }, emergencia: { nome: 'João Silva', vinculo: 'Filho', celular: '(65) 99999-1111' }, presenca: true },
  { id: 2, nome: 'Antônio Santos', dataNascimento: '1942-03-20', sexo: 'Masculino', cpf: '987.654.321-00', celularPessoal: '(65) 99999-0002', endereco: { logradouro: 'Avenida Principal', numero: '456', bairro: 'Jardim', cidade: 'Cáceres', uf: 'MT', pontoReferencia: 'Próximo ao banco' }, emergencia: { nome: 'Ana Santos', vinculo: 'Filha', celular: '(65) 99999-2222' }, presenca: false },
];

async function queryDb(sql, params = []) {
  try {
    const normalized = String(sql).trim();
    if (/RETURNING\b/i.test(normalized) || /^SELECT\b/i.test(normalized)) {
      const rows = await all(normalized, params);
      return { rows, rowCount: rows.length };
    }

    if (/^(INSERT|UPDATE|DELETE)\b/i.test(normalized)) {
      const result = await run(normalized, params);
      return { rows: [], rowCount: result.changes, ...result };
    }

    const rows = await all(normalized, params);
    return { rows, rowCount: rows.length };
  } catch (error) {
    console.error('DB query failed:', error.message);
    return null;
  }
}

function buildToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, perfil: user.perfil, nome: user.nome },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token ausente.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.perfil !== 'Administrador') {
    return res.status(403).json({ message: 'Apenas administradores podem excluir cadastros.' });
  }
  return next();
}

app.get('/api/status', async (req, res) => {
  const dbResult = await queryDb('SELECT 1 AS ok');
  res.json({
    status: 'API Remanso Online',
    data: new Date().toISOString(),
    database: dbResult ? 'sqlite' : 'fallback-memory',
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUser = (username || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');

  const dbResult = await queryDb(
    `SELECT u.id, u.nome, u.username, u.senha, p.nome AS perfil
     FROM usuarios u
     LEFT JOIN perfis p ON p.id = u.perfil_id
     WHERE LOWER(u.username) = ? AND u.senha = ?`,
    [normalizedUser, normalizedPassword]
  );

  if (dbResult && dbResult.rows.length > 0) {
    const user = dbResult.rows[0];
    const token = buildToken(user);
    return res.json({ token, user: { id: user.id, nome: user.nome, username: user.username, perfil: user.perfil } });
  }

  const fallbackUser = localUsers.find((user) => user.username.toLowerCase() === normalizedUser && user.senha === normalizedPassword);
  if (fallbackUser) {
    const token = buildToken(fallbackUser);
    return res.json({ token, user: { id: fallbackUser.id, nome: fallbackUser.nome, username: fallbackUser.username, perfil: fallbackUser.perfil } });
  }

  return res.status(401).json({ message: 'Credenciais inválidas.' });
});

app.get('/api/perfis', async (req, res) => {
  const result = await queryDb('SELECT * FROM perfis ORDER BY id ASC');
  if (result && result.rows.length > 0) {
    return res.json(result.rows);
  }

  return res.json([
    { id: 1, nome: 'Administrador', descricao: 'Acesso completo ao sistema' },
    { id: 2, nome: 'Operador', descricao: 'Acesso operacional com supervisão' },
    { id: 3, nome: 'Atendimento', descricao: 'Acesso restrito para atendimento e registros' },
  ]);
});

app.get('/api/usuarios', authMiddleware, async (req, res) => {
  const result = await queryDb(
    `SELECT u.id, u.nome, u.username, u.senha, p.nome AS perfil, u.status
     FROM usuarios u
     LEFT JOIN perfis p ON p.id = u.perfil_id
     ORDER BY u.nome COLLATE NOCASE ASC`
  );

  if (result && result.rows.length > 0) {
    return res.json(result.rows);
  }

  return res.json(localUsuarios);
});

app.post('/api/usuarios', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const nome = String(payload.nome || '').trim();
  const username = String(payload.username || '').trim();
  const senha = String(payload.senha || '');
  const perfil = String(payload.perfil || 'Operador');
  const status = String(payload.status || 'Ativo');

  if (!nome || !username || !senha) {
    return res.status(400).json({ message: 'Nome, usuário e senha são obrigatórios.' });
  }

  const perfilResult = await queryDb('SELECT id FROM perfis WHERE LOWER(nome) = LOWER(?)', [perfil]);
  const perfilId = perfilResult && perfilResult.rows[0] ? perfilResult.rows[0].id : 2;

  const result = await queryDb(
    `INSERT INTO usuarios (nome, username, senha, perfil_id, status)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, nome, username, senha, status`,
    [nome, username, senha, perfilId, status]
  );

  if (result && result.rows.length > 0) {
    const row = result.rows[0];
    return res.status(201).json({ ...row, perfil });
  }

  const novo = { id: Date.now(), nome, username, senha, perfil, status };
  localUsuarios.push(novo);
  return res.status(201).json(novo);
});

app.put('/api/usuarios/:id/reset-senha', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { novaSenha } = req.body || {};
  const senha = String(novaSenha || '').trim();

  if (!senha) {
    return res.status(400).json({ message: 'Informe a nova senha.' });
  }

  const result = await queryDb(
    'UPDATE usuarios SET senha = ? WHERE id = ? RETURNING id, username',
    [senha, Number(id)]
  );

  if (result && result.rows.length > 0) {
    return res.json({ message: 'Senha atualizada com sucesso.' });
  }

  const index = localUsuarios.findIndex((usuario) => String(usuario.id) === String(id));
  if (index >= 0) {
    localUsuarios[index].senha = senha;
    return res.json({ message: 'Senha atualizada com sucesso.' });
  }

  return res.status(404).json({ message: 'Usuário não encontrado.' });
});

app.get('/api/idosos', authMiddleware, async (req, res) => {
  const result = await queryDb('SELECT * FROM idosos ORDER BY nome_completo COLLATE NOCASE ASC');
  if (result && result.rows.length > 0) {
    return res.json(result.rows.map((row) => ({
      id: row.id,
      nome: row.nome_completo,
      dataNascimento: row.data_nascimento,
      sexo: row.sexo,
      cpf: row.cpf,
      celularPessoal: row.celular_pessoal,
      endereco: {
        logradouro: row.endereco_logradouro,
        numero: row.endereco_numero,
        bairro: row.endereco_bairro,
        cidade: row.endereco_cidade,
        uf: row.endereco_uf,
        pontoReferencia: row.endereco_referencia,
      },
      emergencia: {
        nome: row.contato_emergencia_nome,
        vinculo: row.contato_emergencia_vinculo,
        celular: row.contato_emergencia_celular,
      },
      presenca: row.presenca,
    })) );
  }
  return res.json(localIdosos);
});

app.post('/api/idosos', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const result = await queryDb(
    `INSERT INTO idosos (
      nome_completo, data_nascimento, sexo, cpf, celular_pessoal,
      endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade,
      endereco_uf, endereco_referencia, contato_emergencia_nome,
      contato_emergencia_vinculo, contato_emergencia_celular, presenca
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`,
    [
      payload.nome || payload.nome_completo || '',
      payload.dataNascimento || null,
      payload.sexo || null,
      payload.cpf || null,
      payload.celularPessoal || null,
      payload.endereco?.logradouro || null,
      payload.endereco?.numero || null,
      payload.endereco?.bairro || null,
      payload.endereco?.cidade || null,
      payload.endereco?.uf || null,
      payload.endereco?.pontoReferencia || null,
      payload.emergencia?.nome || null,
      payload.emergencia?.vinculo || null,
      payload.emergencia?.celular || null,
      payload.presenca ?? false,
    ]
  );

  if (result && result.rows.length > 0) {
    const row = result.rows[0];
    return res.status(201).json({
      id: row.id,
      nome: row.nome_completo,
      dataNascimento: row.data_nascimento,
      sexo: row.sexo,
      cpf: row.cpf,
      celularPessoal: row.celular_pessoal,
      endereco: {
        logradouro: row.endereco_logradouro,
        numero: row.endereco_numero,
        bairro: row.endereco_bairro,
        cidade: row.endereco_cidade,
        uf: row.endereco_uf,
        pontoReferencia: row.endereco_referencia,
      },
      emergencia: {
        nome: row.contato_emergencia_nome,
        vinculo: row.contato_emergencia_vinculo,
        celular: row.contato_emergencia_celular,
      },
      presenca: row.presenca,
    });
  }

  const novo = {
    id: Date.now(),
    nome: payload.nome || payload.nome_completo || '',
    dataNascimento: payload.dataNascimento || '',
    sexo: payload.sexo || 'Masculino',
    cpf: payload.cpf || '',
    celularPessoal: payload.celularPessoal || '',
    endereco: payload.endereco || {},
    emergencia: payload.emergencia || {},
    presenca: payload.presenca ?? false,
  };
  localIdosos.push(novo);
  return res.status(201).json(novo);
});

app.put('/api/idosos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};

  const result = await queryDb(
    `UPDATE idosos
     SET nome_completo = ?, data_nascimento = ?, sexo = ?, cpf = ?, celular_pessoal = ?,
         endereco_logradouro = ?, endereco_numero = ?, endereco_bairro = ?, endereco_cidade = ?,
         endereco_uf = ?, endereco_referencia = ?, contato_emergencia_nome = ?,
         contato_emergencia_vinculo = ?, contato_emergencia_celular = ?, presenca = ?
     WHERE id = ? RETURNING *`,
    [
      payload.nome || payload.nome_completo || '',
      payload.dataNascimento || null,
      payload.sexo || null,
      payload.cpf || null,
      payload.celularPessoal || null,
      payload.endereco?.logradouro || null,
      payload.endereco?.numero || null,
      payload.endereco?.bairro || null,
      payload.endereco?.cidade || null,
      payload.endereco?.uf || null,
      payload.endereco?.pontoReferencia || null,
      payload.emergencia?.nome || null,
      payload.emergencia?.vinculo || null,
      payload.emergencia?.celular || null,
      payload.presenca ?? false,
      Number(id),
    ]
  );

  if (result && result.rows.length > 0) {
    return res.json({ message: 'Idoso atualizado com sucesso.' });
  }

  const index = localIdosos.findIndex((idoso) => String(idoso.id) === String(id));
  if (index >= 0) {
    localIdosos[index] = { ...localIdosos[index], ...payload, id: Number(id) };
    return res.json({ message: 'Idoso atualizado com sucesso.' });
  }

  return res.status(404).json({ message: 'Idoso não encontrado.' });
});

app.delete('/api/idosos/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const result = await queryDb('DELETE FROM idosos WHERE id = ?', [Number(id)]);

  if (result || result === null) {
    const index = localIdosos.findIndex((idoso) => String(idoso.id) === String(id));
    if (index >= 0) localIdosos.splice(index, 1);
    return res.json({ message: 'Idoso removido com sucesso.' });
  }

  return res.status(404).json({ message: 'Idoso não encontrado.' });
});

app.get('/api/atividades', authMiddleware, async (req, res) => {
  const result = await queryDb(
    `SELECT a.id, a.nome, a.tipo, a.data_realizacao AS data, a.horario,
            a.local_execucao AS local, a.descricao,
            GROUP_CONCAT(CASE WHEN ap.presente = 1 THEN ap.idoso_id END) AS presentes
     FROM atividades a
     LEFT JOIN atividade_presencas ap ON ap.atividade_id = a.id
     GROUP BY a.id
     ORDER BY a.id DESC`
  );

  if (result) {
    return res.json(result.rows.map((row) => ({
      ...row,
      presentes: row.presentes
        ? String(row.presentes).split(',').map((id) => Number(id))
        : [],
    })));
  }

  return res.json([]);
});

app.post('/api/atividades', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const nome = String(payload.nome || '').trim();
  const tipo = String(payload.tipo || 'Diária');
  const data = String(payload.data || '');
  const horario = String(payload.horario || '');
  const local = String(payload.local || '').trim();
  const descricao = String(payload.descricao || '').trim();

  if (!nome || !data || !horario) {
    return res.status(400).json({ message: 'Nome, data e horário são obrigatórios.' });
  }
  if (!isValidDateOnly(data)) {
    return res.status(400).json({ message: 'A data da atividade deve ser válida no formato AAAA-MM-DD.' });
  }

  const result = await queryDb(
    `INSERT INTO atividades (nome, tipo, data_realizacao, horario, local_execucao, descricao)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id, nome, tipo, data_realizacao AS data,
     horario, local_execucao AS local, descricao`,
    [nome, tipo, data, horario, local, descricao]
  );

  if (!result || result.rows.length === 0) {
    return res.status(500).json({ message: 'Não foi possível salvar a atividade.' });
  }

  return res.status(201).json({ ...result.rows[0], presentes: [] });
});

app.put('/api/atividades/:id', authMiddleware, async (req, res) => {
  const atividadeId = Number(req.params.id);
  const payload = req.body || {};
  const nome = String(payload.nome || '').trim();
  const tipo = String(payload.tipo || 'Diária');
  const data = String(payload.data || '');
  const horario = String(payload.horario || '');
  const local = String(payload.local || '').trim();
  const descricao = String(payload.descricao || '').trim();

  if (!Number.isInteger(atividadeId) || !nome || !data || !horario) {
    return res.status(400).json({ message: 'Nome, data e horário são obrigatórios.' });
  }
  if (!isValidDateOnly(data)) {
    return res.status(400).json({ message: 'A data da atividade deve ser válida no formato AAAA-MM-DD.' });
  }

  const result = await queryDb(
    `UPDATE atividades
     SET nome = ?, tipo = ?, data_realizacao = ?, horario = ?, local_execucao = ?, descricao = ?
     WHERE id = ?
     RETURNING id, nome, tipo, data_realizacao AS data, horario, local_execucao AS local, descricao`,
    [nome, tipo, data, horario, local, descricao, atividadeId]
  );

  if (!result || result.rows.length === 0) {
    return res.status(404).json({ message: 'Atividade não encontrada.' });
  }

  const presencas = await queryDb(
    'SELECT idoso_id FROM atividade_presencas WHERE atividade_id = ? AND presente = 1',
    [atividadeId]
  );

  return res.json({
    ...result.rows[0],
    presentes: presencas ? presencas.rows.map((row) => Number(row.idoso_id)) : [],
  });
});

app.delete('/api/atividades/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const atividadeId = Number(req.params.id);
  if (!Number.isInteger(atividadeId)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }

  const result = await queryDb('DELETE FROM atividades WHERE id = ?', [atividadeId]);
  if (!result || result.changes === 0) {
    return res.status(404).json({ message: 'Atividade não encontrada.' });
  }

  return res.json({ message: 'Atividade removida com sucesso.' });
});

app.put('/api/atividades/:id/presenca/:idosoId', authMiddleware, async (req, res) => {
  const atividadeId = Number(req.params.id);
  const idosoId = Number(req.params.idosoId);
  const presente = Boolean(req.body?.presente);

  if (!Number.isInteger(atividadeId) || !Number.isInteger(idosoId)) {
    return res.status(400).json({ message: 'Identificadores inválidos.' });
  }

  const result = await queryDb(
    `INSERT INTO atividade_presencas (atividade_id, idoso_id, presente)
     VALUES (?, ?, ?)
     ON CONFLICT (atividade_id, idoso_id) DO UPDATE SET presente = excluded.presente`,
    [atividadeId, idosoId, presente ? 1 : 0]
  );

  if (!result) {
    return res.status(500).json({ message: 'Não foi possível salvar a presença.' });
  }

  return res.json({ atividadeId, idosoId, presente });
});

app.get('/api/checklists', authMiddleware, async (req, res) => {
  const result = await queryDb('SELECT * FROM checklists ORDER BY id ASC');
  if (result && result.rows.length > 0) {
    return res.json(result.rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      item: row.item_descricao,
      status: row.status,
      observacao: row.observacao || '',
    })));
  }
  return res.json(mockState.checklists);
});

app.post('/api/checklists', authMiddleware, async (req, res) => {
  const { tipo, item, status, observacao } = req.body || {};

  if (status === 'NaoConforme' && !observacao) {
    return res.status(400).json({ error: 'Observação é obrigatória para não conformidades.' });
  }

  const result = await queryDb(
    'INSERT INTO checklists (tipo, item_descricao, status, observacao) VALUES (?,?,?,?) RETURNING *',
    [tipo, item, status, observacao || '']
  );

  if (result && result.rows.length > 0) {
    const row = result.rows[0];
    if (status === 'NaoConforme') {
      await queryDb(
        'INSERT INTO avisos (origem, descricao, data_aviso, resolvido) VALUES (?,?,?,?)',
        [`Checklist (${tipo})`, `${item}: ${observacao}`, new Date().toISOString().split('T')[0], false]
      );
    }
    return res.status(201).json({
      id: row.id,
      tipo: row.tipo,
      item: row.item_descricao,
      status: row.status,
      observacao: row.observacao || '',
    });
  }

  const novoCheck = { id: Date.now(), tipo, item, status, observacao };
  mockState.checklists.push(novoCheck);

  if (status === 'NaoConforme') {
    mockState.avisos.push({
      id: Date.now() + 1,
      origem: `Checklist (${tipo})`,
      descricao: `${item}: ${observacao}`,
      data: new Date().toISOString().split('T')[0],
      resolvido: false,
    });
  }

  return res.status(201).json(novoCheck);
});

app.get('/api/avisos', authMiddleware, async (req, res) => {
  const result = await queryDb('SELECT id, origem, descricao, data_aviso AS data, resolvido, criado_em FROM avisos ORDER BY id DESC');
  if (result && result.rows.length > 0) {
    return res.json(result.rows);
  }
  return res.json(mockState.avisos);
});

app.get('/api/registros-saude', authMiddleware, async (req, res) => {
  const result = await queryDb(
    `SELECT id, idoso_id, data_registro AS data, pressao_arterial AS pressao,
            frequencia_cardiaca AS frequenciaCardiaca, peso, altura, notas
     FROM registros_saude
     ORDER BY data_registro DESC, id DESC`
  );
  return res.json(result ? result.rows : []);
});

app.post('/api/registros-saude', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const idosoId = Number(payload.idoso_id);
  const data = String(payload.data || '');
  const pressao = String(payload.pressao || '').trim();
  const notas = String(payload.notas || '').trim();
  const frequenciaCardiaca = payload.frequenciaCardiaca === '' ? null : Number(payload.frequenciaCardiaca);
  const peso = payload.peso === '' ? null : Number(payload.peso);
  const altura = payload.altura === '' ? null : Number(payload.altura);

  if (!Number.isInteger(idosoId) || !isValidDateOnly(data)) {
    return res.status(400).json({ message: 'Idoso e data válida são obrigatórios.' });
  }
  if (
    (frequenciaCardiaca !== null && !Number.isFinite(frequenciaCardiaca))
    || (peso !== null && !Number.isFinite(peso))
    || (altura !== null && !Number.isFinite(altura))
  ) {
    return res.status(400).json({ message: 'Os valores de saúde devem ser numéricos.' });
  }

  const result = await queryDb(
    `INSERT INTO registros_saude
      (idoso_id, data_registro, pressao_arterial, frequencia_cardiaca, peso, altura, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id, idoso_id, data_registro AS data, pressao_arterial AS pressao,
               frequencia_cardiaca AS frequenciaCardiaca, peso, altura, notas`,
    [idosoId, data, pressao, frequenciaCardiaca, peso, altura, notas]
  );

  if (!result || result.rows.length === 0) {
    return res.status(500).json({ message: 'Não foi possível salvar o registro de saúde.' });
  }
  return res.status(201).json(result.rows[0]);
});

app.post('/api/avisos', authMiddleware, async (req, res) => {
  const payload = req.body || {};
  const origem = String(payload.origem || '').trim();
  const descricao = String(payload.descricao || '').trim();
  const data = String(payload.data || '');
  const resolvido = Boolean(payload.resolvido);

  if (!origem || !descricao || !isValidDateOnly(data)) {
    return res.status(400).json({ message: 'Origem, descrição e uma data válida são obrigatórias.' });
  }

  const result = await queryDb(
    `INSERT INTO avisos (origem, descricao, data_aviso, resolvido)
     VALUES (?, ?, ?, ?) RETURNING id, origem, descricao, data_aviso AS data, resolvido, criado_em`,
    [origem, descricao, data, resolvido]
  );

  if (result && result.rows.length > 0) {
    return res.status(201).json(result.rows[0]);
  }

  const aviso = { id: Date.now(), origem, descricao, data, resolvido };
  mockState.avisos.unshift(aviso);
  return res.status(201).json(aviso);
});

app.put('/api/avisos/:id', authMiddleware, async (req, res) => {
  const avisoId = Number(req.params.id);
  const payload = req.body || {};
  const origem = String(payload.origem || '').trim();
  const descricao = String(payload.descricao || '').trim();
  const data = String(payload.data || '');
  const resolvido = Boolean(payload.resolvido);

  if (!Number.isInteger(avisoId) || !origem || !descricao || !isValidDateOnly(data)) {
    return res.status(400).json({ message: 'Origem, descrição e uma data válida são obrigatórias.' });
  }

  const result = await queryDb(
    `UPDATE avisos
     SET origem = ?, descricao = ?, data_aviso = ?, resolvido = ?
     WHERE id = ?
     RETURNING id, origem, descricao, data_aviso AS data, resolvido, criado_em`,
    [origem, descricao, data, resolvido, avisoId]
  );

  if (result && result.rows.length > 0) {
    return res.json(result.rows[0]);
  }

  const aviso = mockState.avisos.find((item) => Number(item.id) === avisoId);
  if (aviso) {
    Object.assign(aviso, { origem, descricao, data, resolvido });
    return res.json(aviso);
  }

  return res.status(404).json({ message: 'Aviso não encontrado.' });
});

const PORT = Number(process.env.PORT || 3002);
app.listen(PORT, () => {
  console.log(`[Remanso API] Servidor rodando na porta ${PORT}`);
});
