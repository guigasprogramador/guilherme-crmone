import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Helper para formatar datas para YYYY-MM-DD (se necessário para entrada/saída)
// e para converter snake_case para camelCase na resposta (reutilizar ou redefinir se necessário)
interface EtapaFromDB {
  id: string;
  licitacao_id: string;
  nome: string;
  descricao: string | null;
  data_limite: string | null;
  status: string;
  responsavel_id: string | null;
  observacoes: string | null;
  data_criacao: string;
  data_conclusao: string | null;
  responsavel_nome?: string | null;
}

interface EtapaFrontend {
  id: string;
  licitacaoId: string;
  nome: string;
  descricao?: string | null;
  dataLimite?: string | null;
  status: string;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  dataCriacao?: string;
  dataConclusao?: string | null;
}

function formatEtapaForFrontend(etapa: EtapaFromDB): EtapaFrontend {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return undefined;
    try {
      // Assegura que a data string do DB (YYYY-MM-DD ou ISO) seja corretamente interpretada como UTC
      // antes de formatar para DD/MM/YYYY.
      const date = new Date(dateStr);
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.warn(`Formato de data inválido recebido do DB: ${dateStr}`);
      return dateStr; // Retorna a string original se o parsing falhar
    }
  };
  return {
    id: etapa.id,
    licitacaoId: etapa.licitacao_id,
    nome: etapa.nome,
    descricao: etapa.descricao,
    dataLimite: formatDate(etapa.data_limite),
    status: etapa.status,
    responsavelId: etapa.responsavel_id,
    responsavelNome: etapa.responsavel_nome,
    observacoes: etapa.observacoes,
    dataCriacao: formatDate(etapa.data_criacao),
    dataConclusao: formatDate(etapa.data_conclusao),
  };
}

// GET - Obter uma etapa específica (opcional, mas bom para consistência)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; etapaId: string } } // Alterado licitacaoId para id
) {
  const { id: licitacaoId, etapaId } = params; // Renomeado id para licitacaoId
  if (!licitacaoId || !etapaId) {
    return NextResponse.json({ error: 'ID da Licitação e ID da Etapa são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const sql = `
      SELECT le.*, u.name as responsavel_nome
      FROM licitacao_etapas le
      LEFT JOIN users u ON le.responsavel_id = u.id
      WHERE le.id = ? AND le.licitacao_id = ?
    `;
    const [rows]: any = await connection.execute(sql, [etapaId, licitacaoId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Etapa não encontrada ou não pertence à licitação especificada' }, { status: 404 });
    }
    return NextResponse.json(formatEtapaForFrontend(rows[0]));
  } catch (error: any) {
    console.error('[API Licitação Etapa GET by ID]', error);
    return NextResponse.json({ error: 'Erro ao buscar etapa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}


// PUT - Atualizar uma etapa específica
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; etapaId: string } } // Alterado licitacaoId para id
) {
  const { id: licitacaoId, etapaId } = params; // Renomeado id para licitacaoId
  if (!licitacaoId || !etapaId) {
    return NextResponse.json({ error: 'ID da Licitação e ID da Etapa são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json(); // Espera camelCase
    connection = await getDbConnection();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Helper para converter DD/MM/YYYY para YYYY-MM-DD para o banco
    const parseFrontendDateToSQL = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        // Se já estiver em formato ISO ou YYYY-MM-DD, ou se for um objeto Date
        try {
            return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {
            console.warn(`Formato de data inválido para conversão SQL: ${dateStr}`);
            return null; // Ou lançar erro se a data for obrigatória e inválida
        }
    };


    // Mapear campos do frontend (camelCase) para colunas do DB (snake_case)
    // e adicionar à query de atualização apenas os campos presentes no body
    if (body.nome !== undefined) { updateFields.push('nome = ?'); updateValues.push(body.nome); }
    if (body.descricao !== undefined) { updateFields.push('descricao = ?'); updateValues.push(body.descricao); }
    if (body.dataLimite !== undefined) {
        updateFields.push('data_limite = ?');
        updateValues.push(parseFrontendDateToSQL(body.dataLimite));
    }
    if (body.status !== undefined) { updateFields.push('status = ?'); updateValues.push(body.status); }
    if (body.responsavelId !== undefined) { updateFields.push('responsavel_id = ?'); updateValues.push(body.responsavelId); }
    if (body.observacoes !== undefined) { updateFields.push('observacoes = ?'); updateValues.push(body.observacoes); }
    if (body.dataConclusao !== undefined) {
        updateFields.push('data_conclusao = ?');
        updateValues.push(parseFrontendDateToSQL(body.dataConclusao));
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    // A tabela licitacao_etapas não tem data_atualizacao no schema original.
    // Se tivesse, e não fosse ON UPDATE CURRENT_TIMESTAMP, adicionaríamos:
    // updateFields.push('data_atualizacao = NOW()');

    const sql = `UPDATE licitacao_etapas SET ${updateFields.join(', ')} WHERE id = ? AND licitacao_id = ?`;
    updateValues.push(etapaId, licitacaoId);

    const [result]: any = await connection.execute(sql, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Etapa não encontrada, não pertence à licitação ou nenhum dado alterado' }, { status: 404 });
    }

    const [updatedRows]:any = await connection.execute(
        `SELECT le.*, u.name as responsavel_nome
         FROM licitacao_etapas le
         LEFT JOIN users u ON le.responsavel_id = u.id
         WHERE le.id = ?`,
        [etapaId]
    );
    return NextResponse.json(formatEtapaForFrontend(updatedRows[0]));

  } catch (error: any) {
    console.error('[API Licitação Etapa PUT]', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') { // FK constraint error
        return NextResponse.json({ error: 'ID do responsável inválido.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao atualizar etapa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir uma etapa específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; etapaId: string } } // Alterado licitacaoId para id
) {
  const { id: licitacaoId, etapaId } = params; // Renomeado id para licitacaoId
  if (!licitacaoId || !etapaId) {
    return NextResponse.json({ error: 'ID da Licitação e ID da Etapa são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [result]: any = await connection.execute(
      'DELETE FROM licitacao_etapas WHERE id = ? AND licitacao_id = ?',
      [etapaId, licitacaoId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Etapa não encontrada ou não pertence à licitação especificada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Etapa excluída com sucesso' });
  } catch (error: any) {
    console.error('[API Licitação Etapa DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir etapa', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
