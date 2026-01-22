import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Plus } from 'lucide-react';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function RecruitmentPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  return (
    <RequirePage pagePath="/rh/RecruitmentPage*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recrutamento</h1>
          <p className="text-muted-foreground">
            Processo seletivo e recrutamento de novos funcionários
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Vaga
        </Button>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Processo Seletivo
          </CardTitle>
          <CardDescription>
            Gestão de vagas, candidatos e processo de seleção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-muted-foreground mb-4">
              Esta funcionalidade está sendo implementada como parte da Fase 5 do plano de desenvolvimento.
            </p>
            <div className="text-sm text-muted-foreground">
              <p><strong>Funcionalidades planejadas:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Cadastro de vagas</li>
                <li>Gestão de candidatos</li>
                <li>Processo de seleção</li>
                <li>Entrevistas e avaliações</li>
                <li>Contratação de funcionários</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequirePage>
  );
}

