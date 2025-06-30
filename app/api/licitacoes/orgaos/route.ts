import { NextRequest, NextResponse } from 'next/server';
import { Orgao, OrgaoContato } from '@/types/licitacoes'; // Assuming OrgaoContato is defined
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Função auxiliar para formatar o órgão no formato esperado pelo frontend
function formatarOrgaoMySQL(orgaoRow: any, contatosRows: any[] = []): Orgao {
  return {
    id: orgaoRow.id,
    nome: orgaoRow.nome,
    tipo: orgaoRow.tipo,
    cnpj: orgaoRow.cnpj,
    endereco: orgaoRow.endereco,
    cidade: orgaoRow.cidade,
    estado: orgaoRow.estado,
    segmento: orgaoRow.segmento,
    origemLead: orgaoRow.origem_lead, // snake_case from DB
    responsavelInterno: orgaoRow.responsavel_interno, // snake_case from DB
    descricao: orgaoRow.descricao,
    observacoes: orgaoRow.observacoes,
    faturamento: orgaoRow.faturamento,
    contatos: contatosRows.map((contato: any): OrgaoContato => ({ // Ensure OrgaoContato type matches
      id: contato.id,
      nome: contato.nome,
      cargo: contato.cargo,
      email: contato.email,
      telefone: contato.telefone,
      // dataCriacao: contato.data_criacao, // If needed by frontend type
      // dataAtualizacao: contato.data_atualizacao, // If needed by frontend type
    })),
    dataCriacao: orgaoRow.data_criacao, // snake_case from DB
    dataAtualizacao: orgaoRow.data_atualizacao, // snake_case from DB
    ativo: Boolean(orgaoRow.ativo) // Convert TINYINT to boolean
  };
}

// GET - Listar órgãos
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/licitacoes/orgaos - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();
    
    const termo = searchParams.get('termo');
    const segmento = searchParams.get('segmento');
    const estado = searchParams.get('estado');
    const ativoParam = searchParams.get('ativo');
    
    let sql = 'SELECT * FROM orgaos';
    const conditions: string[] = [];
    const paramsSql: any[] = [];

    if (termo) {
      conditions.push('(nome LIKE ? OR cnpj LIKE ?)');
      const searchTerm = `%${termo}%`;
      paramsSql.push(searchTerm, searchTerm);
    }
    if (segmento) {
      conditions.push('segmento = ?');
      paramsSql.push(segmento);
    }
    if (estado) {
      conditions.push('estado = ?');
      paramsSql.push(estado);
    }
    if (ativoParam !== null) {
      conditions.push('ativo = ?');
      paramsSql.push(ativoParam === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY nome ASC';
    
    console.log("Executando SQL para listar órgãos:", sql, paramsSql);
    const [orgaosRows] = await connection.execute(sql, paramsSql);
    
    const orgaosFormatados: Orgao[] = [];
    for (const orgaoRow of orgaosRows as any[]) {
      const [contatosRows] = await connection.execute(
        'SELECT id, nome, cargo, email, telefone FROM orgao_contatos WHERE orgao_id = ? ORDER BY nome ASC',
        [orgaoRow.id]
      );
      orgaosFormatados.push(formatarOrgaoMySQL(orgaoRow, contatosRows as any[]));
    }
    
    return NextResponse.json(orgaosFormatados);

  } catch (error: any) {
    console.error('Erro ao listar órgãos (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar órgãos', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar novo órgão
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/licitacoes/orgaos - Iniciando criação com MySQL");
  try {
    const data = await request.json();
    console.log("Dados recebidos para POST:", data);
    
    if (!data.nome) {
      return NextResponse.json({ error: 'Nome do órgão é obrigatório' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    
    // Verificar se o órgão já existe
    const [existingOrgao]: any = await connection.execute(
      'SELECT id, nome FROM orgaos WHERE nome = ? LIMIT 1',
      [data.nome]
    );
    
    if (existingOrgao.length > 0) {
      console.log('Órgão já existe:', existingOrgao[0]);
      return NextResponse.json(existingOrgao[0]);
    }
    
    await connection.beginTransaction();

    const { contatos, ...orgaoData } = data;
    const newOrgaoId = uuidv4();

    const orgaoDb = {
      id: newOrgaoId,
      nome: orgaoData.nome,
      tipo: orgaoData.tipo || null,
      cnpj: orgaoData.cnpj || null,
      endereco: orgaoData.endereco || null,
      cidade: orgaoData.cidade || null,
      estado: orgaoData.estado || null,
      segmento: orgaoData.segmento || null,
      origem_lead: orgaoData.origemLead || null, // Frontend: origemLead
      responsavel_interno: orgaoData.responsavelInterno || null, // Frontend: responsavelInterno
      descricao: orgaoData.descricao || null,
      observacoes: orgaoData.observacoes || null,
      faturamento: orgaoData.faturamento || null,
      ativo: orgaoData.ativo !== undefined ? (Boolean(orgaoData.ativo) ? 1 : 0) : 1, // Default true
      // data_criacao e data_atualizacao são definidos por NOW()
    };
    
    const orgaoFields = Object.keys(orgaoDb);
    const orgaoPlaceholders = orgaoFields.map(() => '?').join(', ');
    const orgaoValues = Object.values(orgaoDb);

    const sqlInsertOrgao = `INSERT INTO orgaos (${orgaoFields.join(', ')}, data_criacao, data_atualizacao) VALUES (${orgaoPlaceholders}, NOW(), NOW())`;
    await connection.execute(sqlInsertOrgao, orgaoValues);
    console.log("Órgão inserido com ID:", newOrgaoId);

    let insertedContatos: any[] = [];
    if (contatos && Array.isArray(contatos) && contatos.length > 0) {
      for (const contato of contatos) {
        const newContatoId = uuidv4();
        const contatoDb = {
          id: newContatoId,
          orgao_id: newOrgaoId,
          nome: contato.nome,
          cargo: contato.cargo || null,
          email: contato.email || null,
          telefone: contato.telefone || null,
        };
        const contatoFields = Object.keys(contatoDb);
        const contatoPlaceholders = contatoFields.map(() => '?').join(', ');
        const contatoValues = Object.values(contatoDb);

        const sqlInsertContato = `INSERT INTO orgao_contatos (${contatoFields.join(', ')}, data_criacao, data_atualizacao) VALUES (${contatoPlaceholders}, NOW(), NOW())`;
        await connection.execute(sqlInsertContato, contatoValues);
        insertedContatos.push({...contatoDb, data_criacao: new Date().toISOString(), data_atualizacao: new Date().toISOString()}); // Simula o retorno
      }
      console.log(`${insertedContatos.length} contatos inseridos para o órgão ID:`, newOrgaoId);
    }
    
    await connection.commit();
    console.log("Transação MySQL commitada.");

    // Construir o objeto de resposta formatado
    const orgaoCriadoFormatado = formatarOrgaoMySQL(
        {...orgaoDb, data_criacao: new Date().toISOString(), data_atualizacao: new Date().toISOString() }, // Simula o retorno do DB
        insertedContatos
    );
    
    return NextResponse.json(orgaoCriadoFormatado, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar órgão (MySQL):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação:", rbError.message));
    return NextResponse.json(
      { error: 'Erro interno ao criar órgão', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
