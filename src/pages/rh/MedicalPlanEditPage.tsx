// =====================================================
// PÁGINA PARA EDITAR PLANO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart } from 'lucide-react';
import MedicalPlanForm from '@/components/rh/MedicalPlanForm';
import { useMedicalPlan, useUpdateMedicalPlan } from '@/hooks/rh/useMedicalAgreements';
import { MedicalPlanUpdateData } from '@/integrations/supabase/rh-types';

const MedicalPlanEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, error } = useMedicalPlan(id!);
  const updateMutation = useUpdateMedicalPlan();

  const handleSubmit = async (data: Omit<MedicalPlanUpdateData, 'company_id'>) => {
    try {
      await updateMutation.mutateAsync(data);
      navigate('/rh/medical-agreements');
    } catch (error) {
      console.error('Erro ao atualizar plano médico:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando plano...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar plano: {error?.message || 'Plano não encontrado'}
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/rh/medical-agreements')}>
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
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
            Editar Plano Médico
          </h1>
          <p className="text-muted-foreground">
            Editando: {plan.nome}
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
            initialData={plan}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalPlanEditPage;
