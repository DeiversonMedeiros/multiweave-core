import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMultiTenancy } from "@/hooks/useMultiTenancy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  banco: z.string().min(1, "Banco é obrigatório"),
  agencia: z.string().min(1, "Agência é obrigatória"),
  conta: z.string().min(1, "Conta é obrigatória"),
  saldo_inicial: z.string().min(1, "Saldo inicial é obrigatório"),
});

interface Props {
  item?: any;
  onSuccess: () => void;
}

export function BankAccountForm({ item, onSuccess }: Props) {
  const { currentCompany } = useMultiTenancy();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      banco: item?.banco || "",
      agencia: item?.agencia || "",
      conta: item?.conta || "",
      saldo_inicial: item?.saldo_inicial?.toString() || "0",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const data = {
        ...values,
        saldo_inicial: parseFloat(values.saldo_inicial),
        saldo_atual: parseFloat(values.saldo_inicial),
        company_id: currentCompany?.id,
      };

      if (item) {
        await supabase
          .schema('financeiro')
          .from("bank_accounts")
          .update(data)
          .eq("id", item.id);
      } else {
        await supabase
          .schema('financeiro')
          .from("bank_accounts")
          .insert(data);
      }

      toast({ title: "Sucesso", description: "Conta bancária salva com sucesso!" });
      onSuccess();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar conta bancária", variant: "destructive" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="banco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banco</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Banco do Brasil" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="agencia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agência</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="conta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="saldo_inicial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saldo Inicial</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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
