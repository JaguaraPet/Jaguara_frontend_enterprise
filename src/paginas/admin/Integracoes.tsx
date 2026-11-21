import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './logs.css';
import './admin.css';

type Integracao = components['schemas']['Integracao'];
type Tipo = NonNullable<Integracao['tipo']>;

const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'CALENDARIO', rotulo: 'Calendário' },
  { valor: 'PAGAMENTO', rotulo: 'Pagamento' },
  { valor: 'PLATAFORMA_VETERINARIA', rotulo: 'Plataforma veterinária' },
  { valor: 'NOTIFICACAO', rotulo: 'Notificação' },
  { valor: 'OUTRA', rotulo: 'Outra' },
];

const rotuloTipo = (tipo?: Tipo) => TIPOS.find((t) => t.valor === tipo)?.rotulo ?? '-';

/** Integrações com provedores externos (UC-27, RN33): credenciais cifradas, nunca exibidas. */
export function Integracoes() {
  const [lista, setLista] = useState<Integracao[] | null>(null);
  const [erroLista, setErroLista] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro' | 'alerta'; titulo: string; mensagem?: string } | null>(
    null,
  );
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Tipo>('CALENDARIO');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [credenciais, setCredenciais] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Cada mudança incrementa a versão e a lista é buscada de novo.
  const [versao, setVersao] = useState(0);
  const carregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let ativo = true;
    void api.GET('/admin/integracoes').then(({ data, error }) => {
      if (!ativo) return;
      setErroLista(!!error);
      setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const { error } = await api.POST('/admin/integracoes', {
      body: { nome, tipo, endpointUrl, credenciais },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Integração não salva', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Integração salva', mensagem: 'As credenciais foram guardadas cifradas.' });
    setNome('');
    setEndpointUrl('');
    setCredenciais('');
    carregar();
  }

  async function testar(integracao: Integracao) {
    const { data } = await api.POST('/admin/integracoes/{integracaoId}/teste', {
      params: { path: { integracaoId: integracao.id! } },
    });
    setAviso(
      data?.ok
        ? { tipo: 'sucesso', titulo: `${integracao.nome}: serviço no ar`, mensagem: data.detalhe }
        : { tipo: 'alerta', titulo: `${integracao.nome}: serviço sem resposta`, mensagem: data?.detalhe },
    );
  }

  async function alternar(integracao: Integracao) {
    await api.PATCH('/admin/integracoes/{integracaoId}', {
      params: { path: { integracaoId: integracao.id! } },
      body: { ativa: !integracao.ativa },
    });
    carregar();
  }

  return (
    <div className="pagina">
      <h1>Integrações</h1>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      <Cartao titulo="Nova integração" subtitulo="Use o endereço HTTPS do provedor e a chave de acesso.">
        <form className="admin__formulario" onSubmit={criar} aria-label="Nova integração">
          <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <label className="admin__selecao">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <Campo
            rotulo="Endereço do serviço"
            type="url"
            placeholder="https://"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            required
          />
          <Campo
            rotulo="Credenciais"
            type="password"
            autoComplete="off"
            ajuda="Guardadas cifradas; depois de salvar, não aparecem mais."
            value={credenciais}
            onChange={(e) => setCredenciais(e.target.value)}
            required
          />
          <Botao type="submit" carregando={salvando}>
            Salvar integração
          </Botao>
        </form>
      </Cartao>

      {erroLista && <Alerta tipo="erro" titulo="Não foi possível carregar as integrações" />}
      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhuma integração cadastrada" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Integrações cadastradas" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Tipo</th>
                <th scope="col">Endereço</th>
                <th scope="col">Situação</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id}>
                  <td>{i.nome}</td>
                  <td>{rotuloTipo(i.tipo)}</td>
                  <td>
                    <code>{i.endpointUrl}</code>
                  </td>
                  <td>{i.ativa ? 'Ativa' : 'Desativada'}</td>
                  <td className="admin__acoes">
                    <Botao variante="secundaria" onClick={() => void testar(i)}>
                      Testar
                    </Botao>
                    <Botao variante="texto" onClick={() => void alternar(i)}>
                      {i.ativa ? 'Desativar' : 'Ativar'}
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
