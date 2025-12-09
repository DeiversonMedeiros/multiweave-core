import { Client } from 'pg';

async function main() {
  const [, , connectionStringArg, ...queries] = process.argv;
  if (!connectionStringArg || queries.length === 0) {
    console.error('Usage: node scripts/query-sql.mjs <postgresql://...> "SELECT ..." "SELECT ..."');
    process.exit(1);
  }

  const connectionString = connectionStringArg;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n=== Query ${i + 1} ===`);
      console.log(query);
      console.log('--- Results ---');
      
      const result = await client.query(query);
      
      if (result.rows.length === 0) {
        console.log('(no rows)');
      } else {
        console.table(result.rows);
      }
    }
  } catch (err) {
    console.error('Error executing query:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

