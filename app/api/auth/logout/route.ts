import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from '@/lib/mysql/client';

export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log("Iniciando processo de logout com MySQL");
    const refreshTokenFromCookie = request.cookies.get("refreshToken")?.value;
    
    if (refreshTokenFromCookie) {
      console.log("Refresh token encontrado, tentando excluir do MySQL:", refreshTokenFromCookie);
      try {
        connection = await getDbConnection();
        const [result]: any = await connection.execute(
          'DELETE FROM refresh_tokens WHERE token = ?',
          [refreshTokenFromCookie]
        );
        if (result.affectedRows > 0) {
          console.log("Refresh token excluído com sucesso do MySQL.");
        } else {
          console.log("Refresh token não encontrado no MySQL para exclusão, ou já excluído.");
        }
      } catch (dbError: any) {
        // Logar o erro do DB, mas não impedir o logout do lado do cliente
        console.error("Erro ao excluir refresh token do MySQL:", dbError.message, dbError.code);
      }
    } else {
      console.log("Nenhum refresh token encontrado no cookie.");
    }
    
    // Limpar cookies independentemente do sucesso da exclusão do token no DB
    const response = NextResponse.json(
      { message: "Logout bem-sucedido" },
      { status: 200 }
    );
    
    console.log("Limpando cookies accessToken e refreshToken.");
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    
    return response;

  } catch (error: any) {
    console.error("Erro geral durante o processo de logout:", error.message);
    // Mesmo em caso de erro não relacionado ao DB (improvável aqui), tentar limpar os cookies
    const errorResponse = NextResponse.json(
      { error: "Erro interno do servidor durante o logout", details: error.message },
      { status: 500 }
    );
    errorResponse.cookies.delete("accessToken");
    errorResponse.cookies.delete("refreshToken");
    return errorResponse;
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (logout).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (logout):", releaseError.message);
      }
    }
  }
}
