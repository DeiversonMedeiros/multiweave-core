import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SobreavisoEscala } from '@/integrations/supabase/rh-types';
import { SobreavisoService } from '@/services/rh/sobreavisoService';

const DURACAO_MAXIMA_HORAS = 24;

function duracaoToHoraFim(duracao: number): string {
  const h = Math.floor(duracao);
  const m = Math.round((duracao - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface SobreavisoFormProps {
  escala?: SobreavisoEscala | null;
  mode: 'create' | 'edit' | 'view';
  employees: { id: string; nome: string; salario_base?: number }[];
  onSave: (data: Partial<SobreavisoEscala>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SobreavisoForm({
  escala,
  mode,
  employees,
  onSave,
  onCancel,
  isLoading = false,
}: SobreavisoFormProps) {
  const [formData, setFormData] = useState({
    employee_id: '',
    data_escala: '',
    duracao_horas: 8,
    valor_hora_normal: 0,
    observacoes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valorPago = SobreavisoService.calcularValorPago(
    formData.duracao_horas,
    formData.valor_hora_normal
  );

  useEffect(() => {
    if (escala) {
      setFormData({
        employee_id: escala.employee_id,
        data_escala: escala.data_escala.split('T')[0],
        duracao_horas: escala.duracao_horas,
        valor_hora_normal: escala.valor_hora_normal,
        observacoes: escala.observacoes || '',
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setFormData({
        employee_id: '',
        data_escala: today,
        duracao_horas: 8,
        valor_hora_normal: 0,
        observacoes: '',
      });
    }
  }, [escala]);

  useEffect(() => {
    if (formData.employee_id && employees.length) {
      const emp = employees.find((e) => e.id === formData.employee_id);
      if (emp?.salario_base && formData.valor_hora_normal === 0 && !escala) {
        const chMensal = 220;
        const valorHora = Number(emp.salario_base) / chMensal;
        setFormData((prev) => ({ ...prev, valor_hora_normal: Math.round(valorHora * 100) / 100 }));
      }
    }
  }, [formData.employee_id, employees, escala]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.employee_id) e.employee_id = 'Selecione o funcionário';
    if (!formData.data_escala) e.data_escala = 'Data da escala é obrigatória';
    if (formData.duracao_horas <= 0 || formData.duracao_horas > DURACAO_MAXIMA_HORAS) {
      e.duracao_horas = `Duração deve ser entre 0,01 e ${DURACAO_MAXIMA_HORAS} horas`;
    }
    if (formData.valor_hora_normal < 0) {
      e.valor_hora_normal = 'Valor da hora normal não pode ser negativo';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const [ano, mes] = formData.data_escala.split('-').map(Number);
    await onSave({
      employee_id: formData.employee_id,
      data_escala: formData.data_escala,
      hora_inicio: '00:00',
      hora_fim: duracaoToHoraFim(formData.duracao_horas),
      duracao_horas: formData.duracao_horas,
      valor_hora_normal: formData.valor_hora_normal,
      valor_pago: valorPago,
      mes_referencia: mes,
      ano_referencia: ano,
      observacoes: formData.observacoes || null,
    });
  };

  const readOnly = mode === 'view';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee_id">Funcionário *</Label>
        <Select
          value={formData.employee_id}
          onValueChange={(v) => setFormData((p) => ({ ...p, employee_id: v }))}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o funcionário" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employee_id && (
          <p className="text-sm text-destructive">{errors.employee_id}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_escala">Data da escala *</Label>
          <Input
            id="data_escala"
            type="date"
            value={formData.data_escala}
            onChange={(e) => setFormData((p) => ({ ...p, data_escala: e.target.value }))}
            readOnly={readOnly}
          />
          {errors.data_escala && (
            <p className="text-sm text-destructive">{errors.data_escala}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="duracao_horas">Duração (horas) * — máx. 24h</Label>
          <Input
            id="duracao_horas"
            type="number"
            min={0.25}
            max={DURACAO_MAXIMA_HORAS}
            step={0.25}
            value={formData.duracao_horas}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                duracao_horas: Math.min(DURACAO_MAXIMA_HORAS, Math.max(0, Number(e.target.value) || 0)),
              }))
            }
            readOnly={readOnly}
          />
          {errors.duracao_horas && (
            <p className="text-sm text-destructive">{errors.duracao_horas}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valor_hora_normal">Valor hora normal (R$) *</Label>
          <Input
            id="valor_hora_normal"
            type="number"
            min={0}
            step={0.01}
            value={formData.valor_hora_normal}
            onChange={(e) =>
              setFormData((p) => ({ ...p, valor_hora_normal: Number(e.target.value) || 0 }))
            }
            readOnly={readOnly}
          />
          {errors.valor_hora_normal && (
            <p className="text-sm text-destructive">{errors.valor_hora_normal}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Valor pago (1/3 da hora normal)</Label>
          <Input
            value={valorPago.toFixed(2)}
            readOnly
            className="bg-muted"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
          readOnly={readOnly}
          rows={2}
        />
      </div>

      {mode !== 'view' && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
    </form>
  );
}
