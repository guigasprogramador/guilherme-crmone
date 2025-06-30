import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/mysql/client"; // MySQL client
import { verifyJwtToken } from "@/lib/auth/jwt";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';

// Helper to format user for API response (camelCase)
function formatUserResponse(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url, // Map snake_case to camelCase
    createdAt: user.created_at,
  };
}

// GET - Listar todos os usuários (apenas admin)
export async function GET(request: NextRequest) {
  let connection;
  try {
    let token = request.cookies.get("accessToken")?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    if (!token) {
      return NextResponse.json({ error: "Não autorizado: token não fornecido" }, { status: 401 });
    }
    
    const payload = await verifyJwtToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Acesso negado. Token inválido." }, { status: 403 });
    }
    
    connection = await getDbConnection();

    const { searchParams } = new URL(request.url);
    const rolesToFilter = searchParams.getAll('filterByRole');

    let query = "SELECT id, name, email, role, created_at, avatar_url FROM users";
    const params: string[] = [];

    if (rolesToFilter.length > 0) {
      query += ` WHERE role IN (${rolesToFilter.map(() => '?').join(',')})`;
      params.push(...rolesToFilter);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await connection.execute(query, params);
    
    // O endpoint agora retorna um array de usuários diretamente, não um objeto { users: [...] }
    const users = (rows as any[]).map(formatUserResponse);
    return NextResponse.json(users);

  } catch (error: any) {
    console.error("Erro ao listar usuários (MySQL):", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// POST - Criar novo usuário (apenas admin)
export async function POST(request: NextRequest) {
  let connection;
  try {
    let token = request.cookies.get("accessToken")?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    if (!token) {
      return NextResponse.json({ error: "Não autorizado: token não fornecido" }, { status: 401 });
    }
    
    const payload = await verifyJwtToken(token);
    if (!payload || !payload.userId || payload.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Somente administradores." }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, email, password, role = "user", avatarUrl } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
    }
    
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [existingUsers]: any = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Este email já está em uso" }, { status: 400 });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUserId = uuidv4();

    const userDb: { [key: string]: any } = { // Define type for userDb
      id: newUserId,
      name,
      email,
      password: hashedPassword,
      role,
      avatar_url: avatarUrl || null // From request body, mapped to snake_case
      // microsoft_id would be set by a different flow
      // created_at, updated_at are handled by DB default (NOW())
    };

    const userFields = Object.keys(userDb);
    const userPlaceholders = userFields.map(() => '?').join(', ');
    const userValues = userFields.map(key => userDb[key]);

    await connection.execute(
      `INSERT INTO users (${userFields.join(', ')}, created_at, updated_at) VALUES (${userPlaceholders}, NOW(), NOW())`,
      userValues
    );
    
    // Create user_profiles entry
    const newUserProfileId = uuidv4();
    await connection.execute(
      "INSERT INTO user_profiles (id, user_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [newUserProfileId, newUserId]
    );
    
    // Create user_preferences entry
    const newUserPrefsId = uuidv4();
    await connection.execute(
      "INSERT INTO user_preferences (id, user_id, email_notifications, sms_notifications, theme, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [newUserPrefsId, newUserId, true, false, "light"] // Default preferences
    );

    await connection.commit();

    // Fetch the created user to return in the response (excluding password)
    const [createdUserRows]: any = await connection.execute(
      "SELECT id, name, email, role, created_at, avatar_url FROM users WHERE id = ?",
      [newUserId]
    );

    return NextResponse.json({
        message: "Usuário criado com sucesso",
        user: formatUserResponse(createdUserRows[0]),
      },{ status: 201 });

  } catch (error: any) {
    console.error("Erro ao criar usuário (MySQL):", error);
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ error: "Email já existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
