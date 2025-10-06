// =====================================================
// PÁGINA PARA VISUALIZAR DETALHES DO CONVÊNIO MÉDICO
// =====================================================

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Edit, Trash2, Heart, Users } from 'lucide-react';
import { useMedicalAgreement, useDeleteMedicalAgreement } from '@/hooks/rh/useMedicalAgreements';
import { formatDate, getAgreementTypeLabel, getAgreementTypeColor } from '@/services/rh/medicalAgreementsService';
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

const MedicalAgreementDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: agreement, isLoading, error } = useMedicalAgreement(id!);
  const deleteMutation = useDeleteMedicalAgreement();

  const handleDelete = async () => {
    if (!agreement) return;
    try {
      await deleteMutation.mutateAsync(agreement.id);
      navigate('/rh/medical-agreements');
    } catch (err) {
      toast.error('Erro ao excluir convênio.', {
        description: err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Carregando convênio...</div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          Erro ao carregar convênio: {error?.message || 'Convênio não encontrado'}
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
              <Building2 className="h-8 w-8" />
              {agreement.nome}
            </h1>
            <p className="text-muted-foreground">
              Detalhes do convênio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/rh/medical-agreements/${agreement.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
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
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o convênio "{agreement.nome}".
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
        </div>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getAgreementTypeColor(agreement.tipo)}>
              {getAgreementTypeLabel(agreement.tipo)}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={agreement.ativo ? 'default' : 'secondary'}>
              {agreement.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CNPJ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{agreement.cnpj || 'Não informado'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="text-sm">{agreement.nome}</p>
            </div>
            {agreement.razao_social && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                <p className="text-sm">{agreement.razao_social}</p>
              </div>
            )}
            {agreement.telefone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-sm">{agreement.telefone}</p>
              </div>
            )}
            {agreement.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{agreement.email}</p>
              </div>
            )}
            {agreement.site && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Site</label>
                <p className="text-sm">
                  <a href={agreement.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {agreement.site}
                  </a>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      {(agreement.endereco || agreement.cidade || agreement.estado || agreement.cep) && (
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agreement.endereco && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                <p className="text-sm">{agreement.endereco}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agreement.cidade && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <p className="text-sm">{agreement.cidade}</p>
                </div>
              )}
              {agreement.estado && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <p className="text-sm">{agreement.estado}</p>
                </div>
              )}
              {agreement.cep && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p className="text-sm">{agreement.cep}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contato Responsável */}
      {(agreement.contato_responsavel || agreement.telefone_contato || agreement.email_contato) && (
        <Card>
          <CardHeader>
            <CardTitle>Contato Responsável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agreement.contato_responsavel && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Responsável</label>
                  <p className="text-sm">{agreement.contato_responsavel}</p>
                </div>
              )}
              {agreement.telefone_contato && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-sm">{agreement.telefone_contato}</p>
                </div>
              )}
              {agreement.email_contato && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{agreement.email_contato}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {agreement.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{agreement.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
              <p className="text-sm">{formatDate(agreement.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-sm">{formatDate(agreement.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalAgreementDetailPage;
