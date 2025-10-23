// =====================================================
// COMPONENTE: ABA DE VAGAS ABERTAS
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
  Building
} from 'lucide-react';
import { useJobOpenings } from '@/hooks/rh/useRecruitment';
import { JobOpeningFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { JobOpeningForm } from './forms/JobOpeningForm';

export function JobOpeningsTab() {
  const [filters, setFilters] = useState<JobOpeningFilters>({});
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: openings, isLoading } = useJobOpenings(filters);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      aberta: { variant: 'default' as const, label: 'Aberta' },
      pausada: { variant: 'secondary' as const, label: 'Pausada' },
      fechada: { variant: 'outline' as const, label: 'Fechada' },
      preenchida: { variant: 'default' as const, label: 'Preenchida' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.aberta;
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
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                  <SelectItem value="preenchida">Preenchida</SelectItem>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Criado por</label>
              <Input
                placeholder="Nome do usuário"
                value={filters.created_by || ''}
                onChange={(e) => setFilters({ ...filters, created_by: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vagas Abertas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vagas Abertas</CardTitle>
            <CardDescription>
              {openings?.length || 0} vagas encontradas
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Nova Vaga</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Vaga Aberta</DialogTitle>
                <DialogDescription>
                  Crie uma nova vaga para recrutamento
                </DialogDescription>
              </DialogHeader>
              <JobOpeningForm onSuccess={() => setShowForm(false)} />
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
                <TableHead>Criado por</TableHead>
                <TableHead>Publicada em</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openings?.map((opening) => (
                <TableRow key={opening.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {opening.position_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {opening.department_name || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(opening.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {opening.created_by_name || 'Usuário'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {opening.published_at 
                        ? format(new Date(opening.published_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {opening.status === 'aberta' && (
                        <Button variant="outline" size="sm">
                          <Pause className="h-3 w-3 mr-1" />
                          Pausar
                        </Button>
                      )}
                      {opening.status === 'pausada' && (
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Retomar
                        </Button>
                      )}
                      {opening.status === 'aberta' && (
                        <Button variant="outline" size="sm">
                          <Square className="h-3 w-3 mr-1" />
                          Fechar
                        </Button>
                      )}
                      {opening.status === 'aberta' && (
                        <Button variant="outline" size="sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Preencher
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
                        <DropdownMenuItem onClick={() => setSelectedOpening(opening)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedOpening(opening)}>
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
