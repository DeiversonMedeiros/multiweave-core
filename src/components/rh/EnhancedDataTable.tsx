import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  MoreHorizontal,
} from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface EnhancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  title?: string;
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableExport?: boolean;
  enableSearch?: boolean;
  pageSize?: number;
  onAdd?: () => void;
  onExport?: () => void;
  actions?: React.ReactNode;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  initialSorting?: SortingState;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function EnhancedDataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nenhum item encontrado',
  searchPlaceholder = 'Buscar...',
  title,
  enableFilters = true,
  enablePagination = true,
  enableExport = true,
  enableSearch = true,
  pageSize = 10,
  onAdd,
  onExport,
  actions,
  searchable = true,
  filterable = true,
  pagination = true,
  initialSorting = [],
}: EnhancedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });

  // Logs para debug
  useEffect(() => {
    console.log('🔍 [EnhancedDataTable] Props recebidas:', {
      dataLength: data.length,
      initialSorting,
      currentSorting: sorting,
      pageSize
    });
  }, [data.length, initialSorting, sorting, pageSize]);

  // Aplicar ordenação inicial quando os dados mudarem
  useEffect(() => {
    console.log('🔄 [EnhancedDataTable] Verificando ordenação inicial:', {
      hasInitialSorting: initialSorting.length > 0,
      hasData: data.length > 0,
      initialSorting
    });
    
    if (initialSorting.length > 0 && data.length > 0) {
      console.log('✅ [EnhancedDataTable] Aplicando ordenação inicial:', initialSorting);
      setSorting(initialSorting);
    }
  }, [data.length, initialSorting]);

  // Configuração da tabela
  const table = useReactTable({
    data,
    columns,
    onSortingChange: (updater) => {
      console.log('🔄 [EnhancedDataTable] onSortingChange chamado:', updater);
      setSorting(updater);
    },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPaginationState,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: paginationState,
    },
  });

  // Log dos dados ordenados pela tabela
  useEffect(() => {
    const sortedRows = table.getSortedRowModel().rows;
    console.log('📊 [EnhancedDataTable] Dados ordenados pela tabela:', {
      totalRows: sortedRows.length,
      sortingState: sorting,
      firstThreeNames: sortedRows.slice(0, 3).map(row => {
        const data = row.original as any;
        return data?.nome || 'N/A';
      })
    });
  }, [table, sorting]);

  // Estatísticas
  const totalRows = table.getFilteredRowModel().rows.length;
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  // Função para exportar dados
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Exportação padrão para CSV
      const selectedData = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      const dataToExport = selectedData.length > 0 ? selectedData : data;
      
      const csvContent = convertToCSV(dataToExport, columns);
      downloadCSV(csvContent, `${title || 'data'}.csv`);
    }
  };

  // Função para converter dados para CSV
  const convertToCSV = (data: TData[], columns: ColumnDef<TData, TValue>[]) => {
    const headers = columns
      .filter(col => col.id !== 'actions' && col.id !== 'select')
      .map(col => col.header as string)
      .join(',');
    
    const rows = data.map(row => {
      return columns
        .filter(col => col.id !== 'actions' && col.id !== 'select')
        .map(col => {
          const value = (row as any)[col.id as string];
          return typeof value === 'string' ? `"${value}"` : value || '';
        })
        .join(',');
    });
    
    return [headers, ...rows].join('\n');
  };

  // Função para baixar CSV
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com estatísticas e ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title || 'Dados'}</CardTitle>
              <CardDescription>
                {totalRows} {totalRows === 1 ? 'item' : 'itens'} encontrado{totalRows === 1 ? '' : 's'}
                {selectedRows > 0 && ` • ${selectedRows} selecionado${selectedRows === 1 ? '' : 's'}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onAdd && (
                <Button onClick={() => {
                  console.log('🔍 [DEBUG] Botão Adicionar clicado no EnhancedDataTable');
                  onAdd();
                }} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              )}
              {enableExport && (
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
              {actions}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Busca global */}
            {enableSearch && searchable && (
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Filtros de coluna */}
            {enableFilters && filterable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Colunas
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Seletor de tamanho da página */}
            {enablePagination && pagination && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Itens por página:</span>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {enablePagination && pagination && totalPages > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({totalRows} {totalRows === 1 ? 'item' : 'itens'} total)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}