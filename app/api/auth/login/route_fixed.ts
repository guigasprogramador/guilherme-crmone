import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDbConnection } from "@/lib/mysql/client";
import { generateTokens } from "@/lib/auth/jwt";
import { v4 as uuidv4 } from 'uuid';
import { withMiddleware, errorHandler, withDatabase, sanitizeInput, isValidEmail } from '@/middleware/security';
import { rateLimits } from '@/lib/rate-limit';

// Rate limiting específico para login (mais restritivo)
const loginRateLimit = {
  interval: 15 * 60 * 1000, // 15 minutos
  maxAttempts: 5 // 5 tentativas por 15 minutos
};

// Cache para tentativas de login por IP
const loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  
  return 'unknown';
}

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Verificar se ainda está bloqueado
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((attempts.blockedUntil - now) / 1000) 
    };
  }
  
  // Reset após intervalo
  if (now - attempts.lastAttempt > loginRateLimit.interval) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return { allowed: true };
  }
  
  // Verificar limite
  if (attempts.count >= loginRateLimit.maxAttempts) {
    const blockDuration = 15 * 60 * 1000; // 15 minutos de bloqueio
    attempts.blockedUntil = now + blockDuration;
    return { 
      allowed: false, 
      retryAfter: Math.ceil(blockDuration / 1000) 
    };
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  return { allowed: true };
}

async function logLoginAttempt(
  connection: any,
  ip: string,
  email: string,
  success: boolean,
  userAgent?: string
) {
  try {
    await connection.execute(
      `INSERT INTO login_attempts (id, ip_address, email, success, user_agent, attempted_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), ip, email, success, userAgent || null]
    );
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
    // Não falhar o login por erro de log
  }
}

async function createActiveSession(
  connection: any,
  userId: string,
  refreshTokenId: string,
  ip: string,
  userAgent?: string
) {
  try {
    // Limitar sessões ativas por usuário (máximo 5)
    const [activeSessions]: any = await connection.execute(
      'SELECT COUNT(*) as count FROM active_sessions WHERE user_id = ?',
      [userId]
    );
    
    if (activeSessions[0].count >= 5) {
      // Remover sessão mais antiga
      await connection.execute(
        `DELETE FROM active_sessions 
         WHERE user_id = ? 
         ORDER BY last_activity ASC 
         LIMIT 1`,
        [userId]
      );
    }
    
    await connection.execute(
      `INSERT INTO active_sessions (id, user_id, refresh_token_id, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), userId, refreshTokenId, ip, userAgent || null]
    );
  } catch (error) {
    console.error('Erro ao criar sessão ativa:', error);
    // Não falhar o login por erro de sessão
  }
}

async function handleLogin(request: NextRequest, { connection }: any) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent');
  
  // Verificar rate limiting
  const rateLimitCheck = checkLoginRateLimit(ip);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { 
        error: 'Muitas tentativas de login. Tente novamente mais tarde.',
        retryAfter: rateLimitCheck.retryAfter 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitCheck.retryAfter?.toString() || '900'
        }
      }
    );
  }
  
  console.log("Iniciando processo de login");

  const body = await request.json();
  const sanitizedBody = sanitizeInput(body);
  
  const { email, password } = sanitizedBody;

  // Validações de entrada
  if (!email || !password) {
    await logLoginAttempt(connection, ip, email || 'unknown', false, userAgent);
    return NextResponse.json(
      { error: "Email e senha são obrigatórios" },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    await logLoginAttempt(connection, ip, email, false, userAgent);
    return NextResponse.json(
      { error: "Formato de email inválido" },
      { status: 400 }
    );
  }

  await connection.beginTransaction();
  
  try {
    console.log("Buscando usuário:", email);

    const [userRows]: any = await connection.execute(
      'SELECT id, name, email, password, role, avatar_url, is_active FROM users WHERE email = ?',
      [email]
    );

    if (userRows.length === 0) {
      await logLoginAttempt(connection, ip, email, false, userAgent);
      await connection.commit();
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const user = userRows[0];
    
    // Verificar se usuário está ativo
    if (!user.is_active) {
      await logLoginAttempt(connection, ip, email, false, userAgent);
      await connection.commit();
      return NextResponse.json(
        { error: "Conta desativada. Entre em contato com o administrador." },
        { status: 403 }
      );
    }

    console.log("Verificando senha");
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      await logLoginAttempt(connection, ip, email, false, userAgent);
      await connection.commit();
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    console.log("Login bem-sucedido, gerando tokens");
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    });

    // Armazenar refresh token
    const refreshTokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await connection.execute(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [refreshTokenId, user.id, refreshToken, expiresAt, ip, userAgent]
    );

    // Criar sessão ativa
    await createActiveSession(connection, user.id, refreshTokenId, ip, userAgent);

    // Registrar tentativa bem-sucedida
    await logLoginAttempt(connection, ip, email, true, userAgent);

    // Atualizar último login do usuário
    await connection.execute(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
      [ip, user.id]
    );

    await connection.commit();
    console.log("Login processado com sucesso");

    // Limpar tentativas de login para este IP após sucesso
    loginAttempts.delete(ip);

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
      },
      { status: 200 }
    );
    
    // Configurar cookies seguros
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

    // Headers de segurança
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;

  } catch (error: any) {
    console.error("Erro durante login:", error);
    await connection.rollback();
    await logLoginAttempt(connection, ip, email, false, userAgent);
    throw error;
  }
}

// Limpeza automática de tentativas antigas
setInterval(() => {
  const now = Date.now();
  const cutoff = now - (24 * 60 * 60 * 1000); // 24 horas
  
  for (const [ip, attempts] of loginAttempts.entries()) {
    if (attempts.lastAttempt < cutoff) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Executar a cada hora

// Aplicar middlewares
export const POST = withMiddleware(
  rateLimits.auth,
  errorHandler,
  withDatabase
)(handleLogin);

