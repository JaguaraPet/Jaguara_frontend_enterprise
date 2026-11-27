import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/cliente';
import { Alerta, Botao, Campo } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { problemaNaSenha } from './senha';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Esqueci minha senha" (UC-03): pede o link por e-mail sem revelar se a conta existe (RN06). */
export function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const valor = email.trim();
    if (!EMAIL.test(valor)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setErro(undefined);
    setEnviando(true);
    const resposta = await api.POST('/auth/senha/recuperacao', { body: { email: valor } }).catch(() => null);
    setEnviando(false);
    if (!resposta || resposta.response.status >= 500) {
      setFalhou(true);
      return;
    }
    setEnviado(true);
  }

  return (
    <main className="entrar">
      <form className="entrar__cartao" onSubmit={(e) => void enviar(e)} noValidate>
        <p className="entrar__marca">Jaguara</p>
        <h1>Esqueci minha senha</h1>
        {enviado ? (
          <>
            <Alerta
              tipo="sucesso"
              titulo="Confira seu e-mail"
              mensagem="Se houver uma conta com este e-mail, enviamos um link que vale por 2 horas."
            />
            <p>
              <Link to="/entrar">Voltar para o login</Link>
            </p>
          </>
        ) : (
          <>
            <p>Informe o e-mail da conta e enviaremos o link para criar uma senha nova.</p>
            {falhou && <Alerta tipo="erro" titulo="Não foi possível enviar agora" mensagem="Tente de novo em instantes." />}
            <Campo
              rotulo="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              erro={erro}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Botao type="submit" larguraTotal carregando={enviando}>
              Enviar link
            </Botao>
            <p>
              <Link to="/entrar">Lembrei a senha</Link>
            </p>
          </>
        )}
      </form>
    </main>
  );
}

/** Nova senha pelo link do e-mail (UC-03, RN06), para empresas, funcionários e tutores. */
export function RedefinirSenha() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erroSenha, setErroSenha] = useState<string | undefined>();
  const [erroApi, setErroApi] = useState<{ titulo: string; mensagem?: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const problema = problemaNaSenha(senha) ?? (senha !== repetida ? 'As senhas não são iguais.' : null);
    setErroSenha(problema ?? undefined);
    if (problema) return;
    setSalvando(true);
    const resposta = await api.POST('/auth/senha/redefinicao', { body: { token, novaSenha: senha } }).catch(() => null);
    setSalvando(false);
    if (!resposta) {
      setErroApi({ titulo: 'Não foi possível salvar agora', mensagem: 'Tente de novo em instantes.' });
      return;
    }
    if (resposta.response.status === 410) {
      setErroApi({ titulo: 'Link inválido ou expirado', mensagem: 'O link vale por 2 horas e só pode ser usado uma vez.' });
      return;
    }
    if (resposta.error) {
      setErroApi({ titulo: 'Senha não alterada', mensagem: mensagemDoErro(resposta.error) });
      return;
    }
    setPronto(true);
  }

  return (
    <main className="entrar">
      <form className="entrar__cartao" onSubmit={(e) => void salvar(e)} noValidate>
        <p className="entrar__marca">Jaguara</p>
        <h1>Nova senha</h1>
        {!token ? (
          <>
            <Alerta tipo="erro" titulo="Link incompleto" mensagem="Abra o link do e-mail de novo ou peça outro." />
            <p>
              <Link to="/recuperar-senha">Pedir outro link</Link>
            </p>
          </>
        ) : pronto ? (
          <>
            <Alerta
              tipo="sucesso"
              titulo="Senha alterada"
              mensagem="Por segurança, as sessões abertas em outros aparelhos foram encerradas."
            />
            <p>
              Empresas e funcionários entram em <Link to="/entrar">Jaguara Enterprise</Link>. Tutores entram pelo app no
              celular.
            </p>
          </>
        ) : (
          <>
            <p>Não pode ser igual a uma das três últimas senhas.</p>
            {erroApi && <Alerta tipo="erro" titulo={erroApi.titulo} mensagem={erroApi.mensagem} />}
            {erroApi?.titulo === 'Link inválido ou expirado' && (
              <p>
                <Link to="/recuperar-senha">Pedir outro link</Link>
              </p>
            )}
            <Campo
              rotulo="Nova senha"
              type="password"
              autoComplete="new-password"
              ajuda="Pelo menos 8 caracteres, com letras e números."
              erro={erroSenha}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <Campo
              rotulo="Repita a senha"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />
            <Botao type="submit" larguraTotal carregando={salvando}>
              Salvar senha
            </Botao>
          </>
        )}
      </form>
    </main>
  );
}
