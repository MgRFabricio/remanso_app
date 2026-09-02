import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'remanso123';

function formatDateOnly(dateValue) {
  const value = String(dateValue || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '-';

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
  ) {
    return '-';
  }

  return `${day}/${month}/${year}`;
}

function isValidDateOnly(dateValue) {
  return formatDateOnly(dateValue) !== '-';
}

function sortByName(records, nameField = 'nome') {
  return [...records].sort((first, second) => String(first[nameField] || '').localeCompare(
    String(second[nameField] || ''),
    'pt-BR',
    { sensitivity: 'base' }
  ));
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'idosos', label: 'Idosos', icon: '👴' },
  { id: 'atividades', label: 'Atividades', icon: '📋' },
  { id: 'saude', label: 'Saúde do Idoso', icon: '🏥' },
  { id: 'relatorioSaude', label: 'Relatório de Saúde', icon: '📈' },
  { id: 'avisos', label: 'Avisos', icon: '⚠️' },
  { id: 'relatorios', label: 'Relatórios', icon: '📊' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem('remanso-auth') === 'true';
  });

  const handleCredentialsChange = (field, value) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const [activeModule, setActiveModule] = useState('dashboard');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [usuarioAtual, setUsuarioAtual] = useState(() => {
    if (typeof window === 'undefined') return null;
    const savedUser = window.localStorage.getItem('remanso-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [idosos, setIdosos] = useState([
    {
      id: 1,
      nome: 'Maria Silva',
      dataNascimento: '1946-05-15',
      sexo: 'Feminino',
      cpf: '123.456.789-10',
      celularPessoal: '(65) 99999-0001',
      endereco: { logradouro: 'Rua das Flores', numero: '123', bairro: 'Centro', cidade: 'Cáceres', uf: 'MT', pontoReferencia: 'Perto da praça' },
      emergencia: { nome: 'João Silva', vinculo: 'Filho', celular: '(65) 99999-1111' },
      presenca: true,
    },
    {
      id: 2,
      nome: 'Antônio Santos',
      dataNascimento: '1942-03-20',
      sexo: 'Masculino',
      cpf: '987.654.321-00',
      celularPessoal: '(65) 99999-0002',
      endereco: { logradouro: 'Avenida Principal', numero: '456', bairro: 'Jardim', cidade: 'Cáceres', uf: 'MT', pontoReferencia: 'Próximo ao banco' },
      emergencia: { nome: 'Ana Santos', vinculo: 'Filha', celular: '(65) 99999-2222' },
      presenca: false,
    },
  ]);

  const [atividades, setAtividades] = useState([
    { id: 1, nome: 'Ginástica Matinal', tipo: 'Diária', data: '2026-08-28', horario: '08:00', local: 'Sala de Exercícios', presentes: [1], descricao: 'Exercícios de alongamento' },
    { id: 2, nome: 'Aula de Artesanato', tipo: 'Semanal', data: '2026-08-29', horario: '10:00', local: 'Sala 2', presentes: [1, 2], descricao: 'Trabalhos com pintura' },
  ]);

  const [checklists, setChecklists] = useState([
    { id: 1, tipo: 'Diário', item: 'Verificação de sinais vitais', status: 'OK', observacao: '' },
    { id: 2, tipo: 'Diário', item: 'Higienização dos ambientes', status: 'NaoConforme', observacao: 'Piso escorregadio na sala 2' },
  ]);

  const [saudeDados, setSaudeDados] = useState([
    { id: 1, idoso_id: 1, data: '2026-08-28', pressao: '120/80', peso: 68.5, altura: 1.65, frequenciaCardiaca: 72, notas: 'Exame de rotina' },
    { id: 2, idoso_id: 2, data: '2026-08-27', pressao: '140/90', peso: 78.0, altura: 1.72, frequenciaCardiaca: 88, notas: 'Pressão elevada' },
  ]);

  const [avisos, setAvisos] = useState([
    { id: 1, origem: 'Checklist Diário', descricao: 'Piso escorregadio na sala 2', data: '2026-08-28' }
  ]);
  const [novoAviso, setNovoAviso] = useState({
    origem: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    resolvido: false,
  });
  const [mostrarFormAviso, setMostrarFormAviso] = useState(false);
  const [avisoEmEdicao, setAvisoEmEdicao] = useState(null);

  const [perfisAcesso, setPerfisAcesso] = useState([
    {
      id: 'administrador',
      nome: 'Administrador',
      descricao: 'Acesso completo ao sistema',
      modulos: ['dashboard', 'idosos', 'atividades', 'saude', 'relatorioSaude', 'avisos', 'relatorios', 'configuracoes'],
    },
    {
      id: 'operador',
      nome: 'Operador',
      descricao: 'Acesso operacional com supervisão',
      modulos: ['dashboard', 'idosos', 'atividades', 'saude', 'relatorioSaude', 'avisos'],
    },
    {
      id: 'atendimento',
      nome: 'Atendimento',
      descricao: 'Acesso restrito para atendimento e registros',
      modulos: ['dashboard', 'idosos', 'atividades'],
    },
  ]);

  const [usuarios, setUsuarios] = useState([
    {
      id: 1,
      nome: 'Administrador Remanso',
      username: 'admin',
      senha: 'remanso123',
      perfil: 'Administrador',
      status: 'Ativo',
      modulos: ['dashboard', 'idosos', 'atividades', 'saude', 'relatorioSaude', 'avisos', 'relatorios', 'configuracoes'],
    },
    {
      id: 2,
      nome: 'Operador de Acompanhamento',
      username: 'operador',
      senha: 'remanso123',
      perfil: 'Operador',
      status: 'Ativo',
      modulos: ['dashboard', 'idosos', 'atividades', 'saude', 'relatorioSaude', 'avisos'],
    },
  ]);

  const [novoUsuario, setNovoUsuario] = useState({ nome: '', username: '', senha: '', perfil: 'Operador', status: 'Ativo' });
  const [mostrarFormUsuario, setMostrarFormUsuario] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState('administrador');
  const [usuarioSenhaId, setUsuarioSenhaId] = useState(1);
  const [novaSenha, setNovaSenha] = useState('');

  const [novaAtividade, setNovaAtividade] = useState({ nome: '', tipo: 'Diária', data: '', horario: '', local: '', presentes: [], descricao: '' });
  const [atividadeEmEdicao, setAtividadeEmEdicao] = useState(null);
  const [novoItem, setNovoItem] = useState({ tipo: 'Diário', item: '', status: 'OK', observacao: '' });
  const [novoRegistroSaude, setNovoRegistroSaude] = useState({ idoso_id: '', data: '', pressao: '', peso: '', altura: '', frequenciaCardiaca: '', notas: '' });
  const [mostrarFormAtividade, setMostrarFormAtividade] = useState(false);
  const [mostrarFormSaude, setMostrarFormSaude] = useState(false);
  const [novoIdoso, setNovoIdoso] = useState({
    nome: '',
    dataNascimento: '',
    sexo: 'Masculino',
    cpf: '',
    celularPessoal: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: 'MT',
    pontoReferencia: '',
    emergenciaNome: '',
    emergenciaVinculo: '',
    emergenciaCelular: '',
    presenca: true,
  });
  const [mostrarFormIdoso, setMostrarFormIdoso] = useState(false);
  const [idosoEmEdicao, setIdosoEmEdicao] = useState(null);
  const [perfilParaImpressao, setPerfilParaImpressao] = useState(null);
  const [atividadeParaImpressao, setAtividadeParaImpressao] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('remanso-auth', String(isAuthenticated));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = window.localStorage.getItem('remanso-token');
    if (!token) return;

    fetch('http://127.0.0.1:3002/api/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os usuários.');
        return response.json();
      })
      .then((usuariosDoBanco) => {
        setUsuarios(usuariosDoBanco.map((usuario) => ({
          ...usuario,
          modulos: perfisAcesso.find((perfil) => perfil.nome === usuario.perfil)?.modulos || [],
        })));
      })
      .catch(() => {
        // Mantém os usuários iniciais quando a API local estiver indisponível.
      });
  }, [isAuthenticated, perfisAcesso]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = window.localStorage.getItem('remanso-token');
    if (!token) return;

    fetch('http://127.0.0.1:3002/api/atividades', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as atividades.');
        return response.json();
      })
      .then((atividadesDoBanco) => setAtividades(atividadesDoBanco))
      .catch(() => {
        // Mantém os dados iniciais quando a API local estiver indisponível.
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = window.localStorage.getItem('remanso-token');
    if (!token) return;

    fetch('http://127.0.0.1:3002/api/registros-saude', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os registros de saúde.');
        return response.json();
      })
      .then((registros) => setSaudeDados(registros))
      .catch(() => {
        // Mantém os registros iniciais quando a API local estiver indisponível.
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = window.localStorage.getItem('remanso-token');
    if (!token) return;

    fetch('http://127.0.0.1:3002/api/avisos', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os avisos.');
        return response.json();
      })
      .then((avisosDoBanco) => setAvisos(avisosDoBanco.map((aviso) => ({
        ...aviso,
        data: aviso.data || aviso.data_aviso,
        resolvido: Boolean(aviso.resolvido),
        criado_em: aviso.criado_em,
      }))))
      .catch(() => {
        // Mantém os avisos iniciais quando a API local estiver indisponível.
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = window.localStorage.getItem('remanso-token');
    if (!token) return;

    fetch('http://127.0.0.1:3002/api/idosos', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar os idosos.');
        return response.json();
      })
      .then((idososDoBanco) => setIdosos(idososDoBanco))
      .catch(() => {
        // Mantém os dados iniciais quando a API local estiver indisponível.
      });
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();

    const username = credentials.username.trim();
    const password = credentials.password;

    try {
      const response = await fetch('http://localhost:3002/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const payload = await response.json();
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('remanso-token', payload.token || '');
          window.localStorage.setItem('remanso-user', JSON.stringify(payload.user || null));
        }
        setUsuarioAtual(payload.user || null);
        setError('');
        setIsAuthenticated(true);
        return;
      }
    } catch (err) {
      // fallback local auth below
    }

    const usuarioValido = usuarios.find(
      (usuario) => usuario.username.toLowerCase() === username.toLowerCase() && usuario.senha === password
    );

    if (usuarioValido) {
      setUsuarioAtual(usuarioValido);
      setError('');
      setIsAuthenticated(true);
      return;
    }

    setError('Credenciais inválidas. Verifique usuário e senha.');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials({ username: '', password: '' });
    setError('');
    setUsuarioAtual(null);
    window.localStorage.removeItem('remanso-token');
    window.localStorage.removeItem('remanso-user');
  };

  const handleAddAtividade = async (e) => {
    e.preventDefault();
    if (!novaAtividade.nome.trim() || !novaAtividade.data || !novaAtividade.horario) {
      alert('Preencha nome, data e horário da atividade.');
      return;
    }
    if (!isValidDateOnly(novaAtividade.data)) {
      alert('Informe uma data válida para a atividade.');
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    let atividadeCriada;

    if (token) {
      try {
        const response = await fetch(
          atividadeEmEdicao
            ? `http://127.0.0.1:3002/api/atividades/${atividadeEmEdicao}`
            : 'http://127.0.0.1:3002/api/atividades',
          {
          method: atividadeEmEdicao ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novaAtividade),
          }
        );
        if (!response.ok) throw new Error('Não foi possível salvar a atividade.');
        atividadeCriada = await response.json();
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    } else {
      atividadeCriada = { id: atividadeEmEdicao || Date.now(), ...novaAtividade };
    }

    setAtividades((prev) => atividadeEmEdicao
      ? prev.map((atividade) => atividade.id === atividadeEmEdicao ? atividadeCriada : atividade)
      : [atividadeCriada, ...prev]);
    setNovaAtividade({ nome: '', tipo: 'Diária', data: '', horario: '', local: '', presentes: [], descricao: '' });
    setAtividadeEmEdicao(null);
    setMostrarFormAtividade(false);
  };

  const editarAtividade = (atividade) => {
    setAtividadeEmEdicao(atividade.id);
    setNovaAtividade({
      nome: atividade.nome || '',
      tipo: atividade.tipo || 'Diária',
      data: atividade.data || '',
      horario: atividade.horario || '',
      local: atividade.local || '',
      presentes: atividade.presentes || [],
      descricao: atividade.descricao || '',
    });
    setMostrarFormAtividade(true);
  };

  const togglePresencaAtividade = async (atividadeId, idosoId) => {
    const atividade = atividades.find((item) => item.id === atividadeId);
    if (!atividade) return;
    const presente = !atividade.presentes.includes(idosoId);
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';

    if (token) {
      try {
        const response = await fetch(`http://127.0.0.1:3002/api/atividades/${atividadeId}/presenca/${idosoId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ presente }),
        });
        if (!response.ok) throw new Error('Não foi possível salvar a presença.');
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    }

    setAtividades((prev) => prev.map(a => {
      if (a.id === atividadeId) {
        const presentes = presente
          ? [...a.presentes, idosoId]
          : a.presentes.filter(id => id !== idosoId);
        return { ...a, presentes };
      }
      return a;
    }));
  };

  const handleAddRegistroSaude = async (e) => {
    e.preventDefault();
    if (!novoRegistroSaude.idoso_id || !novoRegistroSaude.data) {
      alert('Selecione o idoso e a data.');
      return;
    }
    if (!isValidDateOnly(novoRegistroSaude.data)) {
      alert('Informe uma data válida para o registro de saúde.');
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    let registroCriado;

    if (token) {
      try {
        const response = await fetch('http://127.0.0.1:3002/api/registros-saude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novoRegistroSaude),
        });
        if (!response.ok) throw new Error('Não foi possível salvar o registro de saúde.');
        registroCriado = await response.json();
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    } else {
      registroCriado = { id: Date.now(), ...novoRegistroSaude };
    }

    setSaudeDados((prev) => [...prev, registroCriado]);
    setNovoRegistroSaude({ idoso_id: '', data: '', pressao: '', peso: '', altura: '', frequenciaCardiaca: '', notas: '' });
    setMostrarFormSaude(false);
  };

  const handleAddChecklist = async (e) => {
    e.preventDefault();
    if (novoItem.status === 'NaoConforme' && !novoItem.observacao) {
      alert('Aviso: É obrigatório inserir uma observação para Não Conformidades!');
      return;
    }

    const itemCriado = { id: Date.now(), ...novoItem };
    setChecklists((prev) => [...prev, itemCriado]);

    if (novoItem.status === 'NaoConforme') {
      const aviso = {
        origem: `Atividade (${novoItem.tipo})`,
        descricao: `${novoItem.item}: ${novoItem.observacao}`,
        data: new Date().toISOString().split('T')[0],
        resolvido: false,
      };
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
      if (token) {
        try {
          const response = await fetch('http://127.0.0.1:3002/api/avisos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(aviso),
          });
          if (!response.ok) throw new Error('Não foi possível salvar o aviso gerado pelo checklist.');
          const avisoSalvo = await response.json();
          setAvisos((prev) => [avisoSalvo, ...prev]);
        } catch (requestError) {
          alert(requestError.message);
          return;
        }
      } else {
        setAvisos((prev) => [{ id: Date.now() + 1, ...aviso }, ...prev]);
      }
    }

    setNovoItem({ tipo: 'Diário', item: '', status: 'OK', observacao: '' });
  };

  const handleAddAviso = async (e) => {
    e.preventDefault();
    const origem = novoAviso.origem.trim();
    const descricao = novoAviso.descricao.trim();
    if (!origem || !descricao || !isValidDateOnly(novoAviso.data)) {
      alert('Preencha origem, descrição e uma data válida para o aviso.');
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    let avisoCriado;
    if (token) {
      try {
        const response = await fetch(
          avisoEmEdicao
            ? `http://127.0.0.1:3002/api/avisos/${avisoEmEdicao}`
            : 'http://127.0.0.1:3002/api/avisos',
          {
          method: avisoEmEdicao ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novoAviso),
        });
        if (!response.ok) throw new Error('Não foi possível salvar o aviso.');
        avisoCriado = await response.json();
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    } else {
      avisoCriado = { id: Date.now(), ...novoAviso, origem, descricao, data: novoAviso.data };
    }

    setAvisos((prev) => avisoEmEdicao
      ? prev.map((aviso) => aviso.id === avisoEmEdicao ? avisoCriado : aviso)
      : [avisoCriado, ...prev]);
    setNovoAviso({ origem: '', descricao: '', data: new Date().toISOString().split('T')[0], resolvido: false });
    setAvisoEmEdicao(null);
    setMostrarFormAviso(false);
  };

  const editarAviso = (aviso) => {
    setAvisoEmEdicao(aviso.id);
    setNovoAviso({
      origem: aviso.origem || '',
      descricao: aviso.descricao || '',
      data: aviso.data || aviso.data_aviso || '',
      resolvido: Boolean(aviso.resolvido),
    });
    setMostrarFormAviso(true);
  };

  const handleAddUsuario = async (e) => {
    e.preventDefault();

    if (!novoUsuario.nome.trim() || !novoUsuario.username.trim() || !novoUsuario.senha.trim()) {
      alert('Preencha nome, usuário e senha para criar o usuário.');
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    let usuarioCriado;

    if (token) {
      try {
        const response = await fetch('http://127.0.0.1:3002/api/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(novoUsuario),
        });
        if (!response.ok) throw new Error('Não foi possível salvar o usuário.');
        usuarioCriado = await response.json();
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    } else {
      usuarioCriado = { id: Date.now(), ...novoUsuario };
    }

    setUsuarios((prev) => [{
      ...usuarioCriado,
      modulos: perfisAcesso.find((perfil) => perfil.nome === usuarioCriado.perfil)?.modulos || [],
    }, ...prev]);
    setNovoUsuario({ nome: '', username: '', senha: '', perfil: 'Operador', status: 'Ativo' });
    setMostrarFormUsuario(false);
  };

  const handleResetSenha = async () => {
    if (!novaSenha.trim()) {
      alert('Informe a nova senha.');
      return;
    }

    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    if (token) {
      try {
        const response = await fetch(`http://127.0.0.1:3002/api/usuarios/${usuarioSenhaId}/reset-senha`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaSenha: novaSenha.trim() }),
        });
        if (!response.ok) throw new Error('Não foi possível atualizar a senha.');
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    }

    setUsuarios((prev) => prev.map((usuario) =>
      usuario.id === Number(usuarioSenhaId)
        ? { ...usuario, senha: novaSenha.trim() }
        : usuario
    ));

    setNovaSenha('');
    alert('Senha atualizada com sucesso.');
  };

  const handleToggleModuloPerfil = (perfilId, moduloId) => {
    setPerfisAcesso((prev) => prev.map((perfil) => {
      if (perfil.id !== perfilId) return perfil;
      const existe = perfil.modulos.includes(moduloId);
      return {
        ...perfil,
        modulos: existe
          ? perfil.modulos.filter((modulo) => modulo !== moduloId)
          : [...perfil.modulos, moduloId],
      };
    }));

    setUsuarios((prev) => prev.map((usuario) => {
      const perfilAtual = perfisAcesso.find((perfil) => perfil.id === perfilId);
      if (usuario.perfil !== perfilAtual?.nome) return usuario;
      const modulos = perfilAtual.modulos.includes(moduloId)
        ? perfilAtual.modulos.filter((modulo) => modulo !== moduloId)
        : [...perfilAtual.modulos, moduloId];
      return { ...usuario, modulos };
    }));
  };

  const togglePresenca = async (id) => {
    const idoso = idosos.find((item) => item.id === id);
    if (!idoso) return;

    const presenca = !idoso.presenca;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    if (token) {
      try {
        const response = await fetch(`http://127.0.0.1:3002/api/idosos/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...idoso, presenca }),
        });
        if (!response.ok) throw new Error('Não foi possível salvar a presença.');
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    }

    setIdosos((prev) => prev.map((item) => item.id === id ? { ...item, presenca } : item));
  };

  const deletarIdoso = async (id, nome) => {
    if (usuarioAtual?.perfil !== 'Administrador') return;
    if (!window.confirm(`Deseja realmente excluir o cadastro de ${nome}?`)) return;
    const token = window.localStorage.getItem('remanso-token');
    try {
      const response = await fetch(`http://127.0.0.1:3002/api/idosos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Não foi possível excluir o cadastro.');
      setIdosos((prev) => prev.filter((idoso) => idoso.id !== id));
    } catch (requestError) {
      alert(requestError.message);
    }
  };

  const deletarAtividade = async (id, nome) => {
    if (usuarioAtual?.perfil !== 'Administrador') return;
    if (!window.confirm(`Deseja realmente excluir a atividade ${nome}?`)) return;
    const token = window.localStorage.getItem('remanso-token');
    try {
      const response = await fetch(`http://127.0.0.1:3002/api/atividades/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Não foi possível excluir a atividade.');
      setAtividades((prev) => prev.filter((atividade) => atividade.id !== id));
    } catch (requestError) {
      alert(requestError.message);
    }
  };

  const handleAddIdoso = async (e) => {
    e.preventDefault();

    if (!novoIdoso.nome.trim() || !novoIdoso.dataNascimento || !novoIdoso.emergenciaCelular.trim()) {
      alert('Preencha nome, data de nascimento e contato de emergência para adicionar o idoso.');
      return;
    }

    const dadosIdoso = {
      nome: novoIdoso.nome.trim(),
      dataNascimento: novoIdoso.dataNascimento,
      sexo: novoIdoso.sexo,
      cpf: novoIdoso.cpf.trim(),
      celularPessoal: novoIdoso.celularPessoal.trim(),
      endereco: {
        logradouro: novoIdoso.logradouro.trim(),
        numero: novoIdoso.numero.trim(),
        bairro: novoIdoso.bairro.trim(),
        cidade: novoIdoso.cidade.trim(),
        uf: novoIdoso.uf,
        pontoReferencia: novoIdoso.pontoReferencia.trim(),
      },
      emergencia: {
        nome: novoIdoso.emergenciaNome.trim(),
        vinculo: novoIdoso.emergenciaVinculo.trim(),
        celular: novoIdoso.emergenciaCelular.trim(),
      },
      presenca: Boolean(novoIdoso.presenca),
    };
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('remanso-token') : '';
    let idosoCriado;

    if (token) {
      try {
        const response = await fetch(
          idosoEmEdicao
            ? `http://127.0.0.1:3002/api/idosos/${idosoEmEdicao}`
            : 'http://127.0.0.1:3002/api/idosos',
          {
          method: idosoEmEdicao ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dadosIdoso),
          }
        );
        if (!response.ok) throw new Error('Não foi possível salvar o idoso.');
        idosoCriado = idosoEmEdicao
          ? { ...dadosIdoso, id: idosoEmEdicao }
          : await response.json();
      } catch (requestError) {
        alert(requestError.message);
        return;
      }
    } else {
      idosoCriado = { id: Date.now(), ...dadosIdoso };
    }

    setIdosos((prev) => idosoEmEdicao
      ? prev.map((idoso) => idoso.id === idosoEmEdicao ? idosoCriado : idoso)
      : [idosoCriado, ...prev]);
    setIdosoEmEdicao(null);
    setNovoIdoso({
      nome: '',
      dataNascimento: '',
      sexo: 'Masculino',
      cpf: '',
      celularPessoal: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      uf: 'MT',
      pontoReferencia: '',
      emergenciaNome: '',
      emergenciaVinculo: '',
      emergenciaCelular: '',
      presenca: true,
    });
    setMostrarFormIdoso(false);
  };

  const editarIdoso = (idoso) => {
    setIdosoEmEdicao(idoso.id);
    setNovoIdoso({
      nome: idoso.nome || '',
      dataNascimento: idoso.dataNascimento || '',
      sexo: idoso.sexo || 'Masculino',
      cpf: idoso.cpf || '',
      celularPessoal: idoso.celularPessoal || '',
      logradouro: idoso.endereco?.logradouro || '',
      numero: idoso.endereco?.numero || '',
      bairro: idoso.endereco?.bairro || '',
      cidade: idoso.endereco?.cidade || '',
      uf: idoso.endereco?.uf || 'MT',
      pontoReferencia: idoso.endereco?.pontoReferencia || '',
      emergenciaNome: idoso.emergencia?.nome || '',
      emergenciaVinculo: idoso.emergencia?.vinculo || '',
      emergenciaCelular: idoso.emergencia?.celular || '',
      presenca: Boolean(idoso.presenca),
    });
    setMostrarFormIdoso(true);
  };

  const imprimirPerfilIdoso = (idoso) => {
    setAtividadeParaImpressao(null);
    setPerfilParaImpressao(idoso);
    window.setTimeout(() => window.print(), 0);
  };

  const imprimirRelatorioAtividade = (atividade) => {
    const presentes = idosos.filter((idoso) => atividade.presentes.includes(idoso.id));
    const faltantes = idosos.filter((idoso) => !atividade.presentes.includes(idoso.id));
    const pdf = new jsPDF();
    const dataFormatada = formatDateOnly(atividade.data);
    const linha = (label, value, y) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, 20, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(value || '-'), 65, y);
    };

    pdf.setTextColor(15, 75, 56);
    pdf.setFontSize(20);
    pdf.text('Relatorio de Presenca', 20, 22);
    pdf.setFontSize(10);
    pdf.setTextColor(98, 117, 103);
    pdf.text('Sistema Remanso - Acompanhamento e Gerenciamento', 20, 30);

    pdf.setTextColor(31, 42, 36);
    pdf.setFontSize(12);
    pdf.text('Informacoes da atividade', 20, 46);
    pdf.setFontSize(10);
    linha('Atividade', atividade.nome, 56);
    linha('Tipo', atividade.tipo, 64);
    linha('Data', dataFormatada, 72);
    linha('Horario', atividade.horario, 80);
    linha('Local', atividade.local, 88);
    linha('Descricao', atividade.descricao, 96);

    pdf.setFontSize(12);
    pdf.setTextColor(29, 107, 77);
    pdf.text('Resumo da presenca', 20, 114);
    pdf.setFontSize(10);
    pdf.setTextColor(31, 42, 36);
    linha('Total de idosos', idosos.length, 124);
    linha('Presentes', presentes.length, 132);
    linha('Faltantes', faltantes.length, 140);

    pdf.setFontSize(12);
    pdf.setTextColor(29, 107, 77);
    pdf.text('Lista de presenca', 20, 158);
    pdf.setFontSize(10);
    pdf.setTextColor(31, 42, 36);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nome do idoso', 20, 168);
    pdf.text('Status', 145, 168);
    pdf.setFont('helvetica', 'normal');
    let rowY = 178;
    idosos.forEach((idoso) => {
      if (rowY > 280) {
        pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.text('Nome do idoso', 20, 20);
        pdf.text('Status', 145, 20);
        pdf.setFont('helvetica', 'normal');
        rowY = 30;
      }
      pdf.text(String(idoso.nome || '-'), 20, rowY);
      pdf.text(atividade.presentes.includes(idoso.id) ? 'Presente' : 'Faltante', 145, rowY);
      rowY += 8;
    });

    const safeName = String(atividade.nome || 'atividade')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    pdf.save(`relatorio-presenca-${safeName || 'atividade'}.pdf`);
  };

  const imprimirHistoricoSaude = (idoso, registros) => {
    const pdf = new jsPDF();
    const historico = registros.slice(0, 10);
    let y = 22;
    const safeName = idoso.nome.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

    pdf.setTextColor(15, 75, 56);
    pdf.setFontSize(18);
    pdf.text('Historico de Saude', 20, y);
    y += 10;
    pdf.setFontSize(11);
    pdf.setTextColor(31, 42, 36);
    pdf.text(`Idoso: ${idoso.nome}`, 20, y);
    y += 8;
    pdf.text(`Registros apresentados: ${historico.length}`, 20, y);
    y += 10;

    historico.forEach((registro, index) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. Data: ${formatDateOnly(registro.data)}`, 20, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Pressao: ${registro.pressao || '-'} | Frequencia cardiaca: ${registro.frequenciaCardiaca ? `${registro.frequenciaCardiaca} bpm` : '-'}`, 24, y);
      y += 6;
      pdf.text(`Peso: ${registro.peso ? `${registro.peso} kg` : '-'} | Altura: ${registro.altura ? `${registro.altura} m` : '-'}`, 24, y);
      y += 6;
      const notas = pdf.splitTextToSize(`Observacoes: ${registro.notas || '-'}`, 165);
      pdf.text(notas, 24, y);
      y += (notas.length * 5) + 8;
    });

    pdf.save(`historico-saude-${safeName || 'idoso'}.pdf`);
  };

  const renderModule = () => {
    const observacoesRecentes = idosos.flatMap((idoso) => {
      const ultimoRegistro = saudeDados
        .filter((registro) => registro.idoso_id == idoso.id && String(registro.notas || '').trim())
        .sort((first, second) => String(second.data || '').localeCompare(String(first.data || '')))[0];

      return ultimoRegistro
        ? [{
          id: `observacao-${idoso.id}`,
          origem: idoso.nome,
          descricao: ultimoRegistro.notas.trim(),
          data: ultimoRegistro.data,
          resolvido: false,
        }]
        : [];
    });
    const avisosRecentes = [
      ...avisos,
      ...observacoesRecentes,
    ].filter((aviso) => !Boolean(aviso.resolvido));

    switch (activeModule) {
      case 'idosos':
        return (
          <div className="module-content">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>👴 Controle de Presença & Idosos</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarFormIdoso((prev) => !prev);
                    setIdosoEmEdicao(null);
                  }}
                >
                  {mostrarFormIdoso ? 'Fechar' : 'Adicionar Idoso'}
                </button>
              </div>

              {mostrarFormIdoso && (
                <form onSubmit={handleAddIdoso} style={{ marginBottom: '20px', padding: '18px', border: '1px solid #dfe8df', borderRadius: '12px', background: '#f9fbf9' }}>
                  <div style={{ marginBottom: '14px', fontSize: '0.9rem', color: '#627567', fontWeight: '600' }}>IDENTIFICAÇÃO</div>
                  
                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Nome Completo *</label>
                      <input
                        type="text"
                        value={novoIdoso.nome}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, nome: e.target.value })}
                        placeholder="Ex: Maria da Silva"
                        required
                      />
                    </div>
                    <div>
                      <label>Data de Nascimento *</label>
                      <input
                        type="date"
                        value={novoIdoso.dataNascimento}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, dataNascimento: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Sexo</label>
                      <select value={novoIdoso.sexo} onChange={(e) => setNovoIdoso({ ...novoIdoso, sexo: e.target.value })}>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label>CPF</label>
                      <input
                        type="text"
                        value={novoIdoso.cpf}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, cpf: e.target.value })}
                        placeholder="Ex: 123.456.789-10"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label>Celular Pessoal</label>
                    <input
                      type="text"
                      value={novoIdoso.celularPessoal}
                      onChange={(e) => setNovoIdoso({ ...novoIdoso, celularPessoal: e.target.value })}
                      placeholder="Ex: (65) 99999-1234"
                    />
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '0.9rem', color: '#627567', fontWeight: '600' }}>ENDEREÇO</div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Logradouro (Rua/Av)</label>
                      <input
                        type="text"
                        value={novoIdoso.logradouro}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, logradouro: e.target.value })}
                        placeholder="Ex: Rua das Flores"
                      />
                    </div>
                    <div>
                      <label>Nº</label>
                      <input
                        type="text"
                        value={novoIdoso.numero}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, numero: e.target.value })}
                        placeholder="Ex: 123"
                      />
                    </div>
                  </div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Bairro</label>
                      <input
                        type="text"
                        value={novoIdoso.bairro}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, bairro: e.target.value })}
                        placeholder="Ex: Centro"
                      />
                    </div>
                    <div>
                      <label>Cidade</label>
                      <input
                        type="text"
                        value={novoIdoso.cidade}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, cidade: e.target.value })}
                        placeholder="Ex: Cáceres"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label>Ponto de Referência</label>
                    <input
                      type="text"
                      value={novoIdoso.pontoReferencia}
                      onChange={(e) => setNovoIdoso({ ...novoIdoso, pontoReferencia: e.target.value })}
                      placeholder="Ex: Perto da escola"
                    />
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '0.9rem', color: '#627567', fontWeight: '600' }}>CONTATO DE EMERGÊNCIA *</div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Nome *</label>
                      <input
                        type="text"
                        value={novoIdoso.emergenciaNome}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, emergenciaNome: e.target.value })}
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                    <div>
                      <label>Vínculo (Parentesco)</label>
                      <input
                        type="text"
                        value={novoIdoso.emergenciaVinculo}
                        onChange={(e) => setNovoIdoso({ ...novoIdoso, emergenciaVinculo: e.target.value })}
                        placeholder="Ex: Filho"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label>Celular de Emergência *</label>
                    <input
                      type="text"
                      value={novoIdoso.emergenciaCelular}
                      onChange={(e) => setNovoIdoso({ ...novoIdoso, emergenciaCelular: e.target.value })}
                      placeholder="Ex: (65) 99999-5678"
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label>Presença Inicial</label>
                    <select
                      value={novoIdoso.presenca ? 'presente' : 'ausente'}
                      onChange={(e) => setNovoIdoso({ ...novoIdoso, presenca: e.target.value === 'presente' })}
                    >
                      <option value="presente">Presente</option>
                      <option value="ausente">Ausente</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit">{idosoEmEdicao ? 'Salvar alterações' : 'Salvar Idoso'}</button>
                    <button type="button" className="secondary-button" onClick={() => {
                      setMostrarFormIdoso(false);
                      setIdosoEmEdicao(null);
                    }}>Cancelar</button>
                  </div>
                </form>
              )}

              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Data de Nascimento</th>
                    <th>Sexo</th>
                    <th>Contato Emergência</th>
                    <th>Presença Hoje</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortByName(idosos).map(idoso => {
                    const dataNasc = new Date(idoso.dataNascimento);
                    const hoje = new Date();
                    const idade = hoje.getFullYear() - dataNasc.getFullYear();
                    const dataFormatada = dataNasc.toLocaleDateString('pt-BR');

                    return (
                      <tr key={idoso.id}>
                        <td>{idoso.nome}</td>
                        <td>{dataFormatada} ({idade} anos)</td>
                        <td>{idoso.sexo}</td>
                        <td>{idoso.emergencia?.celular || '-'}</td>
                        <td>
                          <button
                            onClick={() => togglePresenca(idoso.id)}
                            className={idoso.presenca ? 'badge badge-success' : 'badge badge-danger'}
                            style={{ cursor: 'pointer', border: 'none' }}
                          >
                            {idoso.presenca ? 'Presente' : 'Ausente'}
                          </button>
                        </td>
                        <td>
                          <div className="record-actions">
                            <button type="button" className="secondary-button" onClick={() => editarIdoso(idoso)}>
                              ✏️ Editar
                            </button>
                            {usuarioAtual?.perfil === 'Administrador' && (
                              <button
                                type="button"
                                className="delete-button"
                                onClick={() => deletarIdoso(idoso.id, idoso.nome)}
                                aria-label={`Excluir cadastro de ${idoso.nome}`}
                                title="Excluir cadastro"
                              >
                                Deletar
                              </button>
                            )}
                            <button
                              type="button"
                              className="secondary-button print-profile-button"
                              onClick={() => imprimirPerfilIdoso(idoso)}
                            >
                              🖨️ Imprimir perfil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'atividades':
        return (
          <div className="module-content">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>📋 Atividades & Registro de Presença</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarFormAtividade((prev) => !prev);
                    setAtividadeEmEdicao(null);
                  }}
                >
                  {mostrarFormAtividade ? 'Fechar' : 'Nova Atividade'}
                </button>
              </div>

              {mostrarFormAtividade && (
                <form onSubmit={handleAddAtividade} style={{ marginBottom: '20px', padding: '18px', border: '1px solid #dfe8df', borderRadius: '12px', background: '#f9fbf9' }}>
                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Nome da Atividade *</label>
                      <input
                        type="text"
                        value={novaAtividade.nome}
                        onChange={(e) => setNovaAtividade({ ...novaAtividade, nome: e.target.value })}
                        placeholder="Ex: Ginástica, Artesanato..."
                        required
                      />
                    </div>
                    <div>
                      <label>Tipo *</label>
                      <select value={novaAtividade.tipo} onChange={(e) => setNovaAtividade({ ...novaAtividade, tipo: e.target.value })}>
                        <option value="Diária">Diária</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Mensal">Mensal</option>
                      </select>
                    </div>
                  </div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Data *</label>
                      <input
                        type="date"
                        value={novaAtividade.data}
                        onChange={(e) => setNovaAtividade({ ...novaAtividade, data: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label>Horário *</label>
                      <input
                        type="time"
                        value={novaAtividade.horario}
                        onChange={(e) => setNovaAtividade({ ...novaAtividade, horario: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label>Local</label>
                    <input
                      type="text"
                      value={novaAtividade.local}
                      onChange={(e) => setNovaAtividade({ ...novaAtividade, local: e.target.value })}
                      placeholder="Ex: Sala de Exercícios"
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label>Descrição</label>
                    <textarea
                      value={novaAtividade.descricao}
                      onChange={(e) => setNovaAtividade({ ...novaAtividade, descricao: e.target.value })}
                      placeholder="Detalhes da atividade..."
                      style={{ resize: 'vertical', minHeight: '80px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit">{atividadeEmEdicao ? 'Salvar alterações' : 'Criar Atividade'}</button>
                    <button type="button" className="secondary-button" onClick={() => {
                      setMostrarFormAtividade(false);
                      setAtividadeEmEdicao(null);
                    }}>Cancelar</button>
                  </div>
                </form>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Atividade</th>
                      <th>Data</th>
                      <th>Horário</th>
                      <th>Local</th>
                      <th>Tipo</th>
                      <th>Presentes</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atividades.map(atividade => (
                      <tr key={atividade.id}>
                        <td>
                          <div>
                            <strong>{atividade.nome}</strong>
                            {atividade.descricao && <div style={{ fontSize: '0.85rem', color: '#627567', marginTop: '4px' }}>{atividade.descricao}</div>}
                          </div>
                        </td>
                        <td>{formatDateOnly(atividade.data)}</td>
                        <td>{atividade.horario}</td>
                        <td>{atividade.local || '-'}</td>
                        <td><span className="badge badge-success">{atividade.tipo}</span></td>
                        <td><strong>{atividade.presentes.length}</strong></td>
                        <td>
                          <div className="record-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => editarAtividade(atividade)}
                            >
                              ✏️ Editar
                            </button>
                            {usuarioAtual?.perfil === 'Administrador' && (
                              <button
                                type="button"
                                className="delete-button"
                                onClick={() => deletarAtividade(atividade.id, atividade.nome)}
                                aria-label={`Excluir atividade ${atividade.nome}`}
                                title="Excluir atividade"
                              >
                                Deletar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2>✅ Presença por Atividade</h2>
              {atividades.length === 0 ? (
                <p style={{ color: '#627567', fontStyle: 'italic' }}>Nenhuma atividade registrada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {atividades.map(atividade => (
                    <div key={atividade.id} style={{ borderLeft: '4px solid #1d6b4d', paddingLeft: '16px', paddingBottom: '16px', borderBottom: '1px solid #dfe8df' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1.05rem', color: '#1f2a24', marginBottom: '4px' }}>{atividade.nome}</h3>
                        <span style={{ fontSize: '0.85rem', color: '#627567' }}>{formatDateOnly(atividade.data)} às {atividade.horario}</span>
                      </div>
                      <button
                        type="button"
                        className="secondary-button activity-print-button"
                        onClick={() => imprimirRelatorioAtividade(atividade)}
                      >
                        📄 Gerar PDF de presença
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        {sortByName(idosos).map(idoso => (
                          <button
                            key={`${atividade.id}-${idoso.id}`}
                            onClick={() => togglePresencaAtividade(atividade.id, idoso.id)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s ease',
                              background: atividade.presentes.includes(idoso.id) ? '#dff5e7' : '#f3faf6',
                              color: atividade.presentes.includes(idoso.id) ? '#1a5e3a' : '#627567',
                              border: atividade.presentes.includes(idoso.id) ? '2px solid #1a5e3a' : '1px solid #dfe8df',
                            }}
                          >
                            {atividade.presentes.includes(idoso.id) ? '✓' : '○'} {idoso.nome}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'saude':
        return (
          <div className="module-content">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>🏥 Registro de Saúde</h2>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarFormSaude((prev) => !prev)}
                >
                  {mostrarFormSaude ? 'Fechar' : 'Novo Registro'}
                </button>
              </div>

              {mostrarFormSaude && (
                <form onSubmit={handleAddRegistroSaude} style={{ marginBottom: '20px', padding: '18px', border: '1px solid #dfe8df', borderRadius: '12px', background: '#f9fbf9' }}>
                  <div style={{ marginBottom: '14px', fontSize: '0.9rem', color: '#627567', fontWeight: '600' }}>DADOS DO REGISTRO</div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Idoso *</label>
                      <select value={novoRegistroSaude.idoso_id} onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, idoso_id: e.target.value })} required>
                        <option value="">Selecione um idoso</option>
                        {sortByName(idosos).map(idoso => (
                          <option key={idoso.id} value={idoso.id}>{idoso.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Data do Registro *</label>
                      <input
                        type="date"
                        value={novoRegistroSaude.data}
                        onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, data: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '0.9rem', color: '#627567', fontWeight: '600' }}>MEDIÇÕES</div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Pressão Arterial (ex: 120/80)</label>
                      <input
                        type="text"
                        value={novoRegistroSaude.pressao}
                        onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, pressao: e.target.value })}
                        placeholder="Ex: 120/80"
                      />
                    </div>
                    <div>
                      <label>Frequência Cardíaca (bpm)</label>
                      <input
                        type="number"
                        value={novoRegistroSaude.frequenciaCardiaca}
                        onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, frequenciaCardiaca: e.target.value })}
                        placeholder="Ex: 72"
                      />
                    </div>
                  </div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Peso (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={novoRegistroSaude.peso}
                        onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, peso: e.target.value })}
                        placeholder="Ex: 68.5"
                      />
                    </div>
                    <div>
                      <label>Altura (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={novoRegistroSaude.altura}
                        onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, altura: e.target.value })}
                        placeholder="Ex: 1.65"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label>Observações e Notas</label>
                    <textarea
                      value={novoRegistroSaude.notas}
                      onChange={(e) => setNovoRegistroSaude({ ...novoRegistroSaude, notas: e.target.value })}
                      placeholder="Qualquer observação relevante..."
                      style={{ resize: 'vertical', minHeight: '80px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit">Salvar Registro</button>
                    <button type="button" className="secondary-button" onClick={() => setMostrarFormSaude(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              <h3 style={{ fontSize: '1.1rem', color: '#1d6b4d', marginBottom: '14px', marginTop: '14px' }}>Últimos Registros</h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Idoso</th>
                      <th>Data</th>
                      <th>Pressão</th>
                      <th>Freq. Cardíaca</th>
                      <th>Peso (kg)</th>
                      <th>Altura (m)</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saudeDados.slice().sort((first, second) => (
                      String(second.data || '').localeCompare(String(first.data || ''))
                      || Number(second.id || 0) - Number(first.id || 0)
                    )).map(registro => {
                      const idoso = idosos.find(i => i.id == registro.idoso_id);
                      return (
                        <tr key={registro.id}>
                          <td><strong>{idoso?.nome || 'Desconhecido'}</strong></td>
                          <td>{formatDateOnly(registro.data)}</td>
                          <td>{registro.pressao || '-'}</td>
                          <td>{registro.frequenciaCardiaca ? `${registro.frequenciaCardiaca} bpm` : '-'}</td>
                          <td>{registro.peso || '-'}</td>
                          <td>{registro.altura || '-'}</td>
                          <td style={{ fontSize: '0.9rem', color: '#627567', maxWidth: '150px', wordBreak: 'break-word' }}>{registro.notas || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'relatorioSaude':
        return (
          <div className="module-content">
            <div className="card">
              <h2>📈 Relatório de Saúde por Idoso</h2>
              
              {idosos.length === 0 ? (
                <p style={{ color: '#627567', fontStyle: 'italic', marginTop: '20px' }}>Nenhum idoso registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '18px' }}>
                  {sortByName(idosos).map(idoso => {
                    const registrosIdoso = saudeDados
                      .filter(r => r.idoso_id == idoso.id)
                      .sort((first, second) => (
                        String(second.data || '').localeCompare(String(first.data || ''))
                        || Number(second.id || 0) - Number(first.id || 0)
                      ));
                    const ultimoRegistro = registrosIdoso[0] || null;
                    const cincoRegistros = registrosIdoso.slice(0, 5);

                    return (
                      <div key={idoso.id} style={{ borderRadius: '12px', border: '1px solid #dfe8df', overflow: 'hidden' }}>
                        <div style={{ background: 'linear-gradient(135deg, #f3faf6 0%, #edf6f3 100%)', borderBottom: '2px solid #1d6b4d', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '1.15rem', color: '#1d6b4d', marginBottom: '4px', fontWeight: '700' }}>👤 {idoso.nome}</h3>
                            <span style={{ fontSize: '0.85rem', color: '#627567' }}>ID: {idoso.id} | Registros: {registrosIdoso.length}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: '#627567' }}>Status de Presença</div>
                            <span className={idoso.presenca ? 'badge badge-success' : 'badge badge-danger'}>
                              {idoso.presenca ? 'Presente' : 'Ausente'}
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '16px' }}>
                          {ultimoRegistro ? (
                            <>
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#627567', fontWeight: '600', marginBottom: '12px' }}>ÚLTIMAS MEDIÇÕES</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                                  <div style={{ background: '#f9fbf9', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #1d6b4d' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#627567' }}>Pressão Arterial</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1d6b4d' }}>{ultimoRegistro.pressao || '-'}</div>
                                  </div>
                                  <div style={{ background: '#f9fbf9', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #1d6b4d' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#627567' }}>Freq. Cardíaca</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1d6b4d' }}>{ultimoRegistro.frequenciaCardiaca ? `${ultimoRegistro.frequenciaCardiaca} bpm` : '-'}</div>
                                  </div>
                                  <div style={{ background: '#f9fbf9', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #1d6b4d' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#627567' }}>Peso</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1d6b4d' }}>{ultimoRegistro.peso ? `${ultimoRegistro.peso} kg` : '-'}</div>
                                  </div>
                                  <div style={{ background: '#f9fbf9', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #1d6b4d' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#627567' }}>Altura</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1d6b4d' }}>{ultimoRegistro.altura ? `${ultimoRegistro.altura} m` : '-'}</div>
                                  </div>
                                </div>
                              </div>

                              {ultimoRegistro.notas && (
                                <div style={{ marginBottom: '16px', padding: '12px', background: '#fffaf3', borderRadius: '8px', borderLeft: '4px solid #d7b563' }}>
                                  <div style={{ fontSize: '0.9rem', color: '#627567', fontWeight: '600', marginBottom: '6px' }}>📝 Última Observação</div>
                                  <div style={{ fontSize: '0.95rem', color: '#1f2a24' }}>{ultimoRegistro.notas}</div>
                                </div>
                              )}

                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => imprimirHistoricoSaude(idoso, registrosIdoso)}
                              >
                                📄 Baixar histórico (até 10 registros)
                              </button>

                              {cincoRegistros.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.9rem', color: '#627567', fontWeight: '600', marginBottom: '12px' }}>ÚLTIMOS 5 REGISTROS</div>
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ fontSize: '0.9rem' }}>
                                      <thead>
                                        <tr>
                                          <th>Data</th>
                                          <th>Pressão</th>
                                          <th>Freq. Cardíaca</th>
                                          <th>Peso</th>
                                          <th>Altura</th>
                                          <th>Notas</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {cincoRegistros.map(reg => (
                                          <tr key={reg.id}>
                                            <td>{formatDateOnly(reg.data)}</td>
                                            <td>{reg.pressao || '-'}</td>
                                            <td>{reg.frequenciaCardiaca ? `${reg.frequenciaCardiaca} bpm` : '-'}</td>
                                            <td>{reg.peso ? `${reg.peso} kg` : '-'}</td>
                                            <td>{reg.altura ? `${reg.altura} m` : '-'}</td>
                                            <td>{reg.notas || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p style={{ color: '#627567', fontStyle: 'italic', fontSize: '0.9rem' }}>Nenhum registro de saúde para este idoso.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      case 'avisos':
        return (
          <div className="module-content">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>⚠️ Módulo de Avisos & Pendências</h2>
                <button type="button" className="secondary-button" onClick={() => {
                  setMostrarFormAviso((prev) => !prev);
                  setAvisoEmEdicao(null);
                }}>
                  {mostrarFormAviso ? 'Fechar' : 'Adicionar aviso'}
                </button>
              </div>
              {mostrarFormAviso && (
                <form onSubmit={handleAddAviso} style={{ marginBottom: '20px', padding: '18px', border: '1px solid #dfe8df', borderRadius: '12px', background: '#f9fbf9' }}>
                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Origem *</label>
                      <input
                        type="text"
                        value={novoAviso.origem}
                        onChange={(e) => setNovoAviso({ ...novoAviso, origem: e.target.value })}
                        placeholder="Ex: Administração"
                        required
                      />
                    </div>
                    <div>
                      <label>Data *</label>
                      <input
                        type="date"
                        value={novoAviso.data}
                        onChange={(e) => setNovoAviso({ ...novoAviso, data: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label>Descrição / Ocorrência *</label>
                    <textarea
                      value={novoAviso.descricao}
                      onChange={(e) => setNovoAviso({ ...novoAviso, descricao: e.target.value })}
                      placeholder="Descreva o aviso ou pendência..."
                      required
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="checkbox"
                      checked={novoAviso.resolvido}
                      onChange={(e) => setNovoAviso({ ...novoAviso, resolvido: e.target.checked })}
                    />
                    Aviso resolvido
                  </label>
                  <button type="submit">{avisoEmEdicao ? 'Salvar alterações' : 'Salvar aviso'}</button>
                </form>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Descrição / Ocorrência</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {avisos.map(aviso => (
                    <tr key={aviso.id}>
                      <td>{aviso.data}</td>
                      <td><span className="badge badge-warning">{aviso.origem}</span></td>
                      <td>{aviso.descricao}</td>
                      <td>{aviso.resolvido ? 'Resolvido' : 'Pendente'}</td>
                      <td>
                        <button type="button" className="secondary-button" onClick={() => editarAviso(aviso)}>
                          ✏️ Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'relatorios':
        return (
          <div className="module-content">
            <div className="card">
              <h2>📊 Relatórios</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <span>Total de idosos</span>
                  <strong>{idosos.length}</strong>
                </div>
                <div className="stat-box">
                  <span>Presentes hoje</span>
                  <strong>{idosos.filter(i => i.presenca).length}</strong>
                </div>
                <div className="stat-box">
                  <span>Checklists</span>
                  <strong>{checklists.length}</strong>
                </div>
                <div className="stat-box">
                  <span>Avisos ativos</span>
                  <strong>{avisos.filter((aviso) => !Boolean(aviso.resolvido)).length}</strong>
                </div>
              </div>
            </div>
          </div>
        );
      case 'configuracoes':
        return (
          <div className="module-content">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <h2 style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>👥 Usuários e Permissões</h2>
                <button type="button" className="secondary-button" onClick={() => setMostrarFormUsuario((prev) => !prev)}>
                  {mostrarFormUsuario ? 'Fechar' : 'Novo usuário'}
                </button>
              </div>

              {mostrarFormUsuario && (
                <form onSubmit={handleAddUsuario} style={{ marginBottom: '20px', padding: '18px', border: '1px solid #dfe8df', borderRadius: '12px', background: '#f9fbf9' }}>
                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Nome completo</label>
                      <input
                        type="text"
                        value={novoUsuario.nome}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                        placeholder="Ex: Maria da Silva"
                        required
                      />
                    </div>
                    <div>
                      <label>Usuário</label>
                      <input
                        type="text"
                        value={novoUsuario.username}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, username: e.target.value })}
                        placeholder="Ex: maria"
                        required
                      />
                    </div>
                  </div>

                  <div className="two-column" style={{ marginBottom: '12px' }}>
                    <div>
                      <label>Senha</label>
                      <input
                        type="password"
                        value={novoUsuario.senha}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                        placeholder="Digite a senha"
                        required
                      />
                    </div>
                    <div>
                      <label>Perfil</label>
                      <select
                        value={novoUsuario.perfil}
                        onChange={(e) => setNovoUsuario({ ...novoUsuario, perfil: e.target.value })}
                      >
                        <option value="Administrador">Administrador</option>
                        <option value="Operador">Operador</option>
                        <option value="Atendimento">Atendimento</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit">Salvar usuário</button>
                    <button type="button" className="secondary-button" onClick={() => setMostrarFormUsuario(false)}>Cancelar</button>
                  </div>
                </form>
              )}

              <div className="settings-grid" style={{ marginBottom: '20px' }}>
                <div className="setting-card">
                  <div className="setting-header">
                    <span className="setting-icon">🧩</span>
                    <h3>Perfis de acesso</h3>
                  </div>
                  {perfisAcesso.map((perfil) => (
                    <div key={perfil.id} style={{ border: '1px solid #dfe8df', borderRadius: '10px', padding: '10px 12px', background: perfilSelecionado === perfil.id ? '#eef8f3' : '#fff', marginBottom: '8px', cursor: 'pointer' }} onClick={() => setPerfilSelecionado(perfil.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <strong>{perfil.nome}</strong>
                        <span className="badge badge-success">{perfil.modulos.length} módulos</span>
                      </div>
                      <p style={{ color: '#627567', marginTop: '6px', fontSize: '0.85rem' }}>{perfil.descricao}</p>
                    </div>
                  ))}
                </div>

                <div className="setting-card">
                  <div className="setting-header">
                    <span className="setting-icon">🔐</span>
                    <h3>Permissões por módulo</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {menuItems.map((item) => {
                      const perfilAtivo = perfisAcesso.find((perfil) => perfil.id === perfilSelecionado);
                      const checked = perfilAtivo?.modulos.includes(item.id) || false;
                      return (
                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: checked ? '#f3faf6' : '#fff', border: '1px solid #dfe8df' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleModuloPerfil(perfilSelecionado, item.id)}
                            style={{ width: '16px', margin: 0 }}
                          />
                          <span>{item.icon} {item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="setting-card">
                  <div className="setting-header">
                    <span className="setting-icon">🛡️</span>
                    <h3>Usuários administradores</h3>
                  </div>
                  <ul>
                    {sortByName(usuarios).map((usuario) => (
                      <li key={usuario.id}>
                        <strong>{usuario.nome}</strong> — {usuario.username} ({usuario.perfil})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card" style={{ marginTop: '0' }}>
                <h2>👤 Lista de usuários</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Usuário</th>
                      <th>Perfil</th>
                      <th>Status</th>
                      <th>Módulos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortByName(usuarios).map((usuario) => (
                      <tr key={usuario.id}>
                        <td>{usuario.nome}</td>
                        <td>{usuario.username}</td>
                        <td><span className="badge badge-success">{usuario.perfil}</span></td>
                        <td><span className="badge badge-warning">{usuario.status}</span></td>
                        <td>{usuario.modulos.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card" style={{ marginTop: '20px' }}>
                <h2>🔑 Gestão de senhas</h2>
                <div className="two-column" style={{ marginBottom: '8px' }}>
                  <div>
                    <label>Usuário</label>
                    <select value={usuarioSenhaId} onChange={(e) => setUsuarioSenhaId(e.target.value)}>
                      {sortByName(usuarios).map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>{usuario.nome} ({usuario.username})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Nova senha</label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Digite a nova senha"
                    />
                  </div>
                </div>
                <button type="button" onClick={handleResetSenha}>Salvar nova senha</button>
              </div>
            </div>
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="module-content">
            <div className="card">
              <h2>🏠 Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-box">
                  <span>Idosos ativos</span>
                  <strong>{idosos.length}</strong>
                </div>
                <div className="stat-box">
                  <span>Presença hoje</span>
                  <strong>{idosos.filter(i => i.presenca).length}</strong>
                </div>
                <div className="stat-box">
                  <span>Itens em alerta</span>
                  <strong>{checklists.filter(c => c.status === 'NaoConforme').length}</strong>
                </div>
                <div className="stat-box">
                  <span>Avisos pendentes</span>
                  <strong>{avisosRecentes.length}</strong>
                </div>
              </div>
            </div>

            <div className="card" style={{ borderLeft: '5px solid #d35d5d', marginTop: '20px' }}>
              <h2>⚠️ Avisos Recentes</h2>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {avisosRecentes.map(aviso => (
                    <tr key={aviso.id}>
                      <td>{aviso.data}</td>
                      <td><span className="badge badge-warning">{aviso.origem}</span></td>
                      <td>{aviso.descricao}</td>
                    </tr>
                  ))}
                  {avisosRecentes.length === 0 && (
                    <tr>
                      <td colSpan="3">Nenhum aviso pendente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginScreen
        credentials={credentials}
        onChange={handleCredentialsChange}
        onSubmit={handleLogin}
        error={error}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        menuItems={menuItems}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        onLogout={handleLogout}
        currentUser={usuarioAtual}
      />

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Sistema Remanso - MVP</h1>
            <p>Acompanhamento e Gerenciamento de Idosos</p>
          </div>
          <span className="badge badge-success">Perfil: Administrador/Operador</span>
        </header>

        {renderModule()}
      </main>
      {perfilParaImpressao && (
        <section className="print-profile" aria-hidden="true">
          <h1>Perfil do Idoso</h1>
          <p className="print-profile-subtitle">Sistema Remanso - Acompanhamento e Gerenciamento</p>

          <h2>Identificação</h2>
          <div className="print-profile-grid">
            <p><strong>Nome completo:</strong> {perfilParaImpressao.nome || '-'}</p>
            <p><strong>Data de nascimento:</strong> {perfilParaImpressao.dataNascimento || '-'}</p>
            <p><strong>Sexo:</strong> {perfilParaImpressao.sexo || '-'}</p>
            <p><strong>CPF:</strong> {perfilParaImpressao.cpf || '-'}</p>
            <p><strong>Celular pessoal:</strong> {perfilParaImpressao.celularPessoal || '-'}</p>
            <p><strong>Presença hoje:</strong> {perfilParaImpressao.presenca ? 'Presente' : 'Ausente'}</p>
          </div>

          <h2>Endereço</h2>
          <div className="print-profile-grid">
            <p><strong>Logradouro:</strong> {perfilParaImpressao.endereco?.logradouro || '-'}</p>
            <p><strong>Número:</strong> {perfilParaImpressao.endereco?.numero || '-'}</p>
            <p><strong>Bairro:</strong> {perfilParaImpressao.endereco?.bairro || '-'}</p>
            <p><strong>Cidade:</strong> {perfilParaImpressao.endereco?.cidade || '-'}</p>
            <p><strong>UF:</strong> {perfilParaImpressao.endereco?.uf || '-'}</p>
            <p><strong>Ponto de referência:</strong> {perfilParaImpressao.endereco?.pontoReferencia || '-'}</p>
          </div>

          <h2>Contato de emergência</h2>
          <div className="print-profile-grid">
            <p><strong>Nome:</strong> {perfilParaImpressao.emergencia?.nome || '-'}</p>
            <p><strong>Vínculo:</strong> {perfilParaImpressao.emergencia?.vinculo || '-'}</p>
            <p><strong>Celular:</strong> {perfilParaImpressao.emergencia?.celular || '-'}</p>
          </div>
        </section>
      )}
      {atividadeParaImpressao && (
        <section className="print-activity-report" aria-hidden="true">
          <h1>Relatório de Presença</h1>
          <p className="print-profile-subtitle">Sistema Remanso - Acompanhamento e Gerenciamento</p>

          <h2>Informações da atividade</h2>
          <div className="print-profile-grid">
            <p><strong>Atividade:</strong> {atividadeParaImpressao.nome || '-'}</p>
            <p><strong>Tipo:</strong> {atividadeParaImpressao.tipo || '-'}</p>
            <p><strong>Data:</strong> {formatDateOnly(atividadeParaImpressao.data)}</p>
            <p><strong>Horário:</strong> {atividadeParaImpressao.horario || '-'}</p>
            <p><strong>Local:</strong> {atividadeParaImpressao.local || '-'}</p>
            <p><strong>Descrição:</strong> {atividadeParaImpressao.descricao || '-'}</p>
          </div>

          <h2>Resumo da presença</h2>
          <div className="print-activity-summary">
            <p><strong>Quantidade de idosos:</strong> {idosos.length}</p>
            <p><strong>Presentes:</strong> {idosos.filter((idoso) => atividadeParaImpressao.presentes.includes(idoso.id)).length}</p>
            <p><strong>Faltantes:</strong> {idosos.filter((idoso) => !atividadeParaImpressao.presentes.includes(idoso.id)).length}</p>
          </div>

          <h2>Lista de presença</h2>
          <table className="print-activity-table">
            <thead>
              <tr>
                <th>Nome do idoso</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortByName(idosos).map((idoso) => {
                const presente = atividadeParaImpressao.presentes.includes(idoso.id);
                return (
                  <tr key={idoso.id}>
                    <td>{idoso.nome}</td>
                    <td>{presente ? 'Presente' : 'Faltante'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default App;
