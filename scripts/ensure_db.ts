import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function ensureDb() {
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Try to connect to the default 'postgres' database first to create our target db
  const dbName = 'trade_automator';
  const baseUrl = connectionString.replace(/\/[^/]+$/, '/postgres');
  
  const client = new pg.Client({
    connectionString: baseUrl,
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Database ${dbName} does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error('Error ensuring database exists:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

ensureDb();
