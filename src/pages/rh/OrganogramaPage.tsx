import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  User, 
  Plus, 
  Download,
  Upload,
  RefreshCw,
  Settings,
  BarChart3,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Building
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRHData, useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { Employee, Position, EmployeeInsert, EmployeeUpdate } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// TIPOS PARA O ORGANOGRAMA HIERÁRQUICO
// =====================================================

export interface OrganogramaNode {
  id: string;
  employee: Employee;
  children: OrganogramaNode[];
  level: number;
  parent?: OrganogramaNode;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function OrganogramaPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Hooks para dados
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useRHData<Employee>('employees', selectedCompany?.id || '');
  const { data: positionsData, isLoading: positionsLoading } = useRHData<Position>('positions', selectedCompany?.id || '');

  // Hooks para mutações
  const updateEmployee = useUpdateEntity<Employee>('rh', 'employees');
  const deleteEmployee = useDeleteEntity('rh', 'employees');

  // Dados
  const employees = employeesData?.data || [];
  const positions = positionsData?.data || [];

  // Filtrar funcionários ativos
  const activeEmployees = employees.filter(emp => emp.status === 'ativo');

  // Filtrar dados baseado na busca
  const filteredEmployees = activeEmployees.filter(employee => 
    employee.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.matricula && employee.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.cargo_id && getPositionName(employee.cargo_id).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Construir árvore hierárquica baseada no gestor_imediato_id
  const organogramaTree = useMemo(() => {
    return buildHierarchicalTree(filteredEmployees);
  }, [filteredEmployees]);

  // Estatísticas
  const stats = {
    totalEmployees: activeEmployees.length,
    managers: activeEmployees.filter(e => e.gestor_imediato_id).length,
    topLevel: organogramaTree.length,
    maxLevel: getMaxLevel(organogramaTree),
  };

  const isLoading = employeesLoading || positionsLoading;

  // Função para obter nome do cargo
  function getPositionName(positionId?: string) {
    if (!positionId) return 'Sem cargo';
    const position = positions.find(p => p.id === positionId);
    return position?.nome || 'Cargo não encontrado';
  }

  // Função para obter nome do gestor
  function getManagerName(managerId?: string) {
    if (!managerId) return null;
    const manager = employees.find(e => e.id === managerId);
    return manager?.nome || 'Gestor não encontrado';
  }

  // Função para alternar expansão de nós
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Função para expandir/colapsar todos
  const toggleAll = () => {
    if (expandedNodes.size === 0) {
      // Expandir todos
      const allNodeIds = new Set<string>();
      const collectIds = (nodes: OrganogramaNode[]) => {
        nodes.forEach(node => {
          allNodeIds.add(node.id);
          collectIds(node.children);
        });
      };
      collectIds(organogramaTree);
      setExpandedNodes(allNodeIds);
      } else {
      // Colapsar todos
      setExpandedNodes(new Set());
    }
  };

  // Handlers
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteEmployee.mutateAsync(employeeId);
      await refetchEmployees();
      toast({
        title: 'Sucesso',
        description: 'Funcionário excluído com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir funcionário.',
        variant: 'destructive',
      });
    }
  };

  const handleSetManager = async (employeeId: string, managerId?: string) => {
    try {
      await updateEmployee.mutateAsync({
        id: employeeId,
        gestor_imediato_id: managerId,
      });
      await refetchEmployees();
      toast({
        title: 'Sucesso',
        description: 'Gestor definido com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao definir gestor.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingEmployee) {
        // Atualizar funcionário
        await updateEmployee.mutateAsync({
          id: editingEmployee.id,
          ...data,
        });
        toast({
          title: 'Sucesso',
          description: 'Funcionário atualizado com sucesso.',
        });
      }
      
      await refetchEmployees();
      setIsFormOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar funcionário.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organograma</h1>
            <p className="text-gray-600 mt-1">
              Visualize a hierarquia organizacional baseada nos gestores imediatos
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Exportar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchEmployees()}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, matrícula ou cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {expandedNodes.size === 0 ? 'Expandir Todos' : 'Colapsar Todos'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Funcionários</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Com Gestor</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.managers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Nível Superior</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.topLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Níveis</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.maxLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organograma Hierárquico */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando organograma...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Estrutura Hierárquica</CardTitle>
              <CardDescription>
                Organograma baseado na hierarquia de gestores imediatos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                {organogramaTree.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Nenhum funcionário encontrado</p>
                    <p className="text-sm">Cadastre funcionários e defina seus gestores imediatos</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Organograma em desenvolvimento</p>
                    <p className="text-sm">Funcionalidade será implementada em breve</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function buildHierarchicalTree(employees: Employee[]): OrganogramaNode[] {
  const employeeMap = new Map<string, Employee>();
  const childrenMap = new Map<string, Employee[]>();
  
  // Mapear funcionários por ID
  employees.forEach(emp => {
    employeeMap.set(emp.id, emp);
  });
  
  // Agrupar funcionários por gestor
  employees.forEach(emp => {
    if (emp.gestor_imediato_id) {
      if (!childrenMap.has(emp.gestor_imediato_id)) {
        childrenMap.set(emp.gestor_imediato_id, []);
      }
      childrenMap.get(emp.gestor_imediato_id)!.push(emp);
    }
  });
  
  // Construir árvore
  const rootNodes: OrganogramaNode[] = [];
  
  employees.forEach(emp => {
    if (!emp.gestor_imediato_id) {
      const node = createNode(emp, 0, employeeMap, childrenMap);
      rootNodes.push(node);
    }
  });
  
  return rootNodes;
}

function createNode(employee: Employee, level: number, employeeMap: Map<string, Employee>, childrenMap: Map<string, Employee[]>): OrganogramaNode {
  const children = childrenMap.get(employee.id) || [];
  const childNodes = children.map(child => createNode(child, level + 1, employeeMap, childrenMap));
  
  return {
    id: employee.id,
    employee,
    children: childNodes,
    level
  };
}

function getMaxLevel(nodes: OrganogramaNode[]): number {
  let maxLevel = 0;
  nodes.forEach(node => {
    maxLevel = Math.max(maxLevel, node.level);
    maxLevel = Math.max(maxLevel, getMaxLevel(node.children));
  });
  return maxLevel;
}