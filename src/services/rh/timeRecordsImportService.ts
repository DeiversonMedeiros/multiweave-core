import * as XLSX from 'xlsx';
import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface TimeRecordImportRow {
  matricula?: string;
  cpf?: string;
  data_registro: string; // DD/MM/YYYY ou YYYY-MM-DD - Data base do registro
  entrada?: string; // HH:MM
  saida?: string; // HH:MM
  entrada_almoco?: string; // HH:MM
  saida_almoco?: string; // HH:MM
  entrada_extra1?: string; // HH:MM
  saida_extra1?: string; // HH:MM
  // Campos opcionais para especificar datas completas (útil para turnos noturnos)
  entrada_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da entrada (opcional)
  saida_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da saída (opcional)
  entrada_almoco_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da entrada almoço (opcional)
  saida_almoco_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da saída almoço (opcional)
  entrada_extra1_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da entrada extra (opcional)
  saida_extra1_data?: string; // DD/MM/YYYY ou YYYY-MM-DD - Data completa da saída extra (opcional)
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
  
  // Se não há matrículas nem CPFs para buscar, retornar mapa vazio
  if (matriculas.size === 0 && cpfs.size === 0) {
    return employeeMap;
  }
  
  try {
    // Buscar todos os funcionários da empresa usando EntityService
    // (mais eficiente do que fazer múltiplas queries)
    const result = await EntityService.list<{
      id: string;
      matricula: string | null;
      cpf: string;
      nome: string;
    }>({
      schema: 'rh',
      table: 'employees',
      companyId: companyId,
      pageSize: 1000,
      orderBy: 'nome'
    });
    
    if (result.data && result.data.length > 0) {
      result.data.forEach(emp => {
        // Adicionar por matrícula se existir e estiver na lista procurada
        if (emp.matricula) {
          const normalizedMatricula = normalizeMatricula(emp.matricula);
          if (matriculas.has(normalizedMatricula)) {
            employeeMap.set(normalizedMatricula, {
              id: emp.id,
              matricula: emp.matricula,
              cpf: emp.cpf,
              nome: emp.nome
            });
          }
        }
        
        // Adicionar por CPF se existir e estiver na lista procurada
        if (emp.cpf) {
          const normalizedCPF = normalizeCPF(emp.cpf);
          if (cpfs.has(normalizedCPF)) {
            employeeMap.set(normalizedCPF, {
              id: emp.id,
              matricula: emp.matricula || undefined,
              cpf: emp.cpf,
              nome: emp.nome
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error);
    throw new Error(`Erro ao buscar funcionários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
            // Campos opcionais para datas completas (turnos noturnos)
            entrada_data: normalizedRow.entrada_data || normalizedRow.entrance_date || normalizedRow.data_entrada,
            saida_data: normalizedRow.saida_data || normalizedRow.exit_date || normalizedRow.data_saida,
            entrada_almoco_data: normalizedRow.entrada_almoco_data || normalizedRow.entrance_lunch_date || normalizedRow.data_entrada_almoco,
            saida_almoco_data: normalizedRow.saida_almoco_data || normalizedRow.exit_lunch_date || normalizedRow.data_saida_almoco,
            entrada_extra1_data: normalizedRow.entrada_extra1_data || normalizedRow.entrance_extra_date || normalizedRow.data_entrada_extra,
            saida_extra1_data: normalizedRow.saida_extra1_data || normalizedRow.exit_extra_date || normalizedRow.data_saida_extra,
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
            // Campos opcionais para datas completas (turnos noturnos)
            entrada_data: row.entrada_data || row.entrance_date || row.data_entrada,
            saida_data: row.saida_data || row.exit_date || row.data_saida,
            entrada_almoco_data: row.entrada_almoco_data || row.entrance_lunch_date || row.data_entrada_almoco,
            saida_almoco_data: row.saida_almoco_data || row.exit_lunch_date || row.data_saida_almoco,
            entrada_extra1_data: row.entrada_extra1_data || row.entrance_extra_date || row.data_entrada_extra,
            saida_extra1_data: row.saida_extra1_data || row.exit_extra_date || row.data_saida_extra,
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
        
        // Parsear data base do registro
        const dataRegistro = parseDate(row.data_registro);
        if (!dataRegistro) {
          result.errors.push({
            row: rowNumber,
            message: `Data inválida: ${row.data_registro}. Use formato DD/MM/YYYY ou YYYY-MM-DD`,
            data: row
          });
          continue;
        }
        
        // Determinar data_registro correta considerando turnos noturnos
        // Se entrada tem data específica, usar ela; senão usar data_registro
        let dataRegistroFinal = dataRegistro;
        if (row.entrada_data) {
          const entradaDataParsed = parseDate(row.entrada_data);
          if (entradaDataParsed) {
            dataRegistroFinal = entradaDataParsed;
          }
        }
        
        // Preparar dados do registro
        const recordData: any = {
          employee_id: employee.id,
          company_id: companyId,
          data_registro: dataRegistroFinal,
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
          if (saida) {
            recordData.saida = saida;
            
            // Detectar turno noturno automaticamente: se saída < entrada, é turno noturno
            // O sistema já trata isso corretamente, mas garantimos que data_registro está correto
            if (recordData.entrada && saida < recordData.entrada) {
              // Turno noturno detectado - data_registro já está correto (dia da entrada)
              // Se foi especificada data da saída, validar que está no dia seguinte
              if (row.saida_data) {
                const saidaDataParsed = parseDate(row.saida_data);
                if (saidaDataParsed) {
                  const entradaDate = new Date(dataRegistroFinal);
                  const saidaDate = new Date(saidaDataParsed);
                  const diffDays = Math.floor((saidaDate.getTime() - entradaDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (diffDays !== 1) {
                    result.errors.push({
                      row: rowNumber,
                      message: `Aviso: Saída em turno noturno deve ser no dia seguinte. Entrada: ${dataRegistroFinal}, Saída especificada: ${saidaDataParsed}`,
                      data: row
                    });
                  }
                }
              }
            }
          }
        }
        
        if (row.entrada_almoco) {
          const entradaAlmoco = parseTime(row.entrada_almoco);
          if (entradaAlmoco) recordData.entrada_almoco = entradaAlmoco;
        }
        
        if (row.saida_almoco) {
          const saidaAlmoco = parseTime(row.saida_almoco);
          if (saidaAlmoco) {
            recordData.saida_almoco = saidaAlmoco;
            
            // Se saída almoço é menor que entrada almoço, pode ser turno noturno
            // Validar se data foi especificada e está correta
            if (row.saida_almoco_data) {
              const saidaAlmocoDataParsed = parseDate(row.saida_almoco_data);
              if (saidaAlmocoDataParsed) {
                const entradaAlmocoDate = recordData.entrada_almoco_data 
                  ? new Date(parseDate(row.entrada_almoco_data) || dataRegistroFinal)
                  : new Date(dataRegistroFinal);
                const saidaAlmocoDate = new Date(saidaAlmocoDataParsed);
                const diffDays = Math.floor((saidaAlmocoDate.getTime() - entradaAlmocoDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Se diferença for maior que 1 dia, avisar
                if (diffDays > 1) {
                  result.errors.push({
                    row: rowNumber,
                    message: `Aviso: Diferença de mais de 1 dia entre entrada e saída do almoço. Verifique as datas.`,
                    data: row
                  });
                }
              }
            }
          }
        }
        
        if (row.entrada_extra1) {
          const entradaExtra1 = parseTime(row.entrada_extra1);
          if (entradaExtra1) recordData.entrada_extra1 = entradaExtra1;
        }
        
        if (row.saida_extra1) {
          const saidaExtra1 = parseTime(row.saida_extra1);
          if (saidaExtra1) {
            recordData.saida_extra1 = saidaExtra1;
            
            // Validar datas se especificadas
            if (row.saida_extra1_data) {
              const saidaExtra1DataParsed = parseDate(row.saida_extra1_data);
              if (saidaExtra1DataParsed) {
                const entradaExtra1Date = recordData.entrada_extra1_data 
                  ? new Date(parseDate(row.entrada_extra1_data) || dataRegistroFinal)
                  : new Date(dataRegistroFinal);
                const saidaExtra1Date = new Date(saidaExtra1DataParsed);
                const diffDays = Math.floor((saidaExtra1Date.getTime() - entradaExtra1Date.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 1) {
                  result.errors.push({
                    row: rowNumber,
                    message: `Aviso: Diferença de mais de 1 dia entre entrada e saída extra. Verifique as datas.`,
                    data: row
                  });
                }
              }
            }
          }
        }
        
        // Verificar se já existe registro para este funcionário e data usando EntityService
        const existingRecords = await EntityService.list<{ id: string }>({
          schema: 'rh',
          table: 'time_records',
          companyId: companyId,
          filters: {
            employee_id: employee.id,
            data_registro: dataRegistroFinal
          },
          pageSize: 1
        });
        
        const existingRecord = existingRecords.data && existingRecords.data.length > 0 
          ? existingRecords.data[0] 
          : null;
        
        let timeRecordId: string;
        
        if (existingRecord) {
          // Atualizar registro existente
          const updatedRecord = await EntityService.update({
            schema: 'rh',
            table: 'time_records',
            companyId: companyId,
            id: existingRecord.id,
            data: {
              ...recordData,
              updated_at: new Date().toISOString()
            }
          });
          timeRecordId = existingRecord.id;
          result.updated++;
        } else {
          // Criar novo registro
          const newRecord = await EntityService.create<{ id: string }>({
            schema: 'rh',
            table: 'time_records',
            companyId: companyId,
            data: recordData
          });
          timeRecordId = newRecord.id || (newRecord as any).data?.id;
          if (!timeRecordId) {
            throw new Error('Erro ao criar registro: ID não retornado');
          }
          result.created++;
        }
        
        // Criar eventos em time_record_events com timestamps corretos
        // Isso é necessário para que a função get_consolidated_time_record_by_window
        // possa buscar as datas reais de cada marcação
        // Função auxiliar para criar timestamp UTC a partir de data e hora
        // Assumindo timezone America/Sao_Paulo (UTC-3)
        const createTimestampUTC = (dateStr: string, timeStr: string): string => {
          // Criar string no formato ISO local (assumindo America/Sao_Paulo)
          // Formato: YYYY-MM-DDTHH:MM:SS-03:00 (UTC-3)
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Criar Date object assumindo que a string está em UTC-3
          // Usar Date.UTC e depois adicionar 3 horas para converter para UTC
          const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
          // Adicionar 3 horas para converter de UTC-3 para UTC
          utcDate.setUTCHours(utcDate.getUTCHours() + 3);
          
          return utcDate.toISOString();
        };
        
        // Criar eventos para cada marcação
        if (recordData.entrada) {
          const entradaDate = row.entrada_data ? parseDate(row.entrada_data) : dataRegistroFinal;
          if (entradaDate) {
            const eventAt = createTimestampUTC(entradaDate, recordData.entrada);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'entrada',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
        }
        
        if (recordData.entrada_almoco) {
          const entradaAlmocoDate = row.entrada_almoco_data 
            ? parseDate(row.entrada_almoco_data) 
            : dataRegistroFinal;
          if (entradaAlmocoDate) {
            const eventAt = createTimestampUTC(entradaAlmocoDate, recordData.entrada_almoco);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'entrada_almoco',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
        }
        
        if (recordData.saida_almoco) {
          // Para turnos noturnos: se saida_almoco < entrada_almoco, é no dia seguinte
          let saidaAlmocoDate = row.saida_almoco_data 
            ? parseDate(row.saida_almoco_data) 
            : dataRegistroFinal;
          
          // Detectar automaticamente se é turno noturno
          if (recordData.entrada_almoco && recordData.saida_almoco && 
              recordData.saida_almoco < recordData.entrada_almoco && 
              !row.saida_almoco_data) {
            // É turno noturno - saída almoço é no dia seguinte
            const entradaAlmocoDate = row.entrada_almoco_data 
              ? parseDate(row.entrada_almoco_data) 
              : dataRegistroFinal;
            const date = new Date(entradaAlmocoDate);
            date.setDate(date.getDate() + 1);
            saidaAlmocoDate = date.toISOString().split('T')[0];
          }
          
          if (saidaAlmocoDate) {
            const eventAt = createTimestampUTC(saidaAlmocoDate, recordData.saida_almoco);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'saida_almoco',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
        }
        
        if (recordData.saida) {
          // Para turnos noturnos: se saida < entrada, é no dia seguinte
          let saidaDate = row.saida_data 
            ? parseDate(row.saida_data) 
            : dataRegistroFinal;
          
          // Detectar automaticamente se é turno noturno
          if (recordData.entrada && recordData.saida && 
              recordData.saida < recordData.entrada && 
              !row.saida_data) {
            // É turno noturno - saída é no dia seguinte
            const entradaDate = row.entrada_data ? parseDate(row.entrada_data) : dataRegistroFinal;
            const date = new Date(entradaDate);
            date.setDate(date.getDate() + 1);
            saidaDate = date.toISOString().split('T')[0];
          }
          
          if (saidaDate) {
            const eventAt = createTimestampUTC(saidaDate, recordData.saida);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'saida',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
        }
        
        if (recordData.entrada_extra1) {
          const entradaExtra1Date = row.entrada_extra1_data 
            ? parseDate(row.entrada_extra1_data) 
            : dataRegistroFinal;
          if (entradaExtra1Date) {
            const eventAt = createTimestampUTC(entradaExtra1Date, recordData.entrada_extra1);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'extra_inicio',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
        }
        
        if (recordData.saida_extra1) {
          // Para turnos noturnos: se saida_extra1 < entrada_extra1, é no dia seguinte
          let saidaExtra1Date = row.saida_extra1_data 
            ? parseDate(row.saida_extra1_data) 
            : dataRegistroFinal;
          
          // Detectar automaticamente se é turno noturno
          if (recordData.entrada_extra1 && recordData.saida_extra1 && 
              recordData.saida_extra1 < recordData.entrada_extra1 && 
              !row.saida_extra1_data) {
            // É turno noturno - saída extra é no dia seguinte
            const entradaExtra1Date = row.entrada_extra1_data 
              ? parseDate(row.entrada_extra1_data) 
              : dataRegistroFinal;
            const date = new Date(entradaExtra1Date);
            date.setDate(date.getDate() + 1);
            saidaExtra1Date = date.toISOString().split('T')[0];
          }
          
          if (saidaExtra1Date) {
            const eventAt = createTimestampUTC(saidaExtra1Date, recordData.saida_extra1);
            await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: companyId,
              data: {
                time_record_id: timeRecordId,
                employee_id: employee.id,
                company_id: companyId,
                event_type: 'extra_fim',
                event_at: eventAt,
                source: 'manual'
              }
            });
          }
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
      'Data Registro': '27/01/2026',
      'Entrada': '22:00',
      'Saída': '06:20',
      'Entrada Almoço': '23:00',
      'Saída Almoço': '00:30',
      'Entrada Extra 1': '',
      'Saída Extra 1': '',
      'Observações': 'Turno noturno - exemplo',
      'Status': 'pendente'
    },
    {
      'Matrícula': '003',
      'CPF': '11122233344',
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
    ['002', '98765432100', '27/01/2026', '22:00', '06:20', '23:00', '00:30', '', '', 'Turno noturno - exemplo', 'pendente'],
    ['003', '11122233344', '01/01/2024', '09:00', '18:00', '12:30', '13:30', '', '', '', 'pendente']
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
