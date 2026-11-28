import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import { MOTIVO, SECAO, TIPO_ITEM, dataBr } from './pets';
import '../admin/admin.css';
import './pets.css';

type Perfil = components['schemas']['PerfilPetEmpresa'];
type Item = components['schemas']['ItemLinhaDoTempo'];
type Gravidade = 'LEVE' | 'MODERADA' | 'GRAVE';
type TipoAlergia = 'ALERGIA' | 'RESTRICAO_ALIMENTAR' | 'RESTRICAO_MEDICAMENTOSA' | 'OUTRA';
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const GRAVIDADE: Record<string, string> = { LEVE: 'leve', MODERADA: 'moderada', GRAVE: 'grave' };

/**
 * Perfil do pet para a empresa (UC-22, RN26): só as seções liberadas pelo tutor, a linha do
 * tempo (UC-35) e, com a edição clínica liberada, o registro de exames (UC-36) e alergias (UC-37).
 */
export function PerfilPet() {
  const { petId = '' } = useParams();
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('atendimento:editar') ?? false;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [linha, setLinha] = useState<Item[] | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);
  const [exame, setExame] = useState({ tipo: '', data: '', resultado: '' });
  const [alergia, setAlergia] = useState<{ tipo: TipoAlergia; descricao: string; gravidade: Gravidade }>({
    tipo: 'ALERGIA',
    descricao: '',
    gravidade: 'LEVE',
  });

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void Promise.all([
      api.GET('/empresas/{empresaId}/pets/{petId}/perfil', { params: { path: { empresaId, petId } } }),
      api.GET('/pets/{petId}/linha-do-tempo', { params: { path: { petId } } }),
    ]).then(([p, l]) => {
      if (!ativo) return;
      setErro(p.error ? mensagemDoErro(p.error) : null);
      setPerfil(p.data ?? null);
      // Sem o escopo LINHA_DO_TEMPO a API nega (CT-35-02) e a seção não aparece.
      setLinha(l.data ?? null);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, petId, versao]);

  async function registrarExame(evento: FormEvent) {
    evento.preventDefault();
    const { error } = await api.POST('/pets/{petId}/exames', {
      params: { path: { petId } },
      body: {
        tipoExame: exame.tipo,
        dataRealizacao: exame.data,
        ...(exame.resultado ? { resultado: exame.resultado } : {}),
      },
    });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Exame não registrado', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: 'Exame registrado' },
    );
    if (!error) {
      setExame({ tipo: '', data: '', resultado: '' });
      setVersao((v) => v + 1);
    }
  }

  async function registrarAlergia(evento: FormEvent) {
    evento.preventDefault();
    const { error } = await api.POST('/pets/{petId}/alergias', { params: { path: { petId } }, body: alergia });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Alergia não registrada', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: 'Alergia registrada' },
    );
    if (!error) {
      setAlergia({ tipo: 'ALERGIA', descricao: '', gravidade: 'LEVE' });
      setVersao((v) => v + 1);
    }
  }

  if (erro) {
    return (
      <div className="pagina">
        <p>
          <Link to="/pets">‹ Pets vinculados</Link>
        </p>
        <Alerta tipo="erro" titulo="Perfil indisponível" mensagem={erro} />
      </div>
    );
  }
  if (!perfil) return <p role="status">Carregando…</p>;

  const graves = (perfil.alergias ?? []).filter((a) => a.gravidade === 'GRAVE');
  const liberada = (s: string) => perfil.secoes.includes(s as never);

  return (
    <div className="pagina">
      <p>
        <Link to="/pets">‹ Pets vinculados</Link>
      </p>
      <div className="pets__cabecalho">
        {perfil.fotoUrl ? (
          <img className="pets__foto" src={perfil.fotoUrl} alt={`Foto de ${perfil.nome}`} />
        ) : (
          <span className="pets__foto pets__foto--vazia" aria-hidden="true">
            {perfil.nome.charAt(0).toUpperCase()}
          </span>
        )}
        <h1>{perfil.nome}</h1>
      </div>
      <p>
        {perfil.especie} · {perfil.raca} · {perfil.sexo === 'FEMEA' ? 'Fêmea' : 'Macho'}
        {perfil.idade !== undefined ? ` · ${perfil.idade} ${perfil.idade === 1 ? 'ano' : 'anos'}` : ''}
      </p>
      <p className="pets__etiquetas">
        {perfil.motivos.map((m) => (
          <span key={m} className="pets__etiqueta">
            {MOTIVO[m] ?? m}
          </span>
        ))}
      </p>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {graves.map((a) => (
        <div key={a.descricao} className="perfil__destaque" role="alert">
          <strong>Atenção: alergia grave</strong> · {a.descricao}
        </div>
      ))}
      {perfil.secoes.length === 0 && (
        <Alerta
          tipo="info"
          titulo="O tutor liberou só o perfil básico"
          mensagem="Peça ao tutor para compartilhar as seções de saúde pelo app."
        />
      )}

      <div className="perfil__grade">
        {liberada('vacinas') && (
          <Cartao titulo={SECAO.vacinas}>
            {perfil.vacinas?.length ? (
              <ul className="perfil__lista">
                {perfil.vacinas.map((v, i) => (
                  <li key={i}>
                    {v.nomeVacina} · {dataBr(v.dataAplicacao)}
                    {v.dataProximaDose ? ` · próxima ${dataBr(v.dataProximaDose)}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma vacina registrada.</p>
            )}
          </Cartao>
        )}
        {liberada('exames') && (
          <Cartao titulo={SECAO.exames}>
            {perfil.exames?.length ? (
              <ul className="perfil__lista">
                {perfil.exames.map((e, i) => (
                  <li key={i}>
                    {e.tipoExame} · {dataBr(e.dataRealizacao)}
                    {e.resultado ? ` · ${e.resultado}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum exame registrado.</p>
            )}
          </Cartao>
        )}
        {liberada('medicamentos') && (
          <Cartao titulo={SECAO.medicamentos}>
            {perfil.medicamentos?.length ? (
              <ul className="perfil__lista">
                {perfil.medicamentos.map((m, i) => (
                  <li key={i}>
                    {m.medicamento} · {m.dosagem} · {m.status === 'ATIVO' ? 'em uso' : 'encerrado'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum medicamento registrado.</p>
            )}
          </Cartao>
        )}
        {liberada('alergias') && (
          <Cartao titulo={SECAO.alergias}>
            {perfil.alergias?.length ? (
              <ul className="perfil__lista">
                {perfil.alergias.map((a, i) => (
                  <li key={i}>
                    {a.descricao} ({GRAVIDADE[a.gravidade ?? ''] ?? a.gravidade})
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma alergia registrada.</p>
            )}
          </Cartao>
        )}
      </div>

      {linha && (
        <Cartao titulo="Linha do tempo" subtitulo="Do mais recente ao mais antigo.">
          {linha.length === 0 ? (
            <p>Nada registrado.</p>
          ) : (
            <ol className="perfil__linha">
              {[...linha].reverse().map((i, n) => (
                <li key={`${i.referenciaId}-${n}`}>
                  <time dateTime={i.data}>{dataBr(i.data)}</time>
                  <span>
                    <strong>{TIPO_ITEM[i.tipo ?? ''] ?? i.tipo}</strong> · {i.titulo}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Cartao>
      )}

      {podeEditar && (liberada('exames') || liberada('alergias')) && (
        <div className="perfil__grade">
          {liberada('exames') && (
            <Cartao titulo="Registrar exame" subtitulo="Precisa da edição clínica liberada pelo tutor.">
              <form className="admin__formulario" onSubmit={registrarExame} aria-label="Registrar exame">
                <Campo rotulo="Exame" value={exame.tipo} onChange={(e) => setExame({ ...exame, tipo: e.target.value })} required />
                <Campo
                  rotulo="Data"
                  type="date"
                  value={exame.data}
                  onChange={(e) => setExame({ ...exame, data: e.target.value })}
                  required
                />
                <Campo rotulo="Resultado" value={exame.resultado} onChange={(e) => setExame({ ...exame, resultado: e.target.value })} />
                <Botao type="submit">Registrar exame</Botao>
              </form>
            </Cartao>
          )}
          {liberada('alergias') && (
            <Cartao titulo="Registrar alergia" subtitulo="Precisa da edição clínica liberada pelo tutor.">
              <form className="admin__formulario" onSubmit={registrarAlergia} aria-label="Registrar alergia">
                <label className="admin__selecao">
                  Tipo
                  <select value={alergia.tipo} onChange={(e) => setAlergia({ ...alergia, tipo: e.target.value as TipoAlergia })}>
                    <option value="ALERGIA">Alergia</option>
                    <option value="RESTRICAO_ALIMENTAR">Restrição alimentar</option>
                    <option value="RESTRICAO_MEDICAMENTOSA">Restrição a medicamento</option>
                    <option value="OUTRA">Outra</option>
                  </select>
                </label>
                <Campo
                  rotulo="Descrição"
                  value={alergia.descricao}
                  onChange={(e) => setAlergia({ ...alergia, descricao: e.target.value })}
                  required
                />
                <label className="admin__selecao">
                  Gravidade
                  <select
                    value={alergia.gravidade}
                    onChange={(e) => setAlergia({ ...alergia, gravidade: e.target.value as Gravidade })}
                  >
                    <option value="LEVE">Leve</option>
                    <option value="MODERADA">Moderada</option>
                    <option value="GRAVE">Grave</option>
                  </select>
                </label>
                <Botao type="submit">Registrar alergia</Botao>
              </form>
            </Cartao>
          )}
        </div>
      )}
    </div>
  );
}
