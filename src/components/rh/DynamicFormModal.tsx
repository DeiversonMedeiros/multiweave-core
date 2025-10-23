import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'switch' | 'datetime' | 'date' | 'time';
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export interface DynamicFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormField[];
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function DynamicFormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  data,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  disabled = false
}: DynamicFormModalProps) {
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const renderField = (field: FormField) => {
    const value = data[field.name] || '';
    const isRequired = field.required;
    const isDisabled = field.disabled || disabled || loading;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              rows={field.rows || 3}
              className={field.className}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(newValue) => onChange(field.name, newValue)}
              disabled={isDisabled}
            >
              <SelectTrigger className={field.className}>
                <SelectValue placeholder={field.placeholder || `Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(field.name, checked)}
              disabled={isDisabled}
            />
            <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );

      case 'switch':
        return (
          <div key={field.name} className="flex items-center justify-between space-x-2">
            <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Switch
              id={field.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(field.name, checked)}
              disabled={isDisabled}
            />
          </div>
        );

      case 'datetime':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="datetime-local"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              className={field.className}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              className={field.className}
            />
          </div>
        );

      case 'time':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="time"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              className={field.className}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              min={field.min}
              max={field.max}
              step={field.step}
              className={field.className}
            />
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              required={isRequired}
              disabled={isDisabled}
              className={field.className}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(renderField)}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={disabled || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
