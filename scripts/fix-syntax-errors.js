#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Função para corrigir problemas comuns de sintaxe
function fixSyntaxErrors(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Problema 1: Imports no lugar errado (dentro da função)
    const importInFunctionRegex = /export\s+(default\s+)?function\s+\w+\([^)]*\)\s*\{[^}]*import\s+/;
    if (importInFunctionRegex.test(content)) {
      console.log(`🔧 Corrigindo imports no lugar errado em: ${filePath}`);
      
      // Extrair imports que estão dentro da função
      const functionMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
      if (functionMatch) {
        const functionName = functionMatch[2];
        const functionStart = content.indexOf(`function ${functionName}`);
        const openBrace = content.indexOf('{', functionStart);
        
        // Encontrar imports dentro da função
        const insideFunction = content.slice(openBrace);
        const importMatches = insideFunction.match(/import\s+[^;]+;/g);
        
        if (importMatches) {
          // Mover imports para o topo
          const imports = importMatches.join('\n');
          const newContent = imports + '\n\n' + content.replace(imports, '').replace(/\n\s*\n\s*\n/g, '\n\n');
          content = newContent;
          modified = true;
        }
      }
    }

    // Problema 2: RequireModule sem fechamento
    const requireModuleOpen = (content.match(/<RequireModule/g) || []).length;
    const requireModuleClose = (content.match(/<\/RequireModule>/g) || []).length;
    
    if (requireModuleOpen > requireModuleClose) {
      console.log(`🔧 Corrigindo RequireModule sem fechamento em: ${filePath}`);
      
      // Adicionar fechamento no final do último return
      const lastReturnIndex = content.lastIndexOf('return (');
      if (lastReturnIndex !== -1) {
        const lastDivIndex = content.lastIndexOf('</div>');
        if (lastDivIndex !== -1 && lastDivIndex > lastReturnIndex) {
          content = content.slice(0, lastDivIndex) + 
            '</div>\n    </RequireModule>' + 
            content.slice(lastDivIndex + 6);
          modified = true;
        }
      }
    }

    // Problema 3: Múltiplos returns sem RequireModule
    const returnMatches = content.match(/return\s*\(/g);
    if (returnMatches && returnMatches.length > 1) {
      const requireModuleMatches = content.match(/<RequireModule/g);
      if (!requireModuleMatches || requireModuleMatches.length < returnMatches.length) {
        console.log(`🔧 Corrigindo múltiplos returns sem RequireModule em: ${filePath}`);
        
        // Adicionar RequireModule nos returns que não têm
        const returns = content.split('return (');
        for (let i = 1; i < returns.length; i++) {
          const returnContent = returns[i];
          if (!returnContent.includes('<RequireModule')) {
            const divMatch = returnContent.match(/<div/);
            if (divMatch) {
              const divIndex = returnContent.indexOf('<div');
              returns[i] = returnContent.slice(0, divIndex) + 
                '<RequireModule moduleName="module_name" action="read">\n      ' + 
                returnContent.slice(divIndex);
            }
          }
        }
        content = returns.join('return (');
        modified = true;
      }
    }

    // Problema 4: usePermissions sem import
    if (content.includes('usePermissions') && !content.includes('import { usePermissions }')) {
      console.log(`🔧 Adicionando import usePermissions em: ${filePath}`);
      
      // Adicionar import no topo
      const firstImport = content.match(/import\s+[^;]+;/);
      if (firstImport) {
        const importIndex = content.indexOf(firstImport[0]);
        const insertIndex = content.indexOf('\n', importIndex) + 1;
        content = content.slice(0, insertIndex) + 
          "import { usePermissions } from '@/hooks/usePermissions';\n" + 
          content.slice(insertIndex);
        modified = true;
      }
    }

    // Salvar se houve modificações
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    } else {
      console.log(`✅ Sem problemas: ${filePath}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

// Lista de arquivos para verificar
const filesToCheck = [
  'src/pages/cadastros/UserCompanies.tsx',
  'src/pages/portal-colaborador/TestPortal.tsx',
  'src/pages/almoxarifado/EntradasMateriaisPage.tsx',
  'src/pages/almoxarifado/HistoricoMovimentacoesPage.tsx'
];

// Função principal
function main() {
  console.log('🔧 Verificando e corrigindo erros de sintaxe...\n');
  
  let totalProcessed = 0;
  let totalFixed = 0;
  
  filesToCheck.forEach(filePath => {
    totalProcessed++;
    if (fixSyntaxErrors(filePath)) {
      totalFixed++;
    }
  });
  
  console.log('\n📊 Resumo:');
  console.log(`   Total de arquivos processados: ${totalProcessed}`);
  console.log(`   Arquivos corrigidos: ${totalFixed}`);
  console.log(`   Taxa de sucesso: ${((totalFixed / totalProcessed) * 100).toFixed(1)}%`);
}

// Executar
main();

export { fixSyntaxErrors };
