import { NextRequest, NextResponse } from 'next/server';
// import { Reuniao } from '@/types/comercial'; // Type might need update for participants
import { getDbConnection } from '@/lib/mysql/client';
import { v4 as uuidv4 } from 'uuid';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY não configurado. Emails não serão enviados.");
}

// Helper para converter string DD/MM/YYYY para YYYY-MM-DD
function parseDateString(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
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

// Helper para formatar data YYYY-MM-DD para DD/MM/YYYY
function formatDateToDDMMYYYY(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Ajuste para UTC para evitar problemas de fuso horário ao formatar
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('pt-BR');
}


// GET - Listar todas as reuniões ou filtrar
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/comercial/reunioes - Iniciando consulta com MySQL");
  try {
    const { searchParams } = new URL(request.url);
    connection = await getDbConnection();
    
    let sql = 'SELECT id, oportunidade_id, titulo, data, hora, local, notas, concluida, created_at, updated_at FROM reunioes';
    const conditions: string[] = [];
    const params: any[] = [];

    const oportunidadeId = searchParams.get('oportunidadeId');
    if (oportunidadeId) {
      conditions.push('oportunidade_id = ?');
      params.push(oportunidadeId);
    }
    
    const dataParam = searchParams.get('data'); // Espera YYYY-MM-DD
    if (dataParam) {
      conditions.push('data = ?');
      params.push(dataParam);
    }
    
    const concluidaParam = searchParams.get('concluida');
    if (concluidaParam !== null && concluidaParam !== undefined) {
      conditions.push('concluida = ?');
      params.push(concluidaParam === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY data ASC, hora ASC';

    console.log("Executando SQL:", sql, params);
    const [rows] = await connection.execute(sql, params);

    const resultado = (rows as any[]).map(row => ({
        ...row,
        data: formatDateToDDMMYYYY(row.data), // Formatar data para o frontend
        concluida: row.concluida === 1,
        // Participantes não são buscados nesta listagem geral para simplificar
        // Poderiam ser adicionados com um JOIN ou uma subconsulta se necessário aqui
        // ou buscados individualmente pelo frontend ao selecionar uma reunião.
    }));
    
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('Erro ao buscar reuniões (MySQL):', error);
    return NextResponse.json(
      { error: 'Erro ao buscar reuniões', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar nova reunião
export async function POST(request: NextRequest) {
  let connection;
  console.log("POST /api/comercial/reunioes - Iniciando criação com MySQL");
  try {
    const data = await request.json();
    console.log("Dados recebidos:", data);
    
    if (!data.oportunidadeId || !data.titulo || !data.data || !data.hora) {
      return NextResponse.json({ error: 'ID da oportunidade, título, data e hora são obrigatórios' }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();
    console.log("Transação MySQL iniciada.");

    const newReuniaoId = uuidv4();
    const dataSql = parseDateString(data.data); // YYYY-MM-DD
    // Hora deve ser HH:MM ou HH:MM:SS
    const horaSql = data.hora.match(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/) ? data.hora : null;
    if (!horaSql) {
        await connection.rollback();
        return NextResponse.json({ error: 'Formato de hora inválido. Use HH:MM ou HH:MM:SS.'}, { status: 400 });
    }


    const reuniaoDB = {
      id: newReuniaoId,
      oportunidade_id: data.oportunidadeId,
      titulo: data.titulo,
      data: dataSql,
      hora: horaSql,
      local: data.local || null,
      notas: data.notas || null,
      concluida: data.concluida !== undefined ? (Boolean(data.concluida) ? 1 : 0) : 0,
    };

    await connection.execute(
      'INSERT INTO reunioes (id, oportunidade_id, titulo, data, hora, local, notas, concluida, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      Object.values(reuniaoDB)
    );
    console.log("Reunião inserida na tabela 'reunioes' com ID:", newReuniaoId);

    // Inserir participantes
    if (Array.isArray(data.participantes) && data.participantes.length > 0) {
      for (const p of data.participantes) {
        if (!p.participante_id || !p.tipo_participante) {
          console.warn("Registro de participante inválido ignorado:", p);
          continue;
        }
        const newParticipanteReuniaoId = uuidv4();
        await connection.execute(
          'INSERT INTO reunioes_participantes (id, reuniao_id, participante_id, tipo_participante, confirmado, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [newParticipanteReuniaoId, newReuniaoId, p.participante_id, p.tipo_participante, p.confirmado ? 1: 0 || 0]
        );
      }
      console.log(`${data.participantes.length} participantes inseridos para reunião ID:`, newReuniaoId);
    }

    // Lógica de Email (simplificada, buscar emails diretamente)
    if (process.env.SENDGRID_API_KEY && data.sendEmail) {
      const destinatarios: string[] = [];
      // Adicionar email do cliente da oportunidade
      if (data.oportunidadeId) {
        const [oppRows]: any = await connection.execute(
          `SELECT c.contato_email
           FROM oportunidades o
           JOIN clientes c ON o.cliente_id = c.id
           WHERE o.id = ?`,
          [data.oportunidadeId]
        );
        if (oppRows.length > 0 && oppRows[0].contato_email) {
          destinatarios.push(oppRows[0].contato_email);
        }
      }
      // Adicionar emails dos responsáveis (user_id dos participantes internos)
      if (Array.isArray(data.participantes)) {
        for (const p of data.participantes) {
          if (p.tipo_participante === 'interno' && p.participante_id) {
            const [userRows]: any = await connection.execute('SELECT email FROM users WHERE id = ?', [p.participante_id]);
            if (userRows.length > 0 && userRows[0].email) {
              destinatarios.push(userRows[0].email);
            }
          }
        }
      }

      if (destinatarios.length > 0) {
        // Certifique-se que o tsconfig.json tem "target": "es2015" ou superior para suportar spread em Set
const uniqueDestinatarios = Array.from(new Set(destinatarios)); // Remover duplicados
        const emailBody = `
          <h2>Nova reunião agendada</h2>
          <p><b>Título:</b> ${data.titulo}</p>
          <p><b>Data:</b> ${data.data} às ${data.hora}</p>
          <p><b>Local:</b> ${data.local || 'A definir'}</p>
          <p><b>Pauta:</b> ${data.notas || 'Não definida'}</p>
        `;
        try {
          await sgMail.send({
            to: uniqueDestinatarios,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
            subject: `Convite: ${data.titulo}`,
            html: emailBody,
          });
          console.log("Email de notificação enviado para:", uniqueDestinatarios.join(', '));
        } catch (emailError: any) {
          console.error('Erro ao enviar e-mail via SendGrid:', emailError.response?.body || emailError.message);
          // Não falhar a criação da reunião por erro de email, apenas logar.
        }
      }
    }

    await connection.commit();
    console.log("Transação MySQL commitada.");

    // Buscar a reunião recém-criada para retornar (sem participantes aqui, para simplificar)
    const [createdReuniaoRows]: any = await connection.execute('SELECT * FROM reunioes WHERE id = ?', [newReuniaoId]);
     if (createdReuniaoRows.length === 0) {
        return NextResponse.json({ error: "Falha ao recuperar reunião recém-criada" }, { status: 500 });
    }
    const reuniaoCriadaFormatada = {
        ...createdReuniaoRows[0],
        data: formatDateToDDMMYYYY(createdReuniaoRows[0].data),
        concluida: createdReuniaoRows[0].concluida === 1,
        participantes: data.participantes || [] // Retornar os participantes enviados no request
    };

    return NextResponse.json(reuniaoCriadaFormatada, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar reunião (MySQL):', error);
    if (connection) await connection.rollback().catch((rbError: any) => console.error("Erro ao reverter transação:", rbError.message));
    return NextResponse.json(
      { error: 'Erro ao criar reunião' },
      { status: 500 }
    );
  }
}
