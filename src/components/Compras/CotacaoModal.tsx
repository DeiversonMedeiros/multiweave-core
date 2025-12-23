// =====================================================
// MODAL DE COTAÇÃO - ARQUITETURA DECISION-CENTERED UI
// =====================================================
// 3 Abas: Contexto | Itens & Fornecedores | Cotação (Decisão)

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseQuoteStore, PurchaseQuoteProvider } from '@/stores/purchaseQuoteStore';
import { QuoteContextTab } from './Cotacao/QuoteContextTab';
import { ItemsSuppliersTab } from './Cotacao/ItemsSuppliersTab';
import { QuoteDecisionTab } from './Cotacao/QuoteDecisionTab';

interface CotacaoModalProps {
  cotacao: any;
  isOpen: boolean;
  isEditMode: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function CotacaoModalContent({ cotacao, isOpen, isEditMode, onClose, onSave }: CotacaoModalProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const {
    loading,
    saving,
    loadQuoteData,
    submitQuote,
    reset,
    context,
  } = usePurchaseQuoteStore();

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (isOpen && cotacao?.id && selectedCompany?.id) {
      loadQuoteData(cotacao.id, selectedCompany.id).catch((error) => {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da cotação.",
          variant: "destructive",
        });
      });
    } else if (!isOpen) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cotacao?.id, selectedCompany?.id]);

  const handleSave = async () => {
    if (!selectedCompany?.id) {
      toast({
        title: "Erro",
        description: "Empresa não selecionada.",
        variant: "destructive",
      });
      return;
    }

    try {
      await submitQuote(selectedCompany.id);
      toast({
        title: "Sucesso",
        description: "Cotação salva com sucesso.",
      });
      await onSave({}); // Notificar componente pai
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cotação.",
        variant: "destructive",
      });
    }
  };

  if (!cotacao) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar' : 'Visualizar'} Cotação - {context?.numero_cotacao || cotacao.numero_cotacao}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Gerencie a cotação: defina fornecedores e compare valores para tomar a decisão'
              : 'Visualize todas as informações da cotação'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <Tabs defaultValue="contexto" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contexto">Contexto</TabsTrigger>
              <TabsTrigger value="itens-fornecedores">Itens & Fornecedores</TabsTrigger>
              <TabsTrigger value="cotacao">Mapa Cotação</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="contexto" className="mt-0">
                <QuoteContextTab />
              </TabsContent>

              <TabsContent value="itens-fornecedores" className="mt-0 h-full">
                <ItemsSuppliersTab />
              </TabsContent>

              <TabsContent value="cotacao" className="mt-0">
                <QuoteDecisionTab />
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading || saving}>
            {isEditMode ? 'Cancelar' : 'Fechar'}
          </Button>
          {isEditMode && (
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Enviar para Aprovação'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CotacaoModal(props: CotacaoModalProps) {
  return (
    <PurchaseQuoteProvider>
      <CotacaoModalContent {...props} />
    </PurchaseQuoteProvider>
  );
}






