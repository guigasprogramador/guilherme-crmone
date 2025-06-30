import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from "@/lib/auth/jwt";

// Bucket name for avatar storage - This will be relevant when a new storage solution is implemented.
// const BUCKET_NAME = "avatars";

// Gerar URL assinada para upload do avatar
export async function GET(request: NextRequest) {
  // >>> GET METHOD MODIFIED TO RETURN 501 NOT IMPLEMENTED <<<
  console.warn("GET /api/auth/avatar: Esta funcionalidade (gerar URL assinada para upload) está pendente de implementação de uma nova solução de armazenamento de arquivos.");
  return NextResponse.json(
    { error: "Funcionalidade de upload de avatar não implementada. Nova solução de armazenamento pendente." },
    { status: 501 } // 501 Not Implemented
  );
}

// Handle avatar upload
export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log("Iniciando upload de avatar (parcialmente refatorado para MySQL DB update)");
    const accessToken = request.cookies.get("accessToken")?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    
    const payload = await verifyJwtToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    const userId = payload.userId;
    console.log("ID do usuário para avatar (MySQL):", userId);
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    console.log("FormData recebido:", formData.has("file"), 
      file ? `Tipo: ${file.type}, Tamanho: ${file.size} bytes, Nome: ${file.name}` : "Nenhum arquivo"
    );
    
    if (!file) {
      return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
    }
    
    if (!file.type || !file.type.includes("image")) {
      return NextResponse.json({ error: "Formato inválido. Por favor, envie uma imagem." }, { status: 400 });
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limite
      return NextResponse.json({ error: "Arquivo muito grande. Tamanho máximo: 2MB" }, { status: 400 });
    }
    
    // --- INÍCIO DA SEÇÃO DE UPLOAD DE ARQUIVO (PLACEHOLDER) ---
    // A lógica de upload de arquivo para um serviço de armazenamento (como S3, Google Cloud Storage, etc.)
    // precisará ser implementada aqui quando o Supabase Storage for substituído.
    // Por enquanto, vamos simular que uma URL foi obtida.

    console.warn("AVISO: A lógica de upload de arquivo para o armazenamento (ex-Supabase Storage) NÃO está implementada.");
    // const arrayBuffer = await file.arrayBuffer(); // Manter para processar o arquivo
    // const filePath = `${userId}/avatar-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    // console.log("Caminho de arquivo simulado:", filePath);

    // SIMULAÇÃO: Substitua esta linha pela URL real obtida do novo serviço de armazenamento.
    const simulatedAvatarUrl = `https://example.com/path/to/new/storage/${userId}/avatar.jpg`;
    console.log("URL de avatar simulada (PLACEHOLDER):", simulatedAvatarUrl);
    // --- FIM DA SEÇÃO DE UPLOAD DE ARQUIVO (PLACEHOLDER) ---

    const avatarUrlToSave = simulatedAvatarUrl; // Usar a URL simulada/real

    connection = await getDbConnection();
    console.log("Atualizando avatar_url no MySQL para o usuário:", userId);

    const [result]: any = await connection.execute(
      'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
      [avatarUrlToSave, userId]
    );

    if (result.affectedRows === 0) {
      console.error("Usuário não encontrado no MySQL para atualização do avatar_url, ID:", userId);
      // Mesmo que o usuário não seja encontrado (o que seria estranho se o token é válido),
      // o upload (se tivesse ocorrido) já teria acontecido.
      // Poderia retornar 404 aqui, mas a lógica de "usuário não encontrado" deve ser robusta.
      return NextResponse.json({ error: "Usuário não encontrado para atualizar avatar" }, { status: 404 });
    }

    console.log("avatar_url atualizado com sucesso no MySQL.");
    return NextResponse.json({
      message: "Avatar atualizado com sucesso (URL no DB). Armazenamento de arquivo pendente.",
      avatarUrl: avatarUrlToSave
    });

  } catch (error: any) {
    console.error("Erro ao processar upload de avatar (MySQL refactor):", error.message);
    // Adicionar mais detalhes do erro se disponível
    const errorDetails = error.code ? { code: error.code, sqlMessage: error.sqlMessage } : {};
    return NextResponse.json(
      { error: "Erro ao processar upload de avatar" },
      { status: 500 }
    );
  }
}
