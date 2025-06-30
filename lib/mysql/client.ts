// lib/mysql/client.ts
import mysql, { Connection, Pool } from 'mysql2/promise';

export type { Connection };
import { mysqlConfig } from './config';

// Create a connection pool
const pool = mysql.createPool({
  ...mysqlConfig,
  waitForConnections: true,
  connectionLimit: 20, // Aumentado para evitar saturação
  queueLimit: 0
});

pool.on('acquire', function (connection) {
  console.log('Connection %d acquired from pool', connection.threadId);
});

pool.on('release', function (connection) {
  console.log('Connection %d released back to pool', connection.threadId);
});

// Function to get a connection from the pool
export async function getDbConnection(): Promise<Connection> {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL connection successfully obtained from pool.");
    return connection;
  } catch (error) {
    console.error('Failed to get MySQL connection from pool:', error);
    if (error instanceof Error) {
        const err = error as any; // Type assertion
        console.error('MySQL error code:', err.code);
        console.error('MySQL error message:', err.message);
    }
    throw new Error('Could not get a database connection from pool.');
  }
}

// General query function using a connection from the pool
export async function query(sql: string, params?: any[]) {
  let connection;
  try {
    connection = await getDbConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
  }
}

// Optional: Graceful shutdown of the pool (e.g., in a global setup file or serverless function end)
// For Next.js, direct process.on('SIGINT') might not be reliable for serverless functions.
// This is more for traditional Node.js servers.
// async function closePool() {
//   console.log('Closing MySQL connection pool...');
//   await pool.end();
//   console.log('MySQL connection pool closed.');
// }
// process.on('SIGINT', closePool);
// process.on('SIGTERM', closePool);
