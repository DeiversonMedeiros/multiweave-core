import React, { useState } from 'react';
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
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Download,
} from 'lucide-react';

// =====================================================
// INTERFACES
// =====================================================

interface SimpleColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
}

interface SimpleDataTableProps<T> {
  data: T[];
  columns: SimpleColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  pagination?: boolean;
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

export function SimpleDataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  pagination = true,
  onAdd,
  onExport,
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum registro encontrado",
  pageSize = 10,
  className = "",
}: SimpleDataTableProps<T>) {
  console.log('🔍 [SimpleDataTable] data:', data);
  console.log('🔍 [SimpleDataTable] data length:', data?.length);
  console.log('🔍 [SimpleDataTable] columns:', columns);
  console.log('🔍 [SimpleDataTable] loading:', loading);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar dados baseado no termo de pesquisa
  const filteredData = (Array.isArray(data) ? data : []).filter((item: any) => {
    if (!searchTerm) return true;
    
    // Buscar em todos os campos string do objeto
    return Object.values(item).some((value: any) => {
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  });
  
  console.log('🔍 [SimpleDataTable] filteredData:', filteredData);
  console.log('🔍 [SimpleDataTable] filteredData length:', filteredData.length);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  console.log('🔍 [SimpleDataTable] paginatedData:', paginatedData);
  console.log('🔍 [SimpleDataTable] paginatedData length:', paginatedData.length);

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset para primeira página ao pesquisar
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="border rounded-md">
          <div className="h-64 bg-gray-50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header com busca e ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
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
                <Button onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                    Carregando...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item: any, index: number) => {
                console.log(`🔍 [SimpleDataTable] Renderizando linha ${index}:`, {
                  itemId: item?.id,
                  itemKeys: item ? Object.keys(item) : null,
                  columnsCount: columns.length
                });
                return (
                  <TableRow key={item?.id || `row-${index}`}>
                    {columns.map((column) => {
                      try {
                        const rendered = column.render(item);
                        console.log(`  ↳ Coluna ${column.key}:`, typeof rendered);
                        return (
                          <TableCell key={column.key}>
                            {rendered}
                          </TableCell>
                        );
                      } catch (error) {
                        console.error(`❌ [SimpleDataTable] Erro ao renderizar coluna ${column.key}:`, error);
                        return (
                          <TableCell key={column.key}>
                            <span className="text-red-500">Erro</span>
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredData.length)} de {filteredData.length} registros
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
