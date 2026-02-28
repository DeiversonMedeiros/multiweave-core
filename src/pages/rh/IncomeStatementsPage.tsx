import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useActiveEmployees } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload,
  FileText,
  Calendar,
  DollarSign,
  Download
} from 'lucide-react';

type IncomeStatement = {
  id: string;
  employee_id: string;
  company_id: string;
  ano_referencia: number;
  mes_referencia: number;
  total_rendimentos: number;
  total_descontos: number;
  salario_liquido: number;
  inss_descontado: number;
  irrf_descontado: number;
  fgts_descontado: number;
  outros_descontos: number;
  status: 'processando' | 'processado' | 'erro';
  arquivo_pdf: string | null;
  observacoes: string | null;
  data_geracao: string | null;
  data_vencimento: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeOption = {
  id: string;
  company_id: string;
  nome: string;
  user_id?: string | null;
  matricula?: string | null;
};

const BUCKET_NAME = 'income-statements';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function IncomeStatementsPage() {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>('');
  const [totalRendimentos, setTotalRendimentos] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  // Carregar funcionários ativos para seleção
  const { data: activeEmployeesResult } = useActiveEmployees();
  const employees: EmployeeOption[] = useMemo(
    () =>
      ((activeEmployeesResult || []) as any[]).filter((emp) =>
        selectedCompany?.id ? emp.company_id === selectedCompany.id : true
      ) as EmployeeOption[],
    [activeEmployeesResult, selectedCompany?.id]
  );

  // Mapa auxiliar para buscar rapidamente dados do funcionário pelo id
  const employeesById = useMemo(() => {
    const map = new Map<string, EmployeeOption>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Listar informes existentes (filtrados por funcionário/ano, se informado)
  const { data: incomeStatements, isLoading: isLoadingStatements } = useQuery({
    queryKey: ['rh', 'income-statements', selectedCompany?.id, selectedEmployeeId, year],
    queryFn: async () => {
      if (!selectedCompany?.id) return [] as IncomeStatement[];

      const filters: Record<string, any> = {};
      if (selectedEmployeeId) {
        filters.employee_id = selectedEmployeeId;
      }
      if (year) {
        filters.ano_referencia = Number(year);
      }

      const result = await EntityService.list<IncomeStatement>({
        schema: 'rh',
        table: 'income_statements',
        companyId: selectedCompany.id,
        filters,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });

      return result.data as IncomeStatement[];
    },
    enabled: !!selectedCompany?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      if (!selectedEmployeeId) {
        throw new Error('Selecione um funcionário');
      }

      if (!year || isNaN(Number(year))) {
        throw new Error('Informe um ano de referência válido');
      }

      if (!month || isNaN(Number(month)) || Number(month) < 1 || Number(month) > 12) {
        throw new Error('Informe um mês de referência válido (1-12)');
      }

      if (!file) {
        throw new Error('Selecione um arquivo PDF para enviar');
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 50MB');
      }

      if (file.type !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são permitidos para o informe de rendimentos');
      }

      const employee = employees.find((e) => e.id === selectedEmployeeId);
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      if (!employee.user_id) {
        throw new Error(
          'Este funcionário não está vinculado a um usuário. Vincule o colaborador a um usuário antes de enviar o informe.'
        );
      }

      // Usar user_id do colaborador como primeira pasta (compatível com RLS do bucket)
      const ownerId = employee.user_id;

      const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const uniqueName = `IR_${year}_${month.padStart(2, '0')}_${Date.now()}_${sanitizedOriginalName}`;
      const filePath = `${ownerId}/${uniqueName}`;

      // Upload para o bucket income-statements
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const arquivoPdfPath = uploadData?.path || filePath;

      // Calcular data de vencimento (opcional): 5 anos à frente a partir de hoje
      const now = new Date();
      const vencimento = new Date(now);
      vencimento.setFullYear(vencimento.getFullYear() + 5);
      const dataVencimentoStr = vencimento.toISOString().split('T')[0];

      const totalRend = Number(totalRendimentos || 0);

      const result = await EntityService.create<IncomeStatement>({
        schema: 'rh',
        table: 'income_statements',
        companyId: selectedCompany.id,
        data: {
          employee_id: employee.id,
          ano_referencia: Number(year),
          mes_referencia: Number(month),
          total_rendimentos: isNaN(totalRend) ? 0 : totalRend,
          total_descontos: 0,
          salario_liquido: 0,
          inss_descontado: 0,
          irrf_descontado: 0,
          fgts_descontado: 0,
          outros_descontos: 0,
          status: 'processado',
          arquivo_pdf: arquivoPdfPath,
          observacoes: observacoes || null,
          data_vencimento: dataVencimentoStr,
        },
      });

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rh', 'income-statements', selectedCompany?.id, selectedEmployeeId, year],
      });

      setFile(null);
      setTotalRendimentos('');
      setObservacoes('');

      toast({
        title: 'Informe de rendimentos cadastrado',
        description: 'O PDF foi enviado e o informe ficará disponível no Portal do Colaborador em Comprovantes.',
      });
    },
    onError: (error: any) => {
      console.error('Erro ao enviar informe de rendimentos:', error);
      toast({
        title: 'Erro ao enviar informe',
        description: error?.message || 'Não foi possível enviar o informe de rendimentos. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleDownload = async (statement: IncomeStatement) => {
    if (!statement.arquivo_pdf) return;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(statement.arquivo_pdf);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');

      const filename = `Informe_Rendimentos_${statement.mes_referencia
        .toString()
        .padStart(2, '0')}_${statement.ano_referencia}.pdf`;

      link.href = url;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar informe de rendimentos:', error);
      toast({
        title: 'Erro ao baixar arquivo',
        description: 'Não foi possível baixar o PDF do informe de rendimentos.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Imposto de Renda</h1>
        <p className="text-gray-600">
          Gerencie e envie os informes de rendimentos (comprovantes de IR) para os colaboradores.
          Esses documentos ficarão disponíveis no Portal do Colaborador, na página de Comprovantes.
        </p>
      </div>

      {/* Formulário de cadastro / upload */}
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Informe de Rendimentos</CardTitle>
          <CardDescription>
            Selecione o colaborador, período de referência e envie o PDF do informe de rendimentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha 1: Funcionário em largura total */}
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Selecione um funcionário</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome}
                  {emp.matricula ? ` (${emp.matricula})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Linha 2: Ano e Mês lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ano de referência</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="1 a 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Total de rendimentos (opcional)</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalRendimentos}
                  onChange={(e) => setTotalRendimentos(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Inclua observações relevantes sobre este informe, se necessário."
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arquivo PDF do Informe de Rendimentos</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadMutation.isPending ? 'Enviando...' : 'Enviar PDF'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Apenas arquivos PDF são aceitos. Tamanho máximo: 50MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de informes cadastrados */}
      <Card>
        <CardHeader>
          <CardTitle>Informes de Rendimentos Cadastrados</CardTitle>
          <CardDescription>
            Estes registros são os mesmos exibidos para o colaborador na página{' '}
            <span className="font-mono text-xs text-gray-700">/portal-colaborador/comprovantes</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatements ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : incomeStatements && incomeStatements.length > 0 ? (
            <div className="space-y-4">
              {incomeStatements.map((statement) => {
                const employee = employeesById.get(statement.employee_id);
                return (
                  <div
                    key={statement.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {employee ? (
                            <>
                              {employee.nome}
                              {employee.matricula ? ` (${employee.matricula})` : ''} –{' '}
                            </>
                          ) : null}
                          Informe de Rendimentos -{' '}
                          {statement.mes_referencia.toString().padStart(2, '0')}/
                          {statement.ano_referencia}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Gerado em{' '}
                          {statement.created_at
                            ? new Date(statement.created_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </p>
                        {statement.total_rendimentos ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Total de rendimentos: R${' '}
                            {Number(statement.total_rendimentos).toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {statement.status === 'processado'
                          ? 'Disponível'
                          : statement.status === 'processando'
                          ? 'Processando'
                          : 'Erro'}
                      </Badge>
                      {statement.arquivo_pdf && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(statement)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                Nenhum informe de rendimentos encontrado para os filtros atuais.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

