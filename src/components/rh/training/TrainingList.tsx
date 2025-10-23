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
  Edit, 
  Trash2, 
  Users,
  Calendar,
  Clock,
  MapPin
} from 'lucide-react';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';

interface TrainingListProps {
  onEdit: (training: any) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

interface Training {
  id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  categoria: string;
  data_inicio: string;
  data_fim?: string;
  local?: string;
  vagas_totais: number;
  vagas_disponiveis: number;
  status: 'planejado' | 'inscricoes_abertas' | 'em_andamento' | 'concluido' | 'cancelado';
  is_active: boolean;
  created_at: string;
}

const TrainingList: React.FC<TrainingListProps> = ({ onEdit, onDelete, onView }) => {
  const { selectedCompany } = useCompany();
  const { trainings, isLoading, error } = useTraining(selectedCompany?.id || '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filtrar treinamentos
  const filteredTrainings = trainings?.filter(training => {
    const matchesSearch = training.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || training.status === statusFilter;
    const matchesType = typeFilter === 'all' || training.tipo === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planejado: { label: 'Planejado', variant: 'secondary' as const },
      inscricoes_abertas: { label: 'Inscrições Abertas', variant: 'default' as const },
      em_andamento: { label: 'Em Andamento', variant: 'destructive' as const },
      concluido: { label: 'Concluído', variant: 'outline' as const },
      cancelado: { label: 'Cancelado', variant: 'secondary' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planejado;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getVagasInfo = (total: number, disponiveis: number) => {
    const ocupadas = total - disponiveis;
    const percentual = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    return `${ocupadas}/${total} (${percentual}%)`;
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
            <p>Erro ao carregar treinamentos: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treinamentos</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar treinamentos..."
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
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="inscricoes_abertas">Inscrições Abertas</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hibrido">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredTrainings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum treinamento encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou criar um novo treinamento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{training.nome}</div>
                        {training.descricao && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {training.descricao}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{training.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(training.data_inicio)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {training.local ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-32">{training.local}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {getVagasInfo(training.vagas_totais, training.vagas_disponiveis)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(training.status)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(training.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(training)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(training.id)}
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
  );
};

export default TrainingList;
