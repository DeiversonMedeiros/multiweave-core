// =====================================================
// ROTAS DO MÓDULO DE COMBUSTÍVEL
// Sistema ERP MultiWeave Core
// =====================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardCombustivel from './DashboardCombustivel';
import ParametrosCombustivel from './ParametrosCombustivel';
import OrcamentoCombustivel from './OrcamentoCombustivel';
import SolicitacoesAbastecimento from './SolicitacoesAbastecimento';
import ConsumoVeiculo from './ConsumoVeiculo';
import ConsumoColaborador from './ConsumoColaborador';
import RelatoriosAuditoria from './RelatoriosAuditoria';

export default function CombustivelRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardCombustivel />} />
      <Route path="parametros" element={<ParametrosCombustivel />} />
      <Route path="orcamento" element={<OrcamentoCombustivel />} />
      <Route path="solicitacoes" element={<SolicitacoesAbastecimento />} />
      <Route path="consumo/veiculo" element={<ConsumoVeiculo />} />
      <Route path="consumo/colaborador" element={<ConsumoColaborador />} />
      <Route path="relatorios" element={<RelatoriosAuditoria />} />
    </Routes>
  );
}

