// =====================================================
// COMPONENTE DE TESTE - CONVÊNIOS MÉDICOS NA FOLHA
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MedicalPlansPayrollService } from '@/services/rh/medicalPlansPayrollService';
import { PayrollService } from '@/services/rh/payrollService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Heart, Shield, DollarSign, Calculator } from 'lucide-react';

interface TestResult {
  employeeId: string;
  employeeName: string;
  medicalBenefits: number;
  medicalDiscounts: number;
  traditionalBenefits: number;
  totalEarnings: number;
  totalDiscounts: number;
  netSalary: number;
  hasActivePlans: boolean;
  plansSummary: any;
}

export function MedicalPlansPayrollTest() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    if (!user?.company_id) {
      setError('ID da empresa não encontrado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar funcionários da empresa
      const { data: employees } = await supabase.rpc('get_employees_by_string', {
        company_id_param: user.company_id
      });

      if (!employees || employees.length === 0) {
        setError('Nenhum funcionário encontrado');
        return;
      }

      const results: TestResult[] = [];

      // Testar cada funcionário
      for (const employee of employees.slice(0, 5)) { // Limitar a 5 funcionários para teste
        try {
          // Buscar convênios médicos
          const [medicalBenefits, medicalDiscounts, plansSummary, hasActivePlans] = await Promise.all([
            MedicalPlansPayrollService.calculateMedicalBenefitsTotal(user.company_id, employee.id),
            MedicalPlansPayrollService.calculateMedicalDiscountsTotal(user.company_id, employee.id),
            MedicalPlansPayrollService.getMedicalPlansSummary(user.company_id, employee.id),
            MedicalPlansPayrollService.hasActiveMedicalPlans(user.company_id, employee.id)
          ]);

          // Buscar benefícios tradicionais
          const { data: traditionalBenefits } = await supabase.rpc('get_employee_payroll_benefits', {
            company_id_param: user.company_id,
            employee_id_param: employee.id
          });

          const traditionalBenefitsTotal = traditionalBenefits?.reduce((sum: number, benefit: any) => {
            return sum + (benefit.custom_value || 0);
          }, 0) || 0;

          // Calcular totais
          const totalEarnings = (employee.salario_base || 0) + traditionalBenefitsTotal + medicalBenefits;
          const totalDiscounts = medicalDiscounts; // Simplificado para o teste

          results.push({
            employeeId: employee.id,
            employeeName: employee.nome,
            medicalBenefits,
            medicalDiscounts,
            traditionalBenefits: traditionalBenefitsTotal,
            totalEarnings,
            totalDiscounts,
            netSalary: totalEarnings - totalDiscounts,
            hasActivePlans,
            plansSummary
          });

        } catch (employeeError) {
          console.error(`Erro ao processar funcionário ${employee.nome}:`, employeeError);
        }
      }

      setTestResults(results);

    } catch (error) {
      console.error('Erro no teste:', error);
      setError('Erro ao executar teste: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Teste de Integração - Convênios Médicos na Folha de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Este teste verifica se os descontos de convênios médicos e odontológicos estão sendo 
            calculados corretamente na folha de pagamento.
          </p>
          
          <Button 
            onClick={runTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando Teste...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Executar Teste
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resultados do Teste</h3>
          
          {testResults.map((result) => (
            <Card key={result.employeeId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{result.employeeName}</CardTitle>
                  <Badge variant={result.hasActivePlans ? "default" : "secondary"}>
                    {result.hasActivePlans ? "Com Convênios" : "Sem Convênios"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-600">Benefícios Médicos</p>
                    <p className="text-lg font-bold">{formatCurrency(result.medicalBenefits)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600">Descontos Médicos</p>
                    <p className="text-lg font-bold">{formatCurrency(result.medicalDiscounts)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-600">Benefícios Tradicionais</p>
                    <p className="text-lg font-bold">{formatCurrency(result.traditionalBenefits)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-purple-600">Salário Líquido</p>
                    <p className="text-lg font-bold">{formatCurrency(result.netSalary)}</p>
                  </div>
                </div>

                {result.hasActivePlans && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Resumo por Categoria:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(result.plansSummary).map(([category, data]: [string, any]) => (
                          <div key={category} className="text-center p-2 bg-gray-50 rounded">
                            <p className="text-xs font-medium capitalize">{category.replace('_', ' ')}</p>
                            <p className="text-sm font-bold">{data.count} planos</p>
                            <p className="text-xs text-gray-600">{formatCurrency(data.total)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
