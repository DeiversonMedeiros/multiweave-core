import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrainingDashboard } from '@/components/rh/TrainingDashboard';
import { TrainingForm } from '@/components/rh/TrainingForm';
import { TrainingAnalytics } from '@/components/rh/TrainingAnalytics';
import { TrainingNotificationManager } from '@/components/rh/TrainingNotificationManager';
import { TrainingSettings } from '@/components/rh/TrainingSettings';
import { BrowserNotificationSettings } from '@/components/rh/BrowserNotificationSettings';
import { useCompany } from '@/lib/company-context';
import { useTraining } from '@/hooks/rh/useTraining';
import { RequireModule } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  LayoutDashboard, 
  Plus, 
  BarChart3, 
  Bell, 
  Settings,
  BookOpen
} from 'lucide-react';

const TrainingManagement: React.FC = () => {
  const { selectedCompany, companies, loading: companiesLoading } = useCompany();
  
  const { 
    trainings, 
    enrollments, 
    attendance, 
    certificates, 
    stats, 
    loading, 
    error,
    createTraining, 
    updateTraining,
    // fetchTrainings, // Removed - only useEffect manages this
    fetchEnrollments,
    fetchAttendance,
    fetchCertificates,
    fetchStats
  } = useTraining();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);

  // Show loading while companies are being loaded
  if (companiesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  // Show message if no companies available
  if (!companiesLoading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Nenhuma empresa disponível
            </CardTitle>
            <CardDescription>
              Você ainda não tem acesso a nenhuma empresa. Entre em contato com o administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSaveTraining = async (data: any) => {
    try {
      if (editingTraining) {
        await updateTraining(editingTraining.id, data);
        setEditingTraining(null);
      } else {
        await createTraining(data);
      }
    setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar treinamento:', error);
    }
  };

  const handleEditTraining = (training: any) => {
    setEditingTraining(training);
    setShowForm(true);
    setActiveTab('form');
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTraining(null);
    setActiveTab('dashboard');
  };

  if (!selectedCompany?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Selecione uma empresa
          </h3>
          <p className="text-gray-500 mb-4">
            Para acessar o sistema de treinamentos, selecione uma empresa primeiro.
          </p>
          <div className="text-sm text-gray-400">
            <p>Empresas disponíveis: {companies.length}</p>
            <p>Empresa selecionada: {selectedCompany ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <TrainingForm
        training={editingTraining}
        onSave={handleSaveTraining}
        onCancel={handleCancelForm}
        loading={loading}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Treinamentos</h1>
          <p className="text-gray-600">
            Gerencie treinamentos, notificações e acompanhe o desempenho
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Treinamento
          </Button>
      </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <TrainingDashboard 
            companyId={selectedCompany.id}
            trainings={trainings}
            trainingsLoading={loading}
            trainingsError={error}
            onCreateTraining={() => setShowForm(true)}
            // fetchTrainings={fetchTrainings} // Removed - only useEffect manages this
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <TrainingAnalytics companyId={selectedCompany.id} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <TrainingNotificationManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <TrainingSettings />
          <BrowserNotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingManagement;