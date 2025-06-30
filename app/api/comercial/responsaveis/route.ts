import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
// A interface Responsavel de @/types/comercial pode precisar ser atualizada
// para incluir user_id, telefone, created_at, updated_at.

// GET - Listar todos os responsáveis ou filtrar
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/comercial/responsaveis - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    
    const termo = searchParams.get('termo');
    const departamento = searchParams.get('departamento');
    const ativoParam = searchParams.get('ativo'); // 'true', 'false', ou null
    
    console.log("Filtros aplicados:", { termo, departamento, ativo: ativoParam });

    connection = await getDbConnection();
    
    let sql = 'SELECT id, user_id, nome, email, cargo, departamento, telefone, ativo, created_at, updated_at FROM responsaveis';
    const conditions: string[] = [];
    const params: any[] = [];

    if (termo) {
      conditions.push('(nome LIKE ? OR email LIKE ? OR cargo LIKE ?)');
      const searchTerm = `%${termo}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (departamento && departamento !== 'todos') {
      conditions.push('departamento = ?');
      params.push(departamento);
    }
    
    if (ativoParam !== null && ativoParam !== undefined) {
      const ativoBoolean = ativoParam === 'true';
      conditions.push('ativo = ?');
      params.push(ativoBoolean ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY nome ASC';

    console.log("Executando SQL:", sql, params);
    const [rows] = await connection.execute(sql, params);

    // MySQL retorna TINYINT(1) como 0 ou 1, converter para boolean se necessário para o frontend
    const resultado = (rows as any[]).map(row => ({
        ...row,
        ativo: row.ativo === 1,
    }));

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao buscar responsáveis (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar responsáveis', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Responsáveis).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Responsáveis):", releaseError.message);
      }
    }
  }
}

// POST - Criar novo responsável
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/comercial/responsaveis - Iniciando criação com MySQL");
  try {
    const data = await request.json();
    console.log("Dados recebidos:", data);
    
    if (!data.nome || !data.email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }
    
    const newId = uuidv4();
    const ativo = data.ativo === undefined ? true : Boolean(data.ativo); // Default to true

    // user_id é opcional; validar se fornecido e é um UUID válido
    let userIdToInsert = null;
    if (data.user_id) {
        // Basic UUID validation (length 36)
        if (typeof data.user_id === 'string' && data.user_id.length === 36) {
            userIdToInsert = data.user_id;
        } else {
            console.warn("user_id fornecido mas inválido:", data.user_id);
            // Decidir se quer retornar erro ou apenas ignorar o user_id inválido
            // return NextResponse.json({ error: 'user_id inválido. Deve ser um UUID.' }, { status: 400 });
        }
    }

    const novoResponsavel = {
      id: newId,
      user_id: userIdToInsert,
      nome: data.nome,
      email: data.email,
      cargo: data.cargo || null,
      departamento: data.departamento || 'Comercial',
      telefone: data.telefone || null,
      ativo: ativo ? 1 : 0,
      // created_at e updated_at serão definidos por NOW() no SQL
    };
    
    connection = await getDbConnection();
    const sql = 'INSERT INTO responsaveis (id, user_id, nome, email, cargo, departamento, telefone, ativo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    await connection.execute(sql, Object.values(novoResponsavel));
    
    console.log("Novo responsável criado com ID:", newId);

    // Para retornar o objeto completo incluindo timestamps gerados pelo DB:
    const [createdRows]: any = await connection.execute('SELECT * FROM responsaveis WHERE id = ?', [newId]);
    if (createdRows.length === 0) {
        // Isso seria inesperado
        return NextResponse.json({ error: "Falha ao recuperar responsável recém-criado" }, { status: 500 });
    }
    const responsavelCriado = {
        ...createdRows[0],
        ativo: createdRows[0].ativo === 1,
    };

    return NextResponse.json(responsavelCriado, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar responsável (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao criar responsável' },
      { status: 500 }
    );
  }
}
