import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from '@/lib/mysql/client';
import { generateAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) { // Changed GET to POST
  let connection;
  try {
    console.log("Iniciando processo de refresh de token com MySQL");
    const refreshTokenFromCookie = request.cookies.get("refreshToken")?.value;
    
    if (!refreshTokenFromCookie) {
      console.log("Refresh token não encontrado no cookie");
      return NextResponse.json(
        { error: "Refresh token não encontrado" },
        { status: 401 }
      );
    }
    
    console.log("Verificando JWT do refresh token");
    let decodedToken: { userId?: string } | null = null;
try {
  decodedToken = jwt.verify(
    refreshTokenFromCookie,
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
  ) as { userId?: string };
} catch (err) {
  decodedToken = null;
}

if (!decodedToken || !decodedToken.userId) {
  console.log("Refresh token JWT inválido ou expirado");
  return NextResponse.json(
    { error: "Token inválido ou expirado" },
    { status: 401 }
  );
}
const userIdFromJwt = decodedToken.userId;
    
    connection = await getDbConnection();
    console.log("Verificando refresh token no banco de dados MySQL");
    const [tokenRows]: any = await connection.execute(
      'SELECT user_id, expires_at, is_revoked FROM refresh_tokens WHERE token = ? AND user_id = ?',
      [refreshTokenFromCookie, userIdFromJwt]
    );

    if (tokenRows.length === 0) {
      console.log("Refresh token não encontrado no DB ou não corresponde ao usuário JWT");
      return NextResponse.json(
        { error: "Token revogado ou inválido" },
        { status: 401 }
      );
    }
    
    const tokenData = tokenRows[0];
    if (tokenData.is_revoked) {
      console.log("Refresh token está revogado");
      return NextResponse.json(
        { error: "Token revogado" },
        { status: 401 }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("Refresh token expirado (de acordo com DB)");
      return NextResponse.json(
        { error: "Token expirado" },
        { status: 401 }
      );
    }
    
    console.log("Obtendo detalhes do usuário do MySQL:", userIdFromJwt);
    const [userRows]: any = await connection.execute(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = ?',
      [userIdFromJwt] // Usar o userId do JWT que foi validado contra o token no DB
    );
    
    if (userRows.length === 0) {
      console.log("Usuário associado ao refresh token não encontrado");
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 401 } // 401 porque o token é válido mas o usuário não existe mais
      );
    }
    const user = userRows[0];
    
    console.log("Gerando novo access token");
    const accessToken = generateAccessToken({
      userId: user.id, // Usar user.id do DB para consistência
      email: user.email,
      role: user.role
    });
    
    const response = NextResponse.json(
      { 
        message: "Token atualizado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
        // accessToken: accessToken // REMOVED from response body
      },
      { status: 200 }
    );
    
    response.cookies.set({
      name: "accessToken",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutos
      path: "/",
    });
    
    console.log("Novo access token enviado com sucesso");
    return response;

  } catch (error: any) {
    console.error("Erro durante refresh do token com MySQL:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (refresh token).");
      } catch (releaseError) {
        console.error("Erro ao liberar conexão MySQL (refresh token):", releaseError);
      }
    }
  }
}
