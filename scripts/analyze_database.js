import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: 'db.wmtftyaqucwfsnnjepiy.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '81hbcoNDXaGiPIpp!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function analyzeDatabase() {
  const analysis = {
    timestamp: new Date().toISOString(),
    schemas: {},
    tables: [],
    functions: [],
    triggers: [],
    policies: [],
    indexes: [],
    views: [],
    enums: [],
    statistics: {}
  };

  try {
    // 1. Listar todos os schemas
    console.log('📊 Analisando schemas...');
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY schema_name;
    `);
    analysis.schemas = schemasResult.rows.map(r => r.schema_name);
    console.log(`✅ Encontrados ${analysis.schemas.length} schemas:`, analysis.schemas);

    // 2. Listar todas as tabelas com informações detalhadas
    console.log('📋 Analisando tabelas...');
    const tablesResult = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_schema = tables.table_schema AND columns.table_name = tables.table_name) as column_count
      FROM information_schema.tables 
      WHERE table_schema IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `);
    analysis.tables = tablesResult.rows;
    console.log(`✅ Encontradas ${analysis.tables.length} tabelas`);

    // 3. Estatísticas por schema
    for (const schema of analysis.schemas) {
      const schemaTables = analysis.tables.filter(t => t.table_schema === schema);
      analysis.statistics[schema] = {
        table_count: schemaTables.length,
        total_columns: schemaTables.reduce((sum, t) => sum + parseInt(t.column_count), 0)
      };
    }

    // 4. Listar todas as funções
    console.log('⚙️ Analisando funções...');
    const functionsResult = await pool.query(`
      SELECT 
        n.nspname as schema_name,
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_function_result(p.oid) as return_type,
        l.lanname as language
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY n.nspname, p.proname;
    `);
    analysis.functions = functionsResult.rows;
    console.log(`✅ Encontradas ${analysis.functions.length} funções`);

    // 5. Listar todos os triggers
    console.log('🔔 Analisando triggers...');
    const triggersResult = await pool.query(`
      SELECT 
        trigger_schema,
        trigger_name,
        event_object_table,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
      ORDER BY trigger_schema, event_object_table, trigger_name;
    `);
    analysis.triggers = triggersResult.rows;
    console.log(`✅ Encontrados ${analysis.triggers.length} triggers`);

    // 6. Listar todas as políticas RLS
    console.log('🔒 Analisando políticas RLS...');
    const policiesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
      ORDER BY schemaname, tablename, policyname;
    `);
    analysis.policies = policiesResult.rows;
    console.log(`✅ Encontradas ${analysis.policies.length} políticas RLS`);

    // 7. Listar todos os índices
    console.log('📇 Analisando índices...');
    const indexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
      ORDER BY schemaname, tablename, indexname;
    `);
    analysis.indexes = indexesResult.rows;
    console.log(`✅ Encontrados ${analysis.indexes.length} índices`);

    // 8. Listar todas as views
    console.log('👁️ Analisando views...');
    const viewsResult = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
      ORDER BY table_schema, table_name;
    `);
    analysis.views = viewsResult.rows;
    console.log(`✅ Encontradas ${analysis.views.length} views`);

    // 9. Listar todos os enums
    console.log('🏷️ Analisando enums...');
    const enumsResult = await pool.query(`
      SELECT 
        n.nspname as schema_name,
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN (${analysis.schemas.map(s => `'${s}'`).join(',')})
      GROUP BY n.nspname, t.typname
      ORDER BY n.nspname, t.typname;
    `);
    analysis.enums = enumsResult.rows;
    console.log(`✅ Encontrados ${analysis.enums.length} enums`);

    // 10. Contar registros por tabela (apenas algumas principais para não sobrecarregar)
    console.log('📊 Contando registros nas principais tabelas...');
    const mainTables = analysis.tables
      .filter(t => ['public', 'rh'].includes(t.table_schema))
      .slice(0, 50); // Limitar a 50 tabelas
    
    for (const table of mainTables) {
      try {
        const countResult = await pool.query(`
          SELECT COUNT(*) as count 
          FROM ${table.table_schema}.${table.table_name};
        `);
        table.row_count = parseInt(countResult.rows[0].count);
      } catch (err) {
        table.row_count = 'N/A';
        table.error = err.message;
      }
    }

    // Salvar análise
    const outputPath = path.join(__dirname, '..', 'ANALISE_BANCO_DADOS_COMPLETA.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n✅ Análise completa salva em: ${outputPath}`);

    // Gerar relatório resumido
    generateSummaryReport(analysis);

  } catch (error) {
    console.error('❌ Erro na análise:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

function generateSummaryReport(analysis) {
  const report = [];
  report.push('='.repeat(80));
  report.push('ANÁLISE COMPLETA DO BANCO DE DADOS');
  report.push('='.repeat(80));
  report.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
  report.push('');

  report.push('📦 SCHEMAS:');
  report.push('-'.repeat(80));
  analysis.schemas.forEach(schema => {
    const stats = analysis.statistics[schema] || {};
    report.push(`  • ${schema}: ${stats.table_count || 0} tabelas, ${stats.total_columns || 0} colunas`);
  });
  report.push('');

  report.push('📋 RESUMO DE TABELAS POR SCHEMA:');
  report.push('-'.repeat(80));
  const tablesBySchema = {};
  analysis.tables.forEach(table => {
    if (!tablesBySchema[table.table_schema]) {
      tablesBySchema[table.table_schema] = [];
    }
    tablesBySchema[table.table_schema].push(table);
  });

  Object.keys(tablesBySchema).sort().forEach(schema => {
    report.push(`\n  ${schema.toUpperCase()} (${tablesBySchema[schema].length} tabelas):`);
    tablesBySchema[schema].forEach(table => {
      const rowCount = table.row_count ? ` - ${table.row_count} registros` : '';
      report.push(`    • ${table.table_name} (${table.column_count} colunas)${rowCount}`);
    });
  });
  report.push('');

  report.push('⚙️ FUNÇÕES:');
  report.push('-'.repeat(80));
  const functionsBySchema = {};
  analysis.functions.forEach(func => {
    if (!functionsBySchema[func.schema_name]) {
      functionsBySchema[func.schema_name] = [];
    }
    functionsBySchema[func.schema_name].push(func);
  });

  Object.keys(functionsBySchema).sort().forEach(schema => {
    report.push(`\n  ${schema.toUpperCase()} (${functionsBySchema[schema].length} funções):`);
    functionsBySchema[schema].forEach(func => {
      report.push(`    • ${func.function_name}(${func.arguments}) -> ${func.return_type} [${func.language}]`);
    });
  });
  report.push('');

  report.push('🔔 TRIGGERS:');
  report.push('-'.repeat(80));
  const triggersByTable = {};
  analysis.triggers.forEach(trigger => {
    const key = `${trigger.trigger_schema}.${trigger.event_object_table}`;
    if (!triggersByTable[key]) {
      triggersByTable[key] = [];
    }
    triggersByTable[key].push(trigger);
  });

  Object.keys(triggersByTable).sort().forEach(key => {
    report.push(`\n  ${key}:`);
    triggersByTable[key].forEach(trigger => {
      report.push(`    • ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
    });
  });
  report.push('');

  report.push('🔒 POLÍTICAS RLS:');
  report.push('-'.repeat(80));
  const policiesByTable = {};
  analysis.policies.forEach(policy => {
    const key = `${policy.schemaname}.${policy.tablename}`;
    if (!policiesByTable[key]) {
      policiesByTable[key] = [];
    }
    policiesByTable[key].push(policy);
  });

  Object.keys(policiesByTable).sort().forEach(key => {
    report.push(`\n  ${key}:`);
    policiesByTable[key].forEach(policy => {
      report.push(`    • ${policy.policyname} (${policy.cmd})`);
    });
  });
  report.push('');

  report.push('📇 ÍNDICES:');
  report.push('-'.repeat(80));
  report.push(`Total: ${analysis.indexes.length} índices`);
  const indexesByTable = {};
  analysis.indexes.forEach(index => {
    const key = `${index.schemaname}.${index.tablename}`;
    if (!indexesByTable[key]) {
      indexesByTable[key] = 0;
    }
    indexesByTable[key]++;
  });

  Object.keys(indexesByTable).sort().forEach(key => {
    report.push(`  ${key}: ${indexesByTable[key]} índices`);
  });
  report.push('');

  report.push('👁️ VIEWS:');
  report.push('-'.repeat(80));
  report.push(`Total: ${analysis.views.length} views`);
  analysis.views.forEach(view => {
    report.push(`  • ${view.table_schema}.${view.table_name}`);
  });
  report.push('');

  report.push('🏷️ ENUMS:');
  report.push('-'.repeat(80));
  analysis.enums.forEach(enumType => {
    const values = Array.isArray(enumType.enum_values) 
      ? enumType.enum_values.join(', ') 
      : String(enumType.enum_values);
    report.push(`  • ${enumType.schema_name}.${enumType.enum_name}: [${values}]`);
  });
  report.push('');

  report.push('='.repeat(80));
  report.push('ESTATÍSTICAS GERAIS:');
  report.push('-'.repeat(80));
  report.push(`  • Total de Schemas: ${analysis.schemas.length}`);
  report.push(`  • Total de Tabelas: ${analysis.tables.length}`);
  report.push(`  • Total de Funções: ${analysis.functions.length}`);
  report.push(`  • Total de Triggers: ${analysis.triggers.length}`);
  report.push(`  • Total de Políticas RLS: ${analysis.policies.length}`);
  report.push(`  • Total de Índices: ${analysis.indexes.length}`);
  report.push(`  • Total de Views: ${analysis.views.length}`);
  report.push(`  • Total de Enums: ${analysis.enums.length}`);
  report.push('='.repeat(80));

  const reportPath = path.join(__dirname, '..', 'ANALISE_BANCO_DADOS_RELATORIO.txt');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`\n✅ Relatório resumido salvo em: ${reportPath}`);
}

// Executar análise
analyzeDatabase().catch(console.error);
