import * as XLSX from 'xlsx';
import { AlmoxarifadoService } from '@/services/almoxarifado/almoxarifadoService';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface MaterialImportRow {
  codigo_interno: string;
  nome?: string;
  descricao: string;
  tipo: 'produto' | 'servico' | 'equipamento';
  classe?: string;
  unidade_medida: string;
  status: 'ativo' | 'inativo';
  equipamento_proprio?: boolean;
  estoque_minimo?: number;
  estoque_maximo?: number;
  valor_unitario?: number;
  validade_dias?: number;
  ncm?: string;
  cfop?: string;
  cst?: string;
  observacoes?: string;
}

export interface MateriaisImportResult {
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

/**
 * Normaliza nome de coluna para comparação (minúsculo, sem acentos, underscores)
 */
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

/**
 * Converte valor do Excel/CSV para tipo correto
 */
function parseRowToMaterial(row: any): MaterialImportRow | null {
  const get = (key: string, alt?: string) => {
    const v = row[key] ?? row[alt] ?? '';
    return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  };

  const codigo = get('codigo_interno', 'codigo');
  const descricao = get('descricao');
  const tipo = (get('tipo', 'type') || 'produto').toLowerCase();
  const unidade = get('unidade_medida', 'unidade');
  const status = (get('status') || 'ativo').toLowerCase();

  if (!descricao) return null;
  if (!unidade) return null;

  const tipoValido = ['produto', 'servico', 'equipamento'].includes(tipo) ? tipo as 'produto' | 'servico' | 'equipamento' : 'produto';
  const statusValido = status === 'inativo' ? 'inativo' : 'ativo';

  const estoqueMin = parseInt(String(row.estoque_minimo ?? row.estoque_min ?? 0), 10);
  const estoqueMax = row.estoque_maximo ?? row.estoque_max;
  const valorUnit = row.valor_unitario ?? row.valor_unit;
  const validadeDias = row.validade_dias ?? row.validade;

  let equipamentoProprio = true;
  const eqProp = get('equipamento_proprio', 'equipamento_proprio');
  if (eqProp !== '') {
    const lower = eqProp.toLowerCase();
    if (lower === 'não' || lower === 'nao' || lower === 'false' || lower === '0' || lower === 'n') {
      equipamentoProprio = false;
    } else if (lower === 'sim' || lower === 'true' || lower === '1' || lower === 's') {
      equipamentoProprio = true;
    }
  }

  return {
    codigo_interno: codigo || '',
    nome: get('nome', 'name') || undefined,
    descricao,
    tipo: tipoValido,
    classe: get('classe', 'grupo') || undefined,
    unidade_medida: unidade,
    status: statusValido,
    equipamento_proprio: equipamentoProprio,
    estoque_minimo: isNaN(estoqueMin) ? 0 : Math.max(0, estoqueMin),
    estoque_maximo: estoqueMax !== '' && estoqueMax != null ? Math.max(0, parseInt(String(estoqueMax), 10)) : undefined,
    valor_unitario: valorUnit !== '' && valorUnit != null ? parseFloat(String(valorUnit).replace(',', '.')) : undefined,
    validade_dias: validadeDias !== '' && validadeDias != null ? parseInt(String(validadeDias), 10) : undefined,
    ncm: get('ncm') || undefined,
    cfop: get('cfop') || undefined,
    cst: get('cst') || undefined,
    observacoes: get('observacoes', 'observacoes') || undefined,
  };
}

/**
 * Mapeia objeto genérico (chaves do Excel) para MaterialImportRow
 */
function mapSheetRow(row: any): MaterialImportRow | null {
  const normalizedRow: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });
  return parseRowToMaterial(normalizedRow);
}

// =====================================================
// PARSE DE ARQUIVOS
// =====================================================

/**
 * Processa arquivo Excel e retorna linhas de materiais
 */
export function parseMateriaisExcel(file: File): Promise<MaterialImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });
        const rows: MaterialImportRow[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          const parsed = mapSheetRow(jsonData[i] as any);
          if (parsed && parsed.descricao) {
            rows.push(parsed);
          }
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

/**
 * Processa arquivo CSV e retorna linhas de materiais
 */
export function parseMateriaisCSV(file: File): Promise<MaterialImportRow[]> {
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
        const rows: MaterialImportRow[] = [];
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
          const parsed = parseRowToMaterial(row);
          if (parsed && parsed.descricao) rows.push(parsed);
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

/**
 * Importa materiais em massa
 */
export async function importMateriais(
  companyId: string,
  rows: MaterialImportRow[]
): Promise<MateriaisImportResult> {
  const result: MateriaisImportResult = {
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
      if (!row.descricao || row.descricao.trim() === '') {
        result.errors.push({ row: rowNumber, message: 'Descrição é obrigatória', data: row });
        continue;
      }
      if (!row.unidade_medida || row.unidade_medida.trim() === '') {
        result.errors.push({ row: rowNumber, message: 'Unidade de medida é obrigatória', data: row });
        continue;
      }
      let codigoInterno = row.codigo_interno?.trim();
      if (!codigoInterno) {
        codigoInterno = `IMP-${Date.now()}-${i + 1}`;
      }

      const payload = {
        company_id: companyId,
        codigo_interno: codigoInterno,
        nome: row.nome || null,
        descricao: row.descricao,
        tipo: row.tipo,
        classe: row.classe || null,
        unidade_medida: row.unidade_medida,
        status: row.status,
        equipamento_proprio: row.equipamento_proprio ?? true,
        estoque_minimo: row.estoque_minimo ?? 0,
        estoque_maximo: row.estoque_maximo ?? null,
        valor_unitario: row.valor_unitario ?? null,
        validade_dias: row.validade_dias ?? null,
        ncm: row.ncm || null,
        cfop: row.cfop || null,
        cst: row.cst || null,
        observacoes: row.observacoes || null,
      };

      await AlmoxarifadoService.createMaterialEquipamento(payload);
      result.created++;
      result.processed++;
    } catch (err) {
      result.success = false;
      result.errors.push({
        row: rowNumber,
        message: err instanceof Error ? err.message : 'Erro ao criar material',
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
  'codigo_interno',
  'nome',
  'descricao',
  'tipo',
  'classe',
  'unidade_medida',
  'status',
  'equipamento_proprio',
  'estoque_minimo',
  'estoque_maximo',
  'valor_unitario',
  'validade_dias',
  'ncm',
  'cfop',
  'cst',
  'observacoes',
];

/**
 * Gera e faz download do template Excel para importação de materiais
 */
export function generateMateriaisExcelTemplate(): void {
  const templateData = [
    {
      codigo_interno: 'MAT001',
      nome: 'Parafuso Sextavado',
      descricao: 'Parafuso sextavado 1/2" zincado',
      tipo: 'produto',
      classe: 'Parafusos',
      unidade_medida: 'UN',
      status: 'ativo',
      equipamento_proprio: 'Sim',
      estoque_minimo: 100,
      estoque_maximo: 1000,
      valor_unitario: 0.85,
      validade_dias: '',
      ncm: '73181590',
      cfop: '5102',
      cst: '00',
      observacoes: 'Exemplo de linha para importação',
    },
    {
      codigo_interno: 'MAT002',
      nome: 'Luvas de Proteção',
      descricao: 'Luvas de proteção EPI tamanho G',
      tipo: 'produto',
      classe: 'Equipamentos de Segurança',
      unidade_medida: 'PAR',
      status: 'ativo',
      equipamento_proprio: 'Sim',
      estoque_minimo: 50,
      estoque_maximo: 200,
      valor_unitario: 12.5,
      validade_dias: '',
      ncm: '',
      cfop: '',
      cst: '',
      observacoes: '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Materiais');
  const colWidths = TEMPLATE_HEADERS.map((_, i) => ({ wch: i === 2 ? 40 : Math.min(18, 12 + TEMPLATE_HEADERS[i].length) }));
  worksheet['!cols'] = colWidths;
  XLSX.writeFile(workbook, 'template_importacao_materiais.xlsx');
}

/**
 * Gera e faz download do template CSV para importação de materiais
 */
export function generateMateriaisCSVTemplate(): void {
  const headers = TEMPLATE_HEADERS.join(',');
  const rows = [
    'MAT001,Parafuso Sextavado,"Parafuso sextavado 1/2"" zincado",produto,Parafusos,UN,ativo,Sim,100,1000,0.85,,73181590,5102,00,Exemplo',
    'MAT002,Luvas de Proteção,Luvas de proteção EPI tamanho G,produto,Equipamentos de Segurança,PAR,ativo,Sim,50,200,12.5,,,,,',
  ];
  const csvContent = [headers, ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_importacao_materiais.csv';
  a.click();
  URL.revokeObjectURL(url);
}
