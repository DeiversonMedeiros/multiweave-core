// =====================================================
// COMPONENTE: ABA DE SOLICITAÇÕES DE VAGAS
// =====================================================

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Check, 
  X, 
  Edit,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { useJobRequests, useApproveJobRequest, useRejectJobRequest } from '@/hooks/rh/useRecruitment';
import { JobRequestFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { JobRequestForm } from './forms/JobRequestForm';

export function JobRequestsTab() {
  const [filters, setFilters] = useState<JobRequestFilters>({});
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests, isLoading } = useJobRequests(filters);
  const approveMutation = useApproveJobRequest();
  const rejectMutation = useRejectJobRequest();

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (selectedRequest && rejectReason) {
      rejectMutation.mutate({ 
        id: selectedRequest.id, 
        reason: rejectReason 
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      solicitado: { variant: 'secondary' as const, label: 'Solicitado' },
      em_analise: { variant: 'default' as const, label: 'Em Análise' },
      aprovado: { variant: 'default' as const, label: 'Aprovado' },
      reprovado: { variant: 'destructive' as const, label: 'Reprovado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.solicitado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      baixa: { variant: 'secondary' as const, label: 'Baixa', color: 'text-green-600' },
      media: { variant: 'default' as const, label: 'Média', color: 'text-yellow-600' },
      alta: { variant: 'destructive' as const, label: 'Alta', color: 'text-orange-600' },
      critica: { variant: 'destructive' as const, label: 'Crítica', color: 'text-red-600' }
    };
    
    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.media;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome do cargo, departamento..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Urgência</label>
              <Select
                value={filters.urgency_level || ''}
                onValueChange={(value) => setFilters({ ...filters, urgency_level: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as urgências" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as urgências</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento</label>
              <Input
                placeholder="Nome do departamento"
                value={filters.department_name || ''}
                onChange={(e) => setFilters({ ...filters, department_name: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Solicitações de Vagas</CardTitle>
            <CardDescription>
              {requests?.length || 0} solicitações encontradas
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Nova Solicitação</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Solicitação de Vaga</DialogTitle>
                <DialogDescription>
                  Preencha os dados da nova vaga solicitada
                </DialogDescription>
              </DialogHeader>
              <JobRequestForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Solicitado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.position_name}
                  </TableCell>
                  <TableCell>
                    {request.department_name || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    {getUrgencyBadge(request.urgency_level)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {request.requested_by_name || 'Usuário'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(request.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {request.status === 'solicitado' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Aprovar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Rejeitar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Visualização/Edição */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest ? 'Visualizar Solicitação' : ''}
            </DialogTitle>
            <DialogDescription>
              Detalhes da solicitação de vaga
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cargo</label>
                  <p className="text-sm text-gray-600">{selectedRequest.position_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Departamento</label>
                  <p className="text-sm text-gray-600">{selectedRequest.department_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedRequest.status === 'aprovado' ? 'default' : 'secondary'}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Urgência</label>
                  <Badge variant={selectedRequest.urgency_level === 'critica' ? 'destructive' : 'outline'}>
                    {selectedRequest.urgency_level}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Solicitado por</label>
                  <p className="text-sm text-gray-600">{selectedRequest.requested_by_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Início Esperada</label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.expected_start_date ? 
                      new Date(selectedRequest.expected_start_date).toLocaleDateString('pt-BR') : 
                      'Não informada'
                    }
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Descrição do Cargo</label>
                <p className="text-sm text-gray-600 mt-1">{selectedRequest.job_description}</p>
              </div>
              {selectedRequest.requirements && (
                <div>
                  <label className="text-sm font-medium">Requisitos</label>
                  <p className="text-sm text-gray-600 mt-1">{selectedRequest.requirements}</p>
                </div>
              )}
              {selectedRequest.benefits && (
                <div>
                  <label className="text-sm font-medium">Benefícios</label>
                  <p className="text-sm text-gray-600 mt-1">{selectedRequest.benefits}</p>
                </div>
              )}
              {selectedRequest.salary_range && (
                <div>
                  <label className="text-sm font-medium">Faixa Salarial</label>
                  <p className="text-sm text-gray-600 mt-1">{selectedRequest.salary_range}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Fechar
            </Button>
            <Button onClick={() => {
              // Aqui você pode implementar a lógica de edição
              setSelectedRequest(null);
            }}>
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição da solicitação de vaga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da Rejeição</label>
              <Input
                placeholder="Digite o motivo da rejeição..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
