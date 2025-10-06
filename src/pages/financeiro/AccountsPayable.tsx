import React, { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { AccountPayableForm } from "@/components/financeiro/AccountPayableForm";
import { useAccountsPayable } from "@/hooks/financeiro/useAccountsPayable";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";

export default function AccountsPayable() {
  const { currentCompany } = useMultiTenancy();
  const { data: accountsPayable, loading, refetch } = useAccountsPayable(currentCompany?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filters, setFilters] = useState({ status: "all", search: "" });

  const columns = [
    { key: "descricao", header: "Descrição" },
    { key: "valor", header: "Valor", render: (row: any) => `R$ ${row.valor.toFixed(2)}` },
    { key: "vencimento", header: "Vencimento" },
    { key: "status", header: "Status" },
  ];

  const filteredData = accountsPayable?.filter((item: any) => {
    const matchStatus = filters.status === "all" || item.status === filters.status;
    const matchSearch = !filters.search || 
      item.descricao.toLowerCase().includes(filters.search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    refetch();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contas a Pagar</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar" : "Nova"} Conta a Pagar</DialogTitle>
            </DialogHeader>
            <AccountPayableForm item={editingItem} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-sm"
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filteredData || []}
        loading={loading}
        onEdit={handleEdit}
      />
    </div>
  );
}
