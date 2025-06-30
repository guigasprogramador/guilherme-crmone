import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para formatar datas para YYYY-MM-DD (se necessário para entrada/saída)
// e para converter snake_case para camelCase na resposta
interface EtapaFromDB {
  id: string;
  licitacao_id: string;
  nome: string;
  descricao: string | null;
  data_limite: string | null; // Datas do DB são strings ISO ou YYYY-MM-DD
  status: string;
  responsavel_id: string | null;
  observacoes: string | null;
  data_criacao: string;
  data_conclusao: string | null;
  // Campos adicionais de JOINs, se houver (ex: nome do responsável)
  responsavel_nome?: string | null;
}

interface EtapaFrontend {
  id: string;
  licitacaoId: string;
  nome: string;
  descricao?: string | null;
  dataLimite?: string | null; // Formatado como DD/MM/YYYY ou mantido como ISO/YYYY-MM-DD
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
      // Tenta converter para objeto Date e depois para o formato desejado
      // Assumindo que o DB retorna YYYY-MM-DD ou um formato que o Date constructor entenda
      return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // DD/MM/YYYY
    } catch (e) {
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
    responsavelNome: etapa.responsavel_nome, // Se vier do JOIN
    observacoes: etapa.observacoes,
    dataCriacao: formatDate(etapa.data_criacao),
    dataConclusao: formatDate(etapa.data_conclusao),
  };
}

// GET - Listar todas as etapas de uma licitação
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Alterado para id
) {
  const { id: licitacaoId } = await params; // Renomeado id para licitacaoId
  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    // Opcional: JOIN com users para pegar o nome do responsável
    const sql = `
      SELECT le.*, u.name as responsavel_nome
      FROM licitacao_etapas le
      LEFT JOIN users u ON le.responsavel_id = u.id
      WHERE le.licitacao_id = ?
      ORDER BY le.data_limite ASC, le.data_criacao ASC
    `;
    const [rows] = await connection.execute(sql, [licitacaoId]);
    const etapas = (rows as EtapaFromDB[]).map(formatEtapaForFrontend);
    return NextResponse.json(etapas);
  } catch (error: any) {
    console.error('[API Licitação Etapas GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar etapas da licitação', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar uma nova etapa a uma licitação
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Alterado para id
) {
  const { id: licitacaoId } = await params; // Renomeado id para licitacaoId
  if (!licitacaoId) {
    return NextResponse.json({ error: 'ID da Licitação é obrigatório na URL' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json(); // Espera camelCase: nome, descricao, dataLimite, status, responsavelId, observacoes

    if (!body.nome || !body.status) {
      return NextResponse.json({ error: 'Nome da etapa e status são obrigatórios' }, { status: 400 });
    }

    // Opcional: Verificar se a licitacaoId existe
    connection = await getDbConnection();
    const [oppRows]:any = await connection.execute('SELECT id FROM licitacoes WHERE id = ?', [licitacaoId]);
    if (oppRows.length === 0) {
        return NextResponse.json({ error: 'Licitação não encontrada.' }, { status: 404 });
    }

    const newEtapaId = uuidv4();
    // Ajuste para receber data no formato DD/MM/YYYY do frontend e converter para YYYY-MM-DD para o DB
    const parseFrontendDataLimite = body.dataLimite ? body.dataLimite.split('/').reverse().join('-') : null;
    const parseFrontendDataConclusao = body.dataConclusao ? body.dataConclusao.split('/').reverse().join('-') : null;

    const dataLimiteSql = parseFrontendDataLimite ? new Date(parseFrontendDataLimite).toISOString().split('T')[0] : null;
    const dataConclusaoSql = parseFrontendDataConclusao ? new Date(parseFrontendDataConclusao).toISOString().split('T')[0] : null;


    const newEtapa = {
      id: newEtapaId,
      licitacao_id: licitacaoId,
      nome: body.nome,
      descricao: body.descricao || null,
      data_limite: dataLimiteSql,
      status: body.status,
      responsavel_id: body.responsavelId || null,
      observacoes: body.observacoes || null,
      data_conclusao: dataConclusaoSql,
    };

    await connection.execute(
      'INSERT INTO licitacao_etapas (id, licitacao_id, nome, descricao, data_limite, status, responsavel_id, observacoes, data_conclusao, data_criacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [newEtapa.id, newEtapa.licitacao_id, newEtapa.nome, newEtapa.descricao, newEtapa.data_limite, newEtapa.status, newEtapa.responsavel_id, newEtapa.observacoes, newEtapa.data_conclusao]
    );

    const [insertedRows]:any = await connection.execute(
        `SELECT le.*, u.name as responsavel_nome
         FROM licitacao_etapas le
         LEFT JOIN users u ON le.responsavel_id = u.id
         WHERE le.id = ?`,
        [newEtapaId]
    );
    return NextResponse.json(formatEtapaForFrontend(insertedRows[0]), { status: 201 });

  } catch (error: any) {
    console.error('[API Licitação Etapas POST]', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') { // FK constraint error
        return NextResponse.json({ error: 'ID da licitação ou do responsável inválido.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar etapa da licitação', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
