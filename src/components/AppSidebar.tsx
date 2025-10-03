import { NavLink } from "react-router-dom";
import { 
  Building2, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Truck, 
  MapPin, 
  Users, 
  Fuel, 
  Factory, 
  Store, 
  Workflow, 
  Settings,
  LayoutDashboard
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Cadastros", url: "/cadastros", icon: Building2 },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Compras", url: "/compras", icon: ShoppingCart },
  { title: "Almoxarifado", url: "/almoxarifado", icon: Package },
  { title: "Frota", url: "/frota", icon: Truck },
  { title: "Logística", url: "/logistica", icon: MapPin },
  { title: "RH", url: "/rh", icon: Users },
  { title: "Combustível", url: "/combustivel", icon: Fuel },
  { title: "Metalúrgica", url: "/metalurgica", icon: Factory },
  { title: "Comercial", url: "/comercial", icon: Store },
  { title: "Implantação", url: "/implantacao", icon: Workflow },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-sidebar-primary" />
          {open && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">MultiWeave</span>
              <span className="text-xs text-sidebar-foreground/60">ERP System</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
