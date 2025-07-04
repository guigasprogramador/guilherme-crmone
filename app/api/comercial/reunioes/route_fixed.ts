import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import { withMiddleware, validateRequest, errorHandler, withDatabase } from '@/middleware/security';
import { rateLimits } from '@/lib/rate-limit';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY não configurado. Emails não serão enviados.");
}

// Validação de data e hora
function parseAndValidateDate(dateString: string): string | null {
  if (!dateString) return null;
  
  // Tentar diferentes formatos
  let date: Date;
  
  // Formato DD/MM/YYYY
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      return null;
    }
  } else {
    // Formato YYYY-MM-DD ou ISO
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) return null;
  
  // Verificar se a data não é no passado (exceto hoje)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date < today) return null;
  
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function parseAndValidateTime(timeString: string): string | null {
  if (!timeString) return null;
  
  // Validar formato HH:MM ou HH:MM:SS
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  if (!timeRegex.test(timeString)) return null;
  
  // Garantir formato HH:MM:SS
  if (timeString.length === 5) {
    return `${timeString}:00`;
  }
  
  return timeString;
}

function formatDateToBR(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    .toLocaleDateString('pt-BR');
}

// Verificar conflitos de horário
async function checkTimeConflicts(
  connection: any,
  data: string,
  hora: string,
  oportunidadeId: string,
  excludeReuniaoId?: string
): Promise<boolean> {
  let sql = `
    SELECT id FROM reunioes 
    WHERE data = ? AND hora = ? AND oportunidade_id = ?
  `;
  const params = [data, hora, oportunidadeId];
  
  if (excludeReuniaoId) {
    sql += ' AND id != ?';
    params.push(excludeReuniaoId);
  }
  
  const [rows]: any = await connection.execute(sql, params);
  return rows.length > 0;
}

// Validar se oportunidade existe
async function validateOportunidade(connection: any, oportunidadeId: string): Promise<boolean> {
  const [rows]: any = await connection.execute(
    'SELECT id FROM oportunidades WHERE id = ?',
    [oportunidadeId]
  );
  return rows.length > 0;
}

// Schema de validação para reunião
const reuniaoSchema = {
  oportunidadeId: { required: true, type: 'string' },
  titulo: { required: true, type: 'string', minLength: 3, maxLength: 255 },
  data: { required: true, type: 'string' },
  hora: { required: true, type: 'string' },
  local: { required: false, type: 'string', maxLength: 255 },
  notas: { required: false, type: 'string' },
  concluida: { required: false, type: 'boolean' },
  participantes: { required: false, type: 'array' },
  sendEmail: { required: false, type: 'boolean' }
};

// GET - Listar reuniões com filtros
async function handleGet(request: NextRequest, { connection }: any) {
  console.log("GET /api/comercial/reunioes - Iniciando consulta");
  
  const { searchParams } = new URL(request.url);
  
  let sql = `
    SELECT r.*, o.titulo as oportunidade_titulo, c.nome as cliente_nome
    FROM reunioes r
    LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
    LEFT JOIN clientes c ON o.cliente_id = c.id
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];

  // Filtros
  const oportunidadeId = searchParams.get('oportunidadeId');
  if (oportunidadeId) {
    conditions.push('r.oportunidade_id = ?');
    params.push(oportunidadeId);
  }
  
  const dataParam = searchParams.get('data');
  if (dataParam) {
    const validDate = parseAndValidateDate(dataParam);
    if (validDate) {
      conditions.push('r.data = ?');
      params.push(validDate);
    }
  }
  
  const concluidaParam = searchParams.get('concluida');
  if (concluidaParam !== null) {
    conditions.push('r.concluida = ?');
    params.push(concluidaParam === 'true' ? 1 : 0);
  }

  // Filtro por período
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');
  if (dataInicio && dataFim) {
    const validDataInicio = parseAndValidateDate(dataInicio);
    const validDataFim = parseAndValidateDate(dataFim);
    if (validDataInicio && validDataFim) {
      conditions.push('r.data BETWEEN ? AND ?');
      params.push(validDataInicio, validDataFim);
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY r.data ASC, r.hora ASC';

  // Paginação
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;
  
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  console.log("Executando SQL:", sql, params);
  const [rows] = await connection.execute(sql, params);

  // Buscar participantes para cada reunião
  const reunioes = await Promise.all((rows as any[]).map(async (row) => {
    const [participantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [row.id]
    );

    return {
      ...row,
      data: formatDateToBR(row.data),
      concluida: row.concluida === 1,
      participantes: participantesRows.map((p: any) => ({
        participante_id: p.participante_id,
        tipo_participante: p.tipo_participante,
        confirmado: p.confirmado === 1,
      })),
    };
  }));

  // Contar total para paginação
  let countSql = `
    SELECT COUNT(*) as total
    FROM reunioes r
    LEFT JOIN oportunidades o ON r.oportunidade_id = o.id
  `;
  
  if (conditions.length > 0) {
    countSql += ' WHERE ' + conditions.slice(0, -2).join(' AND '); // Remove LIMIT e OFFSET
  }
  
  const [countRows]: any = await connection.execute(countSql, params.slice(0, -2));
  const total = countRows[0].total;

  return NextResponse.json({
    reunioes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

// POST - Criar nova reunião
async function handlePost(request: NextRequest, { connection }: any) {
  console.log("POST /api/comercial/reunioes - Iniciando criação");
  
  const data = await request.json();
  console.log("Dados recebidos:", data);
  
  // Validações básicas
  if (!data.oportunidadeId || !data.titulo || !data.data || !data.hora) {
    return NextResponse.json({ 
      error: 'Campos obrigatórios: oportunidadeId, titulo, data, hora' 
    }, { status: 400 });
  }

  // Validar oportunidade
  const oportunidadeExists = await validateOportunidade(connection, data.oportunidadeId);
  if (!oportunidadeExists) {
    return NextResponse.json({ 
      error: 'Oportunidade não encontrada' 
    }, { status: 404 });
  }

  // Validar e parsear data e hora
  const dataSql = parseAndValidateDate(data.data);
  const horaSql = parseAndValidateTime(data.hora);
  
  if (!dataSql) {
    return NextResponse.json({ 
      error: 'Data inválida. Use formato DD/MM/YYYY ou YYYY-MM-DD' 
    }, { status: 400 });
  }
  
  if (!horaSql) {
    return NextResponse.json({ 
      error: 'Hora inválida. Use formato HH:MM' 
    }, { status: 400 });
  }

  await connection.beginTransaction();
  
  try {
    // Verificar conflitos de horário
    const hasConflict = await checkTimeConflicts(
      connection, 
      dataSql, 
      horaSql, 
      data.oportunidadeId
    );
    
    if (hasConflict) {
      await connection.rollback();
      return NextResponse.json({ 
        error: 'Já existe uma reunião agendada para este horário nesta oportunidade' 
      }, { status: 409 });
    }

    const newReuniaoId = uuidv4();
    
    const reuniaoDB = {
      id: newReuniaoId,
      oportunidade_id: data.oportunidadeId,
      titulo: data.titulo.trim(),
      data: dataSql,
      hora: horaSql,
      local: data.local?.trim() || null,
      notas: data.notas?.trim() || null,
      concluida: Boolean(data.concluida) ? 1 : 0,
    };

    await connection.execute(
      `INSERT INTO reunioes 
       (id, oportunidade_id, titulo, data, hora, local, notas, concluida, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      Object.values(reuniaoDB)
    );

    console.log("Reunião inserida com ID:", newReuniaoId);

    // Inserir participantes
    if (Array.isArray(data.participantes) && data.participantes.length > 0) {
      for (const p of data.participantes) {
        if (!p.participante_id || !p.tipo_participante) {
          console.warn("Participante inválido ignorado:", p);
          continue;
        }
        
        // Verificar se participante já existe para esta reunião
        const [existingParticipant]: any = await connection.execute(
          'SELECT id FROM reunioes_participantes WHERE reuniao_id = ? AND participante_id = ?',
          [newReuniaoId, p.participante_id]
        );
        
        if (existingParticipant.length === 0) {
          const newParticipanteId = uuidv4();
          await connection.execute(
            `INSERT INTO reunioes_participantes 
             (id, reuniao_id, participante_id, tipo_participante, confirmado, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [newParticipanteId, newReuniaoId, p.participante_id, p.tipo_participante, Boolean(p.confirmado) ? 1 : 0]
          );
        }
      }
      console.log(`Participantes processados para reunião ID: ${newReuniaoId}`);
    }

    // Enviar emails se solicitado
    if (process.env.SENDGRID_API_KEY && data.sendEmail) {
      await sendReuniaoEmails(connection, newReuniaoId, data);
    }

    await connection.commit();
    console.log("Transação commitada");

    // Buscar reunião criada para retorno
    const [createdReuniaoRows]: any = await connection.execute(
      'SELECT * FROM reunioes WHERE id = ?', 
      [newReuniaoId]
    );
    
    const [participantesRows]: any = await connection.execute(
      'SELECT participante_id, tipo_participante, confirmado FROM reunioes_participantes WHERE reuniao_id = ?',
      [newReuniaoId]
    );

    const reuniaoCriada = {
      ...createdReuniaoRows[0],
      data: formatDateToBR(createdReuniaoRows[0].data),
      concluida: createdReuniaoRows[0].concluida === 1,
      participantes: participantesRows.map((p: any) => ({
        participante_id: p.participante_id,
        tipo_participante: p.tipo_participante,
        confirmado: p.confirmado === 1,
      })),
    };

    return NextResponse.json(reuniaoCriada, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar reunião:', error);
    await connection.rollback();
    throw error;
  }
}

// Função para enviar emails
async function sendReuniaoEmails(connection: any, reuniaoId: string, data: any) {
  try {
    const destinatarios: string[] = [];
    
    // Buscar email do cliente da oportunidade
    const [oppRows]: any = await connection.execute(
      `SELECT c.contato_email, c.nome as cliente_nome, o.titulo as oportunidade_titulo
       FROM oportunidades o
       JOIN clientes c ON o.cliente_id = c.id
       WHERE o.id = ?`,
      [data.oportunidadeId]
    );
    
    if (oppRows.length > 0 && oppRows[0].contato_email) {
      destinatarios.push(oppRows[0].contato_email);
    }
    
    // Buscar emails dos participantes internos
    if (Array.isArray(data.participantes)) {
      for (const p of data.participantes) {
        if (p.tipo_participante === 'interno' && p.participante_id) {
          const [userRows]: any = await connection.execute(
            'SELECT email FROM users WHERE id = ?', 
            [p.participante_id]
          );
          if (userRows.length > 0 && userRows[0].email) {
            destinatarios.push(userRows[0].email);
          }
        }
      }
    }

    if (destinatarios.length > 0) {
      const uniqueDestinatarios = Array.from(new Set(destinatarios));
      const clienteNome = oppRows[0]?.cliente_nome || 'Cliente';
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Nova Reunião Agendada</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Título:</strong> ${data.titulo}</p>
            <p><strong>Cliente:</strong> ${clienteNome}</p>
            <p><strong>Data:</strong> ${data.data}</p>
            <p><strong>Horário:</strong> ${data.hora}</p>
            <p><strong>Local:</strong> ${data.local || 'A definir'}</p>
            ${data.notas ? `<p><strong>Pauta:</strong> ${data.notas}</p>` : ''}
          </div>
          <p style="color: #64748b; font-size: 14px;">
            Esta é uma notificação automática do sistema CRM.
          </p>
        </div>
      `;
      
      await sgMail.send({
        to: uniqueDestinatarios,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@crm.com',
        subject: `Convite: ${data.titulo} - ${clienteNome}`,
        html: emailBody,
      });
      
      console.log("Email enviado para:", uniqueDestinatarios.join(', '));
    }
  } catch (emailError: any) {
    console.error('Erro ao enviar email:', emailError);
    // Não falhar a criação da reunião por erro de email
  }
}

// Aplicar middlewares
export const GET = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handleGet);

export const POST = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handlePost);

