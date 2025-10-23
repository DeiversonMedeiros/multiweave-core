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
  Edit, 
  Trash2,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle
} from 'lucide-react';
import { useAttendance } from '@/hooks/rh/useAttendance';
import { useCompany } from '@/lib/company-context';
import AttendanceForm from './AttendanceForm';

interface AttendanceListProps {
  trainingId?: string;
  date?: string;
  onEdit: (attendance: any) => void;
  onBulkEdit: (trainingId: string, date: string) => void;
}

interface TrainingAttendance {
  id: string;
  enrollment_id: string;
  data_presenca: string;
  presente: boolean;
  tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada?: string;
  hora_saida?: string;
  observacoes?: string;
  responsavel_registro?: string;
  created_at: string;
  updated_at: string;
  enrollment?: {
    id: string;
    training_id: string;
    employee_id: string;
    status: string;
    training?: {
      id: string;
      nome: string;
      data_inicio: string;
      data_fim?: string;
      local?: string;
    };
    employee?: {
      id: string;
      nome: string;
      email: string;
      cargo?: string;
    };
  };
}

const AttendanceList: React.FC<AttendanceListProps> = ({ trainingId, date, onEdit, onBulkEdit }) => {
  const { selectedCompany } = useCompany();
  const { attendanceRecords, isLoading, error } = useAttendance(selectedCompany?.id || '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAttendance, setSelectedAttendance] = useState<TrainingAttendance | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filtrar registros de presença
  const filteredAttendance = attendanceRecords?.filter(attendance => {
    const matchesSearch = 
      attendance.enrollment?.employee?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.enrollment?.employee?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.enrollment?.training?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || attendance.tipo_presenca === statusFilter;
    const matchesTraining = !trainingId || attendance.enrollment?.training_id === trainingId;
    const matchesDate = !date || attendance.data_presenca === date;
    
    return matchesSearch && matchesStatus && matchesTraining && matchesDate;
  }) || [];

  const getStatusBadge = (tipo: string, presente: boolean) => {
    if (!presente) {
      return <Badge variant="destructive">Ausente</Badge>;
    }

    const statusConfig = {
      presente: { label: 'Presente', variant: 'default' as const, icon: CheckCircle },
      atrasado: { label: 'Atrasado', variant: 'secondary' as const, icon: AlertCircle },
      saida_antecipada: { label: 'Saída Antecipada', variant: 'outline' as const, icon: MinusCircle },
      ausente: { label: 'Ausente', variant: 'destructive' as const, icon: XCircle }
    };
    
    const config = statusConfig[tipo as keyof typeof statusConfig] || statusConfig.presente;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAttendancePercentage = (enrollmentId: string) => {
    const enrollmentAttendance = attendanceRecords?.filter(
      a => a.enrollment_id === enrollmentId
    ) || [];
    
    if (enrollmentAttendance.length === 0) return 0;
    
    const presentCount = enrollmentAttendance.filter(a => a.presente).length;
    return Math.round((presentCount / enrollmentAttendance.length) * 100);
  };

  const handleEdit = (attendance: TrainingAttendance) => {
    setSelectedAttendance(attendance);
    setShowForm(true);
  };

  const handleBulkEdit = () => {
    if (trainingId && date) {
      onBulkEdit(trainingId, date);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedAttendance(null);
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
            <p>Erro ao carregar presenças: {error.message}</p>
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
            <span>Controle de Presença</span>
            {trainingId && date && (
              <Button onClick={handleBulkEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edição em Lote
              </Button>
            )}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar presenças..."
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
                  <SelectItem value="presente">Presente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="saida_antecipada">Saída Antecipada</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum registro de presença encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou criar um novo registro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Horários</TableHead>
                    <TableHead>% Presença</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attendance.enrollment?.employee?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {attendance.enrollment?.employee?.email}
                          </div>
                          {attendance.enrollment?.employee?.cargo && (
                            <div className="text-sm text-gray-500">
                              {attendance.enrollment.employee.cargo}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attendance.enrollment?.training?.nome}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {attendance.enrollment?.training?.data_inicio && 
                              formatDate(attendance.enrollment.training.data_inicio)
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(attendance.data_presenca)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(attendance.tipo_presenca, attendance.presente)}
                      </TableCell>
                      <TableCell>
                        {attendance.hora_entrada && attendance.hora_saida ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(attendance.hora_entrada)} - {formatTime(attendance.hora_saida)}
                            </div>
                          </div>
                        ) : attendance.hora_entrada ? (
                          <div className="text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(attendance.hora_entrada)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {calculateAttendancePercentage(attendance.enrollment_id)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {attendance.observacoes || '-'}
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
                            <DropdownMenuItem onClick={() => handleEdit(attendance)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => console.log('Deletar:', attendance.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
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

      {/* Modal de Edição */}
      {showForm && selectedAttendance && (
        <AttendanceForm
          attendance={selectedAttendance}
          onSave={handleFormClose}
          onCancel={handleFormClose}
        />
      )}
    </>
  );
};

export default AttendanceList;
