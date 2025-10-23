// =====================================================
// COMPONENTE: ABA DE BANCO DE TALENTOS
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
  Calendar,
  User,
  Database,
  Star,
  CheckCircle
} from 'lucide-react';
import { useTalentPool } from '@/hooks/rh/useRecruitment';
import { TalentPoolFilters } from '@/integrations/supabase/recruitment-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TalentPoolForm } from './forms/TalentPoolForm';

export function TalentPoolTab() {
  const [filters, setFilters] = useState<TalentPoolFilters>({});
  const [selectedTalent, setSelectedTalent] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: talents, isLoading } = useTalentPool(filters);

  const getAvailabilityBadge = (availability: string) => {
    const availabilityConfig = {
      disponivel: { variant: 'default' as const, label: 'Disponível' },
      interessado: { variant: 'secondary' as const, label: 'Interessado' },
      indisponivel: { variant: 'outline' as const, label: 'Indisponível' }
    };
    
    const config = availabilityConfig[availability as keyof typeof availabilityConfig] || availabilityConfig.disponivel;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getExperienceBadge = (experience: string) => {
    const experienceConfig = {
      junior: { variant: 'secondary' as const, label: 'Júnior' },
      pleno: { variant: 'default' as const, label: 'Pleno' },
      senior: { variant: 'default' as const, label: 'Sênior' },
      especialista: { variant: 'default' as const, label: 'Especialista' }
    };
    
    const config = experienceConfig[experience as keyof typeof experienceConfig] || experienceConfig.junior;
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
                  placeholder="Nome, categoria, habilidades..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Input
                placeholder="Ex: Tecnologia"
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nível de Experiência</label>
              <Select
                value={filters.experience_level || ''}
                onValueChange={(value) => setFilters({ ...filters, experience_level: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="junior">Júnior</SelectItem>
                  <SelectItem value="pleno">Pleno</SelectItem>
                  <SelectItem value="senior">Sênior</SelectItem>
                  <SelectItem value="especialista">Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Disponibilidade</label>
              <Select
                value={filters.availability || ''}
                onValueChange={(value) => setFilters({ ...filters, availability: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as disponibilidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as disponibilidades</SelectItem>
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="indisponivel">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Talentos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Banco de Talentos</CardTitle>
            <CardDescription>
              {talents?.length || 0} talentos encontrados
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>Adicionar Talento</Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar ao Banco de Talentos</DialogTitle>
                <DialogDescription>
                  Adicione um candidato ao banco de talentos
                </DialogDescription>
              </DialogHeader>
              <TalentPoolForm onSuccess={() => setShowForm(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead>Habilidades</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {talents?.map((talent) => (
                <TableRow key={talent.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {talent.candidate_name || 'Candidato'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      {talent.category}
                    </div>
                  </TableCell>
                  <TableCell>
                    {talent.experience_level ? getExperienceBadge(talent.experience_level) : '-'}
                  </TableCell>
                  <TableCell>
                    {getAvailabilityBadge(talent.availability)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {talent.skills?.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {talent.skills && talent.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{talent.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(talent.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                        <DropdownMenuItem onClick={() => setSelectedTalent(talent)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedTalent(talent)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Star className="h-4 w-4 mr-2" />
                          Favoritar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Contratar
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
