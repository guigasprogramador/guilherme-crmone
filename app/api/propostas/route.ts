import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client'; // Assumindo MySQL
import { v4 as uuidv4 } from 'uuid';

// Tipos (simplificados, idealmente viriam de @/types)
interface PropostaItemPayload {
  ordem?: number;
  tipo_item: string;
  descricao_item: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  observacoes_item?: string;
}

interface PropostaPayload {
  titulo: string;
  status_proposta?: string;
  data_emissao?: string; // YYYY-MM-DD
  data_validade?: string; // YYYY-MM-DD
  cliente_id?: string;
  orgao_id?: string;
  oportunidade_id?: string;
  licitacao_id?: string;
  responsavel_id?: string;
  moeda?: string;
  percentual_desconto?: number;
  valor_impostos?: number; // Valor fixo de imposto por agora
  condicoes_pagamento?: string;
  prazo_entrega_execucao?: string;
  observacoes_internas?: string;
  escopo_geral?: string;
  itens: PropostaItemPayload[];
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

  // valorImpostosCalculadoOuFixo pode ser um valor já calculado ou um percentual a ser aplicado
  // Para este exemplo, vamos assumir que é um valor fixo, mas poderia ser um % do subtotal_pos_desconto
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

function gerarNumeroProposta(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PROP-${year}${month}${day}-${randomSuffix}`;
}

export async function POST(request: NextRequest) {
  let connection: Connection | null = null;
  try {
    const body = await request.json() as PropostaPayload;

    if (!body.titulo) {
      return NextResponse.json({ error: 'Título da proposta é obrigatório.' }, { status: 400 });
    }
    if (!body.cliente_id && !body.orgao_id) {
      return NextResponse.json({ error: 'A proposta deve ser associada a um Cliente ou Órgão.' }, { status: 400 });
    }
    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json({ error: 'A proposta deve conter pelo menos um item.' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    const propostaId = uuidv4();
    const numeroProposta = gerarNumeroProposta();

    const calculos = await calcularValoresProposta(body.itens, body.percentual_desconto, body.valor_impostos);

    const propostaData = {
      id: propostaId,
      titulo: body.titulo,
      numero_proposta: numeroProposta,
      versao: 1,
      status_proposta: body.status_proposta || 'EM_ELABORACAO',
      data_emissao: body.data_emissao || new Date().toISOString().split('T')[0],
      data_validade: body.data_validade || null,
      cliente_id: body.cliente_id || null,
      orgao_id: body.orgao_id || null,
      oportunidade_id: body.oportunidade_id || null,
      licitacao_id: body.licitacao_id || null,
      responsavel_id: body.responsavel_id || null,
      moeda: body.moeda || 'BRL',
      valor_total_itens: calculos.valor_total_itens,
      percentual_desconto: body.percentual_desconto || 0,
      valor_desconto: calculos.valor_desconto,
      valor_subtotal_pos_desconto: calculos.valor_subtotal_pos_desconto,
      valor_impostos: calculos.valor_impostos,
      valor_total_proposta: calculos.valor_total_proposta,
      condicoes_pagamento: body.condicoes_pagamento || null,
      prazo_entrega_execucao: body.prazo_entrega_execucao || null,
      observacoes_internas: body.observacoes_internas || null,
      escopo_geral: body.escopo_geral || null,
    };

    const propostaFields = Object.keys(propostaData);
    const propostaPlaceholders = propostaFields.map(() => '?').join(', ');

    await connection.execute(
      `INSERT INTO propostas (${propostaFields.join(', ')}, created_at, updated_at) VALUES (${propostaPlaceholders}, NOW(), NOW())`,
      Object.values(propostaData)
    );

    for (const [index, itemPayload] of body.itens.entries()) {
      const itemQuantidade = Number(itemPayload.quantidade) || 0;
      const itemValorUnitario = Number(itemPayload.valor_unitario) || 0;
      const subtotal = itemQuantidade * itemValorUnitario;
      await connection.execute(
        `INSERT INTO proposta_itens (id, proposta_id, ordem, tipo_item, descricao_item, unidade_medida, quantidade, valor_unitario, subtotal_item, observacoes_item, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          uuidv4(),
          propostaId,
          itemPayload.ordem !== undefined ? itemPayload.ordem : index + 1,
          itemPayload.tipo_item,
          itemPayload.descricao_item,
          itemPayload.unidade_medida,
          itemQuantidade,
          itemValorUnitario,
          parseFloat(subtotal.toFixed(2)),
          itemPayload.observacoes_item || null,
        ]
      );
    }

    await connection.commit();

    // Buscar a proposta criada para retornar com todos os campos (incluindo os default e timestamps)
    const [createdPropostaRows]: any = await connection.execute(
        `SELECT p.*,
         c.nome as cliente_nome,
         org.nome as orgao_nome,
         u.name as responsavel_nome
       FROM propostas p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN orgaos org ON p.orgao_id = org.id
       LEFT JOIN users u ON p.responsavel_id = u.id
       WHERE p.id = ?`, [propostaId]);

    if (createdPropostaRows.length === 0) {
        throw new Error("Falha ao buscar proposta recém-criada.");
    }

    return NextResponse.json(createdPropostaRows[0], { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Erro ao criar proposta:', error);
    return NextResponse.json({ error: 'Falha ao criar proposta', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

export async function GET(request: NextRequest) {
  let connection: Connection | null = null;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status_proposta');
    const clienteId = searchParams.get('cliente_id');
    const orgaoId = searchParams.get('orgao_id');
    const oportunidadeId = searchParams.get('oportunidade_id');
    const licitacaoId = searchParams.get('licitacao_id');
    const responsavelId = searchParams.get('responsavel_id');
    // TODO: Adicionar mais filtros como data, termo de busca

    connection = await getDbConnection();

    let query = `
      SELECT
        p.*,
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
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (status) { conditions.push("p.status_proposta = ?"); queryParams.push(status); }
    if (clienteId) { conditions.push("p.cliente_id = ?"); queryParams.push(clienteId); }
    if (orgaoId) { conditions.push("p.orgao_id = ?"); queryParams.push(orgaoId); }
    if (oportunidadeId) { conditions.push("p.oportunidade_id = ?"); queryParams.push(oportunidadeId); }
    if (licitacaoId) { conditions.push("p.licitacao_id = ?"); queryParams.push(licitacaoId); }
    if (responsavelId) { conditions.push("p.responsavel_id = ?"); queryParams.push(responsavelId); }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY p.data_emissao DESC, p.created_at DESC";

    const [rows] = await connection.execute(query, queryParams);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Erro ao listar propostas:', error);
    return NextResponse.json({ error: 'Falha ao listar propostas', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
