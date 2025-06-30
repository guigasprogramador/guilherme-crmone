// lib/mysql/config.ts
export const mysqlConfig = {
  host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'host.docker.internal' : '127.0.0.1'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456789',
  database: process.env.DB_NAME || 'crmone-teste',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Example for creating a connection string if needed by some libraries
export const getMysqlConnectionString = (): string => {
  const { host, user, password, database, port } = mysqlConfig;
  // Ensure password is uri encoded if it contains special characters
  const encodedPassword = encodeURIComponent(password);
  return `mysql://${user}:${encodedPassword}@${host}:${port}/${database}`;
};
