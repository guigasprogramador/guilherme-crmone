import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper to format date string to YYYY-MM-DD
function parseToYYYYMMDD(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Invalid date
      // Try parsing DD/MM/YYYY
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

// Helper to map database row (snake_case) to API response (camelCase)
function formatNotaResponse(dbRow: any, autorName?: string): any {
  if (!dbRow) return null;
  return {
    id: dbRow.id,
    oportunidadeId: dbRow.oportunidade_id,
    autorId: dbRow.autor_id,
    autor: autorName || null, // Populate if autorName is provided
    texto: dbRow.texto,
    data: dbRow.data ? new Date(dbRow.data).toISOString().split('T')[0] : null, // Ensure YYYY-MM-DD format if not null
    tipo: dbRow.tipo,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// GET - Listar todas as notas ou filtrar por oportunidade
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/comercial/notas - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadeId = searchParams.get('oportunidadeId');
    
    connection = await getDbConnection();
    
    // Schema columns: id, oportunidade_id, autor_id, texto, data, tipo, created_at, updated_at
    let sql = `
      SELECT
        n.id,
        n.oportunidade_id,
        n.autor_id,
        n.texto,
        n.data,
        n.tipo,
        n.created_at,
        n.updated_at,
        u.name AS autor_nome
      FROM notas n
      LEFT JOIN users u ON n.autor_id = u.id
    `;
    const params: any[] = [];

    if (oportunidadeId) {
      sql += ' WHERE n.oportunidade_id = ?';
      params.push(oportunidadeId);
    }
    
    sql += ' ORDER BY n.created_at DESC';
    
    console.log("Executando SQL:", sql, params);
    const [rows] = await connection.execute(sql, params);

    const notasFormatadas = (rows as any[]).map(row => formatNotaResponse(row, row.autor_nome));
    return NextResponse.json(notasFormatadas);

  } catch (error: any) {
    console.error('Erro ao buscar notas (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notas', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Notas).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Notas):", releaseError.message);
      }
    }
  }
}

// POST - Criar nova nota
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/comercial/notas - Iniciando criação com MySQL");
  try {
    const body = await request.json(); // Expects camelCase: oportunidadeId, autorId, texto, data, tipo
    console.log("Dados recebidos:", body);
    
    if (!body.oportunidadeId || !body.texto || !body.autorId) {
      return NextResponse.json(
        { error: 'ID da oportunidade, ID do autor e texto são obrigatórios' },
        { status: 400 }
      );
    }
    
    const newNotaId = uuidv4();

    // Schema columns: id, oportunidade_id, autor_id, texto, data, tipo, created_at, updated_at
    const novaNotaDB: {[key: string]: any} = {
      id: newNotaId,
      oportunidade_id: body.oportunidadeId,
      autor_id: body.autorId,
      texto: body.texto,
      tipo: body.tipo || 'geral', // Default tipo
    };

    // Handle 'data' field from schema
    if (body.data) {
      const parsedDate = parseToYYYYMMDD(body.data);
      if (parsedDate) {
        novaNotaDB.data = parsedDate;
      } else {
        // Optional: return error if date format is invalid, or just proceed with null/default
        console.warn("Formato de data inválido recebido:", body.data);
        novaNotaDB.data = null;
      }
    } else {
      novaNotaDB.data = null; // Or set a default date like NOW() if schema allows/requires
    }
    
    connection = await getDbConnection();

    const fields = Object.keys(novaNotaDB);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(novaNotaDB);

    const sqlInsert = `INSERT INTO notas (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`;
    await connection.execute(sqlInsert, values);

    console.log("Nova nota criada com ID:", newNotaId);

    const sqlSelectNew = `
      SELECT
        n.id,
        n.oportunidade_id,
        n.autor_id,
        n.texto,
        n.data,
        n.tipo,
        n.created_at,
        n.updated_at,
        u.name AS autor_nome
      FROM notas n
      LEFT JOIN users u ON n.autor_id = u.id
      WHERE n.id = ?
    `;
    const [createdRows]: any = await connection.execute(sqlSelectNew, [newNotaId]);

    if (createdRows.length === 0) {
        return NextResponse.json({ error: "Falha ao recuperar nota recém-criada" }, { status: 500 });
    }
    
    return NextResponse.json(formatNotaResponse(createdRows[0], createdRows[0].autor_nome), { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar nota (MySQL):', error);
    // Handle specific errors like foreign key violation if autor_id or oportunidade_id is invalid
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID da oportunidade ou ID do autor inválido.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro ao criar nota', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
        try {
            await connection.release();
            console.log("Conexão MySQL liberada (POST Notas).");
        } catch (releaseError: any) {
            console.error("Erro ao liberar conexão MySQL (POST Notas):", releaseError.message);
        }
    }
  }
}
