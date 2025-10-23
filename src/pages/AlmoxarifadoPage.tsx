import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Warehouse, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardList, 
  History, 
  CheckSquare,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RequireModule } from '@/components/RequireAuth';

const AlmoxarifadoPage: React.FC = () => {
  const navigate = useNavigate();

  const subpages = [
    {
      title: 'Dashboard de Estoque',
      description: 'Visão geral dos KPIs e indicadores de estoque',
      icon: BarChart3,
      path: '/almoxarifado/dashboard',
      color: 'bg-blue-500'
    },
    {
      title: 'Materiais e Equipamentos',
      description: 'Cadastro e gestão de materiais e equipamentos',
      icon: Package,
      path: '/almoxarifado/materiais',
      color: 'bg-green-500'
    },
    {
      title: 'Entradas de Materiais',
      description: 'Recebimento e entrada de materiais via NF-e',
      icon: ArrowDownToLine,
      path: '/almoxarifado/entradas',
      color: 'bg-emerald-500'
    },
    {
      title: 'Saídas e Transferências',
      description: 'Saídas e transferências entre almoxarifados',
      icon: ArrowUpFromLine,
      path: '/almoxarifado/saidas',
      color: 'bg-orange-500'
    },
    {
      title: 'Inventário',
      description: 'Controle de inventários físicos',
      icon: ClipboardList,
      path: '/almoxarifado/inventario',
      color: 'bg-purple-500'
    },
    {
      title: 'Checklist de Recebimento',
      description: 'Inspeção e aprovação de recebimentos',
      icon: CheckSquare,
      path: '/almoxarifado/checklist',
      color: 'bg-cyan-500'
    },
    {
      title: 'Histórico de Movimentações',
      description: 'Relatórios e histórico de movimentações',
      icon: History,
      path: '/almoxarifado/historico',
      color: 'bg-gray-500'
    }
  ];

  return (
    <RequireModule moduleName="almoxarifado" action="read">
      <div className="container mx-auto p-6">
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <Warehouse className="inline-block mr-3 h-8 w-8" />
          Almoxarifado
        </h1>
        <p className="text-gray-600">
          Controle completo de estoque, materiais e equipamentos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subpages.map((subpage) => {
          const IconComponent = subpage.icon;
          return (
            <Card 
              key={subpage.path} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(subpage.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${subpage.color} text-white group-hover:scale-110 transition-transform`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{subpage.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-600 mb-4">
                  {subpage.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  Acessar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cards de resumo rápido */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Materiais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-gray-500">Em desenvolvimento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Total Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-gray-500">Em desenvolvimento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Itens em Ruptura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-</div>
            <p className="text-xs text-gray-500">Em desenvolvimento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Transferências Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">-</div>
            <p className="text-xs text-gray-500">Em desenvolvimento</p>
          </CardContent>
        </Card>
      </div>
      </div>
    </RequireModule>
  );
};

export default AlmoxarifadoPage;
