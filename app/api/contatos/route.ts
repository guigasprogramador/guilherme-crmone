import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client'; // Using MySQL
import { v4 as uuidv4 } from 'uuid';

// Helper to map database row (snake_case) to API response (camelCase)
function formatContatoResponse(dbRow: any): any {
  if (!dbRow) return null;
  return {
    id: dbRow.id,
    clienteId: dbRow.cliente_id,
    nome: dbRow.nome,
    cargo: dbRow.cargo,
    email: dbRow.email,
    telefone: dbRow.telefone,
    principal: Boolean(dbRow.principal), // Convert TINYINT to boolean
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

export async function GET(request: NextRequest) {
  let connection;
  try {
    console.log('[API] GET /api/contatos - Recebendo requisição para contatos (MySQL)');
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('cliente_id'); // Changed from orgao_id

    connection = await getDbConnection();
    let sql;
    const params: any[] = [];

    if (clienteId) {
      console.log('[API] Consultando contatos para cliente ID:', clienteId);
      sql = 'SELECT id, cliente_id, nome, cargo, email, telefone, principal, created_at, updated_at FROM contatos WHERE cliente_id = ? ORDER BY nome ASC';
      params.push(clienteId);
    } else {
      console.log('[API] Buscando todos os contatos');
      sql = 'SELECT id, cliente_id, nome, cargo, email, telefone, principal, created_at, updated_at FROM contatos ORDER BY nome ASC';
    }

    const [rows] = await connection.execute(sql, params);
    const contatos = (rows as any[]).map(formatContatoResponse);

    console.log(`[API] Contatos encontrados: ${contatos.length}`);
    return NextResponse.json(contatos);

  } catch (error: any) {
    console.error('[API] Erro na API de contatos (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar contatos.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log('[API] POST /api/contatos - Recebendo requisição POST para criar contato (MySQL)');
    const body = await request.json();
    console.log('[API] Dados do contato recebidos:', body);

    // Validate required fields based on the new schema
    if (!body.clienteId || !body.nome) {
      return NextResponse.json(
        { error: 'clienteId e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    connection = await getDbConnection();
    
    // Optional: Verify if cliente_id exists in the 'clientes' table
    const [clientRows]: any = await connection.execute('SELECT id FROM clientes WHERE id = ?', [body.clienteId]);
    if (clientRows.length === 0) {
        return NextResponse.json({ error: 'Cliente com o ID fornecido não encontrado.' }, { status: 404 });
    }

    const newId = body.id || uuidv4(); // Allow frontend to suggest ID or generate new
    const principal = body.principal !== undefined ? Boolean(body.principal) : false;

    const contatoData = {
      id: newId,
      cliente_id: body.clienteId,
      nome: body.nome,
      cargo: body.cargo || null,
      email: body.email || null,
      telefone: body.telefone || null,
      principal: principal ? 1 : 0, // Convert boolean to TINYINT for MySQL
      // created_at and updated_at will use default MySQL CURRENT_TIMESTAMP
    };

    const fields = Object.keys(contatoData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(contatoData);
    
    // Ensure created_at and updated_at are handled by DB default or NOW()
    const sql = `INSERT INTO contatos (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`;
    
    console.log('[API] Tentando inserir contato com dados (MySQL):', contatoData);
    await connection.execute(sql, values);

    // Fetch the created contact to return it in the response
    const [createdRows]: any = await connection.execute(
        'SELECT id, cliente_id, nome, cargo, email, telefone, principal, created_at, updated_at FROM contatos WHERE id = ?',
        [newId]
    );

    if (createdRows.length === 0) {
        console.error('[API] Erro ao buscar contato recém-criado.');
        return NextResponse.json({ error: 'Contato criado, mas erro ao recuperá-lo.' }, { status: 500 });
    }

    console.log('[API] Contato criado com sucesso (MySQL):', createdRows[0]);
    return NextResponse.json(formatContatoResponse(createdRows[0]), { status: 201 });

  } catch (error: any) {
    console.error('[API] Erro na API POST de contatos (MySQL):', error);
     if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint fails')) {
        return NextResponse.json({ error: 'ID do cliente inválido ou não encontrado.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar contato.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
