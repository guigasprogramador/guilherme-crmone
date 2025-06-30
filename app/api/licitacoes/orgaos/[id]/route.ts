// app/api/licitacoes/orgaos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

// Inferred types based on prompt and existing route.ts
// Ideally, these would be imported directly from '@/types/licitacoes'
interface OrgaoContatoType {
  id: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  orgao_id?: string;
  data_criacao?: string;
  data_atualizacao?: string;
}

interface OrgaoType {
  id: string;
  nome: string;
  tipo?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  segmento?: string | null;
  origemLead?: string | null;
  responsavelInterno?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  faturamento?: string | null;
  contatos?: OrgaoContatoType[];
  dataCriacao?: string;
  dataAtualizacao?: string;
  ativo?: boolean;
}

// Formatting function (remains the same)
function formatarOrgaoComContatos(orgaoRow: any, contatosRows: any[] = []): OrgaoType {
  return {
    id: orgaoRow.id,
    nome: orgaoRow.nome,
    tipo: orgaoRow.tipo,
    cnpj: orgaoRow.cnpj,
    endereco: orgaoRow.endereco,
    cidade: orgaoRow.cidade,
    estado: orgaoRow.estado,
    segmento: orgaoRow.segmento,
    origemLead: orgaoRow.origem_lead,
    responsavelInterno: orgaoRow.responsavel_interno,
    descricao: orgaoRow.descricao,
    observacoes: orgaoRow.observacoes,
    faturamento: orgaoRow.faturamento,
    contatos: contatosRows.map((contato: any): OrgaoContatoType => ({
      id: contato.id,
      nome: contato.nome,
      cargo: contato.cargo,
      email: contato.email,
      telefone: contato.telefone,
      orgao_id: contato.orgao_id,
      data_criacao: contato.data_criacao,
      data_atualizacao: contato.data_atualizacao,
    })),
    dataCriacao: orgaoRow.data_criacao,
    dataAtualizacao: orgaoRow.data_atualizacao,
    ativo: Boolean(orgaoRow.ativo)
  };
}

// GET handler (remains the same)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID do órgão é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [orgaoRows]: any[] = await connection.execute('SELECT * FROM orgaos WHERE id = ?', [id]);

    if (orgaoRows.length === 0) {
      return NextResponse.json({ error: 'Órgão não encontrado' }, { status: 404 });
    }
    const orgaoData = orgaoRows[0];

    const [contatosRows]: any[] = await connection.execute(
      'SELECT * FROM orgao_contatos WHERE orgao_id = ? ORDER BY nome ASC',
      [id]
    );

    const orgaoFormatado = formatarOrgaoComContatos(orgaoData, contatosRows);
    return NextResponse.json(orgaoFormatado);

  } catch (error: any) {
    console.error(`Erro ao buscar órgão ID ${id} (MySQL):`, error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar órgão', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

const fieldToColumnMap: { [key: string]: string } = {
  nome: 'nome',
  tipo: 'tipo',
  cnpj: 'cnpj',
  endereco: 'endereco',
  cidade: 'cidade',
  estado: 'estado',
  segmento: 'segmento',
  origemLead: 'origem_lead',
  responsavelInterno: 'responsavel_interno',
  descricao: 'descricao',
  observacoes: 'observacoes',
  faturamento: 'faturamento',
  ativo: 'ativo',
  // Add other updatable fields from OrgaoType if necessary
};

// PUT handler - Update an existing organ
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID do órgão é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    const body = await request.json();
    connection = await getDbConnection();

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const key in body) {
      if (body.hasOwnProperty(key) && fieldToColumnMap[key]) {
        updateFields.push(`${fieldToColumnMap[key]} = ?`);
        // Handle boolean 'ativo' specifically if it comes as true/false
        if (key === 'ativo') {
          updateValues.push(Boolean(body[key]) ? 1 : 0);
        } else {
          updateValues.push(body[key]);
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualização fornecido' }, { status: 400 });
    }

    // Ensure data_atualizacao is always updated
    updateFields.push('data_atualizacao = NOW()');
    updateValues.push(id); // For the WHERE id = ?

    const sqlUpdate = `UPDATE orgaos SET ${updateFields.join(', ')} WHERE id = ?`;

    console.log(`Executando SQL UPDATE: ${sqlUpdate} com valores:`, updateValues);
    const [result]: any = await connection.execute(sqlUpdate, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Órgão não encontrado ou nenhum dado alterado' }, { status: 404 });
    }

    // Fetch the updated organ data to return
    const [orgaoRows]: any[] = await connection.execute('SELECT * FROM orgaos WHERE id = ?', [id]);
    const orgaoData = orgaoRows[0];
    const [contatosRows]: any[] = await connection.execute(
      'SELECT * FROM orgao_contatos WHERE orgao_id = ? ORDER BY nome ASC',
      [id]
    );
    const orgaoFormatado = formatarOrgaoComContatos(orgaoData, contatosRows);

    return NextResponse.json(orgaoFormatado);

  } catch (error: any) {
    console.error(`Erro ao atualizar órgão ID ${id} (MySQL):`, error);
    // Check for duplicate CNPJ error if your DB has such constraint
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('cnpj')) {
        return NextResponse.json(
            { error: 'Erro ao atualizar órgão: CNPJ já cadastrado.', details: error.message },
            { status: 409 } // 409 Conflict
        );
    }
    return NextResponse.json(
      { error: 'Erro interno ao atualizar órgão', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE handler - Delete an organ
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID do órgão é obrigatório' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Delete associated contacts
    const [deleteContatosResult]: any = await connection.execute('DELETE FROM orgao_contatos WHERE orgao_id = ?', [id]);
    console.log(`Contatos excluídos para o órgão ID ${id}: ${deleteContatosResult.affectedRows} linhas afetadas.`);

    // 2. Delete the organ
    const [deleteOrgaoResult]: any = await connection.execute('DELETE FROM orgaos WHERE id = ?', [id]);

    if (deleteOrgaoResult.affectedRows === 0) {
      await connection.rollback(); // Rollback if organ was not found
      return NextResponse.json({ error: 'Órgão não encontrado' }, { status: 404 });
    }

    await connection.commit();
    console.log(`Órgão ID ${id} e seus contatos associados foram excluídos com sucesso.`);
    // Return 204 No Content for successful deletion without a body
    // return new NextResponse(null, { status: 204 });
    // Or return 200 with a success message
    return NextResponse.json({ message: 'Órgão e contatos associados excluídos com sucesso' });


  } catch (error: any) {
    console.error(`Erro ao excluir órgão ID ${id} (MySQL):`, error);
    if (connection) await connection.rollback().catch(rbError => console.error('Erro ao reverter transação:', rbError));
    return NextResponse.json(
      { error: 'Erro interno ao excluir órgão', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}
