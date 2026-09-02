PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS perfis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modulos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS perfil_modulos (
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, modulo_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  perfil_id INTEGER REFERENCES perfis(id),
  status TEXT NOT NULL DEFAULT 'Ativo',
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS idosos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_completo TEXT NOT NULL,
  data_nascimento TEXT,
  sexo TEXT,
  cpf TEXT,
  celular_pessoal TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_uf TEXT,
  endereco_referencia TEXT,
  contato_emergencia_nome TEXT,
  contato_emergencia_vinculo TEXT,
  contato_emergencia_celular TEXT,
  presenca BOOLEAN NOT NULL DEFAULT false,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data_realizacao TEXT NOT NULL,
  horario TEXT NOT NULL,
  local_execucao TEXT,
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atividade_presencas (
  atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  idoso_id INTEGER NOT NULL REFERENCES idosos(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (atividade_id, idoso_id)
);

CREATE TABLE IF NOT EXISTS registros_saude (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idoso_id INTEGER NOT NULL REFERENCES idosos(id) ON DELETE CASCADE,
  data_registro TEXT NOT NULL,
  pressao_arterial TEXT,
  frequencia_cardiaca INTEGER,
  peso REAL,
  altura REAL,
  notas TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origem TEXT,
  descricao TEXT NOT NULL,
  data_aviso TEXT NOT NULL DEFAULT CURRENT_DATE,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  item_descricao TEXT NOT NULL,
  status TEXT NOT NULL,
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
