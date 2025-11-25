import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PortalGestorLayout from './PortalGestorLayout';
import GestorDashboard from './GestorDashboard';
import CentralAprovacoes from './CentralAprovacoes';
import CentralAprovacoesExpandida from './CentralAprovacoesExpandida';
import AprovacaoFerias from './AprovacaoFerias';
import AprovacaoCompensacoes from './AprovacaoCompensacoes';
import AprovacaoReembolsos from './AprovacaoReembolsos';
import AprovacaoAtestados from './AprovacaoAtestados';
import AprovacaoEquipamentos from './AprovacaoEquipamentos';
import AprovacaoCorrecoesPonto from './AprovacaoCorrecoesPonto';
import AprovacaoHorasExtras from './AprovacaoHorasExtras';
import AprovacaoAssinaturasPonto from './AprovacaoAssinaturasPonto';
import AcompanhamentoPonto from './AcompanhamentoPonto';
import AcompanhamentoExames from './AcompanhamentoExames';

const PortalGestorRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PortalGestorLayout />}>
        <Route index element={<GestorDashboard />} />
        <Route path="dashboard" element={<GestorDashboard />} />
        <Route path="aprovacoes" element={<CentralAprovacoesExpandida />} />
        <Route path="aprovacoes/rh" element={<CentralAprovacoes />} />
        <Route path="aprovacoes/ferias" element={<AprovacaoFerias />} />
        <Route path="aprovacoes/compensacoes" element={<AprovacaoCompensacoes />} />
        <Route path="aprovacoes/reembolsos" element={<AprovacaoReembolsos />} />
        <Route path="aprovacoes/atestados" element={<AprovacaoAtestados />} />
        <Route path="aprovacoes/equipamentos" element={<AprovacaoEquipamentos />} />
        <Route path="aprovacoes/correcoes-ponto" element={<AprovacaoCorrecoesPonto />} />
        <Route path="aprovacoes/horas-extras" element={<AprovacaoHorasExtras />} />
        <Route path="aprovacoes/assinaturas-ponto" element={<AprovacaoAssinaturasPonto />} />
        <Route path="acompanhamento/ponto" element={<AcompanhamentoPonto />} />
        <Route path="acompanhamento/exames" element={<AcompanhamentoExames />} />
      </Route>
    </Routes>
  );
};

export default PortalGestorRoutes;
