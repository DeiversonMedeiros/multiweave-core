// =====================================================
// PÁGINA PARA EDITAR PREMIAÇÃO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift } from 'lucide-react';
import AwardProductivityForm from '@/components/rh/AwardProductivityForm';
import { useAwardProductivity, useUpdateAwardProductivity } from '@/hooks/rh/useAwardsProductivity';
import { AwardProductivityUpdateData } from '@/integrations/supabase/rh-types';

const AwardProductivityEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: award, isLoading, error } = useAwardProductivity(id!);
  const updateMutation = useUpdateAwardProductivity();

  const handleSubmit = async (data: AwardProductivityUpdateData) => {
    try {
      await updateMutation.mutateAsync(data);
      navigate('/rh/awards-productivity');
    } catch (error) {
      console.error('Erro ao atualizar premiação:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando premiação...</div>
      </div>
    );
  }

  if (error || !award) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar premiação: {error?.message || 'Premiação não encontrada'}
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/rh/awards-productivity')}>
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
          onClick={() => navigate('/rh/awards-productivity')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Editar Premiação
          </h1>
          <p className="text-muted-foreground">
            Editando: {award.nome}
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
            initialData={award}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AwardProductivityEditPage;
