import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Clock, 
  Calendar,
  Download,
  Filter,
  Target,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrainingAnalyticsProps {
  companyId: string;
}

interface TrainingStats {
  totalTrainings: number;
  completedTrainings: number;
  activeTrainings: number;
  totalParticipants: number;
  averageAttendance: number;
  completionRate: number;
  satisfactionScore: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  trainings: number;
  participants: number;
  completion: number;
}

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const TrainingAnalytics: React.FC<TrainingAnalyticsProps> = ({ companyId }) => {
  const [timeRange, setTimeRange] = useState('6months');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stats, setStats] = useState<TrainingStats>({
    totalTrainings: 0,
    completedTrainings: 0,
    activeTrainings: 0,
    totalParticipants: 0,
    averageAttendance: 0,
    completionRate: 0,
    satisfactionScore: 0
  });

  // Mock data - in real app, this would come from API
  const [categoryData] = useState<CategoryData[]>([
    { name: 'Segurança', value: 35, color: '#0088FE' },
    { name: 'Qualidade', value: 25, color: '#00C49F' },
    { name: 'Técnico', value: 20, color: '#FFBB28' },
    { name: 'Comportamental', value: 15, color: '#FF8042' },
    { name: 'Compliance', value: 5, color: '#8884D8' }
  ]);

  const [monthlyData] = useState<MonthlyData[]>([
    { month: 'Jan', trainings: 12, participants: 180, completion: 85 },
    { month: 'Fev', trainings: 15, participants: 220, completion: 88 },
    { month: 'Mar', trainings: 18, participants: 250, completion: 92 },
    { month: 'Abr', trainings: 14, participants: 200, completion: 87 },
    { month: 'Mai', trainings: 20, participants: 300, completion: 90 },
    { month: 'Jun', trainings: 16, participants: 240, completion: 89 }
  ]);

  const [statusData] = useState<StatusData[]>([
    { status: 'Concluído', count: 45, percentage: 60 },
    { status: 'Em Andamento', count: 20, percentage: 27 },
    { status: 'Planejado', count: 8, percentage: 11 },
    { status: 'Cancelado', count: 2, percentage: 2 }
  ]);

  const [attendanceData] = useState([
    { name: 'Presença', value: 85, color: '#00C49F' },
    { name: 'Ausência', value: 15, color: '#FF8042' }
  ]);

  const [satisfactionData] = useState([
    { month: 'Jan', score: 4.2 },
    { month: 'Fev', score: 4.3 },
    { month: 'Mar', score: 4.5 },
    { month: 'Abr', score: 4.4 },
    { month: 'Mai', score: 4.6 },
    { month: 'Jun', score: 4.5 }
  ]);

  useEffect(() => {
    // Simulate API call
    setStats({
      totalTrainings: 75,
      completedTrainings: 45,
      activeTrainings: 20,
      totalParticipants: 1200,
      averageAttendance: 85,
      completionRate: 90,
      satisfactionScore: 4.5
    });
  }, [companyId, timeRange, categoryFilter]);

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting analytics as ${format}`);
    // Implement export functionality
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluído':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Em Andamento':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Planejado':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'Cancelado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído':
        return 'bg-green-100 text-green-800';
      case 'Em Andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'Planejado':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Treinamentos</h1>
          <p className="text-gray-600">Análise detalhada do desempenho dos treinamentos</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Treinamentos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrainings}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTrainings} de {stats.totalTrainings} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              Média de {Math.round(stats.totalParticipants / stats.totalTrainings)} por treinamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.satisfactionScore}/5</div>
            <p className="text-xs text-muted-foreground">
              +0.3 pontos em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Tendências Mensais</CardTitle>
            <CardDescription>
              Evolução de treinamentos e participantes ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="trainings" 
                  stackId="1" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  name="Treinamentos"
                />
                <Area 
                  type="monotone" 
                  dataKey="participants" 
                  stackId="2" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  name="Participantes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>
              Percentual de treinamentos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status and Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Treinamentos</CardTitle>
            <CardDescription>
              Distribuição atual dos treinamentos por status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                    <Badge className={getStatusColor(item.status)}>
                      {item.count} ({item.percentage}%)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Presença</CardTitle>
            <CardDescription>
              Média geral de presença nos treinamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {stats.averageAttendance}%
                </div>
                <p className="text-sm text-gray-600">Taxa de Presença Média</p>
              </div>
              
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Satisfaction Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Satisfação</CardTitle>
          <CardDescription>
            Tendência da avaliação de satisfação dos participantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={satisfactionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[3, 5]} />
              <Tooltip 
                formatter={(value) => [`${value}/5`, 'Satisfação']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#8884d8" 
                strokeWidth={3}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                name="Satisfação"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eficiência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Treinamentos Concluídos</span>
                <span className="font-semibold">{stats.completedTrainings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Sucesso</span>
                <span className="font-semibold text-green-600">{stats.completionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tempo Médio</span>
                <span className="font-semibold">2.5h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Participantes Únicos</span>
                <span className="font-semibold">{stats.totalParticipants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de Presença</span>
                <span className="font-semibold text-blue-600">{stats.averageAttendance}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Retenção</span>
                <span className="font-semibold text-green-600">92%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Satisfação Média</span>
                <span className="font-semibold text-yellow-600">{stats.satisfactionScore}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avaliações</span>
                <span className="font-semibold">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Recomendação</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
