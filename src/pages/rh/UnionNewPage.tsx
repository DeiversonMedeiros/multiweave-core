// =====================================================
// PÁGINA PARA CRIAR NOVO SINDICATO
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';
import UnionForm from '@/components/rh/UnionForm';
import { useCreateUnion } from '@/hooks/rh/useUnions';
import { UnionCreateData } from '@/integrations/supabase/rh-types';

const UnionNewPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateUnion();

  const handleSubmit = async (data: UnionCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/unions');
    } catch (error) {
      console.error('Erro ao criar sindicato:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/rh/unions')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Novo Sindicato
          </h1>
          <p className="text-muted-foreground">
            Cadastre um novo sindicato no sistema
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Sindicato</CardTitle>
        </CardHeader>
        <CardContent>
          <UnionForm
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UnionNewPage;
