import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  Building
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Employee, Unit, Position } from '@/integrations/supabase/rh-types';

// =====================================================
// TIPOS PARA O ORGANOGRAMA
// =====================================================

export interface OrganogramaNode {
  id: string;
  type: 'unit' | 'employee';
  data: Unit | Employee;
  children: OrganogramaNode[];
  level: number;
  parent?: OrganogramaNode;
}

export interface OrganogramaChartProps {
  units: Unit[];
  employees: Employee[];
  positions: Position[];
  onEditUnit?: (unit: Unit) => void;
  onEditEmployee?: (employee: Employee) => void;
  onAddEmployee?: (unitId?: string) => void;
  onAddUnit?: (parentUnitId?: string) => void;
  onDeleteUnit?: (unitId: string) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  onMoveEmployee?: (employeeId: string, newUnitId: string) => void;
  onSetManager?: (employeeId: string, managerId?: string) => void;
}

// =====================================================
// COMPONENTE PRINCIPAL DO ORGANOGRAMA
// =====================================================

export function OrganogramaChart({
  units,
  employees,
  positions,
  onEditUnit,
  onEditEmployee,
  onAddEmployee,
  onAddUnit,
  onDeleteUnit,
  onDeleteEmployee,
  onMoveEmployee,
  onSetManager
}: OrganogramaChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Construir a árvore hierárquica
  const organogramaTree = useMemo(() => {
    return buildOrganogramaTree(units, employees, positions);
  }, [units, employees, positions]);

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

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
          >
            {expandedNodes.size === 0 ? 'Expandir Todos' : 'Colapsar Todos'}
          </Button>
          <Badge variant="secondary">
            {units.length} Departamentos • {employees.length} Funcionários
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onAddUnit?.()}
            size="sm"
            className="flex items-center space-x-1"
          >
            <Building className="h-4 w-4" />
            <span>Novo Departamento</span>
          </Button>
          <Button
            onClick={() => onAddEmployee?.()}
            size="sm"
            className="flex items-center space-x-1"
          >
            <UserPlus className="h-4 w-4" />
            <span>Novo Funcionário</span>
          </Button>
        </div>
      </div>

      {/* Árvore do Organograma */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {organogramaTree.map((node) => (
              <OrganogramaNodeComponent
                key={node.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                selectedNode={selectedNode}
                onToggle={toggleNode}
                onSelect={setSelectedNode}
                onEditUnit={onEditUnit}
                onEditEmployee={onEditEmployee}
                onAddEmployee={onAddEmployee}
                onAddUnit={onAddUnit}
                onDeleteUnit={onDeleteUnit}
                onDeleteEmployee={onDeleteEmployee}
                onMoveEmployee={onMoveEmployee}
                onSetManager={onSetManager}
                employees={employees}
                positions={positions}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// COMPONENTE DE NÓ DO ORGANOGRAMA
// =====================================================

interface OrganogramaNodeComponentProps {
  node: OrganogramaNode;
  level: number;
  expandedNodes: Set<string>;
  selectedNode: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onEditUnit?: (unit: Unit) => void;
  onEditEmployee?: (employee: Employee) => void;
  onAddEmployee?: (unitId?: string) => void;
  onAddUnit?: (parentUnitId?: string) => void;
  onDeleteUnit?: (unitId: string) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  onMoveEmployee?: (employeeId: string, newUnitId: string) => void;
  onSetManager?: (employeeId: string, managerId?: string) => void;
  employees: Employee[];
  positions: Position[];
}

function OrganogramaNodeComponent({
  node,
  level,
  expandedNodes,
  selectedNode,
  onToggle,
  onSelect,
  onEditUnit,
  onEditEmployee,
  onAddEmployee,
  onAddUnit,
  onDeleteUnit,
  onDeleteEmployee,
  onMoveEmployee,
  onSetManager,
  employees,
  positions
}: OrganogramaNodeComponentProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNode === node.id;
  const hasChildren = node.children.length > 0;

  const handleToggle = () => {
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  const handleSelect = () => {
    onSelect(node.id);
  };

  const getPositionName = (positionId?: string) => {
    if (!positionId) return 'Sem cargo';
    const position = positions.find(p => p.id === positionId);
    return position?.nome || 'Cargo não encontrado';
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return null;
    const manager = employees.find(e => e.id === managerId);
    return manager?.nome || 'Gerente não encontrado';
  };

  return (
    <div className="space-y-1">
      {/* Nó Principal */}
      <div
        className={`
          flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}
        `}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={handleSelect}
      >
        {/* Ícone de Expansão */}
        <div className="flex-shrink-0">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-6 w-6" />
          )}
        </div>

        {/* Ícone do Tipo */}
        <div className="flex-shrink-0">
          {node.type === 'unit' ? (
            <Building2 className="h-5 w-5 text-blue-600" />
          ) : (
            <User className="h-5 w-5 text-green-600" />
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900 truncate">
              {node.type === 'unit' 
                ? (node.data as Unit).nome 
                : (node.data as Employee).nome
              }
            </h4>
            
            {node.type === 'employee' && (
              <Badge variant="outline" className="text-xs">
                {getPositionName((node.data as Employee).cargo_id)}
              </Badge>
            )}
          </div>
          
          {node.type === 'unit' && (
            <p className="text-sm text-gray-500 truncate">
              {(node.data as Unit).descricao || 'Sem descrição'}
            </p>
          )}
          
          {node.type === 'employee' && (
            <div className="text-sm text-gray-500 space-y-1">
              <p>{(node.data as Employee).matricula && `Matrícula: ${(node.data as Employee).matricula}`}</p>
              {getManagerName((node.data as Employee).manager_id) && (
                <p>Gerente: {getManagerName((node.data as Employee).manager_id)}</p>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {node.type === 'unit' ? (
                <>
                  <DropdownMenuItem onClick={() => onEditUnit?.(node.data as Unit)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Departamento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddEmployee?.(node.id)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Gerenciar Funcionários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddUnit?.(node.id)}>
                    <Building className="h-4 w-4 mr-2" />
                    Adicionar Subdepartamento
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDeleteUnit?.(node.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Departamento
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onEditEmployee?.(node.data as Employee)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Funcionário
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSetManager?.(node.id, undefined)}>
                    <User className="h-4 w-4 mr-2" />
                    Definir como Gerente
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filhos */}
      {isExpanded && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <OrganogramaNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelect={onSelect}
              onEditUnit={onEditUnit}
              onEditEmployee={onEditEmployee}
              onAddEmployee={onAddEmployee}
              onAddUnit={onAddUnit}
              onDeleteUnit={onDeleteUnit}
              onDeleteEmployee={onDeleteEmployee}
              onMoveEmployee={onMoveEmployee}
              onSetManager={onSetManager}
              employees={employees}
              positions={positions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

function buildOrganogramaTree(
  units: Unit[],
  employees: Employee[],
  positions: Position[]
): OrganogramaNode[] {
  // Criar mapa de unidades por ID
  const unitMap = new Map<string, Unit>();
  units.forEach(unit => unitMap.set(unit.id, unit));

  // Criar mapa de funcionários por ID
  const employeeMap = new Map<string, Employee>();
  employees.forEach(employee => employeeMap.set(employee.id, employee));

  // Criar nós para unidades
  const unitNodes = units.map(unit => ({
    id: unit.id,
    type: 'unit' as const,
    data: unit,
    children: [] as OrganogramaNode[],
    level: 0,
  }));

  // Criar nós para funcionários
  const employeeNodes = employees.map(employee => ({
    id: employee.id,
    type: 'employee' as const,
    data: employee,
    children: [] as OrganogramaNode[],
    level: 0,
  }));

  // Organizar hierarquia de unidades
  const unitHierarchy = new Map<string, OrganogramaNode>();
  unitNodes.forEach(node => unitHierarchy.set(node.id, node));

  // Adicionar funcionários às suas unidades
  employeeNodes.forEach(employeeNode => {
    const employee = employeeNode.data as Employee;
    if (employee.departamento_id) {
      const unitNode = unitHierarchy.get(employee.departamento_id);
      if (unitNode) {
        unitNode.children.push(employeeNode);
        employeeNode.parent = unitNode;
      }
    }
  });

  // Retornar apenas unidades de nível raiz (sem responsável ou responsável não é unidade)
  const rootUnits = unitNodes.filter(unitNode => {
    const unit = unitNode.data as Unit;
    return !unit.responsavel_id || !unitMap.has(unit.responsavel_id);
  });

  return rootUnits;
}
