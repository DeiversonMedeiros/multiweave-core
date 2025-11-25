// =====================================================
// PÁGINA: TESOURARIA
// =====================================================
// Data: 2025-01-15
// Descrição: Página de tesouraria e conciliação bancária
// Autor: Sistema MultiWeave Core

import React from 'react';
import { TesourariaPage as TesourariaComponent } from '@/components/financial/TesourariaPage';
import { RequireModule } from '@/components/RequireAuth';

interface TesourariaPageProps {
  className?: string;
}

export function TesourariaPage({ className }: TesourariaPageProps) {
  return (
    <RequireModule moduleName="financeiro" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tesouraria</h1>
            <p className="text-muted-foreground">
              Conciliação bancária e fluxo de caixa
            </p>
          </div>
        </div>
        <TesourariaComponent />
      </div>
    </RequireModule>
  );
}

