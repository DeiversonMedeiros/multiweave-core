import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompensationRequests, useCreateCompensationRequest, useUpdateCompensationRequest, useDeleteCompensationRequest, useApproveCompensationRequest, useRejectCompensationRequest } from '@/hooks/rh/useCompensationRequests';
import { CompensationRequest } from '@/integrations/supabase/rh-types';
import { CompensationDashboard } from '@/components/rh/CompensationDashboard';
import { CompensationRequestForm } from '@/components/rh/CompensationRequestForm';

import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function CompensationRequestsPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CompensationRequest | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    tipo: '',
    data_inicio: '',
    data_fim: '',
    quantidade_horas: 0,
    descricao: '',
    observacoes: ''
  });

  const isEditing = Boolean(id && id !== 'new');

  // Hooks
  const { data: requests = [], isLoading } = useCompensationRequests();
  const createMutation = useCreateCompensationRequest();
  const updateMutation = useUpdateCompensationRequest();
  const deleteMutation = useDeleteCompensationRequest();
  const approveMutation = useApproveCompensationRequest();
  const rejectMutation = useRejectCompensationRequest();

  useEffect(() => {
    if (isEditing && id) {
      // Buscar dados da solicitação específica se necessário
      // Por enquanto, vamos usar os dados já carregados pelo hook
    }
  }, [id, isEditing]);

  // Funções removidas - agora usando hooks

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ 
          id, 
          data: {
            ...formData,
            status: 'pendente'
          }
        });
        
        toast({
          title: 'Sucesso',
          description: 'Solicitação de compensação atualizada com sucesso!'
        });
      } else {
        await createMutation.mutateAsync({
          ...formData,
          status: 'pendente'
        });
        
        toast({
          title: 'Sucesso',
          description: 'Solicitação de compensação criada com sucesso!'
        });
      }

      setShowForm(false);
      setFormData({ 
        employee_id: '', 
        tipo: '', 
        data_inicio: '', 
        data_fim: '',
        quantidade_horas: 0, 
        descricao: '', 
        observacoes: '' 
      });
      
      if (isEditing) {
        navigate('/rh/compensation-requests');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar solicitação de compensação: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;

    try {
      await deleteMutation.mutateAsync(selectedRequest.id);
      
      toast({
        title: 'Sucesso',
        description: 'Solicitação de compensação excluída com sucesso!'
      });

      setShowDeleteDialog(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir solicitação de compensação: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await approveMutation.mutateAsync({ 
        id: requestId, 
        aprovadoPor: 'Sistema' // Em produção, usar o ID do usuário logado
      });

      toast({
        title: 'Aprovado',
        description: 'A solicitação de compensação foi aprovada.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar solicitação: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectMutation.mutateAsync({ 
        id: requestId, 
        motivoRejeicao: 'Rejeitado pelo sistema', // Em produção, permitir input do usuário
        aprovadoPor: 'Sistema' // Em produção, usar o ID do usuário logado
      });

      toast({
        title: 'Rejeitado',
        description: 'A solicitação de compensação foi rejeitada.'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao rejeitar solicitação: ' + error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pendente': 'secondary',
      'aprovado': 'default',
      'rejeitado': 'destructive',
      'compensado': 'default'
    } as const;

    const labels = {
      'pendente': 'Pendente',
      'aprovado': 'Aprovado',
      'rejeitado': 'Rejeitado',
      'compensado': 'Compensado'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="h-4 w-4" />;
      case 'aprovado':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4" />;
      case 'compensado':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(request =>
    request.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.tipo_compensacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing && !showForm) {
    return (

      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Solicitações de Compensação</h1>
            <p className="text-muted-foreground">Gestão de solicitações de compensação</p>
          </div>
        </div>
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Carregando solicitação...</p>
        </div>
      </div>
    );
  }

  return (
    
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Solicitações de Compensação</h1>
          <p className="text-muted-foreground">Gestão de solicitações de compensação de horas</p>
        </div>
        <Button onClick={() => {
          setFormData({ 
            funcionario_id: '', 
            tipo_compensacao: '', 
            data_compensacao: '', 
            horas_solicitadas: 0, 
            motivo: '', 
            observacoes: '' 
          });
          setShowForm(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por funcionário, tipo ou status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Compensação</CardTitle>
          <CardDescription>
            {filteredRequests.length} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Carregando solicitações...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Data Compensação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.funcionario_nome}</TableCell>
                    <TableCell>{request.tipo_compensacao}</TableCell>
                    <TableCell>{request.horas_solicitadas}h</TableCell>
                    <TableCell>
                      {request.data_compensacao 
                        ? new Date(request.data_compensacao).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {request.status === 'pendente' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(request.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/rh/compensation-requests/${request.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Solicitação' : 'Nova Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize as informações da solicitação de compensação.' 
                : 'Preencha as informações para criar uma nova solicitação de compensação.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="funcionario_id" className="text-right">
                  Funcionário
                </Label>
                <Input
                  id="funcionario_id"
                  value={formData.funcionario_id}
                  onChange={(e) => setFormData({ ...formData, funcionario_id: e.target.value })}
                  className="col-span-3"
                  placeholder="ID do funcionário"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tipo_compensacao" className="text-right">
                  Tipo
                </Label>
                <Input
                  id="tipo_compensacao"
                  value={formData.tipo_compensacao}
                  onChange={(e) => setFormData({ ...formData, tipo_compensacao: e.target.value })}
                  className="col-span-3"
                  placeholder="Ex: Banco de horas, Folga"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="data_compensacao" className="text-right">
                  Data Compensação
                </Label>
                <Input
                  id="data_compensacao"
                  type="date"
                  value={formData.data_compensacao}
                  onChange={(e) => setFormData({ ...formData, data_compensacao: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="horas_solicitadas" className="text-right">
                  Horas
                </Label>
                <Input
                  id="horas_solicitadas"
                  type="number"
                  value={formData.horas_solicitadas}
                  onChange={(e) => setFormData({ ...formData, horas_solicitadas: Number(e.target.value) })}
                  className="col-span-3"
                  min="0"
                  step="0.5"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="motivo" className="text-right">
                  Motivo
                </Label>
                <Textarea
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="observacoes" className="text-right">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="col-span-3"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a solicitação de compensação? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
