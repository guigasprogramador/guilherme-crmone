import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para formatar item (snake_case para camelCase)
function formatOportunidadeItem(item: any) {
  if (!item) return null;
  return {
    id: item.id,
    oportunidadeId: item.oportunidade_id,
    itemNome: item.item_nome,
    descricao: item.descricao,
    quantidade: parseFloat(item.quantidade),
    unidade: item.unidade,
    valorUnitario: parseFloat(item.valor_unitario),
    valorTotal: parseFloat(item.valor_total),
    ordem: item.ordem,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// GET - Listar itens de uma oportunidade
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: oportunidadeId } = await context.params; // Aguarda params
  if (!oportunidadeId) {
    return NextResponse.json({ error: 'ID da oportunidade é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM oportunidade_itens WHERE oportunidade_id = ? ORDER BY ordem ASC, created_at ASC',
      [oportunidadeId]
    );
    const itens = (rows as any[]).map(formatOportunidadeItem);
    return NextResponse.json(itens);
  } catch (error: any) {
    console.error('[API Oportunidade Itens GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar itens da oportunidade', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Adicionar um novo item a uma oportunidade
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: oportunidadeId } = await context.params; // Aguarda params
  if (!oportunidadeId) {
    return NextResponse.json({ error: 'ID da oportunidade é obrigatório na URL' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json();

    if (!body.itemNome || body.quantidade === undefined || body.valorUnitario === undefined) {
      return NextResponse.json({ error: 'Nome do item, quantidade e valor unitário são obrigatórios' }, { status: 400 });
    }

    const quantidade = parseFloat(body.quantidade);
    const valorUnitario = parseFloat(body.valorUnitario);
    if (isNaN(quantidade) || isNaN(valorUnitario)) {
        return NextResponse.json({ error: 'Quantidade e valor unitário devem ser números válidos.' }, { status: 400 });
    }
    const valorTotal = quantidade * valorUnitario;

    connection = await getDbConnection();
    // Opcional: Verificar se a oportunidadeId existe na tabela 'oportunidades'
    const [oppRows]:any = await connection.execute('SELECT id FROM oportunidades WHERE id = ?', [oportunidadeId]);
    if (oppRows.length === 0) {
        return NextResponse.json({ error: 'Oportunidade não encontrada.' }, { status: 404 });
    }

    const newItemId = uuidv4();
    const newItem = {
      id: newItemId,
      oportunidade_id: oportunidadeId,
      item_nome: body.itemNome,
      descricao: body.descricao || null,
      quantidade: quantidade,
      unidade: body.unidade || null,
      valor_unitario: valorUnitario,
      valor_total: valorTotal, // Calculado
      ordem: body.ordem || 0,
    };

    await connection.execute(
      'INSERT INTO oportunidade_itens (id, oportunidade_id, item_nome, descricao, quantidade, unidade, valor_unitario, valor_total, ordem, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [newItem.id, newItem.oportunidade_id, newItem.item_nome, newItem.descricao, newItem.quantidade, newItem.unidade, newItem.valor_unitario, newItem.valor_total, newItem.ordem]
    );

    // Recalcular e atualizar o valor total na tabela 'oportunidades'
    await connection.execute(
      `UPDATE oportunidades o
       SET o.valor = (SELECT SUM(oi.valor_total) FROM oportunidade_itens oi WHERE oi.oportunidade_id = o.id)
       WHERE o.id = ?`,
      [oportunidadeId]
    );

    const [insertedRows] = await connection.execute('SELECT * FROM oportunidade_itens WHERE id = ?', [newItemId]);
    return NextResponse.json(formatOportunidadeItem((insertedRows as any[])[0]), { status: 201 });

  } catch (error: any) {
    console.error('[API Oportunidade Itens POST]', error);
    // Se erro de chave estrangeira para oportunidade_id
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID da oportunidade fornecido não existe.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar item da oportunidade', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
