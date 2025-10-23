import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkShift, getShiftTypes, getWeekDays, getScaleTypes } from '@/integrations/supabase/rh-types';

interface WorkShiftFormProps {
  workShift?: WorkShift | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export const WorkShiftForm = forwardRef<HTMLFormElement, WorkShiftFormProps & { onSubmit?: () => void }>(({ workShift, mode, onSave, isLoading = false, onSubmit }, ref) => {
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    hora_inicio: '',
    hora_fim: '',
    intervalo_inicio: '',
    intervalo_fim: '',
    horas_diarias: 8.0,
    dias_semana: [1, 2, 3, 4, 5],
    tipo_turno: 'normal' as 'normal' | 'noturno' | 'rotativo',
    tipo_escala: 'fixa' as 'fixa' | 'flexivel_6x1' | 'flexivel_5x2' | 'flexivel_4x3' | 'escala_12x36' | 'escala_24x48' | 'personalizada',
    dias_trabalho: 5,
    dias_folga: 2,
    ciclo_dias: 7,
    regras_clt: {},
    template_escala: false,
    tolerancia_entrada: 0,
    tolerancia_saida: 0,
    status: 'ativo' as 'ativo' | 'inativo',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Expor função de submit via ref
  useImperativeHandle(ref, () => ({
    submit: () => {
      console.log('🔍 [DEBUG] WorkShiftForm - submit chamado via ref');
      handleSubmit();
    }
  }));

  useEffect(() => {
    if (workShift) {
      setFormData({
        nome: workShift.nome,
        codigo: workShift.codigo || '',
        descricao: workShift.descricao || '',
        hora_inicio: workShift.hora_inicio,
        hora_fim: workShift.hora_fim,
        intervalo_inicio: workShift.intervalo_inicio || '',
        intervalo_fim: workShift.intervalo_fim || '',
        horas_diarias: workShift.horas_diarias,
        dias_semana: workShift.dias_semana,
        tipo_turno: workShift.tipo_turno,
        tipo_escala: workShift.tipo_escala,
        dias_trabalho: workShift.dias_trabalho,
        dias_folga: workShift.dias_folga,
        ciclo_dias: workShift.ciclo_dias,
        regras_clt: workShift.regras_clt || {},
        template_escala: workShift.template_escala,
        tolerancia_entrada: workShift.tolerancia_entrada,
        tolerancia_saida: workShift.tolerancia_saida,
        status: workShift.status,
      });
    }
  }, [workShift]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDiasSemanaChange = (dia: number, checked: boolean) => {
    const newDias = checked 
      ? [...formData.dias_semana, dia]
      : formData.dias_semana.filter(d => d !== dia);
    
    handleInputChange('dias_semana', newDias);
  };

  const handleTipoEscalaChange = (tipo: string) => {
    const scaleType = getScaleTypes().find(st => st.value === tipo);
    if (scaleType && tipo !== 'personalizada') {
      // Configuração automática baseada no tipo
      setFormData(prev => ({
        ...prev,
        tipo_escala: tipo as any,
        dias_trabalho: scaleType.config.dias_trabalho,
        dias_folga: scaleType.config.dias_folga,
        ciclo_dias: scaleType.config.ciclo_dias,
      }));
    } else {
      handleInputChange('tipo_escala', tipo);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'Hora de início é obrigatória';
    }

    if (!formData.hora_fim) {
      newErrors.hora_fim = 'Hora de fim é obrigatória';
    }

    if (formData.hora_inicio && formData.hora_fim && formData.hora_inicio >= formData.hora_fim) {
      newErrors.hora_fim = 'Hora de fim deve ser maior que hora de início';
    }

    if (formData.intervalo_inicio && formData.intervalo_fim && formData.intervalo_inicio >= formData.intervalo_fim) {
      newErrors.intervalo_fim = 'Fim do intervalo deve ser maior que início';
    }

    if (formData.dias_semana.length === 0) {
      newErrors.dias_semana = 'Selecione pelo menos um dia da semana';
    }

    // Validações CLT
    if (formData.dias_trabalho > 6) {
      newErrors.dias_trabalho = 'Máximo 6 dias consecutivos de trabalho (CLT)';
    }

    if (formData.dias_trabalho < 1) {
      newErrors.dias_trabalho = 'Mínimo 1 dia de trabalho';
    }

    if (formData.dias_folga < 1) {
      newErrors.dias_folga = 'Mínimo 1 dia de folga por semana (CLT)';
    }

    if (formData.ciclo_dias < (formData.dias_trabalho + formData.dias_folga)) {
      newErrors.ciclo_dias = 'Ciclo deve ser maior ou igual à soma de dias de trabalho e folga';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    // Só chama preventDefault se houver um evento (chamada via formulário)
    if (e) {
      e.preventDefault();
    }
    
    console.log('🔍 [DEBUG] WorkShiftForm - handleSubmit chamado');
    console.log('🔍 [DEBUG] WorkShiftForm - formData atual:', formData);
    console.log('🔍 [DEBUG] WorkShiftForm - validateForm():', validateForm());
    
    if (validateForm()) {
      console.log('🔍 [DEBUG] WorkShiftForm - Enviando dados para onSave:', formData);
      onSave(formData);
    } else {
      console.log('🔍 [DEBUG] WorkShiftForm - Validação falhou, não enviando dados');
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                disabled={isReadOnly}
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                disabled={isReadOnly}
                placeholder="Ex: TURNO_01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              disabled={isReadOnly}
              placeholder="Descrição do turno de trabalho"
            />
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader>
          <CardTitle>Horários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora de Início *</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => handleInputChange('hora_inicio', e.target.value)}
                disabled={isReadOnly}
                className={errors.hora_inicio ? 'border-red-500' : ''}
              />
              {errors.hora_inicio && <p className="text-sm text-red-500">{errors.hora_inicio}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_fim">Hora de Fim *</Label>
              <Input
                id="hora_fim"
                type="time"
                value={formData.hora_fim}
                onChange={(e) => handleInputChange('hora_fim', e.target.value)}
                disabled={isReadOnly}
                className={errors.hora_fim ? 'border-red-500' : ''}
              />
              {errors.hora_fim && <p className="text-sm text-red-500">{errors.hora_fim}</p>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intervalo_inicio">Início do Intervalo</Label>
              <Input
                id="intervalo_inicio"
                type="time"
                value={formData.intervalo_inicio}
                onChange={(e) => handleInputChange('intervalo_inicio', e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalo_fim">Fim do Intervalo</Label>
              <Input
                id="intervalo_fim"
                type="time"
                value={formData.intervalo_fim}
                onChange={(e) => handleInputChange('intervalo_fim', e.target.value)}
                disabled={isReadOnly}
                className={errors.intervalo_fim ? 'border-red-500' : ''}
              />
              {errors.intervalo_fim && <p className="text-sm text-red-500">{errors.intervalo_fim}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="horas_diarias">Horas Diárias</Label>
            <Input
              id="horas_diarias"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={formData.horas_diarias}
              onChange={(e) => handleInputChange('horas_diarias', parseFloat(e.target.value))}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dias da Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Dias da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {getWeekDays().map((dia) => (
              <div key={dia.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`dia-${dia.value}`}
                  checked={formData.dias_semana.includes(dia.value)}
                  onCheckedChange={(checked) => handleDiasSemanaChange(dia.value, checked as boolean)}
                  disabled={isReadOnly}
                />
                <Label htmlFor={`dia-${dia.value}`}>{dia.label}</Label>
              </div>
            ))}
          </div>
          {errors.dias_semana && <p className="text-sm text-red-500 mt-2">{errors.dias_semana}</p>}
        </CardContent>
      </Card>

      {/* Configurações CLT */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações CLT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_escala">Tipo de Escala</Label>
              <Select
                value={formData.tipo_escala}
                onValueChange={handleTipoEscalaChange}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getScaleTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div>
                        <div className="font-medium">{tipo.label}</div>
                        <div className="text-sm text-muted-foreground">{tipo.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_escala">Template de Escala</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="template_escala"
                  checked={formData.template_escala}
                  onCheckedChange={(checked) => handleInputChange('template_escala', checked)}
                  disabled={isReadOnly}
                />
                <Label htmlFor="template_escala">Usar como template</Label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dias_trabalho">Dias de Trabalho</Label>
              <Input
                id="dias_trabalho"
                type="number"
                min="1"
                max="6"
                value={formData.dias_trabalho}
                onChange={(e) => handleInputChange('dias_trabalho', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.dias_trabalho ? 'border-red-500' : ''}
              />
              {errors.dias_trabalho && <p className="text-sm text-red-500">{errors.dias_trabalho}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_folga">Dias de Folga</Label>
              <Input
                id="dias_folga"
                type="number"
                min="1"
                value={formData.dias_folga}
                onChange={(e) => handleInputChange('dias_folga', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.dias_folga ? 'border-red-500' : ''}
              />
              {errors.dias_folga && <p className="text-sm text-red-500">{errors.dias_folga}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciclo_dias">Ciclo Total (dias)</Label>
              <Input
                id="ciclo_dias"
                type="number"
                min="1"
                value={formData.ciclo_dias}
                onChange={(e) => handleInputChange('ciclo_dias', parseInt(e.target.value) || 1)}
                disabled={isReadOnly || formData.tipo_escala !== 'personalizada'}
                className={errors.ciclo_dias ? 'border-red-500' : ''}
              />
              {errors.ciclo_dias && <p className="text-sm text-red-500">{errors.ciclo_dias}</p>}
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tipo_turno">Tipo de Turno</Label>
              <Select
                value={formData.tipo_turno}
                onValueChange={(value) => handleInputChange('tipo_turno', value)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getShiftTypes().map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerancia_entrada">Tolerância Entrada (min)</Label>
              <Input
                id="tolerancia_entrada"
                type="number"
                min="0"
                value={formData.tolerancia_entrada}
                onChange={(e) => handleInputChange('tolerancia_entrada', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolerancia_saida">Tolerância Saída (min)</Label>
              <Input
                id="tolerancia_saida"
                type="number"
                min="0"
                value={formData.tolerancia_saida}
                onChange={(e) => handleInputChange('tolerancia_saida', parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Botões - Removidos pois o modal gerencia os botões */}
    </form>
  );
});

WorkShiftForm.displayName = 'WorkShiftForm';

