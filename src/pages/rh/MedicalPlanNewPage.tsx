// =====================================================
// PÁGINA PARA CRIAR NOVO PLANO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';
import MedicalPlanForm from '@/components/rh/MedicalPlanForm';
import { useCreateMedicalPlan } from '@/hooks/rh/useMedicalAgreements';
import { MedicalPlanCreateData } from '@/integrations/supabase/rh-types';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const MedicalPlanNewPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateMedicalPlan();

  const handleSubmit = async (data: Omit<MedicalPlanCreateData, 'company_id'>) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/medical-agreements');
    } catch (error) {
      console.error('Erro ao criar plano médico:', error);
    }
  };

  return (
    <RequireEntity entityName="medical_plans" action="read">
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
            <Heart className="h-8 w-8" />
            Novo Plano Médico
          </h1>
          <p className="text-muted-foreground">
            Cadastre um novo plano médico ou odontológico
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalPlanForm
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default MedicalPlanNewPage;
