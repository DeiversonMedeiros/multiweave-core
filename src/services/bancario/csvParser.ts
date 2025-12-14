// =====================================================
// SERVIÇO: PARSER CSV PARA EXTRATOS BANCÁRIOS
// =====================================================
// Data: 2025-12-12
// Descrição: Parser para arquivos CSV de extratos bancários
// Autor: Sistema MultiWeave Core
// Módulo: M4 - Conciliação Bancária

export interface CSVTransaction {
  data: string; // Data da transação
  historico: string; // Descrição/histórico
  documento?: string; // Número do documento
  valor: number; // Valor (positivo para crédito, negativo para débito)
  tipo?: string; // Tipo de transação
  saldo?: number; // Saldo após a transação
}

export interface CSVParseOptions {
  delimiter?: string; // Delimitador (padrão: ';' ou ',')
  encoding?: string; // Encoding (padrão: 'utf-8')
  skipLines?: number; // Linhas a pular no início
  dateFormat?: string; // Formato da data (padrão: 'DD/MM/YYYY')
  hasHeader?: boolean; // Se tem cabeçalho
  columnMapping?: {
    data?: number | string; // Índice ou nome da coluna
    historico?: number | string;
    documento?: number | string;
    valor?: number | string;
    tipo?: number | string;
    saldo?: number | string;
  };
}

/**
 * Parse CSV file content
 */
export function parseCSV(
  content: string,
  options: CSVParseOptions = {}
): CSVTransaction[] {
  const {
    delimiter,
    encoding = 'utf-8',
    skipLines = 0,
    dateFormat = 'DD/MM/YYYY',
    hasHeader = true,
    columnMapping,
  } = options;

  // Detectar delimitador se não fornecido
  const detectedDelimiter = delimiter || detectDelimiter(content);
  
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const transactions: CSVTransaction[] = [];

  // Pular linhas iniciais
  let startIndex = skipLines;
  if (hasHeader && !columnMapping) {
    startIndex += 1; // Pular cabeçalho se não houver mapeamento manual
  }

  // Se houver mapeamento manual, usar nomes das colunas
  let headerMap: Record<string, number> | null = null;
  if (hasHeader && columnMapping && typeof columnMapping.data === 'string') {
    const headerLine = lines[skipLines];
    const headerColumns = parseCSVLine(headerLine, detectedDelimiter);
    headerMap = {};
    headerColumns.forEach((col, index) => {
      headerMap![col.trim().toLowerCase()] = index;
    });
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line, detectedDelimiter);
    if (columns.length === 0) continue;

    try {
      const transaction = parseCSVLineToTransaction(
        columns,
        columnMapping,
        headerMap,
        dateFormat
      );

      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.warn(`Erro ao processar linha ${i + 1}:`, error);
      // Continuar processando outras linhas
    }
  }

  return transactions;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      columns.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last column
  columns.push(current.trim());

  return columns;
}

/**
 * Parse CSV line to transaction object
 */
function parseCSVLineToTransaction(
  columns: string[],
  columnMapping?: CSVParseOptions['columnMapping'],
  headerMap?: Record<string, number> | null,
  dateFormat: string = 'DD/MM/YYYY'
): CSVTransaction | null {
  const getColumnIndex = (key: keyof CSVParseOptions['columnMapping']): number | null => {
    if (!columnMapping || !columnMapping[key]) return null;
    
    const mapping = columnMapping[key];
    if (typeof mapping === 'number') {
      return mapping;
    } else if (typeof mapping === 'string' && headerMap) {
      return headerMap[mapping.toLowerCase()] ?? null;
    }
    return null;
  };

  // Mapeamento padrão se não fornecido
  const dataIndex = getColumnIndex('data') ?? 0;
  const historicoIndex = getColumnIndex('historico') ?? 1;
  const documentoIndex = getColumnIndex('documento');
  const valorIndex = getColumnIndex('valor') ?? 2;
  const tipoIndex = getColumnIndex('tipo');
  const saldoIndex = getColumnIndex('saldo');

  if (dataIndex === null || historicoIndex === null || valorIndex === null) {
    return null;
  }

  const dataStr = columns[dataIndex]?.trim();
  const historico = columns[historicoIndex]?.trim() || '';
  const documento = documentoIndex !== null ? columns[documentoIndex]?.trim() : undefined;
  const valorStr = columns[valorIndex]?.trim();
  const tipo = tipoIndex !== null ? columns[tipoIndex]?.trim() : undefined;
  const saldoStr = saldoIndex !== null ? columns[saldoIndex]?.trim() : undefined;

  if (!dataStr || !valorStr) {
    return null;
  }

  // Parse date
  const data = parseDate(dataStr, dateFormat);
  if (!data) {
    throw new Error(`Data inválida: ${dataStr}`);
  }

  // Parse valor (remover formatação brasileira)
  const valor = parseValor(valorStr);
  if (valor === null) {
    throw new Error(`Valor inválido: ${valorStr}`);
  }

  // Parse saldo se disponível
  const saldo = saldoStr ? parseValor(saldoStr) : undefined;

  return {
    data,
    historico,
    documento,
    valor,
    tipo,
    saldo,
  };
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string, format: string): string | null {
  // Remover espaços
  dateStr = dateStr.trim();

  // Tentar diferentes formatos comuns
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      let year: string, month: string, day: string;

      if (regex === formats[1]) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else {
        // DD/MM/YYYY ou similar
        [, day, month, year] = match;
      }

      // Validar
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
      }
    }
  }

  return null;
}

/**
 * Parse valor string (remover formatação brasileira)
 */
function parseValor(valorStr: string): number | null {
  // Remover espaços e caracteres não numéricos exceto . e ,
  let cleaned = valorStr.trim().replace(/[^\d.,-]/g, '');

  // Detectar se usa . ou , como separador decimal
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Se tem ambos, o último é o separador decimal
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Comma é decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot é decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas comma - pode ser decimal ou milhar
    if (cleaned.split(',').length === 2 && cleaned.split(',')[1].length <= 2) {
      // Provavelmente decimal
      cleaned = cleaned.replace(',', '.');
    } else {
      // Provavelmente milhar
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const valor = parseFloat(cleaned);
  return isNaN(valor) ? null : valor;
}

/**
 * Detect CSV delimiter
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0];
  const delimiters = [';', ',', '\t', '|'];
  
  let maxCount = 0;
  let detectedDelimiter = ';'; // Padrão brasileiro

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delimiter;
    }
  }

  return detectedDelimiter;
}

/**
 * Convert CSV transactions to MovimentacaoBancaria format
 */
export function convertCSVToMovimentacoes(
  csvTransactions: CSVTransaction[],
  contaBancariaId: string,
  companyId: string
): Array<Omit<import('@/integrations/supabase/financial-types').MovimentacaoBancaria, 'id' | 'created_at' | 'updated_at'>> {
  return csvTransactions.map((transaction) => {
    const tipoMovimento = transaction.valor >= 0 ? 'credito' : 'debito';
    const valor = Math.abs(transaction.valor);

    return {
      company_id: companyId,
      conta_bancaria_id: contaBancariaId,
      data_movimento: transaction.data,
      data_liquidacao: transaction.data,
      historico: transaction.historico,
      documento: transaction.documento,
      valor,
      tipo_movimento: tipoMovimento,
      saldo_apos_movimento: transaction.saldo,
      origem_importacao: 'arquivo_csv',
      status_conciliacao: 'pendente',
      observacoes: transaction.tipo ? `Tipo: ${transaction.tipo}` : undefined,
    };
  });
}

