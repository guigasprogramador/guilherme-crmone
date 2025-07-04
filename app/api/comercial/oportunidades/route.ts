import { NextRequest, NextResponse } from 'next/server';
import { Oportunidade } from '@/types/comercial'; // OportunidadeStatus might not be needed if status is string
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// Função auxiliar para formatar oportunidades do MySQL para o formato da aplicação
function formatarOportunidadesDoMySQL(oportunidades: any[]): Oportunidade[] {
  return oportunidades.map(opp => {
    let prazoFormatted = 'Não definido';
    if (opp.prazo) {
      const dataPrazo = new Date(opp.prazo);
      // Ajuste para evitar problemas de fuso horário que podem mudar a data
      const userTimezoneOffset = dataPrazo.getTimezoneOffset() * 60000;
      prazoFormatted = new Date(dataPrazo.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
    }

    let dataReuniaoFormatted = '';
    if (opp.data_reuniao) {
      const dataReuniao = new Date(opp.data_reuniao);
      const userTimezoneOffset = dataReuniao.getTimezoneOffset() * 60000;
      dataReuniaoFormatted = new Date(dataReuniao.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
    }

    return {
      id: opp.id,
      titulo: opp.titulo,
      // Campos da view_oportunidades
      cliente: opp.cliente_nome || 'Cliente não especificado',
      clienteId: opp.cliente_id,
      valor: opp.valor ? `R$ ${Number(opp.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'A definir',
      responsavel: opp.responsavel_nome || 'Não atribuído',
      responsavelId: opp.responsavel_id,
      prazo: prazoFormatted,
      status: opp.status,
      descricao: opp.oportunidade_descricao, // Nome do campo na view_oportunidades
      dataCriacao: opp.data_criacao, // da tabela oportunidades, alias o.data_criacao na view
      dataAtualizacao: opp.data_atualizacao, // da tabela oportunidades, alias o.data_atualizacao na view
      tipo: opp.tipo,
      tipoFaturamento: opp.tipo_faturamento,
      dataReuniao: dataReuniaoFormatted,
      horaReuniao: opp.hora_reuniao, // hh:mm:ss
      probabilidade: opp.probabilidade,
      // Campos que podem não estar na view, mas estavam no tipo Oportunidade
      cnpj: opp.cliente_cnpj, // da view
      contatoNome: opp.contato_nome, // da view
      contatoTelefone: opp.contato_telefone, // da view
      contatoEmail: opp.contato_email, // da view
      segmento: opp.cliente_segmento, // da view
      // endereco: opp.cliente_endereco, // Se precisar e estiver na view
      // responsaveisIds: [], // Este campo precisaria de lógica adicional se usado
    };
  });
}

// GET - Listar todas as oportunidades ou filtrar
export async function GET(request: NextRequest) {
  console.log("GET /api/comercial/oportunidades - Iniciando consulta de oportunidades com MySQL");
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    
    const termo = searchParams.get('termo');
    const status = searchParams.get('status');
    const clienteNome = searchParams.get('cliente'); // Filtrando por nome do cliente
    const responsavelNome = searchParams.get('responsavel'); // Filtrando por nome do responsável
    const dataInicio = searchParams.get('dataInicio'); // YYYY-MM-DD
    const dataFim = searchParams.get('dataFim'); // YYYY-MM-DD
    
    console.log("Filtros aplicados:", { termo, status, clienteNome, responsavelNome, dataInicio, dataFim });
    
    connection = await getDbConnection();
    
    let sql = 'SELECT * FROM view_oportunidades';
    const conditions: string[] = [];
    const params: any[] = [];

    if (termo) {
      conditions.push('(titulo LIKE ? OR cliente_nome LIKE ? OR oportunidade_descricao LIKE ?)');
      const searchTerm = `%${termo}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (status && status !== 'todos') {
      conditions.push('status = ?');
      params.push(status);
    }
    
    if (clienteNome && clienteNome !== 'todos') {
      // Assumindo que o frontend envia o nome do cliente para filtro
      conditions.push('cliente_nome = ?');
      params.push(clienteNome);
    }
    
    if (responsavelNome && responsavelNome !== 'todos') {
      // Assumindo que o frontend envia o nome do responsável para filtro
      conditions.push('responsavel_nome = ?');
      params.push(responsavelNome);
    }
    
    if (dataInicio) {
      conditions.push('prazo >= ?');
      params.push(dataInicio); // Espera-se YYYY-MM-DD
    }
    
    if (dataFim) {
      conditions.push('prazo <= ?');
      params.push(dataFim); // Espera-se YYYY-MM-DD
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY data_criacao DESC'; // data_criacao da tabela oportunidades

    console.log("Executando SQL:", sql, params);
    const [rows] = await connection.execute(sql, params);
    const data = rows as any[];

    if (data && data.length > 0) {
      console.log(`Encontradas ${data.length} oportunidades no MySQL`);
      const formatadas = formatarOportunidadesDoMySQL(data);
      return NextResponse.json(formatadas);
    }
    
    console.log("Nenhuma oportunidade encontrada no MySQL com os filtros aplicados.");
    return NextResponse.json([]);

  } catch (error: any) {
    console.error('Erro ao processar requisição de oportunidades (MySQL):', error);
    if (connection) await connection.release();
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de oportunidades' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Oportunidades).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Oportunidades):", releaseError.message);
      }
    }
  }
}

// Helper para converter string DD/MM/YYYY para YYYY-MM-DD
function parseDateString(dateString: string | undefined | null): string | null {
  if (!dateString || dateString === 'Não definido') return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
  }
  // Tentar parsear diretamente se já estiver em formato compatível ou ISO
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return null;
}

// Função auxiliar para converter valores monetários
function parseValorMonetario(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  if (!valor || typeof valor !== 'string') return 0;
  
  // Remove espaços e converte para string
  const valorLimpo = valor.toString().trim();
  
  // Remove símbolos de moeda e espaços
  let valorSemSimbolo = valorLimpo.replace(/[R$\s]/g, '');
  
  // Se não há vírgula nem ponto, é um número inteiro
  if (!valorSemSimbolo.includes(',') && !valorSemSimbolo.includes('.')) {
    const num = parseInt(valorSemSimbolo) || 0;
    return num;
  }
  
  // Se há vírgula, assumimos formato brasileiro (vírgula = decimal)
  if (valorSemSimbolo.includes(',')) {
    // Remove pontos (separadores de milhares) e substitui vírgula por ponto
    valorSemSimbolo = valorSemSimbolo.replace(/\./g, '').replace(',', '.');
  }
  // Se há apenas ponto, pode ser separador decimal ou de milhares
  else if (valorSemSimbolo.includes('.')) {
    // Se há mais de um ponto, o último é decimal
    const pontos = valorSemSimbolo.split('.');
    if (pontos.length > 2) {
      // Múltiplos pontos: os primeiros são separadores de milhares
      const parteInteira = pontos.slice(0, -1).join('');
      const parteDecimal = pontos[pontos.length - 1];
      valorSemSimbolo = parteInteira + '.' + parteDecimal;
    }
    // Se há apenas um ponto e a parte depois tem 3 dígitos, é separador de milhares
    else if (pontos[1] && pontos[1].length === 3 && /^\d+$/.test(pontos[1])) {
      valorSemSimbolo = valorSemSimbolo.replace('.', '');
    }
    // Caso contrário, é separador decimal
  }
  
  const resultado = parseFloat(valorSemSimbolo) || 0;
  return resultado;
}

// Helper para converter valor monetário "R$ X.XXX,XX" para DECIMAL
function parseCurrency(currencyValue: string | number | undefined | null): number | null {
  if (currencyValue === undefined || currencyValue === null || currencyValue === 'A definir') return null;
  if (typeof currencyValue === 'number') return currencyValue;
  if (typeof currencyValue === 'string') {
    const value = parseValorMonetario(currencyValue);
    return value;
  }
  return null;
}


// POST - Criar nova oportunidade
export async function POST(request: NextRequest) {
  let connection;
  console.log('POST /api/comercial/oportunidades - Iniciando criação de oportunidade com MySQL');
  try {
    const data = await request.json();
    console.log('Dados recebidos para criar oportunidade:', data);
    
    if (!data.titulo || !data.cliente) {
      return NextResponse.json({ error: 'Título e nome do cliente são obrigatórios' }, { status: 400 });
    }
    if (!data.tipo) {
      return NextResponse.json({ error: 'O tipo da oportunidade (produto/serviço) é obrigatório' }, { status: 400 });
    }
    if (data.tipo === 'produto' && !data.tipoFaturamento) {
      return NextResponse.json({ error: 'Para produtos, o tipo de faturamento é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();
    await connection.beginTransaction();
    console.log("Transação MySQL iniciada.");

    let clienteId = data.clienteId; // Se o ID do cliente já é fornecido

    if (!clienteId) {
        // Tentar encontrar cliente existente pelo CNPJ ou nome
        let existingClientQuery = 'SELECT id FROM clientes WHERE ';
        const queryParams = [];
        if (data.cnpj) {
            existingClientQuery += 'cnpj = ?';
            queryParams.push(data.cnpj);
        } else {
            existingClientQuery += 'nome = ?'; // Fallback para nome se CNPJ não fornecido
            queryParams.push(data.cliente);
        }
        
        const [clientRows]: any = await connection.execute(existingClientQuery, queryParams);

        if (clientRows.length > 0) {
            clienteId = clientRows[0].id;
            console.log('Cliente existente encontrado no MySQL:', clienteId);
        } else if (data.cliente && data.cnpj) { // Criar novo cliente apenas se CNPJ E nome foram fornecidos
            const newClientId = uuidv4();
            const novoClienteDB = {
                id: newClientId,
                nome: data.cliente,
                cnpj: data.cnpj,
                contato_nome: data.contatoNome || null,
                contato_telefone: data.contatoTelefone || null,
                contato_email: data.contatoEmail || null,
                endereco: data.endereco || null,
                cidade: data.cidade || null,
                estado: data.estado || null,
                segmento: data.segmento || 'Outros',
                ativo: 1,
                // data_cadastro, created_at, updated_at terão default ou serão NOW()
            };
            console.log('Criando novo cliente no MySQL:', novoClienteDB);
            await connection.execute(
              'INSERT INTO clientes (id, nome, cnpj, contato_nome, contato_telefone, contato_email, endereco, cidade, estado, segmento, ativo, data_cadastro, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
              Object.values(novoClienteDB)
            );
            clienteId = newClientId;
            console.log('Novo cliente criado no MySQL com ID:', clienteId);
        } else {
            // Se não encontrou e não tem dados suficientes para criar, pode ser um erro ou clienteId opcional
            // Por ora, se clienteId não foi encontrado ou criado, a oportunidade será criada sem ele se o campo for nullable
             if (!clienteId && data.cliente) { // Se apenas o nome do cliente foi passado e não encontrado
                console.warn(`Cliente com nome "${data.cliente}" não encontrado e CNPJ não fornecido. Oportunidade será criada sem cliente associado se o campo cliente_id for opcional, ou falhará se for obrigatório e não nulo.`);
                // Se cliente_id for NOT NULL na tabela oportunidades, esta lógica precisa ser revista
                // ou o frontend precisa garantir que um clienteId válido ou dados para criação sejam enviados.
                // Para este exemplo, vamos permitir que clienteId seja null se não encontrado/criado.
             }
        }
    }


    const newOpportunityId = uuidv4();
    const valorNumerico = parseCurrency(data.valor);
    const prazoSql = parseDateString(data.prazo);
    const dataReuniaoSql = parseDateString(data.dataReuniao);

    const oportunidadeDB = {
      id: newOpportunityId,
      titulo: data.titulo,
      cliente_id: clienteId || null, // Garante null se não encontrado/criado
      valor: valorNumerico,
      responsavel_id: data.responsavelId || null,
      prazo: prazoSql,
      status: data.status || 'novo_lead',
      descricao: data.descricao || null,
      // data_criacao e data_atualizacao são gerenciados pelo MySQL (DEFAULT CURRENT_TIMESTAMP / ON UPDATE)
      // mas created_at e updated_at são padrão do DDL, vamos usar NOW() para eles
      tipo: data.tipo,
      tipo_faturamento: data.tipoFaturamento || null,
      data_reuniao: dataReuniaoSql,
      hora_reuniao: data.horaReuniao || null, // hh:mm:ss
      probabilidade: data.probabilidade || 50,
      posicao_kanban: data.posicaoKanban || 0,
      motivo_perda: data.motivoPerda || null, // Added motivo_perda
      // created_at e updated_at serão definidos como NOW() na query
    };

    console.log('Inserindo oportunidade no MySQL:', oportunidadeDB);
    await connection.execute(
      'INSERT INTO oportunidades (id, titulo, cliente_id, valor, responsavel_id, prazo, status, descricao, tipo, tipo_faturamento, data_reuniao, hora_reuniao, probabilidade, posicao_kanban, motivo_perda, data_criacao, data_atualizacao, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())',
      [
        oportunidadeDB.id, oportunidadeDB.titulo, oportunidadeDB.cliente_id, oportunidadeDB.valor, oportunidadeDB.responsavel_id,
        oportunidadeDB.prazo, oportunidadeDB.status, oportunidadeDB.descricao, oportunidadeDB.tipo, oportunidadeDB.tipo_faturamento,
        oportunidadeDB.data_reuniao, oportunidadeDB.hora_reuniao, oportunidadeDB.probabilidade, oportunidadeDB.posicao_kanban, oportunidadeDB.motivo_perda // Added motivo_perda
      ]
    );

    // Lidar com documentos do repositório (vinculação)
    if (data.documentos_vinculados && Array.isArray(data.documentos_vinculados) && data.documentos_vinculados.length > 0) {
      console.log('Vinculando documentos à oportunidade:', newOpportunityId, 'Documentos:', data.documentos_vinculados);
      
      for (const documentoId of data.documentos_vinculados) {
        try {
          // Verificar se o documento existe antes de tentar vincular
          const [docExists]: any = await connection.execute(
            'SELECT id FROM documentos WHERE id = ?',
            [documentoId]
          );
          
          if (docExists.length === 0) {
            console.warn(`Documento ${documentoId} não encontrado, pulando vinculação`);
            continue;
          }
          
          // Atualizar o documento existente para vincular à oportunidade
          const [updateResult]: any = await connection.execute(
            'UPDATE documentos SET oportunidade_id = ?, data_atualizacao = NOW() WHERE id = ?',
            [newOpportunityId, documentoId]
          );
          
          if (updateResult.affectedRows > 0) {
            console.log('Documento vinculado com sucesso:', documentoId, 'à oportunidade:', newOpportunityId);
          } else {
            console.warn('Nenhuma linha afetada ao vincular documento:', documentoId);
          }
        } catch (docError: any) {
          console.error('Erro ao vincular documento:', documentoId, 'Erro:', docError.message);
          // Continua com os outros documentos mesmo se um falhar
        }
      }
    }

    await connection.commit();
    console.log("Transação MySQL commitada. Oportunidade criada com ID:", newOpportunityId);

    // Buscar a oportunidade recém-criada usando a view para retornar dados formatados
    const [newOppRows]: any = await connection.execute('SELECT * FROM view_oportunidades WHERE id = ?', [newOpportunityId]);
    if (newOppRows.length === 0) {
        console.error("Erro ao buscar oportunidade recém-criada da view.");
        // Retornar os dados brutos inseridos como fallback, mas idealmente a view deveria funcionar
        return NextResponse.json({ id: newOpportunityId, ...data }, { status: 201 });
    }
    
    const [formattedNewOpportunity] = formatarOportunidadesDoMySQL(newOppRows);
    return NextResponse.json(formattedNewOpportunity, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar oportunidade (MySQL):', error);
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transação MySQL revertida devido a erro.");
      } catch (rollbackError: any) {
        console.error("Erro ao tentar reverter transação MySQL:", rollbackError.message);
      }
    }
    return NextResponse.json(
      { error: 'Erro ao criar oportunidade', details: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
