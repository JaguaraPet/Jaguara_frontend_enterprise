import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import './horarios.css';

type Horario = components['schemas']['HorarioAtuacao'];
type Dia = Horario['diaSemana'];
interface Opcao {
  id: string;
  nome: string;
}

const DIAS: { valor: Dia; rotulo: string }[] = [
  { valor: 'SEGUNDA', rotulo: 'Segunda' },
  { valor: 'TERCA', rotulo: 'Terça' },
  { valor: 'QUARTA', rotulo: 'Quarta' },
  { valor: 'QUINTA', rotulo: 'Quinta' },
  { valor: 'SEXTA', rotulo: 'Sexta' },
  { valor: 'SABADO', rotulo: 'Sábado' },
  { valor: 'DOMINGO', rotulo: 'Domingo' },
];

/** Dono do horário no formato do select: "f:<id>" para profissional, "r:<id>" para recurso. */
const dono = (h: Horario) => (h.funcionarioId ? `f:${h.funcionarioId}` : `r:${h.recursoId}`);

/** Horários de atuação dos profissionais e recursos (UC-24, RN29). */
export function Horarios() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('recurso:editar') ?? false;
  const [profissionais, setProfissionais] = useState<Opcao[]>([]);
  const [recursos, setRecursos] = useState<Opcao[]>([]);
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  const [selecionado, setSelecionado] = useState('');
  const [dia, setDia] = useState<Dia>('SEGUNDA');
  const [inicio, setInicio] = useState('08:00');
  const [fim, setFim] = useState('18:00');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!empresaId) return;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/funcionarios', caminho),
      api.GET('/empresas/{empresaId}/recursos', caminho),
    ]).then(([f, r]) => {
      const pessoas = (f.data ?? []).filter((p) => p.ativo !== false).map((p) => ({ id: p.id!, nome: p.nome! }));
      const coisas = (r.data ?? []).filter((x) => x.ativo !== false).map((x) => ({ id: x.id!, nome: x.nome }));
      setProfissionais(pessoas);
      setRecursos(coisas);
      setSelecionado((atual) => atual || (pessoas[0] ? `f:${pessoas[0].id}` : coisas[0] ? `r:${coisas[0].id}` : ''));
    });
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api.GET('/empresas/{empresaId}/horarios-atuacao', { params: { path: { empresaId } } }).then(({ data }) => {
      if (ativo) setHorarios(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    if (!selecionado) return;
    const [tipo, id] = selecionado.split(':');
    setSalvando(true);
    const { error } = await api.POST('/empresas/{empresaId}/horarios-atuacao', {
      params: { path: { empresaId } },
      body: {
        diaSemana: dia,
        horaInicio: inicio,
        horaFim: fim,
        ...(tipo === 'f' ? { funcionarioId: id } : { recursoId: id }),
      } as components['schemas']['HorarioAtuacaoEntrada'],
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Horário não salvo', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Horário salvo' });
    setVersao((v) => v + 1);
  }

  async function remover(h: Horario) {
    await api.DELETE('/horarios-atuacao/{horarioId}', { params: { path: { horarioId: h.id! } } });
    setVersao((v) => v + 1);
  }

  const doSelecionado = (horarios ?? []).filter((h) => dono(h) === selecionado);
  const nenhumDono = profissionais.length === 0 && recursos.length === 0;

  return (
    <div className="pagina">
      <h1>Horários de atuação</h1>

      {nenhumDono ? (
        <Alerta
          tipo="info"
          titulo="Cadastre profissionais ou recursos primeiro"
          mensagem="Os horários de atuação são de cada profissional ou recurso da empresa."
        />
      ) : (
        <label className="admin__selecao horarios__dono">
          Profissional ou recurso
          <select value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
            {profissionais.length > 0 && (
              <optgroup label="Profissionais">
                {profissionais.map((p) => (
                  <option key={p.id} value={`f:${p.id}`}>
                    {p.nome}
                  </option>
                ))}
              </optgroup>
            )}
            {recursos.length > 0 && (
              <optgroup label="Recursos">
                {recursos.map((r) => (
                  <option key={r.id} value={`r:${r.id}`}>
                    {r.nome}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {podeEditar && selecionado && (
        <Cartao titulo="Novo horário" subtitulo="Horários do mesmo profissional ou recurso não podem se sobrepor.">
          <form className="horarios__formulario" onSubmit={adicionar} aria-label="Novo horário">
            <label className="admin__selecao">
              Dia
              <select value={dia} onChange={(e) => setDia(e.target.value as Dia)}>
                {DIAS.map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin__selecao">
              Início
              <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </label>
            <label className="admin__selecao">
              Fim
              <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} required />
            </label>
            <Botao type="submit" carregando={salvando}>
              Adicionar
            </Botao>
          </form>
        </Cartao>
      )}

      {horarios === null ? (
        <p role="status">Carregando…</p>
      ) : (
        selecionado && (
          <ul className="horarios__semana" aria-label="Horários da semana">
            {DIAS.map((d) => {
              const doDia = doSelecionado
                .filter((h) => h.diaSemana === d.valor)
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
              return (
                <li key={d.valor}>
                  <strong>{d.rotulo}</strong>
                  {doDia.length === 0 ? (
                    <span className="horarios__vazio">Sem atendimento</span>
                  ) : (
                    <ul>
                      {doDia.map((h) => (
                        <li key={h.id}>
                          {h.horaInicio} às {h.horaFim}
                          {podeEditar && (
                            <Botao
                              variante="texto"
                              onClick={() => void remover(h)}
                              aria-label={`Remover ${d.rotulo} ${h.horaInicio} às ${h.horaFim}`}
                            >
                              Remover
                            </Botao>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
