import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// GET - Obter um serviço específico de uma licitação
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; servicoId: string } }
) {
  let connection;
  const { id: licitacaoId, servicoId } = params;
  console.log(`GET /api/licitacoes/${licitacaoId}/servicos/${servicoId} - Iniciando consulta com MySQL`);

  try {
    if (!licitacaoId || !servicoId) {
      return NextResponse.json({ error: 'ID da Licitação e ID do Serviço são obrigatórios' }, { status: 400 });
    }
    connection = await getDbConnection();
    
    const sql = 'SELECT * FROM licitacao_servicos WHERE id = ? AND licitacao_id = ?';
    console.log("Executando SQL:", sql, [servicoId, licitacaoId]);
    const [rows]: any = await connection.execute(sql, [servicoId, licitacaoId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Serviço não encontrado nesta licitação' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);

  } catch (error: any) {
    console.error('Erro ao buscar serviço (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar serviço da licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar um serviço específico de uma licitação
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; servicoId: string } }
) {
  let connection;
  const { id: licitacaoId, servicoId } = params;
  console.log(`PUT /api/licitacoes/${licitacaoId}/servicos/${servicoId} - Iniciando atualização com MySQL`);

  try {
    if (!licitacaoId || !servicoId) {
      return NextResponse.json({ error: 'ID da Licitação e ID do Serviço são obrigatórios' }, { status: 400 });
    }
    const data = await request.json();
    console.log("Dados recebidos para atualização:", data);
    
    connection = await getDbConnection();
    await connection.beginTransaction(); // Iniciar transação

    // Obter o serviço existente para referência, se necessário para calcular valor_total
    const [servicoExistenteRows]: any = await connection.execute('SELECT quantidade, valor AS valor_unitario_atual FROM licitacao_servicos WHERE id = ? AND licitacao_id = ?', [servicoId, licitacaoId]);
    if (servicoExistenteRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }
    const servicoAtual = servicoExistenteRows[0];

    let valorTotalItemCalculado;
    const quantidadeReq = data.quantidade !== undefined ? parseInt(data.quantidade, 10) : undefined;
    const valorUnitarioReq = data.valor !== undefined ? parseFloat(data.valor) : undefined; // Frontend envia 'valor' como valor unitário

    if (valorUnitarioReq !== undefined && quantidadeReq !== undefined) {
        if (isNaN(valorUnitarioReq) || isNaN(quantidadeReq) || valorUnitarioReq < 0 || quantidadeReq <= 0) {
            await connection.rollback();
            return NextResponse.json({ error: 'Valor unitário e quantidade devem ser números válidos e positivos (quantidade > 0).' }, { status: 400 });
        }
        valorTotalItemCalculado = valorUnitarioReq * quantidadeReq;
    } else if (valorUnitarioReq !== undefined) { // Apenas valor unitário mudou
        if (isNaN(valorUnitarioReq) || valorUnitarioReq < 0 ) {
            await connection.rollback();
            return NextResponse.json({ error: 'Valor unitário inválido.' }, { status: 400 });
        }
        valorTotalItemCalculado = valorUnitarioReq * servicoAtual.quantidade;
    } else if (quantidadeReq !== undefined) { // Apenas quantidade mudou
         if (isNaN(quantidadeReq) || quantidadeReq <= 0) {
            await connection.rollback();
            return NextResponse.json({ error: 'Quantidade inválida.' }, { status: 400 });
        }
        // Para calcular o valor total do item, precisamos do valor unitário.
        // A coluna 'valor' em licitacao_servicos deve ser o valor_total_item.
        // Se estamos mudando quantidade, e 'valor' na tabela é o total, precisamos recalcular o unitário primeiro ou ajustar.
        // Assumindo que a API para PUT envia 'valor' como novo valor unitário.
        // Se 'valor' na tabela é o valor total do item, e o frontend envia 'valor' como unitário,
        // precisamos do valor unitário original ou de uma lógica mais clara.
        // Para simplificar, se apenas quantidade muda, e 'valor' na tabela é total, a API deveria esperar o novo valor total ou unitário.
        // Vamos assumir que o frontend envia 'valor' como NOVO valor unitário.
        // Se o frontend não enviar 'valor' (unitário), mas mudar a quantidade, o valor total do item deve ser recalculado com o valor unitário existente.
        // Este cenário é complexo se 'valor' na tabela é o total.
        // REVISÃO: A API de POST armazena o VALOR TOTAL do item na coluna 'valor'.
        // Portanto, se o PUT altera 'quantidade' ou 'valor' (unitário), o novo 'valor' total do item deve ser recalculado.
        const valorUnitarioParaCalculo = valorUnitarioReq !== undefined ? valorUnitarioReq : (servicoAtual.valor_unitario_atual / servicoAtual.quantidade); // Simplificação, idealmente ter valor_unitario na tabela
        valorTotalItemCalculado = valorUnitarioParaCalculo * quantidadeReq;

         // Se a coluna 'valor' na tabela é o valor total do item, e o frontend só envia quantidade,
         // e não o valor unitário, não podemos calcular o novo valor total do item sem o valor unitário.
         // Esta parte precisa de uma definição clara de como o frontend e backend interagem com 'valor'.
         // Assumindo que se 'valor' não é enviado, o valor unitário não muda.
         // Esta lógica é complexa e depende da estrutura exata e intenção.
         // Por ora, se data.valor (unitário) não for enviado, o valor total do item não é recalculado aqui,
         // a menos que a quantidade mude e tenhamos o valor unitário original.
         // A API POST calcula valorTotalItem = valorUnitario * quantidade.
         // Para PUT, se data.valor (unitário) e/ou data.quantidade mudam, recalculamos.
         const vUnit = data.valor !== undefined ? parseFloat(data.valor) : (servicoAtual.valor / servicoAtual.quantidade); // Estimar unitário se não enviado
         const qtd = data.quantidade !== undefined ? parseInt(data.quantidade, 10) : servicoAtual.quantidade;
         if (isNaN(vUnit) || isNaN(qtd) || vUnit < 0 || qtd <= 0) {
            await connection.rollback();
            return NextResponse.json({ error: 'Valores inválidos para cálculo do total do item.' }, { status: 400 });
         }
         valorTotalItemCalculado = vUnit * qtd;
    }


    const fieldsToUpdate: string[] = [];
    const valuesToUpdate: any[] = [];

    if (data.nome !== undefined) { fieldsToUpdate.push('nome = ?'); valuesToUpdate.push(data.nome); }
    if (data.descricao !== undefined) { fieldsToUpdate.push('descricao = ?'); valuesToUpdate.push(data.descricao || null); }
    if (data.unidade !== undefined) { fieldsToUpdate.push('unidade = ?'); valuesToUpdate.push(data.unidade || 'unidade'); }
    if (quantidadeReq !== undefined && !isNaN(quantidadeReq)) { fieldsToUpdate.push('quantidade = ?'); valuesToUpdate.push(quantidadeReq); }
    
    // 'valor' na tabela licitacao_servicos é o valor_total_item
    if (valorTotalItemCalculado !== undefined && !isNaN(valorTotalItemCalculado)) {
        fieldsToUpdate.push('valor = ?'); valuesToUpdate.push(valorTotalItemCalculado);
    } else if (fieldsToUpdate.length === 0) { // Se nenhum outro campo foi alterado e não pudemos calcular valorTotalItem
      await connection.rollback();
      return NextResponse.json({ error: "Nenhum dado válido fornecido para atualização ou cálculo do valor total." }, { status: 400 });
    }


    if (fieldsToUpdate.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Nenhum campo para atualizar fornecido." }, { status: 400 });
    }

    fieldsToUpdate.push('updated_at = NOW()');
    const sqlUpdateServico = `UPDATE licitacao_servicos SET ${fieldsToUpdate.join(', ')} WHERE id = ? AND licitacao_id = ?`;
    valuesToUpdate.push(servicoId, licitacaoId);
    
    console.log("Executando SQL Update Servico:", sqlUpdateServico, valuesToUpdate);
    const [result]: any = await connection.execute(sqlUpdateServico, valuesToUpdate);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Serviço não encontrado ou nenhum dado alterado' }, { status: 404 });
    }

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
    console.log("Valor estimado da licitação atualizado após update do serviço.");

    await connection.commit(); // Commit da transação

    const [updatedRows]: any = await connection.execute('SELECT * FROM licitacao_servicos WHERE id = ?', [servicoId]);
    return NextResponse.json(updatedRows[0]);

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Erro ao atualizar serviço (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar serviço', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir um serviço específico de uma licitação
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; servicoId: string } }
) {
  let connection;
  const { id: licitacaoId, servicoId } = params;
  console.log(`DELETE /api/licitacoes/${licitacaoId}/servicos/${servicoId} - Iniciando exclusão com MySQL`);

  try {
    if (!licitacaoId || !servicoId) {
      return NextResponse.json({ error: 'ID da Licitação e ID do Serviço são obrigatórios' }, { status: 400 });
    }
    connection = await getDbConnection();
    await connection.beginTransaction(); // Iniciar transação
    
    const sqlDelete = 'DELETE FROM licitacao_servicos WHERE id = ? AND licitacao_id = ?';
    console.log("Executando SQL Delete:", sqlDelete, [servicoId, licitacaoId]);
    const [result]: any = await connection.execute(sqlDelete, [servicoId, licitacaoId]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Serviço não encontrado para exclusão' }, { status: 404 });
    }

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
    console.log("Valor estimado da licitação atualizado após delete do serviço.");

    await connection.commit(); // Commit da transação
    
    return NextResponse.json({ message: 'Serviço excluído com sucesso' });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Erro ao excluir serviço (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao excluir serviço', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}