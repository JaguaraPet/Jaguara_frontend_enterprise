import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { sessao } from '../api/sessao';
import { useUsuario } from '../sessao/useUsuario';
import './layout.css';

export interface ItemMenu {
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
        <ul>
          {visiveis.map((item) => (
            <li key={item.caminho}>
              <NavLink to={item.caminho} end onClick={() => setAberto(false)}>
                {item.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="layout__conteudo">
        {extras}
        <Outlet />
      </main>
    </div>
  );
}
