import React, { useState } from 'react';
import { 
  Dependent, 
  DependentWithEmployee,
  getParentescoTypes,
  calculateAge,
  isValidDependentForIrrf,
  isValidDependentForBenefits
} from '@/integrations/supabase/rh-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Edit, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Trash2,
  User,
  UserCheck,
  UserX,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Heart,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DependentsListProps {
  dependents: DependentWithEmployee[];
  isLoading?: boolean;
  onEdit?: (dependent: Dependent) => void;
  onDelete?: (dependent: Dependent) => void;
  onActivate?: (dependent: Dependent) => void;
  onSuspend?: (dependent: Dependent) => void;
  onCreate?: () => void;
  showEmployeeInfo?: boolean;
}

export function DependentsList({
  dependents,
  isLoading = false,
  onEdit,
  onDelete,
  onActivate,
  onSuspend,
  onCreate,
  showEmployeeInfo = true
}: DependentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [parentescoFilter, setParentescoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Filtrar dependentes
  const filteredDependents = dependents.filter(dependent => {
    const matchesSearch = 
      dependent.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dependent.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dependent.cpf && dependent.cpf.includes(searchTerm)) ||
      (dependent.rg && dependent.rg.includes(searchTerm));

    const matchesParentesco = parentescoFilter === 'all' || dependent.parentesco === parentescoFilter;
    const matchesStatus = statusFilter === 'all' || dependent.status === statusFilter;

    return matchesSearch && matchesParentesco && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: 'default' as const, label: 'Ativo', icon: UserCheck },
      inativo: { variant: 'secondary' as const, label: 'Inativo', icon: UserX },
      suspenso: { variant: 'destructive' as const, label: 'Suspenso', icon: AlertTriangle },
      excluido: { variant: 'outline' as const, label: 'Excluído', icon: Trash2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getParentescoLabel = (parentesco: string) => {
    const parentescoTypes = getParentescoTypes();
    return parentescoTypes.find(p => p.value === parentesco)?.label || parentesco;
  };

  const getAge = (dataNascimento?: string) => {
    if (!dataNascimento) return null;
    return calculateAge(dataNascimento);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleDeleteClick = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedDependent && onDelete) {
      onDelete(selectedDependent);
    }
    setIsDeleteDialogOpen(false);
    setSelectedDependent(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dependentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar dependentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={parentescoFilter} onValueChange={setParentescoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Parentesco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os parentescos</SelectItem>
              {getParentescoTypes().map((parentesco) => (
                <SelectItem key={parentesco.value} value={parentesco.value}>
                  {parentesco.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="excluido">Excluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {onCreate && (
          <Button onClick={onCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Dependente
          </Button>
        )}
      </div>

      {/* Lista de Dependentes */}
      {filteredDependents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dependente encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || parentescoFilter !== 'all' || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece cadastrando um novo dependente.'}
            </p>
            {onCreate && (
              <Button onClick={onCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar Dependente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDependents.map((dependent) => {
            const age = getAge(dependent.data_nascimento);
            const isValidForIrrf = isValidDependentForIrrf(dependent);
            const isValidForBenefits = isValidDependentForBenefits(dependent);

            return (
              <Card key={dependent.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {dependent.nome}
                      </CardTitle>
                      {showEmployeeInfo && (
                        <p className="text-sm text-muted-foreground">
                          Funcionário: {dependent.funcionario_nome}
                          {dependent.funcionario_matricula && ` (${dependent.funcionario_matricula})`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(dependent.status)}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(dependent)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {dependent.status === 'ativo' && onSuspend && (
                            <DropdownMenuItem onClick={() => onSuspend(dependent)}>
                              <UserX className="h-4 w-4 mr-2" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          {dependent.status !== 'ativo' && onActivate && (
                            <DropdownMenuItem onClick={() => onActivate(dependent)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Ativar
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(dependent)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Informações Básicas */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">Informações Básicas</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Parentesco:</strong> {getParentescoLabel(dependent.parentesco)}</p>
                        {age !== null && <p><strong>Idade:</strong> {age} anos</p>}
                        {dependent.sexo && <p><strong>Sexo:</strong> {dependent.sexo}</p>}
                        {dependent.estado_civil && <p><strong>Estado Civil:</strong> {dependent.estado_civil}</p>}
                      </div>
                    </div>

                    {/* Documentos */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">Documentos</h4>
                      <div className="space-y-1 text-sm">
                        {dependent.cpf && <p><strong>CPF:</strong> {dependent.cpf}</p>}
                        {dependent.rg && <p><strong>RG:</strong> {dependent.rg}</p>}
                        {dependent.data_nascimento && (
                          <p><strong>Nascimento:</strong> {formatDate(dependent.data_nascimento)}</p>
                        )}
                      </div>
                    </div>

                    {/* Contato */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">Contato</h4>
                      <div className="space-y-1 text-sm">
                        {dependent.telefone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {dependent.telefone}
                          </p>
                        )}
                        {dependent.email && (
                          <p className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {dependent.email}
                          </p>
                        )}
                        {dependent.cidade && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {dependent.cidade}, {dependent.estado}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informações Especiais */}
                  {(dependent.possui_deficiencia || dependent.necessita_cuidados_especiais || 
                    dependent.escolaridade || dependent.instituicao_ensino) && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Informações Especiais</h4>
                      <div className="flex flex-wrap gap-2">
                        {dependent.possui_deficiencia && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Deficiência
                          </Badge>
                        )}
                        {dependent.necessita_cuidados_especiais && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            Cuidados Especiais
                          </Badge>
                        )}
                        {dependent.escolaridade && (
                          <Badge variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            {dependent.escolaridade}
                          </Badge>
                        )}
                        {dependent.instituicao_ensino && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {dependent.instituicao_ensino}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validações para IRRF e Benefícios */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isValidForIrrf ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={isValidForIrrf ? 'text-green-700' : 'text-red-700'}>
                          {isValidForIrrf ? 'Válido para IRRF' : 'Inválido para IRRF'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isValidForBenefits ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={isValidForBenefits ? 'text-green-700' : 'text-red-700'}>
                          {isValidForBenefits ? 'Válido para Benefícios' : 'Inválido para Benefícios'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o dependente <strong>{selectedDependent?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
