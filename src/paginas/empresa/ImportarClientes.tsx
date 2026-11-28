import { useState } from 'react';
import { api } from '../../api/cliente';
import { Alerta, Botao, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { lerCsv, linhasDaPlanilha, MODELO_CSV, type LinhaImportacao } from './planilha';

interface Resultado {
  criados: number;
  petsCriados: number;
  ignorados: { linha: number; nome?: string; motivo: string }[];
}

const modelo = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${MODELO_CSV}`)}`;

/**
 * Importação de clientes por planilha: a empresa baixa o modelo (ou usa a própria planilha
 * salva em CSV), confere a prévia e importa de uma vez, com os pets.
 */
export function ImportarClientes({ empresaId, aoTerminar }: { empresaId: string; aoTerminar: () => void }) {
  const [linhas, setLinhas] = useState<LinhaImportacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [declarou, setDeclarou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function ler(arquivo: File) {
    setResultado(null);
    setErro(null);
    const { linhas: lidas, reconhecidas } = linhasDaPlanilha(lerCsv(await arquivo.text()));
    if (!reconhecidas.includes('nome')) {
      setLinhas(null);
      setErro('Não achamos a coluna "Nome". Use o modelo ou salve a planilha em CSV com o cabeçalho na primeira linha.');
      return;
    }
    if (lidas.length > 500) {
      setLinhas(null);
      setErro('A planilha tem mais de 500 clientes. Divida em arquivos menores.');
      return;
    }
    setLinhas(lidas);
  }

  async function importar() {
    if (!linhas) return;
    setEnviando(true);
    const { data, error } = await api.POST('/empresas/{empresaId}/clientes/importacao', {
      params: { path: { empresaId } },
      body: { declaracaoConsentimento: declarou, linhas },
    });
    setEnviando(false);
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    setResultado(data);
    setLinhas(null);
    aoTerminar();
  }

  return (
    <Cartao titulo="Importar clientes" subtitulo="Traga sua lista de clientes e pets de uma planilha (CSV).">
      <ol className="importar__passos">
        <li>
          Baixe o <a href={modelo} download="modelo-clientes-jaguara.csv">modelo de planilha</a> ou use a sua: no Excel ou
          no Google Planilhas, salve como CSV. Só a coluna Nome é obrigatória.
        </li>
        <li>
          <label className="admin__selecao">
            Escolha o arquivo CSV
            <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && void ler(e.target.files[0])} />
          </label>
        </li>
      </ol>
      {erro && <Alerta tipo="erro" titulo="Não foi possível importar" mensagem={erro} />}
      {resultado && (
        <Alerta
          tipo={resultado.ignorados.length ? 'alerta' : 'sucesso'}
          titulo={`${resultado.criados} ${resultado.criados === 1 ? 'cliente importado' : 'clientes importados'}, com ${resultado.petsCriados} ${resultado.petsCriados === 1 ? 'pet' : 'pets'}`}
          mensagem={
            resultado.ignorados.length
              ? `${resultado.ignorados.length} ${resultado.ignorados.length === 1 ? 'linha ficou' : 'linhas ficaram'} de fora: ${resultado.ignorados
                  .slice(0, 8)
                  .map((i) => `linha ${i.linha} (${i.motivo})`)
                  .join('; ')}${resultado.ignorados.length > 8 ? '…' : '.'}`
              : undefined
          }
        />
      )}
      {linhas && (
        <>
          <p className="pagina__descricao">
            {linhas.length} {linhas.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}. Confira os primeiros:
          </p>
          <div className="admin__tabela">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Pet</th>
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 5).map((l, i) => (
                  <tr key={i}>
                    <td>{l.nome || '—'}</td>
                    <td>{[l.telefone, l.email].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{l.petNome ? `${l.petNome} (${[l.petEspecie, l.petRaca].filter(Boolean).join(', ')})` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="importar__declaracao">
            <input type="checkbox" checked={declarou} onChange={(e) => setDeclarou(e.target.checked)} />
            Declaro que estes clientes autorizaram a empresa a guardar os dados deles e dos pets, conforme a LGPD. Cada um
            pode revogar quando quiser.
          </label>
          <Botao disabled={!declarou} carregando={enviando} onClick={() => void importar()}>
            Importar {linhas.length} {linhas.length === 1 ? 'cliente' : 'clientes'}
          </Botao>
        </>
      )}
    </Cartao>
  );
}
