import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { problemaNaSenha } from './senha';
import '../admin/admin.css';
import './cadastro.css';

type Tipo = components['schemas']['CadastroEmpresa']['tipo'];
type Termo = components['schemas']['Termo'];

const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'CLINICA_VETERINARIA', rotulo: 'Clínica veterinária' },
  { valor: 'PET_SHOP', rotulo: 'Pet shop' },
  { valor: 'HOTEL_PET', rotulo: 'Hotel para pets' },
  { valor: 'CRECHE', rotulo: 'Creche' },
  { valor: 'CASA_DE_CUIDADO', rotulo: 'Casa de cuidado' },
];

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

const soNumeros = (v: string) => v.replace(/\D/g, '');

/** Cadastro da empresa Enterprise (UC-32, RN01, RN02, RN42). */
export function CadastroEmpresa() {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tipo, setTipo] = useState<Tipo>('CLINICA_VETERINARIA');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('SP');
  const [aceite, setAceite] = useState(false);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [erroSenha, setErroSenha] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api.GET('/termos/vigentes', { params: { query: { tipo: 'TERMOS_ENTERPRISE' } } }),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'POLITICA_PRIVACIDADE' } } }),
    ]).then((respostas) => setTermos(respostas.flatMap((r) => r.data ?? [])));
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    const problema = problemaNaSenha(senha) ?? (senha !== repeticao ? 'As senhas não são iguais.' : null);
    setErroSenha(problema ?? undefined);
    if (problema) return;
    if (!aceite) {
      setErro('Para continuar, aceite os termos da Enterprise e a política de privacidade.');
      return;
    }
    setEnviando(true);
    const { error } = await api.POST('/auth/cadastro/empresa', {
      body: {
        cnpj: soNumeros(cnpj),
        razaoSocial,
        nomeFantasia,
        tipo,
        email,
        senha,
        endereco: {
          cep: soNumeros(cep),
          logradouro,
          numero,
          complemento: complemento || undefined,
          bairro,
          cidade,
          uf,
        },
        aceiteTermos: true,
      },
    });
    setEnviando(false);
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setCriado(email);
  }

  if (criado) {
    return (
      <main className="entrar">
        <div className="entrar__cartao cadastro__cartao">
          <p className="entrar__marca">Jaguara</p>
          <h1>Confirme seu e-mail</h1>
          <Alerta
            tipo="sucesso"
            titulo="Cadastro recebido"
            mensagem={`Enviamos um link para ${criado}. A conta da empresa fica ativa quando você confirmar o e-mail (o link vale 24 horas).`}
          />
          <Link to="/entrar">Ir para o login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="entrar">
      <form className="entrar__cartao cadastro__cartao" onSubmit={(e) => void enviar(e)} aria-label="Cadastro da empresa">
        <p className="entrar__marca">Jaguara</p>
        <h1>Cadastrar minha empresa</h1>
        {erro && <Alerta tipo="erro" titulo="Cadastro não concluído" mensagem={erro} />}

        <fieldset className="cadastro__grupo">
          <legend>Empresa</legend>
          <Campo rotulo="Razão social" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} required />
          <Campo rotulo="Nome fantasia" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} required />
          <Campo
            rotulo="CNPJ"
            inputMode="numeric"
            ajuda="Só os números ou no formato 00.000.000/0000-00."
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            required
          />
          <label className="admin__selecao">
            Tipo de empresa
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="cadastro__grupo">
          <legend>Endereço</legend>
          <Campo rotulo="CEP" inputMode="numeric" value={cep} onChange={(e) => setCep(e.target.value)} required />
          <Campo rotulo="Logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} required />
          <div className="cadastro__linha">
            <Campo rotulo="Número" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            <Campo rotulo="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
          </div>
          <Campo rotulo="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} required />
          <div className="cadastro__linha">
            <Campo rotulo="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
            <label className="admin__selecao">
              UF
              <select value={uf} onChange={(e) => setUf(e.target.value)}>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="cadastro__grupo">
          <legend>Acesso</legend>
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Campo
            rotulo="Senha"
            type="password"
            autoComplete="new-password"
            ajuda="Pelo menos 8 caracteres, com letras e números."
            erro={erroSenha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Campo
            rotulo="Repita a senha"
            type="password"
            autoComplete="new-password"
            value={repeticao}
            onChange={(e) => setRepeticao(e.target.value)}
            required
          />
        </fieldset>

        {termos.length > 0 && (
          <div className="cadastro__termos">
            {termos.map((t) => (
              <details key={t.id}>
                <summary>
                  {t.titulo} (versão {t.versao})
                </summary>
                <p>{t.conteudo}</p>
              </details>
            ))}
          </div>
        )}
        <label className="cadastro__aceite">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          Li e aceito os termos da Enterprise e a política de privacidade
        </label>

        <Botao type="submit" larguraTotal carregando={enviando}>
          Cadastrar empresa
        </Botao>
        <div className="entrar__links">
          <Link to="/entrar">Já tenho conta</Link>
        </div>
      </form>
    </main>
  );
}
