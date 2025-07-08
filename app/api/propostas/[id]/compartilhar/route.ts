import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import sgMail from '@sendgrid/mail';

// Função para buscar proposta completa (reutilizada/adaptada de propostas/[id]/route.ts)
async function fetchPropostaDetalhadaParaEmail(propostaId: string, connection: Connection) {
  const [propostaRows]: any = await connection.execute(
    `SELECT p.*,
            c.nome as cliente_nome, c.contato_email as cliente_email_principal,
            org.nome as orgao_nome, org.contato_email as orgao_email_principal, /* Assumindo que orgaos tem contato_email */
            u.name as responsavel_nome, u.email as responsavel_email
     FROM propostas p
     LEFT JOIN clientes c ON p.cliente_id = c.id
     LEFT JOIN orgaos org ON p.orgao_id = org.id
     LEFT JOIN users u ON p.responsavel_id = u.id
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
  return proposta;
}

function formatarPropostaParaEmailHTML(proposta: any): string {
  let html = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
  html += `<h1 style="color: #333;">Proposta Comercial: ${proposta.titulo} (#${proposta.numero_proposta} v${proposta.versao})</h1>`;
  html += `<p><strong>Status:</strong> ${proposta.status_proposta}</p>`;
  html += `<p><strong>Data de Emissão:</strong> ${new Date(proposta.data_emissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>`;
  if (proposta.data_validade) {
    html += `<p><strong>Validade:</strong> ${new Date(proposta.data_validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>`;
  }
  html += `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">`;

  if (proposta.cliente_nome) html += `<p><strong>Cliente:</strong> ${proposta.cliente_nome}</p>`;
  if (proposta.orgao_nome) html += `<p><strong>Órgão:</strong> ${proposta.orgao_nome}</p>`;
  if (proposta.responsavel_nome) html += `<p><strong>Nosso Responsável:</strong> ${proposta.responsavel_nome} (${proposta.responsavel_email || ''})</p>`;
  html += `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">`;

  if (proposta.escopo_geral) {
    html += `<h2 style="color: #555;">Escopo Geral</h2><p>${proposta.escopo_geral.replace(/\n/g, '<br>')}</p>`;
  }

  html += `<h2 style="color: #555;">Itens da Proposta</h2>`;
  if (proposta.itens && proposta.itens.length > 0) {
    html += `<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
               <thead style="background-color: #f9f9f9;">
                 <tr>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descrição</th>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Qtd.</th>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Un.</th>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Vlr. Unit.</th>
                   <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Subtotal</th>
                 </tr>
               </thead>
               <tbody>`;
    proposta.itens.forEach((item: any) => {
      html += `<tr>
                 <td style="border: 1px solid #ddd; padding: 8px;">${item.tipo_item}</td>
                 <td style="border: 1px solid #ddd; padding: 8px;">${item.descricao_item}</td>
                 <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantidade}</td>
                 <td style="border: 1px solid #ddd; padding: 8px;">${item.unidade_medida}</td>
                 <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(Number(item.valor_unitario) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</td>
                 <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(Number(item.subtotal_item) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</td>
               </tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>Nenhum item detalhado.</p>`;
  }
  html += `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">`;

  html += `<h2 style="color: #555;">Valores</h2>`;
  html += `<p><strong>Total dos Itens:</strong> ${(Number(proposta.valor_total_itens) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</p>`;
  if (Number(proposta.percentual_desconto) > 0) {
    html += `<p><strong>Desconto:</strong> ${proposta.percentual_desconto}% (${(Number(proposta.valor_desconto) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })})</p>`;
    html += `<p><strong>Subtotal com Desconto:</strong> ${(Number(proposta.valor_subtotal_pos_desconto) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</p>`;
  }
  html += `<p><strong>Impostos:</strong> ${(Number(proposta.valor_impostos) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</p>`;
  html += `<p style="font-size: 1.1em;"><strong>VALOR TOTAL DA PROPOSTA:</strong> <strong style="font-size: 1.2em;">${(Number(proposta.valor_total_proposta) || 0).toLocaleString('pt-BR', { style: 'currency', currency: proposta.moeda || 'BRL' })}</strong></p>`;
  html += `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">`;

  if (proposta.condicoes_pagamento) {
    html += `<h2 style="color: #555;">Condições de Pagamento</h2><p>${proposta.condicoes_pagamento.replace(/\n/g, '<br>')}</p>`;
  }
  if (proposta.prazo_entrega_execucao) {
    html += `<h2 style="color: #555;">Prazo de Entrega/Execução</h2><p>${proposta.prazo_entrega_execucao.replace(/\n/g, '<br>')}</p>`;
  }
  html += `</div>`;
  return html;
}


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: propostaId } = params;
  let connection: Connection | null = null;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.error('Variáveis de ambiente SendGrid não configuradas.');
    return NextResponse.json({ error: 'Serviço de email não configurado no servidor.' }, { status: 500 });
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const { email_destinatario, assunto, corpo_email_personalizado } = await request.json();

    if (!email_destinatario || !assunto) {
      return NextResponse.json({ error: 'Destinatário e assunto são obrigatórios.' }, { status: 400 });
    }
    // Validação simples de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_destinatario)) {
        return NextResponse.json({ error: 'Email do destinatário inválido.' }, { status: 400 });
    }


    connection = await getDbConnection();
    await connection.beginTransaction(); // Iniciar transação para buscar proposta e atualizar status

    const proposta = await fetchPropostaDetalhadaParaEmail(propostaId, connection);

    if (!proposta) {
      await connection.rollback();
      return NextResponse.json({ error: 'Proposta não encontrada.' }, { status: 404 });
    }

    const propostaHtml = formatarPropostaParaEmailHTML(proposta);
    const corpoEmailFinal = `
      ${corpo_email_personalizado ? `<p>${corpo_email_personalizado.replace(/\n/g, '<br>')}</p><hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">` : ''}
      ${propostaHtml}
    `;

    const msg = {
      to: email_destinatario,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: "CRM One Factory - Propostas" // Nome do remetente opcional
      },
      subject: assunto,
      html: corpoEmailFinal,
    };

    try {
        await sgMail.send(msg);
    } catch (sendgridError: any) {
        console.error('Erro ao enviar email via SendGrid:', sendgridError.response?.body || sendgridError.message);
        await connection.rollback();
        return NextResponse.json({ error: 'Falha ao enviar o email da proposta.', details: sendgridError.message }, { status: 502 }); // 502 Bad Gateway
    }

    // Atualizar status da proposta para ENVIADA_AO_CLIENTE e data_envio_cliente
    // Apenas se o status atual for algo como EM_ELABORACAO ou PRONTA_PARA_ENVIO
    if (['EM_ELABORACAO', 'PRONTA_PARA_ENVIO', 'AGUARDANDO_AJUSTES'].includes(proposta.status_proposta)) {
        await connection.execute(
            `UPDATE propostas SET status_proposta = 'ENVIADA_AO_CLIENTE', data_envio_cliente = NOW(), updated_at = NOW() WHERE id = ?`,
            [propostaId]
        );
    } else {
        // Apenas atualiza updated_at se o status não for um dos acima para registrar a ação de compartilhamento
        await connection.execute(
            `UPDATE propostas SET data_envio_cliente = IFNULL(data_envio_cliente, NOW()), updated_at = NOW() WHERE id = ?`,
            [propostaId]
        );
    }

    await connection.commit();

    return NextResponse.json({ message: 'Proposta compartilhada por email com sucesso!' });

  } catch (error: any) {
    if (connection) await connection.rollback().catch(rbError => console.error("Erro no rollback geral:", rbError));
    console.error('Falha ao compartilhar proposta por email (Handler Principal):', error.message);
    return NextResponse.json({ error: 'Falha ao compartilhar proposta por email.', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
