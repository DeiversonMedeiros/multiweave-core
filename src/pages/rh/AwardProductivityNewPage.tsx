// =====================================================
// PÁGINA PARA CRIAR NOVA PREMIAÇÃO
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift } from 'lucide-react';
import AwardProductivityForm from '@/components/rh/AwardProductivityForm';
import { useCreateAwardProductivity } from '@/hooks/rh/useAwardsProductivity';
import { AwardProductivityCreateData, Employee } from '@/integrations/supabase/rh-types';
import { useRHData } from '@/hooks/generic/useEntityData';
import { useCompany } from '@/lib/company-context';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const AwardProductivityNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const createMutation = useCreateAwardProductivity();
  
  // Carregar funcionários
  const { data: employeesData } = useRHData<Employee>('employees', selectedCompany?.id || '');
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];

  const handleSubmit = async (data: AwardProductivityCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/awards-productivity');
    } catch (error) {
      console.error('Erro ao criar premiação:', error);
    }
  };

  return (
    <RequirePage pagePath="/rh/AwardProductivityNewPage*" action="read">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/rh/awards-productivity')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Nova Premiação
          </h1>
          <p className="text-muted-foreground">
            Cadastre uma nova premiação ou pagamento por produtividade
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Premiação</CardTitle>
        </CardHeader>
        <CardContent>
          <AwardProductivityForm
            employees={employees}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
    </RequirePage>
  );
};

export default AwardProductivityNewPage;
