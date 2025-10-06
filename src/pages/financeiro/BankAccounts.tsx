import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { BankAccountForm } from "@/components/financeiro/BankAccountForm";
import { useBankAccounts } from "@/hooks/financeiro/useBankAccounts";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";

export default function BankAccounts() {
  const { currentCompany } = useMultiTenancy();
  const { data: bankAccounts, loading, refetch } = useBankAccounts(currentCompany?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    { key: "banco", header: "Banco" },
    { key: "agencia", header: "Agência" },
    { key: "conta", header: "Conta" },
    { key: "saldo_atual", header: "Saldo", render: (row: any) => `R$ ${row.saldo_atual?.toFixed(2) || "0.00"}` },
  ];

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
        <h1 className="text-3xl font-bold">Contas Bancárias</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar" : "Nova"} Conta Bancária</DialogTitle>
            </DialogHeader>
            <BankAccountForm item={editingItem} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={bankAccounts || []}
        loading={loading}
        onEdit={handleEdit}
      />
    </div>
  );
}
