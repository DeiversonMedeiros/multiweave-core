import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Stethoscope, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useExamesGestor, ExameData } from '@/hooks/portal-gestor/useExamesGestor';

const AcompanhamentoExames: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  // Buscar dados reais do banco
  const { data: examesData = [], isLoading, error } = useExamesGestor();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizado': return 'bg-green-100 text-green-800';
      case 'agendado': return 'bg-blue-100 text-blue-800';
      case 'vencido': return 'bg-red-100 text-red-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realizado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'agendado': return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'vencido': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Stethoscope className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'Exame Admissional': return 'Admissional';
      case 'Exame Periódico': return 'Periódico';
      case 'Exame Demissional': return 'Demissional';
      case 'Exame de Retorno ao Trabalho': return 'Retorno';
      case 'Exame de Mudança de Função': return 'Mudança de Função';
      default: return tipo;
    }
  };

  const filteredExames = examesData.filter(exame => {
    const matchesSearch = exame.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exame.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || exame.status === statusFilter;
    const matchesTipo = tipoFilter === 'todos' || exame.tipo_exame === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const getEstatisticas = () => {
    const total = examesData.length;
    const realizados = examesData.filter(e => e.status === 'realizado').length;
    const agendados = examesData.filter(e => e.status === 'agendado').length;
    const vencidos = examesData.filter(e => e.status === 'vencido').length;
    const pendentes = examesData.filter(e => e.status === 'pendente').length;
    const proximosVencimento = examesData.filter(e => e.dias_para_vencimento <= 7 && e.dias_para_vencimento > 0).length;

    return {
      total,
      realizados,
      agendados,
      vencidos,
      pendentes,
      proximosVencimento
    };
  };

  const stats = getEstatisticas();

  // Loading state
  if (isLoading) {
    return (
      <RequirePage pagePath="/portal-gestor/acompanhamento/exames*" action="read">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando exames...</span>
          </div>
        </div>
      </RequirePage>
    );
  }

  // Error state
  if (error) {
    return (
      <RequirePage pagePath="/portal-gestor/acompanhamento/exames*" action="read">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar exames</h3>
            <p className="text-gray-600 mb-4">Não foi possível carregar os dados dos exames.</p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </RequirePage>
    );
  }

  return (
    <RequirePage pagePath="/portal-gestor/acompanhamento/exames*" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acompanhamento de Exames</h1>
          <p className="text-muted-foreground">
            Monitore exames médicos e vencimentos da sua equipe
          </p>
        </div>
        <Button onClick={() => navigate('/portal-gestor/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Exames cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.realizados}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.realizados / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.agendados}</div>
            <p className="text-xs text-muted-foreground">
              Próximos a realizar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Alertas de Vencimento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.vencidos > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  {stats.vencidos} exame(s) vencido(s) - ação necessária
                </span>
              </div>
            )}
            {stats.proximosVencimento > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {stats.proximosVencimento} exame(s) próximo(s) do vencimento (7 dias)
                </span>
              </div>
            )}
            {stats.agendados > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {stats.agendados} exame(s) agendado(s) para realização
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Exame</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Exame Admissional">Admissional</SelectItem>
                  <SelectItem value="Exame Periódico">Periódico</SelectItem>
                  <SelectItem value="Exame Demissional">Demissional</SelectItem>
                  <SelectItem value="Exame de Retorno ao Trabalho">Retorno</SelectItem>
                  <SelectItem value="Exame de Mudança de Função">Mudança de Função</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Exames */}
      <Card>
        <CardHeader>
          <CardTitle>Exames Médicos</CardTitle>
          <CardDescription>
            {filteredExames.length} exame(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredExames.map((exame) => (
              <div key={exame.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="h-5 w-5" />
                    <div>
                      <h3 className="font-semibold">{exame.funcionario_nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        Matrícula: {exame.funcionario_matricula}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getTipoLabel(exame.tipo_exame)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm font-medium">Agendamento</p>
                    <p className="text-lg">{new Date(exame.data_agendamento).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Vencimento</p>
                    <p className="text-lg">{new Date(exame.data_vencimento).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Dias</p>
                    <p className={`text-lg ${exame.dias_para_vencimento < 0 ? 'text-red-600' : exame.dias_para_vencimento <= 7 ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {exame.dias_para_vencimento < 0 ? `Vencido há ${Math.abs(exame.dias_para_vencimento)} dias` : 
                       exame.dias_para_vencimento === 0 ? 'Hoje' : 
                       `${exame.dias_para_vencimento} dias`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(exame.status)}
                    <Badge className={getStatusColor(exame.status)}>
                      {exame.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    
                    {exame.status === 'agendado' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Calendar className="h-4 w-4 mr-1" />
                        Reagendar
                      </Button>
                    )}
                    
                    {exame.status === 'vencido' && (
                      <Button variant="destructive" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Urgente
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredExames.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum exame encontrado com os filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RequirePage>
  );
};

export default AcompanhamentoExames;
