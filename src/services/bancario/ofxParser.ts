// =====================================================
// SERVIÇO: PARSER OFX (OPEN FINANCIAL EXCHANGE)
// =====================================================
// Data: 2025-12-12
// Descrição: Parser para arquivos OFX de extratos bancários
// Autor: Sistema MultiWeave Core
// Módulo: M4 - Conciliação Bancária

export interface OFXTransaction {
  fitid: string; // Financial Institution Transaction ID
  dtposted: string; // Data da transação (YYYYMMDD)
  dtuser?: string; // Data do usuário
  trntype: 'CREDIT' | 'DEBIT' | 'INT' | 'DIV' | 'FEE' | 'SRVCHG' | 'DEP' | 'ATM' | 'POS' | 'XFER' | 'CHECK' | 'PAYMENT' | 'CASH' | 'DIRECTDEP' | 'DIRECTDEB' | 'REPEATPMT' | 'OTHER';
  trnamt: number; // Valor da transação (positivo para crédito, negativo para débito)
  name: string; // Descrição/histórico
  memo?: string; // Memo adicional
  checknum?: string; // Número do cheque
  refnum?: string; // Número de referência
}

export interface OFXAccount {
  bankid?: string;
  acctid: string;
  accttype: 'CHECKING' | 'SAVINGS' | 'MONEYMRKT' | 'CREDITLINE';
}

export interface OFXStatement {
  currency: string;
  account: OFXAccount;
  ledgerbal?: {
    balamt: number;
    dtasof: string;
  };
  availbal?: {
    balamt: number;
    dtasof: string;
  };
  transactions: OFXTransaction[];
}

export interface ParsedOFX {
  statements: OFXStatement[];
  org?: string; // Organização (banco)
  fid?: string; // Financial Institution ID
}

/**
 * Parse OFX file content
 */
export function parseOFX(content: string): ParsedOFX {
  const result: ParsedOFX = {
    statements: [],
  };

  try {
    // OFX files can be in SGML or XML format
    // Try XML first (more common in modern OFX)
    if (content.trim().startsWith('<?xml') || content.includes('<OFX>')) {
      return parseOFXXML(content);
    } else {
      // SGML format (older format)
      return parseOFXSGML(content);
    }
  } catch (error) {
    console.error('Erro ao fazer parse do OFX:', error);
    throw new Error(`Erro ao processar arquivo OFX: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Parse OFX in XML format
 */
function parseOFXXML(content: string): ParsedOFX {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(content, 'text/xml');

  // Verificar erros de parsing
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Arquivo OFX XML inválido ou corrompido');
  }

  const ofx = xmlDoc.querySelector('OFX');
  if (!ofx) {
    throw new Error('Arquivo OFX não contém elemento OFX raiz');
  }

  const result: ParsedOFX = {
    statements: [],
  };

  // Extrair informações do banco
  const signonmsgsrsv1 = ofx.querySelector('SIGNONMSGSRSV1');
  if (signonmsgsrsv1) {
    const sonrs = signonmsgsrsv1.querySelector('SONRS');
    if (sonrs) {
      const fi = sonrs.querySelector('FI');
      if (fi) {
        result.org = fi.querySelector('ORG')?.textContent || undefined;
        result.fid = fi.querySelector('FID')?.textContent || undefined;
      }
    }
  }

  // Processar statements bancários
  const bankmsgsrsv1 = ofx.querySelector('BANKMSGSRSV1');
  if (bankmsgsrsv1) {
    const stmttrnrs = bankmsgsrsv1.querySelectorAll('STMTTRNRS');
    
    stmttrnrs.forEach((stmttrnr) => {
      const stmt = stmttrnr.querySelector('STMTRS');
      if (!stmt) return;

      const curdef = stmt.querySelector('CURDEF')?.textContent || 'BRL';
      const bankacctfrom = stmt.querySelector('BANKACCTFROM');
      const banktranlist = stmt.querySelector('BANKTRANLIST');

      if (!bankacctfrom || !banktranlist) return;

      const account: OFXAccount = {
        bankid: bankacctfrom.querySelector('BANKID')?.textContent || undefined,
        acctid: bankacctfrom.querySelector('ACCTID')?.textContent || '',
        accttype: (bankacctfrom.querySelector('ACCTTYPE')?.textContent || 'CHECKING') as OFXAccount['accttype'],
      };

      const statement: OFXStatement = {
        currency: curdef,
        account,
        transactions: [],
      };

      // Saldo do ledger
      const ledgerbal = stmt.querySelector('LEDGERBAL');
      if (ledgerbal) {
        const balamt = parseFloat(ledgerbal.querySelector('BALAMT')?.textContent || '0');
        const dtasof = ledgerbal.querySelector('DTASOF')?.textContent || '';
        statement.ledgerbal = {
          balamt,
          dtasof: formatOFXDate(dtasof),
        };
      }

      // Saldo disponível
      const availbal = stmt.querySelector('AVAILBAL');
      if (availbal) {
        const balamt = parseFloat(availbal.querySelector('BALAMT')?.textContent || '0');
        const dtasof = availbal.querySelector('DTASOF')?.textContent || '';
        statement.availbal = {
          balamt,
          dtasof: formatOFXDate(dtasof),
        };
      }

      // Transações
      const stmttrns = banktranlist.querySelectorAll('STMTTRN');
      stmttrns.forEach((stmttrn) => {
        const fitid = stmttrn.querySelector('FITID')?.textContent || '';
        const dtposted = stmttrn.querySelector('DTPOSTED')?.textContent || '';
        const dtuser = stmttrn.querySelector('DTUSER')?.textContent;
        const trntype = (stmttrn.querySelector('TRNTYPE')?.textContent || 'OTHER') as OFXTransaction['trntype'];
        const trnamt = parseFloat(stmttrn.querySelector('TRNAMT')?.textContent || '0');
        const name = stmttrn.querySelector('NAME')?.textContent || '';
        const memo = stmttrn.querySelector('MEMO')?.textContent;
        const checknum = stmttrn.querySelector('CHECKNUM')?.textContent;
        const refnum = stmttrn.querySelector('REFNUM')?.textContent;

        statement.transactions.push({
          fitid,
          dtposted: formatOFXDate(dtposted),
          dtuser: dtuser ? formatOFXDate(dtuser) : undefined,
          trntype,
          trnamt,
          name,
          memo,
          checknum,
          refnum,
        });
      });

      result.statements.push(statement);
    });
  }

  return result;
}

/**
 * Parse OFX in SGML format (legacy)
 */
function parseOFXSGML(content: string): ParsedOFX {
  const result: ParsedOFX = {
    statements: [],
  };

  // SGML parsing é mais complexo - implementação simplificada
  // Em produção, usar uma biblioteca especializada seria melhor
  
  const lines = content.split('\n');
  let currentStatement: OFXStatement | null = null;
  let currentTransaction: Partial<OFXTransaction> | null = null;
  let inTransaction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('<OFX>')) {
      // Início do arquivo
      continue;
    }

    if (line.startsWith('<BANKID>')) {
      if (!currentStatement) {
        currentStatement = {
          currency: 'BRL',
          account: { acctid: '', accttype: 'CHECKING' },
          transactions: [],
        };
      }
      currentStatement.account.bankid = extractTagValue(line, 'BANKID');
    }

    if (line.startsWith('<ACCTID>')) {
      if (!currentStatement) {
        currentStatement = {
          currency: 'BRL',
          account: { acctid: '', accttype: 'CHECKING' },
          transactions: [],
        };
      }
      currentStatement.account.acctid = extractTagValue(line, 'ACCTID');
    }

    if (line.startsWith('<STMTTRN>')) {
      inTransaction = true;
      currentTransaction = {};
    }

    if (inTransaction) {
      if (line.startsWith('<FITID>')) {
        currentTransaction!.fitid = extractTagValue(line, 'FITID');
      } else if (line.startsWith('<DTPOSTED>')) {
        currentTransaction!.dtposted = formatOFXDate(extractTagValue(line, 'DTPOSTED'));
      } else if (line.startsWith('<TRNTYPE>')) {
        currentTransaction!.trntype = extractTagValue(line, 'TRNTYPE') as OFXTransaction['trntype'];
      } else if (line.startsWith('<TRNAMT>')) {
        currentTransaction!.trnamt = parseFloat(extractTagValue(line, 'TRNAMT'));
      } else if (line.startsWith('<NAME>')) {
        currentTransaction!.name = extractTagValue(line, 'NAME');
      } else if (line.startsWith('<MEMO>')) {
        currentTransaction!.memo = extractTagValue(line, 'MEMO');
      } else if (line.startsWith('</STMTTRN>')) {
        if (currentTransaction && currentStatement) {
          currentStatement.transactions.push(currentTransaction as OFXTransaction);
        }
        inTransaction = false;
        currentTransaction = null;
      }
    }

    if (line.startsWith('</OFX>') && currentStatement) {
      result.statements.push(currentStatement);
      currentStatement = null;
    }
  }

  return result;
}

/**
 * Extract value from SGML tag
 */
function extractTagValue(line: string, tagName: string): string {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;
  const startIdx = line.indexOf(startTag);
  const endIdx = line.indexOf(endTag);
  
  if (startIdx === -1 || endIdx === -1) return '';
  
  return line.substring(startIdx + startTag.length, endIdx).trim();
}

/**
 * Format OFX date (YYYYMMDD or YYYYMMDDHHMMSS) to ISO string
 */
function formatOFXDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return '';
  
  // OFX dates can be YYYYMMDD or YYYYMMDDHHMMSS[.XXX][:GMT]
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  let hour = '00';
  let minute = '00';
  let second = '00';
  
  if (dateStr.length >= 14) {
    hour = dateStr.substring(8, 10);
    minute = dateStr.substring(10, 12);
    second = dateStr.substring(12, 14);
  }
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Convert OFX transactions to MovimentacaoBancaria format
 */
export function convertOFXToMovimentacoes(
  ofxData: ParsedOFX,
  contaBancariaId: string,
  companyId: string
): Array<Omit<import('@/integrations/supabase/financial-types').MovimentacaoBancaria, 'id' | 'created_at' | 'updated_at'>> {
  const movimentacoes: any[] = [];

  ofxData.statements.forEach((statement) => {
    statement.transactions.forEach((transaction) => {
      const tipoMovimento = transaction.trnamt >= 0 ? 'credito' : 'debito';
      const valor = Math.abs(transaction.trnamt);

      movimentacoes.push({
        company_id: companyId,
        conta_bancaria_id: contaBancariaId,
        data_movimento: transaction.dtposted,
        data_liquidacao: transaction.dtuser || transaction.dtposted,
        historico: transaction.name,
        documento: transaction.checknum || transaction.refnum || transaction.fitid,
        complemento: transaction.memo,
        valor,
        tipo_movimento: tipoMovimento,
        origem_importacao: 'arquivo_ofx',
        status_conciliacao: 'pendente',
        observacoes: `Importado de OFX - Tipo: ${transaction.trntype}`,
      });
    });
  });

  return movimentacoes;
}

