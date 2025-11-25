// =====================================================
// COMPONENTE: PÁGINA DE CLASSES FINANCEIRAS
// =====================================================
// Data: 2025-01-20
// Descrição: Componente para gerenciar Classes Financeiras Gerenciais
// Autor: Sistema MultiWeave Core

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FolderTree, 
  Plus, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Link2,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  Settings,
  BookOpen
} from 'lucide-react';
import { 
  useClassesFinanceiras, 
  useClassesFinanceirasHierarquicas,
  useCreateClasseFinanceira,
  useUpdateClasseFinanceira,
  useDeleteClasseFinanceira
} from '@/hooks/financial/useClassesFinanceiras';
import { 
  useClassesFinanceirasContas,
  useCreateClasseFinanceiraConta,
  useUpdateClasseFinanceiraConta,
  useDeleteClasseFinanceiraConta
} from '@/hooks/financial/useClassesFinanceirasContas';
import { usePlanoContas } from '@/hooks/financial/usePlanoContas';
import { ClasseFinanceira, ClasseFinanceiraConta, ClasseFinanceiraFormData } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { ClasseFinanceiraForm } from '@/components/financial/ClasseFinanceiraForm';

interface ClassesFinanceirasPageProps {
  className?: string;
}

export function ClassesFinanceirasPage({ className }: ClassesFinanceirasPageProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('listagem');
  const [selectedClasse, setSelectedClasse] = useState<ClasseFinanceira | null>(null);
  const [showVinculacaoForm, setShowVinculacaoForm] = useState(false);
  const [editingClasse, setEditingClasse] = useState<ClasseFinanceira | null>(null);
  const [showClasseForm, setShowClasseForm] = useState(false);

  // Hooks
  const { data: classesData, isLoading: loadingClasses, refetch: refetchClasses } = useClassesFinanceirasHierarquicas();
  const { data: planoContasData } = usePlanoContas();
  const { data: vinculacoesData, refetch: refetchVinculacoes } = useClassesFinanceirasContas(selectedClasse?.id);
  const { mutate: createClasse } = useCreateClasseFinanceira();
  const { mutate: updateClasse } = useUpdateClasseFinanceira();
  const { mutate: deleteClasse } = useDeleteClasseFinanceira();
  const { mutate: createVinculacao } = useCreateClasseFinanceiraConta();
  const { mutate: deleteVinculacao } = useDeleteClasseFinanceiraConta();

  const classes = classesData?.data || [];

  // Função para achatizar a árvore de classes (para usar como opções de classe pai)
  const flattenClasses = (items: any[]): ClasseFinanceira[] => {
    const result: ClasseFinanceira[] = [];
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        result.push(...flattenClasses(item.children));
      }
    });
    return result;
  };

  const allClasses = flattenClasses(classes);

  // Função para salvar classe financeira
  const handleSaveClasse = async (data: ClasseFinanceiraFormData) => {
    if (!selectedCompany?.id) {
      throw new Error('Empresa não selecionada');
    }

    const classeData = {
      ...data,
      company_id: selectedCompany.id,
    };

    if (editingClasse) {
      // Atualizar
      updateClasse(
        { id: editingClasse.id, data: classeData },
        {
          onSuccess: () => {
            toast({
              title: "Sucesso",
              description: "Classe financeira atualizada com sucesso",
            });
            setShowClasseForm(false);
            setEditingClasse(null);
            refetchClasses();
          },
          onError: (error: any) => {
            toast({
              title: "Erro",
              description: error.message || "Erro ao atualizar classe financeira",
              variant: "destructive",
            });
            throw error;
          },
        }
      );
    } else {
      // Criar
      createClasse(classeData, {
        onSuccess: () => {
          toast({
            title: "Sucesso",
            description: "Classe financeira criada com sucesso",
          });
          setShowClasseForm(false);
          setEditingClasse(null);
          refetchClasses();
        },
        onError: (error: any) => {
          toast({
            title: "Erro",
            description: error.message || "Erro ao criar classe financeira",
            variant: "destructive",
          });
          throw error;
        },
      });
    }
  };

  // Função para renderizar árvore hierárquica
  const renderTree = (items: any[], level: number = 0): React.ReactNode => {
    return items.map((item) => (
      <div key={item.id} className="ml-4">
        <div className="flex items-center gap-2 py-2 px-3 rounded hover:bg-muted/50">
          <div className="flex items-center gap-2 flex-1">
            <FolderTree className={`h-4 w-4 text-muted-foreground ${level === 0 ? 'text-primary' : ''}`} />
            <span className="font-medium">{item.codigo}</span>
            <span className="text-sm text-muted-foreground">{item.nome}</span>
            {item.classe_pai_id && (
              <Badge variant="outline" className="text-xs">Nível {item.nivel}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClasse(item);
                setActiveTab('vinculacoes');
              }}
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingClasse(item);
                setShowClasseForm(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Excluir classe "${item.nome}"?`)) {
                  deleteClasse(item.id, {
                    onSuccess: () => {
                      toast({
                        title: "Sucesso",
                        description: "Classe financeira excluída com sucesso",
                      });
                      refetchClasses();
                    },
                    onError: (error: any) => {
                      toast({
                        title: "Erro",
                        description: error.message || "Erro ao excluir classe financeira",
                        variant: "destructive",
                      });
                    }
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {item.children && item.children.length > 0 && (
          <div className="ml-4 border-l-2 border-muted pl-2">
            {renderTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };


  if (!selectedCompany) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Selecione uma empresa para visualizar as classes financeiras.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classes Financeiras Gerenciais</h2>
          <p className="text-muted-foreground">
            Gerencie as classes financeiras para categorização gerencial das operações
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={() => {
              setEditingClasse(null);
              setShowClasseForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Classe
          </Button>
          <Button variant="outline" onClick={() => refetchClasses()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="listagem">Listagem Hierárquica</TabsTrigger>
          <TabsTrigger value="vinculacoes" disabled={!selectedClasse}>
            Vinculações {selectedClasse && `(${selectedClasse.nome})`}
          </TabsTrigger>
        </TabsList>

        {/* Listagem Hierárquica */}
        <TabsContent value="listagem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estrutura de Classes Financeiras</CardTitle>
              <CardDescription>
                Visualize e gerencie a hierarquia de classes financeiras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingClasses ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando classes financeiras...</p>
                  </div>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-12">
                  <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma classe financeira encontrada. Os dados padrão são inseridos automaticamente ao criar uma empresa.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {renderTree(classes)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vinculações */}
        <TabsContent value="vinculacoes" className="space-y-4">
          {selectedClasse ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Vinculações com Contas Contábeis</CardTitle>
                  <CardDescription>
                    Vincule a classe "{selectedClasse.nome}" às contas do plano de contas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Classe: <strong>{selectedClasse.codigo} - {selectedClasse.nome}</strong>
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowVinculacaoForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Vinculação
                      </Button>
                    </div>

                    {vinculacoesData?.data && vinculacoesData.data.length > 0 ? (
                      <div className="space-y-2">
                        {vinculacoesData.data.map((vinculacao) => {
                          const conta = planoContasData?.data?.find(c => c.id === vinculacao.conta_contabil_id);
                          return (
                            <div
                              key={vinculacao.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {vinculacao.is_default && (
                                  <Badge variant="default">Padrão</Badge>
                                )}
                                <span className="font-medium">
                                  {conta?.codigo} - {conta?.descricao}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Remover vinculação?')) {
                                      deleteVinculacao(vinculacao.id, {
                                        onSuccess: () => {
                                          toast({
                                            title: "Sucesso",
                                            description: "Vinculação removida",
                                          });
                                          refetchVinculacoes();
                                        },
                                        onError: (error: any) => {
                                          toast({
                                            title: "Erro",
                                            description: error.message || "Erro ao remover vinculação",
                                            variant: "destructive",
                                          });
                                        }
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Nenhuma vinculação encontrada. Clique em "Nova Vinculação" para vincular esta classe a uma conta contábil.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Formulário de Vinculação */}
              {showVinculacaoForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Vinculação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Conta Contábil</label>
                        <select
                          className="w-full p-2 border rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              createVinculacao({
                                classe_financeira_id: selectedClasse.id,
                                conta_contabil_id: e.target.value,
                                is_default: false
                              }, {
                                onSuccess: () => {
                                  toast({
                                    title: "Sucesso",
                                    description: "Vinculação criada com sucesso",
                                  });
                                  setShowVinculacaoForm(false);
                                  refetchVinculacoes();
                                },
                                onError: (error: any) => {
                                  toast({
                                    title: "Erro",
                                    description: error.message || "Erro ao criar vinculação",
                                    variant: "destructive",
                                  });
                                }
                              });
                            }
                          }}
                        >
                          <option value="">Selecione uma conta...</option>
                          {planoContasData?.data
                            ?.filter(c => c.aceita_lancamento)
                            .map((conta) => (
                              <option key={conta.id} value={conta.id}>
                                {conta.codigo} - {conta.descricao}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowVinculacaoForm(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Selecione uma classe financeira na aba "Listagem Hierárquica" para ver suas vinculações.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Formulário de Classe Financeira */}
      {showClasseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-h-[90vh] overflow-y-auto w-full max-w-3xl">
            <ClasseFinanceiraForm
              classe={editingClasse}
              classesPai={allClasses}
              onSave={handleSaveClasse}
              onCancel={() => {
                setShowClasseForm(false);
                setEditingClasse(null);
              }}
              loading={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

