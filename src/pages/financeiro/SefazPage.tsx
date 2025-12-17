// =====================================================
// PÁGINA: CONFIGURAÇÃO SEFAZ
// =====================================================
// Data: 2025-01-15
// Descrição: Página de configuração de integração SEFAZ
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ConfiguracaoSefazPage } from '@/components/financial/ConfiguracaoSefazPage';
import { RequireEntity } from '@/components/RequireAuth';

interface SefazPageProps {
  className?: string;
}

export function SefazPage({ className }: SefazPageProps) {
  return (
    <RequireEntity entityName="nfe" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração SEFAZ</h1>
            <p className="text-muted-foreground">
              Configure a integração com a SEFAZ
            </p>
          </div>
        </div>
        <ConfiguracaoSefazPage />
      </div>
    </RequireEntity>
  );
}

