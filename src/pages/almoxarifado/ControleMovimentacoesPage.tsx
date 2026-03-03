import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Truck,
  Calendar,
  User,
} from 'lucide-react';
import { useMaterialExitRequests } from '@/hooks/approvals/useMaterialExitRequests';
import { useAlmoxarifados } from '@/hooks/almoxarifado/useAlmoxarifadosQuery';
import { useUsers } from '@/hooks/useUsers';
import { MaterialExitRequest } from '@/services/approvals/approvalService';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionButton } from '@/components/PermissionGuard';
import { toast } from 'sonner';

const ControleMovimentacoesPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterAlmoxarifado, setFilterAlmoxarifado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: saidas = [], isLoading, error, refetch, updateRequest } = useMaterialExitRequests({
    almoxarifado_id: filterAlmoxarifado !== 'todos' ? filterAlmoxarifado : undefined,
    status: filterStatus !== 'todos' ? filterStatus : undefined,
  });
  const { data: almoxarifadosData } = useAlmoxarifados();
  const { users = [] } = useUsers();

  const almoxarifados = Array.isArray(almoxarifadosData) ? almoxarifadosData : [];
  const filteredSaidas = saidas.filter((s) => {
    const matchSearch =
      !searchTerm ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.observacoes && s.observacoes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: typeof Clock; text: string }> = {
      pendente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendente aprovação' },
      aprovado: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Aprovado' },
      separado: { color: 'bg-indigo-100 text-indigo-800', icon: Package, text: 'Material separado' },
      aceito_tecnico: { color: 'bg-cyan-100 text-cyan-800', icon: User, text: 'Aceito pelo técnico' },
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

  const handleConfirmarSeparacao = async (saida: MaterialExitRequest) => {
    try {
      await updateRequest.mutateAsync({
        id: saida.id,
        data: { status: 'separado', data_separacao: new Date().toISOString() },
      });
      toast.success('Separação confirmada. O técnico pode visualizar em Meus Materiais.');
      refetch();
    } catch (e) {
      toast.error('Erro ao confirmar separação');
      console.error(e);
    }
  };

  const handleRegistrarEntrega = async (saida: MaterialExitRequest) => {
    try {
      await updateRequest.mutateAsync({
        id: saida.id,
        data: { status: 'entregue', data_saida: new Date().toISOString() },
      });
      toast.success('Entrega registrada. A saída constará no histórico de movimentações.');
      refetch();
    } catch (e) {
      toast.error('Erro ao registrar entrega');
      console.error(e);
    }
  };

  const getNome = (userId: string) => users.find((u) => u.id === userId)?.nome ?? userId?.slice(0, 8) ?? '—';
  const getAlmoxarifadoNome = (id: string) => almoxarifados.find((a) => a.id === id)?.nome ?? id?.slice(0, 8) ?? '—';

  return (
    <RequirePage pagePath="/almoxarifado/controle-movimentacoes*" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Truck className="h-8 w-8" />
                Controle de Movimentações
              </h1>
              <p className="text-gray-600">
                Visualize solicitações de saída de material, data prevista, status de aprovação e confirme separação e entrega.
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente aprovação</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="separado">Material separado</SelectItem>
                  <SelectItem value="aceito_tecnico">Aceito pelo técnico</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAlmoxarifado} onValueChange={setFilterAlmoxarifado}>
                <SelectTrigger>
                  <SelectValue placeholder="Almoxarifado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {almoxarifados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
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
              Erro ao carregar solicitações. Tente novamente.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            {filteredSaidas.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
                  <p className="text-muted-foreground">Ajuste os filtros ou aguarde novas solicitações.</p>
                </CardContent>
              </Card>
            ) : (
              filteredSaidas.map((saida) => (
                <Card key={saida.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">Solicitação #{saida.id.slice(0, 8)}</CardTitle>
                          <CardDescription>
                            Solicitado em {formatDateTime(saida.data_solicitacao)} • Receptor: {getNome(saida.funcionario_receptor_id)}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(saida.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span><strong>Data prevista saída:</strong> {formatDate(saida.data_prevista_saida) || '—'}</span>
                      </div>
                      <div>
                        <strong>Almoxarifado:</strong> {getAlmoxarifadoNome(saida.almoxarifado_id)}
                      </div>
                      <div>
                        <strong>Solicitante:</strong> {getNome(saida.funcionario_solicitante_id)}
                      </div>
                      <div>
                        <strong>Aprovação:</strong>{' '}
                        {saida.data_aprovacao ? formatDateTime(saida.data_aprovacao) : (saida.status === 'pendente' ? 'Aguardando gestor' : '—')}
                      </div>
                      {saida.data_separacao && (
                        <div>
                          <strong>Separação confirmada:</strong> {formatDateTime(saida.data_separacao)}
                        </div>
                      )}
                      {saida.data_aceite_tecnico && (
                        <div>
                          <strong>Aceite técnico:</strong> {formatDateTime(saida.data_aceite_tecnico)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {saida.status === 'aprovado' && (
                        <PermissionButton
                          page="/almoxarifado/controle-movimentacoes*"
                          action="edit"
                          onClick={() => handleConfirmarSeparacao(saida)}
                          disabled={updateRequest.isPending}
                        >
                          {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Confirmar separação do material
                        </PermissionButton>
                      )}
                      {saida.status === 'aceito_tecnico' && (
                        <PermissionButton
                          page="/almoxarifado/controle-movimentacoes*"
                          action="edit"
                          onClick={() => handleRegistrarEntrega(saida)}
                          disabled={updateRequest.isPending}
                        >
                          {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Registrar entrega ao técnico
                        </PermissionButton>
                      )}
                    </div>
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

export default ControleMovimentacoesPage;
