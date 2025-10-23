// =====================================================
// COMPONENTE: ABA DE CANDIDATOS
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
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { useCandidates } from '@/hooks/rh/useRecruitment';
import { CandidateFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidateForm } from './forms/CandidateForm';

export function CandidatesTab() {
  const [filters, setFilters] = useState<CandidateFilters>({});
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: candidates, isLoading } = useCandidates(filters);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: 'default' as const, label: 'Ativo' },
      inativo: { variant: 'secondary' as const, label: 'Inativo' },
      contratado: { variant: 'default' as const, label: 'Contratado' },
      descartado: { variant: 'destructive' as const, label: 'Descartado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSourceBadge = (source: string) => {
    const sourceConfig = {
      site: { variant: 'secondary' as const, label: 'Site' },
      linkedin: { variant: 'default' as const, label: 'LinkedIn' },
      indicacao: { variant: 'default' as const, label: 'Indicação' },
      agencia: { variant: 'default' as const, label: 'Agência' },
      outro: { variant: 'outline' as const, label: 'Outro' }
    };
    
    const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.outro;
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
                  placeholder="Nome, email, telefone..."
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
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="contratado">Contratado</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Origem</label>
              <Select
                value={filters.source || ''}
                onValueChange={(value) => setFilters({ ...filters, source: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="agencia">Agência</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cidade</label>
              <Input
                placeholder="Nome da cidade"
                value={filters.city || ''}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Candidatos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Candidatos</CardTitle>
            <CardDescription>
              {candidates?.length || 0} candidatos encontrados
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Novo Candidato</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Candidato</DialogTitle>
                <DialogDescription>
                  Cadastre um novo candidato no sistema
                </DialogDescription>
              </DialogHeader>
              <CandidateForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates?.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {candidate.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {candidate.email}
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {candidate.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(candidate.status)}
                  </TableCell>
                  <TableCell>
                    {getSourceBadge(candidate.source)}
                  </TableCell>
                  <TableCell>
                    {candidate.city && candidate.state ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {candidate.city}, {candidate.state}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(candidate.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                        <DropdownMenuItem onClick={() => setSelectedCandidate(candidate)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedCandidate(candidate)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {candidate.linkedin_url && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={candidate.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              LinkedIn
                            </a>
                          </DropdownMenuItem>
                        )}
                        {candidate.portfolio_url && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={candidate.portfolio_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Portfolio
                            </a>
                          </DropdownMenuItem>
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
    </div>
  );
}
