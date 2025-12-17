// =====================================================
// PÁGINA: CLASSES FINANCEIRAS
// =====================================================
// Data: 2025-01-20
// Descrição: Página para gerenciar Classes Financeiras Gerenciais
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ClassesFinanceirasPage as ClassesFinanceirasComponent } from '@/components/financial/ClassesFinanceirasPage';
import { RequireEntity } from '@/components/RequireAuth';

interface ClassesFinanceirasPageProps {
  className?: string;
}

export function ClassesFinanceirasPage({ className }: ClassesFinanceirasPageProps) {
  return (
    <RequireEntity entityName="plano_contas" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Classes Financeiras</h1>
            <p className="text-muted-foreground">
              Gerencie as classes financeiras gerenciais e sua vinculação com o plano de contas
            </p>
          </div>
        </div>
        <ClassesFinanceirasComponent />
      </div>
    </RequireEntity>
  );
}

