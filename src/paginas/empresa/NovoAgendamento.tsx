import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import './novo-agendamento.css';

type Pet = components['schemas']['PetVinculado'];
type Servico = components['schemas']['Servico'];
interface Opcao {
  id: string;
  nome: string;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Agendar serviço pela empresa (UC-39, RN14, RN29): o tutor é avisado do horário marcado. */
export function NovoAgendamento() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [pets, setPets] = useState<Pet[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Opcao[]>([]);
  const [recursos, setRecursos] = useState<Opcao[]>([]);
  const [petId, setPetId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [data, setData] = useState('');
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [inicio, setInicio] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [recursoId, setRecursoId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/pets-vinculados', caminho),
      api.GET('/empresas/{empresaId}/servicos', caminho),
      api.GET('/empresas/{empresaId}/funcionarios', caminho),
      api.GET('/empresas/{empresaId}/recursos', caminho),
    ]).then(([p, s, f, r]) => {
      setPets(p.data ?? []);
      setServicos((s.data ?? []).filter((x) => x.ativo !== false));
      setProfissionais((f.data ?? []).filter((x) => x.ativo !== false).map((x) => ({ id: x.id!, nome: x.nome! })));
      setRecursos((r.data ?? []).filter((x) => x.ativo !== false).map((x) => ({ id: x.id!, nome: x.nome })));
    });
  }, [empresaId]);

  useEffect(() => {
    if (!servicoId || !data) return;
    let ativo = true;
    void api
      .GET('/servicos/{servicoId}/horarios-disponiveis', { params: { path: { servicoId }, query: { data } } })
      .then(({ data: livres }) => {
        if (ativo) setHorarios(livres ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [servicoId, data]);

  function escolherServico(id: string) {
    setServicoId(id);
    setHorarios(null);
    setInicio('');
  }

  function escolherData(valor: string) {
    setData(valor);
    setHorarios(null);
    setInicio('');
  }

  async function agendar(evento: FormEvent) {
    evento.preventDefault();
    if (!inicio) {
      setErro('Escolha um horário livre.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { error } = await api.POST('/agendamentos', {
      body: {
        petId,
        servicoId,
        dataHoraInicio: inicio,
        profissionalId: profissionalId || undefined,
        recursoId: recursoId || undefined,
      },
    });
    setSalvando(false);
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    const pet = pets.find((p) => p.id === petId)?.nome ?? 'o pet';
    setCriado(`${pet} às ${hora(inicio)} de ${new Date(inicio).toLocaleDateString('pt-BR')}`);
  }

  const servico = servicos.find((s) => s.id === servicoId);

  if (criado) {
    return (
      <div className="pagina">
        <h1>Novo agendamento</h1>
        <Alerta tipo="sucesso" titulo="Agendamento criado" mensagem={`${criado}. O tutor foi avisado.`} />
        <p className="admin__acoes">
          <Link to="/agenda">Ver a agenda</Link>
          <Botao variante="texto" onClick={() => setCriado(null)}>
            Agendar outro
          </Botao>
        </p>
      </div>
    );
  }

  return (
    <div className="pagina">
      <p>
        <Link to="/agenda">‹ Voltar para a agenda</Link>
      </p>
      <h1>Novo agendamento</h1>
      {erro && <Alerta tipo="erro" titulo="Agendamento não criado" mensagem={erro} />}

      {pets.length === 0 ? (
        <Alerta
          tipo="info"
          titulo="Nenhum pet vinculado"
          mensagem="A empresa agenda pets de clientes ou que os tutores compartilharam com ela."
        />
      ) : (
        <Cartao titulo="Dados do agendamento">
          <form className="novo-agendamento" onSubmit={agendar} aria-label="Novo agendamento">
            <label className="admin__selecao">
              Pet
              <select value={petId} onChange={(e) => setPetId(e.target.value)} required>
                <option value="">Escolha</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.especie})
                  </option>
                ))}
              </select>
            </label>
            <label className="admin__selecao">
              Serviço
              <select value={servicoId} onChange={(e) => escolherServico(e.target.value)} required>
                <option value="">Escolha</option>
                {servicos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} · {reais(s.preco)} · {s.duracaoMinutos} min
                  </option>
                ))}
              </select>
            </label>
            <Campo rotulo="Data" type="date" value={data} onChange={(e) => escolherData(e.target.value)} required />
            {profissionais.length > 0 && (
              <label className="admin__selecao">
                Profissional (opcional)
                <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
                  <option value="">Sem preferência</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {recursos.length > 0 && (
              <label className="admin__selecao">
                Recurso (opcional)
                <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {recursos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {servicoId && data && (
              <fieldset className="novo-agendamento__horarios">
                <legend>Horário{servico ? ` (${servico.duracaoMinutos} min)` : ''}</legend>
                {horarios === null ? (
                  <p role="status">Buscando horários…</p>
                ) : horarios.length === 0 ? (
                  <p>Nenhum horário livre nesta data.</p>
                ) : (
                  horarios.map((h) => (
                    <label key={h} className={h === inicio ? 'novo-agendamento__horario--escolhido' : undefined}>
                      <input
                        type="radio"
                        name="horario"
                        value={h}
                        checked={h === inicio}
                        onChange={() => setInicio(h)}
                      />
                      {hora(h)}
                    </label>
                  ))
                )}
              </fieldset>
            )}

            <Botao type="submit" carregando={salvando}>
              Agendar
            </Botao>
          </form>
        </Cartao>
      )}
    </div>
  );
}
