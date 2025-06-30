import { NextRequest, NextResponse } from 'next/server';
import { Oportunidade } from '@/types/comercial'; // Assuming this type is compatible or will be adapted
import { getDbConnection } from '@/lib/mysql/client';

// GET - Obter estatísticas das oportunidades
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/comercial/estatisticas - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'mes'; // 'semana', 'mes', 'trimestre', 'ano'
    
    const hoje = new Date();
    let dataInicio = new Date();
    
    switch (periodo) {
      case 'semana':
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        dataInicio.setMonth(hoje.getMonth() - 1);
        break;
      case 'trimestre':
        dataInicio.setMonth(hoje.getMonth() - 3);
        break;
      case 'ano':
        dataInicio.setFullYear(hoje.getFullYear() - 1);
        break;
      default:
        dataInicio.setMonth(hoje.getMonth() - 1);
    }
    const dataInicioSql = dataInicio.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    console.log(`Buscando dados de oportunidades no MySQL a partir de: ${dataInicioSql}`);
    connection = await getDbConnection();
    
    // Usar a view_oportunidades que já tem os nomes de cliente e responsável
    const sql = `
      SELECT
        id, titulo, cliente_id, cliente_nome, valor, responsavel_id, responsavel_nome,
        prazo, status, oportunidade_descricao AS descricao, data_criacao, data_atualizacao,
        tipo, tipo_faturamento, data_reuniao, hora_reuniao, probabilidade
      FROM view_oportunidades
      WHERE data_criacao >= ?
    `;
    // data_criacao na view_oportunidades refere-se a o.data_criacao (oportunidades.data_criacao)

    const [rows] = await connection.execute(sql, [dataInicioSql]);
    const oportunidadesData = rows as any[];

    console.log(`Encontradas ${oportunidadesData?.length || 0} oportunidades no MySQL para o período.`);

    // Adaptar a estrutura para o tipo Oportunidade esperado pelo restante da lógica
    // A view_oportunidades já deve fornecer a maioria dos campos necessários.
    // O campo 'valor' da view_oportunidades já é DECIMAL, então é um número.
    const oportunidades: Oportunidade[] = oportunidadesData.map((row: any): Oportunidade => ({
      id: row.id,
      titulo: row.titulo,
      cliente: row.cliente_nome || 'Cliente não especificado', // da view
      clienteId: row.cliente_id,
      // O valor da view_oportunidades já é numérico (DECIMAL). A formatação para "R$ X.XXX,XX" deve ser feita no frontend ou ao final.
      // Para cálculo, usamos o valor numérico diretamente.
      valor: row.valor !== null ? String(row.valor) : "0", // Corrigido para string
      responsavel: row.responsavel_nome || 'Não atribuído', // da view
      responsavelId: row.responsavel_id,
      prazo: row.prazo ? new Date(row.prazo).toISOString() : '', // Manter como ISO string ou Date object para consistência
      status: row.status as any || 'novo_lead',
      descricao: row.descricao, // da view (oportunidade_descricao)
      dataCriacao: row.data_criacao ? new Date(row.data_criacao).toISOString() : new Date().toISOString(),
      dataAtualizacao: row.data_atualizacao ? new Date(row.data_atualizacao).toISOString() : new Date().toISOString(),
      tipo: row.tipo,
      tipoFaturamento: row.tipo_faturamento,
      dataReuniao: row.data_reuniao ? new Date(row.data_reuniao).toISOString() : '',
      horaReuniao: row.hora_reuniao,
      probabilidade: row.probabilidade || 0
    }));
    
    // O restante da lógica de cálculo de estatísticas permanece o mesmo,
    // pois opera sobre o array `oportunidades` já formatado/mapeado.

    const estatisticasPorStatus: Record<string, number> = {
      novo_lead: 0, agendamento_reuniao: 0, levantamento_oportunidades: 0,
      proposta_enviada: 0, negociacao: 0, fechado_ganho: 0, fechado_perdido: 0,
    };

    oportunidades.forEach((opp) => {
      if (estatisticasPorStatus.hasOwnProperty(opp.status)) {
        estatisticasPorStatus[opp.status as keyof typeof estatisticasPorStatus]++;
      } else {
        console.warn(`Status não reconhecido encontrado: ${opp.status}`);
      }
    });

    const leadsEmAberto = oportunidades.filter(
      (opp) => opp.status !== 'fechado_ganho' && opp.status !== 'fechado_perdido'
    ).length;

    const valorTotalGanhas = oportunidades
      .filter((opp) => opp.status === 'fechado_ganho')
      .reduce((total, opp) => total + (Number(opp.valor) || 0), 0); // opp.valor já é número
      
    const valorTotalNegociacao = oportunidades
      .filter((opp) => opp.status === 'negociacao')
      .reduce((total, opp) => total + (Number(opp.valor) || 0), 0); // opp.valor já é número

    const oportunidadesPorResponsavel: Record<string, number> = {};
    oportunidades.forEach((opp) => {
      const respKey = opp.responsavel || 'Não atribuído';
      oportunidadesPorResponsavel[respKey] = (oportunidadesPorResponsavel[respKey] || 0) + 1;
    });

    const oportunidadesPorCliente: Record<string, number> = {};
    oportunidades.forEach((opp) => {
      const clienteKey = opp.cliente || 'Cliente não especificado';
      oportunidadesPorCliente[clienteKey] = (oportunidadesPorCliente[clienteKey] || 0) + 1;
    });

    const oportunidadesFechadas = estatisticasPorStatus.fechado_ganho + estatisticasPorStatus.fechado_perdido;
    const taxaConversao = oportunidadesFechadas > 0
      ? (estatisticasPorStatus.fechado_ganho / oportunidadesFechadas) * 100
      : 0;

    const resposta = {
      periodo,
      totalOportunidades: oportunidades.length,
      estatisticasPorStatus,
      leadsEmAberto,
      valorTotalGanhas,
      valorTotalNegociacao,
      oportunidadesPorResponsavel,
      oportunidadesPorCliente,
      taxaConversao: taxaConversao.toFixed(2),
    };
    
    console.log("Estatísticas calculadas com sucesso usando dados do MySQL.");
    return NextResponse.json(resposta);

  } catch (error: any) {
    console.error('Erro ao obter estatísticas (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de estatísticas', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (Estatísticas).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (Estatísticas):", releaseError.message);
      }
    }
  }
}
