import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import '../admin/logs.css';
import './catalogo.css';

type Servico = components['schemas']['Servico'];
type ServicoEntrada = components['schemas']['ServicoEntrada'];
type Categoria = ServicoEntrada['categoria'];
type Recurso = components['schemas']['Recurso'];
type TipoRecurso = components['schemas']['RecursoEntrada']['tipo'];
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const CATEGORIAS: { valor: Categoria; rotulo: string }[] = [
  { valor: 'CONSULTA', rotulo: 'Consulta' },
  { valor: 'EXAME', rotulo: 'Exame' },
  { valor: 'CIRURGIA', rotulo: 'Cirurgia' },
  { valor: 'VACINACAO', rotulo: 'Vacinação' },
  { valor: 'BANHO_TOSA', rotulo: 'Banho e tosa' },
  { valor: 'HOSPEDAGEM', rotulo: 'Hospedagem' },
  { valor: 'PET_SITTER', rotulo: 'Pet sitter' },
  { valor: 'CRECHE', rotulo: 'Creche' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

const TIPOS_RECURSO: { valor: TipoRecurso; rotulo: string }[] = [
  { valor: 'SALA', rotulo: 'Sala' },
  { valor: 'EQUIPAMENTO', rotulo: 'Equipamento' },
  { valor: 'BAIA', rotulo: 'Baia' },
  { valor: 'VEICULO', rotulo: 'Veículo' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rotuloCategoria = (c: Categoria) => CATEGORIAS.find((x) => x.valor === c)?.rotulo ?? c;
const rotuloTipo = (t: TipoRecurso) => TIPOS_RECURSO.find((x) => x.valor === t)?.rotulo ?? t;

const VAZIO = { nome: '', descricao: '', categoria: 'CONSULTA' as Categoria, preco: '', duracao: '30' };

/** Catálogo de serviços e recursos da empresa (UC-38, RN27). */
export function Catalogo() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const editaServico = usuario?.permissoes.includes('servico:editar') ?? false;
  const editaRecurso = usuario?.permissoes.includes('recurso:editar') ?? false;
  const [servicos, setServicos] = useState<Servico[] | null>(null);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeRecurso, setNomeRecurso] = useState('');
  const [tipoRecurso, setTipoRecurso] = useState<TipoRecurso>('SALA');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/servicos', caminho),
      api.GET('/empresas/{empresaId}/recursos', caminho),
    ]).then(([s, r]) => {
      if (!ativo) return;
      setServicos(s.data ?? []);
      setRecursos(r.data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  function editar(s: Servico) {
    setEditandoId(s.id ?? null);
    setForm({
      nome: s.nome,
      descricao: s.descricao,
      categoria: s.categoria,
      preco: String(s.preco),
      duracao: String(s.duracaoMinutos),
    });
    setAviso(null);
  }

  function cancelar() {
    setEditandoId(null);
    setForm(VAZIO);
  }

  async function salvarServico(evento: FormEvent) {
    evento.preventDefault();
    const preco = Number(form.preco.replace(',', '.'));
    const duracaoMinutos = Number(form.duracao);
    const atual = servicos?.find((s) => s.id === editandoId);
    const corpo: ServicoEntrada = {
      nome: form.nome,
      descricao: form.descricao,
      categoria: form.categoria,
      preco,
      duracaoMinutos,
      ativo: atual?.ativo ?? true,
    };
    setSalvando(true);
    const { error } = editandoId
      ? await api.PATCH('/servicos/{servicoId}', { params: { path: { servicoId: editandoId } }, body: corpo })
      : await api.POST('/empresas/{empresaId}/servicos', { params: { path: { empresaId } }, body: corpo });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Serviço não salvo', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso(
      editandoId && atual && atual.preco !== preco
        ? {
            tipo: 'sucesso',
            titulo: 'Serviço alterado',
            mensagem: 'O preço novo vale para os próximos agendamentos; os já marcados mantêm o preço contratado.',
          }
        : { tipo: 'sucesso', titulo: editandoId ? 'Serviço alterado' : 'Serviço cadastrado' },
    );
    cancelar();
    recarregar();
  }

  async function alternarServico(s: Servico) {
    await api.PATCH('/servicos/{servicoId}', {
      params: { path: { servicoId: s.id! } },
      body: {
        nome: s.nome,
        descricao: s.descricao,
        categoria: s.categoria,
        preco: s.preco,
        duracaoMinutos: s.duracaoMinutos,
        ativo: !s.ativo,
      },
    });
    recarregar();
  }

  async function criarRecurso(evento: FormEvent) {
    evento.preventDefault();
    const { error } = await api.POST('/empresas/{empresaId}/recursos', {
      params: { path: { empresaId } },
      body: { nome: nomeRecurso, tipo: tipoRecurso, ativo: true },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Recurso não salvo', mensagem: mensagemDoErro(error) });
      return;
    }
    setNomeRecurso('');
    setAviso({ tipo: 'sucesso', titulo: 'Recurso cadastrado' });
    recarregar();
  }

  async function alternarRecurso(r: Recurso) {
    await api.PATCH('/recursos/{recursoId}', {
      params: { path: { recursoId: r.id! } },
      body: { nome: r.nome, tipo: r.tipo, ativo: !r.ativo },
    });
    recarregar();
  }

  return (
    <div className="pagina">
      <h1>Catálogo</h1>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {editaServico && (
        <Cartao titulo={editandoId ? 'Alterar serviço' : 'Novo serviço'}>
          <form className="catalogo__formulario" onSubmit={salvarServico} aria-label="Serviço">
            <Campo rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <label className="admin__selecao">
              Categoria
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <Campo
              rotulo="Preço (R$)"
              inputMode="decimal"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              required
            />
            <Campo
              rotulo="Duração (minutos)"
              type="number"
              min={5}
              step={5}
              value={form.duracao}
              onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              required
            />
            <label className="admin__selecao catalogo__descricao">
              Descrição
              <textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
              />
            </label>
            <div className="admin__acoes">
              <Botao type="submit" carregando={salvando}>
                {editandoId ? 'Salvar alteração' : 'Cadastrar serviço'}
              </Botao>
              {editandoId && (
                <Botao variante="texto" onClick={cancelar}>
                  Cancelar
                </Botao>
              )}
            </div>
          </form>
        </Cartao>
      )}

      <h2 className="admin__subtitulo">Serviços</h2>
      {servicos === null ? (
        <p role="status">Carregando…</p>
      ) : servicos.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhum serviço no catálogo" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Serviços" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Serviço</th>
                <th scope="col">Categoria</th>
                <th scope="col">Preço</th>
                <th scope="col">Duração</th>
                <th scope="col">Situação</th>
                {editaServico && <th scope="col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id}>
                  <td>{s.nome}</td>
                  <td>{rotuloCategoria(s.categoria)}</td>
                  <td>{reais(s.preco)}</td>
                  <td>{s.duracaoMinutos} min</td>
                  <td>{s.ativo ? 'Ativo' : 'Inativo'}</td>
                  {editaServico && (
                    <td className="admin__acoes">
                      <Botao variante="secundaria" onClick={() => editar(s)} aria-label={`Alterar ${s.nome}`}>
                        Alterar
                      </Botao>
                      <Botao variante="texto" onClick={() => void alternarServico(s)}>
                        {s.ativo ? 'Desativar' : 'Ativar'}
                      </Botao>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="admin__subtitulo">Recursos</h2>
      {editaRecurso && (
        <form className="catalogo__recurso" onSubmit={criarRecurso} aria-label="Novo recurso">
          <Campo rotulo="Nome do recurso" value={nomeRecurso} onChange={(e) => setNomeRecurso(e.target.value)} required />
          <label className="admin__selecao">
            Tipo
            <select value={tipoRecurso} onChange={(e) => setTipoRecurso(e.target.value as TipoRecurso)}>
              {TIPOS_RECURSO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <Botao type="submit" variante="secundaria">
            Cadastrar recurso
          </Botao>
        </form>
      )}
      {recursos.length === 0 ? (
        <p>Nenhum recurso cadastrado. Salas, equipamentos e baias evitam dois atendimentos no mesmo lugar.</p>
      ) : (
        <ul className="catalogo__recursos">
          {recursos.map((r) => (
            <li key={r.id}>
              <span>
                <strong>{r.nome}</strong> · {rotuloTipo(r.tipo)} {r.ativo ? '' : '(inativo)'}
              </span>
              {editaRecurso && (
                <Botao variante="texto" onClick={() => void alternarRecurso(r)} aria-label={`${r.ativo ? 'Desativar' : 'Ativar'} ${r.nome}`}>
                  {r.ativo ? 'Desativar' : 'Ativar'}
                </Botao>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
