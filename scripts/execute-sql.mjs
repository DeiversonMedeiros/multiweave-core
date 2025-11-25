import fs from 'node:fs/promises';
import { Client } from 'pg';

async function main() {
  const [, , filePath, connectionStringArg] = process.argv;
  if (!filePath || !connectionStringArg) {
    console.error('Usage: node scripts/execute-sql.mjs <file.sql> <postgresql://...>');
    process.exit(1);
  }

  // Handle special chars in password already URL-encoded in the provided string
  const connectionString = connectionStringArg;

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


