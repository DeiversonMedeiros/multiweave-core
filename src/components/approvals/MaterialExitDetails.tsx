import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, User, Building2, DollarSign, Calendar, FolderOpen } from 'lucide-react';
import { useMaterialExitRequest } from '@/hooks/approvals/useMaterialExitRequests';
import { useUsers } from '@/hooks/useUsers';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';

interface MaterialExitDetailsProps {
  requestId: string;
}

export function MaterialExitDetails({ requestId }: MaterialExitDetailsProps) {
  const { data: request, isLoading } = useMaterialExitRequest(requestId);
  const { users = [] } = useUsers();
  const { data: almoxarifadosList } = useAlmoxarifados();
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();

  const almoxarifados = Array.isArray(almoxarifadosList) ? almoxarifadosList : [];
  const costCenters = costCentersData?.data ?? [];
  const projects = projectsData?.data ?? [];

  const solicitanteNome = request ? users.find((u) => u.id === request.funcionario_solicitante_id)?.nome ?? request.funcionario_solicitante_id : '';
  const receptorNome = request ? users.find((u) => u.id === request.funcionario_receptor_id)?.nome ?? request.funcionario_receptor_id : '';
  const almoxarifadoNome = request ? almoxarifados.find((a) => a.id === request.almoxarifado_id)?.nome ?? request.almoxarifado_id : '';
  const centroCustoNome = request?.centro_custo_id ? costCenters.find((cc: { id: string }) => cc.id === request.centro_custo_id)?.nome : null;
  const projetoNome = request?.projeto_id ? projects.find((p: { id: string }) => p.id === request.projeto_id)?.nome : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Solicitação não encontrada.
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';

  return (
    <div className="border-t pt-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Detalhes da Solicitação de Saída de Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Solicitante</span>
                <span className="font-medium">{solicitanteNome || '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Receptor (quem recebe o material)</span>
                <span className="font-medium">{receptorNome || '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Almoxarifado</span>
                <span className="font-medium">{almoxarifadoNome || '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Centro de custo</span>
                <span className="font-medium">{centroCustoNome ?? '—'}</span>
              </div>
            </div>
            {projetoNome && (
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block">Projeto</span>
                  <span className="font-medium">{projetoNome}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Valor total</span>
                <span className="font-medium">{formatCurrency(Number(request.valor_total) || 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="text-muted-foreground block">Data solicitação</span>
                <span className="font-medium">{formatDate(request.data_solicitacao)}</span>
              </div>
            </div>
            {request.data_prevista_saida && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block">Data prevista saída</span>
                  <span className="font-medium">{formatDate(request.data_prevista_saida)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status:</span>
            <Badge variant={request.status === 'aprovado' || request.status === 'entregue' ? 'default' : request.status === 'rejeitado' ? 'destructive' : 'secondary'}>
              {request.status === 'separado' ? 'Material separado' : request.status === 'aceito_tecnico' ? 'Aceito pelo técnico' : request.status}
            </Badge>
          </div>
          {request.observacoes && (
            <div className="text-sm">
              <span className="text-muted-foreground block">Observações</span>
              <p className="mt-1">{request.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
