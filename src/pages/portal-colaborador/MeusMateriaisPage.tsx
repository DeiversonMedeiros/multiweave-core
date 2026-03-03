import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Calendar,
  Building2,
} from 'lucide-react';
import { useMaterialExitRequests } from '@/hooks/approvals/useMaterialExitRequests';
import { useAuth } from '@/lib/auth-context';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useUsers } from '@/hooks/useUsers';
import { MaterialExitRequest } from '@/services/approvals/approvalService';
import { RequirePage } from '@/components/RequireAuth';
import { toast } from 'sonner';

const MeusMateriaisPage: React.FC = () => {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const { data: saidas = [], isLoading, error, refetch, updateRequest } = useMaterialExitRequests({
    funcionario_receptor_id: user?.id ?? undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });
  const { data: almoxarifadosData } = useAlmoxarifados();
  const { users = [] } = useUsers();

  const almoxarifados = Array.isArray(almoxarifadosData) ? almoxarifadosData : [];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: typeof Clock; text: string }> = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Aguardando aprovação' },
      aprovado: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Aprovado – aguardando separação' },
      separado: { color: 'bg-indigo-100 text-indigo-800', icon: Package, text: 'Material separado – pode retirar' },
      aceito_tecnico: { color: 'bg-cyan-100 text-cyan-800', icon: CheckCircle, text: 'Aceito – aguardando entrega' },
      entregue: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Entregue' },
      rejeitado: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Rejeitado' },
      cancelado: { color: 'bg-gray-100 text-gray-800', icon: XCircle, text: 'Cancelado' },
    };
    const c = config[status] || config.pendente;
    const Icon = c.icon;
    return (
      <Badge className={c.color}>
        <Icon className="h-3 w-3 mr-1" />
        {c.text}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | undefined) =>
    dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { dateStyle: 'short' }) : '—';
  const formatDateTime = (dateStr: string | undefined) =>
    dateStr ? new Date(dateStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const handleAceiteMaterial = async (saida: MaterialExitRequest) => {
    try {
      await updateRequest.mutateAsync({
        id: saida.id,
        data: { status: 'aceito_tecnico', data_aceite_tecnico: new Date().toISOString() },
      });
      toast.success('Aceite registrado. O almoxarife será notificado para realizar a entrega.');
      refetch();
    } catch (e) {
      toast.error('Erro ao registrar aceite');
      console.error(e);
    }
  };

  const getNome = (userId: string) => users.find((u) => u.id === userId)?.nome ?? userId?.slice(0, 8) ?? '—';
  const getAlmoxarifadoNome = (id: string) => almoxarifados.find((a) => a.id === id)?.nome ?? id?.slice(0, 8) ?? '—';

  return (
    <RequirePage pagePath="/portal-colaborador/meus-materiais*" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Package className="h-8 w-8" />
            Meus Materiais
          </h1>
          <p className="text-gray-600">
            Solicitações de saída de material em seu nome. Acompanhe o status e dê aceite quando o material estiver separado.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Aguardando aprovação</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="separado">Material separado</SelectItem>
                  <SelectItem value="aceito_tecnico">Aceito</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}
        {error && (
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erro ao carregar suas solicitações. Tente novamente.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {saidas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação em seu nome</h3>
                  <p className="text-muted-foreground">
                    As solicitações de saída de material em que você é o receptor aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              saidas.map((saida) => (
                <Card key={saida.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">Solicitação #{saida.id.slice(0, 8)}</CardTitle>
                          <CardDescription>
                            Solicitado em {formatDateTime(saida.data_solicitacao)} • Solicitante: {getNome(saida.funcionario_solicitante_id)}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(saida.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Almoxarifado: {getAlmoxarifadoNome(saida.almoxarifado_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Data prevista: {formatDate(saida.data_prevista_saida) || '—'}</span>
                      </div>
                      {saida.data_separacao && (
                        <div>
                          <strong>Material separado em:</strong> {formatDateTime(saida.data_separacao)}
                        </div>
                      )}
                    </div>
                    {saida.status === 'separado' && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground mb-2">
                          O material foi separado. Dirija-se ao almoxarifado e confirme o aceite abaixo.
                        </p>
                        <Button
                          onClick={() => handleAceiteMaterial(saida)}
                          disabled={updateRequest.isPending}
                        >
                          {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Dar aceite no material
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </RequirePage>
  );
};

export default MeusMateriaisPage;
