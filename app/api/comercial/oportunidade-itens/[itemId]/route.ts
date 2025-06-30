import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Helper para formatar item (snake_case para camelCase) - pode ser movido para um util shared
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

// GET - Obter um item específico (opcional, mas bom para consistência)
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const { itemId } = params;
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute('SELECT * FROM oportunidade_itens WHERE id = ?', [itemId]);
    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }
    return NextResponse.json(formatOportunidadeItem((rows as any[])[0]));
  } catch (error: any) {
    console.error('[API Oportunidade Itens GET by ID]', error);
    return NextResponse.json({ error: 'Erro ao buscar item', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}


// PUT - Atualizar um item específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const { itemId } = params;
  let connection;
  try {
    const body = await request.json();
    connection = await getDbConnection();

    // Buscar oportunidade_id antes de atualizar para recalcular o total da oportunidade
    const [itemRows]: any = await connection.execute('SELECT oportunidade_id, quantidade, valor_unitario FROM oportunidade_itens WHERE id = ?', [itemId]);
    if (itemRows.length === 0) {
        return NextResponse.json({ error: 'Item não encontrado para atualização' }, { status: 404 });
    }
    const oportunidadeId = itemRows[0].oportunidade_id;
    const currentQuantidade = parseFloat(itemRows[0].quantidade);
    const currentValorUnitario = parseFloat(itemRows[0].valor_unitario);


    const updateFields: string[] = [];
    const updateValues: any[] = [];

    let quantidade = body.quantidade !== undefined ? parseFloat(body.quantidade) : currentQuantidade;
    let valorUnitario = body.valorUnitario !== undefined ? parseFloat(body.valorUnitario) : currentValorUnitario;
    let valorTotalCalculado;

    // Se valorTotal for explicitamente fornecido no body, usar ele.
    // Senão, calcular com base na quantidade e valor unitário (atuais ou do body).
    if (body.valorTotal !== undefined) {
        valorTotalCalculado = parseFloat(body.valorTotal);
        if (isNaN(valorTotalCalculado)) {
            return NextResponse.json({ error: 'Valor total fornecido é inválido.' }, { status: 400 });
        }
    } else {
        if (isNaN(quantidade) || isNaN(valorUnitario)) {
             return NextResponse.json({ error: 'Quantidade e/ou valor unitário resultam em valores inválidos para cálculo.' }, { status: 400 });
        }
        valorTotalCalculado = quantidade * valorUnitario;
    }


    if (body.itemNome !== undefined) { updateFields.push('item_nome = ?'); updateValues.push(body.itemNome); }
    if (body.descricao !== undefined) { updateFields.push('descricao = ?'); updateValues.push(body.descricao); }
    if (body.quantidade !== undefined) { updateFields.push('quantidade = ?'); updateValues.push(quantidade); } // Usa a quantidade parseada
    if (body.unidade !== undefined) { updateFields.push('unidade = ?'); updateValues.push(body.unidade); }
    if (body.valorUnitario !== undefined) { updateFields.push('valor_unitario = ?'); updateValues.push(valorUnitario); } // Usa o valorUnitario parseado

    // Sempre atualiza valor_total, seja o calculado ou o fornecido explicitamente
    updateFields.push('valor_total = ?'); updateValues.push(valorTotalCalculado);

    if (body.ordem !== undefined) { updateFields.push('ordem = ?'); updateValues.push(body.ordem); }

    if (updateFields.length === 1 && updateFields[0] === 'valor_total = ?') { // Se apenas valor_total foi recalculado sem outras mudanças
        // Não há outros campos para atualizar além do valor_total que é derivado
        // No entanto, a lógica acima sempre adiciona valor_total, então este if pode não ser estritamente necessário
        // Mas se for o ÚNICO campo, e não foi explicitamente passado, pode ser que não haja o que atualizar.
        // Contudo, a lógica atual sempre atualizará valor_total.
    }

    if (updateFields.length === 0) {
         return NextResponse.json({ error: 'Nenhum dado fornecido para atualização que resulte em mudança (excluindo valor_total derivado automaticamente)' }, { status: 400 });
    }


    updateFields.push('updated_at = NOW()');
    const sql = `UPDATE oportunidade_itens SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(itemId);

    const [result]:any = await connection.execute(sql, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Item não encontrado ou nenhum dado alterado' }, { status: 404 });
    }

    await connection.execute(
      `UPDATE oportunidades o
       SET o.valor = (SELECT SUM(oi.valor_total) FROM oportunidade_itens oi WHERE oi.oportunidade_id = o.id)
       WHERE o.id = ?`,
      [oportunidadeId]
    );

    const [updatedRows] = await connection.execute('SELECT * FROM oportunidade_itens WHERE id = ?', [itemId]);
    return NextResponse.json(formatOportunidadeItem((updatedRows as any[])[0]));

  } catch (error: any) {
    console.error('[API Oportunidade Itens PUT]', error);
    return NextResponse.json({ error: 'Erro ao atualizar item da oportunidade', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir um item específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const { itemId } = params;
  let connection;
  try {
    connection = await getDbConnection();

    const [itemRows]: any = await connection.execute('SELECT oportunidade_id FROM oportunidade_itens WHERE id = ?', [itemId]);
    if (itemRows.length === 0) {
        return NextResponse.json({ error: 'Item não encontrado para exclusão' }, { status: 404 });
    }
    const oportunidadeId = itemRows[0].oportunidade_id;

    const [result]:any = await connection.execute('DELETE FROM oportunidade_itens WHERE id = ?', [itemId]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

     await connection.execute(
      `UPDATE oportunidades o
       SET o.valor = COALESCE((SELECT SUM(oi.valor_total) FROM oportunidade_itens oi WHERE oi.oportunidade_id = o.id), 0)
       WHERE o.id = ?`,
      [oportunidadeId]
    );

    return NextResponse.json({ message: 'Item excluído com sucesso' });
  } catch (error: any) {
    console.error('[API Oportunidade Itens DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir item da oportunidade', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
