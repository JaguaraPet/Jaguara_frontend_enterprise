import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import '../admin/logs.css';

type Cliente = components['schemas']['Cliente'];
type Especie = components['schemas']['Especie'];
type Meio = 'LINK_DIGITAL' | 'ASSINATURA_PRESENCIAL';
type Aviso = { tipo: 'sucesso' | 'erro' | 'alerta'; titulo: string; mensagem?: string };

const CONSENTIMENTO: Record<string, string> = {
  PENDENTE: 'Aguardando o aceite',
  VIGENTE: 'Consentimento vigente',
  REVOGADO: 'Revogado',
};

const VAZIO = { nome: '', cpf: '', telefone: '', email: '', observacoes: '', evidencia: '' };

/** Clientes da empresa com o consentimento do termo (UC-21, RN41, ADR-010). */
export function Clientes() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('cliente:editar') ?? false;
  const [lista, setLista] = useState<Cliente[] | null>(null);
  const [especies, setEspecies] = useState<Especie[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [meio, setMeio] = useState<Meio>('LINK_DIGITAL');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [petDe, setPetDe] = useState<Cliente | null>(null);
  const [pet, setPet] = useState({ nome: '', racaId: '', sexo: 'MACHO' as 'MACHO' | 'FEMEA', castrado: false });
  const [revogando, setRevogando] = useState<Cliente | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void Promise.all([
      api.GET('/empresas/{empresaId}/clientes', { params: { path: { empresaId } } }),
      api.GET('/especies'),
    ]).then(([c, e]) => {
      if (!ativo) return;
      setLista(c.data ?? []);
      setEspecies(e.data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const { data, error } = await api.POST('/empresas/{empresaId}/clientes', {
      params: { path: { empresaId } },
      body: {
        nome: form.nome,
        meioConsentimento: meio,
        ...(form.cpf ? { cpf: form.cpf } : {}),
        ...(form.telefone ? { telefone: form.telefone } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.observacoes ? { observacoes: form.observacoes } : {}),
        ...(meio === 'ASSINATURA_PRESENCIAL' ? { evidenciaArquivoUrl: form.evidencia } : {}),
      },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Cliente não cadastrado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso(
      data?.consentimento === 'VIGENTE'
        ? { tipo: 'sucesso', titulo: `${data.nome} cadastrado`, mensagem: 'O consentimento está vigente.' }
        : {
            tipo: 'alerta',
            titulo: 'Pré-cadastro aguardando o aceite',
            mensagem:
              'Enviamos o link do termo ao contato do cliente. Até ele concordar, o cadastro guarda só nome e contato e é excluído em 7 dias.',
          },
    );
    setForm(VAZIO);
    setVersao((v) => v + 1);
  }

  async function cadastrarPet(evento: FormEvent) {
    evento.preventDefault();
    if (!petDe?.id) return;
    const { error } = await api.POST('/empresas/{empresaId}/clientes/{clienteId}/pets', {
      params: { path: { empresaId, clienteId: petDe.id } },
      body: { nome: pet.nome, racaId: pet.racaId, sexo: pet.sexo, castrado: pet.castrado },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Pet não cadastrado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: `${pet.nome} cadastrado para ${petDe.nome}` });
    setPetDe(null);
    setPet({ nome: '', racaId: '', sexo: 'MACHO', castrado: false });
  }

  async function revogar() {
    if (!revogando?.id) return;
    const { error } = await api.POST('/empresas/{empresaId}/clientes/{clienteId}/consentimento/revogacao', {
      params: { path: { empresaId, clienteId: revogando.id } },
    });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Revogação não registrada', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: 'Revogação registrada', mensagem: 'O cliente foi inativado e os dados anonimizados.' },
    );
    setRevogando(null);
    setVersao((v) => v + 1);
  }

  return (
    <div className="pagina">
      <h1>Clientes</h1>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {revogando && (
        <>
          <Alerta
            tipo="alerta"
            titulo={`Registrar a revogação de ${revogando.nome}?`}
            mensagem="Use só quando o cliente pedir. Ele é inativado e os dados são anonimizados, exceto o que a lei exige guardar."
          />
          <div className="admin__acoes">
            <Botao onClick={() => void revogar()}>Confirmar revogação</Botao>
            <Botao variante="texto" onClick={() => setRevogando(null)}>
              Cancelar
            </Botao>
          </div>
        </>
      )}

      {podeEditar && (
        <Cartao titulo="Novo cliente" subtitulo="O cliente precisa consentir com o termo da empresa (RN41).">
          <form className="admin__formulario" onSubmit={cadastrar} aria-label="Novo cliente">
            <Campo rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <Campo rotulo="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Campo rotulo="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <Campo rotulo="CPF (opcional)" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            <fieldset className="admin__eventos">
              <legend>Consentimento</legend>
              <label>
                <input type="radio" name="meio" checked={meio === 'LINK_DIGITAL'} onChange={() => setMeio('LINK_DIGITAL')} />
                Enviar o link do termo ao cliente
              </label>
              <label>
                <input
                  type="radio"
                  name="meio"
                  checked={meio === 'ASSINATURA_PRESENCIAL'}
                  onChange={() => setMeio('ASSINATURA_PRESENCIAL')}
                />
                O cliente assinou o termo no balcão
              </label>
            </fieldset>
            {meio === 'ASSINATURA_PRESENCIAL' && (
              <Campo
                rotulo="Link da cópia digitalizada do termo assinado"
                type="url"
                placeholder="https://"
                value={form.evidencia}
                onChange={(e) => setForm({ ...form, evidencia: e.target.value })}
                required
              />
            )}
            <Botao type="submit" carregando={salvando}>
              Cadastrar cliente
            </Botao>
          </form>
        </Cartao>
      )}

      {petDe && (
        <Cartao titulo={`Novo pet de ${petDe.nome}`} subtitulo="O pet passa para o tutor quando ele criar a conta.">
          <form className="admin__formulario" onSubmit={cadastrarPet} aria-label="Novo pet do cliente">
            <Campo rotulo="Nome do pet" value={pet.nome} onChange={(e) => setPet({ ...pet, nome: e.target.value })} required />
            <label className="admin__selecao">
              Raça
              <select value={pet.racaId} onChange={(e) => setPet({ ...pet, racaId: e.target.value })} required>
                <option value="">Escolha</option>
                {especies.map((esp) => (
                  <optgroup key={esp.id} label={esp.nome}>
                    {(esp.racas ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="admin__selecao">
              Sexo
              <select value={pet.sexo} onChange={(e) => setPet({ ...pet, sexo: e.target.value as 'MACHO' | 'FEMEA' })}>
                <option value="MACHO">Macho</option>
                <option value="FEMEA">Fêmea</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={pet.castrado} onChange={(e) => setPet({ ...pet, castrado: e.target.checked })} /> Castrado
            </label>
            <div className="admin__acoes">
              <Botao type="submit">Cadastrar pet</Botao>
              <Botao variante="texto" onClick={() => setPetDe(null)}>
                Cancelar
              </Botao>
            </div>
          </form>
        </Cartao>
      )}

      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhum cliente cadastrado" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Clientes" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nome</th>
                <th scope="col">Contato</th>
                <th scope="col">Conta no app</th>
                <th scope="col">Consentimento</th>
                {podeEditar && <th scope="col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>{c.codigo}</td>
                  <td>{c.nome}</td>
                  <td>{[c.email, c.telefone].filter(Boolean).join(' · ') || '-'}</td>
                  <td>{c.possuiConta ? 'Sim' : 'Não'}</td>
                  <td>
                    {CONSENTIMENTO[c.consentimento ?? ''] ?? c.consentimento}
                    {c.consentimento === 'PENDENTE' && c.linkTermo && (
                      <>
                        {' '}
                        <a href={c.linkTermo} target="_blank" rel="noreferrer">
                          link do termo
                        </a>
                      </>
                    )}
                  </td>
                  {podeEditar && (
                    <td className="admin__acoes">
                      {c.ativo && !c.possuiConta && (
                        <Botao
                          variante="secundaria"
                          disabled={c.consentimento !== 'VIGENTE'}
                          title={c.consentimento !== 'VIGENTE' ? 'Só depois do consentimento (RN41)' : undefined}
                          aria-label={`Cadastrar pet de ${c.nome}`}
                          onClick={() => setPetDe(c)}
                        >
                          Cadastrar pet
                        </Botao>
                      )}
                      {c.ativo && c.consentimento === 'VIGENTE' && (
                        <Botao variante="texto" aria-label={`Registrar revogação de ${c.nome}`} onClick={() => setRevogando(c)}>
                          Revogação
                        </Botao>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
