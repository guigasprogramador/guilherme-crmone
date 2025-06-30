import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from "@/lib/auth/jwt";

// Adicione cabeçalhos CORS para garantir que a API funcione corretamente
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // Idealmente, especifique sua origem
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 204, // No Content
    headers: corsHeaders()
  });
}

export async function GET(request: NextRequest) {
  let connection;
  try {
    console.log("Iniciando verificação de autenticação com MySQL");
    
    const accessToken = request.cookies.get("accessToken")?.value;
    
    if (!accessToken) {
      console.log("Token não encontrado no cookie");
      return new NextResponse(
        JSON.stringify({ authenticated: false, error: "Token não encontrado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }
    
    console.log("Verificando JWT do access token");
    const payload = await verifyJwtToken(accessToken); // verifyJwtToken já lida com erros de JWT
    
    if (!payload || !payload.userId) {
      console.log("Access token JWT inválido, expirado ou sem userId");
      return new NextResponse(
        JSON.stringify({ authenticated: false, error: "Token inválido ou expirado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }
    
    console.log("Token válido, buscando usuário no MySQL com ID:", payload.userId);
    connection = await getDbConnection();
    
    const [userRows]: any = await connection.execute(
      'SELECT id, name, email, role, avatar_url FROM users WHERE id = ?',
      [payload.userId]
    );
    
    if (userRows.length === 0) {
      console.log("Usuário não encontrado no MySQL com ID:", payload.userId);
      // Se o token é válido mas o usuário não existe, é uma situação de não autenticado.
      return new NextResponse(
        JSON.stringify({ authenticated: false, error: "Usuário não encontrado para o token fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }
    
    const user = userRows[0];
    console.log("Usuário autenticado com sucesso via MySQL:", user.email);
    
    return new NextResponse(
      JSON.stringify({
        authenticated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );

  } catch (error: any) { // Captura erros gerais, incluindo os de verifyJwtToken se não forem tratados internamente
    console.error("Erro durante verificação de autenticação com MySQL:", error.message);
    // Se o erro for de token inválido vindo de verifyJwtToken, pode ser redundante, mas seguro.
    if (error.message === 'jwt expired' || error.message === 'invalid token' || error.message === 'invalid signature') {
      return new NextResponse(
        JSON.stringify({ authenticated: false, error: "Token inválido ou expirado." }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }
    return new NextResponse(
      JSON.stringify({ authenticated: false, error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (verify).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (verify):", releaseError.message);
      }
    }
  }
}
