import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Helper para formatar data string para YYYY-MM-DD
function parseToYYYYMMDD(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day.length === 2 && month.length === 2 && year.length === 4) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      return null;
    }
    return date.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
}

// Helper para formatar a resposta da API, consistente com /api/comercial/notas/route.ts
function formatNotaResponse(dbRow: any, autorName?: string): any {
  if (!dbRow) return null;
  return {
    id: dbRow.id,
    oportunidadeId: dbRow.oportunidade_id,
    autorId: dbRow.autor_id,
    autor: autorName || dbRow.autor_nome || null, // 'autor_nome' viria de um JOIN com users
    texto: dbRow.texto, // Assumindo que a coluna no DB é 'texto'
    data: dbRow.data ? new Date(dbRow.data).toISOString().split('T')[0] : null, // Assumindo coluna 'data'
    tipo: dbRow.tipo, // Assumindo coluna 'tipo'
    createdAt: dbRow.created_at, // Assumindo coluna 'created_at'
    updatedAt: dbRow.updated_at, // Assumindo coluna 'updated_at'
  };
}

// GET - Obter uma nota específica
export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: { notaId: string } }
) {
  const { notaId } = routeParams;
  let connection;
  console.log(`GET /api/comercial/notas/${notaId} - Iniciando consulta`);
  try {
    connection = await getDbConnection();
    const sql = `
      SELECT
        n.id, n.oportunidade_id, n.autor_id, n.texto, n.data, n.tipo, n.created_at, n.updated_at,
        u.name as autor_nome
      FROM notas n
      LEFT JOIN users u ON n.autor_id = u.id
      WHERE n.id = ?
    `;
    const [rows]: any[] = await connection.execute(sql, [notaId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    return NextResponse.json(formatNotaResponse(rows[0], rows[0].autor_nome));
  } catch (error: any) {
    console.error(`Erro ao buscar nota ${notaId} (MySQL):`, error);
    return NextResponse.json(
      { error: 'Erro ao buscar nota', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar uma nota específica
export async function PUT(
  request: NextRequest,
  { params: routeParams }: { params: { notaId: string } }
) {
  const { notaId } = routeParams;
  let connection;
  console.log(`PUT /api/comercial/notas/${notaId} - Iniciando atualização`);
  try {
    const body = await request.json(); // Espera: { texto: string, data?: string, tipo?: string }
    console.log("Dados recebidos para atualização da nota:", body);

    // Pelo menos 'texto' deve ser fornecido para atualização, ou outros campos se permitidos.
    if (body.texto === undefined && body.data === undefined && body.tipo === undefined) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }
    if (body.texto !== undefined && (typeof body.texto !== 'string' || body.texto.trim() === "")) {
        return NextResponse.json({ error: 'O campo texto não pode ser vazio se fornecido.' }, { status: 400 });
    }

    connection = await getDbConnection();

    const [checkRows]: any[] = await connection.execute('SELECT id FROM notas WHERE id = ?', [notaId]);
    if (checkRows.length === 0) {
        return NextResponse.json({ error: 'Nota não encontrada para atualização' }, { status: 404 });
    }

    const updateFields: string[] = [];
    const queryParams: any[] = [];

    if (body.texto !== undefined) {
      updateFields.push('texto = ?');
      queryParams.push(body.texto.trim());
    }
    if (body.data !== undefined) { // 'data' é a data da nota, não de criação/atualização
      updateFields.push('data = ?');
      queryParams.push(parseToYYYYMMDD(body.data));
    }
    if (body.tipo !== undefined) {
      updateFields.push('tipo = ?');
      queryParams.push(body.tipo);
    }

    if (updateFields.length === 0) {
        // Isso pode acontecer se, por exemplo, apenas `texto: ""` for enviado e a validação acima for mais permissiva.
        return NextResponse.json({ error: 'Nenhum campo válido fornecido para atualização efetiva' }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()'); // Sempre atualiza 'updated_at'

    const sql = `UPDATE notas SET ${updateFields.join(', ')} WHERE id = ?`;
    queryParams.push(notaId);

    console.log("Executando SQL Update para nota:", sql, queryParams);
    const [result]: any = await connection.execute(sql, queryParams);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Nota não encontrada ou nenhum dado alterado' }, { status: 404 });
    }

    const sqlSelectUpdated = `
      SELECT
        n.id, n.oportunidade_id, n.autor_id, n.texto, n.data, n.tipo, n.created_at, n.updated_at,
        u.name as autor_nome
      FROM notas n
      LEFT JOIN users u ON n.autor_id = u.id
      WHERE n.id = ?
    `;
    const [updatedRows]: any = await connection.execute(sqlSelectUpdated, [notaId]);
    if (updatedRows.length === 0) {
        return NextResponse.json({ error: "Nota atualizada, mas erro ao re-buscar." }, { status: 500 });
    }

    return NextResponse.json(formatNotaResponse(updatedRows[0], updatedRows[0].autor_nome));

  } catch (error: any) {
    console.error(`Erro ao atualizar nota ${notaId} (MySQL):`, error);
    return NextResponse.json(
      { error: 'Erro ao atualizar nota', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir uma nota específica
export async function DELETE(
  request: NextRequest,
  { params: routeParams }: { params: { notaId: string } }
) {
  const { notaId } = routeParams;
  let connection;
  console.log(`DELETE /api/comercial/notas/${notaId} - Iniciando exclusão`);
  try {
    connection = await getDbConnection();

    const [result]: any = await connection.execute('DELETE FROM notas WHERE id = ?', [notaId]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Nota excluída com sucesso' });

  } catch (error: any) {
    console.error(`Erro ao excluir nota ${notaId} (MySQL):`, error);
    return NextResponse.json(
      { error: 'Erro ao excluir nota', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
