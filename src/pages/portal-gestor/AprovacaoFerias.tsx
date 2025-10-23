import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  CalendarDays
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface FeriasItem {
  id: string;
  employee_id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  dias_solicitados: number;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'em_andamento' | 'concluido';
  observacoes?: string;
  anexos?: string[];
  solicitado_por: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  saldo_ferias_disponivel: number;
  conflitos?: string[];
}

const AprovacaoFerias: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [selectedFerias, setSelectedFerias] = useState<FeriasItem | null>(null);
  const [aprovacaoObservacoes, setAprovacaoObservacoes] = useState('');
  const [rejeicaoObservacoes, setRejeicaoObservacoes] = useState('');
  const [isAprovacaoDialogOpen, setIsAprovacaoDialogOpen] = useState(false);
  const [isRejeicaoDialogOpen, setIsRejeicaoDialogOpen] = useState(false);

  // Mock data - em produção virá do Supabase
  const ferias: FeriasItem[] = [
    {
      id: '1',
      employee_id: 'emp1',
      funcionario_nome: 'João Silva',
      funcionario_matricula: '001',
      tipo: 'ferias',
      data_inicio: '2025-02-01',
      data_fim: '2025-02-15',
      dias_solicitados: 15,
      status: 'pendente',
      observacoes: 'Férias de verão',
      anexos: ['documento1.pdf'],
      solicitado_por: 'João Silva',
      created_at: '2025-01-10T10:30:00Z',
      saldo_ferias_disponivel: 30,
      conflitos: []
    },
    {
      id: '2',
      employee_id: 'emp2',
      funcionario_nome: 'Maria Santos',
      funcionario_matricula: '002',
      tipo: 'ferias',
      data_inicio: '2025-03-01',
      data_fim: '2025-03-10',
      dias_solicitados: 10,
      status: 'pendente',
      observacoes: 'Férias para viagem familiar',
      solicitado_por: 'Maria Santos',
      created_at: '2025-01-09T14:20:00Z',
      saldo_ferias_disponivel: 20,
      conflitos: ['João Silva - 2025-03-05 a 2025-03-07']
    },
    {
      id: '3',
      employee_id: 'emp3',
      funcionario_nome: 'Pedro Costa',
      funcionario_matricula: '003',
      tipo: 'ferias',
      data_inicio: '2025-01-15',
      data_fim: '2025-01-20',
      dias_solicitados: 6,
      status: 'aprovado',
      observacoes: 'Férias aprovadas',
      solicitado_por: 'Pedro Costa',
      aprovado_por: 'Gestor',
      aprovado_em: '2025-01-08T16:30:00Z',
      created_at: '2025-01-07T09:15:00Z',
      saldo_ferias_disponivel: 24,
      conflitos: []
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'em_andamento': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'concluido': return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'ferias': return 'Férias';
      case 'licenca_medica': return 'Licença Médica';
      case 'licenca_maternidade': return 'Licença Maternidade';
      case 'licenca_paternidade': return 'Licença Paternidade';
      case 'afastamento': return 'Afastamento';
      case 'outros': return 'Outros';
      default: return tipo;
    }
  };

  const filteredFerias = ferias.filter(feria => {
    const matchesSearch = feria.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feria.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || feria.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAprovar = (feria: FeriasItem) => {
    setSelectedFerias(feria);
    setAprovacaoObservacoes('');
    setIsAprovacaoDialogOpen(true);
  };

  const handleRejeitar = (feria: FeriasItem) => {
    setSelectedFerias(feria);
    setRejeicaoObservacoes('');
    setIsRejeicaoDialogOpen(true);
  };

  const confirmarAprovacao = () => {
    if (selectedFerias) {
      // Implementar lógica de aprovação
      console.log(`Aprovar férias ${selectedFerias.id}`, aprovacaoObservacoes);
      setIsAprovacaoDialogOpen(false);
      setSelectedFerias(null);
    }
  };

  const confirmarRejeicao = () => {
    if (selectedFerias && rejeicaoObservacoes.trim()) {
      // Implementar lógica de rejeição
      console.log(`Rejeitar férias ${selectedFerias.id}`, rejeicaoObservacoes);
      setIsRejeicaoDialogOpen(false);
      setSelectedFerias(null);
    }
  };

  const getFeriasPendentes = () => {
    return ferias.filter(f => f.status === 'pendente').length;
  };

  return (
    <RequireEntity entityName="vacation_approvals" action="read">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovação de Férias</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie solicitações de férias da sua equipe
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-yellow-600">
            {getFeriasPendentes()} Pendentes
          </Badge>
          <Button onClick={() => navigate('/portal-gestor/aprovacoes')}>
            Voltar para Central
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredFerias.length} solicitação(ões) de férias encontrada(s)
          </h2>
        </div>

        <div className="grid gap-6">
          {filteredFerias.map((feria) => (
            <Card key={feria.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5" />
                      <div>
                        <h3 className="font-semibold">{feria.funcionario_nome}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Matrícula: {feria.funcionario_matricula}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTipoLabel(feria.tipo)} • {feria.dias_solicitados} dias
                        </p>
                        <div className="flex items-center space-x-6 mt-3">
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(feria.data_inicio).toLocaleDateString('pt-BR')} - {new Date(feria.data_fim).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Saldo: {feria.saldo_ferias_disponivel} dias
                            </span>
                          </div>
                        </div>
                        {feria.observacoes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {feria.observacoes}
                          </p>
                        )}
                        {feria.conflitos && feria.conflitos.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600">
                              Conflito: {feria.conflitos.join(', ')}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado em: {new Date(feria.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(feria.status)}
                      <Badge className={getStatusColor(feria.status)}>
                        {feria.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFerias(feria)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {feria.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(feria)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRejeitar(feria)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFerias.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma solicitação de férias encontrada com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={isAprovacaoDialogOpen} onOpenChange={setIsAprovacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Férias</DialogTitle>
            <DialogDescription>
              Confirme a aprovação das férias de {selectedFerias?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFerias && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedFerias.funcionario_nome}</p>
                <p><strong>Período:</strong> {new Date(selectedFerias.data_inicio).toLocaleDateString('pt-BR')} - {new Date(selectedFerias.data_fim).toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias:</strong> {selectedFerias.dias_solicitados}</p>
                <p><strong>Saldo Disponível:</strong> {selectedFerias.saldo_ferias_disponivel} dias</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Adicione observações sobre a aprovação..."
                value={aprovacaoObservacoes}
                onChange={(e) => setAprovacaoObservacoes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAprovacaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarAprovacao} className="bg-green-600 hover:bg-green-700">
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejeicaoDialogOpen} onOpenChange={setIsRejeicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Férias</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição das férias de {selectedFerias?.funcionario_nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFerias && (
              <div className="space-y-2">
                <p><strong>Funcionário:</strong> {selectedFerias.funcionario_nome}</p>
                <p><strong>Período:</strong> {new Date(selectedFerias.data_inicio).toLocaleDateString('pt-BR')} - {new Date(selectedFerias.data_fim).toLocaleDateString('pt-BR')}</p>
                <p><strong>Dias:</strong> {selectedFerias.dias_solicitados}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Informe o motivo da rejeição..."
                value={rejeicaoObservacoes}
                onChange={(e) => setRejeicaoObservacoes(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejeicaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarRejeicao} 
              variant="destructive"
              disabled={!rejeicaoObservacoes.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </RequireEntity>
  );
};

export default AprovacaoFerias;
