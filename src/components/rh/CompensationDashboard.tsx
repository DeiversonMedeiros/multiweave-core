import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { CompensationRequest } from '@/integrations/supabase/rh-types';

interface CompensationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  realized: number;
  thisMonth: number;
  thisWeek: number;
  averageProcessingTime: number;
}

interface CompensationDashboardProps {
  requests: CompensationRequest[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function CompensationDashboard({ requests, isLoading, onRefresh }: CompensationDashboardProps) {
  const stats = calculateStats(requests);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    variant = "default",
    description,
    trend
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    variant?: "default" | "success" | "warning" | "destructive";
    description?: string;
    trend?: { value: number; isPositive: boolean };
  }) => {
    const variantClasses = {
      default: "bg-blue-50 border-blue-200 text-blue-700",
      success: "bg-green-50 border-green-200 text-green-700",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
      destructive: "bg-red-50 border-red-200 text-red-700"
    };

    return (
      <Card className={`${variantClasses[variant]} transition-all hover:shadow-md`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className="flex items-center text-xs mt-1">
              <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`} />
              <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard de Compensações</h2>
          <p className="text-muted-foreground">
            Visão geral das solicitações de compensação
          </p>
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            Atualizar
          </Button>
        )}
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Solicitações"
          value={stats.total}
          icon={FileText}
          description="Todas as solicitações"
        />
        <StatCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          variant="warning"
          description="Aguardando aprovação"
        />
        <StatCard
          title="Aprovadas"
          value={stats.approved}
          icon={CheckCircle}
          variant="success"
          description="Aprovadas para compensação"
        />
        <StatCard
          title="Rejeitadas"
          value={stats.rejected}
          icon={XCircle}
          variant="destructive"
          description="Rejeitadas"
        />
      </div>

      {/* Estatísticas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Realizadas"
          value={stats.realized}
          icon={CheckCircle}
          variant="success"
          description="Compensações efetivadas"
        />
        <StatCard
          title="Este Mês"
          value={stats.thisMonth}
          icon={Calendar}
          description="Solicitações do mês atual"
        />
        <StatCard
          title="Esta Semana"
          value={stats.thisWeek}
          icon={Clock}
          description="Solicitações da semana atual"
        />
      </div>

      {/* Resumo de Processamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tempo de Processamento
            </CardTitle>
            <CardDescription>
              Estatísticas de processamento das solicitações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Tempo Médio</span>
                <Badge variant="outline">
                  {stats.averageProcessingTime} dias
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taxa de Aprovação</span>
                <Badge variant={stats.total > 0 && (stats.approved / stats.total) > 0.7 ? "default" : "destructive"}>
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Status das Solicitações
            </CardTitle>
            <CardDescription>
              Distribuição por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="text-sm font-medium">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Aprovadas</span>
                </div>
                <span className="text-sm font-medium">{stats.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Rejeitadas</span>
                </div>
                <span className="text-sm font-medium">{stats.rejected}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Realizadas</span>
                </div>
                <span className="text-sm font-medium">{stats.realized}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.pending > 10 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">Alerta de Processamento</h4>
                <p className="text-sm text-yellow-700">
                  Há {stats.pending} solicitações pendentes. Considere acelerar o processo de aprovação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function calculateStats(requests: CompensationRequest[]): CompensationStats {
  if (!requests || requests.length === 0) {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      realized: 0,
      thisMonth: 0,
      thisWeek: 0,
      averageProcessingTime: 0
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pendente').length,
    approved: requests.filter(r => r.status === 'aprovado').length,
    rejected: requests.filter(r => r.status === 'rejeitado').length,
    realized: requests.filter(r => r.status === 'realizado').length,
    thisMonth: requests.filter(r => {
      const requestDate = new Date(r.created_at);
      return requestDate >= startOfMonth;
    }).length,
    thisWeek: requests.filter(r => {
      const requestDate = new Date(r.created_at);
      return requestDate >= startOfWeek;
    }).length,
    averageProcessingTime: 0
  };

  // Calcular tempo médio de processamento
  const processedRequests = requests.filter(r => 
    r.status === 'aprovado' || r.status === 'rejeitado'
  );

  if (processedRequests.length > 0) {
    const totalDays = processedRequests.reduce((sum, request) => {
      const created = new Date(request.created_at);
      const processed = new Date(request.data_aprovacao || request.updated_at);
      const days = Math.floor((processed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    stats.averageProcessingTime = Math.round(totalDays / processedRequests.length);
  }

  return stats;
}
