import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client'; // Using MySQL

// Helper to map database row (snake_case) to API response (camelCase)
// This should be consistent with the one in ../route.ts or a shared util
function formatContatoResponse(dbRow: any): any {
  if (!dbRow) return null;
  return {
    id: dbRow.id,
    clienteId: dbRow.cliente_id,
    nome: dbRow.nome,
    cargo: dbRow.cargo,
    email: dbRow.email,
    telefone: dbRow.telefone,
    principal: Boolean(dbRow.principal),
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

export async function GET(
  request: NextRequest, // Changed from Request to NextRequest for consistency if needed
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    console.log(`[API] GET /api/contatos/${id} - Buscando contato por ID (MySQL)`);
    
    connection = await getDbConnection();
    const [rows]: any = await connection.execute(
      'SELECT id, cliente_id, nome, cargo, email, telefone, principal, created_at, updated_at FROM contatos WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json(formatContatoResponse(rows[0]));

  } catch (error: any) {
    console.error('[API] Erro na API GET de contato por ID (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar contato.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

export async function PUT(
  request: NextRequest, // Changed from Request to NextRequest
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    console.log(`[API] PUT /api/contatos/${id} - Atualizando contato por ID (MySQL)`);
    const body = await request.json();

    // Validate required fields if any (e.g., nome cannot be set to null)
    if (body.nome !== undefined && !body.nome) {
        return NextResponse.json({ error: 'Nome não pode ser vazio.'}, { status: 400});
    }
    if (body.clienteId !== undefined && !body.clienteId) {
        return NextResponse.json({ error: 'clienteId não pode ser vazio se fornecido para atualização.'}, { status: 400});
    }


    connection = await getDbConnection();
    
    // Check if cliente_id is being updated and if the new one exists
    if (body.clienteId) {
        const [clientRows]: any = await connection.execute('SELECT id FROM clientes WHERE id = ?', [body.clienteId]);
        if (clientRows.length === 0) {
            return NextResponse.json({ error: 'Novo Cliente com o ID fornecido não encontrado.' }, { status: 404 });
        }
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Map camelCase from body to snake_case for DB
    if (body.nome !== undefined) { updateFields.push('nome = ?'); updateValues.push(body.nome); }
    if (body.clienteId !== undefined) { updateFields.push('cliente_id = ?'); updateValues.push(body.clienteId); }
    if (body.cargo !== undefined) { updateFields.push('cargo = ?'); updateValues.push(body.cargo); }
    if (body.email !== undefined) { updateFields.push('email = ?'); updateValues.push(body.email); }
    if (body.telefone !== undefined) { updateFields.push('telefone = ?'); updateValues.push(body.telefone); }
    if (body.principal !== undefined) { updateFields.push('principal = ?'); updateValues.push(body.principal ? 1 : 0); }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()'); // Ensure updated_at is set

    const sql = `UPDATE contatos SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(id);
    
    console.log('[API] Executando SQL UPDATE Contato (MySQL):', sql, updateValues);
    const [result]: any = await connection.execute(sql, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Contato não encontrado ou nenhum dado alterado' }, { status: 404 });
    }

    // Fetch the updated contact to return
    const [updatedRows]: any = await connection.execute(
        'SELECT id, cliente_id, nome, cargo, email, telefone, principal, created_at, updated_at FROM contatos WHERE id = ?',
        [id]
    );
    
    return NextResponse.json(formatContatoResponse(updatedRows[0]));

  } catch (error: any) {
    console.error('[API] Erro na API PUT de contato (MySQL):', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.message.includes('foreign key constraint fails')) {
        return NextResponse.json({ error: 'ID do cliente inválido ou não encontrado.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar contato.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

export async function DELETE(
  request: NextRequest, // Changed from Request to NextRequest
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    console.log(`[API] DELETE /api/contatos/${id} - Excluindo contato por ID (MySQL)`);
    
    connection = await getDbConnection();
    const [result]: any = await connection.execute('DELETE FROM contatos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Contato excluído com sucesso' }); // Changed from { success: true } for consistency

  } catch (error: any) {
    console.error('[API] Erro na API DELETE de contato (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir contato.', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
