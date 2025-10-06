import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.string().min(1, "Valor é obrigatório"),
  vencimento: z.string().min(1, "Vencimento é obrigatório"),
  status: z.enum(["pendente", "aprovado", "pago", "cancelado"]),
  observacoes: z.string().optional(),
});

interface Props {
  item?: any;
  onSuccess: () => void;
}

export function AccountPayableForm({ item, onSuccess }: Props) {
  const { currentCompany } = useMultiTenancy();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: item?.descricao || "",
      valor: item?.valor?.toString() || "",
      vencimento: item?.vencimento || "",
      status: item?.status || "pendente",
      observacoes: item?.observacoes || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const data = {
        ...values,
        valor: parseFloat(values.valor),
        company_id: currentCompany?.id,
      };

      if (item) {
        const { error: updateError } = await (supabase as any)
          .from("accounts_payable")
          .update(data)
          .eq("id", item.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from("accounts_payable")
          .insert(data);
        if (insertError) throw insertError;
      }

      toast({ title: "Sucesso", description: "Conta salva com sucesso!" });
      onSuccess();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar conta", variant: "destructive" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vencimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </Form>
  );
}
