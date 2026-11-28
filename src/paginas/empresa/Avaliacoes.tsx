import { useEffect, useState } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';
import './avaliacoes.css';

type Avaliacao = components['schemas']['Avaliacao'];
type Resumo = components['schemas']['ResumoAvaliacoes'];

/** Estrelas cheias e vazias, com o texto para leitor de tela. */
export function Estrelas({ nota, tamanho = 'normal' }: { nota: number; tamanho?: 'normal' | 'grande' }) {
  const cheias = Math.round(nota);
  return (
    <span className={`estrelas estrelas--${tamanho}`} role="img" aria-label={`${nota.toLocaleString('pt-BR')} de 5`}>
      {'★'.repeat(cheias)}
      <span className="estrelas__vazias">{'★'.repeat(5 - cheias)}</span>
    </span>
  );
}

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Avaliações que os tutores deram depois dos atendimentos, com a resposta da empresa. */
export function Avaliacoes() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeResponder = usuario?.permissoes.includes('empresa:editar') ?? false;
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [itens, setItens] = useState<Avaliacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}/avaliacoes', { params: { path: { empresaId } } })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro(mensagemDoErro(error));
        else {
          setResumo(data.resumo);
          setItens(data.itens);
        }
      });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  async function responder(avaliacaoId: string) {
    const { data, error } = await api.PUT('/empresas/{empresaId}/avaliacoes/{avaliacaoId}/resposta', {
      params: { path: { empresaId, avaliacaoId } },
      body: { resposta: texto },
    });
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setItens((lista) => lista.map((a) => (a.id === avaliacaoId ? data : a)));
    setRespondendo(null);
    setTexto('');
  }

  return (
    <div className="pagina avaliacoes">
      <div className="pagina__cabecalho">
        <div>
          <h1>Avaliações</h1>
          <p className="pagina__descricao">
            O que os tutores acharam do atendimento. A nota e os comentários aparecem no app e na sua página.
          </p>
        </div>
      </div>
      {erro && <Alerta tipo="erro" titulo="Algo deu errado" mensagem={erro} />}
      {resumo && (
        <Cartao className="avaliacoes__resumo">
          <div className="avaliacoes__media">
            <strong>{resumo.media === null ? '–' : resumo.media.toLocaleString('pt-BR')}</strong>
            {resumo.media !== null && <Estrelas nota={resumo.media} tamanho="grande" />}
            <span>
              {resumo.total} {resumo.total === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>
          <ul className="avaliacoes__barras" aria-label="Avaliações por nota">
            {[5, 4, 3, 2, 1].map((n) => {
              const qtd = resumo.distribuicao[n - 1] ?? 0;
              const pct = resumo.total ? Math.round((qtd / resumo.total) * 100) : 0;
              return (
                <li key={n}>
                  <span>{n} ★</span>
                  <span className="avaliacoes__barra">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <span>{qtd}</span>
                </li>
              );
            })}
          </ul>
        </Cartao>
      )}
      {resumo && itens.length === 0 && (
        <p className="pagina__descricao">
          Ainda não há avaliações. Depois de cada atendimento registrado, o tutor recebe um convite para avaliar.
        </p>
      )}
      <ul className="avaliacoes__lista">
        {itens.map((a) => (
          <li key={a.id} className="avaliacoes__item">
            <div className="avaliacoes__linha">
              <Estrelas nota={a.nota} />
              <span className="avaliacoes__meta">
                {a.autor} · {a.servico} de {a.pet} · {dataCurta(a.criadoEm)}
              </span>
            </div>
            {a.comentario && <p>{a.comentario}</p>}
            {a.resposta && respondendo !== a.id && (
              <p className="avaliacoes__resposta">
                <strong>Sua resposta:</strong> {a.resposta}
              </p>
            )}
            {podeResponder && respondendo !== a.id && (
              <Botao
                variante="texto"
                onClick={() => {
                  setRespondendo(a.id);
                  setTexto(a.resposta ?? '');
                }}
              >
                {a.resposta ? 'Editar resposta' : 'Responder'}
              </Botao>
            )}
            {respondendo === a.id && (
              <div className="avaliacoes__responder">
                <label className="admin__selecao">
                  Resposta pública
                  <textarea rows={3} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} />
                </label>
                <div className="avaliacoes__acoes">
                  <Botao onClick={() => void responder(a.id)}>Publicar resposta</Botao>
                  <Botao variante="secundaria" onClick={() => setRespondendo(null)}>
                    Cancelar
                  </Botao>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
