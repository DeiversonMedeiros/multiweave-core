import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Settings, 
  BarChart3, 
  Clock, 
  Users, 
  AlertCircle,
  Info,
  Cog,
  UserCheck
} from 'lucide-react';
import { BankHoursConfig } from '../../components/rh/BankHoursConfig';
import { BankHoursDashboard } from '../../components/rh/BankHoursDashboard';
import { BankHoursTypesManager } from '../../components/rh/BankHoursTypesManager';
import { BankHoursAssignmentsManager } from '../../components/rh/BankHoursAssignmentsManager';
import { useCompany } from '../../lib/company-context';
import { BankHoursLegacyImport } from '../../components/rh/BankHoursLegacyImport';

export default function BankHoursPage() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('types');

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma empresa selecionada. Selecione uma empresa para acessar o banco de horas.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banco de Horas</h1>
          <p className="text-muted-foreground">
            Gerencie o sistema de banco de horas da empresa {selectedCompany.nome_fantasia}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Clock className="h-4 w-4 mr-1" />
          Sistema Ativo
        </Badge>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          O sistema de banco de horas foi otimizado! Agora você pode criar tipos de banco de horas 
          e vincular funcionários em massa, economizando tempo na configuração. Use as abas para 
          gerenciar tipos, vincular funcionários e acompanhar o dashboard.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="types" className="flex items-center space-x-2">
            <Cog className="h-4 w-4" />
            <span>Tipos</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4" />
            <span>Vínculos</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Legado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-6">
          <BankHoursTypesManager companyId={selectedCompany.id} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <BankHoursAssignmentsManager companyId={selectedCompany.id} />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Configuração Individual (Legado)</span>
              </CardTitle>
              <CardDescription>
                Esta é a configuração individual por colaborador. Recomendamos usar os "Tipos" 
                e "Vínculos" para uma gestão mais eficiente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankHoursConfig companyId={selectedCompany.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <BankHoursDashboard companyId={selectedCompany.id} />
        </TabsContent>

        <TabsContent value="legacy" className="space-y-6">
          <BankHoursLegacyImport companyId={selectedCompany.id} />
        </TabsContent>
      </Tabs>

      {/* Informações sobre o Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona o Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">1. Tipos de Banco de Horas</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Crie tipos com configurações específicas</li>
                <li>• Ex: Padrão, Gerencial, Operacional</li>
                <li>• Configure parâmetros uma única vez</li>
                <li>• Defina um tipo como padrão</li>
                <li>• Reutilize configurações entre funcionários</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Vínculos de Funcionários</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Vincule funcionários aos tipos criados</li>
                <li>• Atribuição em lote para economizar tempo</li>
                <li>• Visualize funcionários sem vínculo</li>
                <li>• Gerencie vínculos de forma centralizada</li>
                <li>• Histórico de atribuições</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Funcionamento</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Horas extras são automaticamente acumuladas</li>
                <li>• O sistema calcula saldos baseado nos registros de ponto</li>
                <li>• Compensação pode ser automática ou manual</li>
                <li>• Horas podem expirar após período definido</li>
                <li>• Relatórios e dashboards para acompanhamento</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
