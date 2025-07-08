import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, Connection } from '@/lib/mysql/client';

// Tipos (simplificados)
interface ProjetoUpdatePayload {
  nome_projeto?: string;
  descricao?: string;
  status_projeto?: string;
  data_inicio_prevista?: string | null;
  data_fim_prevista?: string | null;
  data_inicio_real?: string | null;
  data_fim_real?: string | null;
  orcamento_horas?: number | null;
  orcamento_custo?: number | null;
  cliente_id?: string | null;
  orgao_id?: string | null;
  oportunidade_id?: string | null;
  proposta_id?: string | null;
  licitacao_id?: string | null;
  gerente_projeto_id?: string;
  percentual_concluido?: number;
}

// Função para buscar projeto completo (reutilizável)
async function fetchProjetoCompleto(projetoId: string, connection: Connection) {
  const [projetoRows]: any = await connection.execute(
    `SELECT p.*,
            c.nome as cliente_nome,
            org.nome as orgao_nome,
            u.name as gerente_projeto_nome,
            op.titulo as oportunidade_titulo,
            prop.numero_proposta as proposta_numero,
            l.titulo as licitacao_titulo
     FROM projetos p
     LEFT JOIN clientes c ON p.cliente_id = c.id
     LEFT JOIN orgaos org ON p.orgao_id = org.id
     LEFT JOIN users u ON p.gerente_projeto_id = u.id
     LEFT JOIN oportunidades op ON p.oportunidade_id = op.id
     LEFT JOIN propostas prop ON p.proposta_id = prop.id
     LEFT JOIN licitacoes l ON p.licitacao_id = l.id
     WHERE p.id = ?`, [projetoId]);

  if (projetoRows.length === 0) {
    return null;
  }
  const projeto = projetoRows[0];

  // TODO: Buscar tarefas, equipe, documentos associados quando essas APIs/tabelas estiverem prontas
  // e se a requisição GET específica pedir por esses detalhes (ex: com query params ?include=tarefas,equipe)
  // Por agora, o GET de projeto por ID retorna apenas os dados principais do projeto e FKs resolvidas.

  // const [tarefaRows]: any = await connection.execute('SELECT * FROM projeto_tarefas WHERE projeto_id = ?', [projetoId]);
  // projeto.tarefas = tarefaRows;
  // const [equipeRows]: any = await connection.execute('SELECT u.id, u.name, pe.papel_no_projeto FROM projeto_equipe pe JOIN users u ON pe.usuario_id = u.id WHERE pe.projeto_id = ?', [projetoId]);
  // projeto.equipe = equipeRows;
  // const [documentoRows]: any = await connection.execute('SELECT * FROM documentos WHERE projeto_id = ?', [projetoId]);
  // projeto.documentos = documentoRows;

  return projeto;
}

// GET - Buscar projeto por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projetoId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();
    const projeto = await fetchProjetoCompleto(projetoId, connection);

    if (!projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }
    return NextResponse.json(projeto);
  } catch (error: any) {
    console.error(`Erro ao buscar projeto ${projetoId}:`, error);
    return NextResponse.json({ error: 'Falha ao buscar projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar projeto completo
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projetoId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as ProjetoUpdatePayload;

    connection = await getDbConnection();

    const camposParaAtualizar: Partial<ProjetoUpdatePayload> = {};
    const camposPermitidos: (keyof ProjetoUpdatePayload)[] = [
        'nome_projeto', 'descricao', 'status_projeto', 'data_inicio_prevista',
        'data_fim_prevista', 'data_inicio_real', 'data_fim_real', 'orcamento_horas',
        'orcamento_custo', 'cliente_id', 'orgao_id', 'oportunidade_id',
        'proposta_id', 'licitacao_id', 'gerente_projeto_id', 'percentual_concluido'
    ];

    for (const key of camposPermitidos) {
        if (body[key] !== undefined) {
            (camposParaAtualizar as any)[key] = body[key];
        }
    }

    if (Object.keys(camposParaAtualizar).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    // Garantir a constraint chk_projeto_entidade_alvo
    let currentClienteId = camposParaAtualizar.cliente_id;
    let currentOrgaoId = camposParaAtualizar.orgao_id;

    if (camposParaAtualizar.cliente_id === undefined || camposParaAtualizar.orgao_id === undefined) {
        const [currentRow]:any = await connection.execute('SELECT cliente_id, orgao_id FROM projetos WHERE id = ?', [projetoId]);
        if (currentRow.length > 0) {
            if (camposParaAtualizar.cliente_id === undefined) currentClienteId = currentRow[0].cliente_id;
            if (camposParaAtualizar.orgao_id === undefined) currentOrgaoId = currentRow[0].orgao_id;
        } else {
             return NextResponse.json({ error: 'Projeto não encontrado para aplicar constraint check.' }, { status: 404 });
        }
    }
    if (currentClienteId === null && currentOrgaoId === null) {
        return NextResponse.json({ error: 'O projeto deve estar associado a um Cliente ou Órgão.' }, { status: 400 });
    }


    const updateFields = Object.keys(camposParaAtualizar).map(key => `${key} = ?`).join(', ');
    const updateValues = [...Object.values(camposParaAtualizar), projetoId];

    await connection.execute(
      `UPDATE projetos SET ${updateFields}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    const projetoAtualizado = await fetchProjetoCompleto(projetoId, connection);
    return NextResponse.json(projetoAtualizado);

  } catch (error: any) {
    console.error(`Erro ao atualizar projeto ${projetoId}:`, error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return NextResponse.json({ error: 'ID de referência inválido (Cliente, Órgão ou Gerente).' }, { status: 400 });
    }
     if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || (typeof error.message === 'string' && error.message.includes('chk_projeto_entidade_alvo'))) {
        return NextResponse.json({ error: 'O projeto deve estar associado a um Cliente ou Órgão.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao atualizar projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PATCH - Atualizar status ou campos parciais do projeto
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projetoId } = params;
  let connection: Connection | null = null;
  try {
    const body = await request.json() as Partial<ProjetoUpdatePayload>;

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    const camposPermitidosPatch: (keyof ProjetoUpdatePayload)[] = [
        'status_projeto', 'percentual_concluido', 'data_inicio_real', 'data_fim_real',
        'nome_projeto', 'descricao', 'data_inicio_prevista', 'data_fim_prevista',
        'orcamento_horas', 'orcamento_custo', 'gerente_projeto_id'
        // Não permitir alterar cliente_id/orgao_id e FKs de origem via PATCH simples, usar PUT.
    ];
    const camposParaAtualizarPatch: Partial<ProjetoUpdatePayload> = {};
    for(const key of camposPermitidosPatch){
        if(body[key] !== undefined){
            (camposParaAtualizarPatch as any)[key] = body[key];
        }
    }

    if (Object.keys(camposParaAtualizarPatch).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido fornecido para atualização PATCH.' }, { status: 400 });
    }

    connection = await getDbConnection();

    const updateFields = Object.keys(camposParaAtualizarPatch).map(key => `${key} = ?`).join(', ');
    const updateValues = [...Object.values(camposParaAtualizarPatch), projetoId];

    const [result]:any = await connection.execute(
      `UPDATE projetos SET ${updateFields}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Projeto não encontrado para atualizar.' }, { status: 404 });
    }

    const projetoAtualizado = await fetchProjetoCompleto(projetoId, connection);
    return NextResponse.json(projetoAtualizado);

  } catch (error: any) {
    console.error(`Erro ao atualizar parcialmente projeto ${projetoId}:`, error);
     if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.message.includes('gerente_projeto_id')) {
        return NextResponse.json({ error: 'ID do Gerente de Projeto inválido.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Falha ao atualizar parcialmente projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// DELETE - "Excluir" projeto (Soft delete - mudar status para CANCELADO)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: projetoId } = params;
  let connection: Connection | null = null;
  try {
    connection = await getDbConnection();

    // Soft delete: mudar status para CANCELADO
    // Futuramente, poderia receber um status do payload, ex: ARQUIVADO
    const [result]:any = await connection.execute(
      "UPDATE projetos SET status_projeto = 'CANCELADO', updated_at = NOW() WHERE id = ?",
      [projetoId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Projeto não encontrado para cancelar/arquivar.' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Projeto marcado como cancelado com sucesso.' });

  } catch (error: any) {
    console.error(`Erro ao cancelar/arquivar projeto ${projetoId}:`, error);
    return NextResponse.json({ error: 'Falha ao cancelar/arquivar projeto', details: error.message }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
