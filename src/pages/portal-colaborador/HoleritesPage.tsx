import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function HoleritesPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar holerites
  const { data: payrollSlips, isLoading } = useQuery({
    queryKey: ['payroll-slips', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'payroll',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'mes_referencia',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  const handleDownload = async (slipId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('holerites')
        .download(fileName);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar holerite:', error);
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
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Holerites</h1>
        <p className="text-gray-600">
          Visualize e baixe seus holerites
        </p>
      </div>

      {/* Lista de holerites */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Holerites</CardTitle>
          <CardDescription>
            Histórico de holerites disponíveis para download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payrollSlips && payrollSlips.length > 0 ? (
            <div className="space-y-4">
              {payrollSlips.map((slip) => (
                <div
                  key={slip.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Holerite - {slip.mes_referencia.toString().padStart(2, '0')}/{slip.ano_referencia}
                      </p>
                      <p className="text-sm text-gray-600">
                        Salário líquido: R$ {slip.salario_liquido?.toFixed(2) || '0,00'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Processado em {new Date(slip.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {slip.status === 'processado' ? 'Disponível' : 'Processando'}
                    </Badge>
                    {slip.arquivo_pdf && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(slip.id, slip.arquivo_pdf)}
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
              <p className="text-gray-600">Nenhum holerite encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    );
}
