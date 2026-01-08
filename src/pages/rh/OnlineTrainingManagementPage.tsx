import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Video, 
  FileText, 
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Users,
  Settings
} from 'lucide-react';
import { OnlineTrainingService, TrainingContent } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useTraining } from '@/hooks/rh/useTraining';
import { useOnlineTraining } from '@/hooks/rh/useOnlineTraining';
import { useToast } from '@/hooks/use-toast';
import { RequireEntity } from '@/components/RequireAuth';
import { OnlineTrainingDashboard } from '@/components/rh/OnlineTrainingDashboard';
import { ExamEditor } from '@/components/rh/ExamEditor';
import { TrainingFileUpload } from '@/components/rh/TrainingFileUpload';
import { TrainingFileHistory } from '@/components/rh/TrainingFileHistory';
import { useTrainingNotificationService } from '@/hooks/rh/useTrainingNotificationService';

export default function OnlineTrainingManagementPage() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('content');
  const [editingContent, setEditingContent] = useState<TrainingContent | null>(null);
  const [showContentForm, setShowContentForm] = useState(false);
  
  const { trainings, loading: trainingsLoading } = useTraining();
  const { content, loading: contentLoading, loadContent } = useOnlineTraining(trainingId);
  
  const currentTraining = trainings.find(t => t.id === trainingId);

  useEffect(() => {
    if (trainingId && selectedCompany?.id) {
      loadContent();
    }
  }, [trainingId, selectedCompany?.id, loadContent]);

  if (!trainingId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>Treinamento não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentTraining) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>Carregando informações do treinamento...</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateContent = async (data: any) => {
    if (!selectedCompany?.id || !trainingId) return;

    try {
      await OnlineTrainingService.createContent(selectedCompany.id, {
        ...data,
        training_id: trainingId,
        company_id: selectedCompany.id,
        is_active: true
      });
      
      toast({
        title: 'Sucesso',
        description: 'Conteúdo criado com sucesso!',
      });
      
      setShowContentForm(false);
      setEditingContent(null);
      loadContent();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao criar conteúdo',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateContent = async (contentId: string, data: any) => {
    if (!selectedCompany?.id) return;

    try {
      await OnlineTrainingService.updateContent(selectedCompany.id, contentId, data);
      
      toast({
        title: 'Sucesso',
        description: 'Conteúdo atualizado com sucesso!',
      });
      
      setShowContentForm(false);
      setEditingContent(null);
      loadContent();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao atualizar conteúdo',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!selectedCompany?.id) return;

    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    try {
      await OnlineTrainingService.deleteContent(selectedCompany.id, contentId);
      
      toast({
        title: 'Sucesso',
        description: 'Conteúdo excluído com sucesso!',
      });
      
      loadContent();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao excluir conteúdo',
        variant: 'destructive'
      });
    }
  };

  const handleReorderContent = async (contentId: string, direction: 'up' | 'down') => {
    if (!selectedCompany?.id) return;

    const currentIndex = content.findIndex(c => c.id === contentId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= content.length) return;

    const currentItem = content[currentIndex];
    const targetItem = content[newIndex];

    try {
      await OnlineTrainingService.updateContent(selectedCompany.id, currentItem.id, {
        ordem: targetItem.ordem
      });
      await OnlineTrainingService.updateContent(selectedCompany.id, targetItem.id, {
        ordem: currentItem.ordem
      });
      
      loadContent();
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Erro ao reordenar conteúdo',
        variant: 'destructive'
      });
    }
  };

  const getContentIcon = (tipo: string) => {
    switch (tipo) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'link_externo':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <RequireEntity entityName="trainings" action="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Gestão de Treinamento Online
            </h1>
            <p className="text-muted-foreground mt-1">{currentTraining.nome}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/rh/treinamentos')}
            >
              Voltar
            </Button>
            <Button
              onClick={() => navigate(`/rh/treinamentos-online/${trainingId}`)}
            >
              Visualizar como Aluno
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">
              <Settings className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="content">
              <BookOpen className="h-4 w-4 mr-2" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="exams">
              <FileText className="h-4 w-4 mr-2" />
              Provas
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="h-4 w-4 mr-2" />
              Atribuições
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <OnlineTrainingDashboard 
              companyId={selectedCompany?.id || ''} 
              trainingId={trainingId}
            />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Conteúdo do Treinamento</CardTitle>
                    <CardDescription>
                      Gerencie as aulas e materiais do treinamento
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingContent(null);
                    setShowContentForm(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Conteúdo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando conteúdo...</p>
                  </div>
                ) : content.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Nenhum conteúdo cadastrado. Clique em "Novo Conteúdo" para começar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {content.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="outline">Aula {item.ordem}</Badge>
                          {getContentIcon(item.tipo_conteudo)}
                          <div className="flex-1">
                            <div className="font-medium">{item.titulo}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.tipo_conteudo} • {item.duracao_minutos || 0} min
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorderContent(item.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorderContent(item.id, 'down')}
                            disabled={index === content.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingContent(item);
                              setShowContentForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContent(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Formulário de conteúdo */}
            {showContentForm && (
              <ContentForm
                content={editingContent}
                trainingId={trainingId}
                onSave={(data) => {
                  if (editingContent) {
                    handleUpdateContent(editingContent.id, data);
                  } else {
                    handleCreateContent(data);
                  }
                }}
                onCancel={() => {
                  setShowContentForm(false);
                  setEditingContent(null);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="exams" className="space-y-6">
            <ExamEditor
              trainingId={trainingId}
              onSave={() => {
                toast({
                  title: 'Sucesso',
                  description: 'Prova salva com sucesso!',
                });
              }}
            />
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Atribuições</CardTitle>
                <CardDescription>
                  Defina usuários obrigatórios e opcionais para o treinamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    O gerenciador de atribuições será implementado em breve.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TrainingFileHistory trainingId={trainingId} />
          </TabsContent>
        </Tabs>
      </div>
    </RequireEntity>
  );
}

// Componente de formulário de conteúdo
interface ContentFormProps {
  content?: TrainingContent | null;
  trainingId: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const ContentForm: React.FC<ContentFormProps> = ({ content, trainingId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    titulo: content?.titulo || '',
    descricao: content?.descricao || '',
    tipo_conteudo: content?.tipo_conteudo || 'video',
    ordem: content?.ordem || 0,
    duracao_minutos: content?.duracao_minutos || 0,
    url_conteudo: content?.url_conteudo || '',
    arquivo_path: content?.arquivo_path || '',
    conteudo_texto: content?.conteudo_texto || '',
    permite_pular: content?.permite_pular || false,
    requer_conclusao: content?.requer_conclusao ?? true,
    tempo_minimo_segundos: content?.tempo_minimo_segundos || 0,
  });
  
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(content?.arquivo_path || null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(content?.url_conteudo || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{content ? 'Editar Conteúdo' : 'Novo Conteúdo'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Conteúdo *</Label>
              <Select
                value={formData.tipo_conteudo}
                onValueChange={(value) => setFormData({ ...formData, tipo_conteudo: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="link_externo">Link Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                value={formData.duracao_minutos}
                onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo Mínimo (segundos)</Label>
              <Input
                type="number"
                value={formData.tempo_minimo_segundos}
                onChange={(e) => setFormData({ ...formData, tempo_minimo_segundos: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          {formData.tipo_conteudo === 'texto' ? (
            <div className="space-y-2">
              <Label>Conteúdo em Texto</Label>
              <Textarea
                value={formData.conteudo_texto}
                onChange={(e) => setFormData({ ...formData, conteudo_texto: e.target.value })}
                rows={10}
              />
            </div>
          ) : formData.tipo_conteudo === 'link_externo' ? (
            <div className="space-y-2">
              <Label>URL do Conteúdo *</Label>
              <Input
                value={formData.url_conteudo}
                onChange={(e) => setFormData({ ...formData, url_conteudo: e.target.value })}
                placeholder="https://..."
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                {formData.tipo_conteudo === 'video' ? 'Vídeo' : 'PDF'} 
                {uploadedFilePath && ' (Arquivo enviado)'}
              </Label>
              <TrainingFileUpload
                trainingId={trainingId}
                contentId={content?.id}
                fileType={formData.tipo_conteudo as 'video' | 'pdf'}
                currentFile={uploadedFilePath || undefined}
                onUploadComplete={(filePath, fileUrl) => {
                  setUploadedFilePath(filePath);
                  setUploadedFileUrl(fileUrl);
                  setFormData({
                    ...formData,
                    arquivo_path: filePath,
                    url_conteudo: fileUrl
                  });
                }}
                onRemove={() => {
                  setUploadedFilePath(null);
                  setUploadedFileUrl(null);
                  setFormData({
                    ...formData,
                    arquivo_path: '',
                    url_conteudo: ''
                  });
                }}
              />
              {!uploadedFilePath && (
                <div className="mt-2">
                  <Label className="text-sm text-muted-foreground">Ou informe uma URL externa:</Label>
                  <Input
                    value={formData.url_conteudo}
                    onChange={(e) => setFormData({ ...formData, url_conteudo: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.permite_pular}
                onChange={(e) => setFormData({ ...formData, permite_pular: e.target.checked })}
              />
              <span>Permitir pular esta aula</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requer_conclusao}
                onChange={(e) => setFormData({ ...formData, requer_conclusao: e.target.checked })}
              />
              <span>Requer conclusão para avançar</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

