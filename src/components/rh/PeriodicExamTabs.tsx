import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  Bell, 
  AlertTriangle, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { PeriodicExam } from '@/integrations/supabase/rh-types';
import { SimpleDataTable } from './SimpleDataTable';
import { TableActions } from './TableActions';

interface PeriodicExamTabsProps {
  exams: PeriodicExam[];
  isLoading: boolean;
  error: any;
  onRefresh: () => void;
  onEdit: (exam: PeriodicExam) => void;
  onView: (exam: PeriodicExam) => void;
  onDelete: (id: string) => void;
}

export function PeriodicExamTabs({
  exams,
  isLoading,
  error,
  onRefresh,
  onEdit,
  onView,
  onDelete
}: PeriodicExamTabsProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  console.log('🔍 [PeriodicExamTabs] exams:', exams);
  console.log('🔍 [PeriodicExamTabs] exams length:', exams?.length);
  console.log('🔍 [PeriodicExamTabs] isLoading:', isLoading);
  console.log('🔍 [PeriodicExamTabs] error:', error);

  // Filtrar exames por categoria
  const filteredExams = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    switch (activeTab) {
      case 'upcoming':
        return exams.filter(exam => {
          const examDate = new Date(exam.data_agendamento);
          return exam.status === 'agendado' && 
                 examDate >= now && 
                 examDate <= thirtyDaysFromNow;
        });
      
      case 'overdue':
        return exams.filter(exam => {
          const examDate = new Date(exam.data_agendamento);
          return exam.status === 'agendado' && examDate < now;
        });
      
      case 'completed':
        return exams.filter(exam => exam.status === 'realizado');
      
      case 'cancelled':
        return exams.filter(exam => exam.status === 'cancelado');
      
      default:
        return exams;
    }
  }, [exams, activeTab]);

  // Contar exames por categoria
  const counts = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return {
      all: exams.length,
      upcoming: exams.filter(exam => {
        const examDate = new Date(exam.data_agendamento);
        return exam.status === 'agendado' && 
               examDate >= now && 
               examDate <= thirtyDaysFromNow;
      }).length,
      overdue: exams.filter(exam => {
        const examDate = new Date(exam.data_agendamento);
        return exam.status === 'agendado' && examDate < now;
      }).length,
      completed: exams.filter(exam => exam.status === 'realizado').length,
      cancelled: exams.filter(exam => exam.status === 'cancelado').length,
    };
  }, [exams]);

  const columns = [
    {
      key: 'data_agendamento',
      header: 'Data Agendamento',
      render: (item: PeriodicExam) => {
        const examDate = new Date(item.data_agendamento);
        const isOverdue = examDate < new Date() && item.status === 'agendado';
        return (
          <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : ''}`}>
            <Calendar className="h-4 w-4" />
            {examDate.toLocaleDateString('pt-BR')}
          </div>
        );
      },
    },
    {
      key: 'employee_name',
      header: 'Funcionário',
      render: (item: PeriodicExam) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {item.employee_name ? item.employee_name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <span className="font-medium">{item.employee_name || 'Funcionário não encontrado'}</span>
        </div>
      ),
    },
    {
      key: 'tipo_exame',
      header: 'Tipo',
      render: (item: PeriodicExam) => (
        <Badge variant="outline">
          {item.tipo_exame}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PeriodicExam) => {
        const statusConfig = {
          agendado: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
          realizado: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
          vencido: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
          cancelado: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100' },
        };
        
        const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.agendado;
        const Icon = config.icon;
        
        return (
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${config.bg}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>
              {item.status}
            </span>
          </div>
        );
      },
    },
    {
      key: 'resultado',
      header: 'Resultado',
      render: (item: PeriodicExam) => item.resultado ? (
        <Badge variant="secondary">
          {item.resultado}
        </Badge>
      ) : '-',
    },
    {
      key: 'medico_responsavel',
      header: 'Médico',
      render: (item: PeriodicExam) => item.medico_responsavel || '-',
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (item: PeriodicExam) => (
        <TableActions
          onView={() => onView(item)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          canEdit={item.status === 'agendado'}
          canDelete={item.status === 'agendado' || item.status === 'cancelado'}
        />
      ),
    },
  ];

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'all': return Stethoscope;
      case 'upcoming': return Bell;
      case 'overdue': return AlertTriangle;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Stethoscope;
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'all': return 'Todos os exames do sistema';
      case 'upcoming': return 'Exames agendados para os próximos 30 dias';
      case 'overdue': return 'Exames que passaram da data agendada';
      case 'completed': return 'Exames já realizados';
      case 'cancelled': return 'Exames cancelados';
      default: return '';
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          Todos
          <Badge variant="secondary" className="ml-1">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="upcoming" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Próximos
          <Badge variant="secondary" className="ml-1">
            {counts.upcoming}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="overdue" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Vencidos
          <Badge variant="destructive" className="ml-1">
            {counts.overdue}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Realizados
          <Badge variant="secondary" className="ml-1">
            {counts.completed}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          Cancelados
          <Badge variant="secondary" className="ml-1">
            {counts.cancelled}
          </Badge>
        </TabsTrigger>
      </TabsList>

      {['all', 'upcoming', 'overdue', 'completed', 'cancelled'].map((tab) => {
        const Icon = getTabIcon(tab);
        const description = getTabDescription(tab);
        const tabExams = tab === 'all' ? exams : filteredExams;
        
        console.log(`🔍 [PeriodicExamTabs] Tab: ${tab}, tabExams:`, tabExams);
        console.log(`🔍 [PeriodicExamTabs] Tab: ${tab}, tabExams length:`, tabExams?.length);

        return (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {tab === 'all' ? 'Todos os Exames' : 
                   tab === 'upcoming' ? 'Exames Próximos' :
                   tab === 'overdue' ? 'Exames Vencidos' :
                   tab === 'completed' ? 'Exames Realizados' :
                   'Exames Cancelados'}
                </CardTitle>
                <CardDescription>
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SimpleDataTable
                  data={tabExams}
                  columns={columns}
                  loading={isLoading}
                  emptyMessage={`Nenhum exame encontrado na categoria "${tab}"`}
                />
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
