import fs from 'node:fs/promises';
import { Client } from 'pg';

async function main() {
  const [, , filePath, connectionStringArg] = process.argv;
  const connectionString = connectionStringArg || process.env.DATABASE_URL;
  if (!filePath || !connectionString) {
    console.error('Usage: node scripts/execute-sql.mjs <file.sql> [postgresql://...]');
    console.error('  or set DATABASE_URL environment variable');
    process.exit(1);
  }

  const sql = await fs.readFile(filePath, 'utf8');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL executed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error executing SQL:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


