import type { ItemMenu } from '../../layout/LayoutComMenu';

/**
 * Itens da web Enterprise (UX-01, seção 4). Cada funcionário vê só os itens liberados pelo
 * perfil dele (RN20); a conta da empresa tem todas as permissões.
 */
export const itensEmpresa: (ItemMenu & { descricao: string })[] = [
  { rotulo: 'Painel', caminho: '/', descricao: 'Visão geral do dia' },
  { rotulo: 'Agenda', caminho: '/agenda', permissao: 'agenda:ler', descricao: 'Agenda semanal e atendimentos (UC-24, UC-23)' },
  { rotulo: 'Horários', caminho: '/horarios', permissao: 'agenda:ler', descricao: 'Horários de atuação da equipe e dos recursos (UC-24)' },
  { rotulo: 'Solicitações', caminho: '/solicitacoes', permissao: 'agenda:editar', descricao: 'Pedidos de agendamento dos tutores (UC-41)' },
  { rotulo: 'Catálogo', caminho: '/catalogo', permissao: 'servico:ler', descricao: 'Serviços e recursos (UC-38)' },
  { rotulo: 'Clientes', caminho: '/clientes', permissao: 'cliente:ler', descricao: 'Clientes e termos de consentimento (UC-21)' },
  { rotulo: 'Pets vinculados', caminho: '/pets', permissao: 'cliente:ler', descricao: 'Pets compartilhados com a empresa (UC-20, UC-22)' },
  { rotulo: 'Chat', caminho: '/chat', permissao: 'chat:usar', descricao: 'Conversas com os tutores (UC-43)' },
  { rotulo: 'Funcionários', caminho: '/funcionarios', permissao: 'funcionario:ler', descricao: 'Equipe e perfis de acesso (UC-19, UC-16)' },
  { rotulo: 'Perfis de acesso', caminho: '/perfis', permissao: 'funcionario:ler', descricao: 'Perfis da equipe e as permissões de cada um (UC-16)' },
  { rotulo: 'Indicadores', caminho: '/indicadores', permissao: 'relatorio:ler', descricao: 'Indicadores da operação (UC-17)' },
  { rotulo: 'Relatórios', caminho: '/relatorios', permissao: 'relatorio:ler', descricao: 'Relatórios em tela e PDF (UC-18)' },
  { rotulo: 'Pagamentos', caminho: '/pagamentos', permissao: 'financeiro:ler', descricao: 'Pagamentos recebidos (UC-45)' },
  { rotulo: 'Privacidade', caminho: '/privacidade', descricao: 'Seus dados e consentimentos (UC-46)' },
];
