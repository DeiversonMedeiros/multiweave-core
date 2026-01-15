import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { OnlineTrainingService, TrainingExam, TrainingExamQuestion, TrainingExamAlternative } from '@/services/rh/onlineTrainingService';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';

interface ExamEditorProps {
  trainingId: string;
  examId?: string;
  contentId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({
  trainingId,
  examId: initialExamId,
  contentId,
  onSave,
  onCancel
}) => {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [examId, setExamId] = useState<string | undefined>(initialExamId);
  const [exam, setExam] = useState<TrainingExam | null>(null);
  const [exams, setExams] = useState<TrainingExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [questions, setQuestions] = useState<Array<{ question: TrainingExamQuestion; alternatives: TrainingExamAlternative[] }>>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);

  useEffect(() => {
    if (examId && selectedCompany?.id) {
      loadExam();
    } else if (selectedCompany?.id && trainingId) {
      loadExams();
    }
  }, [examId, selectedCompany?.id, trainingId]);

  const loadExams = async () => {
    if (!selectedCompany?.id || !trainingId) return;

    setLoadingExams(true);
    try {
      const examsData = await OnlineTrainingService.listExams(selectedCompany.id, trainingId);
      setExams(examsData);
    } catch (err) {
      console.error('Erro ao carregar provas:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar lista de provas',
        variant: 'destructive'
      });
    } finally {
      setLoadingExams(false);
    }
  };

  const loadExam = async () => {
    if (!selectedCompany?.id || !examId) return;

    try {
      const examData = await OnlineTrainingService.getExam(selectedCompany.id, examId);
      if (examData) {
        setExam(examData);
        await loadQuestions();
      }
    } catch (err) {
      console.error('Erro ao carregar prova:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar prova',
        variant: 'destructive'
      });
    }
  };

  const loadQuestions = async () => {
    if (!selectedCompany?.id || !examId) return;

    try {
      const questionsData = await OnlineTrainingService.listQuestions(selectedCompany.id, examId);
      
      // Carregar alternativas para cada questão
      const questionsWithAlternatives = await Promise.all(
        questionsData.map(async (question) => {
          const questionData = await OnlineTrainingService.getQuestionWithAlternatives(
            selectedCompany.id,
            question.id
          );
          return questionData || { question, alternatives: [] };
        })
      );

      setQuestions(questionsWithAlternatives);
    } catch (err) {
      console.error('Erro ao carregar questões:', err);
    }
  };

  const handleSaveExam = async (examData: any) => {
    if (!selectedCompany?.id) return;

    setLoading(true);
    try {
      if (examId) {
        await OnlineTrainingService.updateExam(selectedCompany.id, examId, examData);
        await loadExam(); // Recarregar a prova atualizada
        toast({
          title: 'Sucesso',
          description: 'Prova atualizada com sucesso!',
        });
      } else {
        const newExam = await OnlineTrainingService.createExam(selectedCompany.id, {
          ...examData,
          training_id: trainingId,
          content_id: contentId || null,
          company_id: selectedCompany.id,
          is_active: true
        });
        setExam(newExam);
        setExamId(newExam.id);
        setShowExamForm(false);
        await loadExams(); // Recarregar a lista de provas
        await loadExam(); // Carregar a prova recém-criada
        toast({
          title: 'Sucesso',
          description: 'Prova criada com sucesso!',
        });
      }
      
      if (onSave) onSave();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao salvar prova',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExam = async (selectedExamId: string) => {
    setExamId(selectedExamId);
    setShowExamForm(false);
  };

  const handleDeleteExam = async (examToDeleteId: string) => {
    if (!selectedCompany?.id) return;
    if (!confirm('Tem certeza que deseja excluir esta prova?')) return;

    try {
      await OnlineTrainingService.updateExam(selectedCompany.id, examToDeleteId, { is_active: false });
      toast({
        title: 'Sucesso',
        description: 'Prova excluída com sucesso!',
      });
      await loadExams();
      if (examId === examToDeleteId) {
        setExamId(undefined);
        setExam(null);
        setQuestions([]);
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir prova',
        variant: 'destructive'
      });
    }
  };

  const handleSaveQuestion = async (questionData: any, alternatives: any[]) => {
    if (!selectedCompany?.id || !examId) return;

    setLoading(true);
    try {
      let questionId: string;

      if (editingQuestion) {
        // Atualizar questão existente
        const updated = await OnlineTrainingService.createQuestion(selectedCompany.id, {
          ...questionData,
          exam_id: examId,
          company_id: selectedCompany.id,
          id: editingQuestion
        });
        questionId = updated.id;
      } else {
        // Criar nova questão
        const created = await OnlineTrainingService.createQuestion(selectedCompany.id, {
          ...questionData,
          exam_id: examId,
          company_id: selectedCompany.id
        });
        questionId = created.id;
      }

      // Salvar alternativas
      for (const alt of alternatives) {
        if (alt.id) {
          // Atualizar alternativa existente (seria necessário método update)
          // Por enquanto, vamos recriar
        } else {
          await OnlineTrainingService.createAlternative(selectedCompany.id, {
            question_id: questionId,
            company_id: selectedCompany.id,
            texto: alt.texto,
            ordem: alt.ordem,
            is_correct: alt.is_correct
          });
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Questão salva com sucesso!',
      });

      setShowQuestionForm(false);
      setEditingQuestion(null);
      await loadQuestions();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao salvar questão',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedCompany?.id) return;

    if (!confirm('Tem certeza que deseja excluir esta questão?')) return;

    try {
      // Seria necessário método delete, por enquanto vamos desativar
      await OnlineTrainingService.createQuestion(selectedCompany.id, {
        exam_id: examId || '',
        company_id: selectedCompany.id,
        id: questionId,
        is_active: false
      } as any);

      toast({
        title: 'Sucesso',
        description: 'Questão excluída com sucesso!',
      });

      await loadQuestions();
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir questão',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista de Provas (quando não há prova selecionada) */}
      {!examId && !showExamForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Provas</CardTitle>
                <CardDescription>
                  Gerencie as provas do treinamento
                </CardDescription>
              </div>
              <Button onClick={() => setShowExamForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Prova
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingExams ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando provas...</p>
              </div>
            ) : exams.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhuma prova cadastrada. Clique em "Nova Prova" para começar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {exams.map((examItem) => (
                  <div
                    key={examItem.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{examItem.titulo}</div>
                        <div className="text-sm text-muted-foreground">
                          {examItem.descricao || 'Sem descrição'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {examItem.tipo_avaliacao === 'entre_aulas' ? 'Entre Aulas' : 
                             examItem.tipo_avaliacao === 'final' ? 'Final' : 'Diagnóstica'}
                          </Badge>
                          <Badge variant="outline">
                            Nota mínima: {examItem.nota_minima_aprovacao}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectExam(examItem.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExam(examItem.id)}
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
      )}

      {/* Formulário da Prova */}
      {showExamForm && !examId && (
        <ExamForm
          trainingId={trainingId}
          contentId={contentId}
          onSave={handleSaveExam}
          onCancel={() => {
            setShowExamForm(false);
            if (onCancel) onCancel();
          }}
        />
      )}

      {/* Se já tem prova, mostrar questões */}
      {examId && exam && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExamId(undefined);
                        setExam(null);
                        setQuestions([]);
                        loadExams();
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Voltar para Lista
                    </Button>
                  </div>
                  <CardTitle>{exam.titulo}</CardTitle>
                  <CardDescription>{exam.descricao}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {exam.tipo_avaliacao === 'entre_aulas' ? 'Entre Aulas' : 
                     exam.tipo_avaliacao === 'final' ? 'Final' : 'Diagnóstica'}
                  </Badge>
                  <Badge variant="outline">
                    Nota mínima: {exam.nota_minima_aprovacao}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de Questões */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questões</CardTitle>
                  <CardDescription>
                    {questions.length} questão(ões) cadastrada(s)
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionForm(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Questão
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Nenhuma questão cadastrada. Clique em "Nova Questão" para começar.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {questions.map((item, index) => (
                    <QuestionCard
                      key={item.question.id}
                      question={item.question}
                      alternatives={item.alternatives}
                      index={index}
                      onEdit={() => {
                        setEditingQuestion(item.question.id);
                        setShowQuestionForm(true);
                      }}
                      onDelete={() => handleDeleteQuestion(item.question.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário de Questão */}
          {showQuestionForm && (
            <QuestionForm
              examId={examId}
              question={editingQuestion ? questions.find(q => q.question.id === editingQuestion) : null}
              onSave={handleSaveQuestion}
              onCancel={() => {
                setShowQuestionForm(false);
                setEditingQuestion(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

// Componente de formulário da prova
interface ExamFormProps {
  trainingId: string;
  contentId?: string;
  onSave: (data: any) => void;
  onCancel?: () => void;
}

const ExamForm: React.FC<ExamFormProps> = ({ trainingId, contentId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo_avaliacao: 'entre_aulas' as 'entre_aulas' | 'final' | 'diagnostica',
    nota_minima_aprovacao: 70,
    tempo_limite_minutos: 0,
    permite_tentativas: 3,
    ordem: 0,
    obrigatorio: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Prova</CardTitle>
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
              <Label>Tipo de Avaliação *</Label>
              <Select
                value={formData.tipo_avaliacao}
                onValueChange={(value) => setFormData({ ...formData, tipo_avaliacao: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entre_aulas">Entre Aulas</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="diagnostica">Diagnóstica</SelectItem>
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

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Nota Mínima (%)</Label>
              <Input
                type="number"
                value={formData.nota_minima_aprovacao}
                onChange={(e) => setFormData({ ...formData, nota_minima_aprovacao: parseFloat(e.target.value) })}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo Limite (min)</Label>
              <Input
                type="number"
                value={formData.tempo_limite_minutos}
                onChange={(e) => setFormData({ ...formData, tempo_limite_minutos: parseInt(e.target.value) || 0 })}
                min={0}
                placeholder="0 = sem limite"
              />
            </div>
            <div className="space-y-2">
              <Label>Tentativas</Label>
              <Input
                type="number"
                value={formData.permite_tentativas}
                onChange={(e) => setFormData({ ...formData, permite_tentativas: parseInt(e.target.value) || 0 })}
                min={0}
                placeholder="0 = ilimitado"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.obrigatorio}
              onChange={(e) => setFormData({ ...formData, obrigatorio: e.target.checked })}
            />
            <Label>Prova obrigatória</Label>
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Salvar Prova
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Componente de card de questão
interface QuestionCardProps {
  question: TrainingExamQuestion;
  alternatives: TrainingExamAlternative[];
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, alternatives, index, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Questão {index + 1}</Badge>
              <Badge variant="outline">{question.tipo_questao}</Badge>
              <Badge variant="outline">{question.pontuacao} pontos</Badge>
            </div>
            <CardTitle className="text-base">{question.pergunta}</CardTitle>
            {question.explicacao && (
              <CardDescription className="mt-2">
                <strong>Explicação:</strong> {question.explicacao}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alternatives.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Alternativas:</Label>
            {alternatives.map((alt, altIndex) => (
              <div
                key={alt.id}
                className={`flex items-center gap-2 p-2 rounded border ${
                  alt.is_correct ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
              >
                {alt.is_correct ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="flex-1">{alt.texto}</span>
                <Badge variant="outline">{altIndex + 1}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente de formulário de questão
interface QuestionFormProps {
  examId: string;
  question: { question: TrainingExamQuestion; alternatives: TrainingExamAlternative[] } | null;
  onSave: (questionData: any, alternatives: any[]) => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ examId, question, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    pergunta: question?.question.pergunta || '',
    tipo_questao: question?.question.tipo_questao || 'multipla_escolha',
    pontuacao: question?.question.pontuacao || 1,
    explicacao: question?.question.explicacao || '',
    ordem: question?.question.ordem || 0
  });

  const [alternatives, setAlternatives] = useState<Array<{
    id?: string;
    texto: string;
    ordem: number;
    is_correct: boolean;
  }>>(
    question?.alternatives.map(alt => ({
      id: alt.id,
      texto: alt.texto,
      ordem: alt.ordem,
      is_correct: alt.is_correct
    })) || [
      { texto: '', ordem: 1, is_correct: false },
      { texto: '', ordem: 2, is_correct: false }
    ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que pelo menos uma alternativa está marcada como correta (para múltipla escolha)
    if (formData.tipo_questao === 'multipla_escolha' || formData.tipo_questao === 'verdadeiro_falso') {
      const hasCorrect = alternatives.some(alt => alt.is_correct);
      if (!hasCorrect) {
        alert('Selecione pelo menos uma alternativa correta');
        return;
      }
    }

    onSave(formData, alternatives);
  };

  const addAlternative = () => {
    setAlternatives([...alternatives, {
      texto: '',
      ordem: alternatives.length + 1,
      is_correct: false
    }]);
  };

  const removeAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const updateAlternative = (index: number, field: string, value: any) => {
    const updated = [...alternatives];
    updated[index] = { ...updated[index], [field]: value };
    setAlternatives(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{question ? 'Editar Questão' : 'Nova Questão'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Pergunta *</Label>
            <Textarea
              value={formData.pergunta}
              onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Questão *</Label>
              <Select
                value={formData.tipo_questao}
                onValueChange={(value) => setFormData({ ...formData, tipo_questao: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multipla_escolha">Múltipla Escolha</SelectItem>
                  <SelectItem value="verdadeiro_falso">Verdadeiro/Falso</SelectItem>
                  <SelectItem value="texto_livre">Texto Livre</SelectItem>
                  <SelectItem value="numerico">Numérico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pontuação</Label>
              <Input
                type="number"
                value={formData.pontuacao}
                onChange={(e) => setFormData({ ...formData, pontuacao: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Explicação (aparece após responder)</Label>
            <Textarea
              value={formData.explicacao}
              onChange={(e) => setFormData({ ...formData, explicacao: e.target.value })}
              rows={2}
            />
          </div>

          {/* Alternativas (apenas para múltipla escolha e verdadeiro/falso) */}
          {(formData.tipo_questao === 'multipla_escolha' || formData.tipo_questao === 'verdadeiro_falso') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Alternativas *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAlternative}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              {alternatives.map((alt, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={alt.is_correct}
                    onChange={(e) => updateAlternative(index, 'is_correct', e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Input
                    value={alt.texto}
                    onChange={(e) => updateAlternative(index, 'texto', e.target.value)}
                    placeholder="Texto da alternativa"
                    required
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={alt.ordem}
                    onChange={(e) => updateAlternative(index, 'ordem', parseInt(e.target.value) || 0)}
                    className="w-20"
                    min={1}
                  />
                  {alternatives.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAlternative(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Salvar Questão
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};



