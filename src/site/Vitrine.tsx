import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Estrelas } from '../paginas/empresa/Avaliacoes';
import '../paginas/empresa/avaliacoes.css';
import { URL_APK, urlTutor } from './enderecos';

type Vitrine = components['schemas']['VitrineEmpresa'];

const TIPO: Record<string, string> = {
  CLINICA_VETERINARIA: 'Clínica veterinária',
  PET_SHOP: 'Pet shop',
  HOTEL_PET: 'Hotel para pets',
  CRECHE: 'Creche para pets',
  CASA_DE_CUIDADO: 'Casa de cuidado',
};

const PAGAMENTO: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  DINHEIRO: 'Dinheiro',
  BOLETO: 'Boleto',
};

const reais = (v: string) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
const numero = (telefone: string) => telefone.replace(/\D/g, '');

/** Página pública de cada empresa (jaguarapet.com.br/e/{endereço}), para a bio do Instagram. */
export function Vitrine() {
  const { slug = '' } = useParams();
  const [empresa, setEmpresa] = useState<Vitrine | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    void api.GET('/publico/empresas/{slug}', { params: { path: { slug } } }).then(({ data }) => {
      if (ativo) setEmpresa(data ?? null);
    });
    return () => {
      ativo = false;
    };
  }, [slug]);

  useEffect(() => {
    if (empresa) document.title = `${empresa.nomeFantasia} · Jaguara`;
  }, [empresa]);

  if (empresa === undefined) {
    return (
      <p className="site-carregando" role="status">
        Carregando…
      </p>
    );
  }
  if (empresa === null) {
    return (
      <section className="site-secao">
        <div className="site-secao__conteudo site-vazio">
          <h1>Página não encontrada</h1>
          <p>Confira o endereço com a empresa.</p>
        </div>
      </section>
    );
  }

  const endereco = `${empresa.enderecoLogradouro}, ${empresa.enderecoNumero} · ${empresa.enderecoBairro}, ${empresa.enderecoCidade} - ${empresa.enderecoUf}`;
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${empresa.nomeFantasia} ${endereco}`)}`;

  return (
    <article className="site-vitrine">
      <header className="site-vitrine__topo">
        <div className="site-secao__conteudo site-vitrine__cabecalho">
          <span className="site-vitrine__avatar" aria-hidden="true">
            {iniciais(empresa.nomeFantasia)}
          </span>
          <div>
            <p className="site-sobretitulo">{TIPO[empresa.tipo] ?? 'Serviços para pets'}</p>
            <h1>{empresa.nomeFantasia}</h1>
            <p className="site-vitrine__local">
              {empresa.enderecoBairro}, {empresa.enderecoCidade} - {empresa.enderecoUf}
            </p>
            {empresa.avaliacoes.media !== null && (
              <p className="site-vitrine__nota">
                <Estrelas nota={empresa.avaliacoes.media} /> {empresa.avaliacoes.media.toLocaleString('pt-BR')} ·{' '}
                {empresa.avaliacoes.total} {empresa.avaliacoes.total === 1 ? 'avaliação' : 'avaliações'}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="site-secao__conteudo site-vitrine__corpo">
        <div className="site-vitrine__principal">
          {empresa.descricao && <p className="site-vitrine__descricao">{empresa.descricao}</p>}

          <section aria-labelledby="titulo-servicos">
            <h2 id="titulo-servicos">Serviços</h2>
            {empresa.servicos.length === 0 ? (
              <p>Os serviços aparecem aqui assim que a empresa cadastrar.</p>
            ) : (
              <ul className="site-servicos">
                {empresa.servicos.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.nome}</strong>
                      <span>{s.duracaoMinutos} min</span>
                    </div>
                    <span className="site-servicos__preco">{reais(s.preco)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {empresa.avaliacoes.recentes.length > 0 && (
            <section aria-labelledby="titulo-avaliacoes">
              <h2 id="titulo-avaliacoes">O que dizem os tutores</h2>
              <ul className="avaliacoes__lista">
                {empresa.avaliacoes.recentes.map((a) => (
                  <li key={a.id} className="avaliacoes__item">
                    <div className="avaliacoes__linha">
                      <Estrelas nota={a.nota} />
                      <span className="avaliacoes__meta">
                        {a.autor} · {a.servico}
                      </span>
                    </div>
                    <p>{a.comentario}</p>
                    {a.resposta && (
                      <p className="avaliacoes__resposta">
                        <strong>Resposta da empresa:</strong> {a.resposta}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {empresa.politicaCancelamento && (
            <section aria-labelledby="titulo-cancelamento">
              <h2 id="titulo-cancelamento">Cancelamento</h2>
              <p>{empresa.politicaCancelamento}</p>
            </section>
          )}
        </div>

        <aside className="site-vitrine__lateral">
          <div className="site-cartao site-vitrine__agendar">
            <h2>Agende pelo app</h2>
            <p>Veja os horários livres, receba o lembrete e guarde a carteira do seu pet.</p>
            <a className="site-botao site-botao--largo" href={urlTutor()}>
              Agendar
            </a>
            {URL_APK && (
              <a className="site-botao site-botao--contorno site-botao--largo" href={URL_APK}>
                Baixar o app para Android
              </a>
            )}
            {empresa.whatsapp && (
              <a
                className="site-botao site-botao--whats site-botao--largo"
                href={`https://wa.me/55${numero(empresa.whatsapp)}`}
                target="_blank"
                rel="noreferrer"
              >
                Chamar no WhatsApp
              </a>
            )}
          </div>

          <dl className="site-cartao site-vitrine__dados">
            {empresa.horarioFuncionamento && (
              <div>
                <dt>Horário</dt>
                <dd>{empresa.horarioFuncionamento}</dd>
              </div>
            )}
            <div>
              <dt>Endereço</dt>
              <dd>
                <a href={mapa} target="_blank" rel="noreferrer">
                  {endereco}
                </a>
              </dd>
            </div>
            {empresa.telefonePublico && (
              <div>
                <dt>Telefone</dt>
                <dd>
                  <a href={`tel:+55${numero(empresa.telefonePublico)}`}>{empresa.telefonePublico}</a>
                </dd>
              </div>
            )}
            {empresa.instagram && (
              <div>
                <dt>Instagram</dt>
                <dd>
                  <a href={`https://instagram.com/${empresa.instagram}`} target="_blank" rel="noreferrer">
                    @{empresa.instagram}
                  </a>
                </dd>
              </div>
            )}
            {empresa.formasPagamento.length > 0 && (
              <div>
                <dt>Pagamento</dt>
                <dd>{empresa.formasPagamento.map((f) => PAGAMENTO[f] ?? f).join(' · ')}</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
