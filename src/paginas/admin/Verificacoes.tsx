import { useEffect, useState } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './admin.css';

type Pendencias = components['schemas']['PendenciasVerificacao'];

const cnpjFormatado = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

/**
 * Cadastro seguro: empresas que ficaram em verificação (quem cadastrou não está no quadro de
 * sócios) e pedidos de quem diz ser dono de um CNPJ já cadastrado.
 */
export function Verificacoes() {
  const [pendencias, setPendencias] = useState<Pendencias | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/admin/verificacoes').then(({ data, error }) => {
      if (!ativo) return;
      if (error) setAviso({ tipo: 'erro', titulo: 'Não foi possível abrir as verificações', mensagem: mensagemDoErro(error) });
      else setPendencias(data);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  async function decidir(empresaId: string, aprovada: boolean, nome: string) {
    const { error } = await api.POST('/admin/verificacoes/empresas/{empresaId}', {
      params: { path: { empresaId } },
      body: { aprovada, ...(aprovada ? {} : { motivo }) },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Decisão não registrada', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: aprovada ? `${nome} verificada` : `${nome} recusada`, mensagem: 'A empresa recebeu o aviso por e-mail.' });
    setRecusando(null);
    setMotivo('');
    setVersao((v) => v + 1);
  }

  async function resolver(id: string) {
    const { error } = await api.POST('/admin/verificacoes/contestacoes/{id}/resolucao', { params: { path: { id } } });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível resolver', mensagem: mensagemDoErro(error) });
      return;
    }
    setVersao((v) => v + 1);
  }

  return (
    <div className="pagina">
      <h1>Verificação de empresas</h1>
      <p className="pagina__descricao">
        Só empresa verificada aparece para os tutores. Confira o cartão CNPJ ou o contrato social antes de aprovar.
      </p>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {!pendencias ? (
        <p role="status">Carregando…</p>
      ) : (
        <>
          <Cartao titulo={`Empresas em verificação (${pendencias.empresas.length})`}>
            {pendencias.empresas.length === 0 ? (
              <p>Nenhuma empresa esperando.</p>
            ) : (
              <ul className="admin__lista">
                {pendencias.empresas.map((e) => (
                  <li key={e.id}>
                    <strong>{e.nomeFantasia}</strong> · {e.razaoSocial} · CNPJ {cnpjFormatado(e.cnpj)}
                    <br />
                    Responsável: {e.responsavelNome ?? 'não informado'} · {e.email}
                    {e.telefone ? ` · ${e.telefone}` : ''} · {e.enderecoCidade}-{e.enderecoUf}
                    <br />
                    <small>{e.verificacaoMotivo}</small>
                    {recusando === e.id ? (
                      <div className="admin__formulario">
                        <label className="admin__selecao">
                          Motivo da recusa
                          <textarea rows={2} maxLength={500} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
                        </label>
                        <div className="admin__acoes">
                          <Botao disabled={!motivo.trim()} onClick={() => void decidir(e.id, false, e.nomeFantasia)}>
                            Confirmar recusa
                          </Botao>
                          <Botao variante="texto" onClick={() => setRecusando(null)}>
                            Cancelar
                          </Botao>
                        </div>
                      </div>
                    ) : (
                      <div className="admin__acoes">
                        <Botao onClick={() => void decidir(e.id, true, e.nomeFantasia)}>Aprovar {e.nomeFantasia}</Botao>
                        <Botao variante="secundaria" onClick={() => setRecusando(e.id)}>
                          Recusar
                        </Botao>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo={`Contestações de CNPJ (${pendencias.contestacoes.length})`}>
            {pendencias.contestacoes.length === 0 ? (
              <p>Nenhum pedido aberto.</p>
            ) : (
              <ul className="admin__lista">
                {pendencias.contestacoes.map((c) => (
                  <li key={c.id}>
                    <strong>CNPJ {cnpjFormatado(c.cnpj)}</strong> · {c.nome} · {c.email}
                    {c.telefone ? ` · ${c.telefone}` : ''}
                    <br />
                    {c.mensagem}
                    <div className="admin__acoes">
                      <Botao variante="secundaria" onClick={() => void resolver(c.id)}>
                        Marcar como resolvida
                      </Botao>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </>
      )}
    </div>
  );
}
