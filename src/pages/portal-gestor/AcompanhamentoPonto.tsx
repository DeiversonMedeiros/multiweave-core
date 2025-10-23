import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface PontoData {
  id: string;
  funcionario_nome: string;
  funcionario_matricula: string;
  data: string;
  entrada: string;
  saida: string;
  entrada_almoco: string;
  saida_almoco: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  horas_trabalhadas: number;
  horas_extras: number;
  horas_faltas: number;
  status: 'aprovado' | 'pendente' | 'rejeitado' | 'corrigido';
  observacoes?: string;
}

const AcompanhamentoPonto: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [periodoFilter, setPeriodoFilter] = useState<string>('mes_atual');

  // Mock data - em produção virá do Supabase
  const pontoData: PontoData[] = [
    {
      id: '1',
      funcionario_nome: 'João Silva',
      funcionario_matricula: '001',
      data: '2025-01-10',
      entrada: '08:00',
      saida: '17:00',
      entrada_almoco: '12:00',
      saida_almoco: '13:00',
      entrada_extra1: '18:00',
      saida_extra1: '20:00',
      horas_trabalhadas: 8.0,
      horas_extras: 2.0,
      horas_faltas: 0.0,
      status: 'aprovado'
    },
    {
      id: '2',
      funcionario_nome: 'Maria Santos',
      funcionario_matricula: '002',
      data: '2025-01-10',
      entrada: '08:15',
      saida: '17:30',
      entrada_almoco: '12:00',
      saida_almoco: '13:00',
      entrada_extra1: '18:00',
      saida_extra1: '19:30',
      horas_trabalhadas: 8.15,
      horas_extras: 1.5,
      horas_faltas: 0.0,
      status: 'pendente'
    },
    {
      id: '3',
      funcionario_nome: 'Pedro Costa',
      funcionario_matricula: '003',
      data: '2025-01-10',
      entrada: '09:00',
      saida: '18:00',
      entrada_almoco: '12:00',
      saida_almoco: '13:00',
      horas_trabalhadas: 8.0,
      horas_extras: 0.0,
      horas_faltas: 1.0,
      status: 'aprovado',
      observacoes: 'Atraso justificado'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'corrigido': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'corrigido': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredPontoData = pontoData.filter(ponto => {
    const matchesSearch = ponto.funcionario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ponto.funcionario_matricula.includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || ponto.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getEstatisticas = () => {
    const total = pontoData.length;
    const aprovados = pontoData.filter(p => p.status === 'aprovado').length;
    const pendentes = pontoData.filter(p => p.status === 'pendente').length;
    const rejeitados = pontoData.filter(p => p.status === 'rejeitado').length;
    const totalHoras = pontoData.reduce((acc, p) => acc + p.horas_trabalhadas, 0);
    const totalExtras = pontoData.reduce((acc, p) => acc + p.horas_extras, 0);
    const totalFaltas = pontoData.reduce((acc, p) => acc + p.horas_faltas, 0);

    return {
      total,
      aprovados,
      pendentes,
      rejeitados,
      totalHoras,
      totalExtras,
      totalFaltas,
      taxaAprovacao: total > 0 ? (aprovados / total) * 100 : 0
    };
  };

  const stats = getEstatisticas();

  return (
    <RequireEntity entityName="time_tracking_management" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acompanhamento de Ponto</h1>
          <p className="text-muted-foreground">
            Monitore registros de ponto e frequência da sua equipe
          </p>
        </div>
        <Button onClick={() => navigate('/portal-gestor/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registros no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxaAprovacao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.aprovados} de {stats.total} aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHoras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Total no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalExtras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Acumuladas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="corrigido">Corrigido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana_atual">Semana Atual</SelectItem>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Alertas e Irregularidades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.pendentes > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {stats.pendentes} registro(s) de ponto pendente(s) de aprovação
                </span>
              </div>
            )}
            {stats.totalFaltas > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  {stats.totalFaltas.toFixed(1)} hora(s) de falta registrada(s)
                </span>
              </div>
            )}
            {stats.totalExtras > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  {stats.totalExtras.toFixed(1)} hora(s) extra(s) registrada(s)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
          <CardDescription>
            {filteredPontoData.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPontoData.map((ponto) => (
              <div key={ponto.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <div>
                      <h3 className="font-semibold">{ponto.funcionario_nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        Matrícula: {ponto.funcionario_matricula}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ponto.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Entrada</p>
                    <p className="text-lg">{ponto.entrada}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Saída</p>
                    <p className="text-lg">{ponto.saida}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Almoço</p>
                    <p className="text-lg">{ponto.entrada_almoco} - {ponto.saida_almoco}</p>
                  </div>
                  {(ponto.entrada_extra1 || ponto.saida_extra1) && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-purple-600">Extra</p>
                      <p className="text-lg text-purple-600">
                        {ponto.entrada_extra1 || '--'} - {ponto.saida_extra1 || '--'}
                      </p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-medium">Horas</p>
                    <p className="text-lg">{ponto.horas_trabalhadas}h</p>
                  </div>
                  {ponto.horas_extras > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">Extras</p>
                      <p className="text-lg text-green-600">+{ponto.horas_extras}h</p>
                    </div>
                  )}
                  {ponto.horas_faltas > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600">Faltas</p>
                      <p className="text-lg text-red-600">-{ponto.horas_faltas}h</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(ponto.status)}
                    <Badge className={getStatusColor(ponto.status)}>
                      {ponto.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    
                    {ponto.status === 'pendente' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button variant="destructive" size="sm">
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPontoData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhum registro de ponto encontrado com os filtros aplicados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default AcompanhamentoPonto;
