// app/api/mysql-status/route.ts
import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/mysql/client';
import { mysqlConfig } from '@/lib/mysql/config';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  
  try {
    connection = await getDbConnection();
    
    if (!connection) {
      throw new Error('Failed to get database connection');
    }
    
    // Perform status checks
    const [statusRows] = await connection.execute('SELECT 1 as status');
    const [versionRows] = await connection.execute('SELECT VERSION() as version');
    const [uptimeRows] = await connection.execute('SHOW STATUS LIKE "Uptime"');
    
    return NextResponse.json({
      status: 'connected',
      message: 'MySQL database is accessible',
      config: {
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        database: mysqlConfig.database,
        port: mysqlConfig.port,
      },
      checks: {
        connection: statusRows,
        version: versionRows,
        uptime: uptimeRows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MySQL Status API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    const errorSqlState = (error as any)?.sqlState;

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to MySQL database',
        error: errorMessage,
        config: {
          host: mysqlConfig.host,
          user: mysqlConfig.user,
          database: mysqlConfig.database,
          port: mysqlConfig.port,
        },
        errorCode: errorCode,
        errorSqlState: errorSqlState,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing MySQL connection:', releaseError);
      }
    }
  }
}