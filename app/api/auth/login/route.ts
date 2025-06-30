import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbConnection } from "@/lib/mysql/client";
import { generateTokens } from "@/lib/auth/jwt";
import { v4 as uuidv4 } from 'uuid';

// Função auxiliar para gerar a resposta com tokens e armazenar no MySQL
async function gerarRespostaComMySQL(user: any, accessToken: string, refreshToken: string) {
  let connection;
  try {
    console.log("Preparando resposta com tokens e armazenando refresh token no MySQL");
    
    connection = await getDbConnection();
    const refreshTokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await connection.execute(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
      [refreshTokenId, user.id, refreshToken, expiresAt]
    );
    console.log("Refresh token armazenado com sucesso no MySQL:", refreshTokenId);
    
    const response = NextResponse.json(
      { 
        message: "Login bem-sucedido",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
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
    
    response.cookies.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: "/",
    });
    
    console.log("Resposta de login preparada com sucesso com MySQL");
    return response;
  } catch (error: any) {
    console.error("Erro ao gerar resposta ou armazenar refresh token no MySQL:", error);
    // Não enviar erro para o cliente aqui, apenas logar. O login principal já foi bem sucedido.
    // Se o armazenamento do refresh token for crítico, o erro deve ser tratado no fluxo principal.
    // Por simplicidade, e para manter o login funcional mesmo se o refresh token falhar,
    // retornamos uma resposta de erro genérica APENAS se a falha for crítica para a resposta em si.
    // Neste caso, o erro é mais sobre o refresh token, então o login pode prosseguir.
    // Vamos construir a resposta sem o refresh token se o armazenamento falhar mas os tokens foram gerados.
     const fallbackResponse = NextResponse.json(
      {
        message: "Login bem-sucedido (mas falha ao armazenar refresh token)",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          avatar_url: user.avatar_url
        }
        // accessToken: accessToken // REMOVED from fallback response body
      },
      { status: 200 }
    );
    fallbackResponse.cookies.set({ name: "accessToken", value: accessToken, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 15 * 60, path: "/" });
    // Não definir o cookie do refresh token se não foi salvo
    console.warn("Refresh token não armazenado. Cookie do refresh token não será enviado.");
    return fallbackResponse;

  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (gerarRespostaComMySQL).");
      } catch (releaseError) {
        console.error("Erro ao liberar conexão MySQL (gerarRespostaComMySQL):", releaseError);
      }
    }
  }
}


export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log("Iniciando processo de login com MySQL");

    const body = await request.json();
    console.log("Dados recebidos:", JSON.stringify(body, null, 2));

    const { email, password } = body;

    if (!email || !password) {
      console.log("Dados incompletos:", { email: !!email, password: !!password });
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    connection = await getDbConnection();
    console.log("Buscando usuário no MySQL:", email);

    const [userRows]: any = await connection.execute(
      'SELECT id, name, email, password, role, avatar_url FROM users WHERE email = ?',
      [email]
    );

    if (userRows.length === 0) {
      console.log("Usuário não encontrado no MySQL para o email:", email);
      return NextResponse.json(
        { error: "Credenciais inválidas" }, // Alterado de "Usuário não encontrado" para segurança
        { status: 401 }
      );
    }

    const user = userRows[0];
    console.log("Usuário encontrado no MySQL, verificando senha");

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Resultado da verificação de senha:", passwordMatch);

    if (!passwordMatch) {
      console.log("Senha incorreta para o usuário no MySQL:", email);
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    console.log("Senha correta, gerando tokens JWT");
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role || 'user' // Garante que role tenha um valor
    });

    // Usar a função auxiliar atualizada
    return await gerarRespostaComMySQL(user, accessToken, refreshToken);

  } catch (error: any) {
    console.error("Erro durante login com MySQL:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message, code: error.code },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (POST).");
      } catch (releaseError) {
        console.error("Erro ao liberar conexão MySQL (POST):", releaseError);
      }
    }
  }
}
