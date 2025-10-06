// =====================================================
// PÁGINA PARA CRIAR NOVA FILIAÇÃO SINDICAL
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import EmployeeUnionMembershipForm from '@/components/rh/EmployeeUnionMembershipForm';
import { useCreateEmployeeUnionMembership } from '@/hooks/rh/useUnions';
import { EmployeeUnionMembershipCreateData } from '@/integrations/supabase/rh-types';

const EmployeeUnionMembershipNewPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateEmployeeUnionMembership();

  const handleSubmit = async (data: EmployeeUnionMembershipCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/unions');
    } catch (error) {
      console.error('Erro ao criar filiação sindical:', error);
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
            <Users className="h-8 w-8" />
            Nova Filiação Sindical
          </h1>
          <p className="text-muted-foreground">
            Cadastre uma nova filiação de funcionário a um sindicato
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Filiação</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeUnionMembershipForm
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeUnionMembershipNewPage;
