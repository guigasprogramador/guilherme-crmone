import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  let connection;
  const counts = {
    orgaosInseridos: 0,
    orgaosIgnorados: 0,
    tagsInseridas: 0,
    tagsIgnoradas: 0,
    licitacoesInseridas: 0,
    licitacoesIgnoradas: 0,
    documentosInseridos: 0,
    documentosIgnorados: 0,
    documentosTagsLinkados: 0,
    documentosTagsIgnorados: 0,
  };

  console.log("GET /api/licitacoes/seed-data - Iniciando seeding com MySQL");

  try {
    connection = await getDbConnection();
    // Não usaremos transações globais para permitir que `INSERT IGNORE` funcione por partes.

    // 1. Seed `orgaos`
    interface OrgaoSeed {
      nome: string;
      cnpj: string;
      cidade: string;
      estado: string;
      tipo?: string;
      endereco?: string;
      email?: string;
      telefone?: string;
      website?: string;
      segmento?: string;
      origem_lead?: string;
      responsavel_interno?: string;
      descricao?: string;
      observacoes?: string;
      faturamento?: string;
    }

    const orgaosSeedData: OrgaoSeed[] = [
      {
        nome: 'Prefeitura Municipal de São Paulo',
        cnpj: '12.345.678/0001-01',
        cidade: 'São Paulo',
        estado: 'SP',
        tipo: 'Municipal',
        endereco: 'Viaduto do Chá, 15',
        email: 'contato@prefeitura.sp.gov.br',
        telefone: '(11) 1234-5678',
        website: 'www.prefeitura.sp.gov.br',
        segmento: 'Administração Pública',
        origem_lead: 'Direto',
        responsavel_interno: 'João Silva',
        descricao: 'Prefeitura do município de São Paulo',
        observacoes: 'Cliente desde 2023',
        faturamento: '> R$ 10.000.000,00'
      },
      {
        nome: 'Governo do Estado de São Paulo',
        cnpj: '23.456.789/0001-02',
        cidade: 'São Paulo',
        estado: 'SP',
        tipo: 'Estadual',
        endereco: 'Palácio dos Bandeirantes',
        email: 'contato@sp.gov.br',
        telefone: '(11) 2345-6789',
        website: 'www.sp.gov.br',
        segmento: 'Administração Pública',
        origem_lead: 'Indicação',
        responsavel_interno: 'Maria Santos',
        descricao: 'Governo do Estado de São Paulo',
        observacoes: 'Cliente desde 2022',
        faturamento: '> R$ 50.000.000,00'
      },
      {
        nome: 'Ministério da Educação',
        cnpj: '34.567.890/0001-03',
        cidade: 'Brasília',
        estado: 'DF',
        tipo: 'Federal',
        endereco: 'Esplanada dos Ministérios',
        email: 'contato@mec.gov.br',
        telefone: '(61) 3456-7890',
        website: 'www.mec.gov.br',
        segmento: 'Educação',
        origem_lead: 'Licitação',
        responsavel_interno: 'Pedro Oliveira',
        descricao: 'Ministério da Educação do Brasil',
        observacoes: 'Cliente desde 2024',
        faturamento: '> R$ 100.000.000,00'
      },
    ];

    for (const orgao of orgaosSeedData) {
      const newId = uuidv4();
      const sql = `INSERT IGNORE INTO orgaos (id, nome, cnpj, cidade, estado, tipo, endereco, email, telefone, website, segmento, origem_lead, responsavel_interno, descricao, observacoes, faturamento, ativo, data_criacao, data_atualizacao)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`;
      const params = [
        newId, orgao.nome, orgao.cnpj, orgao.cidade, orgao.estado,
        orgao.tipo || null, orgao.endereco || null, orgao.email || null, orgao.telefone || null, orgao.website || null,
        orgao.segmento || null, orgao.origem_lead || null, orgao.responsavel_interno || null,
        orgao.descricao || null, orgao.observacoes || null, orgao.faturamento || null
      ];
      const [result]: any = await connection.execute(sql, params);
      if (result.affectedRows > 0) counts.orgaosInseridos++; else counts.orgaosIgnorados++;
    }
    console.log(`Órgãos: ${counts.orgaosInseridos} inseridos, ${counts.orgaosIgnorados} ignorados.`);

    // 2. Fetch `orgaos` for mapping
    const [fetchedOrgaos]: any = await connection.execute('SELECT id, nome, cnpj FROM orgaos');
    const orgaosNomeMap = new Map(fetchedOrgaos.map((o: any) => [o.nome, o.id]));
    // const orgaosCnpjMap = new Map(fetchedOrgaos.map((o: any) => [o.cnpj, o.id])); // Se CNPJ for usado como chave no seed

    // 3. Seed `tags` (from `documento_categorias` concept)
    const tagsSeedData = ["Edital", "Proposta", "Habilitação", "Contrato", "Aditivo", "Planilha Orçamentária"];
    for (const tagName of tagsSeedData) {
      const newId = uuidv4();
      const sql = 'INSERT IGNORE INTO tags (id, nome, created_at, updated_at) VALUES (?, ?, NOW(), NOW())';
      const [result]: any = await connection.execute(sql, [newId, tagName]);
      if (result.affectedRows > 0) counts.tagsInseridas++; else counts.tagsIgnoradas++;
    }
    console.log(`Tags: ${counts.tagsInseridas} inseridas, ${counts.tagsIgnoradas} ignoradas.`);

    // 4. Fetch `tags` for mapping
    const [fetchedTags]: any = await connection.execute('SELECT id, nome FROM tags');
    const tagsMap = new Map(fetchedTags.map((t: any) => [t.nome, t.id]));

    // 5. Seed `licitacoes`
    const licitacoesSeedData = [
      { titulo: 'Aquisição de Computadores', orgaoNome: 'Prefeitura Municipal de São Paulo', status: 'analise_interna', data_abertura: '2025-05-01', data_publicacao: '2025-04-01', valor_estimado: 500000.00, modalidade: 'Pregão Eletrônico', objeto: 'Aquisição de 100 computadores...', numero_edital: '001/2025' },
      { titulo: 'Serviços de Manutenção Predial', orgaoNome: 'Governo do Estado de São Paulo', status: 'aguardando_pregao', data_abertura: '2025-06-15', data_publicacao: '2025-05-15', valor_estimado: 1200000.00, modalidade: 'Concorrência', objeto: 'Contratação de empresa especializada...', numero_edital: 'CONC-002/2025' },
      { titulo: 'Fornecimento de Merenda Escolar', orgaoNome: 'Ministério da Educação', status: 'envio_documentos', data_abertura: '2025-05-20', data_publicacao: '2025-04-20', valor_estimado: 3000000.00, modalidade: 'Pregão Eletrônico', objeto: 'Fornecimento de merenda escolar...', numero_edital: 'PE-003/2025' },
    ];

    for (const lic of licitacoesSeedData) {
      const newId = uuidv4();
      const orgaoId = orgaosNomeMap.get(lic.orgaoNome);
      if (!orgaoId) {
        console.warn(`Órgão "${lic.orgaoNome}" não encontrado para a licitação "${lic.titulo}". Pulando.`);
        counts.licitacoesIgnoradas++;
        continue;
      }
      const sql = `INSERT IGNORE INTO licitacoes (id, titulo, orgao_id, status, data_abertura, data_publicacao, valor_estimado, modalidade, objeto, numero_edital, data_criacao, data_atualizacao)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      const params = [
        newId, lic.titulo, orgaoId, lic.status, parseToYYYYMMDD(lic.data_abertura), parseToYYYYMMDD(lic.data_publicacao),
        lic.valor_estimado, lic.modalidade, lic.objeto, lic.numero_edital
      ];
      const [result]: any = await connection.execute(sql, params);
      if (result.affectedRows > 0) counts.licitacoesInseridas++; else counts.licitacoesIgnoradas++;
    }
    console.log(`Licitações: ${counts.licitacoesInseridas} inseridas, ${counts.licitacoesIgnoradas} ignoradas.`);

    // 6. Fetch `licitacoes` for mapping
    const [fetchedLicitacoes]: any = await connection.execute('SELECT id, titulo FROM licitacoes');
    const licitacoesMap = new Map(fetchedLicitacoes.map((l: any) => [l.titulo, l.id]));

    // 7. Seed `documentos` and `documentos_tags`
    // Supondo que um user_id 'seed_user_id' existe ou é NULLable para `criado_por`
    const defaultUserIdForSeed = null; // ou um UUID válido de um usuário existente
    console.warn("AVISO: Documentos serão criados com URL/Path de placeholder e criado_por como null ou 'seed_user_id'.");

    const documentosSeedData = [
      { nome: 'Edital de Licitação - Computadores.pdf', licitacaoTitulo: 'Aquisição de Computadores', tagNome: 'Edital', tipo: 'pdf', status: 'ativo' },
      { nome: 'Proposta Comercial - Manutenção.pdf', licitacaoTitulo: 'Serviços de Manutenção Predial', tagNome: 'Proposta', tipo: 'pdf', status: 'ativo' },
      { nome: 'Documentos de Habilitação - Merenda.zip', licitacaoTitulo: 'Fornecimento de Merenda Escolar', tagNome: 'Habilitação', tipo: 'zip', status: 'ativo' },
    ];

    for (const doc of documentosSeedData) {
      const newId = uuidv4();
      const licitacaoId = licitacoesMap.get(doc.licitacaoTitulo);
      const tagId = tagsMap.get(doc.tagNome);

      if (!licitacaoId) {
        console.warn(`Licitação "${doc.licitacaoTitulo}" não encontrada para o documento "${doc.nome}". Pulando.`);
        counts.documentosIgnorados++;
        continue;
      }

      const urlPlaceholder = `pending_storage_solution/seed/${newId}/${doc.nome}`;
      const pathPlaceholder = `seed/${newId}/${doc.nome}`;

      const sqlDoc = `INSERT IGNORE INTO documentos (id, nome, licitacao_id, tipo, status, url_documento, arquivo_path, criado_por, data_criacao, data_atualizacao)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      const paramsDoc = [newId, doc.nome, licitacaoId, doc.tipo, doc.status, urlPlaceholder, pathPlaceholder, defaultUserIdForSeed];
      const [resultDoc]: any = await connection.execute(sqlDoc, paramsDoc);

      if (resultDoc.affectedRows > 0) {
        counts.documentosInseridos++;
        if (tagId) {
          const sqlDocTag = 'INSERT IGNORE INTO documentos_tags (documento_id, tag_id) VALUES (?, ?)';
          const [resultDocTag]: any = await connection.execute(sqlDocTag, [newId, tagId]);
          if (resultDocTag.affectedRows > 0) counts.documentosTagsLinkados++; else counts.documentosTagsIgnorados++;
        } else {
          console.warn(`Tag "${doc.tagNome}" não encontrada para o documento "${doc.nome}".`);
        }
      } else {
        counts.documentosIgnorados++;
      }
    }
    console.log(`Documentos: ${counts.documentosInseridos} inseridos, ${counts.documentosIgnorados} ignorados.`);
    console.log(`Documentos_Tags: ${counts.documentosTagsLinkados} linkados, ${counts.documentosTagsIgnorados} ignorados.`);

    return NextResponse.json({
      mensagem: 'Dados de teste processados com MySQL e INSERT IGNORE.',
      dados: counts
    });

  } catch (error: any) {
    console.error('Erro ao inserir dados de teste (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao inserir dados de teste' },
      { status: 500 }
    );
  }
}
