// =====================================================
// PÁGINA PARA VISUALIZAR DETALHES DO PLANO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, Edit, Trash2, Building2 } from 'lucide-react';
import { useMedicalPlan, useDeleteMedicalPlan } from '@/hooks/rh/useMedicalAgreements';
import { formatCurrency, formatDate, getPlanCategoryLabel, getPlanCategoryColor } from '@/services/rh/medicalAgreementsService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const MedicalPlanDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, error } = useMedicalPlan(id!);
  const deleteMutation = useDeleteMedicalPlan();

  const handleDelete = async () => {
    if (!plan) return;
    try {
      await deleteMutation.mutateAsync(plan.id);
      navigate('/rh/medical-agreements');
    } catch (err) {
      toast.error('Erro ao excluir plano.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando plano...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar plano: {error?.message || 'Plano não encontrado'}
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/rh/medical-agreements')}>
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/rh/medical-agreements*" action="read">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/rh/medical-agreements')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Heart className="h-8 w-8" />
                {plan.nome}
              </h1>
              <p className="text-muted-foreground">
                Detalhes do plano médico
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGuard entity="medical_plans" action="update">
              <Button
                variant="outline"
                onClick={() => navigate(`/rh/medical-plans/${plan.id}/edit`)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </PermissionGuard>
            <PermissionGuard entity="medical_plans" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente o plano "{plan.nome}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGuard>
          </div>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-sm font-medium">{plan.nome}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Convênio</label>
                <p className="text-sm">{plan.agreement?.nome || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <Badge variant="outline" className={getPlanCategoryColor(plan.categoria)}>
                  {getPlanCategoryLabel(plan.categoria)}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={plan.ativo ? 'default' : 'secondary'}>
                  {plan.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {plan.descricao && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm">{plan.descricao}</p>
                </div>
              )}
              {plan.cobertura && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Cobertura</label>
                  <p className="text-sm">{plan.cobertura}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Valores e Descontos */}
        <Card>
          <CardHeader>
            <CardTitle>Valores e Descontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Titular</label>
                <p className="text-lg font-semibold">{formatCurrency(plan.valor_titular)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Dependente</label>
                <p className="text-lg font-semibold">{formatCurrency(plan.valor_dependente)}</p>
              </div>
              {plan.valor_familia && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor Família</label>
                  <p className="text-lg font-semibold">{formatCurrency(plan.valor_familia)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desconto Funcionário</label>
                <p className="text-sm">{plan.desconto_funcionario}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desconto Dependente</label>
                <p className="text-sm">{plan.desconto_dependente}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Carência (dias)</label>
                <p className="text-sm">{plan.carencia_dias}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Faixa Etária</label>
                <p className="text-sm">
                  {plan.faixa_etaria_min} - {plan.faixa_etaria_max} anos
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Limite de Dependentes</label>
                <p className="text-sm">
                  {plan.limite_dependentes === 0 ? 'Ilimitado' : plan.limite_dependentes}
                </p>
              </div>
              {plan.data_inicio_vigencia && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Início da Vigência</label>
                  <p className="text-sm">{formatDate(plan.data_inicio_vigencia)}</p>
                </div>
              )}
              {plan.data_fim_vigencia && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fim da Vigência</label>
                  <p className="text-sm">{formatDate(plan.data_fim_vigencia)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coparticipação */}
        {plan.tem_coparticipacao && (
          <Card>
            <CardHeader>
              <CardTitle>Coparticipação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Percentual</label>
                  <p className="text-sm">{plan.percentual_coparticipacao}%</p>
                </div>
                {plan.valor_minimo_coparticipacao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Valor Mínimo</label>
                    <p className="text-sm">{formatCurrency(plan.valor_minimo_coparticipacao)}</p>
                  </div>
                )}
                {plan.valor_maximo_coparticipacao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Valor Máximo</label>
                    <p className="text-sm">{formatCurrency(plan.valor_maximo_coparticipacao)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {plan.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{plan.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RequirePage>
  );
};

export default MedicalPlanDetailPage;
