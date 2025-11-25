import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMenu, MenuItem } from '@/hooks/useMenu';
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
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DynamicMenuProps {
  className?: string;
}

export const DynamicMenu: React.FC<DynamicMenuProps> = ({ className }) => {
  const { open } = useSidebar();
  const { menuItems } = useMenu();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const indentClass = level > 0 ? `ml-${Math.min(level * 6, 24)}` : '';
    const isPortal = item.isPortal;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isExpanded}
          onOpenChange={() => toggleExpanded(item.id)}
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton 
                className={`w-full ${indentClass} ${
                  isPortal 
                    ? 'bg-green-100 hover:bg-green-200 text-green-900 hover:text-green-900 border-l-4 border-green-500 font-semibold' 
                    : ''
                }`}
              >
                <item.icon className={`h-4 w-4 ${isPortal ? 'text-green-600' : ''}`} />
                {open && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {isExpanded ? (
                      <ChevronDown className={`h-4 w-4 ${isPortal ? 'text-green-600' : ''}`} />
                    ) : (
                      <ChevronRight className={`h-4 w-4 ${isPortal ? 'text-green-600' : ''}`} />
                    )}
                  </>
                )}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-2">
                {item.children!.map(child => renderMenuItem(child, level + 1))}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton asChild className={indentClass}>
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
    );
  };

  return (
    <Sidebar collapsible="icon" className={`border-r border-sidebar-border ${className}`}>
      <SidebarContent className="sidebar-scrollbar">
        <div className="p-4 flex items-center justify-center">
          <img
            src="/logo-vision.png"
            alt="Vision ERP"
            className={`transition-all duration-200 ${open ? 'h-12' : 'h-10'} w-auto`}
          />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => renderMenuItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

// Componente para menu horizontal (topbar)
export const DynamicTopMenu: React.FC = () => {
  const { simpleItems, dropdownItems } = useMenu();
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);

  return (
    <nav className="flex items-center space-x-4">
      {simpleItems.map(item => (
        <NavLink
          key={item.id}
          to={item.url}
          end={item.url === "/"}
          className={({ isActive }) =>
            `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`
          }
        >
          <item.icon className="h-4 w-4 inline mr-2" />
          {item.title}
        </NavLink>
      ))}
      
      {dropdownItems.map(item => (
        <div key={item.id} className="relative">
          <button
            onClick={() => setExpandedDropdown(
              expandedDropdown === item.id ? null : item.id
            )}
            className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center"
          >
            <item.icon className="h-4 w-4 inline mr-2" />
            {item.title}
            {expandedDropdown === item.id ? (
              <ChevronDown className="h-4 w-4 ml-1" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-1" />
            )}
          </button>
          
          {expandedDropdown === item.id && item.children && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-50">
              {item.children.map(child => (
                <NavLink
                  key={child.id}
                  to={child.url}
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setExpandedDropdown(null)}
                >
                  <child.icon className="h-4 w-4 inline mr-2" />
                  {child.title}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

// Componente para breadcrumbs dinâmicos
export const DynamicBreadcrumbs: React.FC = () => {
  const { menuItems } = useMenu();
  
  // Esta função seria implementada para encontrar o caminho atual
  // baseado na URL atual e nas permissões do usuário
  const getCurrentPath = () => {
    // Implementação seria baseada na URL atual
    return [];
  };

  const currentPath = getCurrentPath();

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {currentPath.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <span className="text-muted-foreground">/</span>}
          <NavLink
            to={item.url}
            className="text-muted-foreground hover:text-foreground"
          >
            {item.title}
          </NavLink>
        </React.Fragment>
      ))}
    </nav>
  );
};
