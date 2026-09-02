INSERT INTO perfis (nome, descricao) VALUES
  ('Administrador', 'Acesso completo ao sistema'),
  ('Operador', 'Acesso operacional com supervisão'),
  ('Atendimento', 'Acesso restrito para atendimento e registros')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO modulos (codigo, nome, descricao) VALUES
  ('dashboard', 'Dashboard', 'Painel principal com indicadores'),
  ('idosos', 'Idosos', 'Cadastro e presença dos idosos'),
  ('atividades', 'Atividades', 'Atividades e presença por atividade'),
  ('saude', 'Saúde do Idoso', 'Registro de saúde'),
  ('relatorioSaude', 'Relatório de Saúde', 'Relatório individual da saúde'),
  ('avisos', 'Avisos', 'Alertas e pendências'),
  ('relatorios', 'Relatórios', 'Relatórios do sistema'),
  ('configuracoes', 'Configurações', 'Parâmetros do sistema')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfil_modulos (perfil_id, modulo_id)
SELECT p.id, m.id
FROM perfis p
JOIN modulos m ON m.codigo IN ('dashboard','idosos','atividades','saude','relatorioSaude','avisos','relatorios','configuracoes')
WHERE p.nome = 'Administrador'
ON CONFLICT (perfil_id, modulo_id) DO NOTHING;

INSERT INTO perfil_modulos (perfil_id, modulo_id)
SELECT p.id, m.id
FROM perfis p
JOIN modulos m ON m.codigo IN ('dashboard','idosos','atividades','saude','relatorioSaude','avisos')
WHERE p.nome = 'Operador'
ON CONFLICT (perfil_id, modulo_id) DO NOTHING;

INSERT INTO perfil_modulos (perfil_id, modulo_id)
SELECT p.id, m.id
FROM perfis p
JOIN modulos m ON m.codigo IN ('dashboard','idosos','atividades')
WHERE p.nome = 'Atendimento'
ON CONFLICT (perfil_id, modulo_id) DO NOTHING;

INSERT INTO usuarios (nome, username, senha, perfil_id, status)
SELECT 'Administrador Remanso', 'admin', 'remanso123', p.id, 'Ativo'
FROM perfis p
WHERE p.nome = 'Administrador'
ON CONFLICT (username) DO NOTHING;

INSERT INTO usuarios (nome, username, senha, perfil_id, status)
SELECT 'Operador de Acompanhamento', 'operador', 'remanso123', p.id, 'Ativo'
FROM perfis p
WHERE p.nome = 'Operador'
ON CONFLICT (username) DO NOTHING;

INSERT INTO idosos (nome_completo, data_nascimento, sexo, cpf, celular_pessoal, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_referencia, contato_emergencia_nome, contato_emergencia_vinculo, contato_emergencia_celular, presenca)
VALUES
  ('Maria Silva', '1946-05-15', 'Feminino', '123.456.789-10', '(65) 99999-0001', 'Rua das Flores', '123', 'Centro', 'Cáceres', 'MT', 'Perto da praça', 'João Silva', 'Filho', '(65) 99999-1111', true),
  ('Antônio Santos', '1942-03-20', 'Masculino', '987.654.321-00', '(65) 99999-0002', 'Avenida Principal', '456', 'Jardim', 'Cáceres', 'MT', 'Próximo ao banco', 'Ana Santos', 'Filha', '(65) 99999-2222', false)
ON CONFLICT DO NOTHING;

INSERT INTO atividades (nome, tipo, data_realizacao, horario, local_execucao, descricao)
VALUES
  ('Ginástica Matinal', 'Diária', '2026-08-28', '08:00', 'Sala de Exercícios', 'Exercícios de alongamento'),
  ('Aula de Artesanato', 'Semanal', '2026-08-29', '10:00', 'Sala 2', 'Trabalhos com pintura')
ON CONFLICT DO NOTHING;

INSERT INTO atividade_presencas (atividade_id, idoso_id, presente)
SELECT a.id, i.id, true
FROM atividades a
JOIN idosos i ON i.nome_completo = 'Maria Silva'
WHERE a.nome = 'Ginástica Matinal'
ON CONFLICT (atividade_id, idoso_id) DO NOTHING;

INSERT INTO atividade_presencas (atividade_id, idoso_id, presente)
SELECT a.id, i.id, true
FROM atividades a
JOIN idosos i ON i.nome_completo = 'Maria Silva'
WHERE a.nome = 'Aula de Artesanato'
ON CONFLICT (atividade_id, idoso_id) DO NOTHING;

INSERT INTO atividade_presencas (atividade_id, idoso_id, presente)
SELECT a.id, i.id, false
FROM atividades a
JOIN idosos i ON i.nome_completo = 'Antônio Santos'
WHERE a.nome = 'Aula de Artesanato'
ON CONFLICT (atividade_id, idoso_id) DO NOTHING;

INSERT INTO registros_saude (idoso_id, data_registro, pressao_arterial, frequencia_cardiaca, peso, altura, notas)
SELECT id, '2026-08-28', '120/80', 72, 68.5, 1.65, 'Exame de rotina'
FROM idosos
WHERE nome_completo = 'Maria Silva'
ON CONFLICT DO NOTHING;

INSERT INTO registros_saude (idoso_id, data_registro, pressao_arterial, frequencia_cardiaca, peso, altura, notas)
SELECT id, '2026-08-27', '140/90', 88, 78.0, 1.72, 'Pressão elevada'
FROM idosos
WHERE nome_completo = 'Antônio Santos'
ON CONFLICT DO NOTHING;

INSERT INTO checklists (tipo, item_descricao, status, observacao)
VALUES
  ('Diário', 'Verificação de sinais vitais', 'OK', ''),
  ('Diário', 'Higienização dos ambientes', 'NaoConforme', 'Piso escorregadio na sala 2')
ON CONFLICT DO NOTHING;

INSERT INTO avisos (origem, descricao, data_aviso, resolvido)
VALUES
  ('Checklist Diário', 'Piso escorregadio na sala 2', '2026-08-28', false)
ON CONFLICT DO NOTHING;
