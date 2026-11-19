import type { ItemMenu } from '../../layout/LayoutComMenu';

/** Itens da administração (UX-01, seção 5), com o caso de uso de cada tela. */
export const itensAdmin: (ItemMenu & { descricao: string })[] = [
  { rotulo: 'Painel', caminho: '/admin', descricao: 'Visão geral' },
  {
    rotulo: 'Monitoramento e logs',
    caminho: '/admin/logs',
    permissao: 'admin:auditoria',
    descricao: 'Logs críticos e de auditoria (UC-25)',
  },
  {
    rotulo: 'Chamados de suporte',
    caminho: '/admin/chamados',
    permissao: 'admin:suporte',
    descricao: 'Chamados de empresas e tutores (UC-26)',
  },
  {
    rotulo: 'Integrações',
    caminho: '/admin/integracoes',
    permissao: 'admin:integracoes',
    descricao: 'Provedores externos da plataforma (UC-27)',
  },
  {
    rotulo: 'Contas de usuários',
    caminho: '/admin/usuarios',
    permissao: 'admin:usuarios',
    descricao: 'Bloqueio e reativação de contas (UC-28)',
  },
  {
    rotulo: 'Permissões globais',
    caminho: '/admin/permissoes',
    permissao: 'admin:usuarios',
    descricao: 'Perfis de acesso da plataforma (UC-29)',
  },
  {
    rotulo: 'Webhooks',
    caminho: '/admin/webhooks',
    permissao: 'admin:integracoes',
    descricao: 'Eventos enviados a sistemas parceiros (UC-30)',
  },
];
