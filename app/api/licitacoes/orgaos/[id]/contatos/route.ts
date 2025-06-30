import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

interface OrgaoContatoFromDB {
  id: string;
  orgao_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  // principal: boolean | number; // Removido conforme instrução
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
  // principal?: boolean; // Removido
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
    // principal: !!contato.principal, // Removido
    createdAt: contato.created_at,
    updatedAt: contato.updated_at,
  };
}

// GET - Listar todos os contatos de um órgão
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Alterado para id
) {
  const { id: orgaoId } = await params; // Renomeado id para orgaoId
  if (!orgaoId) {
    return NextResponse.json({ error: 'ID do Órgão é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const sql = 'SELECT * FROM orgao_contatos WHERE orgao_id = ? ORDER BY nome ASC';
    const [rows] = await connection.execute(sql, [orgaoId]);
    const contatos = (rows as OrgaoContatoFromDB[]).map(formatContatoForFrontend);
    return NextResponse.json(contatos);
  } catch (error: any) {
    console.error('[API Órgão Contatos GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar contatos do órgão', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar um novo contato a um órgão
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Alterado para id
) {
  const { id: orgaoId } = await params; // Renomeado id para orgaoId
  if (!orgaoId) {
    return NextResponse.json({ error: 'ID do Órgão é obrigatório na URL' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json(); // Espera camelCase: nome, cargo, email, telefone

    if (!body.nome) {
      return NextResponse.json({ error: 'Nome do contato é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();
    // Verificar se o orgaoId existe na tabela 'orgaos'
    const [orgaoRows]:any = await connection.execute('SELECT id FROM orgaos WHERE id = ?', [orgaoId]);
    if (orgaoRows.length === 0) {
        return NextResponse.json({ error: 'Órgão não encontrado.' }, { status: 404 });
    }

    const newContatoId = uuidv4();
    const newContato = {
      id: newContatoId,
      orgao_id: orgaoId,
      nome: body.nome,
      cargo: body.cargo || null,
      email: body.email || null,
      telefone: body.telefone || null,
      // principal: body.principal || false, // Removido
    };

    await connection.execute(
      'INSERT INTO orgao_contatos (id, orgao_id, nome, cargo, email, telefone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [newContato.id, newContato.orgao_id, newContato.nome, newContato.cargo, newContato.email, newContato.telefone]
    );

    const [insertedRows]:any = await connection.execute('SELECT * FROM orgao_contatos WHERE id = ?', [newContatoId]);
    return NextResponse.json(formatContatoForFrontend(insertedRows[0]), { status: 201 });

  } catch (error: any) {
    console.error('[API Órgão Contatos POST]', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID do órgão fornecido não existe.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar contato do órgão', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
