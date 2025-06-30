import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/mysql/client"; // MySQL client
import { verifyJwtToken } from "@/lib/auth/jwt";

// Helper to format user for API response (camelCase) - can be shared
function formatUserResponse(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at, // Include updated_at
  };
}

// Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    if (payload.userId !== id && payload.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    connection = await getDbConnection();
    const [rows]: any = await connection.execute(
      "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user: formatUserResponse(rows[0]) });

  } catch (error: any) {
    console.error("Error getting user (MySQL):", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    if (payload.userId !== id && payload.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    
    const body = await request.json();
    
    if (body.role && payload.role !== "admin") {
      return NextResponse.json({ error: "Apenas administradores podem alterar funções." }, { status: 403 });
    }
    
    connection = await getDbConnection();
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (body.name !== undefined) { updateFields.push("name = ?"); updateValues.push(body.name); }
    if (body.avatarUrl !== undefined) { updateFields.push("avatar_url = ?"); updateValues.push(body.avatarUrl); }
    if (body.role && payload.role === "admin") { updateFields.push("role = ?"); updateValues.push(body.role); }
    // Password and microsoft_id changes would typically be handled by separate, more specific endpoints.

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para atualização fornecido" }, { status: 400 });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(id); // For WHERE id = ?

    const sql = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    
    const [result]: any = await connection.execute(sql, updateValues);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Usuário não encontrado ou nenhum dado alterado" }, { status: 404 });
    }
    
    const [updatedUserRows]: any = await connection.execute(
      "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    return NextResponse.json({
      message: "Usuário atualizado com sucesso",
      user: formatUserResponse(updatedUserRows[0]),
    });

  } catch (error: any) {
    console.error("Error updating user (MySQL):", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// Delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Somente administradores." }, { status: 403 });
    }
    
    if (payload.userId === id) {
      return NextResponse.json({ error: "Você não pode remover sua própria conta." }, { status: 400 });
    }
    
    connection = await getDbConnection();
    // Consider ON DELETE CASCADE for related user_profiles, user_preferences, refresh_tokens
    // or handle their deletion explicitly here if not set in DB.
    // For now, just deleting from users table.
    const [result]: any = await connection.execute("DELETE FROM users WHERE id = ?", [id]);
    
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Usuário removido com sucesso" });

  } catch (error: any) {
    console.error("Error deleting user (MySQL):", error);
    // Handle foreign key constraint errors if related data isn't deleted and CASCADE isn't set
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return NextResponse.json({ error: "Não é possível remover o usuário, pois ele possui dados relacionados." }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
