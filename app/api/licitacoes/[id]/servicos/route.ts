import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Listar todos os serviços de uma licitação
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`GET /api/licitacoes/${licitacaoId}/servicos - Iniciando consulta com MySQL`);
  try {
    if (!licitacaoId) {
      return NextResponse.json({ error: 'ID da Licitação é obrigatório' }, { status: 400 });
    }
    connection = await getDbConnection();

    const sql = 'SELECT * FROM licitacao_servicos WHERE licitacao_id = ? ORDER BY created_at DESC';
    console.log("Executando SQL:", sql, [licitacaoId]);
    const [rows] = await connection.execute(sql, [licitacaoId]);
    
    return NextResponse.json(rows || []);
  } catch (error: any) {
    console.error('Erro ao buscar serviços (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar serviços da licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar um novo serviço a uma licitação
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  const licitacaoId = (await params).id;
  console.log(`POST /api/licitacoes/${licitacaoId}/servicos - Iniciando criação com MySQL`);
  try {
    if (!licitacaoId) {
      return NextResponse.json({ error: 'ID da Licitação é obrigatório para adicionar serviço' }, { status: 400 });
    }
    const data = await request.json();
    console.log("Dados recebidos para novo serviço:", data);
    
    if (!data.nome || data.valor === undefined || data.quantidade === undefined) { // Valor e Quantidade agora são obrigatórios
      return NextResponse.json({ error: 'Nome, valor unitário e quantidade do serviço são obrigatórios' }, { status: 400 });
    }

    const valorUnitario = parseFloat(data.valor);
    const quantidade = parseInt(data.quantidade, 10);

    if (isNaN(valorUnitario) || isNaN(quantidade) || valorUnitario < 0 || quantidade <= 0) {
      return NextResponse.json({ error: 'Valor unitário e quantidade devem ser números válidos e positivos (quantidade > 0).' }, { status: 400 });
    }
    
    // Assumindo que 'valor' na tabela licitacao_servicos armazenará o valor TOTAL do item/serviço
    const valorTotalItem = valorUnitario * quantidade;

    const newServicoId = uuidv4();
    const servicoDb = {
      id: newServicoId,
      licitacao_id: licitacaoId,
      nome: data.nome,
      descricao: data.descricao || null,
      valor: valorTotalItem, // Armazenar o valor total do item
      unidade: data.unidade || 'unidade',
      quantidade: quantidade,
    };
    
    connection = await getDbConnection();
    await connection.beginTransaction(); // Iniciar transação

    const sqlInsert = 'INSERT INTO licitacao_servicos (id, licitacao_id, nome, descricao, valor, unidade, quantidade, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
    await connection.execute(sqlInsert, [
      servicoDb.id,
      servicoDb.licitacao_id,
      servicoDb.nome,
      servicoDb.descricao,
      servicoDb.valor, // Valor total do item
      servicoDb.unidade,
      servicoDb.quantidade
    ]);
    
    console.log("Novo serviço criado com ID:", newServicoId, "para licitação ID:", licitacaoId);

    // Atualizar valor_estimado na licitação
    const updateLicitacaoSql = `
      UPDATE licitacoes
      SET valor_estimado = (
          SELECT COALESCE(SUM(valor), 0)
          FROM licitacao_servicos
          WHERE licitacao_id = ?
      )
      WHERE id = ?;
    `;
    await connection.execute(updateLicitacaoSql, [licitacaoId, licitacaoId]);
    console.log("Valor estimado da licitação atualizado.");

    await connection.commit(); // Commit da transação

    const [createdRows]: any = await connection.execute('SELECT * FROM licitacao_servicos WHERE id = ?', [newServicoId]);
    if (createdRows.length === 0) {
        // Isso não deveria acontecer se a inserção e o commit foram bem-sucedidos
        return NextResponse.json({ error: "Falha ao recuperar serviço recém-criado após commit" }, { status: 500 });
    }
    
    return NextResponse.json(createdRows[0], { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback(); // Rollback em caso de erro
    console.error('Erro ao adicionar serviço (MySQL):', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID da licitação fornecido não existe.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro interno ao adicionar serviço', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}