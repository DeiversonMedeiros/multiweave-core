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
  externalSearchTerm?: string; // Permite controlar a busca externamente
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
  externalSearchTerm,
}: SimpleDataTableProps<T>) {
  console.log('🔍 [SimpleDataTable] data:', data);
  console.log('🔍 [SimpleDataTable] data length:', data?.length);
  console.log('🔍 [SimpleDataTable] columns:', columns);
  console.log('🔍 [SimpleDataTable] loading:', loading);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Usar searchTerm externo se fornecido, caso contrário usar o interno
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;

  // Ordenar e filtrar dados
  const processedData = useMemo(() => {
    const dataArray = Array.isArray(data) ? data : [];
    
    // Ordenar alfabeticamente por nome (se existir campo 'nome')
    const sortedData = [...dataArray].sort((a: any, b: any) => {
      // Tentar ordenar por 'nome' primeiro
      if (a?.nome && b?.nome) {
        const nomeA = (a.nome || '').toLowerCase().trim();
        const nomeB = (b.nome || '').toLowerCase().trim();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      }
      // Se não tiver 'nome', tentar ordenar por 'id' ou manter ordem original
      return 0;
    });
    
    console.log('🔍 [SimpleDataTable] Dados ordenados:', {
      total: sortedData.length,
      firstThree: sortedData.slice(0, 3).map((item: any) => item?.nome || item?.id || 'N/A')
    });
    
    return sortedData;
  }, [data]);

  // Filtrar dados baseado no termo de pesquisa
  const filteredData = useMemo(() => {
    if (!searchTerm) return processedData;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return processedData.filter((item: any) => {
      // Buscar especificamente em campos importantes: nome, matrícula, CPF
      const nome = (item?.nome || '').toLowerCase();
      const matricula = (item?.matricula || '').toLowerCase();
      const cpf = (item?.cpf || '').toLowerCase();
      
      // Buscar também em campos aninhados (se existirem)
      const cargoNome = (item?.cargo?.nome || '').toLowerCase();
      const departamentoNome = (item?.departamento?.nome || '').toLowerCase();
      
      return nome.includes(searchLower) || 
             matricula.includes(searchLower) || 
             cpf.includes(searchLower) ||
             cargoNome.includes(searchLower) ||
             departamentoNome.includes(searchLower);
    });
  }, [processedData, searchTerm]);
  
  console.log('🔍 [SimpleDataTable] Filtro aplicado:', {
    searchTerm,
    totalAntes: processedData.length,
    totalDepois: filteredData.length,
    primeirosFiltrados: filteredData.slice(0, 3).map((item: any) => ({
      nome: item?.nome,
      matricula: item?.matricula
    }))
  });

  // Paginação
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  console.log('🔍 [SimpleDataTable] paginatedData:', paginatedData);
  console.log('🔍 [SimpleDataTable] paginatedData length:', paginatedData.length);

  // Handlers
  const handleSearchChange = (value: string) => {
    if (externalSearchTerm === undefined) {
      // Só atualizar o estado interno se não houver controle externo
      setInternalSearchTerm(value);
    }
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

  // Função para calcular quais números de página mostrar
  const getPageNumbers = () => {
    const delta = 2; // Número de páginas a mostrar antes e depois da atual
    const pages: (number | string)[] = [];

    // Se há poucas páginas, mostrar todas
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Sempre incluir primeira página
    pages.push(1);

    // Calcular início e fim do range central
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);

    // Ajustar se estiver muito próximo do início
    if (currentPage <= delta + 2) {
      end = Math.min(5, totalPages - 1);
    }

    // Ajustar se estiver muito próximo do fim
    if (currentPage >= totalPages - delta - 1) {
      start = Math.max(2, totalPages - 4);
    }

    // Adicionar "..." após primeira página se necessário
    if (start > 2) {
      pages.push('...');
    }

    // Adicionar páginas do range central
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Adicionar "..." antes da última página se necessário
    if (end < totalPages - 1) {
      pages.push('...');
    }

    // Sempre incluir última página
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
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
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-2 text-muted-foreground"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
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
