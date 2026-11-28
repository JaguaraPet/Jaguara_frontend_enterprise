import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../../api/cliente';
import { Alerta, Botao, Campo } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import './seguranca.css';

interface Situacao {
  ativo: boolean;
  ativadoEm?: string;
  codigosRestantes: number;
  exigido: boolean;
}

/** Verificação em duas etapas da conta: QR Code do aplicativo autenticador e códigos de recuperação. */
export function Seguranca() {
  const [parametros] = useSearchParams();
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [configuracao, setConfiguracao] = useState<{ segredo: string; qr: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [desligando, setDesligando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/conta/dois-fatores').then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro(mensagemDoErro(error));
      else setSituacao(data);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  async function comecar() {
    setErro(null);
    const { data, error } = await api.POST('/conta/dois-fatores/configuracao');
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    const qr = await QRCode.toDataURL(data.urlOtpauth, { margin: 1, width: 220 });
    setConfiguracao({ segredo: data.segredo, qr });
  }

  async function ativar() {
    setErro(null);
    const { data, error } = await api.POST('/conta/dois-fatores/ativacao', { body: { codigo } });
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    setCodigos(data.codigosRecuperacao);
    setConfiguracao(null);
    setCodigo('');
    setVersao((v) => v + 1);
  }

  async function desligar() {
    setErro(null);
    const { error } = await api.POST('/conta/dois-fatores/desativacao', { body: { codigo } });
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setDesligando(false);
    setCodigo('');
    setVersao((v) => v + 1);
  }

  return (
    <div className="pagina seguranca">
      <div className="pagina__cabecalho">
        <div>
          <h1>Segurança da conta</h1>
          <p className="pagina__descricao">
            Com a verificação em duas etapas, além da senha a entrada pede um código que só o seu celular gera.
          </p>
        </div>
      </div>
      {parametros.get('obrigatorio') && situacao && !situacao.ativo && (
        <Alerta
          tipo="alerta"
          titulo="Ative a verificação em duas etapas para continuar"
          mensagem="A conta da empresa guarda dados de clientes e pagamentos, por isso a segunda etapa é obrigatória."
        />
      )}
      {erro && <Alerta tipo="erro" titulo="Algo deu errado" mensagem={erro} />}

      {codigos && (
        <section className="seguranca__bloco" aria-labelledby="titulo-codigos">
          <h2 id="titulo-codigos">Guarde seus códigos de recuperação</h2>
          <p>
            Cada código entra uma vez, se você perder o celular. Eles não aparecem de novo: copie ou imprima e guarde num
            lugar seguro.
          </p>
          <ul className="seguranca__codigos">
            {codigos.map((c) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ul>
          <Botao variante="secundaria" onClick={() => void navigator.clipboard?.writeText(codigos.join('\n'))}>
            Copiar códigos
          </Botao>
        </section>
      )}

      {situacao && !situacao.ativo && !configuracao && (
        <section className="seguranca__bloco">
          <h2>Verificação em duas etapas desligada</h2>
          <p>Você vai precisar de um aplicativo autenticador no celular, como Google Authenticator ou Microsoft Authenticator.</p>
          <Botao onClick={() => void comecar()}>Ativar a verificação em duas etapas</Botao>
        </section>
      )}

      {configuracao && (
        <section className="seguranca__bloco seguranca__configuracao">
          <h2>1. Leia o QR Code no aplicativo</h2>
          <img src={configuracao.qr} alt="QR Code para o aplicativo autenticador" width={220} height={220} />
          <p className="pagina__descricao">
            Não consegue ler? Digite a chave no aplicativo: <code>{configuracao.segredo}</code>
          </p>
          <h2>2. Digite o código que apareceu</h2>
          <Campo
            rotulo="Código de 6 números"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
          <Botao disabled={codigo.replace(/\D/g, '').length !== 6} onClick={() => void ativar()}>
            Confirmar e ativar
          </Botao>
        </section>
      )}

      {situacao?.ativo && (
        <section className="seguranca__bloco">
          <h2>Verificação em duas etapas ligada</h2>
          <p>
            Desde {situacao.ativadoEm ? new Date(situacao.ativadoEm).toLocaleDateString('pt-BR') : 'a ativação'}. Restam{' '}
            {situacao.codigosRestantes} códigos de recuperação.
          </p>
          {situacao.exigido ? (
            <p className="pagina__descricao">Na conta da empresa, a segunda etapa fica sempre ligada.</p>
          ) : desligando ? (
            <>
              <Campo rotulo="Código para desligar" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              <div className="seguranca__acoes">
                <Botao onClick={() => void desligar()}>Desligar</Botao>
                <Botao variante="texto" onClick={() => setDesligando(false)}>
                  Cancelar
                </Botao>
              </div>
            </>
          ) : (
            <Botao variante="secundaria" onClick={() => setDesligando(true)}>
              Desligar a verificação
            </Botao>
          )}
        </section>
      )}
    </div>
  );
}
