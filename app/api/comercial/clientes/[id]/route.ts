import { NextRequest, NextResponse } from 'next/server';
import { Cliente } from '@/types/comercial';
import { getDbConnection } from '@/lib/mysql/client';

// Função auxiliar para mapear DB para Cliente (camelCase)
function mapDbToCliente(dbRow: any): Cliente {
  return {
    id: dbRow.id,
    nome: dbRow.nome,
    cnpj: dbRow.cnpj,
    contatoNome: dbRow.contato_nome,
    contatoTelefone: dbRow.contato_telefone,
    contatoEmail: dbRow.contato_email,
    endereco: dbRow.endereco,
    segmento: dbRow.segmento,
    dataCadastro: dbRow.data_cadastro,
    ativo: dbRow.ativo === 1, // MySQL boolean is 1 or 0
    cidade: dbRow.cidade,
    estado: dbRow.estado,
    descricao: dbRow.descricao,
    observacoes: dbRow.observacoes,
    faturamento: dbRow.faturamento,
    dataAtualizacao: dbRow.data_atualizacao,
    responsavelInterno: dbRow.responsavel_interno,
  };
}

// GET - Obter um cliente específico
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id: idOrNameParam } = await context.params;
    const idOuNome = decodeURIComponent(idOrNameParam);
    let clienteRow: any = null;

    console.log('Buscando cliente com parâmetro:', idOuNome);
    const conn = await getDbConnection();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(idOuNome);

    if (isUuid) {
      console.log('Buscando cliente por ID:', idOuNome);
      const [rows] = await conn.execute('SELECT * FROM clientes WHERE id = ?', [idOuNome]);
      if (Array.isArray(rows) && rows.length > 0) {
        clienteRow = rows[0];
        console.log('Cliente encontrado por ID:', (clienteRow as any).nome);
      } else {
        console.log('Nenhum cliente encontrado com o ID:', idOuNome);
      }
    } else {
      console.log('Buscando cliente por nome:', idOuNome);
      // Tenta busca exata por nome
      let [rows] = await conn.execute('SELECT * FROM clientes WHERE nome = ?', [idOuNome]);
      if (Array.isArray(rows) && rows.length > 0) {
        clienteRow = rows[0];
        console.log('Cliente encontrado por nome (exato):', (clienteRow as any).nome);
      } else {
        // Tenta busca parcial (LIKE) por nome
        console.log('Nenhum cliente encontrado por nome (exato), tentando busca parcial...');
        const [likeRows] = await conn.execute('SELECT * FROM clientes WHERE nome LIKE ? LIMIT 1', [`%${idOuNome}%`]);
        if (Array.isArray(likeRows) && likeRows.length > 0) {
          clienteRow = likeRows[0];
          console.log('Cliente encontrado por nome (parcial):', (clienteRow as any).nome);
        } else {
          console.log('Nenhum cliente encontrado com o nome (parcial):', idOuNome);
        }
      }
    }

    if (!clienteRow) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const clienteFormatado = mapDbToCliente(clienteRow);
    return NextResponse.json(clienteFormatado);

  } catch (error: any) {
    console.error('Erro ao processar requisição de cliente:', error);
    return NextResponse.json(
      { error: `Erro interno ao processar requisição de cliente: ${error.message}` },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um cliente
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const data: Partial<Cliente> = await request.json();
    console.log(`Iniciando atualização para cliente ID: ${id}`, data);

    const conn = await getDbConnection();

    // Verificar se o cliente existe
    const [rows] = await conn.execute('SELECT id FROM clientes WHERE id = ?', [id]);
    const clienteExistenteArray = rows as any[];
    if (clienteExistenteArray.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado para atualização' }, { status: 404 });
    }

    // Converter para o formato do banco de dados (snake_case)
    // e construir a query de atualização dinamicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (data.nome !== undefined) { updates.push('nome = ?'); params.push(data.nome); }
    if (data.cnpj !== undefined) { updates.push('cnpj = ?'); params.push(data.cnpj); }
    if (data.contatoNome !== undefined) { updates.push('contato_nome = ?'); params.push(data.contatoNome); }
    if (data.contatoTelefone !== undefined) { updates.push('contato_telefone = ?'); params.push(data.contatoTelefone); }
    if (data.contatoEmail !== undefined) { updates.push('contato_email = ?'); params.push(data.contatoEmail); }
    if (data.endereco !== undefined) { updates.push('endereco = ?'); params.push(data.endereco); }
    if (data.segmento !== undefined) { updates.push('segmento = ?'); params.push(data.segmento); }
    if (data.cidade !== undefined) { updates.push('cidade = ?'); params.push(data.cidade); }
    if (data.estado !== undefined) { updates.push('estado = ?'); params.push(data.estado); }
    if (data.ativo !== undefined) { updates.push('ativo = ?'); params.push(data.ativo ? 1 : 0); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); params.push(data.descricao); }
    if (data.observacoes !== undefined) { updates.push('observacoes = ?'); params.push(data.observacoes); }
    if (data.faturamento !== undefined) { updates.push('faturamento = ?'); params.push(data.faturamento); }
    if (data.responsavelInterno !== undefined) { updates.push('responsavel_interno = ?'); params.push(data.responsavelInterno); }
    // data_atualizacao é ON UPDATE CURRENT_TIMESTAMP no MySQL e será atualizado automaticamente

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    const sql = `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    console.log('Executando UPDATE no MySQL:', sql, params);
    const [result] = await conn.execute(sql, params);
    const updateResult = result as any;


    if (updateResult.affectedRows === 0) {
       // Isso pode acontecer se o ID for válido mas, por alguma razão, o update não afetar linhas.
       // Ou se os dados enviados forem idênticos aos existentes, alguns drivers MySQL podem reportar 0 affectedRows.
       console.warn('Nenhuma linha foi atualizada. O cliente pode não existir ou os dados são os mesmos.');
       // Re-fetch para garantir que o cliente existe e retornar o estado atual.
    }

    // Buscar o cliente atualizado para retornar na resposta
    const [updatedRows] = await conn.execute('SELECT * FROM clientes WHERE id = ?', [id]);
    const clienteAtualizadoArray = updatedRows as any[];

    if (clienteAtualizadoArray.length === 0) {
      console.error('Erro ao buscar cliente após atualização, ID:', id);
      return NextResponse.json({ error: 'Cliente não encontrado após tentativa de atualização' }, { status: 404 });
    }

    const clienteFormatado = mapDbToCliente(clienteAtualizadoArray[0]);
    console.log('Cliente atualizado com sucesso:', clienteFormatado);
    return NextResponse.json(clienteFormatado);

  } catch (error: any) {
    console.error('Erro ao processar atualização de cliente:', error);
    return NextResponse.json(
      { error: `Erro interno ao processar atualização de cliente: ${error.message}` },
      { status: 500 }
    );
  }
}

// DELETE - Desativar um cliente (soft delete)
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    console.log(`Iniciando desativação (soft delete) para cliente ID: ${id}`);

    const conn = await getDbConnection();

    // Verificar se o cliente existe
    const [rows] = await conn.execute('SELECT id, ativo FROM clientes WHERE id = ?', [id]);
    const clienteExistenteArray = rows as any[];

    if (clienteExistenteArray.length === 0) {
      return NextResponse.json({ error: 'Cliente não encontrado para desativação' }, { status: 404 });
    }
    
    const clienteAtual = clienteExistenteArray[0] as any;
    if (clienteAtual.ativo === 0) {
      console.log(`Cliente ID: ${id} já está inativo.`);
      // Retornar sucesso mesmo se já inativo, pois o estado desejado é alcançado.
      return NextResponse.json({ message: 'Cliente já estava inativo.' });
    }

    // Desativar cliente (SET ativo = 0). data_atualizacao é ON UPDATE CURRENT_TIMESTAMP
    const sql = 'UPDATE clientes SET ativo = 0 WHERE id = ?';
    console.log('Executando UPDATE (soft delete) no MySQL:', sql, [id]);
    const [result] = await conn.execute(sql, [id]);
    const deleteResult = result as any;

    if (deleteResult.affectedRows === 0) {
      // Deveria ter sido encontrado pelo select anterior
      console.warn(`Nenhuma linha afetada ao tentar desativar cliente ID: ${id}. Isso é inesperado.`);
      return NextResponse.json({ error: 'Falha ao desativar cliente, o cliente pode não ter sido encontrado.' }, { status: 404 });
    }

    console.log(`Cliente ID: ${id} desativado com sucesso.`);
    return NextResponse.json({ message: 'Cliente desativado com sucesso' });

  } catch (error: any) {
    console.error('Erro ao processar desativação de cliente:', error);
    return NextResponse.json(
      { error: `Erro interno ao processar desativação de cliente: ${error.message}` },
      { status: 500 }
    );
  }
}
