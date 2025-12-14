// =====================================================
// PÁGINA: PARAMETRIZAÇÃO TRIBUTÁRIA
// =====================================================
// Data: 2025-12-12
// Descrição: Página de parametrização tributária
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ParametrizacaoTributariaPage as ParametrizacaoTributariaComponent } from '@/components/tributario/ParametrizacaoTributariaPage';
import { RequireModule } from '@/components/RequireAuth';

interface ParametrizacaoTributariaPageProps {
  className?: string;
}

export default function ParametrizacaoTributariaPage({ className }: ParametrizacaoTributariaPageProps) {
  return (
    <RequireModule moduleName="financeiro" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parametrização Tributária</h1>
            <p className="text-muted-foreground">
              Configure as regras de cálculo para todos os tributos
            </p>
          </div>
        </div>
        <ParametrizacaoTributariaComponent />
      </div>
    </RequireModule>
  );
}

