import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  DollarSign, 
  UserPlus, 
  TrendingUp,
  Heart,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/services/rh/medicalAgreementsService';

interface MedicalPlanDependentsStatsProps {
  totalDependents: number;
  totalValue: number;
  averageValue: number;
  activeDependents: number;
  suspendedDependents: number;
  cancelledDependents: number;
  dependentsByParentesco: Record<string, number>;
  dependentsByAge: {
    children: number;
    adults: number;
    elderly: number;
  };
}

export function MedicalPlanDependentsStats({
  totalDependents,
  totalValue,
  averageValue,
  activeDependents,
  suspendedDependents,
  cancelledDependents,
  dependentsByParentesco,
  dependentsByAge
}: MedicalPlanDependentsStatsProps) {
  const getParentescoLabel = (parentesco: string) => {
    const labels: Record<string, string> = {
      'conjuge': 'Cônjuge',
      'filho': 'Filho',
      'filha': 'Filha',
      'pai': 'Pai',
      'mae': 'Mãe',
      'outros': 'Outros'
    };
    return labels[parentesco] || parentesco;
  };

  const getParentescoColor = (parentesco: string) => {
    const colors: Record<string, string> = {
      'conjuge': 'bg-pink-100 text-pink-800',
      'filho': 'bg-blue-100 text-blue-800',
      'filha': 'bg-purple-100 text-purple-800',
      'pai': 'bg-green-100 text-green-800',
      'mae': 'bg-yellow-100 text-yellow-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[parentesco] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dependentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDependents}</div>
            <p className="text-xs text-muted-foreground">
              dependentes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              valor total dos dependentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageValue)}</div>
            <p className="text-xs text-muted-foreground">
              por dependente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependentes Ativos</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDependents}</div>
            <p className="text-xs text-muted-foreground">
              {totalDependents > 0 ? Math.round((activeDependents / totalDependents) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status dos Dependentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Heart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeDependents}</div>
            <p className="text-xs text-muted-foreground">
              dependentes ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{suspendedDependents}</div>
            <p className="text-xs text-muted-foreground">
              dependentes suspensos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <UserPlus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelledDependents}</div>
            <p className="text-xs text-muted-foreground">
              dependentes cancelados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Parentesco */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Parentesco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(dependentsByParentesco).map(([parentesco, count]) => (
              <div key={parentesco} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getParentescoColor(parentesco)}>
                    {getParentescoLabel(parentesco)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{count}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${totalDependents > 0 ? (count / totalDependents) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribuição por Faixa Etária */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Faixa Etária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dependentsByAge.children}</div>
              <p className="text-sm text-muted-foreground">Crianças (0-17 anos)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dependentsByAge.adults}</div>
              <p className="text-sm text-muted-foreground">Adultos (18-59 anos)</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{dependentsByAge.elderly}</div>
              <p className="text-sm text-muted-foreground">Idosos (60+ anos)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
