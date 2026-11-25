import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Campo } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/logs.css';
import { MOTIVO, SECAO } from './pets';
import './pets.css';

type Pet = components['schemas']['PetVinculado'];

/** Pets vinculados à empresa (UC-20, RN24): só os compartilhados, agendados ou de clientes. */
export function PetsVinculados() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api.GET('/empresas/{empresaId}/pets-vinculados', { params: { path: { empresaId } } }).then(({ data, error }) => {
      if (!ativo) return;
      setErro(!!error);
      setPets(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  const termo = busca.trim().toLowerCase();
  const visiveis = (pets ?? []).filter(
    (p) => !termo || p.nome.toLowerCase().includes(termo) || p.raca.toLowerCase().includes(termo),
  );

  return (
    <div className="pagina">
      <h1>Pets vinculados</h1>
      <p className="pets__ajuda">
        Aparecem aqui os pets que os tutores compartilharam com a empresa, os que têm agendamento e os de clientes
        cadastrados. Cada um mostra só o que o tutor liberou.
      </p>
      <div className="pets__busca">
        <Campo rotulo="Buscar por nome ou raça" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {erro && <Alerta tipo="erro" titulo="Não foi possível carregar os pets" />}
      {pets === null ? (
        <p role="status">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <Alerta tipo="info" titulo={pets.length === 0 ? 'Nenhum pet vinculado ainda' : 'Nenhum pet encontrado'} />
      ) : (
        <ul className="pets__lista">
          {visiveis.map((p) => (
            <li key={p.id}>
              <Link to={`/pets/${p.id}`} className="pets__cartao">
                <strong>{p.nome}</strong>
                <span>
                  {p.especie} · {p.raca}
                  {p.idade !== undefined ? ` · ${p.idade} ${p.idade === 1 ? 'ano' : 'anos'}` : ''}
                </span>
                <span className="pets__etiquetas">
                  {p.motivos.map((m) => (
                    <span key={m} className="pets__etiqueta">
                      {MOTIVO[m] ?? m}
                    </span>
                  ))}
                </span>
                <span className="pets__secoes">
                  {p.secoes.length === 0 ? 'Só o perfil básico' : `Liberado: ${p.secoes.map((s) => SECAO[s] ?? s).join(', ')}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
