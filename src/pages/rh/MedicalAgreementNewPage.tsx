// =====================================================
// PÁGINA PARA CRIAR NOVO CONVÊNIO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';
import MedicalAgreementForm from '@/components/rh/MedicalAgreementForm';
import { useCreateMedicalAgreement } from '@/hooks/rh/useMedicalAgreements';
import { MedicalAgreementCreateData } from '@/integrations/supabase/rh-types';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const MedicalAgreementNewPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateMedicalAgreement();

  const handleSubmit = async (data: MedicalAgreementCreateData) => {
    try {
      await createMutation.mutateAsync(data);
      navigate('/rh/medical-agreements');
    } catch (error) {
      console.error('Erro ao criar convênio médico:', error);
    }
  };

  return (
    <RequireEntity entityName="medical_agreements" action="read">
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
            Novo Convênio Médico
          </h1>
          <p className="text-muted-foreground">
            Cadastre um novo convênio médico ou odontológico
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
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default MedicalAgreementNewPage;
