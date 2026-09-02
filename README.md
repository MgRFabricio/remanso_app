# Sistema Remanso - MVP

Projeto de acompanhamento e gerenciamento do Remanso Fraterno, com estrutura local para desenvolvimento e operação do sistema em Windows + Node.js + React + SQLite, sem necessidade de Docker.

## Visão Geral

O sistema tem como objetivo apoiar a gestão de idosos, presença, atividades, saúde, alertas e permissões de usuários dentro de uma instituição de acolhimento. A solução atual foi construída em camadas separadas:

- Frontend em React + Vite
- Backend em Node.js + Express
- Banco de dados SQLite local
- Arquivos SQL de criação e seed para estrutura inicial

## Stack Tecnológica

- Frontend: React, Vite, CSS custom
- Backend: Node.js, Express
- Banco: SQLite (`backend/data/remanso.db`)
- Infra local: processos Node.js
- Ambiente de desenvolvimento: VS Code / Windows

## Estrutura do Projeto

```text
remanso-app/
├─ backend/
│  ├─ .env
│  ├─ package.json
│  ├─ scripts/
│  │  └─ init-db.js
│  ├─ sql/
│  │  ├─ 00_schema.sql
│  │  └─ 01_seed.sql
│  └─ src/
│     ├─ db.js
│     └─ server.js
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.js
│  └─ src/
│     ├─ App.jsx
│     ├─ index.css
│     └─ main.jsx
├─ iniciar-remanso.bat
├─ README.md
└─ .vscode/
```

## Requisitos

Antes de iniciar, verifique se os itens abaixo estão instalados na máquina:

- Node.js LTS
- npm
- Git

## Configuração Local

### 1. Configurar o backend com SQLite

Entre na pasta do backend:

```powershell
cd backend
npm install
```

Crie ou ajuste o arquivo `.env` com:

```env
PORT=3002
DATABASE_URL=postgresql://remanso:remanso123@localhost:5432/remanso_db
```

> Configuração atual: `DATABASE_URL=sqlite:./data/remanso.db`. O arquivo do banco fica em `backend/data/remanso.db`; não é necessário iniciar Docker ou PostgreSQL.

Inicialize as tabelas e dados iniciais:

```powershell
npm run db:init
```

Inicie o backend:

```powershell
npm run dev
```

A API ficará disponível em:

```text
http://127.0.0.1:3002
```

### 2. Configurar o frontend

Abra um novo terminal e rode:

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5174
```

A interface web ficará disponível em:

```text
http://127.0.0.1:5174
```

### 3. Iniciar tudo com um clique

Na raiz do projeto, dê duplo clique em:

```text
iniciar-remanso.bat
```

O script inicializa o SQLite, inicia backend e frontend no mesmo console e abre a interface no navegador. Para encerrar os serviços, feche a janela aberta pelo script.

## Credenciais padrão do sistema

```text
Usuário: admin
Senha: remanso123
```

## Esquema do Banco de Dados

O esquema executado atualmente é SQLite e está em `backend/sql/00_schema.sql`. As tabelas principais são `usuarios`, `idosos`, `atividades`, `atividade_presencas`, `registros_saude`, `avisos` e `checklists`.

### Tabela: perfis

Armazena os tipos de perfil de acesso do sistema.

```sql
CREATE TABLE IF NOT EXISTS perfis (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: modulos

Lista os módulos disponíveis no sistema.

```sql
CREATE TABLE IF NOT EXISTS modulos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: perfil_modulos

Relaciona perfis com módulos permitidos.

```sql
CREATE TABLE IF NOT EXISTS perfil_modulos (
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, modulo_id)
);
```

### Tabela: usuarios

Armazena usuários do sistema e seus acessos.

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  perfil_id INTEGER REFERENCES perfis(id),
  status VARCHAR(30) NOT NULL DEFAULT 'Ativo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: idosos

Dados cadastrais dos idosos do programa.

```sql
CREATE TABLE IF NOT EXISTS idosos (
  id SERIAL PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  data_nascimento DATE,
  sexo VARCHAR(20),
  cpf VARCHAR(20),
  celular_pessoal VARCHAR(30),
  endereco_logradouro VARCHAR(200),
  endereco_numero VARCHAR(20),
  endereco_bairro VARCHAR(100),
  endereco_cidade VARCHAR(100),
  endereco_uf CHAR(2),
  endereco_referencia TEXT,
  contato_emergencia_nome VARCHAR(150),
  contato_emergencia_vinculo VARCHAR(80),
  contato_emergencia_celular VARCHAR(30),
  presenca BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: atividades

Registro das atividades realizadas.

```sql
CREATE TABLE IF NOT EXISTS atividades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  data_realizacao DATE NOT NULL,
  horario VARCHAR(20) NOT NULL,
  local_execucao VARCHAR(150),
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: atividade_presencas

Associa idosos às atividades e informa se estiveram presentes.

```sql
CREATE TABLE IF NOT EXISTS atividade_presencas (
  atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE CASCADE,
  idoso_id INTEGER NOT NULL REFERENCES idosos(id) ON DELETE CASCADE,
  presente BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (atividade_id, idoso_id)
);
```

### Tabela: registros_saude

Dados da saúde dos idosos ao longo do tempo.

```sql
CREATE TABLE IF NOT EXISTS registros_saude (
  id SERIAL PRIMARY KEY,
  idoso_id INTEGER NOT NULL REFERENCES idosos(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL,
  pressao_arterial VARCHAR(20),
  frequencia_cardiaca INTEGER,
  peso DECIMAL(5,2),
  altura DECIMAL(4,2),
  notas TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: avisos

Alertas ou pendências do sistema.

```sql
CREATE TABLE IF NOT EXISTS avisos (
  id SERIAL PRIMARY KEY,
  origem VARCHAR(120),
  descricao TEXT NOT NULL,
  data_aviso DATE NOT NULL DEFAULT CURRENT_DATE,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Tabela: checklists

Checklist operacional do ambiente e rotina.

```sql
CREATE TABLE IF NOT EXISTS checklists (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  item_descricao TEXT NOT NULL,
  status VARCHAR(40) NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Seed Inicial

O arquivo `backend/sql/01_seed.sql` já inclui dados iniciais como:

- perfis de acesso
- módulos do sistema
- associação dos módulos por perfil
- usuários iniciais
- idosos de exemplo
- atividades de exemplo
- registros de saúde de exemplo
- avisos e checklists iniciais

## Endpoints da API

### Status

```http
GET /api/status
```

Resposta:

```json
{
  "status": "API Remanso Online",
  "data": "2026-09-01T00:00:00.000Z",
  "database": "postgres"
}
```

Na configuração atual, o campo `database` retorna `sqlite`.

### Idosos

```http
GET /api/idosos
POST /api/idosos
PUT /api/idosos/:id
DELETE /api/idosos/:id
```

### Checklists

```http
GET /api/checklists
POST /api/checklists
```

### Avisos

```http
GET /api/avisos
POST /api/avisos
PUT /api/avisos/:id
```

### Registros de saúde

```http
GET /api/registros-saude
POST /api/registros-saude
```

## Funcionalidades Atuais

- Login com usuário e senha
- Menu lateral com módulos
- Cadastro de idosos
- Edição de idosos e atividades
- Exclusão de idosos e atividades restrita ao Administrador
- Controle de presença por atividade
- Registro de saúde persistido no SQLite
- Relatório por idoso com os 5 registros mais recentes
- Download em PDF do histórico com até 10 registros completos
- Avisos manuais e automáticos persistidos no SQLite
- Edição de avisos e status resolvido/pendente
- Avisos recentes pendentes no Dashboard, incluindo a última observação de cada idoso
- Ordenação alfabética de nomes e atividades mais recentes primeiro
- Configuração de usuários e permissões
- Impressão de perfis e relatórios de presença em PDF

## Observações

- O banco SQLite é criado em `backend/data/remanso.db` pelo comando `npm run db:init`.
- O script de inicialização é idempotente e não duplica os dados seed existentes.
- O Dashboard mantém avisos pendentes visíveis até que sejam marcados como resolvidos.
- Datas de atividades e registros de saúde são validadas no formato `AAAA-MM-DD` sem deslocamento de fuso horário.

## Próximos Passos Recomendados

1. Adicionar edição e exclusão de registros de saúde
2. Adicionar filtros e busca nos relatórios
3. Preparar API para deploy em produção

## Conclusão

O sistema foi estruturado para ser um MVP funcional, com base em arquitetura simples, ambiente local reproducível e capacidade de expansão. A organização atual permite evoluir rapidamente para uma solução mais robusta e profissional.
