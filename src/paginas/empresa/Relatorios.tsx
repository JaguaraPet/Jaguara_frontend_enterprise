import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import './indicadores.css';

type Atendimentos = components['schemas']['RelatorioAtendimentos'];
type Financeiro = components['schemas']['RelatorioFinanceiro'];
type Contagem = components['schemas']['ContagemRelatorio'];
type Tipo = 'atendimentos' | 'financeiro';

const STATUS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CANCELADO: 'Cancelado',
  REALIZADO: 'Realizado',
  NAO_COMPARECEU: 'Não compareceu',
};
const METODO: Record<string, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  BOLETO: 'Boleto',
};

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function TabelaContagem({ titulo, itens, rotulo, valor }: {
  titulo: string;
  itens: Contagem[];
  rotulo?: Record<string, string>;
  valor?: boolean;
}) {
  return (
    <Cartao titulo={titulo}>
      {itens.length === 0 ? (
        <p>Sem dados no período.</p>
      ) : (
        <table className="relatorios__tabela">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Quantidade</th>
              {valor && <th scope="col">Total</th>}
            </tr>
          </thead>
          <tbody>
            {itens.map((c) => (
              <tr key={c.chave}>
                <td>{rotulo?.[c.chave] ?? c.chave}</td>
                <td>{c.quantidade}</td>
                {valor && <td>{reais(c.total ?? 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Cartao>
  );
}

/** Relatórios da empresa (UC-18, RN22): o tipo financeiro só aparece para quem tem financeiro:ler. */
export function Relatorios() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeFinanceiro = usuario?.permissoes.includes('financeiro:ler') ?? false;
  const [tipo, setTipo] = useState<Tipo>('atendimentos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [resultado, setResultado] = useState<Atendimentos | Financeiro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const parametros = () => ({ path: { empresaId, tipo }, query: { de, ate } });

  async function gerar(evento: FormEvent) {
    evento.preventDefault();
    setGerando(true);
    setErro(null);
    const { data, error } = await api.GET('/empresas/{empresaId}/relatorios/{tipo}', {
      params: parametros(),
    });
    setGerando(false);
    if (error) {
      setResultado(null);
      setErro(mensagemDoErro(error));
      return;
    }
    setResultado(typeof data === 'object' ? data : null);
  }

  async function baixarPdf() {
    setBaixando(true);
    const { data, error } = await api.GET('/empresas/{empresaId}/relatorios/{tipo}', {
      params: parametros(),
      headers: { Accept: 'application/pdf' },
      parseAs: 'blob',
    });
    setBaixando(false);
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tipo}-${de}-a-${ate}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pagina">
      <h1>Relatórios</h1>

      <form className="indicadores__filtros" onSubmit={gerar} aria-label="Gerar relatório">
        <label className="admin__selecao">
          Relatório
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            <option value="atendimentos">Atendimentos (operacional)</option>
            {podeFinanceiro && <option value="financeiro">Financeiro (gerencial)</option>}
          </select>
        </label>
        <Campo rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} required />
        <Campo rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} required />
        <Botao type="submit" carregando={gerando}>
          Gerar
        </Botao>
      </form>

      {erro && <Alerta tipo="erro" titulo="Relatório não gerado" mensagem={erro} />}

      {resultado && (
        <>
          <div className="relatorios__acoes">
            <Botao variante="secundaria" carregando={baixando} onClick={() => void baixarPdf()}>
              Baixar PDF
            </Botao>
          </div>
          {resultado.tipo === 'atendimentos' ? (
            <>
              <div className="indicadores__numeros">
                <div className="indicadores__numero">
                  <span>Agendamentos</span>
                  <strong>{resultado.total}</strong>
                </div>
                <div className="indicadores__numero">
                  <span>Comparecimento</span>
                  <strong>{resultado.taxaComparecimento.toLocaleString('pt-BR')}%</strong>
                </div>
              </div>
              <TabelaContagem titulo="Por status" itens={resultado.porStatus} rotulo={STATUS} />
              <TabelaContagem titulo="Por serviço" itens={resultado.porServico} />
              <TabelaContagem titulo="Por profissional" itens={resultado.porProfissional} />
              <Cartao titulo="Agendamentos do período">
                <table className="relatorios__tabela">
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Pet</th>
                      <th scope="col">Serviço</th>
                      <th scope="col">Profissional</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.agendamentos.map((a, i) => (
                      <tr key={`${a.dataHora}-${i}`}>
                        <td>{a.dataHora ? dataHora(a.dataHora) : '-'}</td>
                        <td>{a.pet}</td>
                        <td>{a.servico}</td>
                        <td>{a.profissional ?? '-'}</td>
                        <td>{STATUS[a.status ?? ''] ?? a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Cartao>
            </>
          ) : (
            <>
              <div className="indicadores__numeros">
                <div className="indicadores__numero">
                  <span>Faturamento</span>
                  <strong>{reais(resultado.faturamento)}</strong>
                </div>
                <div className="indicadores__numero">
                  <span>Ticket médio</span>
                  <strong>{reais(resultado.ticketMedio)}</strong>
                  <small>{resultado.pagamentosConfirmados} pagamentos confirmados</small>
                </div>
                <div className="indicadores__numero">
                  <span>Pendentes</span>
                  <strong>{reais(resultado.pendentes.total ?? 0)}</strong>
                  <small>{resultado.pendentes.quantidade ?? 0} pagamentos</small>
                </div>
              </div>
              <TabelaContagem titulo="Por serviço" itens={resultado.porServico} valor />
              <TabelaContagem titulo="Por método" itens={resultado.porMetodo} rotulo={METODO} valor />
            </>
          )}
        </>
      )}
    </div>
  );
}
