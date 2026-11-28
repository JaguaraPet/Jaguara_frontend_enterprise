import { useEffect, useState } from 'react';
import { api } from '../../api/cliente';
import type { paths } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';

type Situacao = paths['/empresas/{empresaId}/recebimentos']['get']['responses']['200']['content']['application/json'];

/**
 * Receber pelo app: a empresa conecta a conta do Mercado Pago e os pagamentos dos tutores caem
 * direto nela, com a taxa da plataforma retida na hora.
 */
export function RecebimentoDireto() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('empresa:editar') ?? false;
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  // Volta do Mercado Pago: /pagamentos?recebimento=conectado (ou erro).
  const [retorno] = useState(() => new URLSearchParams(window.location.search).get('recebimento'));

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api.GET('/empresas/{empresaId}/recebimentos', { params: { path: { empresaId } } }).then(({ data }) => {
      if (ativo && data) setSituacao(data);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  async function conectar() {
    const { data, error } = await api.POST('/empresas/{empresaId}/recebimentos/conexao', { params: { path: { empresaId } } });
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    window.location.assign(data.urlAutorizacao);
  }

  async function desconectar() {
    const { error } = await api.DELETE('/empresas/{empresaId}/recebimentos', { params: { path: { empresaId } } });
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setVersao((v) => v + 1);
  }

  if (!situacao?.disponivel) return null;
  const taxa = situacao.taxaPercentual.toLocaleString('pt-BR');

  return (
    <Cartao titulo="Receber pelo app" subtitulo="Os pagamentos dos tutores caem direto na conta do Mercado Pago da empresa.">
      {retorno === 'conectado' && <Alerta tipo="sucesso" titulo="Conta do Mercado Pago conectada" />}
      {retorno === 'erro' && (
        <Alerta tipo="erro" titulo="A conexão não foi concluída" mensagem="Tente de novo e autorize o Jaguara na tela do Mercado Pago." />
      )}
      {erro && <Alerta tipo="erro" titulo="Algo deu errado" mensagem={erro} />}
      {situacao.conectada ? (
        <>
          <p>
            Conta {situacao.contaGatewayId} conectada
            {situacao.conectadaEm ? ` em ${new Date(situacao.conectadaEm).toLocaleDateString('pt-BR')}` : ''}. Taxa do
            Jaguara: {taxa}% por pagamento.
          </p>
          {podeEditar && (
            <Botao variante="secundaria" onClick={() => void desconectar()}>
              Desconectar
            </Botao>
          )}
        </>
      ) : (
        <>
          <p>
            Enquanto a conta não estiver conectada, o tutor não paga a sua empresa pelo app, e o pagamento é combinado
            direto com vocês. Taxa do Jaguara: {taxa}% por pagamento.
          </p>
          {podeEditar && <Botao onClick={() => void conectar()}>Conectar o Mercado Pago</Botao>}
        </>
      )}
    </Cartao>
  );
}
