// =====================================================
// PÁGINA PARA EDITAR CONVÊNIO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';
import MedicalAgreementForm from '@/components/rh/MedicalAgreementForm';
import { useMedicalAgreement, useUpdateMedicalAgreement } from '@/hooks/rh/useMedicalAgreements';
import { MedicalAgreementUpdateData } from '@/integrations/supabase/rh-types';

const MedicalAgreementEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: agreement, isLoading, error } = useMedicalAgreement(id!);
  const updateMutation = useUpdateMedicalAgreement();

  const handleSubmit = async (data: MedicalAgreementUpdateData) => {
    try {
      await updateMutation.mutateAsync(data);
      navigate('/rh/medical-agreements');
    } catch (error) {
      console.error('Erro ao atualizar convênio médico:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando convênio...</div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar convênio: {error?.message || 'Convênio não encontrado'}
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
            <Building2 className="h-8 w-8" />
            Editar Convênio Médico
          </h1>
          <p className="text-muted-foreground">
            Editando: {agreement.nome}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Convênio</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalAgreementForm
            initialData={agreement}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalAgreementEditPage;
