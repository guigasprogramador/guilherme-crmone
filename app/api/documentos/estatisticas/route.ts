import { NextRequest, NextResponse } from 'next/server';
// import { Documento } from '@/types/licitacoes'; // Documento type not directly used for stats output
import { getDbConnection } from '@/lib/mysql/client';
import { verifyJwtToken } from "@/lib/auth/jwt";

// Interface para estatísticas de documentos
interface DocumentoEstatisticas {
  total: number;
  vencemEm30Dias: number;
  porTipo: Record<string, number>;
  porLicitacao: Record<string, number>; // Key will be licitacao_id, value is count
  tamanhoTotal: number; // em bytes
}

// GET - Obter estatísticas de documentos
export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/documentos/estatisticas - Iniciando consulta com MySQL");
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado: token não fornecido' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyJwtToken(token);
    if (!decodedToken || !decodedToken.userId) {
      return NextResponse.json({ error: 'Não autorizado: token inválido' }, { status: 401 });
    }

    connection = await getDbConnection();
    
    const estatisticas: DocumentoEstatisticas = {
      total: 0,
      vencemEm30Dias: 0,
      porTipo: {},
      porLicitacao: {},
      tamanhoTotal: 0,
    };

    // Query for Total Documents (ativos)
    const [totalRows]: any = await connection.execute("SELECT COUNT(*) as total FROM documentos WHERE status = 'ativo'");
    estatisticas.total = totalRows[0]?.total || 0;

    // Query for Documents Expiring in 30 Days (ativos)
    const [expiringRows]: any = await connection.execute(
      "SELECT COUNT(*) as count FROM documentos WHERE status = 'ativo' AND data_validade BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)"
    );
    estatisticas.vencemEm30Dias = expiringRows[0]?.count || 0;

    // Query for Documents by Type (ativos)
    const [typeRows]: any = await connection.execute(
      "SELECT tipo, COUNT(*) as count FROM documentos WHERE status = 'ativo' AND tipo IS NOT NULL GROUP BY tipo"
    );
    (typeRows as any[]).forEach(row => {
      estatisticas.porTipo[row.tipo] = row.count;
    });

    // Query for Documents by Licitacao (ativos)
    const [licitacaoRows]: any = await connection.execute(
      "SELECT licitacao_id, COUNT(*) as count FROM documentos WHERE status = 'ativo' AND licitacao_id IS NOT NULL GROUP BY licitacao_id"
    );
    (licitacaoRows as any[]).forEach(row => {
      // Para manter a chave como string, mesmo que o ID seja numérico no futuro (improvável com UUID)
      estatisticas.porLicitacao[String(row.licitacao_id)] = row.count;
    });

    // Query for Total Size (ativos)
    const [sizeRows]: any = await connection.execute(
      "SELECT SUM(tamanho) as sum_tamanho FROM documentos WHERE status = 'ativo'"
    );
    estatisticas.tamanhoTotal = Number(sizeRows[0]?.sum_tamanho) || 0;
    
    return NextResponse.json(estatisticas);

  } catch (error: any) {
    console.error('Erro ao obter estatísticas de documentos (MySQL):', error);
     if (error.message === 'jwt expired' || error.message.includes('invalid token')) {
        return NextResponse.json({ error: 'Não autorizado: token inválido ou expirado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas de documentos', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (Estatisticas Documentos).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (Estatisticas Documentos):", releaseError.message);
      }
    }
  }
}
