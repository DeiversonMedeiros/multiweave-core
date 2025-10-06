import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCashFlow } from "@/hooks/financeiro/useCashFlow";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function CashFlow() {
  const { currentCompany } = useMultiTenancy();
  const { data: cashflow, loading } = useCashFlow(currentCompany?.id);

  if (loading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  const latest = cashflow?.[0];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Inicial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {latest?.saldo_inicial?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {latest?.entradas?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {latest?.saidas?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashflow?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center border-b pb-2">
                <span>{new Date(item.competencia).toLocaleDateString()}</span>
                <div className="flex gap-4">
                  <span className="text-green-600">+ R$ {item.entradas.toFixed(2)}</span>
                  <span className="text-red-600">- R$ {item.saidas.toFixed(2)}</span>
                  <span className="font-bold">= R$ {item.saldo_final.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
