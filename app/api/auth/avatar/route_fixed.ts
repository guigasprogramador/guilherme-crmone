import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from "@/lib/auth/jwt";
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { withMiddleware, errorHandler, withDatabase } from '@/middleware/security';
import { rateLimits } from '@/lib/rate-limit';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validar configuração do Cloudinary
function validateCloudinaryConfig(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Validar arquivo de imagem
function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Verificar se é um arquivo
  if (!file) {
    return { valid: false, error: "Arquivo não fornecido" };
  }

  // Verificar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: "Formato inválido. Formatos aceitos: JPEG, PNG, WebP, GIF" 
    };
  }

  // Verificar tamanho (máximo 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: "Arquivo muito grande. Tamanho máximo: 5MB" 
    };
  }

  // Verificar dimensões mínimas (opcional)
  // Isso seria feito no frontend ou com uma biblioteca de processamento de imagem

  return { valid: true };
}

// Fazer upload para Cloudinary
async function uploadToCloudinary(
  file: File, 
  userId: string
): Promise<{ url: string; publicId: string }> {
  try {
    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Configurações de upload
    const uploadOptions = {
      folder: `avatars/${userId}`, // Organizar por usuário
      public_id: `avatar_${Date.now()}`, // ID único
      overwrite: true, // Sobrescrever avatar anterior
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face', // Focar no rosto se detectado
          quality: 'auto:good',
          format: 'webp' // Converter para WebP para otimização
        }
      ],
      tags: ['avatar', 'profile'], // Tags para organização
    };

    // Upload para Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id
    };

  } catch (error: any) {
    console.error('Erro no upload para Cloudinary:', error);
    throw new Error(`Falha no upload: ${error.message}`);
  }
}

// Deletar imagem anterior do Cloudinary
async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log('Imagem anterior deletada do Cloudinary:', publicId);
    }
  } catch (error: any) {
    console.error('Erro ao deletar imagem do Cloudinary:', error);
    // Não falhar o processo por erro de deleção
  }
}

// GET - Gerar URL assinada para upload direto (opcional)
async function handleGetSignedUrl(request: NextRequest, { connection }: any) {
  if (!validateCloudinaryConfig()) {
    return NextResponse.json(
      { error: "Cloudinary não configurado" },
      { status: 500 }
    );
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  
  const payload = await verifyJwtToken(accessToken);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'avatar_preset';
    
    // Parâmetros para assinatura
    const params = {
      timestamp: timestamp,
      upload_preset: uploadPreset,
      folder: `avatars/${payload.userId}`,
      transformation: 'w_400,h_400,c_fill,g_face,q_auto:good,f_webp'
    };

    // Gerar assinatura
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadPreset,
      folder: `avatars/${payload.userId}`
    });

  } catch (error: any) {
    console.error('Erro ao gerar URL assinada:', error);
    return NextResponse.json(
      { error: "Erro ao gerar URL de upload" },
      { status: 500 }
    );
  }
}

// POST - Upload de avatar
async function handleAvatarUpload(request: NextRequest, { connection }: any) {
  if (!validateCloudinaryConfig()) {
    return NextResponse.json(
      { error: "Cloudinary não configurado. Verifique as variáveis de ambiente." },
      { status: 500 }
    );
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  
  const payload = await verifyJwtToken(accessToken);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
  
  const userId = payload.userId;
  console.log("Iniciando upload de avatar para usuário:", userId);

  await connection.beginTransaction();
  
  try {
    // Verificar se usuário existe
    const [userRows]: any = await connection.execute(
      'SELECT id, avatar_url, avatar_public_id FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const user = userRows[0];
    
    // Obter arquivo do FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    console.log("Arquivo recebido:", {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });

    // Validar arquivo
    const validation = validateImageFile(file);
    if (!validation.valid) {
      await connection.rollback();
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Upload para Cloudinary
    console.log("Fazendo upload para Cloudinary...");
    const { url: newAvatarUrl, publicId: newPublicId } = await uploadToCloudinary(file, userId);
    
    console.log("Upload concluído:", { url: newAvatarUrl, publicId: newPublicId });

    // Atualizar banco de dados
    await connection.execute(
      'UPDATE users SET avatar_url = ?, avatar_public_id = ?, updated_at = NOW() WHERE id = ?',
      [newAvatarUrl, newPublicId, userId]
    );

    // Registrar histórico de alteração
    await connection.execute(
      `INSERT INTO user_activity_log (id, user_id, action, details, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        userId,
        'avatar_updated',
        JSON.stringify({ 
          old_url: user.avatar_url,
          new_url: newAvatarUrl,
          public_id: newPublicId
        })
      ]
    );

    await connection.commit();
    console.log("Avatar atualizado com sucesso no banco de dados");

    // Deletar avatar anterior do Cloudinary (após commit bem-sucedido)
    if (user.avatar_public_id) {
      deleteFromCloudinary(user.avatar_public_id).catch(console.error);
    }

    return NextResponse.json({
      message: "Avatar atualizado com sucesso",
      avatarUrl: newAvatarUrl,
      publicId: newPublicId
    });

  } catch (error: any) {
    console.error("Erro ao processar upload de avatar:", error);
    await connection.rollback();
    
    return NextResponse.json(
      { 
        error: "Erro ao processar upload de avatar",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Remover avatar
async function handleDeleteAvatar(request: NextRequest, { connection }: any) {
  const accessToken = request.cookies.get("accessToken")?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  
  const payload = await verifyJwtToken(accessToken);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
  
  const userId = payload.userId;

  await connection.beginTransaction();
  
  try {
    // Buscar avatar atual
    const [userRows]: any = await connection.execute(
      'SELECT avatar_url, avatar_public_id FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const user = userRows[0];

    if (!user.avatar_url) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Usuário não possui avatar para remover" },
        { status: 400 }
      );
    }

    // Remover do banco de dados
    await connection.execute(
      'UPDATE users SET avatar_url = NULL, avatar_public_id = NULL, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Registrar histórico
    await connection.execute(
      `INSERT INTO user_activity_log (id, user_id, action, details, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        userId,
        'avatar_removed',
        JSON.stringify({ removed_url: user.avatar_url })
      ]
    );

    await connection.commit();

    // Deletar do Cloudinary (após commit bem-sucedido)
    if (user.avatar_public_id) {
      deleteFromCloudinary(user.avatar_public_id).catch(console.error);
    }

    return NextResponse.json({
      message: "Avatar removido com sucesso"
    });

  } catch (error: any) {
    console.error("Erro ao remover avatar:", error);
    await connection.rollback();
    
    return NextResponse.json(
      { error: "Erro ao remover avatar" },
      { status: 500 }
    );
  }
}

// Aplicar middlewares
export const GET = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handleGetSignedUrl);

export const POST = withMiddleware(
  rateLimits.upload, // Rate limit mais restritivo para uploads
  errorHandler,
  withDatabase
)(handleAvatarUpload);

export const DELETE = withMiddleware(
  rateLimits.api,
  errorHandler,
  withDatabase
)(handleDeleteAvatar);

