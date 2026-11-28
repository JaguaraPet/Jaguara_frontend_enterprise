import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api } from '../api/cliente';
import { ErroApi, sessao } from '../api/sessao';
import type { TipoUsuario } from '../api/sessao';
import { Alerta, Botao, Campo } from '../componentes';

interface Props {
  /** Tipos de conta que entram por esta tela. */
  tipos: TipoUsuario[];
  titulo: string;
  destino: string;
  rodape?: boolean;
}

/** Mensagem clara para cada recusa do UC-02. */
function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroApi) {
    switch (erro.problema.codigo) {
      case 'CREDENCIAIS_INVALIDAS':
        return 'E-mail ou senha incorretos.';
      case 'RN03_CONTA_BLOQUEADA':
        return 'Muitas tentativas sem sucesso. Sua conta ficou bloqueada por 5 minutos.';
      case 'RN02_EMAIL_NAO_CONFIRMADO':
        return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
      case 'CONTA_INDISPONIVEL':
        return 'Esta conta não está ativa. Fale com o administrador da empresa.';
      case 'DADOS_INVALIDOS':
        return 'Confira o e-mail e a senha.';
      case 'CODIGO_DOIS_FATORES_INVALIDO':
        return 'Código incorreto ou vencido. Digite o que aparece agora no aplicativo, ou um código de recuperação.';
    }
  }
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

/** Tela de login da web (UC-02). */
export function Entrar({ tipos, titulo, destino, rodape = true }: Props) {
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [pedeCodigo, setPedeCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const usuario = await sessao.entrar(email, senha, pedeCodigo ? codigo : undefined);
      if (!tipos.includes(usuario.tipo)) {
        await sessao.sair();
        setErro(
          usuario.tipo === 'TUTOR'
            ? 'Esta é a área das empresas. Tutores usam o app do Jaguara no celular.'
            : 'Esta conta não tem acesso a esta área.',
        );
        return;
      }
      const voltarPara = (local.state as { voltarPara?: string } | null)?.voltarPara;
      // Conta da empresa obrigada à segunda etapa e ainda sem ela: primeiro a segurança.
      if (usuario.tipo === 'EMPRESA') {
        const { data } = await api.GET('/conta/dois-fatores').catch(() => ({ data: undefined }));
        if (data?.exigido && !data.ativo) {
          void navegar('/seguranca?obrigatorio=1', { replace: true });
          return;
        }
      }
      void navegar(voltarPara ?? destino, { replace: true });
    } catch (falha) {
      if (falha instanceof ErroApi && falha.problema.codigo === 'DOIS_FATORES_NECESSARIO') {
        setPedeCodigo(true);
        return;
      }
      setErro(mensagemDoErro(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="entrar">
      <form className="entrar__cartao" onSubmit={(e) => void enviar(e)} noValidate>
        <p className="entrar__marca">Jaguara</p>
        <h1>{titulo}</h1>
        {erro && <Alerta tipo="erro" titulo={erro} />}
        <Campo
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {pedeCodigo && (
          <>
            <Alerta
              tipo="info"
              titulo="Verificação em duas etapas"
              mensagem="Abra o aplicativo autenticador e digite o código de 6 números do Jaguara. Sem o celular, use um código de recuperação."
            />
            <Campo
              rotulo="Código do aplicativo"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </>
        )}
        <Botao type="submit" larguraTotal carregando={enviando}>
          {pedeCodigo ? 'Confirmar código' : 'Entrar'}
        </Botao>
        {rodape && (
          <div className="entrar__links">
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
            <Link to="/cadastro">Cadastrar minha empresa</Link>
          </div>
        )}
        {rodape && (
          <p className="entrar__demonstracao">
            Quer conhecer antes? <Link to="/demonstracao">Experimente a demonstração</Link>
          </p>
        )}
      </form>
    </main>
  );
}
