import * as XLSX from 'xlsx';
import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface TimeRecordImportRow {
  matricula?: string;
  cpf?: string;
  data_registro: string; // DD/MM/YYYY ou YYYY-MM-DD
  entrada?: string; // HH:MM
  saida?: string; // HH:MM
  entrada_almoco?: string; // HH:MM
  saida_almoco?: string; // HH:MM
  entrada_extra1?: string; // HH:MM
  saida_extra1?: string; // HH:MM
  observacoes?: string;
  status?: 'pendente' | 'aprovado' | 'rejeitado' | 'corrigido';
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

export interface EmployeeLookup {
  id: string;
  matricula?: string;
  cpf: string;
  nome: string;
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Normaliza CPF removendo caracteres especiais
 */
function normalizeCPF(cpf: string): string {
  return cpf.replace(/[^\d]/g, '');
}

/**
 * Normaliza matrícula removendo espaços
 */
function normalizeMatricula(matricula: string): string {
  return matricula.trim();
}

/**
 * Converte data de vários formatos para YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Remover espaços
  dateStr = dateStr.trim();
  
  // Tentar formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Tentar formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  
  // Tentar formato DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
  
  // Tentar parsear como Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Converte hora de vários formatos para HH:MM
 */
function parseTime(timeStr: string): string | null {
  if (!timeStr) return null;
  
  timeStr = timeStr.trim();
  
  // Formato HH:MM ou HH:MM:SS
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
    const parts = timeStr.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = parts[1].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Formato HHMM (sem separador)
  if (/^\d{3,4}$/.test(timeStr)) {
    const padded = timeStr.padStart(4, '0');
    return `${padded.substring(0, 2)}:${padded.substring(2)}`;
  }
  
  return null;
}

/**
 * Busca funcionários por matrícula ou CPF
 */
async function findEmployees(
  companyId: string,
  rows: TimeRecordImportRow[]
): Promise<Map<string, EmployeeLookup>> {
  const employeeMap = new Map<string, EmployeeLookup>();
  
  // Coletar todas as matrículas e CPFs únicos
  const matriculas = new Set<string>();
  const cpfs = new Set<string>();
  
  rows.forEach(row => {
    if (row.matricula) {
      matriculas.add(normalizeMatricula(row.matricula));
    }
    if (row.cpf) {
      cpfs.add(normalizeCPF(row.cpf));
    }
  });
  
  // Buscar por matrícula
  if (matriculas.size > 0) {
    const { data: employeesByMatricula } = await supabase
      .from('rh.employees')
      .select('id, matricula, cpf, nome')
      .eq('company_id', companyId)
      .in('matricula', Array.from(matriculas));
    
    if (employeesByMatricula) {
      employeesByMatricula.forEach(emp => {
        if (emp.matricula) {
          const key = normalizeMatricula(emp.matricula);
          employeeMap.set(key, {
            id: emp.id,
            matricula: emp.matricula,
            cpf: emp.cpf,
            nome: emp.nome
          });
        }
      });
    }
  }
  
  // Buscar por CPF
  if (cpfs.size > 0) {
    const { data: employeesByCPF } = await supabase
      .from('rh.employees')
      .select('id, matricula, cpf, nome')
      .eq('company_id', companyId)
      .in('cpf', Array.from(cpfs));
    
    if (employeesByCPF) {
      employeesByCPF.forEach(emp => {
        const cpfKey = normalizeCPF(emp.cpf);
        employeeMap.set(cpfKey, {
          id: emp.id,
          matricula: emp.matricula,
          cpf: emp.cpf,
          nome: emp.nome
        });
      });
    }
  }
  
  return employeeMap;
}

// =====================================================
// FUNÇÕES DE IMPORTAÇÃO
// =====================================================

/**
 * Processa arquivo Excel e retorna dados
 */
export function parseExcelFile(file: File): Promise<TimeRecordImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false, // Manter como string para processar depois
          defval: null
        });
        
        // Mapear para formato esperado
        const rows: TimeRecordImportRow[] = jsonData.map((row: any) => {
          // Normalizar nomes de colunas (case-insensitive, remover espaços)
          const normalizedRow: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[áàâã]/g, 'a')
              .replace(/[éèê]/g, 'e')
              .replace(/[íìî]/g, 'i')
              .replace(/[óòôõ]/g, 'o')
              .replace(/[úùû]/g, 'u')
              .replace(/ç/g, 'c');
            normalizedRow[normalizedKey] = row[key];
          });
          
          return {
            matricula: normalizedRow.matricula || normalizedRow.mat || normalizedRow.registration,
            cpf: normalizedRow.cpf,
            data_registro: normalizedRow.data_registro || normalizedRow.data || normalizedRow.date || normalizedRow.dt_registro,
            entrada: normalizedRow.entrada || normalizedRow.entrance || normalizedRow.hora_entrada || normalizedRow.hr_entrada,
            saida: normalizedRow.saida || normalizedRow.exit || normalizedRow.hora_saida || normalizedRow.hr_saida,
            entrada_almoco: normalizedRow.entrada_almoco || normalizedRow.entrance_lunch || normalizedRow.hora_entrada_almoco || normalizedRow.hr_entrada_almoco,
            saida_almoco: normalizedRow.saida_almoco || normalizedRow.exit_lunch || normalizedRow.hora_saida_almoco || normalizedRow.hr_saida_almoco,
            entrada_extra1: normalizedRow.entrada_extra1 || normalizedRow.entrance_extra || normalizedRow.hora_entrada_extra || normalizedRow.hr_entrada_extra,
            saida_extra1: normalizedRow.saida_extra1 || normalizedRow.exit_extra || normalizedRow.hora_saida_extra || normalizedRow.hr_saida_extra,
            observacoes: normalizedRow.observacoes || normalizedRow.observations || normalizedRow.obs || normalizedRow.notes,
            status: normalizedRow.status
          };
        });
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Erro ao processar arquivo Excel: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Processa arquivo CSV e retorna dados
 */
export function parseCSVFile(file: File): Promise<TimeRecordImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados'));
          return;
        }
        
        // Parsear cabeçalho
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[áàâã]/g, 'a')
          .replace(/[éèê]/g, 'e')
          .replace(/[íìî]/g, 'i')
          .replace(/[óòôõ]/g, 'o')
          .replace(/[úùû]/g, 'u')
          .replace(/ç/g, 'c'));
        
        // Parsear linhas de dados
        const rows: TimeRecordImportRow[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parsear linha CSV (considerando aspas)
          const values: string[] = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim());
          
          // Mapear valores para objeto
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          rows.push({
            matricula: row.matricula || row.mat || row.registration,
            cpf: row.cpf,
            data_registro: row.data_registro || row.data || row.date || row.dt_registro,
            entrada: row.entrada || row.entrance || row.hora_entrada || row.hr_entrada,
            saida: row.saida || row.exit || row.hora_saida || row.hr_saida,
            entrada_almoco: row.entrada_almoco || row.entrance_lunch || row.hora_entrada_almoco || row.hr_entrada_almoco,
            saida_almoco: row.saida_almoco || row.exit_lunch || row.hora_saida_almoco || row.hr_saida_almoco,
            entrada_extra1: row.entrada_extra1 || row.entrance_extra || row.hora_entrada_extra || row.hr_entrada_extra,
            saida_extra1: row.saida_extra1 || row.exit_extra || row.hora_saida_extra || row.hr_saida_extra,
            observacoes: row.observacoes || row.observations || row.obs || row.notes,
            status: row.status
          });
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`Erro ao processar arquivo CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Importa registros de ponto em massa
 */
export async function importTimeRecords(
  companyId: string,
  rows: TimeRecordImportRow[]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    processed: 0,
    created: 0,
    updated: 0,
    errors: []
  };
  
  try {
    // Buscar funcionários
    const employeeMap = await findEmployees(companyId, rows);
    
    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho
      
      try {
        // Validar dados obrigatórios
        if (!row.data_registro) {
          result.errors.push({
            row: rowNumber,
            message: 'Data de registro é obrigatória',
            data: row
          });
          continue;
        }
        
        // Encontrar funcionário
        let employee: EmployeeLookup | undefined;
        
        if (row.matricula) {
          const matriculaKey = normalizeMatricula(row.matricula);
          employee = employeeMap.get(matriculaKey);
        }
        
        if (!employee && row.cpf) {
          const cpfKey = normalizeCPF(row.cpf);
          employee = employeeMap.get(cpfKey);
        }
        
        if (!employee) {
          result.errors.push({
            row: rowNumber,
            message: `Funcionário não encontrado. Verifique a matrícula (${row.matricula || 'N/A'}) ou CPF (${row.cpf || 'N/A'})`,
            data: row
          });
          continue;
        }
        
        // Parsear data
        const dataRegistro = parseDate(row.data_registro);
        if (!dataRegistro) {
          result.errors.push({
            row: rowNumber,
            message: `Data inválida: ${row.data_registro}. Use formato DD/MM/YYYY ou YYYY-MM-DD`,
            data: row
          });
          continue;
        }
        
        // Preparar dados do registro
        const recordData: any = {
          employee_id: employee.id,
          company_id: companyId,
          data_registro: dataRegistro,
          status: row.status || 'pendente',
          observacoes: row.observacoes || null
        };
        
        // Parsear horários
        if (row.entrada) {
          const entrada = parseTime(row.entrada);
          if (entrada) recordData.entrada = entrada;
        }
        
        if (row.saida) {
          const saida = parseTime(row.saida);
          if (saida) recordData.saida = saida;
        }
        
        if (row.entrada_almoco) {
          const entradaAlmoco = parseTime(row.entrada_almoco);
          if (entradaAlmoco) recordData.entrada_almoco = entradaAlmoco;
        }
        
        if (row.saida_almoco) {
          const saidaAlmoco = parseTime(row.saida_almoco);
          if (saidaAlmoco) recordData.saida_almoco = saidaAlmoco;
        }
        
        if (row.entrada_extra1) {
          const entradaExtra1 = parseTime(row.entrada_extra1);
          if (entradaExtra1) recordData.entrada_extra1 = entradaExtra1;
        }
        
        if (row.saida_extra1) {
          const saidaExtra1 = parseTime(row.saida_extra1);
          if (saidaExtra1) recordData.saida_extra1 = saidaExtra1;
        }
        
        // Verificar se já existe registro para este funcionário e data
        const { data: existingRecord } = await supabase
          .from('rh.time_records')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('company_id', companyId)
          .eq('data_registro', dataRegistro)
          .maybeSingle();
        
        if (existingRecord) {
          // Atualizar registro existente
          await EntityService.update({
            schema: 'rh',
            table: 'time_records',
            companyId: companyId,
            id: existingRecord.id,
            data: {
              ...recordData,
              updated_at: new Date().toISOString()
            }
          });
          result.updated++;
        } else {
          // Criar novo registro usando upsert para garantir que não haja duplicatas
          await EntityService.upsert({
            schema: 'rh',
            table: 'time_records',
            companyId: companyId,
            data: recordData,
            conflictColumns: ['employee_id', 'data_registro']
          });
          result.created++;
        }
        
        result.processed++;
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          data: row
        });
      }
    }
    
    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : 'Erro geral na importação',
      data: null
    });
    return result;
  }
}

/**
 * Gera template Excel para importação
 */
export function generateExcelTemplate(): void {
  const templateData = [
    {
      'Matrícula': '001',
      'CPF': '12345678901',
      'Data Registro': '01/01/2024',
      'Entrada': '08:00',
      'Saída': '17:00',
      'Entrada Almoço': '12:00',
      'Saída Almoço': '13:00',
      'Entrada Extra 1': '',
      'Saída Extra 1': '',
      'Observações': 'Importação em massa',
      'Status': 'pendente'
    },
    {
      'Matrícula': '002',
      'CPF': '98765432100',
      'Data Registro': '01/01/2024',
      'Entrada': '09:00',
      'Saída': '18:00',
      'Entrada Almoço': '12:30',
      'Saída Almoço': '13:30',
      'Entrada Extra 1': '',
      'Saída Extra 1': '',
      'Observações': '',
      'Status': 'pendente'
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros de Ponto');
  
  // Ajustar largura das colunas
  const colWidths = [
    { wch: 12 }, // Matrícula
    { wch: 14 }, // CPF
    { wch: 15 }, // Data Registro
    { wch: 10 }, // Entrada
    { wch: 10 }, // Saída
    { wch: 15 }, // Entrada Almoço
    { wch: 15 }, // Saída Almoço
    { wch: 15 }, // Entrada Extra 1
    { wch: 15 }, // Saída Extra 1
    { wch: 30 }, // Observações
    { wch: 12 }  // Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, 'template_importacao_registros_ponto.xlsx');
}

/**
 * Gera template CSV para importação
 */
export function generateCSVTemplate(): void {
  const headers = [
    'Matrícula',
    'CPF',
    'Data Registro',
    'Entrada',
    'Saída',
    'Entrada Almoço',
    'Saída Almoço',
    'Entrada Extra 1',
    'Saída Extra 1',
    'Observações',
    'Status'
  ];
  
  const exampleRows = [
    ['001', '12345678901', '01/01/2024', '08:00', '17:00', '12:00', '13:00', '', '', 'Importação em massa', 'pendente'],
    ['002', '98765432100', '01/01/2024', '09:00', '18:00', '12:30', '13:30', '', '', '', 'pendente']
  ];
  
  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'template_importacao_registros_ponto.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
