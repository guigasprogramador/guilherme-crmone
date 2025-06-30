// app/api/mysql-test/route.ts
import { NextResponse } from 'next/server';
import { getDbConnection, query } from '@/lib/mysql/client'; // Assuming query function exists as an example
import { mysqlConfig } from '@/lib/mysql/config'; // For displaying config (excluding password)

export async function GET() {
  try {
    const connection = await getDbConnection(); // Test getting a connection

    // Perform a simple query
    const [rows] = await connection.execute('SELECT NOW() as currentTime, DATABASE() as currentDb;');
    // For pooled connections, connection.release() is crucial.
    // If getDbConnection provides a single connection that should be closed, use connection.end()
    // Depending on how getDbConnection is implemented (single vs. pooled), choose one:
    await connection.release(); // For pool
    // await connection.end(); // For single, non-pooled connection that needs explicit closing

    // For the query function if you want to test that too:
    // const resultFromQueryFunc = await query('SELECT NOW() as currentTimeFromQueryFunc;');


    return NextResponse.json({
      message: 'Successfully connected to MySQL and executed query.',
      configUsed: {
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        database: mysqlConfig.database,
        port: mysqlConfig.port,
      },
      queryResult: rows,
      // queryFunctionResult: resultFromQueryFunc // Uncomment if testing query function
    });
  } catch (error) {
    console.error('[MySQL Test API] Error:', error);
    // It's good practice to check if error is an instance of Error
    const errorMessage = error instanceof Error ? error.message : String(error);
    // @ts-ignore because 'code' and 'sqlState' are not standard Error properties but common in DB errors
    const errorCode = error.code;
    // @ts-ignore
    const errorSqlState = error.sqlState;

    return NextResponse.json(
      {
        message: 'Failed to connect to MySQL or execute query.',
        error: errorMessage,
        configAttempted: {
          host: mysqlConfig.host,
          user: mysqlConfig.user,
          database: mysqlConfig.database,
          port: mysqlConfig.port,
        },
        errorCode: errorCode,
        errorSqlState: errorSqlState
      },
      { status: 500 }
    );
  }
}
