import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type RegiaoProjeto = 'CENTRO-OESTE' | 'NORDESTE' | 'NORTE' | 'SUDESTE' | 'SUL';

export interface ProjectImportRow {
  nome: string;
  codigo: string;
  cost_center_codigo?: string;
  cidade?: string;
  uf?: string;
  regiao?: RegiaoProjeto | null;
  data_inicio?: string | null; // YYYY-MM-DD
  ativo: boolean;
}

export interface ProjetosImportResult {
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

const REGIOES_VALIDAS = new Set<RegiaoProjeto>(['CENTRO-OESTE', 'NORDESTE', 'NORTE', 'SUDESTE', 'SUL']);

const UFS_BRASIL = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

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

function parseData(dataStr: string): string | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const s = dataStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return `${y}-${m}-${d}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function parseRegiao(val: string): RegiaoProjeto | null {
  if (!val || typeof val !== 'string') return null;
  const normalized = val.trim().toUpperCase().replace(/\s+/g, '-');
  if (REGIOES_VALIDAS.has(normalized as RegiaoProjeto)) return normalized as RegiaoProjeto;
  return null;
}

function parseAtivo(val: string): boolean {
  if (val === '' || val == null) return true;
  const lower = String(val).trim().toLowerCase();
  if (lower === 'não' || lower === 'nao' || lower === 'false' || lower === '0' || lower === 'n') return false;
  return true;
}

function parseRowToProject(row: any): ProjectImportRow | null {
  const nome = getStr(row, 'nome', 'name');
  const codigo = getStr(row, 'codigo', 'code');
  if (!nome || nome.length < 3) return null;
  if (!codigo) return null;

  const ufVal = getStr(row, 'uf', 'estado');
  const uf = ufVal && UFS_BRASIL.has(ufVal.toUpperCase()) ? ufVal.toUpperCase() : undefined;
  const regiao = parseRegiao(getStr(row, 'regiao', 'regiao'));
  const dataInicio = parseData(getStr(row, 'data_inicio', 'data_inicio'));

  return {
    nome,
    codigo,
    cost_center_codigo: getStr(row, 'cost_center_codigo', 'centro_custo_codigo') || undefined,
    cidade: getStr(row, 'cidade', 'cidade') || undefined,
    uf,
    regiao: regiao ?? undefined,
    data_inicio: dataInicio ?? undefined,
    ativo: parseAtivo(getStr(row, 'ativo', 'active')),
  };
}

function mapSheetRow(row: any): ProjectImportRow | null {
  const normalizedRow: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });
  return parseRowToProject(normalizedRow);
}

// =====================================================
// PARSE DE ARQUIVOS
// =====================================================

export function parseProjetosExcel(file: File): Promise<ProjectImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });
        const rows: ProjectImportRow[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          const parsed = mapSheetRow(jsonData[i] as any);
          if (parsed && parsed.nome && parsed.codigo) rows.push(parsed);
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

export function parseProjetosCSV(file: File): Promise<ProjectImportRow[]> {
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
        const rows: ProjectImportRow[] = [];
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
          const parsed = parseRowToProject(row);
          if (parsed && parsed.nome && parsed.codigo) rows.push(parsed);
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

async function getCostCenterMap(companyId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('cost_centers')
    .select('id, codigo')
    .eq('company_id', companyId)
    .eq('ativo', true);
  if (error) throw error;
  const map = new Map<string, string>();
  (data || []).forEach((cc: { id: string; codigo: string }) => {
    if (cc.codigo) map.set(cc.codigo.trim().toUpperCase(), cc.id);
  });
  return map;
}

export async function importProjetos(
  companyId: string,
  rows: ProjectImportRow[]
): Promise<ProjetosImportResult> {
  const result: ProjetosImportResult = {
    success: true,
    totalRows: rows.length,
    processed: 0,
    created: 0,
    errors: [],
  };

  let costCenterMap: Map<string, string>;
  try {
    costCenterMap = await getCostCenterMap(companyId);
  } catch (err: any) {
    result.success = false;
    result.errors.push({ row: 0, message: 'Erro ao carregar centros de custo: ' + (err?.message || err) });
    return result;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    try {
      if (!row.nome?.trim() || row.nome.length < 3) {
        result.errors.push({ row: rowNumber, message: 'Nome é obrigatório (mín. 3 caracteres)', data: row });
        continue;
      }
      if (!row.codigo?.trim()) {
        result.errors.push({ row: rowNumber, message: 'Código é obrigatório', data: row });
        continue;
      }

      let cost_center_id: string | null = null;
      if (row.cost_center_codigo?.trim()) {
        const id = costCenterMap.get(row.cost_center_codigo.trim().toUpperCase());
        if (!id) {
          result.errors.push({
            row: rowNumber,
            message: `Centro de custo com código "${row.cost_center_codigo}" não encontrado`,
            data: row,
          });
          continue;
        }
        cost_center_id = id;
      }

      const projetoData = {
        company_id: companyId,
        nome: row.nome,
        codigo: row.codigo,
        cost_center_id,
        cidade: row.cidade || null,
        uf: row.uf || null,
        regiao: row.regiao || null,
        data_inicio: row.data_inicio || null,
        ativo: row.ativo,
      };

      const { error } = await supabase.from('projects').insert([projetoData]);
      if (error) throw error;
      result.created++;
      result.processed++;
    } catch (err: any) {
      result.success = false;
      result.errors.push({
        row: rowNumber,
        message: err?.message || 'Erro ao criar projeto',
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
  'codigo',
  'nome',
  'cidade',
  'uf',
  'regiao',
  'data_inicio',
  'cost_center_codigo',
  'ativo',
];

export function generateProjetosExcelTemplate(): void {
  const templateData = [
    {
      codigo: 'PRJ001',
      nome: 'Projeto Exemplo Alpha',
      cidade: 'São Paulo',
      uf: 'SP',
      regiao: 'SUDESTE',
      data_inicio: '2025-01-15',
      cost_center_codigo: '',
      ativo: 'Sim',
    },
    {
      codigo: 'PRJ002',
      nome: 'Projeto Infraestrutura Norte',
      cidade: 'Manaus',
      uf: 'AM',
      regiao: 'NORTE',
      data_inicio: '01/02/2025',
      cost_center_codigo: '',
      ativo: 'Sim',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Projetos');
  const colWidths = TEMPLATE_HEADERS.map((_, i) => ({ wch: Math.min(20, 8 + TEMPLATE_HEADERS[i].length) }));
  worksheet['!cols'] = colWidths;
  XLSX.writeFile(workbook, 'template_importacao_projetos.xlsx');
}

export function generateProjetosCSVTemplate(): void {
  const headers = TEMPLATE_HEADERS.join(',');
  const rows = [
    'PRJ001,Projeto Exemplo Alpha,São Paulo,SP,SUDESTE,2025-01-15,,Sim',
    'PRJ002,Projeto Infraestrutura Norte,Manaus,AM,NORTE,01/02/2025,,Sim',
  ];
  const csvContent = [headers, ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_importacao_projetos.csv';
  a.click();
  URL.revokeObjectURL(url);
}
