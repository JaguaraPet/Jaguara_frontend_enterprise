import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { api } from '../api/cliente';
import { sessao } from '../api/sessao';
import { useUsuario } from '../sessao/useUsuario';
import { BarraDemonstracao } from './BarraDemonstracao';
import './layout.css';

export interface ItemMenu {
  /** Seção do menu em que o item aparece; itens sem grupo ficam no topo. */
  grupo?: string;
  rotulo: string;
  caminho: string;
  /** Permissão necessária para ver o item (RN20). Sem permissão, o item aparece para todos. */
  permissao?: string;
}

interface Props {
  area: string;
  itens: ItemMenu[];
  sairPara: string;
  /** Conteúdo fixo acima de cada página, como os avisos em tempo real. */
  extras?: ReactNode;
}

/**
 * Layout com menu lateral (UX-01, seções 4 e 5). Mostra só os itens liberados pelas permissões
 * do usuário. Em telas estreitas o menu vira um painel aberto pelo botão "Menu".
 */
export function LayoutComMenu({ area, itens, sairPara, extras }: Props) {
  const usuario = useUsuario();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const visiveis = itens.filter(
    (item) => !item.permissao || usuario?.permissoes.includes(item.permissao),
  );
  const grupos = [...new Set(visiveis.map((item) => item.grupo ?? ''))];
  const nomeEmpresa = useNomeEmpresa(usuario?.empresaId ?? null);

  return (
    <div className="layout">
      <header className="layout__topo">
        <button
          type="button"
          className="layout__abrir-menu"
          aria-expanded={aberto}
          aria-controls="menu-principal"
          onClick={() => setAberto((a) => !a)}
        >
          Menu
        </button>
        <p className="layout__marca">
          Jaguara <span>{area}</span>
        </p>
        {nomeEmpresa && <p className="layout__empresa">{nomeEmpresa}</p>}
        <div className="layout__usuario">
          <span>{usuario?.perfil}</span>
          <button
            type="button"
            className="layout__sair"
            onClick={() => void sessao.sair().then(() => navegar(sairPara))}
          >
            Sair
          </button>
        </div>
      </header>
      <nav
        id="menu-principal"
        aria-label="Menu principal"
        className={`layout__menu${aberto ? ' layout__menu--aberto' : ''}`}
      >
        {grupos.map((grupo) => (
          <div key={grupo || 'topo'} className="layout__grupo">
            {grupo && <p className="layout__grupo-titulo">{grupo}</p>}
            <ul>
              {visiveis
                .filter((item) => (item.grupo ?? '') === grupo)
                .map((item) => (
                  <li key={item.caminho}>
                    <NavLink to={item.caminho} end onClick={() => setAberto(false)}>
                      {item.rotulo}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <main className="layout__conteudo">
        <BarraDemonstracao />
        {extras}
        <Outlet />
      </main>
    </div>
  );
}

/** Nome fantasia da empresa do usuário, para o topo mostrar de quem é o sistema. */
function useNomeEmpresa(empresaId: string | null): string | null {
  const [nome, setNome] = useState<string | null>(null);
  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}', { params: { path: { empresaId } } })
      .then(({ data }) => {
        if (ativo && data) setNome(data.nomeFantasia ?? null);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [empresaId]);
  return nome;
}
