import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function ComprovantesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar comprovantes
  const { data: incomeStatements, isLoading } = useQuery({
    queryKey: ['income-statements', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'income_statements',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'ano_referencia',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  const handleDownload = async (statementId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('income-statements')
        .download(fileName);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error);
    }
  };

  if (isLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="income_statements" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Comprovantes</h1>
        <p className="text-gray-600">
          Baixe seus comprovantes de rendimentos
        </p>
      </div>

      {/* Lista de comprovantes */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Comprovantes</CardTitle>
          <CardDescription>
            Comprovantes de rendimentos para declaração de IR
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomeStatements && incomeStatements.length > 0 ? (
            <div className="space-y-4">
              {incomeStatements.map((statement) => (
                <div
                  key={statement.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-green-100 text-green-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Comprovante de Rendimentos - {statement.mes_referencia.toString().padStart(2, '0')}/{statement.ano_referencia}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total de rendimentos: R$ {statement.total_rendimentos?.toFixed(2) || '0,00'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Gerado em {new Date(statement.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {statement.status === 'processado' ? 'Disponível' : 'Processando'}
                    </Badge>
                    {statement.arquivo_pdf && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(statement.id, statement.arquivo_pdf)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum comprovante encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Declaração de Imposto de Renda</h4>
            <p className="text-sm text-blue-800">
              Os comprovantes de rendimentos são necessários para a declaração do Imposto de Renda.
              Eles contêm todas as informações de rendimentos e descontos do período.
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Prazo de Retenção</h4>
            <p className="text-sm text-yellow-800">
              Os comprovantes são mantidos por 5 anos. Após esse período, eles são removidos automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
}
