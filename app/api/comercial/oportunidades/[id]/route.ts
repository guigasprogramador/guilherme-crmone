import { NextRequest, NextResponse } from 'next/server';
import { Oportunidade } from '@/types/comercial';
import { getDbConnection } from '@/lib/mysql/client';

// Helper para formatar uma única oportunidade do MySQL para o formato da aplicação
// (Similar à função em ./route.ts, mas para um único objeto)
function formatarOportunidadeDoMySQL(opp: any): Oportunidade | null {
  if (!opp) return null;

  let prazoFormatted = 'Não definido';
  if (opp.prazo) {
    const dataPrazo = new Date(opp.prazo);
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
    cliente: opp.cliente_nome || 'Cliente não especificado',
    clienteId: opp.cliente_id,
    valor: opp.valor ? `R$ ${Number(opp.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'A definir',
    responsavel: opp.responsavel_nome || 'Não atribuído',
    responsavelId: opp.responsavel_id,
    prazo: prazoFormatted,
    status: opp.status,
    descricao: opp.oportunidade_descricao, // da view_oportunidades
    dataCriacao: opp.data_criacao,
    dataAtualizacao: opp.data_atualizacao,
    tipo: opp.tipo,
    tipoFaturamento: opp.tipo_faturamento,
    dataReuniao: dataReuniaoFormatted,
    horaReuniao: opp.hora_reuniao,
    probabilidade: opp.probabilidade,
    cnpj: opp.cliente_cnpj,
    contatoNome: opp.contato_nome,
    contatoTelefone: opp.contato_telefone,
    contatoEmail: opp.contato_email,
    segmento: opp.cliente_segmento,
  };
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
function parseCurrency(currencyString: string | undefined | null): number | null {
  if (!currencyString || currencyString === 'A definir') return null;
  const value = parseValorMonetario(currencyString);
  return value;
}

// GET - Obter uma oportunidade específica
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await context.params;
    console.log(`GET /api/comercial/oportunidades/${id} - Buscando oportunidade com MySQL`);
    
    connection = await getDbConnection();
    const [rows]: any = await connection.execute('SELECT * FROM view_oportunidades WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      console.log(`Oportunidade com ID ${id} não encontrada no MySQL`);
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }
    
    const oportunidadeFormatada = formatarOportunidadeDoMySQL(rows[0]);
    console.log(`Oportunidade encontrada no MySQL: ${JSON.stringify(oportunidadeFormatada)}`);
    return NextResponse.json(oportunidadeFormatada);

  } catch (error: any) {
    console.error('Erro ao buscar oportunidade (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar oportunidade', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET por ID).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET por ID):", releaseError.message);
      }
    }
  }
}

// PUT - Atualizar uma oportunidade
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    const data = await request.json();
    console.log(`PUT /api/comercial/oportunidades/${id} - Atualizando oportunidade com MySQL:`, data);

    // Validação mais flexível para permitir atualizações parciais
    if (data.titulo !== undefined && !data.titulo) {
      return NextResponse.json({ error: 'Título não pode ser vazio' }, { status: 400 });
    }
    if (data.tipo && data.tipo === 'produto' && data.tipoFaturamento !== undefined && !data.tipoFaturamento) {
      return NextResponse.json({ error: 'Para produtos, o tipo de faturamento é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();

    const valorNumerico = parseCurrency(data.valor);
    const prazoSql = parseDateString(data.prazo);
    const dataReuniaoSql = parseDateString(data.dataReuniao);

    const fieldsToUpdate: any = {};
    
    // Apenas adiciona campos que foram enviados
    if (data.titulo !== undefined) fieldsToUpdate.titulo = data.titulo;
    if (data.clienteId !== undefined) fieldsToUpdate.cliente_id = data.clienteId;
    if (data.valor !== undefined) fieldsToUpdate.valor = valorNumerico;
    if (data.responsavelId !== undefined) fieldsToUpdate.responsavel_id = data.responsavelId;
    if (data.responsavel !== undefined) {
      // Se foi enviado o nome do responsável, buscar o ID
      // Por enquanto, vamos manter o nome (assumindo que a tabela aceita nome)
      // TODO: Implementar busca do ID do responsável pelo nome
      fieldsToUpdate.responsavel_id = data.responsavelId || null;
    }
    if (data.prazo !== undefined) fieldsToUpdate.prazo = prazoSql;
    if (data.status !== undefined) fieldsToUpdate.status = data.status;
    if (data.descricao !== undefined) fieldsToUpdate.descricao = data.descricao;
    if (data.tipo !== undefined) fieldsToUpdate.tipo = data.tipo;
    if (data.tipoFaturamento !== undefined) fieldsToUpdate.tipo_faturamento = data.tipoFaturamento;
    if (data.dataReuniao !== undefined) fieldsToUpdate.data_reuniao = dataReuniaoSql;
    if (data.horaReuniao !== undefined) fieldsToUpdate.hora_reuniao = data.horaReuniao;
    if (data.probabilidade !== undefined) fieldsToUpdate.probabilidade = data.probabilidade === null ? null : Number(data.probabilidade);
    if (data.posicaoKanban !== undefined) fieldsToUpdate.posicao_kanban = data.posicaoKanban === null ? null : Number(data.posicaoKanban);
    if (data.motivoPerda !== undefined) fieldsToUpdate.motivo_perda = data.motivoPerda;
    
    const fieldNames = Object.keys(fieldsToUpdate).filter(key => fieldsToUpdate[key] !== undefined);
    const fieldPlaceholders = fieldNames.map(key => `${key} = ?`).join(', ');
    const values = fieldNames.map(key => fieldsToUpdate[key]);

    if (fieldNames.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar fornecido." }, { status: 400 });
    }
    
    // Adicionar data_atualizacao manualmente se não for ON UPDATE
    // Assumindo que a tabela oportunidades tem `updated_at` e `data_atualizacao` com ON UPDATE CURRENT_TIMESTAMP ou DEFAULT CURRENT_TIMESTAMP
    // Se não, precisaria adicionar `updated_at = NOW()` ou `data_atualizacao = NOW()` explicitamente.
    // O DDL gerado para oportunidades tem `data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    // e também `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.
    // Sendo assim, não é necessário setá-los manualmente no UPDATE.
    
    const sql = `UPDATE oportunidades SET ${fieldPlaceholders} WHERE id = ?`;
    values.push(id);
    
    console.log("Executando SQL Update:", sql, values);
    const [result]: any = await connection.execute(sql, values);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Oportunidade não encontrada ou nenhum dado alterado' }, { status: 404 });
    }

    // Buscar e retornar a oportunidade atualizada da view
    const [updatedOppRows]: any = await connection.execute('SELECT * FROM view_oportunidades WHERE id = ?', [id]);
    if (updatedOppRows.length === 0) {
        console.error("Erro ao buscar oportunidade atualizada da view.");
        return NextResponse.json({ error: "Oportunidade atualizada, mas erro ao re-buscar." }, { status: 500 });
    }
    const oportunidadeFormatada = formatarOportunidadeDoMySQL(updatedOppRows[0]);
    return NextResponse.json(oportunidadeFormatada);

  } catch (error: any) {
    console.error('Erro ao atualizar oportunidade (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar oportunidade' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (PUT Oportunidade).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (PUT Oportunidade):", releaseError.message);
      }
    }
  }
}

// PATCH - Atualizar status de uma oportunidade
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    const { status } = await request.json();
    
    if (!status) {
        return NextResponse.json({ error: 'Status é obrigatório' }, { status: 400 });
    }
    console.log(`PATCH /api/comercial/oportunidades/${id} - Atualizando status para ${status} com MySQL`);
    
    connection = await getDbConnection();
    // Assumindo que a tabela oportunidades tem `data_atualizacao` e `updated_at` com ON UPDATE CURRENT_TIMESTAMP
    const sql = 'UPDATE oportunidades SET status = ? WHERE id = ?';
    const [result]: any = await connection.execute(sql, [status, id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Oportunidade não encontrada ou status não alterado' }, { status: 404 });
    }

    // Buscar e retornar a oportunidade atualizada da view para consistência de dados
    const [updatedOppRows]: any = await connection.execute('SELECT * FROM view_oportunidades WHERE id = ?', [id]);
     if (updatedOppRows.length === 0) { // Should not happen if affectedRows > 0
        return NextResponse.json({ message: "Status atualizado, mas erro ao re-buscar oportunidade." }, { status: 200 });
    }
    const oportunidadeFormatada = formatarOportunidadeDoMySQL(updatedOppRows[0]);
    return NextResponse.json(oportunidadeFormatada);

  } catch (error: any) {
    console.error('Erro ao atualizar status da oportunidade (MySQL):', error);
    return NextResponse.json(
      { error: `Erro na atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (PATCH Oportunidade).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (PATCH Oportunidade):", releaseError.message);
      }
    }
  }
}

// DELETE - Excluir uma oportunidade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
    console.log(`DELETE /api/comercial/oportunidades/${id} - Excluindo oportunidade com MySQL`);

    connection = await getDbConnection();
    const sql = 'DELETE FROM oportunidades WHERE id = ?';
    const [result]: any = await connection.execute(sql, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Oportunidade não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Oportunidade excluída com sucesso' }); // 200 OK ou 204 No Content

  } catch (error: any) {
    console.error('Erro ao excluir oportunidade (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao excluir oportunidade' },
      { status: 500 }
    );
  }
}
