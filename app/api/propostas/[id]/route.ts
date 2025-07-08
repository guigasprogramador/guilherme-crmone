import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Tipos (simplificados, idealmente viriam de @/types)
interface PropostaItemPayload {
  id?: string;
  ordem?: number;
  tipo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  observacoes_item?: string;
}

interface PropostaUpdatePayload {
  titulo?: string;
  status_proposta?: string;
  data_emissao?: string; // YYYY-MM-DD
  data_validade?: string; // YYYY-MM-DD
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  licitacao_id?: string | null;
  responsavel_id?: string | null;
  moeda?: string;
  percentual_desconto?: number;
  valor_impostos?: number;
  condicoes_pagamento?: string;
  prazo_entrega_execucao?: string;
  observacoes_internas?: string;
  escopo_geral?: string;
  itens?: PropostaItemPayload[];
}

async function calcularValoresProposta(itens: PropostaItemPayload[], percentualDesconto: number = 0, valorImpostosCalculadoOuFixo: number = 0) {
  let valor_total_itens = 0;
  for (const item of itens) {
    const quantidade = Number(item.quantidade) || 0;
    const valor_unitario = Number(item.valor_unitario) || 0;
    valor_total_itens += (quantidade * valor_unitario);
  }
  const percDesconto = Number(percentualDesconto) || 0;
  const valor_desconto = valor_total_itens * (percDesconto / 100);
  const valor_subtotal_pos_desconto = valor_total_itens - valor_desconto;
  const impostos = Number(valorImpostosCalculadoOuFixo) || 0;
  const valor_total_proposta = valor_subtotal_pos_desconto + impostos;
  return {
    valor_total_itens: parseFloat(valor_total_itens.toFixed(2)),
    valor_desconto: parseFloat(valor_desconto.toFixed(2)),
    valor_subtotal_pos_desconto: parseFloat(valor_subtotal_pos_desconto.toFixed(2)),
    valor_impostos: parseFloat(impostos.toFixed(2)),
    valor_total_proposta: parseFloat(valor_total_proposta.toFixed(2)),
  };
}

async function fetchPropostaCompleta(propostaId: string, connection: Connection) {
  const [propostaRows]: any = await connection.execute(
    `SELECT p.*,
            c.nome as cliente_nome,
            org.nome as orgao_nome,
            u.name as responsavel_nome,
            op.titulo as oportunidade_titulo,
            l.titulo as licitacao_titulo
     FROM propostas p
     LEFT JOIN clientes c ON p.cliente_id = c.id
     LEFT JOIN orgaos org ON p.orgao_id = org.id
     LEFT JOIN users u ON p.responsavel_id = u.id
     LEFT JOIN oportunidades op ON p.oportunidade_id = op.id
     LEFT JOIN licitacoes l ON p.licitacao_id = l.id
     WHERE p.id = ?`, [propostaId]);

  if (propostaRows.length === 0) {
    return null;
  }
  const proposta = propostaRows[0];

  const [itemRows]: any = await connection.execute(
    'SELECT * FROM proposta_itens WHERE proposta_id = ? ORDER BY ordem ASC, created_at ASC',
    [propostaId]
  );
  proposta.itens = itemRows;

  const [documentoRows]: any = await connection.execute(
    'SELECT id, nome, tipo, url_documento, formato, tamanho, data_criacao FROM documentos WHERE proposta_id = ? ORDER BY data_criacao DESC',
    [propostaId]
  );
  proposta.documentos = documentoRows;

  return proposta;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: propostaId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();
    const proposta = await fetchPropostaCompleta(propostaId, connection);

    if (!proposta) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }
    return NextResponse.json(proposta);
  } catch (error: any) {
    console.error(`Erro ao buscar proposta ${propostaId}:`, error);
    return NextResponse.json({ error: 'Falha ao buscar proposta', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: propostaId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as PropostaUpdatePayload;

    if (!body.titulo) {
      return NextResponse.json({ error: 'Título da proposta é obrigatório.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const camposPropostaUpdate: Partial<any> = {};
    if (body.titulo !== undefined) camposPropostaUpdate.titulo = body.titulo;
    if (body.status_proposta !== undefined) camposPropostaUpdate.status_proposta = body.status_proposta;
    if (body.data_emissao !== undefined) camposPropostaUpdate.data_emissao = body.data_emissao;
    if (body.data_validade !== undefined) camposPropostaUpdate.data_validade = body.data_validade;
    if (body.cliente_id !== undefined) camposPropostaUpdate.cliente_id = body.cliente_id;
    if (body.orgao_id !== undefined) camposPropostaUpdate.orgao_id = body.orgao_id;
    if (body.oportunidade_id !== undefined) camposPropostaUpdate.oportunidade_id = body.oportunidade_id;
    if (body.licitacao_id !== undefined) camposPropostaUpdate.licitacao_id = body.licitacao_id;
    if (body.responsavel_id !== undefined) camposPropostaUpdate.responsavel_id = body.responsavel_id;
    if (body.moeda !== undefined) camposPropostaUpdate.moeda = body.moeda;
    if (body.percentual_desconto !== undefined) camposPropostaUpdate.percentual_desconto = body.percentual_desconto;
    if (body.valor_impostos !== undefined) camposPropostaUpdate.valor_impostos = body.valor_impostos;
    if (body.condicoes_pagamento !== undefined) camposPropostaUpdate.condicoes_pagamento = body.condicoes_pagamento;
    if (body.prazo_entrega_execucao !== undefined) camposPropostaUpdate.prazo_entrega_execucao = body.prazo_entrega_execucao;
    if (body.observacoes_internas !== undefined) camposPropostaUpdate.observacoes_internas = body.observacoes_internas;
    if (body.escopo_geral !== undefined) camposPropostaUpdate.escopo_geral = body.escopo_geral;

    const itensParaCalculo = body.itens || (await connection.execute('SELECT quantidade, valor_unitario FROM proposta_itens WHERE proposta_id = ?', [propostaId]))[0] as any[];

    let percDescontoAtual = camposPropostaUpdate.percentual_desconto;
    let valorImpostosAtual = camposPropostaUpdate.valor_impostos;

    if (percDescontoAtual === undefined || valorImpostosAtual === undefined) {
        const [propostaExistente]:any = await connection.execute('SELECT percentual_desconto, valor_impostos FROM propostas WHERE id = ?', [propostaId]);
        if (propostaExistente.length > 0) {
            if (percDescontoAtual === undefined) percDescontoAtual = propostaExistente[0].percentual_desconto;
            if (valorImpostosAtual === undefined) valorImpostosAtual = propostaExistente[0].valor_impostos;
        }
    }

    const calculos = await calcularValoresProposta(
        itensParaCalculo,
        percDescontoAtual,
        valorImpostosAtual
    );
    camposPropostaUpdate.valor_total_itens = calculos.valor_total_itens;
    camposPropostaUpdate.valor_desconto = calculos.valor_desconto;
    camposPropostaUpdate.valor_subtotal_pos_desconto = calculos.valor_subtotal_pos_desconto;
    camposPropostaUpdate.valor_total_proposta = calculos.valor_total_proposta;

    if (Object.keys(camposPropostaUpdate).length > 0) {
      const updateFields = Object.keys(camposPropostaUpdate).map(key => `${key} = ?`).join(', ');
      const updateValues = [...Object.values(camposPropostaUpdate), propostaId];
      await connection.execute(`UPDATE propostas SET ${updateFields}, updated_at = NOW() WHERE id = ?`, updateValues);
    }

    if (body.itens) {
      await connection.execute('DELETE FROM proposta_itens WHERE proposta_id = ?', [propostaId]);
      for (const [index, item] of body.itens.entries()) {
        const itemQuantidade = Number(item.quantidade) || 0;
        const itemValorUnitario = Number(item.valor_unitario) || 0;
        const subtotal = itemQuantidade * itemValorUnitario;
        await connection.execute(
          `INSERT INTO proposta_itens (id, proposta_id, ordem, tipo_item, descricao_item, unidade_medida, quantidade, valor_unitario, subtotal_item, observacoes_item, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            item.id || uuidv4(),
            propostaId,
            item.ordem !== undefined ? item.ordem : index + 1,
            item.tipo_item,
            item.descricao_item,
            item.unidade_medida,
            itemQuantidade,
            itemValorUnitario,
            parseFloat(subtotal.toFixed(2)),
            item.observacoes_item || null,
          ]
        );
      }
    }
    await connection.commit();
    const propostaAtualizada = await fetchPropostaCompleta(propostaId, connection);
    return NextResponse.json(propostaAtualizada);

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`Erro ao atualizar proposta ${propostaId}:`, error);
    return NextResponse.json({ error: 'Falha ao atualizar proposta', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: propostaId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json(); // Espera { status_proposta: string, ... outros campos opcionais ... }

    if (!body.status_proposta && Object.keys(body).length === 0) {
         return NextResponse.json({ error: 'Nenhum campo fornecido para atualização.' }, { status: 400 });
    }

    connection = await getDbConnection();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (body.status_proposta) {
        updateFields.push('status_proposta = ?');
        updateValues.push(body.status_proposta);
        if (body.status_proposta === 'ENVIADA_AO_CLIENTE') {
            updateFields.push('data_envio_cliente = NOW()');
        } else if (['ACEITA', 'RECUSADA'].includes(body.status_proposta)) {
            updateFields.push('data_aprovacao_rejeicao = NOW()');
             if (body.motivo_recusa_cancelamento) { // Adicionar motivo se fornecido
                updateFields.push('motivo_recusa_cancelamento = ?');
                updateValues.push(body.motivo_recusa_cancelamento);
            }
        }
    }
    // Adicionar outros campos atualizáveis via PATCH se necessário
    // Ex: if (body.titulo) { updateFields.push('titulo = ?'); updateValues.push(body.titulo); }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualização via PATCH.' }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(propostaId);

    const [result]:any = await connection.execute(
      `UPDATE propostas SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Proposta não encontrada para atualizar.' }, { status: 404 });
    }

    const propostaAtualizada = await fetchPropostaCompleta(propostaId, connection);
    return NextResponse.json(propostaAtualizada);

  } catch (error: any) {
    console.error(`Erro ao atualizar parcialmente proposta ${propostaId}:`, error);
    return NextResponse.json({ error: 'Falha ao atualizar parcialmente proposta', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: propostaId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();

    // Soft delete: mudar status para CANCELADA
    // Poderia receber um motivo do corpo do request se necessário
    const [result]:any = await connection.execute(
      "UPDATE propostas SET status_proposta = 'CANCELADA', updated_at = NOW() WHERE id = ?",
      [propostaId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Proposta não encontrada para cancelar.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Proposta cancelada com sucesso.' });

  } catch (error: any) {
    console.error(`Erro ao cancelar proposta ${propostaId}:`, error);
    return NextResponse.json({ error: 'Falha ao cancelar proposta', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
