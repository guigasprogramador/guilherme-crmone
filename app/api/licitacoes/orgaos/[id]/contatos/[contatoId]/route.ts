import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

interface OrgaoContatoFromDB {
  id: string;
  orgao_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  created_at: string;
  updated_at: string;
}

interface OrgaoContatoFrontend {
  id: string;
  orgaoId: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function formatContatoForFrontend(contato: OrgaoContatoFromDB): OrgaoContatoFrontend {
  return {
    id: contato.id,
    orgaoId: contato.orgao_id,
    nome: contato.nome,
    cargo: contato.cargo,
    email: contato.email,
    telefone: contato.telefone,
    createdAt: contato.created_at,
    updatedAt: contato.updated_at,
  };
}

// GET - Obter um contato específico de um órgão
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; contatoId: string } } // Alterado orgaoId para id
) {
  const { id: orgaoId, contatoId } = params; // Renomeado id para orgaoId
  if (!orgaoId || !contatoId) {
    return NextResponse.json({ error: 'ID do Órgão e ID do Contato são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const sql = 'SELECT * FROM orgao_contatos WHERE id = ? AND orgao_id = ?';
    const [rows]: any = await connection.execute(sql, [contatoId, orgaoId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Contato não encontrado ou não pertence ao órgão especificado' }, { status: 404 });
    }
    return NextResponse.json(formatContatoForFrontend(rows[0]));
  } catch (error: any) {
    console.error('[API Órgão Contato GET by ID]', error);
    return NextResponse.json({ error: 'Erro ao buscar contato', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar um contato específico de um órgão
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; contatoId: string } } // Alterado orgaoId para id
) {
  const { id: orgaoId, contatoId } = params; // Renomeado id para orgaoId
  if (!orgaoId || !contatoId) {
    return NextResponse.json({ error: 'ID do Órgão e ID do Contato são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json(); // Espera camelCase
    connection = await getDbConnection();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (body.nome !== undefined) { updateFields.push('nome = ?'); updateValues.push(body.nome); }
    if (body.cargo !== undefined) { updateFields.push('cargo = ?'); updateValues.push(body.cargo); }
    if (body.email !== undefined) { updateFields.push('email = ?'); updateValues.push(body.email); }
    if (body.telefone !== undefined) { updateFields.push('telefone = ?'); updateValues.push(body.telefone); }
    // if (body.principal !== undefined) { updateFields.push('principal = ?'); updateValues.push(body.principal); } // Removido

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()');
    const sql = `UPDATE orgao_contatos SET ${updateFields.join(', ')} WHERE id = ? AND orgao_id = ?`;
    updateValues.push(contatoId, orgaoId);

    const [result]: any = await connection.execute(sql, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Contato não encontrado, não pertence ao órgão ou nenhum dado alterado' }, { status: 404 });
    }

    const [updatedRows]:any = await connection.execute('SELECT * FROM orgao_contatos WHERE id = ?', [contatoId]);
    return NextResponse.json(formatContatoForFrontend(updatedRows[0]));

  } catch (error: any) {
    console.error('[API Órgão Contato PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar contato', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir um contato específico de um órgão
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contatoId: string } } // Alterado orgaoId para id
) {
  const { id: orgaoId, contatoId } = params; // Renomeado id para orgaoId
  if (!orgaoId || !contatoId) {
    return NextResponse.json({ error: 'ID do Órgão e ID do Contato são obrigatórios' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [result]: any = await connection.execute(
      'DELETE FROM orgao_contatos WHERE id = ? AND orgao_id = ?',
      [contatoId, orgaoId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Contato não encontrado ou não pertence ao órgão especificado' }, { status: 404 });
    }
    // Retornar 204 No Content é comum para DELETE bem-sucedido sem corpo de resposta
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('[API Órgão Contato DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir contato', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
