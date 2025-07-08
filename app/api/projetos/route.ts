import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Tipos (simplificados, idealmente viriam de @/types/projetos)
interface ProjetoPayload {
  nome_projeto: string;
  descricao?: string;
  status_projeto?: string;
  data_inicio_prevista?: string | null; // YYYY-MM-DD
  data_fim_prevista?: string | null;   // YYYY-MM-DD
  orcamento_horas?: number | null;
  orcamento_custo?: number | null;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  proposta_id?: string | null;
  licitacao_id?: string | null;
  gerente_projeto_id: string;
  percentual_concluido?: number;
}

// Função para gerar código do projeto
async function gerarCodigoProjeto(connection: Connection): Promise<string> {
  const ano = new Date().getFullYear();
  const prefix = `PRJ-${ano}-`;

  const [rows]:any = await connection.execute(
    "SELECT codigo_projeto FROM projetos WHERE codigo_projeto LIKE ? ORDER BY codigo_projeto DESC LIMIT 1",
    [`${prefix}%`]
  );

  let proximoNumero = 1;
  if (rows.length > 0) {
    const ultimoCodigo = rows[0].codigo_projeto;
    const ultimoNumeroMatch = ultimoCodigo.match(/-(\d+)$/);
    if (ultimoNumeroMatch && ultimoNumeroMatch[1]) {
        const parsedNum = parseInt(ultimoNumeroMatch[1], 10);
        if(!isNaN(parsedNum)) {
            proximoNumero = parsedNum + 1;
        }
    }
  }
  return `${prefix}${proximoNumero.toString().padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  let connection: Connection | null = null;
  try {
    const body = await request.json() as ProjetoPayload;

    if (!body.nome_projeto) {
      return NextResponse.json({ error: 'Nome do projeto é obrigatório.' }, { status: 400 });
    }
    if (!body.gerente_projeto_id) {
      return NextResponse.json({ error: 'Gerente do projeto é obrigatório.' }, { status: 400 });
    }
    if (!body.cliente_id && !body.orgao_id) {
      return NextResponse.json({ error: 'O projeto deve ser associado a um Cliente ou Órgão.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const projetoId = uuidv4();
    const codigoProjeto = await gerarCodigoProjeto(connection);

    const projetoData = {
      id: projetoId,
      nome_projeto: body.nome_projeto,
      codigo_projeto: codigoProjeto,
      descricao: body.descricao || null,
      status_projeto: body.status_projeto || 'PLANEJAMENTO',
      data_inicio_prevista: body.data_inicio_prevista || null,
      data_fim_prevista: body.data_fim_prevista || null,
      orcamento_horas: body.orcamento_horas !== undefined ? Number(body.orcamento_horas) : null,
      orcamento_custo: body.orcamento_custo !== undefined ? Number(body.orcamento_custo) : null,
      cliente_id: body.cliente_id || null,
      orgao_id: body.orgao_id || null,
      oportunidade_id: body.oportunidade_id || null,
      proposta_id: body.proposta_id || null,
      licitacao_id: body.licitacao_id || null,
      gerente_projeto_id: body.gerente_projeto_id,
      percentual_concluido: body.percentual_concluido !== undefined ? Number(body.percentual_concluido) : 0,
    };

    const fields = Object.keys(projetoData);
    const placeholders = fields.map(() => '?').join(', ');

    await connection.execute(
      `INSERT INTO projetos (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`,
      Object.values(projetoData)
    );

    await connection.commit();

    const [createdProjetoRows]: any = await connection.execute(
      `SELECT p.*,
              c.nome as cliente_nome,
              org.nome as orgao_nome,
              u.name as gerente_projeto_nome
       FROM projetos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN orgaos org ON p.orgao_id = org.id
       LEFT JOIN users u ON p.gerente_projeto_id = u.id
       WHERE p.id = ?`, [projetoId]);

    return NextResponse.json(createdProjetoRows[0], { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Erro ao criar projeto:', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID de referência inválido (Cliente, Órgão ou Gerente). Verifique os IDs fornecidos.' }, { status: 400 });
    }
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('codigo_projeto')) {
        return NextResponse.json({ error: 'Falha ao gerar código de projeto único. Tente novamente.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Falha ao criar projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function GET(request: NextRequest) {
  let connection: Connection | null = null;
  try {
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();

    let query = `
      SELECT
        p.*,
        c.nome as cliente_nome,
        org.nome as orgao_nome,
        u.name as gerente_projeto_nome,
        op.titulo as oportunidade_titulo,
        prop.numero_proposta as proposta_numero, /* Usar numero_proposta */
        l.titulo as licitacao_titulo
      FROM projetos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN orgaos org ON p.orgao_id = org.id
      LEFT JOIN users u ON p.gerente_projeto_id = u.id
      LEFT JOIN oportunidades op ON p.oportunidade_id = op.id
      LEFT JOIN propostas prop ON p.proposta_id = prop.id
      LEFT JOIN licitacoes l ON p.licitacao_id = l.id
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (searchParams.get('status_projeto')) {
      conditions.push("p.status_projeto = ?");
      queryParams.push(searchParams.get('status_projeto'));
    }
    if (searchParams.get('gerente_projeto_id')) {
      conditions.push("p.gerente_projeto_id = ?");
      queryParams.push(searchParams.get('gerente_projeto_id'));
    }
    if (searchParams.get('cliente_id')) {
      conditions.push("p.cliente_id = ?");
      queryParams.push(searchParams.get('cliente_id'));
    }
     if (searchParams.get('orgao_id')) {
      conditions.push("p.orgao_id = ?");
      queryParams.push(searchParams.get('orgao_id'));
    }
    if (searchParams.get('termo')) {
      const termo = `%${searchParams.get('termo')}%`;
      conditions.push("(p.nome_projeto LIKE ? OR p.codigo_projeto LIKE ? OR p.descricao LIKE ?)");
      queryParams.push(termo, termo, termo);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY p.created_at DESC";

    const [rows] = await connection.execute(query, queryParams);
    return NextResponse.json(rows);

  } catch (error: any) {
    console.error('Erro ao listar projetos:', error);
    return NextResponse.json({ error: 'Falha ao listar projetos', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
