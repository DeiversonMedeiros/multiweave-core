import { Routes, Route } from 'react-router-dom';
import PortalColaboradorLayout from './PortalColaboradorLayout';
import ColaboradorDashboard from './ColaboradorDashboard';
import RegistroPontoPage from './RegistroPontoPage';
import CorrecaoPontoPage from './CorrecaoPontoPage';
import TimeRecordSignaturePage from './TimeRecordSignaturePage';
import HistoricoMarcacoesPage from './HistoricoMarcacoesPage';
import BancoHorasPage from './BancoHorasPage';
import FeriasPage from './FeriasPage';
import HoleritesPage from './HoleritesPage';
import ReembolsosPage from './ReembolsosPage';
import AtestadosPage from './AtestadosPage';
import ExamesPage from './ExamesPage';
import ComprovantesPage from './ComprovantesPage';
import RegistroAbastecimento from './RegistroAbastecimento';

export default function PortalColaboradorRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalColaboradorLayout />}>
        <Route index element={<ColaboradorDashboard />} />
        <Route path="registro-ponto" element={<RegistroPontoPage />} />
        <Route path="correcao-ponto" element={<CorrecaoPontoPage />} />
        <Route path="assinatura-ponto" element={<TimeRecordSignaturePage />} />
        <Route path="historico-marcacoes" element={<HistoricoMarcacoesPage />} />
        <Route path="banco-horas" element={<BancoHorasPage />} />
        <Route path="ferias" element={<FeriasPage />} />
        <Route path="holerites" element={<HoleritesPage />} />
        <Route path="reembolsos" element={<ReembolsosPage />} />
        <Route path="atestados" element={<AtestadosPage />} />
        <Route path="exames" element={<ExamesPage />} />
        <Route path="comprovantes" element={<ComprovantesPage />} />
        <Route path="registro-abastecimento" element={<RegistroAbastecimento />} />
      </Route>
    </Routes>
  );
}
