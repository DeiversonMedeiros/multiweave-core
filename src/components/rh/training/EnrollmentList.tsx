import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Ban,
  User,
  Calendar,
  Mail,
  Building
} from 'lucide-react';
import { useEnrollment } from '@/hooks/rh/useEnrollment';
import { useCompany } from '@/lib/company-context';
import EnrollmentActions from './EnrollmentActions';

interface EnrollmentListProps {
  trainingId?: string;
  onEnroll: (trainingId: string) => void;
  onView: (enrollmentId: string) => void;
}

interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  data_inscricao: string;
  status: 'inscrito' | 'aprovado' | 'rejeitado' | 'cancelado';
  observacoes?: string;
  justificativa_cancelamento?: string;
  created_at: string;
  updated_at: string;
  training?: {
    id: string;
    nome: string;
    data_inicio: string;
    data_fim?: string;
    local?: string;
    vagas_totais: number;
    vagas_disponiveis: number;
  };
  employee?: {
    id: string;
    nome: string;
    email: string;
    cargo?: string;
    departamento?: string;
  };
}

const EnrollmentList: React.FC<EnrollmentListProps> = ({ trainingId, onEnroll, onView }) => {
  const { selectedCompany } = useCompany();
  const { enrollments, isLoading, error, approveEnrollment, rejectEnrollment, cancelEnrollment } = useEnrollment(selectedCompany?.id || '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollment | null>(null);
  const [showActions, setShowActions] = useState(false);

  // Filtrar inscrições
  const filteredEnrollments = enrollments?.filter(enrollment => {
    const matchesSearch = 
      enrollment.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.employee?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.training?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
    const matchesTraining = !trainingId || enrollment.training_id === trainingId;
    
    return matchesSearch && matchesStatus && matchesTraining;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      inscrito: { label: 'Inscrito', variant: 'default' as const },
      aprovado: { label: 'Aprovado', variant: 'secondary' as const },
      rejeitado: { label: 'Rejeitado', variant: 'destructive' as const },
      cancelado: { label: 'Cancelado', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inscrito;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleApprove = (enrollment: TrainingEnrollment) => {
    approveEnrollment(enrollment.id);
  };

  const handleReject = (enrollment: TrainingEnrollment) => {
    setSelectedEnrollment(enrollment);
    setShowActions(true);
  };

  const handleCancel = (enrollment: TrainingEnrollment) => {
    setSelectedEnrollment(enrollment);
    setShowActions(true);
  };

  const handleActionConfirm = (action: 'reject' | 'cancel', reason: string) => {
    if (selectedEnrollment) {
      if (action === 'reject') {
        rejectEnrollment(selectedEnrollment.id, reason);
      } else {
        cancelEnrollment(selectedEnrollment.id, reason);
      }
    }
    setShowActions(false);
    setSelectedEnrollment(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Erro ao carregar inscrições: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Inscrições</span>
            {trainingId && (
              <Button onClick={() => onEnroll(trainingId)}>
                <User className="h-4 w-4 mr-2" />
                Nova Inscrição
              </Button>
            )}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar inscrições..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="inscrito">Inscrito</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma inscrição encontrada</p>
              <p className="text-sm">Tente ajustar os filtros ou criar uma nova inscrição</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Data Inscrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{enrollment.employee?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {enrollment.employee?.email}
                          </div>
                          {enrollment.employee?.cargo && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {enrollment.employee.cargo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{enrollment.training?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {enrollment.training?.data_inicio && formatDate(enrollment.training.data_inicio)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(enrollment.data_inscricao)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(enrollment.status)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {enrollment.observacoes || '-'}
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
                            <DropdownMenuItem onClick={() => onView(enrollment.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            {enrollment.status === 'inscrito' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(enrollment)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(enrollment)}>
                                  <X className="h-4 w-4 mr-2" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>
                            )}
                            {(enrollment.status === 'aprovado' || enrollment.status === 'inscrito') && (
                              <DropdownMenuItem onClick={() => handleCancel(enrollment)}>
                                <Ban className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Ações */}
      {showActions && selectedEnrollment && (
        <EnrollmentActions
          enrollment={selectedEnrollment}
          onApprove={() => handleApprove(selectedEnrollment)}
          onReject={(reason) => handleActionConfirm('reject', reason)}
          onCancel={(reason) => handleActionConfirm('cancel', reason)}
          onClose={() => {
            setShowActions(false);
            setSelectedEnrollment(null);
          }}
        />
      )}
    </>
  );
};

export default EnrollmentList;
