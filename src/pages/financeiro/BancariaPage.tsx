// =====================================================
// PÁGINA: CONFIGURAÇÃO BANCÁRIA
// =====================================================
// Data: 2025-01-15
// Descrição: Página de configuração de integrações bancárias
// Autor: Sistema MultiWeave Core

import React from 'react';
import { ConfiguracaoBancariaPage } from '@/components/financial/ConfiguracaoBancariaPage';
import { RequirePage } from '@/components/RequireAuth';

interface BancariaPageProps {
  className?: string;
}

export function BancariaPage({ className }: BancariaPageProps) {
  return (
    <RequirePage pagePath="/financeiro/bancaria*" action="read">
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuração Bancária</h1>
            <p className="text-muted-foreground">
              Configure as integrações bancárias
            </p>
          </div>
        </div>
        <ConfiguracaoBancariaPage />
      </div>
    </RequirePage>
  );
}

