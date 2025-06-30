import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
// A interface Responsavel de @/types/comercial pode precisar ser atualizada

// GET - Obter um responsável específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const { id } = await params;
  console.log(`GET /api/comercial/responsaveis/${id} - Iniciando consulta com MySQL`);
  try {
    connection = await getDbConnection();

    const [rows]: any = await connection.execute(
      'SELECT id, user_id, nome, email, cargo, departamento, telefone, ativo, created_at, updated_at FROM responsaveis WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Responsável não encontrado' }, { status: 404 });
    }
    
    const responsavel = {
        ...rows[0],
        ativo: rows[0].ativo === 1,
    };
    return NextResponse.json(responsavel);

  } catch (error: any) {
    console.error('Erro ao buscar responsável (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar responsável', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Responsavel por ID).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Responsavel por ID):", releaseError.message);
      }
    }
  }
}

// PUT - Atualizar um responsável
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  const { id } = await context.params;
  console.log(`PUT /api/comercial/responsaveis/${id} - Iniciando atualização com MySQL`);
  try {
    const data = await request.json();
    console.log("Dados para atualização:", data);

    // Campos que podem ser atualizados
    const { nome, email, cargo, departamento, telefone, ativo, user_id } = data;

    // Validação básica (pelo menos um campo para atualizar deve ser fornecido, exceto 'id')
    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    
    const fieldsToUpdate: any = {};
    if (nome !== undefined) fieldsToUpdate.nome = nome;
    if (email !== undefined) fieldsToUpdate.email = email;
    if (cargo !== undefined) fieldsToUpdate.cargo = cargo;
    if (departamento !== undefined) fieldsToUpdate.departamento = departamento;
    if (telefone !== undefined) fieldsToUpdate.telefone = telefone;
    if (ativo !== undefined) fieldsToUpdate.ativo = Boolean(ativo) ? 1 : 0;
    if (user_id !== undefined) { // Permitir desassociar user_id passando null
        if (user_id === null || (typeof user_id === 'string' && user_id.length === 36)) {
            fieldsToUpdate.user_id = user_id;
        } else if (user_id) { // se não for null e não for string uuid válida
             return NextResponse.json({ error: 'user_id inválido para atualização.' }, { status: 400 });
        }
    }


    if (Object.keys(fieldsToUpdate).length === 0) {
        return NextResponse.json({ error: 'Nenhum campo válido fornecido para atualização' }, { status: 400 });
    }

    const fieldNames = Object.keys(fieldsToUpdate);
    const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
    const values = fieldNames.map(key => fieldsToUpdate[key]);

    // Adicionar updated_at = NOW()
    const sql = `UPDATE responsaveis SET ${fieldPlaceholders}, updated_at = NOW() WHERE id = ?`;
    values.push(id);
    
    console.log("Executando SQL Update:", sql, values);
    const [result]: any = await connection.execute(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Responsável não encontrado ou nenhum dado alterado' }, { status: 404 });
    }

    // Buscar e retornar o responsável atualizado
    const [updatedRows]: any = await connection.execute('SELECT * FROM responsaveis WHERE id = ?', [id]);
     if (updatedRows.length === 0) {
        return NextResponse.json({ error: "Responsável atualizado, mas erro ao re-buscar." }, { status: 500 });
    }
    const responsavelAtualizado = {
        ...updatedRows[0],
        ativo: updatedRows[0].ativo === 1,
    };
    return NextResponse.json(responsavelAtualizado);

  } catch (error: any) {
    console.error('Erro ao atualizar responsável (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar responsável', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (PUT Responsavel).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (PUT Responsavel):", releaseError.message);
      }
    }
  }
}

// DELETE - Desativar um responsável (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  const { id } = await context.params;
  console.log(`DELETE /api/comercial/responsaveis/${id} - Iniciando desativação (soft delete) com MySQL`);
  try {
    connection = await getDbConnection();
    
    const sql = 'UPDATE responsaveis SET ativo = 0, updated_at = NOW() WHERE id = ?';
    const [result]: any = await connection.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Responsável não encontrado' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Responsável desativado com sucesso' });

  } catch (error: any) {
    console.error('Erro ao desativar responsável (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao desativar responsável', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (DELETE Responsavel).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (DELETE Responsavel):", releaseError.message);
      }
    }
  }
}
