import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbConnection } from '@/lib/mysql/client'; // query function not strictly needed if building manually
import { v4 as uuidv4 } from 'uuid';

// Adicione cabeçalhos CORS para garantir que a API funcione corretamente
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log("POST /api/auth/register - Iniciando processo de registro com MySQL");
    const { name, email, password, role = "user" } = await request.json();

    // Validação básica
    if (!name || !email || !password) {
      console.log("Erro: Campos obrigatórios faltando", { name, email });
      return new NextResponse(
        JSON.stringify({ error: "Nome, email e senha são obrigatórios" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        }
      );
    }

    connection = await getDbConnection();

    console.log("Verificando se email já existe no MySQL:", email);
    const [existingUserRows]: any = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUserRows.length > 0) {
      console.log("Email já em uso no MySQL:", email);
      return new NextResponse(
        JSON.stringify({ error: "Este email já está em uso" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        }
      );
    }

    // Hash da senha
    console.log("Gerando hash da senha");
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUserId = uuidv4();

    // Iniciar transação
    await connection.beginTransaction();
    console.log("Transação iniciada para novo usuário:", newUserId);

    // Criar usuário
    console.log("Criando novo usuário no MySQL:", { name, email, role });
    await connection.execute(
      'INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [newUserId, name, email, hashedPassword, role]
    );

    // Criar perfil do usuário
    const newUserProfileId = uuidv4();
    console.log("Criando perfil do usuário no MySQL para:", newUserId);
    await connection.execute(
      'INSERT INTO user_profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [newUserProfileId, newUserId]
    );

    // Criar preferências do usuário
    const newUserPreferencesId = uuidv4();
    console.log("Criando preferências do usuário no MySQL para:", newUserId);
    await connection.execute(
      'INSERT INTO user_preferences (id, user_id, email_notifications, sms_notifications, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [newUserPreferencesId, newUserId, true, false, 'light']
    );

    // Commit da transação
    await connection.commit();
    console.log("Transação commitada com sucesso para usuário:", newUserId);

    const response = new NextResponse(
      JSON.stringify({
        message: "Usuário criado com sucesso",
        user: { id: newUserId, name, email, role },
      }),
      { 
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      }
    );
    return response;

  } catch (error: any) {
    console.error("Erro durante o registro com MySQL:", error);
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transação revertida (rollback) devido a erro.");
      } catch (rollbackError) {
        console.error("Erro ao tentar reverter transação (rollback):", rollbackError);
      }
    }
    return new NextResponse(
      JSON.stringify({
        error: "Erro interno do servidor ao registrar usuário",
        details: error.message,
        code: error.code
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada.");
      } catch (releaseError) {
        console.error("Erro ao liberar conexão MySQL:", releaseError);
      }
    }
  }
}
