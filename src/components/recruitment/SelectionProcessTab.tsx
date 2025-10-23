// =====================================================
// COMPONENTE: ABA DE PROCESSO SELETIVO
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
  Edit,
  Play,
  Pause,
  Square,
  CheckCircle,
  Calendar,
  User,
  Briefcase,
  Users
} from 'lucide-react';
import { useSelectionProcesses } from '@/hooks/rh/useRecruitment';
import { SelectionProcessFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectionProcessForm } from './forms/SelectionProcessForm';

export function SelectionProcessTab() {
  const [filters, setFilters] = useState<SelectionProcessFilters>({});
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: processes, isLoading } = useSelectionProcesses(filters);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: 'default' as const, label: 'Ativo' },
      pausado: { variant: 'secondary' as const, label: 'Pausado' },
      finalizado: { variant: 'outline' as const, label: 'Finalizado' },
      cancelado: { variant: 'destructive' as const, label: 'Cancelado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStageBadge = (stage: string) => {
    const stageConfig = {
      triagem: { variant: 'secondary' as const, label: 'Triagem' },
      entrevista_telefonica: { variant: 'default' as const, label: 'Entrevista Telefônica' },
      entrevista_presencial: { variant: 'default' as const, label: 'Entrevista Presencial' },
      teste_tecnico: { variant: 'default' as const, label: 'Teste Técnico' },
      entrevista_final: { variant: 'default' as const, label: 'Entrevista Final' },
      aprovacao: { variant: 'default' as const, label: 'Aprovação' }
    };
    
    const config = stageConfig[stage as keyof typeof stageConfig] || stageConfig.triagem;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
                  placeholder="Candidato, vaga..."
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
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa Atual</label>
              <Select
                value={filters.current_stage || ''}
                onValueChange={(value) => setFilters({ ...filters, current_stage: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  <SelectItem value="triagem">Triagem</SelectItem>
                  <SelectItem value="entrevista_telefonica">Entrevista Telefônica</SelectItem>
                  <SelectItem value="entrevista_presencial">Entrevista Presencial</SelectItem>
                  <SelectItem value="teste_tecnico">Teste Técnico</SelectItem>
                  <SelectItem value="entrevista_final">Entrevista Final</SelectItem>
                  <SelectItem value="aprovacao">Aprovação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vaga</label>
              <Input
                placeholder="ID ou nome da vaga"
                value={filters.job_opening_id || ''}
                onChange={(e) => setFilters({ ...filters, job_opening_id: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Processos Seletivos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Processos Seletivos</CardTitle>
            <CardDescription>
              {processes?.length || 0} processos encontrados
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Novo Processo</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Processo Seletivo</DialogTitle>
                <DialogDescription>
                  Inicie um novo processo de seleção
                </DialogDescription>
              </DialogHeader>
              <SelectionProcessForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead>Etapa Atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Iniciado em</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes?.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {process.candidate_name || 'Candidato'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {process.job_opening_name || 'Vaga'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStageBadge(process.current_stage)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(process.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(process.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {process.status === 'ativo' && (
                        <Button variant="outline" size="sm">
                          <Pause className="h-3 w-3 mr-1" />
                          Pausar
                        </Button>
                      )}
                      {process.status === 'pausado' && (
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Retomar
                        </Button>
                      )}
                      {process.status === 'ativo' && (
                        <Button variant="outline" size="sm">
                          <Square className="h-3 w-3 mr-1" />
                          Finalizar
                        </Button>
                      )}
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
                        <DropdownMenuItem onClick={() => setSelectedProcess(process)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedProcess(process)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
