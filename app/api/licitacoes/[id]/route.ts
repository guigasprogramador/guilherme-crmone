import { NextRequest, NextResponse } from 'next/server';
import { Licitacao, DocumentoDetalhado, LicitacaoStatus } from '@/types/licitacoes';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para converter string DD/MM/YYYY ou ISO para YYYY-MM-DD
function parseToYYYYMMDD(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return localDate.toISOString().split('T')[0];
  }
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day.length === 2 && month.length === 2 && year.length === 4) {
        return `${year}-${month}-${day}`;
    }
  }
  console.warn(`parseToYYYYMMDD: Formato de data inválido ou não reconhecido: ${dateString}`);
  return null;
}

// Função auxiliar para formatar dados da licitação do MySQL para o formato do frontend
// (Copied and adapted from ./route.ts - consider moving to a shared util if identical)
function formatarLicitacaoMySQL(
    item: any,
    orgaoNome: string | null = null,
    responsavelPrincipalNome: string | null = null,
    responsaveisMultiplos: { id: string, nome: string, papel?: string }[] = [],
    documentosLicitacao: any[] = []
): Licitacao {
  let valorEstimadoFormatado = 'R$ 0,00';
  if (item.valor_estimado !== null && item.valor_estimado !== undefined) {
    valorEstimadoFormatado = `R$ ${Number(item.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // Verifica se a data é válida
      if (isNaN(date.getTime())) return '';
      // Ajuste para UTC para evitar problemas de fuso horário
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return utcDate.toLocaleDateString('pt-BR');
    } catch (e) {
      return '';
    }
  };

  return {
    id: item.id,
    titulo: item.titulo,
    status: item.status as LicitacaoStatus,
    modalidade: item.modalidade,
    dataAbertura: formatDate(item.data_abertura),
    orgao: orgaoNome || item.orgao_nome || '',
    orgaoId: item.orgao_id || '',
    valorEstimado: valorEstimadoFormatado,
    objeto: item.objeto || '',
    edital: item.edital,
    numeroEdital: item.numero_edital,
    responsavel: responsavelPrincipalNome || item.responsavel_principal_nome || '',
    responsavelId: item.responsavel_id || '',
    prazo: item.prazo,
    urlLicitacao: item.url_licitacao,
    urlEdital: item.url_edital,
    descricao: item.descricao,
    formaPagamento: item.forma_pagamento,
    obsFinanceiras: item.obs_financeiras,
    tipo: item.tipo,
    tipoFaturamento: item.tipo_faturamento,
    margemLucro: item.margem_lucro,
    contatoNome: item.contato_nome,
    contatoEmail: item.contato_email,
    contatoTelefone: item.contato_telefone,
    dataJulgamento: formatDate(item.data_julgamento),
    dataCriacao: item.data_criacao ? new Date(item.data_criacao).toISOString() : '',
    dataAtualizacao: item.data_atualizacao ? new Date(item.data_atualizacao).toISOString() : '',
    valorHomologado: item.valor_homologado !== undefined && item.valor_homologado !== null ? Number(item.valor_homologado) : undefined,
    documentos: documentosLicitacao.map((doc: any): DocumentoDetalhado => ({
      id: doc.id,
      nome: doc.nome,
      url: doc.url_documento || doc.url,
      arquivo: doc.arquivo_path || doc.arquivo,
      data_criacao: doc.data_criacao ? new Date(doc.data_criacao).toISOString() : '',
      data_atualizacao: doc.data_atualizacao ? new Date(doc.data_atualizacao).toISOString() : '',
      tipo: doc.tipo,
      tamanho: doc.tamanho,
      licitacaoId: doc.licitacao_id,
      formato: doc.formato,


      status: doc.status,
      dataValidade: formatDate(doc.data_validade),
      tags: doc.tags || [],
    }))
  };
}

// Função para obter uma licitação completa por ID do MySQL
// (Copied and adapted from ./route.ts - consider moving to a shared util if identical)
async function obterLicitacaoCompletaMySQL(licitacaoId: string, connection: any): Promise<Licitacao | null> {
  const [licitacaoRows]: any = await connection.execute(
    `SELECT l.*, o.nome as orgao_nome, u.name as responsavel_principal_nome
     FROM licitacoes l
     LEFT JOIN orgaos o ON l.orgao_id = o.id
     LEFT JOIN users u ON l.responsavel_id = u.id
     WHERE l.id = ?`,
    [licitacaoId]
  );
  if (licitacaoRows.length === 0) return null;
  const licitacaoPrincipal = licitacaoRows[0];

  const [responsaveisRows]: any = await connection.execute(
    `SELECT u.id, u.name as nome, lr.papel
     FROM licitacao_responsaveis lr
     JOIN users u ON lr.usuario_id = u.id
     WHERE lr.licitacao_id = ?`,
    [licitacaoId]
  );

  const [documentosRows]: any = await connection.execute(
    `SELECT d.*, GROUP_CONCAT(t.nome) as tags
     FROM documentos d
     LEFT JOIN documentos_tags dt ON d.id = dt.documento_id
     LEFT JOIN tags t ON dt.tag_id = t.id
     WHERE d.licitacao_id = ?
     GROUP BY d.id`,
    [licitacaoId]
  );

  return formatarLicitacaoMySQL(
    licitacaoPrincipal,
    licitacaoPrincipal.orgao_nome,
    licitacaoPrincipal.responsavel_principal_nome,
    responsaveisRows,
    documentosRows
  );
}


// GET - Obter uma licitação específica pelo ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  console.log(`GET /api/licitacoes/${await context.params.id} - Iniciando consulta com MySQL`);
  try {
    const { id } = await context.params;
    connection = await getDbConnection();
    
    const licitacaoCompleta = await obterLicitacaoCompletaMySQL(id, connection);
    
    if (!licitacaoCompleta) {
      return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(licitacaoCompleta);

  } catch (error: any) {
    console.error('Erro ao buscar licitação (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar uma licitação completa
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  const { id } = await context.params;
  console.log(`PUT /api/licitacoes/${id} - Iniciando atualização com MySQL`);
  try {
    const data = await request.json();
    if (!data.titulo || !data.orgaoId || !data.modalidade) {
      return NextResponse.json({ error: 'Título, Órgão e Modalidade são obrigatórios' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Atualizar dados principais da licitação
    const licitacaoDb = {
      titulo: data.titulo,
      status: data.status || 'analise_interna',
      modalidade: data.modalidade,
      numero_processo: data.numeroProcesso || null,
      objeto: data.objeto || null,
      edital: data.edital || null,
      numero_edital: data.numeroEdital || null,
      data_abertura: parseToYYYYMMDD(data.dataAbertura),
      data_limite_proposta: parseToYYYYMMDD(data.dataLimiteProposta),
      data_julgamento: parseToYYYYMMDD(data.dataJulgamento),
      orgao_id: data.orgaoId,
      valor_estimado: data.valorEstimado ? parseFloat(String(data.valorEstimado).replace(/[^0-9,.-]+/g, '').replace('.', '').replace(',', '.')) : null,
      valor_homologado: data.valorHomologado !== undefined ? parseFloat(String(data.valorHomologado)) : null,
      responsavel_id: data.responsavelId || null,
      prazo: data.prazo || null,
      url_licitacao: data.urlLicitacao || null,
      url_edital: data.urlEdital || null,
      descricao: data.descricao || null,
      forma_pagamento: data.formaPagamento || null,
      obs_financeiras: data.obsFinanceiras || null,
      tipo: data.tipo || null,
      tipo_faturamento: data.tipoFaturamento || null,
      margem_lucro: data.margemLucro ? parseFloat(String(data.margemLucro)) : null,
      contato_nome: data.contatoNome || null,
      contato_email: data.contatoEmail || null,
      contato_telefone: data.contatoTelefone || null,
      posicao_kanban: data.posicaoKanban || 0,
    };
    const licitacaoFields = Object.keys(licitacaoDb);
    const licitacaoPlaceholders = licitacaoFields.map(key => `${key} = ?`).join(', ');
    const licitacaoValues = Object.values(licitacaoDb);
    
    const sqlUpdateLicitacao = `UPDATE licitacoes SET ${licitacaoPlaceholders}, updated_at = NOW() WHERE id = ?`;
    licitacaoValues.push(id);
    const [updateResult]: any = await connection.execute(sqlUpdateLicitacao, licitacaoValues);

    if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Licitação não encontrada para atualização' }, { status: 404 });
    }

    // 2. Atualizar responsáveis (deletar antigos e inserir novos)
    await connection.execute('DELETE FROM licitacao_responsaveis WHERE licitacao_id = ?', [id]);
    if (data.responsaveis && Array.isArray(data.responsaveis) && data.responsaveis.length > 0) {
      for (const resp of data.responsaveis) { // resp should be { id: userId, papel: 'seu papel' }
        if (resp.id) { // Anteriormente era resp.usuarioId, ajustado para resp.id para consistência com frontend
             await connection.execute(
            'INSERT INTO licitacao_responsaveis (id, licitacao_id, usuario_id, papel, data_atribuicao) VALUES (?, ?, ?, ?, NOW())',
            [uuidv4(), id, resp.id, resp.papel || 'Participante']
            );
        }
      }
    }
    
    // 2.5. Lidar com documentos do repositório (vinculação)
    if (data.documentosRepositorioIds && Array.isArray(data.documentosRepositorioIds) && data.documentosRepositorioIds.length > 0) {
      for (const documentoId of data.documentosRepositorioIds) {
        // Atualizar o documento existente para vincular à licitação
        await connection.execute(
          'UPDATE documentos SET licitacao_id = ?, data_atualizacao = NOW() WHERE id = ?',
          [id, documentoId]
        );
        console.log('Documento do repositório vinculado:', documentoId, 'à licitação:', id);
      }
    }
    
    // 3. Atualizar documentos (deletar antigos e inserir novos)
    // Primeiro, buscar IDs dos documentos atuais para deletar suas tags
    const [currentDocs]:any = await connection.execute('SELECT id FROM documentos WHERE licitacao_id = ?', [id]);
    for (const doc of currentDocs) {
        await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [doc.id]);
    }
    await connection.execute('DELETE FROM documentos WHERE licitacao_id = ?', [id]);

    if (data.documentos && Array.isArray(data.documentos) && data.documentos.length > 0) {
      const criadoPorId = data.usuarioId || data.responsavelId; // ID do usuário que está fazendo a alteração
      for (const doc of data.documentos) {
        const newDocId = uuidv4();
        await connection.execute(
          `INSERT INTO documentos (id, nome, tipo, url_documento, arquivo_path, formato, tamanho, status, criado_por, licitacao_id, categoria, data_criacao, data_atualizacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            newDocId, doc.nome, doc.tipo || 'Outro', doc.url || null, doc.arquivo || null,
            doc.formato || null, doc.tamanho || 0, doc.status || 'ativo', criadoPorId, id,
            doc.categoria || null
          ]
        );
        if (doc.tags && Array.isArray(doc.tags)) {
          for (const tagName of doc.tags) {
            if (typeof tagName !== 'string' || tagName.trim() === '') continue;
            let [tagRows]: any = await connection.execute('SELECT id FROM tags WHERE nome = ?', [tagName.trim()]);
            let tagId;
            if (tagRows.length > 0) {
              tagId = tagRows[0].id;
            } else {
              tagId = uuidv4();
              await connection.execute('INSERT INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [tagId, tagName.trim()]);
            }
            await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocId, tagId]);
          }
        }
      }
    }

    await connection.commit();
    console.log('Transação MySQL commitada para PUT licitacao ID:', id);

    const licitacaoCompleta = await obterLicitacaoCompletaMySQL(id, connection);
    return NextResponse.json(licitacaoCompleta);

  } catch (error: any) {
    console.error('Erro ao atualizar licitação (MySQL PUT):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação PUT:", rbError.message));
    return NextResponse.json(
      { error: 'Erro interno ao atualizar licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Atualizar parcialmente uma licitação
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  const { id } = await context.params;
  console.log(`PATCH /api/licitacoes/${id} - Iniciando atualização parcial com MySQL`);
  try {
    const data = await request.json();
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Mapear e adicionar campos da licitação principal
    const licitacaoCampos = [
        'titulo', 'status', 'modalidade', 'numero_processo', 'objeto', 'edital', 'numero_edital',
        'data_abertura', 'data_limite_proposta', 'data_julgamento', 'orgao_id', 'valor_estimado', 'valor_homologado',
        'responsavel_id', 'prazo', 'url_licitacao', 'url_edital', 'descricao', 'forma_pagamento',
        'obs_financeiras', 'tipo', 'tipo_faturamento', 'margem_lucro', 'contato_nome',
        'contato_email', 'contato_telefone', 'posicao_kanban'
    ];
    const dataMapping: Record<string, string> = { // camelCase to snake_case
        'numeroProcesso': 'numero_processo', 'dataAbertura': 'data_abertura',
        'dataLimiteProposta': 'data_limite_proposta', 'dataJulgamento': 'data_julgamento',
        'orgaoId': 'orgao_id', 'valorEstimado': 'valor_estimado', 'valorHomologado': 'valor_homologado', 'responsavelId': 'responsavel_id',
        'urlLicitacao': 'url_licitacao', 'urlEdital': 'url_edital', 'formaPagamento': 'forma_pagamento',
        'obsFinanceiras': 'obs_financeiras', 'tipoFaturamento': 'tipo_faturamento',
        'margemLucro': 'margem_lucro', 'contatoNome': 'contato_nome', 'contatoEmail': 'contato_email',
        'contatoTelefone': 'contato_telefone', 'posicaoKanban': 'posicao_kanban'
    };


    for (const key in data) {
        if (licitacaoCampos.includes(key) || Object.keys(dataMapping).includes(key)) {
            const dbKey = dataMapping[key] || key;
            let value = data[key];
            if (['dataAbertura', 'dataLimiteProposta', 'dataJulgamento'].includes(key)) {
                value = parseToYYYYMMDD(value);
            } else if (key === 'valorEstimado' && value !== null) {
                value = parseFloat(String(value).replace(/[^0-9,.-]+/g,"").replace(".","").replace(",","."))
            } else if (key === 'margemLucro' && value !== null) {
                 value = parseFloat(String(value));
            }
            if (value !== undefined) { // Permitir null para limpar campos
                updateFields.push(`${dbKey} = ?`);
                updateValues.push(value);
            }
        }
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      const sqlUpdateLicitacao = `UPDATE licitacoes SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);
      await connection.execute(sqlUpdateLicitacao, updateValues);
    }

    // Lógica para atualizar/adicionar documentos (se fornecido 'documentos')
    // Originalmente, PATCH adicionava novos documentos, não mexia nos existentes.
    if (data.documentos && Array.isArray(data.documentos)) {
        const criadoPorId = data.usuarioId || data.responsavelId; // ID do usuário que está fazendo a alteração
        for (const doc of data.documentos.filter((d:any) => !d.id)) { // Apenas novos
            const newDocId = uuidv4();
            await connection.execute(
              `INSERT INTO documentos (id, nome, tipo, url_documento, arquivo_path, formato, tamanho, status, criado_por, licitacao_id, categoria, data_criacao, data_atualizacao)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                newDocId, doc.nome, doc.tipo || 'Outro', doc.url || null, doc.arquivo || null,
                doc.formato || null, doc.tamanho || 0, doc.status || 'ativo', criadoPorId, id,
                doc.categoria || null
              ]
            );
            if (doc.tags && Array.isArray(doc.tags)) {
              for (const tagName of doc.tags) {
                 if (typeof tagName !== 'string' || tagName.trim() === '') continue;
                let [tagRows]: any = await connection.execute('SELECT id FROM tags WHERE nome = ?', [tagName.trim()]);
                let tagId;
                if (tagRows.length > 0) { tagId = tagRows[0].id; }
                else {
                  tagId = uuidv4();
                  await connection.execute('INSERT INTO tags (id, nome) VALUES (?, ?)', [tagId, tagName.trim()]);
                }
                await connection.execute('INSERT INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)', [newDocId, tagId]);
              }
            }
        }
    }

    // Lógica para atualizar/substituir responsáveis (se fornecido 'responsaveis' ou 'responsaveisIds')
    if (data.responsaveis && Array.isArray(data.responsaveis)) {
        await connection.execute('DELETE FROM licitacao_responsaveis WHERE licitacao_id = ?', [id]);
        for (const resp of data.responsaveis) { // resp = { id: userId, papel: '...'}
            if (resp.id) {
                await connection.execute(
                'INSERT INTO licitacao_responsaveis (id, licitacao_id, usuario_id, papel, data_atribuicao) VALUES (?, ?, ?, ?, NOW())',
                [uuidv4(), id, resp.id, resp.papel || 'Participante']
                );
            }
        }
    }


    await connection.commit();
    console.log('Transação MySQL commitada para PATCH licitacao ID:', id);
    
    const licitacaoCompleta = await obterLicitacaoCompletaMySQL(id, connection);
     if (!licitacaoCompleta) {
      return NextResponse.json({ error: 'Licitação não encontrada após PATCH' }, { status: 404 });
    }
    return NextResponse.json(licitacaoCompleta);

  } catch (error: any) {
    console.error('Erro ao atualizar parcialmente licitação (MySQL PATCH):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação PATCH:", rbError.message));
    return NextResponse.json(
      { error: 'Erro interno ao atualizar parcialmente licitação', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - Excluir uma licitação
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let connection;
  const { id } = await context.params;
  console.log(`DELETE /api/licitacoes/${id} - Iniciando exclusão com MySQL`);
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Buscar IDs dos documentos associados para deletar suas tags
    const [docsToDelete]:any = await connection.execute('SELECT id FROM documentos WHERE licitacao_id = ?', [id]);
    for (const doc of docsToDelete) {
        await connection.execute('DELETE FROM documentos_tags WHERE documento_id = ?', [doc.id]);
    }

    // 2. Deletar documentos associados
    await connection.execute('DELETE FROM documentos WHERE licitacao_id = ?', [id]);
    
    // 3. licitacao_responsaveis são deletados por ON DELETE CASCADE (definido no DDL)
    // Não é necessário deletar explicitamente de licitacao_etapas e licitacao_historico se tiverem ON DELETE CASCADE
    // Se não, precisariam ser deletados aqui. O DDL gerado tem ON DELETE CASCADE para eles.

    // 4. Deletar a licitação principal
    const [result]: any = await connection.execute('DELETE FROM licitacoes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Licitação não encontrada para exclusão' }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ message: 'Licitação e seus dados relacionados foram excluídos com sucesso' });

  } catch (error: any) {
    console.error('Erro ao excluir licitação (MySQL DELETE):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação DELETE:", rbError.message));
    return NextResponse.json(
      { error: 'Erro interno ao excluir licitação' },
      { status: 500 }
    );
  }
}
