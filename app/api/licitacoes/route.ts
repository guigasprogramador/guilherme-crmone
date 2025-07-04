import { NextRequest, NextResponse } from 'next/server';
import { Licitacao, LicitacaoStatus, LicitacaoFiltros, LicitacaoEstatisticas, DocumentoDetalhado } from '@/types/licitacoes';
import { getDbConnection, Connection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Helper para converter valores monetários corretamente
function parseValorMonetario(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  
  // Se já é um número, retorna diretamente
  if (typeof valor === 'number') return valor;
  
  // Converte para string e remove espaços
  let valorStr = String(valor).trim();
  
  // Remove símbolos de moeda (R$, $, etc.)
  valorStr = valorStr.replace(/[R$\s]/g, '');
  
  // Se contém vírgula e ponto, assume formato brasileiro (ex: 1.234.567,89)
  if (valorStr.includes(',') && valorStr.includes('.')) {
    // Remove pontos (separadores de milhares) e substitui vírgula por ponto
    valorStr = valorStr.replace(/\./g, '').replace(',', '.');
  }
  // Se contém apenas vírgula, assume que é separador decimal brasileiro
  else if (valorStr.includes(',') && !valorStr.includes('.')) {
    valorStr = valorStr.replace(',', '.');
  }
  // Se contém apenas ponto, verifica se é separador decimal ou de milhares
  else if (valorStr.includes('.')) {
    // Se há mais de um ponto ou o último ponto não tem exatamente 2 dígitos após, assume separador de milhares
    const pontos = valorStr.split('.');
    if (pontos.length > 2 || (pontos.length === 2 && pontos[1].length !== 2)) {
      valorStr = valorStr.replace(/\./g, '');
    }
  }
  
  const resultado = parseFloat(valorStr);
  return isNaN(resultado) ? null : resultado;
}

// Helper para converter string DD/MM/YYYY ou ISO para YYYY-MM-DD
function parseToYYYYMMDD(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    // Ajustar para o fuso horário local antes de pegar o ISO string, para evitar problemas de dia anterior/posterior
    // Esta é uma forma de tentar manter a data "local" pretendida.
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return localDate.toISOString().split('T')[0];
  }
  // Se o parse direto falhar, tentar formato DD/MM/YYYY
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
// Adaptação da função formatarLicitacao original
function formatarLicitacaoMySQL(
    item: any,
    orgaoNome: string | null = null,
    responsavelPrincipalNome: string | null = null,
    responsaveisMultiplos: { id: string, nome: string, papel?: string }[] = [], // Array de objetos para múltiplos responsáveis
    documentosLicitacao: any[] = [] // Documentos já podem vir com tags agregadas
): Licitacao {
  
  // Formatar valor para string monetária BRL
  let valorEstimadoFormatado = 'R$ 0,00';
  if (item.valor_estimado !== null && item.valor_estimado !== undefined && item.valor_estimado !== '') {
    const valorNumerico = Number(item.valor_estimado);
    if (!isNaN(valorNumerico)) {
      valorEstimadoFormatado = `R$ ${valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  
  // Formatar datas para DD/MM/YYYY, se existirem
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    // Assume que dateStr já está no formato YYYY-MM-DD ou é um objeto Date
    const date = new Date(dateStr);
    // Ajuste para UTC para pegar a data correta independente do fuso horário do servidor de BD
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
  };

  return {
    id: item.id,
    titulo: item.titulo,
    status: item.status as LicitacaoStatus,
    modalidade: item.modalidade,
    numeroProcesso: item.numero_processo, // Ajustado para snake_case do DB
    dataAbertura: formatDate(item.data_abertura),
    dataLimiteProposta: formatDate(item.data_limite_proposta),
    orgao: orgaoNome || item.orgao_nome || '', // orgao_nome da junção na query principal
    orgaoId: item.orgao_id,
    valorEstimado: valorEstimadoFormatado,
    _valorEstimadoNumerico: Number(item.valor_estimado), // Para cálculos no frontend se necessário
    objeto: item.objeto,
    edital: item.edital,
    numeroEdital: item.numero_edital,
    responsavel: responsavelPrincipalNome || item.responsavel_principal_nome || 'N/D', // da junção na query principal
    responsavelId: item.responsavel_id,
    responsaveis: responsaveisMultiplos.map(r => ({ id: r.id, nome: r.nome, papel: r.papel || 'N/A' })), // Mapeia para o formato esperado
    prazo: item.prazo, // Este campo parece ser uma string descritiva, não uma data
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
    documentos: documentosLicitacao.map((doc: any): DocumentoDetalhado => ({
      id: doc.id,
      nome: doc.nome,
      url: doc.url_documento || doc.url, // url_documento do DDL, url do Supabase
      arquivo: doc.arquivo_path || doc.arquivo, // arquivo_path do DDL, arquivo do Supabase
      data_criacao: doc.data_criacao ? new Date(doc.data_criacao).toISOString() : '',
      data_atualizacao: doc.data_atualizacao ? new Date(doc.data_atualizacao).toISOString() : '',
      tipo: doc.tipo,
      tamanho: doc.tamanho,
      licitacaoId: doc.licitacao_id,
      formato: doc.formato,

      tags: doc.tags ? doc.tags.split(',') : [], // Tags agregadas como string
      uploadPor: doc.criado_por,
      // uploadPor: doc.criado_por, // Se upload_por no frontend mapeia para criado_por
      status: doc.status,
      dataValidade: formatDate(doc.data_validade),
      // resumo: doc.resumo, // Se necessário
    }))
  };
}


// Função para obter uma licitação completa por ID do MySQL
async function obterLicitacaoCompletaMySQL(licitacaoId: string, connection: any): Promise<Licitacao | null> {
  // 1. Buscar a licitação principal e dados do órgão e responsável principal
  const [licitacaoRows]: any = await connection.execute(
    `SELECT l.*, o.nome as orgao_nome, u.name as responsavel_principal_nome
     FROM licitacoes l
     LEFT JOIN orgaos o ON l.orgao_id = o.id
     LEFT JOIN users u ON l.responsavel_id = u.id
     WHERE l.id = ?`,
    [licitacaoId]
  );

  if (licitacaoRows.length === 0) {
    return null;
  }
  const licitacaoPrincipal = licitacaoRows[0];

  // 2. Buscar os múltiplos responsáveis (usuários)
  const [responsaveisRows]: any = await connection.execute(
    `SELECT u.id, u.name as nome, lr.papel
     FROM licitacao_responsaveis lr
     JOIN users u ON lr.usuario_id = u.id
     WHERE lr.licitacao_id = ?`,
    [licitacaoId]
  );

  // 3. Buscar documentos relacionados com tags agregadas
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

// Função para obter estatísticas do MySQL
async function obterEstatisticasMySQL(connection: any, periodo: string): Promise<LicitacaoEstatisticas> {
  const hoje = new Date();
  let dataInicio = new Date();
  switch (periodo) {
    case 'semana': dataInicio.setDate(hoje.getDate() - 7); break;
    case 'mes': dataInicio.setMonth(hoje.getMonth() - 1); break;
    case 'trimestre': dataInicio.setMonth(hoje.getMonth() - 3); break;
    case 'ano': dataInicio.setFullYear(hoje.getFullYear() - 1); break;
    default: dataInicio.setMonth(hoje.getMonth() - 1);
  }
  const dataInicioSql = dataInicio.toISOString().split('T')[0];

  const [totalRows]: any = await connection.execute('SELECT COUNT(*) as count FROM licitacoes WHERE data_criacao >= ?', [dataInicioSql]);
  const [vencidasRows]: any = await connection.execute("SELECT COUNT(*) as count FROM licitacoes WHERE status = 'fechado_ganho' AND data_criacao >= ?", [dataInicioSql]); // Assumindo 'fechado_ganho' como 'vencida'
  const [ativasRows]: any = await connection.execute("SELECT COUNT(*) as count FROM licitacoes WHERE status IN ('analise_interna', 'aguardando_pregao', 'envio_documentos', 'assinaturas', 'novo_lead', 'proposta_enviada', 'negociacao') AND data_criacao >= ?", [dataInicioSql]);
  const [valorTotalRows]: any = await connection.execute("SELECT SUM(valor_estimado) as sum FROM licitacoes WHERE status NOT IN ('arquivada', 'fechado_perdido') AND data_criacao >= ?", [dataInicioSql]);
  
  const [finalizadasStatusRows]: any = await connection.execute(
      "SELECT COUNT(*) as total_finalizadas, SUM(CASE WHEN status = 'fechado_ganho' THEN 1 ELSE 0 END) as total_vencidas FROM licitacoes WHERE status IN ('fechado_ganho', 'fechado_perdido') AND data_criacao >= ?",
      [dataInicioSql]
  );
  const taxaSucesso = (finalizadasStatusRows[0].total_finalizadas > 0)
      ? (finalizadasStatusRows[0].total_vencidas / finalizadasStatusRows[0].total_finalizadas) * 100
      : 0;

  const [pregoesProximosRows]: any = await connection.execute("SELECT COUNT(*) as count FROM licitacoes WHERE data_abertura BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND data_criacao >= ?", [dataInicioSql]);
  const [porModalidadeRows]: any = await connection.execute('SELECT modalidade, COUNT(*) as count FROM licitacoes WHERE data_criacao >= ? GROUP BY modalidade', [dataInicioSql]);
  const [porStatusRows]: any = await connection.execute('SELECT status, COUNT(*) as count FROM licitacoes WHERE data_criacao >= ? GROUP BY status', [dataInicioSql]);

  const porModalidade: Record<string, number> = {};
  (porModalidadeRows as any[]).forEach(row => { porModalidade[row.modalidade] = row.count; });
  const porStatus: Record<string, number> = {};
  (porStatusRows as any[]).forEach(row => { porStatus[row.status] = row.count; });

  return {
    total: totalRows[0].count,
    ativas: ativasRows[0].count,
    vencidas: vencidasRows[0].count, // 'fechado_ganho'
    valorTotal: valorTotalRows[0].sum || 0,
    taxaSucesso: parseFloat(taxaSucesso.toFixed(2)),
    pregoesProximos: pregoesProximosRows[0].count,
    porModalidade,
    porStatus,
  };
}


// GET - Obter licitações com filtros ou estatísticas
export async function GET(request: NextRequest) {
  let connection: Connection | null = null;
  console.log('API de licitações: Recebendo requisição GET com MySQL');
  try {
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();

    const estatisticasParam = searchParams.get('estatisticas');
    if (estatisticasParam === 'true') {
      const periodo = searchParams.get('periodo') || 'mes';
      const stats = await obterEstatisticasMySQL(connection, periodo);
      return NextResponse.json(stats);
    }

    let sql = `
      SELECT l.id, l.titulo, l.status, l.modalidade, l.data_abertura, l.valor_estimado,
             o.nome as orgao_nome, u.name as responsavel_principal_nome,
             l.data_criacao, l.data_atualizacao, l.objeto, l.descricao, l.numero_edital, l.prazo,
             l.orgao_id, l.responsavel_id
      FROM licitacoes l
      LEFT JOIN orgaos o ON l.orgao_id = o.id
      LEFT JOIN users u ON l.responsavel_id = u.id
    `;
    const conditions: string[] = [];
    const paramsSql: any[] = [];

    const status = searchParams.get('status');
    if (status) { conditions.push('l.status = ?'); paramsSql.push(status); }
    
    const orgaoId = searchParams.get('orgaoId');
    if (orgaoId) { conditions.push('l.orgao_id = ?'); paramsSql.push(orgaoId); }
    
    const responsavelId = searchParams.get('responsavelId');
    if (responsavelId) { conditions.push('l.responsavel_id = ?'); paramsSql.push(responsavelId); }
    
    const modalidade = searchParams.get('modalidade');
    if (modalidade) { conditions.push('l.modalidade = ?'); paramsSql.push(modalidade); }
    
    const termo = searchParams.get('termo');
    if (termo) {
      conditions.push('(l.titulo LIKE ? OR l.objeto LIKE ? OR l.descricao LIKE ?)');
      const searchTerm = `%${termo}%`;
      paramsSql.push(searchTerm, searchTerm, searchTerm);
    }
    
    const dataInicio = parseToYYYYMMDD(searchParams.get('dataInicio'));
    if (dataInicio) { conditions.push('l.data_abertura >= ?'); paramsSql.push(dataInicio); }
    
    const dataFim = parseToYYYYMMDD(searchParams.get('dataFim'));
    if (dataFim) { conditions.push('l.data_abertura <= ?'); paramsSql.push(dataFim); }
    
    const valorMin = searchParams.get('valorMin');
    if (valorMin) { conditions.push('l.valor_estimado >= ?'); paramsSql.push(parseFloat(valorMin));}
    
    const valorMax = searchParams.get('valorMax');
    if (valorMax) { conditions.push('l.valor_estimado <= ?'); paramsSql.push(parseFloat(valorMax));}

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY l.data_atualizacao DESC';

    console.log("Executando SQL para lista de licitações:", sql, paramsSql);
    const [rows] = await connection.execute(sql, paramsSql);
    const licitacoesData = rows as any[];

    if (licitacoesData.length === 0) {
      return NextResponse.json([]);
    }
    
    // Para a lista, não vamos buscar todos os detalhes de cada licitação (responsaveis multiplos, documentos)
    // para evitar N+1 queries. A formatação lidará com os dados disponíveis.
    const licitacoesFormatadas = licitacoesData.map(lic =>
        formatarLicitacaoMySQL(
            lic,
            lic.orgao_nome,
            lic.responsavel_principal_nome,
            [], // Sem múltiplos responsáveis na lista geral por padrão
            []  // Sem documentos na lista geral por padrão
        )
    );

    return NextResponse.json(licitacoesFormatadas);

  } catch (error: any) {
    console.error('Erro ao consultar licitações (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao listar licitações: ' + error.message, details: error.code || 'N/A' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      // A conexão é liberada automaticamente quando a função termina
      // console.log("Conexão com o banco de dados será fechada.");
    }
  }
}

// POST - Criar nova licitação
export async function POST(request: NextRequest) {
  let connection: Connection | null = null;
  console.log('API de licitações: Recebendo requisição POST para MySQL');
  try {
    const licitacaoData = await request.json();
    console.log('Dados recebidos para POST:', JSON.stringify(licitacaoData).substring(0, 300) + '...');

    if (!licitacaoData.titulo || !licitacaoData.modalidade || !licitacaoData.orgaoId) {
      return NextResponse.json(
        { error: 'Título, Modalidade e Órgão são obrigatórios.' },
        { status: 400 }
      );
    }

    connection = await getDbConnection();
    if (!connection) {
      throw new Error('Failed to get database connection');
    }
    
    // Verificar se já existe uma licitação com o mesmo título e órgão
    const [existingLicitacao]: any = await connection.execute(
      'SELECT id, titulo FROM licitacoes WHERE titulo = ? AND orgao_id = ? LIMIT 1',
      [licitacaoData.titulo, licitacaoData.orgaoId]
    );
    
    if (existingLicitacao.length > 0) {
      console.log('Licitação já existe:', existingLicitacao[0]);
      return NextResponse.json(
        { error: 'Já existe uma licitação com este título para este órgão.' },
        { status: 409 }
      );
    }
    
    await connection.beginTransaction();
    console.log('Transação MySQL iniciada para criar licitação.');

    const newLicId = uuidv4();
    const dataAtual = new Date(); // Para created_at e updated_at

    // Mapear e converter dados para o formato do DB (snake_case)
    const licitacaoDb: any = { // Added :any for dynamic property deletion
      id: newLicId,
      titulo: licitacaoData.titulo,
      status: licitacaoData.status || 'analise_interna', // Default status
      modalidade: licitacaoData.modalidade,
      // numero_processo: licitacaoData.numeroProcesso || null, // REMOVED
      objeto: licitacaoData.objeto || null,
      edital: licitacaoData.edital || null,
      numero_edital: licitacaoData.numeroEdital || null,
      data_abertura: parseToYYYYMMDD(licitacaoData.dataAbertura),
      data_limite_proposta: parseToYYYYMMDD(licitacaoData.dataLimiteProposta),
      data_julgamento: parseToYYYYMMDD(licitacaoData.dataJulgamento),
      orgao_id: licitacaoData.orgaoId,
      valor_estimado: licitacaoData.valorEstimado ? parseValorMonetario(licitacaoData.valorEstimado) : null,
      responsavel_id: licitacaoData.responsavelId || null, // FK para users
      prazo: licitacaoData.prazo || null,
      url_licitacao: licitacaoData.urlLicitacao || null,
      url_edital: licitacaoData.urlEdital || null,
      descricao: licitacaoData.descricao || null,
      forma_pagamento: licitacaoData.formaPagamento || null,
      obs_financeiras: licitacaoData.obsFinanceiras || null,
      tipo: licitacaoData.tipo || null,
      tipo_faturamento: licitacaoData.tipoFaturamento || null,
      margem_lucro: licitacaoData.margemLucro ? parseFloat(String(licitacaoData.margemLucro)) : null,
      contato_nome: licitacaoData.contatoNome || null,
      contato_email: licitacaoData.contatoEmail || null,
      contato_telefone: licitacaoData.contatoTelefone || null,
      posicao_kanban: licitacaoData.posicaoKanban || 0,
      // data_criacao e data_atualizacao serão definidos como NOW() no insert
    };

    // Conditionally add numero_processo if it exists in licitacaoData and is not null/undefined
    // However, the task is to REMOVE it due to "Unknown column" error, so we ensure it's not added.
    // If licitacaoData.numeroProcesso is present, we are explicitly not adding it to licitacaoDb.

    const licitacaoFields = Object.keys(licitacaoDb);
    const licitacaoPlaceholders = licitacaoFields.map(() => '?').join(', ');
    const licitacaoValues = Object.values(licitacaoDb);

    const sqlInsertLicitacao = `
      INSERT INTO licitacoes (${licitacaoFields.join(', ')}, data_criacao, data_atualizacao)
      VALUES (${licitacaoPlaceholders}, NOW(), NOW())
    `;
    await connection.execute(sqlInsertLicitacao, licitacaoValues);
    console.log('Licitação inserida com ID:', newLicId);

    // Lidar com responsaveisIds (múltiplos responsáveis)
    if (licitacaoData.responsaveis && Array.isArray(licitacaoData.responsaveis) && licitacaoData.responsaveis.length > 0) {
      const responsaveisInsertPromises = licitacaoData.responsaveis.map((resp: any) => {
        // resp deve ser um objeto { id: userId, papel: 'seu papel' }
        // Se for apenas um array de IDs, o papel precisa ser definido ou default
        const responsavelUserId = typeof resp === 'string' ? resp : resp.id;
        const papel = typeof resp === 'object' ? resp.papel : 'Participante'; // Default papel

        if (!responsavelUserId) return Promise.resolve(); // Ignorar se não houver ID

        if (!connection) throw new Error("A conexão com o banco de dados não foi estabelecida.");
        return connection.execute(
          'INSERT INTO licitacao_responsaveis (id, licitacao_id, usuario_id, papel, data_atribuicao) VALUES (?, ?, ?, ?, NOW())',
          [uuidv4(), newLicId, responsavelUserId, papel]
        );
      });
      await Promise.all(responsaveisInsertPromises);
      console.log('Responsáveis da licitação inseridos.');
    }
    
    // Lidar com documentos do repositório (vinculação)
    if (licitacaoData.documentosRepositorioIds && Array.isArray(licitacaoData.documentosRepositorioIds) && licitacaoData.documentosRepositorioIds.length > 0) {
      for (const documentoId of licitacaoData.documentosRepositorioIds) {
        if (!connection) throw new Error("A conexão com o banco de dados não foi estabelecida.");
        // Atualizar o documento existente para vincular à licitação
        await connection.execute(
          'UPDATE documentos SET licitacao_id = ?, data_atualizacao = NOW() WHERE id = ?',
          [newLicId, documentoId]
        );
        console.log('Documento do repositório vinculado:', documentoId, 'à licitação:', newLicId);
      }
    }

    // Lidar com documentos
    if (licitacaoData.documentos && Array.isArray(licitacaoData.documentos) && licitacaoData.documentos.length > 0) {
      for (const doc of licitacaoData.documentos) {
        const newDocId = uuidv4();
        const criadoPorId = licitacaoData.usuarioId || licitacaoData.responsavelId; // Assumindo que o criador é o responsável principal ou um usuário logado (a ser passado)

        if (!connection) throw new Error("A conexão com o banco de dados não foi estabelecida.");
        await connection.execute(
          `INSERT INTO documentos (id, nome, tipo, url_documento, arquivo_path, formato, tamanho, status, criado_por, licitacao_id, categoria, data_criacao, data_atualizacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            newDocId, doc.nome, doc.tipo || 'Outro', doc.url || null, doc.arquivo || null,
            doc.formato || null, doc.tamanho || 0, doc.status || 'ativo', criadoPorId, newLicId,
            doc.categoria || null // Legacy categoria field
          ]
        );
        console.log('Documento inserido com ID:', newDocId, 'para licitação ID:', newLicId);

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
          console.log('Tags do documento inseridas.');
        }
      }
    }

    await connection.commit();
    console.log('Transação MySQL commitada para criar licitação.');

    // Obter a licitação completa para retornar na resposta
    const licitacaoCompleta = await obterLicitacaoCompletaMySQL(newLicId, connection);
    if (!licitacaoCompleta) {
        // Isso não deveria acontecer se a inserção e o commit foram bem-sucedidos
        return NextResponse.json({ error: "Falha ao buscar licitação recém-criada." }, { status: 500});
    }
    return NextResponse.json(licitacaoCompleta, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar licitação (MySQL):', error);
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transação MySQL revertida devido a erro.");
      } catch (rollbackError: any) {
        console.error("Erro ao tentar reverter transação MySQL:", rollbackError.message);
      }
    }
    return NextResponse.json(
      { error: 'Erro ao criar licitação: ' + error.message, details: error.code || 'N/A' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      // A conexão é liberada automaticamente quando a função termina
      // console.log("Conexão com o banco de dados será fechada.");
    }
  }
}
