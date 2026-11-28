import type { ItemMenu } from '../../layout/LayoutComMenu';

/**
 * Itens da web Enterprise, agrupados pelo que a pessoa faz (UX-01, seção 4). Cada funcionário
 * vê só os itens liberados pelo perfil dele (RN20); a conta da empresa tem todas as permissões.
 */
export const itensEmpresa: (ItemMenu & { descricao: string })[] = [
  { grupo: 'Operação', rotulo: 'Hoje', caminho: '/', descricao: 'O dia da clínica num lugar só' },
  { grupo: 'Operação', rotulo: 'Agenda', caminho: '/agenda', permissao: 'agenda:ler', descricao: 'Semana por profissional e sala, com os atendimentos' },
  { grupo: 'Operação', rotulo: 'Pedidos', caminho: '/solicitacoes', permissao: 'agenda:editar', descricao: 'Pedidos de agendamento dos tutores' },
  { grupo: 'Clientes', rotulo: 'Clientes', caminho: '/clientes', permissao: 'cliente:ler', descricao: 'Tutores, pets e termos de consentimento' },
  { grupo: 'Clientes', rotulo: 'Pets', caminho: '/pets', permissao: 'cliente:ler', descricao: 'Pets compartilhados com a clínica' },
  { grupo: 'Clientes', rotulo: 'Avaliações', caminho: '/avaliacoes', permissao: 'atendimento:ler', descricao: 'Notas e comentários dos tutores' },
  { grupo: 'Clientes', rotulo: 'Conversas', caminho: '/chat', permissao: 'chat:usar', descricao: 'Mensagens com os tutores' },
  { grupo: 'Gestão', rotulo: 'Serviços', caminho: '/catalogo', permissao: 'servico:ler', descricao: 'Serviços, preços e salas' },
  { grupo: 'Gestão', rotulo: 'Horários', caminho: '/horarios', permissao: 'agenda:ler', descricao: 'Horário de cada profissional e sala' },
  { grupo: 'Gestão', rotulo: 'Equipe', caminho: '/funcionarios', permissao: 'funcionario:ler', descricao: 'Funcionários e convites' },
  { grupo: 'Gestão', rotulo: 'Perfis de acesso', caminho: '/perfis', permissao: 'funcionario:ler', descricao: 'O que cada perfil da equipe pode fazer' },
  { grupo: 'Gestão', rotulo: 'Pagamentos', caminho: '/pagamentos', permissao: 'financeiro:ler', descricao: 'Recebimentos e cobranças' },
  { grupo: 'Gestão', rotulo: 'Indicadores', caminho: '/indicadores', permissao: 'relatorio:ler', descricao: 'Atendimentos, faturamento e serviços mais pedidos' },
  { grupo: 'Gestão', rotulo: 'Relatórios', caminho: '/relatorios', permissao: 'relatorio:ler', descricao: 'Relatórios em tela e em PDF' },
  { grupo: 'Conta', rotulo: 'Perfil da empresa', caminho: '/perfil-empresa', permissao: 'empresa:editar', descricao: 'O que o tutor vê no app e na sua página' },
  { grupo: 'Conta', rotulo: 'Plano', caminho: '/plano', permissao: 'empresa:editar', descricao: 'Assinatura, teste grátis e limites' },
  { grupo: 'Conta', rotulo: 'Segurança', caminho: '/seguranca', descricao: 'Verificação em duas etapas' },
  { grupo: 'Conta', rotulo: 'Privacidade', caminho: '/privacidade', descricao: 'Seus dados e consentimentos' },
];
