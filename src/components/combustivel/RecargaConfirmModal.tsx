import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useConfirmRecarga } from '@/hooks/combustivel/useCombustivel';
import type { RefuelRequest, RecargaConfirmFormData } from '@/types/combustivel';

const recargaSchema = z.object({
  valor_recarregado: z.number().min(0.01, 'Valor deve ser maior que zero'),
  recarga_anexo_url: z.string().optional(),
  recarga_observacoes: z.string().optional(),
});

type RecargaFormData = z.infer<typeof recargaSchema>;

interface RecargaConfirmModalProps {
  request: RefuelRequest;
  isOpen: boolean;
  onClose: () => void;
}

export function RecargaConfirmModal({ request, isOpen, onClose }: RecargaConfirmModalProps) {
  const [uploading, setUploading] = useState(false);
  const confirmRecarga = useConfirmRecarga();

  const form = useForm<RecargaFormData>({
    resolver: zodResolver(recargaSchema),
    defaultValues: {
      valor_recarregado: request.valor_solicitado || 0,
      recarga_anexo_url: '',
      recarga_observacoes: '',
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      // Aqui você implementaria o upload do arquivo
      // Por enquanto, apenas simula
      await new Promise(resolve => setTimeout(resolve, 1000));
      const fileUrl = URL.createObjectURL(file);
      form.setValue('recarga_anexo_url', fileUrl);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (data: RecargaFormData) => {
    confirmRecarga.mutate(
      {
        requestId: request.id,
        data: {
          valor_recarregado: data.valor_recarregado,
          recarga_anexo_url: data.recarga_anexo_url,
          recarga_observacoes: data.recarga_observacoes,
        },
      },
      {
        onSuccess: () => {
          onClose();
          form.reset();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Recarga no Ticket Log</DialogTitle>
          <DialogDescription>
            Confirme o valor recarregado no cartão do condutor {request.condutor_nome}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Solicitação: {request.numero_solicitacao}
              </p>
              <p className="text-sm text-blue-700">
                Valor solicitado: R$ {request.valor_solicitado.toFixed(2)}
              </p>
            </div>

            <FormField
              control={form.control}
              name="valor_recarregado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Recarregado (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recarga_anexo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comprovante de Recarga</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file);
                          }
                        }}
                        disabled={uploading}
                      />
                      {field.value && (
                        <p className="text-xs text-green-600">Arquivo anexado com sucesso</p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recarga_observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a recarga"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={confirmRecarga.isPending || uploading}>
                {confirmRecarga.isPending || uploading ? 'Confirmando...' : 'Confirmar Recarga'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

