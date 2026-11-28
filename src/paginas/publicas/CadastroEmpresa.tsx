import { useEffect, useRef, useState } from 'react';
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
const formatarCnpj = (v: string) => soNumeros(v).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const formatarCep = (v: string) => soNumeros(v).replace(/^(\d{5})(\d{3})$/, '$1-$2');

/** O cadastro em quatro etapas curtas, em vez de um formulário longo (UX-02). */
const ETAPAS = ['Empresa', 'Endereço', 'Seu acesso', 'Revisão'] as const;

/** Cadastro da empresa Enterprise (UC-32, RN01, RN02, RN42). */
type ConsultaCnpj = components['schemas']['ConsultaCnpj'];

export function CadastroEmpresa() {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [consulta, setConsulta] = useState<ConsultaCnpj | null>(null);
  const [contestacao, setContestacao] = useState({ nome: '', email: '', mensagem: '' });
  const [contestado, setContestado] = useState(false);
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
  const [etapa, setEtapa] = useState(0);
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    void Promise.all([
      api.GET('/termos/vigentes', { params: { query: { tipo: 'TERMOS_ENTERPRISE' } } }),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'POLITICA_PRIVACIDADE' } } }),
    ]).then((respostas) => setTermos(respostas.flatMap((r) => r.data ?? [])));
  }, []);

  // A cada etapa, o foco vai para o título dela, para o leitor de tela anunciar onde está.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    tituloEtapa.current?.focus();
  }, [etapa]);

  /** Com os 14 números, busca o CNPJ na Receita e preenche o que der. */
  async function consultarCnpj(valor: string) {
    const numeros = soNumeros(valor);
    setConsulta(null);
    setContestado(false);
    if (numeros.length !== 14) return;
    const { data } = await api.GET('/publico/cnpj/{cnpj}', { params: { path: { cnpj: numeros } } });
    if (!data) return;
    setConsulta(data);
    if (data.encontrado && !data.jaCadastrado) {
      if (data.razaoSocial) setRazaoSocial(data.razaoSocial);
      if (data.nomeFantasia && !nomeFantasia) setNomeFantasia(data.nomeFantasia);
      const e = data.endereco;
      if (e) {
        setCep(e.cep ?? '');
        setLogradouro(e.logradouro ?? '');
        setNumero(e.numero ?? '');
        setComplemento(e.complemento ?? '');
        setBairro(e.bairro ?? '');
        setCidade(e.cidade ?? '');
        if (e.uf) setUf(e.uf);
      }
    }
  }

  async function contestar() {
    const { error } = await api.POST('/publico/cnpj/{cnpj}/contestacao', {
      params: { path: { cnpj: soNumeros(cnpj) } },
      body: contestacao,
    });
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    setContestado(true);
  }

  function irPara(destino: number) {
    setErro(null);
    setEtapa(destino);
  }

  /** O que falta na etapa atual para seguir, ou null. */
  function problemaNaEtapa(): string | null {
    const vazio = (v: string) => !v.trim();
    if (etapa === 0) {
      if (soNumeros(cnpj).length !== 14) return 'Informe o CNPJ com os 14 números.';
      if (vazio(razaoSocial) || vazio(nomeFantasia)) return 'Preencha a razão social e o nome fantasia.';
    }
    if (etapa === 1) {
      if (soNumeros(cep).length !== 8) return 'Informe o CEP com os 8 números.';
      if (vazio(logradouro) || vazio(numero) || vazio(bairro) || vazio(cidade)) {
        return 'Preencha o logradouro, o número, o bairro e a cidade.';
      }
    }
    if (etapa === 2) {
      if (vazio(responsavel)) return 'Informe o seu nome completo.';
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Informe um e-mail válido.';
      const problema = problemaNaSenha(senha) ?? (senha !== repeticao ? 'As senhas não são iguais.' : null);
      setErroSenha(problema ?? undefined);
      if (problema) return 'Confira a senha.';
    }
    return null;
  }

  async function avancar(evento: FormEvent) {
    evento.preventDefault();
    const problema = problemaNaEtapa();
    setErro(problema);
    if (problema) return;
    if (etapa < ETAPAS.length - 1) {
      setEtapa(etapa + 1);
      return;
    }
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
        email: email.trim(),
        senha,
        responsavelNome: responsavel.trim() || undefined,
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
    setCriado(email.trim());
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
          <Alerta
            tipo="info"
            titulo="Sobre a verificação da empresa"
            mensagem="Se o seu nome está no quadro de sócios do CNPJ, a empresa já aparece para os tutores. Senão, você já pode montar serviços, agenda e equipe, e a equipe Jaguara confere o CNPJ em até 1 dia útil antes de a empresa aparecer no app."
          />
          <Link to="/entrar">Ir para o login</Link>
        </div>
      </main>
    );
  }

  const passo = ETAPAS[etapa];
  const bloqueadoPeloCnpj = !!consulta && (!consulta.elegivel || consulta.jaCadastrado);

  return (
    <main className="entrar">
      <div className="entrar__cartao cadastro__cartao">
        <p className="entrar__marca">Jaguara</p>
        <h1>Cadastrar minha empresa</h1>
        <ol className="cadastro__etapas" aria-label="Etapas do cadastro">
          {ETAPAS.map((nome, i) => (
            <li
              key={nome}
              className={i < etapa ? 'cadastro__etapa--feita' : i === etapa ? 'cadastro__etapa--atual' : undefined}
              aria-current={i === etapa ? 'step' : undefined}
            >
              <span className="cadastro__etapa-numero" aria-hidden="true">
                {i + 1}
              </span>
              <span className="cadastro__etapa-nome">{nome}</span>
            </li>
          ))}
        </ol>

        <form
          className="cadastro__passo"
          onSubmit={(e) => void avancar(e)}
          aria-label={`Cadastro da empresa: ${passo}`}
          noValidate
        >
          <h2 ref={tituloEtapa} tabIndex={-1} className="cadastro__titulo-etapa">
            {etapa + 1}. {passo}
          </h2>
          {erro && <Alerta tipo="erro" titulo="Cadastro não concluído" mensagem={erro} />}

          {etapa === 0 && (
            <>
              <Campo
                rotulo="CNPJ"
                inputMode="numeric"
                ajuda="Buscamos os dados na Receita Federal. Só CNPJ ativo e do ramo pet pode se cadastrar."
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                onBlur={(e) => void consultarCnpj(e.target.value)}
                required
              />
              {consulta?.encontrado && consulta.elegivel && (
                <Alerta
                  tipo="sucesso"
                  titulo={`CNPJ ${consulta.situacao?.toLowerCase() ?? 'ativo'}`}
                  mensagem={consulta.atividade ? `Atividade: ${consulta.atividade}.` : undefined}
                />
              )}
              {consulta && !consulta.elegivel && !consulta.jaCadastrado && (
                <Alerta tipo="erro" titulo="Este CNPJ não pode se cadastrar" mensagem={consulta.motivo} />
              )}
              {consulta?.jaCadastrado &&
                (contestado ? (
                  <Alerta
                    tipo="sucesso"
                    titulo="Pedido recebido"
                    mensagem="A equipe Jaguara vai conferir os documentos e falar com você pelo e-mail informado."
                  />
                ) : (
                  <div className="cadastro__contestacao">
                    <Alerta
                      tipo="alerta"
                      titulo="Este CNPJ já está cadastrado. É seu?"
                      mensagem="Se você é dono ou sócio e não fez este cadastro, conte para a gente. A equipe Jaguara analisa e resolve."
                    />
                    <Campo
                      rotulo="Seu nome"
                      value={contestacao.nome}
                      onChange={(e) => setContestacao({ ...contestacao, nome: e.target.value })}
                    />
                    <Campo
                      rotulo="Seu e-mail"
                      type="email"
                      value={contestacao.email}
                      onChange={(e) => setContestacao({ ...contestacao, email: e.target.value })}
                    />
                    <label className="admin__selecao">
                      Como você se liga à empresa?
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={contestacao.mensagem}
                        onChange={(e) => setContestacao({ ...contestacao, mensagem: e.target.value })}
                      />
                    </label>
                    <Botao
                      type="button"
                      variante="secundaria"
                      disabled={!contestacao.nome || !contestacao.email || !contestacao.mensagem}
                      onClick={() => void contestar()}
                    >
                      Enviar pedido
                    </Botao>
                  </div>
                ))}
              <Campo rotulo="Razão social" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} required />
              <Campo rotulo="Nome fantasia" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} required />
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
            </>
          )}

          {etapa === 1 && (
            <>
              {consulta?.endereco && (
                <p className="cadastro__nota">
                  Trouxemos o endereço do CNPJ. Confira e ajuste se a empresa atende em outro lugar.
                </p>
              )}
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
            </>
          )}

          {etapa === 2 && (
            <>
              <Campo
                rotulo="Seu nome completo"
                ajuda="Se estiver no quadro de sócios do CNPJ, a empresa é verificada na hora."
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
              />
              <Campo
                rotulo="E-mail"
                type="email"
                autoComplete="email"
                ajuda="É com ele que você entra no Jaguara Enterprise."
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
            </>
          )}

          {etapa === 3 && (
            <>
              <dl className="cadastro__resumo">
                <div>
                  <dt>Empresa</dt>
                  <dd>
                    {nomeFantasia} · {TIPOS.find((t) => t.valor === tipo)?.rotulo}
                    <br />
                    {razaoSocial} · CNPJ {formatarCnpj(cnpj)}
                  </dd>
                  <Botao variante="texto" onClick={() => irPara(0)} aria-label="Alterar os dados da empresa">
                    Alterar
                  </Botao>
                </div>
                <div>
                  <dt>Endereço</dt>
                  <dd>
                    {logradouro}, {numero}
                    {complemento ? ` · ${complemento}` : ''} · {bairro}
                    <br />
                    {cidade}/{uf} · CEP {formatarCep(cep)}
                  </dd>
                  <Botao variante="texto" onClick={() => irPara(1)} aria-label="Alterar o endereço">
                    Alterar
                  </Botao>
                </div>
                <div>
                  <dt>Seu acesso</dt>
                  <dd>
                    {responsavel}
                    <br />
                    {email}
                  </dd>
                  <Botao variante="texto" onClick={() => irPara(2)} aria-label="Alterar o acesso">
                    Alterar
                  </Botao>
                </div>
              </dl>
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
            </>
          )}

          <div className="cadastro__acoes">
            {etapa > 0 && (
              <Botao variante="secundaria" onClick={() => irPara(etapa - 1)}>
                Voltar
              </Botao>
            )}
            <Botao type="submit" carregando={enviando} disabled={etapa === 0 && bloqueadoPeloCnpj}>
              {etapa === ETAPAS.length - 1 ? 'Cadastrar empresa' : 'Continuar'}
            </Botao>
          </div>
        </form>
        <div className="entrar__links">
          <Link to="/entrar">Já tenho conta</Link>
        </div>
      </div>
    </main>
  );
}
