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

// Helper para converter valor monetário "R$ X.XXX,XX" para DECIMAL
function parseCurrency(currencyString: string | undefined | null): number | null {
  if (!currencyString || currencyString === 'A definir') return null;
  const cleaned = currencyString.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
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

    if (!data.titulo || !data.clienteId) { // Validar clienteId em vez de cliente (nome)
      return NextResponse.json({ error: 'Título e ID do cliente são obrigatórios' }, { status: 400 });
    }
     if (!data.tipo) {
      return NextResponse.json({ error: 'O tipo da oportunidade (produto/serviço) é obrigatório' }, { status: 400 });
    }
    if (data.tipo === 'produto' && !data.tipoFaturamento) {
      return NextResponse.json({ error: 'Para produtos, o tipo de faturamento é obrigatório' }, { status: 400 });
    }

    connection = await getDbConnection();

    const valorNumerico = parseCurrency(data.valor);
    const prazoSql = parseDateString(data.prazo);
    const dataReuniaoSql = parseDateString(data.dataReuniao);

    const fieldsToUpdate: any = {
      titulo: data.titulo,
      cliente_id: data.clienteId, // Deve ser o ID do cliente
      valor: valorNumerico,
      responsavel_id: data.responsavelId || null,
      prazo: prazoSql,
      status: data.status || 'novo_lead',
      descricao: data.descricao || null,
      tipo: data.tipo,
      tipo_faturamento: data.tipoFaturamento || null,
      data_reuniao: dataReuniaoSql,
      hora_reuniao: data.horaReuniao || null,
      probabilidade: data.probabilidade === undefined ? null : Number(data.probabilidade),
      posicao_kanban: data.posicaoKanban === undefined ? null : Number(data.posicaoKanban),
      motivo_perda: data.motivoPerda || null,
      // data_atualizacao é atualizado automaticamente pelo MySQL (ON UPDATE CURRENT_TIMESTAMP)
      // ou updated_at se for o nome da coluna no DDL
    };
    
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
