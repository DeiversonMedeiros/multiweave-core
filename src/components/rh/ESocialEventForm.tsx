import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Plus, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateESocialEvent, useUpdateESocialEvent } from '@/hooks/rh/useESocialEvents';
import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// FORMULÁRIO DE EVENTO eSOCIAL
// =====================================================

interface ESocialEventFormProps {
  isOpen: boolean;
  onClose: () => void;
  event?: ESocialEvent | null;
  onSuccess?: () => void;
}

export default function ESocialEventForm({ 
  isOpen, 
  onClose, 
  event, 
  onSuccess 
}: ESocialEventFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateESocialEvent();
  const updateMutation = useUpdateESocialEvent();

  const isEditing = Boolean(event);

  // Estados do formulário
  const [formData, setFormData] = useState({
    tipo_evento: '',
    codigo_evento: '',
    descricao: '',
    employee_id: '',
    observacoes: '',
    status: 'pending'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // =====================================================
  // EFEITOS
  // =====================================================

  useEffect(() => {
    if (event) {
      setFormData({
        tipo_evento: event.tipo_evento || '',
        codigo_evento: event.codigo_evento || '',
        descricao: event.descricao || '',
        employee_id: event.employee_id || '',
        observacoes: event.observacoes || '',
        status: event.status || 'pending'
      });
    } else {
      setFormData({
        tipo_evento: '',
        codigo_evento: '',
        descricao: '',
        employee_id: '',
        observacoes: '',
        status: 'pending'
      });
    }
    setErrors({});
  }, [event, isOpen]);

  // =====================================================
  // FUNÇÕES DE VALIDAÇÃO
  // =====================================================

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipo_evento.trim()) {
      newErrors.tipo_evento = 'Tipo de evento é obrigatório';
    }

    if (!formData.codigo_evento.trim()) {
      newErrors.codigo_evento = 'Código do evento é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Funcionário é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =====================================================
  // FUNÇÕES DE HANDLERS
  // =====================================================

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Erro de Validação',
        description: 'Por favor, corrija os erros no formulário.',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isEditing && event) {
        await updateMutation.mutateAsync({
          id: event.id,
          data: formData
        });
        
        toast({
          title: 'Sucesso',
          description: 'Evento eSocial atualizado com sucesso!'
        });
      } else {
        await createMutation.mutateAsync(formData);
        
        toast({
          title: 'Sucesso',
          description: 'Evento eSocial criado com sucesso!'
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar evento eSocial',
        variant: 'destructive'
      });
    }
  };

  const handleClose = () => {
    setFormData({
      tipo_evento: '',
      codigo_evento: '',
      descricao: '',
      employee_id: '',
      observacoes: '',
      status: 'pending'
    });
    setErrors({});
    onClose();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {isEditing ? 'Editar Evento eSocial' : 'Novo Evento eSocial'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize as informações do evento eSocial.' 
              : 'Preencha as informações para criar um novo evento eSocial.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label htmlFor="tipo_evento">
                Tipo de Evento <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.tipo_evento} 
                onValueChange={(value) => handleInputChange('tipo_evento', value)}
              >
                <SelectTrigger className={errors.tipo_evento ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S-1000">S-1000 - Informações do Empregador</SelectItem>
                  <SelectItem value="S-1005">S-1005 - Tabela de Estabelecimentos</SelectItem>
                  <SelectItem value="S-1010">S-1010 - Tabela de Rubricas</SelectItem>
                  <SelectItem value="S-1020">S-1020 - Tabela de Lotações</SelectItem>
                  <SelectItem value="S-1030">S-1030 - Tabela de Cargos</SelectItem>
                  <SelectItem value="S-1200">S-1200 - Remuneração RGPS</SelectItem>
                  <SelectItem value="S-1202">S-1202 - Remuneração RPPS</SelectItem>
                  <SelectItem value="S-1207">S-1207 - Benefícios Previdenciários</SelectItem>
                  <SelectItem value="S-1210">S-1210 - Pagamentos de Rendimentos</SelectItem>
                  <SelectItem value="S-1250">S-1250 - Aquisição de Produção Rural</SelectItem>
                  <SelectItem value="S-1260">S-1260 - Comercialização de Produção Rural</SelectItem>
                  <SelectItem value="S-1270">S-1270 - Contratação de Trabalhadores Avulsos</SelectItem>
                  <SelectItem value="S-1280">S-1280 - Contribuições Consolidadas</SelectItem>
                  <SelectItem value="S-1295">S-1295 - Totalização FGTS</SelectItem>
                  <SelectItem value="S-1298">S-1298 - Reabertura de Eventos</SelectItem>
                  <SelectItem value="S-1299">S-1299 - Fechamento de Eventos</SelectItem>
                  <SelectItem value="S-1300">S-1300 - Contribuição Sindical</SelectItem>
                  <SelectItem value="S-2190">S-2190 - Admissão Preliminar</SelectItem>
                  <SelectItem value="S-2200">S-2200 - Cadastramento Inicial</SelectItem>
                  <SelectItem value="S-2205">S-2205 - Alteração de Dados</SelectItem>
                  <SelectItem value="S-2206">S-2206 - Alteração de Contrato</SelectItem>
                  <SelectItem value="S-2210">S-2210 - Comunicação de Acidente</SelectItem>
                  <SelectItem value="S-2220">S-2220 - Monitoramento da Saúde</SelectItem>
                  <SelectItem value="S-2230">S-2230 - Afastamento Temporário</SelectItem>
                  <SelectItem value="S-2240">S-2240 - Condições Ambientais</SelectItem>
                  <SelectItem value="S-2241">S-2241 - Insalubridade/Periculosidade</SelectItem>
                  <SelectItem value="S-2250">S-2250 - Aviso Prévio</SelectItem>
                  <SelectItem value="S-2260">S-2260 - Convocação Tempo Parcial</SelectItem>
                  <SelectItem value="S-2298">S-2298 - Reintegração</SelectItem>
                  <SelectItem value="S-2299">S-2299 - Desligamento</SelectItem>
                  <SelectItem value="S-2300">S-2300 - Trabalhador Sem Vínculo - Início</SelectItem>
                  <SelectItem value="S-2306">S-2306 - Trabalhador Sem Vínculo - Término</SelectItem>
                  <SelectItem value="S-2399">S-2399 - Alteração Contratual</SelectItem>
                  <SelectItem value="S-2400">S-2400 - Benefícios Previdenciários RPPS</SelectItem>
                  <SelectItem value="S-3000">S-3000 - Exclusão de Eventos</SelectItem>
                  <SelectItem value="S-3500">S-3500 - Processos Judiciais</SelectItem>
                  <SelectItem value="S-5001">S-5001 - Contribuições Sociais</SelectItem>
                  <SelectItem value="S-5002">S-5002 - Contribuições PIS/PASEP</SelectItem>
                  <SelectItem value="S-5003">S-5003 - Contribuições FGTS</SelectItem>
                  <SelectItem value="S-5011">S-5011 - Contribuições PIS/PASEP</SelectItem>
                  <SelectItem value="S-5012">S-5012 - Contribuições FGTS</SelectItem>
                  <SelectItem value="S-5013">S-5013 - Contribuições FGTS</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo_evento && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {errors.tipo_evento}
                </p>
              )}
            </div>

            {/* Código do Evento */}
            <div className="space-y-2">
              <Label htmlFor="codigo_evento">
                Código do Evento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codigo_evento"
                value={formData.codigo_evento}
                onChange={(e) => handleInputChange('codigo_evento', e.target.value)}
                placeholder="Ex: S1000-001"
                className={errors.codigo_evento ? 'border-red-500' : ''}
              />
              {errors.codigo_evento && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {errors.codigo_evento}
                </p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descreva o evento eSocial..."
              className={errors.descricao ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.descricao && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {errors.descricao}
              </p>
            )}
          </div>

          {/* Funcionário */}
          <div className="space-y-2">
            <Label htmlFor="employee_id">
              Funcionário <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="ID do funcionário"
                className={`pl-10 ${errors.employee_id ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.employee_id && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {errors.employee_id}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sending">Enviando</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="accepted">Aceito</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais sobre o evento..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
