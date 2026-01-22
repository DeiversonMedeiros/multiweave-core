import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Partner } from "@/lib/supabase-types";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCompany } from "@/lib/company-context";
import { Separator } from "@/components/ui/separator";

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const bancosBrasileiros = [
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '033', nome: 'Banco Santander' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Banco Bradesco' },
  { codigo: '341', nome: 'Banco Itaú' },
  { codigo: '356', nome: 'Banco Real' },
  { codigo: '422', nome: 'Banco Safra' },
  { codigo: '748', nome: 'Banco Sicredi' },
  { codigo: '756', nome: 'Banco Inter' },
  { codigo: '260', nome: 'Nu Pagamentos' },
  { codigo: '290', nome: 'PagBank' },
  { codigo: '077', nome: 'Banco Inter' },
  { codigo: '212', nome: 'Banco Original' },
  { codigo: '070', nome: 'Banco de Brasília' },
  { codigo: '085', nome: 'Cooperativa Central de Crédito' },
  { codigo: '136', nome: 'Unicred' },
  { codigo: '208', nome: 'Banco BTG Pactual' },
  { codigo: '218', nome: 'Banco BS2' },
  { codigo: '222', nome: 'Banco Credit Agricole' },
  { codigo: '336', nome: 'Banco C6' },
  { codigo: '380', nome: 'PicPay' },
];

const tiposChavePix = [
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'chave_aleatoria', label: 'Chave Aleatória' },
];

const partnerSchema = z.object({
  razao_social: z.string().min(3, "Razão social deve ter no mínimo 3 caracteres").max(200),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos"),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  matriz_id: z.string().optional().nullable(),
  tipos: z.object({
    cliente: z.boolean(),
    fornecedor: z.boolean(),
    transportador: z.boolean(),
  }).refine(data => data.cliente || data.fornecedor || data.transportador, {
    message: "Selecione pelo menos um tipo",
  }),
  endereco: z.object({
    cep: z.string().optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    pais: z.string().optional().default("Brasil"),
  }).optional(),
  contato: z.object({
    telefone: z.string().optional(),
    celular: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")).or(z.undefined()),
    site: z.string().optional().refine((val) => !val || val === "" || /^https?:\/\/.+/.test(val), {
      message: "URL inválida. Deve começar com http:// ou https://",
    }),
    nome_contato: z.string().optional(),
    cargo_contato: z.string().optional(),
  }).optional(),
  observacoes: z.string().optional(),
  dados_bancarios: z.object({
    banco_codigo: z.string().optional(),
    banco_nome: z.string().optional(),
    agencia: z.string().optional(),
    conta: z.string().optional(),
    tipo_conta: z.enum(['corrente', 'poupanca']).optional(),
    pix: z.array(z.object({
      tipo: z.enum(['cpf_cnpj', 'email', 'telefone', 'chave_aleatoria']),
      valor: z.string().min(1, "Valor da chave PIX é obrigatório"),
    })).optional(),
  }).optional(),
  ativo: z.boolean().default(true),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

export default function Parceiros() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const [parceiros, setParceiros] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParceiro, setEditingParceiro] = useState<Partner | null>(null);
  const { selectedCompany } = useCompany();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      matriz_id: null,
      tipos: { cliente: false, fornecedor: false, transportador: false },
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "Brasil",
      },
      contato: {
        telefone: "",
        celular: "",
        email: "",
        site: "",
        nome_contato: "",
        cargo_contato: "",
      },
      observacoes: "",
      dados_bancarios: {
        banco_codigo: "",
        banco_nome: "",
        agencia: "",
        conta: "",
        tipo_conta: undefined,
        pix: [],
      },
      ativo: true,
    },
  });

  useEffect(() => {
    if (selectedCompany) {
      fetchParceiros();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (editingParceiro && isDialogOpen) {
      const endereco = (editingParceiro.endereco as any) || {};
      const contato = (editingParceiro.contato as any) || {};
      const tipos = editingParceiro.tipo as string[];

      form.reset({
        razao_social: editingParceiro.razao_social || "",
        nome_fantasia: editingParceiro.nome_fantasia || "",
        cnpj: editingParceiro.cnpj || "",
        inscricao_estadual: (editingParceiro as any).inscricao_estadual || "",
        inscricao_municipal: (editingParceiro as any).inscricao_municipal || "",
        matriz_id: editingParceiro.matriz_id || null,
        tipos: {
          cliente: tipos.includes("cliente"),
          fornecedor: tipos.includes("fornecedor"),
          transportador: tipos.includes("transportador"),
        },
        endereco: {
          cep: endereco.cep || "",
          logradouro: endereco.logradouro || "",
          numero: endereco.numero || "",
          complemento: endereco.complemento || "",
          bairro: endereco.bairro || "",
          cidade: endereco.cidade || "",
          estado: endereco.estado || "",
          pais: endereco.pais || "Brasil",
        },
        contato: {
          telefone: contato.telefone || "",
          celular: contato.celular || "",
          email: contato.email || "",
          site: contato.site || "",
          nome_contato: contato.nome_contato || "",
          cargo_contato: contato.cargo_contato || "",
        },
        observacoes: (editingParceiro as any).observacoes || "",
        dados_bancarios: (() => {
          const dados = (editingParceiro as any).dados_bancarios || {};
          return {
            banco_codigo: dados.banco_codigo || "",
            banco_nome: dados.banco_nome || "",
            agencia: dados.agencia || "",
            conta: dados.conta || "",
            tipo_conta: dados.tipo_conta || undefined,
            pix: Array.isArray(dados.pix) ? dados.pix : [],
          };
        })(),
        ativo: editingParceiro.ativo ?? true,
      });
    }
  }, [editingParceiro, isDialogOpen, form]);

  const fetchParceiros = async () => {
    if (!selectedCompany) return;
    
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("company_id", selectedCompany.id)
        .order("razao_social");

      if (error) throw error;
      setParceiros(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar parceiros: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingParceiro(null);
    form.reset({
      razao_social: "",
      nome_fantasia: "",
      cnpj: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      matriz_id: null,
      tipos: { cliente: false, fornecedor: false, transportador: false },
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        pais: "Brasil",
      },
      contato: {
        telefone: "",
        celular: "",
        email: "",
        site: "",
        nome_contato: "",
        cargo_contato: "",
      },
      observacoes: "",
      dados_bancarios: {
        banco_codigo: "",
        banco_nome: "",
        agencia: "",
        conta: "",
        tipo_conta: undefined,
        pix: [],
      },
      ativo: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: PartnerFormData) => {
    if (!selectedCompany) return;

    try {
      const tipos: ("cliente" | "fornecedor" | "transportador")[] = [];
      if (data.tipos.cliente) tipos.push("cliente");
      if (data.tipos.fornecedor) tipos.push("fornecedor");
      if (data.tipos.transportador) tipos.push("transportador");

      // Preparar dados de endereço
      const enderecoData: any = {};
      if (data.endereco?.cep) enderecoData.cep = data.endereco.cep.replace(/\D/g, "");
      if (data.endereco?.logradouro) enderecoData.logradouro = data.endereco.logradouro;
      if (data.endereco?.numero) enderecoData.numero = data.endereco.numero;
      if (data.endereco?.complemento) enderecoData.complemento = data.endereco.complemento;
      if (data.endereco?.bairro) enderecoData.bairro = data.endereco.bairro;
      if (data.endereco?.cidade) enderecoData.cidade = data.endereco.cidade;
      if (data.endereco?.estado) enderecoData.estado = data.endereco.estado;
      if (data.endereco?.pais) enderecoData.pais = data.endereco.pais;

      // Preparar dados de contato
      const contatoData: any = {};
      if (data.contato?.telefone) contatoData.telefone = data.contato.telefone.replace(/\D/g, "");
      if (data.contato?.celular) contatoData.celular = data.contato.celular.replace(/\D/g, "");
      if (data.contato?.email) contatoData.email = data.contato.email;
      if (data.contato?.site) contatoData.site = data.contato.site;
      if (data.contato?.nome_contato) contatoData.nome_contato = data.contato.nome_contato;
      if (data.contato?.cargo_contato) contatoData.cargo_contato = data.contato.cargo_contato;

      const parceiroData: any = {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || null,
        cnpj: data.cnpj.replace(/\D/g, ""),
        tipo: tipos,
        ativo: data.ativo,
        company_id: selectedCompany.id,
        endereco: Object.keys(enderecoData).length > 0 ? enderecoData : null,
        contato: Object.keys(contatoData).length > 0 ? contatoData : null,
      };

      // Preparar dados bancários
      const dadosBancariosData: any = {};
      if (data.dados_bancarios?.banco_codigo) dadosBancariosData.banco_codigo = data.dados_bancarios.banco_codigo;
      if (data.dados_bancarios?.banco_nome) dadosBancariosData.banco_nome = data.dados_bancarios.banco_nome;
      if (data.dados_bancarios?.agencia) dadosBancariosData.agencia = data.dados_bancarios.agencia;
      if (data.dados_bancarios?.conta) dadosBancariosData.conta = data.dados_bancarios.conta;
      if (data.dados_bancarios?.tipo_conta) dadosBancariosData.tipo_conta = data.dados_bancarios.tipo_conta;
      if (data.dados_bancarios?.pix && data.dados_bancarios.pix.length > 0) {
        dadosBancariosData.pix = data.dados_bancarios.pix;
      }

      // Adicionar campos adicionais
      parceiroData.inscricao_estadual = data.inscricao_estadual || null;
      parceiroData.inscricao_municipal = data.inscricao_municipal || null;
      parceiroData.matriz_id = data.matriz_id || null;
      parceiroData.observacoes = data.observacoes || null;
      parceiroData.dados_bancarios = Object.keys(dadosBancariosData).length > 0 ? dadosBancariosData : null;

      if (editingParceiro) {
        const { error } = await supabase
          .from("partners")
          .update(parceiroData)
          .eq("id", editingParceiro.id);

        if (error) throw error;
        toast.success("Parceiro atualizado!");
      } else {
        const { error } = await supabase.from("partners").insert([parceiroData]);
        if (error) throw error;
        toast.success("Parceiro cadastrado!");
      }

      setIsDialogOpen(false);
      fetchParceiros();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const columns = [
    { header: "Razão Social", accessor: "razao_social" as keyof Partner },
    { header: "Nome Fantasia", accessor: "nome_fantasia" as keyof Partner },
    { header: "CNPJ", accessor: "cnpj" as keyof Partner },
    {
      header: "Tipos",
      accessor: (item: Partner) => (
        <div className="flex gap-1">
          {(item.tipo as string[]).map((t: string) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (item: Partner) => (
        <Badge variant={item.ativo ? "default" : "secondary"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  if (loading) return <div>Carregando...</div>;

  return (
    <RequirePage pagePath="/cadastros/parceiros*" action="read">
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Parceiros</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie clientes, fornecedores e transportadores
        </p>
      </div>

      <DataTable
        data={parceiros}
        columns={columns}
        onNew={handleNew}
        onEdit={(parceiro) => {
          setEditingParceiro(parceiro);
          setIsDialogOpen(true);
        }}
        onDelete={async (parceiro) => {
          if (window.confirm(`Tem certeza que deseja excluir o parceiro ${parceiro.razao_social}?`)) {
            try {
              const { error } = await supabase
                .from("partners")
                .delete()
                .eq("id", parceiro.id);
              if (error) throw error;
              toast.success("Parceiro excluído!");
              fetchParceiros();
            } catch (error: any) {
              toast.error("Erro ao excluir: " + error.message);
            }
          }
        }}
        onExport={() => toast.info("Exportação em desenvolvimento")}
        searchPlaceholder="Buscar por razão social ou CNPJ..."
        newButtonLabel="Novo Parceiro"
        showNewButton={canCreatePage('/cadastros/parceiros*')}
      />

      <PermissionGuard entity="partners" action="create">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingParceiro ? "Editar" : "Novo"} Parceiro</DialogTitle>
            <DialogDescription>
              {editingParceiro 
                ? "Atualize as informações do parceiro abaixo." 
                : "Preencha os dados para cadastrar um novo parceiro."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="razao_social"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Razão Social *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome_fantasia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000000000000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inscricao_estadual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual (IE)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inscricao_municipal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Municipal (IM)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="matriz_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matriz (Parceiro Principal)</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? null : value);
                          }} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a matriz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {parceiros
                              .filter(p => p.id !== editingParceiro?.id)
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.razao_social}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tipos"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tipo de Parceiro *</FormLabel>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="tipos.cliente"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Cliente</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tipos.fornecedor"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Fornecedor</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tipos.transportador"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="!mt-0">Transportador</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endereco.cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000-000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.logradouro"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rua, Avenida, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto, Sala, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado (UF)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {estadosBrasileiros.map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endereco.pais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Contato */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contato.telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 0000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato.celular"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Celular</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato.site"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://www.exemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato.nome_contato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Contato</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contato.cargo_contato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo do Contato</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Dados Bancários e PIX */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Bancários e PIX</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dados_bancarios.banco_codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const banco = bancosBrasileiros.find(b => b.codigo === value);
                            field.onChange(value);
                            form.setValue('dados_bancarios.banco_nome', banco?.nome || '');
                          }} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o banco" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bancosBrasileiros.map((banco) => (
                              <SelectItem key={banco.codigo} value={banco.codigo}>
                                {banco.codigo} - {banco.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dados_bancarios.banco_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Banco</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Preenchido automaticamente" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dados_bancarios.agencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dados_bancarios.conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000-0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dados_bancarios.tipo_conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Chaves PIX */}
                <div className="space-y-2">
                  <FormLabel>Chaves PIX</FormLabel>
                  <FormField
                    control={form.control}
                    name="dados_bancarios.pix"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2">
                          {field.value?.map((pix, index) => (
                            <div key={index} className="flex gap-2 items-end">
                              <FormField
                                control={form.control}
                                name={`dados_bancarios.pix.${index}.tipo`}
                                render={({ field: tipoField }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel className="text-xs">Tipo</FormLabel>
                                    <Select onValueChange={tipoField.onChange} value={tipoField.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {tiposChavePix.map((tipo) => (
                                          <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`dados_bancarios.pix.${index}.valor`}
                                render={({ field: valorField }) => (
                                  <FormItem className="flex-[2]">
                                    <FormLabel className="text-xs">Valor</FormLabel>
                                    <FormControl>
                                      <Input {...valorField} placeholder="Chave PIX" />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newPix = field.value?.filter((_, i) => i !== index) || [];
                                  field.onChange(newPix);
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPix = [...(field.value || []), { tipo: 'cpf_cnpj', valor: '' }];
                              field.onChange(newPix);
                            }}
                          >
                            Adicionar Chave PIX
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Observações e Status */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Informações adicionais sobre o parceiro..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Ativo</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
        </Dialog>
      </PermissionGuard>
    </div>
    </RequirePage>
  );
}
