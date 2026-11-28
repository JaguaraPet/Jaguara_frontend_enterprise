import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { caminhoSite, urlEnterprise } from './enderecos';
import './site.css';

const ANO = new Date().getFullYear();

/** Cabeçalho e rodapé das páginas públicas (homepage, empresas e página de cada empresa). */
export function LayoutSite() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="site">
      <header className="site-topo">
        <div className="site-topo__conteudo">
          <Link to={caminhoSite('/')} className="site-marca" aria-label="Jaguara, página inicial">
            <span className="site-marca__icone" aria-hidden="true">
              🐾
            </span>
            Jaguara
          </Link>
          <nav aria-label="Principal" className="site-topo__nav">
            <Link to={`${caminhoSite('/')}#tutores`}>Para tutores</Link>
            <Link to={caminhoSite('/empresas')}>Para empresas</Link>
            <a className="site-topo__entrar" href={`${urlEnterprise()}/entrar`}>
              Entrar
            </a>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-rodape">
        <div className="site-rodape__conteudo">
          <div>
            <p className="site-marca site-marca--rodape">
              <span aria-hidden="true">🐾</span> Jaguara
            </p>
            <p>A vida do seu pet num lugar só, levada a qualquer clínica.</p>
          </div>
          <nav aria-label="Rodapé">
            <Link to={caminhoSite('/empresas')}>Jaguara Enterprise</Link>
            <a href="https://github.com/JaguaraPet/Jaguara_doc/tree/main/docs/08-juridico" target="_blank" rel="noreferrer">
              Termos de uso e privacidade
            </a>
            <a href="mailto:contato@jaguarapet.com.br">contato@jaguarapet.com.br</a>
          </nav>
        </div>
        <p className="site-rodape__nota">
          © {ANO} Jaguara. Projeto de TCC. Dados tratados conforme a LGPD.
        </p>
      </footer>
    </div>
  );
}
