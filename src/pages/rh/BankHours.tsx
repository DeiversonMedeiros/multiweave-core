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
  Info
} from 'lucide-react';
import { BankHoursConfig } from '../../components/rh/BankHoursConfig';
import { BankHoursDashboard } from '../../components/rh/BankHoursDashboard';
import { useCompany } from '../../lib/company-context';

export default function BankHoursPage() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState('config');

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
          O sistema de banco de horas permite configurar quais colaboradores terão banco de horas 
          ou pagamento de horas extras, além de definir o período de acumulação. Configure os 
          parâmetros na aba "Configuração" e acompanhe os saldos na aba "Dashboard".
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Configuração por Colaborador</span>
              </CardTitle>
              <CardDescription>
                Configure quais colaboradores terão banco de horas e os parâmetros de acumulação.
                Você pode escolher o período de tempo em meses que o banco de horas vai acumular.
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
      </Tabs>

      {/* Informações sobre o Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona o Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Configuração</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Selecione quais colaboradores terão banco de horas</li>
                <li>• Configure o período de acumulação (em meses)</li>
                <li>• Defina o máximo de horas que podem ser acumuladas</li>
                <li>• Escolha a taxa de compensação (ex: 1:1, 1.5:1)</li>
                <li>• Configure se deve haver compensação automática</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Funcionamento</h3>
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
