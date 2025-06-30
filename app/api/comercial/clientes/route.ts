import { NextRequest, NextResponse } from 'next/server';
import { Cliente } from '@/types/comercial';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';

// GET - Listar todos os clientes ou filtrar
export async function GET(request: NextRequest) {
  try {
    console.log('Iniciando busca de clientes');
    const { searchParams } = new URL(request.url);

    // Parâmetros de filtro
    const termo = searchParams.get('termo');
    const segmento = searchParams.get('segmento');
    const ativoParam = searchParams.get('ativo');

    console.log('Filtros aplicados:', { termo, segmento, ativo: ativoParam });

    const conn = await getDbConnection();
    let sql = 'SELECT * FROM clientes';
    const params: any[] = [];
    const conditions: string[] = [];

    if (termo) {
      const termoBusca = `%${termo}%`;
      conditions.push('(nome LIKE ? OR cnpj LIKE ? OR contato_nome LIKE ? OR contato_email LIKE ?)');
      params.push(termoBusca, termoBusca, termoBusca, termoBusca);
    }

    if (segmento && segmento !== 'todos') {
      conditions.push('segmento = ?');
      params.push(segmento);
    }

    if (ativoParam !== null && ativoParam !== undefined) {
      const ativoBoolean = ativoParam === 'true';
      conditions.push('ativo = ?');
      params.push(ativoBoolean ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY nome';

    console.log('Executando consulta no MySQL:', sql, params);
    const [rows] = await conn.execute(sql, params);
    const data = rows as any[];

    console.log('Resultado da consulta:', { encontrados: data?.length || 0 });

    if (!data || data.length === 0) {
      console.log('Nenhum cliente encontrado');
      return NextResponse.json([]);
    }

    // Transformar para o formato esperado pelo frontend
    const clientesFormatados: Cliente[] = data.map((cliente: any) => ({
      id: cliente.id,
      nome: cliente.nome,
      cnpj: cliente.cnpj,
      contatoNome: cliente.contato_nome,
      contatoTelefone: cliente.contato_telefone,
      contatoEmail: cliente.contato_email,
      endereco: cliente.endereco,
      segmento: cliente.segmento,
      dataCadastro: cliente.data_cadastro, // Certifique-se que o formato é compatível
      ativo: cliente.ativo === 1, // Converter 1/0 para true/false
      cidade: cliente.cidade,
      estado: cliente.estado,
      descricao: cliente.descricao,
      observacoes: cliente.observacoes,
      faturamento: cliente.faturamento,
      dataAtualizacao: cliente.data_atualizacao,
      responsavelInterno: cliente.responsavel_interno,
    }));

    console.log(`Retornando ${clientesFormatados.length} clientes formatados`);
    return NextResponse.json(clientesFormatados);
  } catch (error: any) {
    console.error('Erro ao processar requisição de clientes:', error);
    return NextResponse.json(
      { error: `Erro interno ao processar requisição de clientes: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST - Criar novo cliente
export async function POST(request: NextRequest) {
  try {
    const data: Partial<Cliente> = await request.json();
    console.log('Recebidos dados para novo cliente:', data);

    // Validação básica
    if (!data.nome || !data.cnpj || !data.contatoNome || !data.contatoEmail) {
      return NextResponse.json(
        { error: 'Nome, CNPJ, nome de contato e email de contato são obrigatórios' },
        { status: 400 }
      );
    }

    const conn = await getDbConnection();
    const newId = uuidv4();

    // Converter para o formato do banco de dados (snake_case)
    const clienteDB = {
      id: newId,
      nome: data.nome,
      cnpj: data.cnpj,
      contato_nome: data.contatoNome,
      contato_telefone: data.contatoTelefone || null,
      contato_email: data.contatoEmail,
      endereco: data.endereco || null,
      segmento: data.segmento || 'Outros',
      cidade: data.cidade || null,
      estado: data.estado || null,
      // data_cadastro é DEFAULT CURRENT_TIMESTAMP no MySQL
      ativo: data.ativo !== undefined ? (data.ativo ? 1 : 0) : 1, // Default to true if not provided
      descricao: data.descricao || null,
      observacoes: data.observacoes || null,
      faturamento: data.faturamento || null,
      responsavel_interno: data.responsavelInterno || null,
      // data_atualizacao é ON UPDATE CURRENT_TIMESTAMP
    };

    const sql = 'INSERT INTO clientes SET ?';
    console.log('Executando INSERT no MySQL:', sql, clienteDB);
    await conn.query(sql, clienteDB);

    // Buscar o cliente recém-criado para retornar na resposta
    const [rows] = await conn.execute('SELECT * FROM clientes WHERE id = ?', [newId]);
    const novoClienteArray = rows as any[];

    if (novoClienteArray.length === 0) {
      console.error('Erro ao buscar cliente recém-criado');
      return NextResponse.json(
        { error: 'Cliente criado, mas houve um erro ao recuperá-lo.' },
        { status: 500 }
      );
    }
    const novoCliente = novoClienteArray[0];
    
    // Transformar para o formato esperado pelo frontend (camelCase)
    const clienteFormatado: Cliente = {
      id: novoCliente.id,
      nome: novoCliente.nome,
      cnpj: novoCliente.cnpj,
      contatoNome: novoCliente.contato_nome,
      contatoTelefone: novoCliente.contato_telefone,
      contatoEmail: novoCliente.contato_email,
      endereco: novoCliente.endereco,
      segmento: novoCliente.segmento,
      dataCadastro: novoCliente.data_cadastro,
      ativo: novoCliente.ativo === 1,
      cidade: novoCliente.cidade,
      estado: novoCliente.estado,
      descricao: novoCliente.descricao,
      observacoes: novoCliente.observacoes,
      faturamento: novoCliente.faturamento,
      dataAtualizacao: novoCliente.data_atualizacao,
      responsavelInterno: novoCliente.responsavel_interno,
    };
    
    console.log('Cliente criado com sucesso:', clienteFormatado);
    return NextResponse.json(clienteFormatado, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao processar criação de cliente:', error);
    return NextResponse.json(
      { error: `Erro interno ao processar criação de cliente: ${error.message}` },
      { status: 500 }
    );
  }
}
