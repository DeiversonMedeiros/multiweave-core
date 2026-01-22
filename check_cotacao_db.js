import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.wmtftyaqucwfsnnjepiy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '81hbcoNDXaGiPIpp!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkCotacao() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Buscar o ciclo de cotação
    const cicloQuery = `
      SELECT 
        id,
        numero_cotacao,
        status,
        valor_frete,
        desconto_percentual,
        desconto_valor,
        created_at,
        updated_at
      FROM compras.cotacao_ciclos
      WHERE numero_cotacao = 'COT-000047';
    `;
    
    const cicloResult = await client.query(cicloQuery);
    console.log('📋 Dados do Ciclo de Cotação:');
    console.log(JSON.stringify(cicloResult.rows, null, 2));
    console.log('\n');

    if (cicloResult.rows.length === 0) {
      console.log('❌ Cotação COT-000047 não encontrada!');
      await client.end();
      return;
    }

    const cicloId = cicloResult.rows[0].id;

    // Buscar fornecedores
    const fornecedoresQuery = `
      SELECT 
        cf.id,
        cf.cotacao_id,
        cf.fornecedor_id,
        fd.nome_fantasia,
        fd.razao_social,
        cf.valor_frete,
        cf.valor_imposto,
        cf.desconto_percentual,
        cf.desconto_valor,
        cf.status,
        cf.preco_total,
        cf.created_at,
        cf.updated_at
      FROM compras.cotacao_fornecedores cf
      LEFT JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
      WHERE cf.cotacao_id = $1
      ORDER BY cf.created_at;
    `;

    const fornecedoresResult = await client.query(fornecedoresQuery, [cicloId]);
    console.log('📦 Dados dos Fornecedores:');
    console.log(JSON.stringify(fornecedoresResult.rows, null, 2));
    console.log('\n');

    // Verificar itens dos fornecedores
    if (fornecedoresResult.rows.length > 0) {
      const fornecedorIds = fornecedoresResult.rows.map(f => f.id);
      
      const itensQuery = `
        SELECT 
          cif.id,
          cif.cotacao_fornecedor_id,
          cif.valor_frete,
          cif.desconto_percentual,
          cif.desconto_valor,
          cif.valor_total_calculado,
          cif.is_vencedor,
          cif.status
        FROM compras.cotacao_item_fornecedor cif
        WHERE cif.cotacao_fornecedor_id = ANY($1::uuid[])
        ORDER BY cif.cotacao_fornecedor_id;
      `;

      const itensResult = await client.query(itensQuery, [fornecedorIds]);
      console.log('📝 Dados dos Itens dos Fornecedores:');
      console.log(JSON.stringify(itensResult.rows, null, 2));
    }

    await client.end();
    console.log('\n✅ Consulta concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

checkCotacao();
