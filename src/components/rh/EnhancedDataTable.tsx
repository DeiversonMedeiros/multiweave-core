import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Plus,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

// =====================================================
// INTERFACES
// =====================================================

interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive' | 'outline';
  condition?: (item: any) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  actions?: ActionItem[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  onAdd?: () => void;
  onExport?: () => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  className?: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function EnhancedDataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  filterable = true,
  pagination = true,
  actions = [],
  onEdit,
  onDelete,
  onView,
  onAdd,
  onExport,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum registro encontrado',
  pageSize = 10,
  className = '',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrar dados baseado no termo de busca
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter((item) => {
      return Object.values(item as any).some((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm);
        }
        return false;
      });
    });
  }, [data, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = pagination 
    ? filteredData.slice(startIndex, endIndex)
    : filteredData;

  // Ordenação
  const sortedData = useMemo(() => {
    if (!sortField) return paginatedData;
    
    return [...paginatedData].sort((a, b) => {
      const aValue = (a as any)[sortField];
      const bValue = (b as any)[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [paginatedData, sortField, sortDirection]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Renderizar ações da tabela
  const renderTableActions = (item: T) => {
    const availableActions = actions.filter(action => 
      !action.condition || action.condition(item)
    );

    if (availableActions.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => action.onClick(item)}
              className={action.variant === 'destructive' ? 'text-red-600' : ''}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Renderizar cabeçalho da tabela
  const renderTableHeader = () => (
    <div className="flex items-center justify-between space-y-2">
      <div className="flex items-center space-x-2">
        {searchable && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
        )}
        {filterable && (
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        )}
      </div>
    </div>
  );

  // Renderizar paginação
  const renderPagination = () => {
    if (!pagination || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Mostrando {startIndex + 1} a {Math.min(endIndex, filteredData.length)} de {filteredData.length} registros
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {renderTableHeader()}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableHead>
                ))}
                {actions.length > 0 && <TableHead>Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {renderTableHeader()}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead 
                  key={index}
                  className={sortField === (column as any).accessorKey ? 'bg-muted' : ''}
                >
                  <div className="flex items-center space-x-2">
                    <span>{(column as any).header}</span>
                    {(column as any).accessorKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort((column as any).accessorKey)}
                      >
                        {sortField === (column as any).accessorKey && sortDirection === 'asc' ? '↑' : '↓'}
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions.length > 0 && <TableHead>Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-8">
                  <div className="text-muted-foreground">{emptyMessage}</div>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow key={index}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      {(column as any).cell ? 
                        (column as any).cell({ row: { original: item } }) : 
                        (item as any)[(column as any).accessorKey]
                      }
                    </TableCell>
                  ))}
                  {actions.length > 0 && (
                    <TableCell>
                      {renderTableActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {renderPagination()}
    </div>
  );
}

export default EnhancedDataTable;
