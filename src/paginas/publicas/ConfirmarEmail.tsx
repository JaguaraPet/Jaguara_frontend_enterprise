import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { URL_API } from '../../api/config';
import { Alerta, Botao, Campo } from '../../componentes';

type Estado = 'enviando' | 'confirmado' | 'expirado' | 'erro';

async function confirmar(token: string, senha?: string) {
  return fetch(`${URL_API}/auth/confirmacao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(senha ? { token, senha } : { token }),
  });
}

function Resultado({ estado }: { estado: Exclude<Estado, 'enviando'> }) {
  if (estado === 'confirmado') {
    return (
      <>
        <Alerta tipo="sucesso" titulo="E-mail confirmado" mensagem="Sua conta está ativa." />
        <p>
          Empresas e funcionários entram em <Link to="/entrar">Jaguara Enterprise</Link>. Tutores entram pelo app no
          celular.
        </p>
      </>
    );
  }
  return (
    <Alerta
      tipo="erro"
      titulo={estado === 'expirado' ? 'Link inválido ou expirado' : 'Não foi possível confirmar agora'}
      mensagem={estado === 'expirado' ? 'O link vale por 24 horas e só pode ser usado uma vez.' : 'Tente de novo em instantes.'}
    />
  );
}

/** Link do e-mail de confirmação do cadastro (RN02). */
export function ConfirmarEmail() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const [estado, setEstado] = useState<Estado>('enviando');
  const enviado = useRef(false);

  useEffect(() => {
    // Em desenvolvimento o React monta duas vezes; o link só pode ser usado uma vez.
    if (enviado.current) return;
    enviado.current = true;
    void confirmar(token)
      .then((r) => setEstado(r.ok ? 'confirmado' : r.status === 410 ? 'expirado' : 'erro'))
      .catch(() => setEstado('erro'));
  }, [token]);

  return (
    <main className="entrar">
      <div className="entrar__cartao">
        <p className="entrar__marca">Jaguara</p>
        <h1>Confirmação de e-mail</h1>
        {estado === 'enviando' ? <p role="status">Confirmando…</p> : <Resultado estado={estado} />}
      </div>
    </main>
  );
}

/** Primeiro acesso do funcionário convidado: confirma o e-mail e cria a senha (UC-19). */
export function PrimeiroAcesso() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const [senha, setSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (senha !== repetida) {
      setErro('As senhas não são iguais.');
      return;
    }
    setEstado('enviando');
    const resposta = await confirmar(token, senha).catch(() => null);
    if (resposta?.status === 422) {
      const corpo = (await resposta.json()) as { detail?: string };
      setErro(corpo.detail ?? 'Use pelo menos 8 caracteres, com letras e números.');
      setEstado(null);
      return;
    }
    setEstado(resposta?.ok ? 'confirmado' : resposta?.status === 410 ? 'expirado' : 'erro');
  }

  return (
    <main className="entrar">
      <form className="entrar__cartao" onSubmit={(e) => void enviar(e)} noValidate>
        <p className="entrar__marca">Jaguara</p>
        <h1>Crie sua senha</h1>
        {estado && estado !== 'enviando' ? (
          <Resultado estado={estado} />
        ) : (
          <>
            <p>Você foi convidado para a equipe de uma empresa no Jaguara Enterprise.</p>
            {erro && <Alerta tipo="erro" titulo={erro} />}
            <Campo
              rotulo="Senha"
              type="password"
              autoComplete="new-password"
              ajuda="Pelo menos 8 caracteres, com letras e números."
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
            <Botao type="submit" larguraTotal carregando={estado === 'enviando'}>
              Ativar meu acesso
            </Botao>
          </>
        )}
      </form>
    </main>
  );
}
