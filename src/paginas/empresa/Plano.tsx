import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';
import './plano.css';

type Plano = components['schemas']['PlanoDaEmpresa'];
type Nome = components['schemas']['PlanoEmpresa'];

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const SITUACAO: Record<Plano['status'], string> = {
  TESTE: 'Teste grátis',
  PENDENTE: 'Aguardando a autorização do pagamento',
  ATIVA: 'Assinatura ativa',
  ATRASADA: 'Pagamento atrasado',
  CANCELADA: 'Assinatura cancelada',
};

/** Plano da empresa: teste grátis, uso da equipe e a assinatura mensal. */
export function Plano() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [plano, setPlano] = useState<Plano | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [assinando, setAssinando] = useState<Nome | null>(null);
  const [versao, setVersao] = useState(0);
  const [parametros] = useSearchParams();
  const voltouDoPagamento = parametros.get('assinatura') === 'retorno';

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api.GET('/empresas/{empresaId}/plano', { params: { path: { empresaId } } }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro(mensagemDoErro(error));
      else setPlano(data);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  async function assinar(nome: Nome) {
    setAssinando(nome);
    setErro(null);
    const { data, error } = await api.POST('/empresas/{empresaId}/plano/assinatura', {
      params: { path: { empresaId } },
      body: { plano: nome },
    });
    setAssinando(null);
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    if (!data.ativa && data.urlPagamento) {
      window.location.assign(data.urlPagamento);
      return;
    }
    setVersao((v) => v + 1);
  }

  if (!plano) {
    return erro ? <Alerta tipo="erro" titulo="Não foi possível abrir o plano" mensagem={erro} /> : <p role="status">Carregando…</p>;
  }

  const atual = plano.planos.find((p) => p.plano === plano.plano);
  const percentual = Math.min(100, Math.round((plano.uso.usuarios / plano.limites.usuarios) * 100));

  return (
    <div className="pagina plano">
      <div className="pagina__cabecalho">
        <div>
          <h1>Plano</h1>
          <p className="pagina__descricao">O que a sua assinatura inclui e quanto da equipe já está em uso.</p>
        </div>
      </div>
      {erro && <Alerta tipo="erro" titulo="Algo deu errado" mensagem={erro} />}
      {voltouDoPagamento && plano.status === 'PENDENTE' && (
        <Alerta
          tipo="info"
          titulo="Estamos confirmando o pagamento"
          mensagem="Assim que o Mercado Pago confirmar a assinatura, o plano fica ativo. Isso costuma levar poucos minutos."
        />
      )}
      {plano.status === 'TESTE' && (
        <Alerta
          tipo={plano.diasDeTeste <= 3 ? 'alerta' : 'info'}
          titulo={
            plano.diasDeTeste > 0
              ? `Faltam ${plano.diasDeTeste} ${plano.diasDeTeste === 1 ? 'dia' : 'dias'} de teste grátis`
              : 'O teste grátis acabou'
          }
          mensagem="Assine um plano para continuar convidando a equipe. Nada do que você cadastrou se perde."
        />
      )}
      {plano.status === 'ATRASADA' && (
        <Alerta
          tipo="alerta"
          titulo="O pagamento da assinatura não passou"
          mensagem="Confira o cartão no Mercado Pago. Depois de 7 dias, a empresa não convida mais ninguém até regularizar."
        />
      )}

      <section className="plano__atual" aria-labelledby="titulo-atual">
        <div>
          <p className="plano__rotulo">{SITUACAO[plano.status]}</p>
          <h2 id="titulo-atual">Plano {atual?.nome}</h2>
          {plano.periodoAte && plano.status === 'ATIVA' && (
            <p className="pagina__descricao">Próxima cobrança em {new Date(plano.periodoAte).toLocaleDateString('pt-BR')}.</p>
          )}
        </div>
        <div className="plano__uso">
          <span>
            {plano.uso.usuarios} de {plano.limites.usuarios} usuários
          </span>
          <span
            className="plano__barra"
            role="progressbar"
            aria-valuenow={plano.uso.usuarios}
            aria-valuemin={0}
            aria-valuemax={plano.limites.usuarios}
            aria-label="Usuários em uso"
          >
            <span style={{ width: `${percentual}%` }} />
          </span>
        </div>
      </section>

      <ul className="plano__opcoes">
        {plano.planos.map((p) => {
          const eAtual = p.plano === plano.plano && plano.status === 'ATIVA';
          return (
            <li key={p.plano} className={eAtual ? 'plano__opcao plano__opcao--atual' : 'plano__opcao'}>
              <h3>{p.nome}</h3>
              <p className="plano__preco">
                {reais(p.precoMensal)}
                <span>/mês</span>
              </p>
              <p>Até {p.usuarios} usuários</p>
              <p className="pagina__descricao">{p.descricao}</p>
              {eAtual ? (
                <p className="plano__rotulo">Seu plano</p>
              ) : (
                <Botao
                  variante={p.plano === 'EQUIPE' ? 'primaria' : 'secundaria'}
                  carregando={assinando === p.plano}
                  disabled={assinando !== null}
                  onClick={() => void assinar(p.plano)}
                >
                  {plano.status === 'ATIVA' ? `Mudar para ${p.nome}` : `Assinar ${p.nome}`}
                </Botao>
              )}
            </li>
          );
        })}
      </ul>
      <p className="pagina__descricao">
        A cobrança é mensal no cartão, pelo Mercado Pago, e pode ser cancelada quando quiser. Acima de 30 usuários, fale com a
        gente.
      </p>
    </div>
  );
}
