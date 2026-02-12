import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type TipoChavePix = 'cpf_cnpj' | 'email' | 'telefone' | 'chave_aleatoria';

export interface ParceiroImportRow {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  tipo: ('cliente' | 'fornecedor' | 'transportador')[];
  ativo: boolean;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  site?: string;
  nome_contato?: string;
  cargo_contato?: string;
  observacoes?: string;
  /** Dados bancários */
  banco_codigo?: string;
  banco_nome?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: 'corrente' | 'poupanca';
  pix_tipo?: TipoChavePix;
  pix_valor?: string;
}

export interface ParceirosImportResult {
  success: boolean;
  totalRows: number;
  processed: number;
  created: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

function normalizeHeader(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/ç/g, 'c');
}

function getStr(row: any, key: string, alt?: string): string {
  const v = row[key] ?? row[alt] ?? '';
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
}

/**
 * Normaliza CNPJ (apenas dígitos)
 */
function normalizeCNPJ(val: string): string {
  return (val || '').replace(/\D/g, '');
}

/**
 * Parse tipo: aceita "cliente", "cliente,fornecedor", "cliente;fornecedor" etc.
 */
function parseTipo(val: string): ('cliente' | 'fornecedor' | 'transportador')[] {
  if (!val || typeof val !== 'string') return ['cliente'];
  const parts = val.split(/[,;]/).map((s) => s.trim().toLowerCase());
  const allowed = new Set(['cliente', 'fornecedor', 'transportador']);
  const out: ('cliente' | 'fornecedor' | 'transportador')[] = [];
  for (const p of parts) {
    if (allowed.has(p)) out.push(p as 'cliente' | 'fornecedor' | 'transportador');
  }
  return out.length > 0 ? out : ['cliente'];
}

function parseAtivo(val: string): boolean {
  if (val === '' || val == null) return true;
  const lower = String(val).trim().toLowerCase();
  if (lower === 'não' || lower === 'nao' || lower === 'false' || lower === '0' || lower === 'n') return false;
  return true;
}

const TIPOS_PIX_ALLOWED = new Set<TipoChavePix>(['cpf_cnpj', 'email', 'telefone', 'chave_aleatoria']);

function parsePixTipo(val: string): TipoChavePix | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const normalized = val.trim().toLowerCase().replace(/\s+/g, '_');
  if (TIPOS_PIX_ALLOWED.has(normalized as TipoChavePix)) return normalized as TipoChavePix;
  return undefined;
}

function parseTipoConta(val: string): 'corrente' | 'poupanca' | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const lower = val.trim().toLowerCase();
  if (lower === 'corrente' || lower === 'poupanca') return lower;
  return undefined;
}

function parseRowToParceiro(row: any): ParceiroImportRow | null {
  const razao = getStr(row, 'razao_social', 'razao_social');
  const cnpj = normalizeCNPJ(getStr(row, 'cnpj', 'cnpj'));
  if (!razao) return null;
  if (cnpj.length !== 14) return null;

  const tipo = parseTipo(getStr(row, 'tipo', 'tipos'));
  const ativo = parseAtivo(getStr(row, 'ativo', 'active'));

  const bancoCodigo = getStr(row, 'banco_codigo', 'banco');
  const agencia = getStr(row, 'agencia') || undefined;
  const conta = getStr(row, 'conta') || undefined;
  const tipoConta = parseTipoConta(getStr(row, 'tipo_conta', 'tipo_conta'));
  const pixTipo = parsePixTipo(getStr(row, 'pix_tipo', 'pix_tipo'));
  const pixValor = getStr(row, 'pix_valor', 'pix_valor');

  return {
    razao_social: razao,
    nome_fantasia: getStr(row, 'nome_fantasia', 'nome_fantasia') || undefined,
    cnpj,
    inscricao_estadual: getStr(row, 'inscricao_estadual', 'ie') || undefined,
    inscricao_municipal: getStr(row, 'inscricao_municipal', 'im') || undefined,
    tipo,
    ativo,
    cep: getStr(row, 'cep') || undefined,
    logradouro: getStr(row, 'logradouro') || undefined,
    numero: getStr(row, 'numero') || undefined,
    complemento: getStr(row, 'complemento') || undefined,
    bairro: getStr(row, 'bairro') || undefined,
    cidade: getStr(row, 'cidade') || undefined,
    estado: getStr(row, 'estado') || undefined,
    pais: getStr(row, 'pais') || undefined,
    telefone: getStr(row, 'telefone') ? getStr(row, 'telefone').replace(/\D/g, '') : undefined,
    celular: getStr(row, 'celular') ? getStr(row, 'celular').replace(/\D/g, '') : undefined,
    email: getStr(row, 'email') || undefined,
    site: getStr(row, 'site') || undefined,
    nome_contato: getStr(row, 'nome_contato', 'contato_nome') || undefined,
    cargo_contato: getStr(row, 'cargo_contato', 'contato_cargo') || undefined,
    observacoes: getStr(row, 'observacoes', 'observacoes') || undefined,
    banco_codigo: bancoCodigo || undefined,
    banco_nome: getStr(row, 'banco_nome', 'banco_nome') || undefined,
    agencia,
    conta,
    tipo_conta: tipoConta,
    pix_tipo: pixTipo,
    pix_valor: pixValor || undefined,
  };
}

function mapSheetRow(row: any): ParceiroImportRow | null {
  const normalizedRow: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });
  return parseRowToParceiro(normalizedRow);
}

// =====================================================
// PARSE DE ARQUIVOS
// =====================================================

export function parseParceirosExcel(file: File): Promise<ParceiroImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });
        const rows: ParceiroImportRow[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          const parsed = mapSheetRow(jsonData[i] as any);
          if (parsed && parsed.razao_social && parsed.cnpj.length === 14) rows.push(parsed);
        }
        resolve(rows);
      } catch (err) {
        reject(new Error(`Erro ao processar arquivo Excel: ${err instanceof Error ? err.message : 'Erro desconhecido'}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseParceirosCSV(file: File): Promise<ParceiroImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          reject(new Error('O arquivo CSV deve ter cabeçalho e pelo menos uma linha de dados'));
          return;
        }
        const headerLine = lines[0];
        const headers = headerLine.split(',').map((h) => normalizeHeader(h.replace(/^"|"$/g, '')));
        const rows: ParceiroImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            const c = line[j];
            if (c === '"') inQuotes = !inQuotes;
            else if (c === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else current += c;
          }
          values.push(current.trim());
          const row: any = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] ?? '';
          });
          const parsed = parseRowToParceiro(row);
          if (parsed && parsed.razao_social && parsed.cnpj.length === 14) rows.push(parsed);
        }
        resolve(rows);
      } catch (err) {
        reject(new Error(`Erro ao processar CSV: ${err instanceof Error ? err.message : 'Erro desconhecido'}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

// =====================================================
// IMPORTAÇÃO
// =====================================================

export async function importParceiros(
  companyId: string,
  rows: ParceiroImportRow[]
): Promise<ParceirosImportResult> {
  const result: ParceirosImportResult = {
    success: true,
    totalRows: rows.length,
    processed: 0,
    created: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      if (!row.razao_social?.trim()) {
        result.errors.push({ row: rowNumber, message: 'Razão social é obrigatória', data: row });
        continue;
      }
      if (!row.cnpj || row.cnpj.length !== 14) {
        result.errors.push({ row: rowNumber, message: 'CNPJ deve ter exatamente 14 dígitos', data: row });
        continue;
      }
      if (!row.tipo?.length) {
        result.errors.push({ row: rowNumber, message: 'Informe pelo menos um tipo: cliente, fornecedor ou transportador', data: row });
        continue;
      }

      const enderecoData: Record<string, string> = {};
      if (row.cep) enderecoData.cep = row.cep.replace(/\D/g, '');
      if (row.logradouro) enderecoData.logradouro = row.logradouro;
      if (row.numero) enderecoData.numero = row.numero;
      if (row.complemento) enderecoData.complemento = row.complemento;
      if (row.bairro) enderecoData.bairro = row.bairro;
      if (row.cidade) enderecoData.cidade = row.cidade;
      if (row.estado) enderecoData.estado = row.estado;
      if (row.pais) enderecoData.pais = row.pais;

      const contatoData: Record<string, string> = {};
      if (row.telefone) contatoData.telefone = row.telefone;
      if (row.celular) contatoData.celular = row.celular;
      if (row.email) contatoData.email = row.email;
      if (row.site) contatoData.site = row.site;
      if (row.nome_contato) contatoData.nome_contato = row.nome_contato;
      if (row.cargo_contato) contatoData.cargo_contato = row.cargo_contato;

      const dadosBancariosData: Record<string, any> = {};
      if (row.banco_codigo) dadosBancariosData.banco_codigo = row.banco_codigo;
      if (row.banco_nome) dadosBancariosData.banco_nome = row.banco_nome;
      if (row.agencia) dadosBancariosData.agencia = row.agencia;
      if (row.conta) dadosBancariosData.conta = row.conta;
      if (row.tipo_conta) dadosBancariosData.tipo_conta = row.tipo_conta;
      if (row.pix_valor && row.pix_tipo) {
        dadosBancariosData.pix = [{ tipo: row.pix_tipo, valor: row.pix_valor.trim() }];
      }

      const parceiroData: any = {
        company_id: companyId,
        razao_social: row.razao_social,
        nome_fantasia: row.nome_fantasia || null,
        cnpj: row.cnpj,
        tipo: row.tipo,
        ativo: row.ativo,
        inscricao_estadual: row.inscricao_estadual || null,
        inscricao_municipal: row.inscricao_municipal || null,
        matriz_id: null,
        observacoes: row.observacoes || null,
        endereco: Object.keys(enderecoData).length > 0 ? enderecoData : null,
        contato: Object.keys(contatoData).length > 0 ? contatoData : null,
        dados_bancarios: Object.keys(dadosBancariosData).length > 0 ? dadosBancariosData : null,
      };

      const { error } = await supabase.from('partners').insert([parceiroData]);
      if (error) throw error;
      result.created++;
      result.processed++;
    } catch (err: any) {
      result.success = false;
      result.errors.push({
        row: rowNumber,
        message: err?.message || 'Erro ao criar parceiro',
        data: row,
      });
    }
  }

  return result;
}

// =====================================================
// TEMPLATES
// =====================================================

const TEMPLATE_HEADERS = [
  'razao_social',
  'nome_fantasia',
  'cnpj',
  'tipo',
  'ativo',
  'inscricao_estadual',
  'inscricao_municipal',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'pais',
  'telefone',
  'celular',
  'email',
  'site',
  'nome_contato',
  'cargo_contato',
  'observacoes',
  'banco_codigo',
  'banco_nome',
  'agencia',
  'conta',
  'tipo_conta',
  'pix_tipo',
  'pix_valor',
];

export function generateParceirosExcelTemplate(): void {
  const templateData = [
    {
      razao_social: 'Empresa Exemplo Ltda',
      nome_fantasia: 'Exemplo',
      cnpj: '00000000000191',
      tipo: 'cliente,fornecedor',
      ativo: 'Sim',
      inscricao_estadual: '',
      inscricao_municipal: '',
      cep: '01310100',
      logradouro: 'Av Paulista',
      numero: '1000',
      complemento: 'Sala 1',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      pais: 'Brasil',
      telefone: '1133334444',
      celular: '11999998888',
      email: 'contato@exemplo.com',
      site: 'https://exemplo.com',
      nome_contato: 'João Silva',
      cargo_contato: 'Gerente',
      observacoes: 'Exemplo de importação',
      banco_codigo: '341',
      banco_nome: 'Banco Itaú',
      agencia: '1234',
      conta: '12345-6',
      tipo_conta: 'corrente',
      pix_tipo: 'email',
      pix_valor: 'contato@exemplo.com',
    },
    {
      razao_social: 'Transportadora ABC Ltda',
      nome_fantasia: 'ABC Transportes',
      cnpj: '11222333000181',
      tipo: 'transportador',
      ativo: 'Sim',
      inscricao_estadual: '',
      inscricao_municipal: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      pais: 'Brasil',
      telefone: '',
      celular: '',
      email: 'abc@transportes.com',
      site: '',
      nome_contato: '',
      cargo_contato: '',
      observacoes: '',
      banco_codigo: '237',
      banco_nome: 'Banco Bradesco',
      agencia: '0567',
      conta: '98765-4',
      tipo_conta: 'corrente',
      pix_tipo: 'cpf_cnpj',
      pix_valor: '11222333000181',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parceiros');
  const colWidths = TEMPLATE_HEADERS.map((_, i) => ({ wch: Math.min(22, 10 + TEMPLATE_HEADERS[i].length) }));
  worksheet['!cols'] = colWidths;
  XLSX.writeFile(workbook, 'template_importacao_parceiros.xlsx');
}

export function generateParceirosCSVTemplate(): void {
  const headers = TEMPLATE_HEADERS.join(',');
  const rows = [
    'Empresa Exemplo Ltda,Exemplo,00000000000191,cliente;fornecedor,Sim,,,,01310100,Av Paulista,1000,Sala 1,Bela Vista,São Paulo,SP,Brasil,1133334444,11999998888,contato@exemplo.com,https://exemplo.com,João Silva,Gerente,Exemplo,341,Banco Itaú,1234,12345-6,corrente,email,contato@exemplo.com',
    'Transportadora ABC Ltda,ABC Transportes,11222333000181,transportador,Sim,,,,,,,,,,,,,abc@transportes.com,,,,237,Banco Bradesco,0567,98765-4,corrente,cpf_cnpj,11222333000181',
  ];
  const csvContent = [headers, ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_importacao_parceiros.csv';
  a.click();
  URL.revokeObjectURL(url);
}
