import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';

export async function GET(request: NextRequest) {
  let connection;
  console.log("GET /api/comercial/segmentos - Iniciando consulta com MySQL");
  try {
    connection = await getDbConnection();
    
    const sql = 'SELECT id, nome, descricao, created_at, updated_at FROM segmentos_clientes ORDER BY nome ASC';
    console.log("Executando SQL:", sql);
    const [rows] = await connection.execute(sql);
    
    return NextResponse.json(rows);

  } catch (error: any) {
    console.error('Erro ao buscar segmentos (MySQL):', error);
    // Note: Se connection foi obtido antes do erro, ele será liberado no finally.
    // Se o erro ocorreu ao obter a conexão, connection será undefined e o finally não tentará liberar.
    return NextResponse.json(
      { error: 'Erro interno ao processar requisição de segmentos', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Conexão MySQL liberada (GET Segmentos).");
      } catch (releaseError: any) {
        console.error("Erro ao liberar conexão MySQL (GET Segmentos):", releaseError.message);
      }
    }
  }
}
