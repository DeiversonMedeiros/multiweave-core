import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function VacationsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  return (
    <RequireEntity entityName="vacations" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Férias e Licenças</h1>
          <p className="text-muted-foreground">
            Gerencie as férias e licenças dos funcionários
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
          <CardDescription>
            Controle de férias, licenças e afastamentos dos funcionários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-muted-foreground mb-4">
              Esta funcionalidade está sendo implementada como parte da Fase 5 do plano de desenvolvimento.
            </p>
            <div className="text-sm text-muted-foreground">
              <p><strong>Funcionalidades planejadas:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Solicitação de férias</li>
                <li>Aprovação de licenças</li>
                <li>Controle de saldo de férias</li>
                <li>Integração com folha de pagamento</li>
                <li>Relatórios de férias</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireModule>
  );
}

