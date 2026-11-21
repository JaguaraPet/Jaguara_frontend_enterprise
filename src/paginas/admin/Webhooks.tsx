import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './logs.css';
import './admin.css';

type Webhook = components['schemas']['Webhook'];
type Evento =
  | 'solicitacao.criada'
  | 'solicitacao.status_alterado'
  | 'agendamento.criado'
  | 'agendamento.cancelado'
  | 'atendimento.finalizado'
  | 'pagamento.confirmado';

const EVENTOS: { valor: Evento; rotulo: string }[] = [
  { valor: 'solicitacao.criada', rotulo: 'Solicitação criada' },
  { valor: 'solicitacao.status_alterado', rotulo: 'Solicitação respondida' },
  { valor: 'agendamento.criado', rotulo: 'Agendamento criado' },
  { valor: 'agendamento.cancelado', rotulo: 'Agendamento cancelado' },
  { valor: 'atendimento.finalizado', rotulo: 'Atendimento finalizado' },
  { valor: 'pagamento.confirmado', rotulo: 'Pagamento confirmado' },
];

/** Webhooks de saída (UC-30, RN36): só HTTPS, com assinatura HMAC-SHA256. */
export function Webhooks() {
  const [lista, setLista] = useState<Webhook[] | null>(null);
  const [erroLista, setErroLista] = useState(false);
  const [url, setUrl] = useState('');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [segredo, setSegredo] = useState<string | null>(null);

  // Cada mudança incrementa a versão e a lista é buscada de novo.
  const [versao, setVersao] = useState(0);
  const carregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let ativo = true;
    void api.GET('/admin/webhooks').then(({ data, error }) => {
      if (!ativo) return;
      setErroLista(!!error);
      setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  function marcar(evento: Evento, marcado: boolean) {
    setEventos((atuais) => (marcado ? [...atuais, evento] : atuais.filter((e) => e !== evento)));
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSegredo(null);
    if (eventos.length === 0) {
      setErro('Escolha pelo menos um evento.');
      return;
    }
    setSalvando(true);
    const { data, error } = await api.POST('/admin/webhooks', {
      body: { url, eventos, metodoAutenticacao: 'HMAC_SHA256' },
    });
    setSalvando(false);
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setSegredo(data?.segredo ?? null);
    setUrl('');
    setEventos([]);
    carregar();
  }

  async function alternar(webhook: Webhook) {
    await api.PATCH('/admin/webhooks/{webhookId}', {
      params: { path: { webhookId: webhook.id! } },
      body: { ativo: !webhook.ativo },
    });
    carregar();
  }

  return (
    <div className="pagina">
      <h1>Webhooks</h1>
      {segredo && (
        <Alerta
          tipo="sucesso"
          titulo="Webhook salvo. Guarde o segredo agora"
          mensagem={`Segredo de assinatura: ${segredo}. Ele não aparece de novo; o parceiro confere o cabeçalho X-Jaguara-Assinatura com ele.`}
        />
      )}
      {erro && <Alerta tipo="erro" titulo="Webhook não salvo" mensagem={erro} />}

      <Cartao titulo="Novo webhook" subtitulo="O parceiro recebe cada evento por POST, assinado com HMAC-SHA256.">
        <form className="admin__formulario" onSubmit={criar} aria-label="Novo webhook">
          <Campo
            rotulo="URL HTTPS do parceiro"
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <fieldset className="admin__eventos">
            <legend>Eventos</legend>
            {EVENTOS.map((ev) => (
              <label key={ev.valor}>
                <input
                  type="checkbox"
                  checked={eventos.includes(ev.valor)}
                  onChange={(e) => marcar(ev.valor, e.target.checked)}
                />
                {ev.rotulo}
              </label>
            ))}
          </fieldset>
          <Botao type="submit" carregando={salvando}>
            Salvar webhook
          </Botao>
        </form>
      </Cartao>

      {erroLista && <Alerta tipo="erro" titulo="Não foi possível carregar os webhooks" />}
      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhum webhook cadastrado" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Webhooks cadastrados" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">URL</th>
                <th scope="col">Eventos</th>
                <th scope="col">Situação</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((w) => (
                <tr key={w.id}>
                  <td>
                    <code>{w.url}</code>
                  </td>
                  <td>
                    {(w.eventos ?? [])
                      .map((e) => EVENTOS.find((ev) => ev.valor === e)?.rotulo ?? e)
                      .join(', ')}
                  </td>
                  <td>{w.ativo ? 'Ativo' : 'Desativado'}</td>
                  <td className="admin__acoes">
                    <Botao variante="texto" onClick={() => void alternar(w)}>
                      {w.ativo ? 'Desativar' : 'Ativar'}
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
