// =====================================================
// PÁGINA PRINCIPAL DE RECRUTAMENTO
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  ClipboardList, 
  Database, 
  FileText,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRecruitmentStats } from '@/hooks/rh/useRecruitment';
import { useCompany } from '@/lib/company-context';
import { JobRequestsTab } from '@/components/recruitment/JobRequestsTab';
import { JobOpeningsTab } from '@/components/recruitment/JobOpeningsTab';
import { CandidatesTab } from '@/components/recruitment/CandidatesTab';
import { SelectionProcessTab } from '@/components/recruitment/SelectionProcessTab';
import { TalentPoolTab } from '@/components/recruitment/TalentPoolTab';
import { DocumentUploadTab } from '@/components/recruitment/DocumentUploadTab';
import { JobRequestForm } from '@/components/recruitment/forms/JobRequestForm';
import { RequireModule } from '@/components/RequireAuth';

export default function RecruitmentManagement() {
  const { companyId } = useCompany();
  const [activeTab, setActiveTab] = useState('job-requests');
  const [showForm, setShowForm] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useRecruitmentStats();

  const tabs = [
    {
      id: 'job-requests',
      label: 'Solicitações de Vagas',
      icon: ClipboardList,
      description: 'Gerencie solicitações de novas vagas',
      badge: stats?.pending_job_requests || 0
    },
    {
      id: 'job-openings',
      label: 'Vagas Abertas',
      icon: Briefcase,
      description: 'Controle vagas em andamento',
      badge: stats?.open_job_openings || 0
    },
    {
      id: 'candidates',
      label: 'Candidatos',
      icon: Users,
      description: 'Cadastro e gestão de candidatos',
      badge: stats?.active_candidates || 0
    },
    {
      id: 'selection-process',
      label: 'Processo Seletivo',
      icon: UserCheck,
      description: 'Acompanhe processos de seleção',
      badge: stats?.active_selection_processes || 0
    },
    {
      id: 'talent-pool',
      label: 'Banco de Talentos',
      icon: Database,
      description: 'Talentos disponíveis',
      badge: stats?.talent_pool_size || 0
    },
    {
      id: 'documents',
      label: 'Documentos',
      icon: FileText,
      description: 'Upload e gestão de arquivos',
      badge: null
    }
  ];

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    description 
  }: {
    title: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down' | 'neutral';
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
            {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 mr-1 rotate-180" />}
            {trend === 'neutral' && <Clock className="h-3 w-3 text-gray-500 mr-1" />}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <RequireModule moduleName="recruitment" action="read">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recrutamento</h1>
          <p className="text-muted-foreground">
            Gerencie todo o processo de recrutamento e seleção de candidatos
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          Nova Solicitação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Solicitações Pendentes"
          value={stats?.pending_job_requests || 0}
          icon={AlertCircle}
          description="Aguardando aprovação"
        />
        <StatCard
          title="Vagas Abertas"
          value={stats?.open_job_openings || 0}
          icon={Briefcase}
          description="Em processo de seleção"
        />
        <StatCard
          title="Candidatos Ativos"
          value={stats?.active_candidates || 0}
          icon={Users}
          description="Em processo seletivo"
        />
        <StatCard
          title="Processos Ativos"
          value={stats?.active_selection_processes || 0}
          icon={UserCheck}
          description="Em andamento"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 relative"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge !== null && tab.badge > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Conteúdo das Tabs */}
        <TabsContent value="job-requests" className="space-y-4">
          <JobRequestsTab />
        </TabsContent>

        <TabsContent value="job-openings" className="space-y-4">
          <JobOpeningsTab />
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <CandidatesTab />
        </TabsContent>

        <TabsContent value="selection-process" className="space-y-4">
          <SelectionProcessTab />
        </TabsContent>

        <TabsContent value="talent-pool" className="space-y-4">
          <TalentPoolTab />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUploadTab />
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Solicitação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Vaga</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova vaga solicitada
            </DialogDescription>
          </DialogHeader>
          <JobRequestForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
      </div>
    </RequireModule>
  );
}
