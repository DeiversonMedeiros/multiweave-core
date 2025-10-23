// =====================================================
// PÁGINA PARA CRIAR NOVA ADESÃO DE FUNCIONÁRIO
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import EmployeeMedicalPlanForm from '@/components/rh/EmployeeMedicalPlanForm';
import { useCreateEmployeeMedicalPlan } from '@/hooks/rh/useMedicalAgreements';
import { EmployeeMedicalPlanCreateData } from '@/integrations/supabase/rh-types';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const EmployeeMedicalPlanNewPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateEmployeeMedicalPlan();

  const handleSubmit = async (data: EmployeeMedicalPlanCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/medical-agreements');
    } catch (error) {
      console.error('Erro ao criar adesão médica:', error);
    }
  };

  return (
    <RequireEntity entityName="employee_medical_plan" action="read">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/rh/medical-agreements')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Nova Adesão Médica
          </h1>
          <p className="text-muted-foreground">
            Cadastre uma nova adesão de funcionário a um plano médico
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Adesão</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeMedicalPlanForm
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default EmployeeMedicalPlanNewPage;
