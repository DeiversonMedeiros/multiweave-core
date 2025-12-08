import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield, DollarSign, FolderKanban, UserCircle, Package, Building, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

const cadastros = [
  {
    title: "Empresas/Filiais",
    description: "Cadastro de empresas e filiais do grupo",
    icon: Building2,
    path: "/cadastros/empresas",
    color: "text-primary",
  },
  {
    title: "Usuários",
    description: "Gerenciar usuários do sistema",
    icon: Users,
    path: "/cadastros/usuarios",
    color: "text-secondary",
  },
  {
    title: "Perfis de Acesso",
    description: "Configurar permissões e níveis de acesso",
    icon: Shield,
    path: "/cadastros/perfis",
    color: "text-primary",
  },
  {
    title: "Centros de Custo",
    description: "Gestão de centros de custo",
    icon: DollarSign,
    path: "/cadastros/centros-custo",
    color: "text-secondary",
  },
  {
    title: "Projetos",
    description: "Cadastro e acompanhamento de projetos",
    icon: FolderKanban,
    path: "/cadastros/projetos",
    color: "text-primary",
  },
  {
    title: "Parceiros",
    description: "Clientes, fornecedores e transportadores",
    icon: UserCircle,
    path: "/cadastros/parceiros",
    color: "text-secondary",
  },
  {
    title: "Serviços",
    description: "Cadastro de serviços vinculados a projetos e clientes",
    icon: Wrench,
    path: "/cadastros/servicos",
    color: "text-primary",
  },
  {
    title: "Materiais/Serviços",
    description: "Produtos, serviços e matérias-primas",
    icon: Package,
    path: "/cadastros/materiais",
    color: "text-secondary",
  },
  {
    title: "Departamentos",
    description: "Gestão de departamentos e unidades organizacionais",
    icon: Building,
    path: "/cadastros/departamentos",
    color: "text-secondary",
  },
];

export default function CadastrosIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cadastros</h1>
        <p className="text-muted-foreground mt-1">
          Cadastros mestres do sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cadastros.map((cadastro) => (
          <Link key={cadastro.path} to={cadastro.path}>
            <Card className="card-hover h-full cursor-pointer">
              <CardHeader>
                <div className={`p-2 w-fit rounded-lg bg-primary/10 mb-2 ${cadastro.color}`}>
                  <cadastro.icon className="h-6 w-6" />
                </div>
                <CardTitle>{cadastro.title}</CardTitle>
                <CardDescription>{cadastro.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
