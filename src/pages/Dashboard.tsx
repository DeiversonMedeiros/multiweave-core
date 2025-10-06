import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart } from "lucide-react";
import { MenuDemo } from "@/components/MenuDemo";
import { TenantIsolationDemo } from "@/components/TenantIsolationDemo";
import { RequireModule } from "@/components/RequireAuth";

const stats = [
  {
    title: "Vendas do Mês",
    value: "R$ 125.430,00",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Pedidos Pendentes",
    value: "23",
    change: "-5.2%",
    trend: "down",
    icon: ShoppingCart,
  },
  {
    title: "Estoque Baixo",
    value: "8 itens",
    change: "+2",
    trend: "up",
    icon: Package,
  },
  {
    title: "Colaboradores Ativos",
    value: "142",
    change: "+3",
    trend: "up",
    icon: Users,
  },
];

export default function Dashboard() {
  return (
    <RequireModule moduleName="dashboard" action="read">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das operações da empresa
          </p>
        </div>

        {/* Demonstração do Menu Dinâmico */}
        <MenuDemo />

        {/* Demonstração do Isolamento Multi-tenant */}
        <TenantIsolationDemo />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs">
                {stat.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-primary" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                )}
                <span className={stat.trend === "up" ? "text-primary" : "text-destructive"}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground ml-1">em relação ao mês anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
            <CardDescription>Transações recentes no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Compra de Materiais</p>
                  <p className="text-sm text-muted-foreground">Fornecedor ABC Ltda</p>
                </div>
                <span className="font-bold text-destructive">-R$ 5.200,00</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Venda #1234</p>
                  <p className="text-sm text-muted-foreground">Cliente XYZ Corp</p>
                </div>
                <span className="font-bold text-primary">+R$ 12.450,00</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Pagamento Fornecedor</p>
                  <p className="text-sm text-muted-foreground">DEF Comércio</p>
                </div>
                <span className="font-bold text-destructive">-R$ 3.800,00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas do Sistema</CardTitle>
            <CardDescription>Itens que requerem atenção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="h-2 w-2 rounded-full bg-destructive mt-2"></div>
                <div>
                  <p className="font-medium">Estoque Crítico</p>
                  <p className="text-sm text-muted-foreground">
                    8 materiais abaixo do estoque mínimo
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="h-2 w-2 rounded-full bg-secondary mt-2"></div>
                <div>
                  <p className="font-medium">Pagamentos Pendentes</p>
                  <p className="text-sm text-muted-foreground">
                    5 faturas vencem nos próximos 7 dias
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                <div className="h-2 w-2 rounded-full bg-secondary mt-2"></div>
                <div>
                  <p className="font-medium">Documentos Fiscais</p>
                  <p className="text-sm text-muted-foreground">
                    12 notas pendentes de validação
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </RequireModule>
  );
}
