import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download } from "lucide-react";

type Column<T> = {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onNew?: () => void;
  onExport?: () => void;
  searchPlaceholder?: string;
  newButtonLabel?: string;
};

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onNew,
  onExport,
  searchPlaceholder = "Buscar...",
  newButtonLabel = "Novo",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  // Função recursiva para buscar valores em objetos aninhados
  const searchInValue = (value: any, searchTerm: string): boolean => {
    if (value === null || value === undefined) {
      return false;
    }

    // Se for um objeto, buscar recursivamente em seus valores
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      return Object.values(value).some((nestedValue) =>
        searchInValue(nestedValue, searchTerm)
      );
    }

    // Se for um array, buscar em cada item
    if (Array.isArray(value)) {
      return value.some((item) => searchInValue(item, searchTerm));
    }

    // Para valores primitivos, fazer a busca
    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
  };

  const filteredData = data.filter((item) => {
    if (!search.trim()) return true;
    return Object.values(item).some((value) =>
      searchInValue(value, search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
          {onNew && (
            <Button onClick={onNew}>
              <Plus className="mr-2 h-4 w-4" />
              {newButtonLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="data-table-header">
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  {columns.map((column, index) => (
                    <TableCell key={index} className={column.className}>
                      {typeof column.accessor === "function"
                        ? column.accessor(item)
                        : String(item[column.accessor] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
