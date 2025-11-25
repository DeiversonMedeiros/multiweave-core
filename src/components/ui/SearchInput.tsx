// =====================================================
// COMPONENTE DE BUSCA COM DEBOUNCE
// Sistema ERP MultiWeave Core
// =====================================================

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceDelay?: number;
  className?: string;
}

/**
 * Componente de busca com debounce automático
 * 
 * @example
 * <SearchInput
 *   placeholder="Buscar funcionários..."
 *   onSearch={(term) => performSearch(term)}
 *   debounceDelay={500}
 * />
 */
export function SearchInput({
  placeholder = 'Buscar...',
  value: controlledValue,
  onChange,
  onSearch,
  debounceDelay = 500,
  className = ''
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(controlledValue || '');
  const debouncedValue = useDebounce(localValue, debounceDelay);

  // Atualizar valor local quando valor controlado mudar
  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Notificar mudanças imediatas (para UI responsiva)
  useEffect(() => {
    if (onChange) {
      onChange(localValue);
    }
  }, [localValue, onChange]);

  // Notificar busca após debounce (para queries no servidor)
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
}

