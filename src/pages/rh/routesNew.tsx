import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Importar páginas - NOVA ABORDAGEM
import RHDashboard from './RHDashboard';
import EmployeesPageNew from './EmployeesPageNew';
import PositionsPageNew from './PositionsPageNew';
import UnitsPageNew from './UnitsPageNew';
import TimeRecordsPageNew from './TimeRecordsPageNew';
import BenefitsPageNew from './BenefitsPageNew';
import PayrollPage from './PayrollPage';
import PayrollIndividualPage from './PayrollIndividualPage';

// Importar novas páginas - FASE 1: ESTRUTURA ORGANIZACIONAL
import WorkShiftsPage from './WorkShiftsPage';
import EmploymentContractsPage from './EmploymentContractsPage';

// Importar páginas - FASE 2: PARÂMETROS E CONFIGURAÇÕES
import RubricasPage from './RubricasPage';

// Importar páginas - FASE 3: CONFIGURAÇÕES TRIBUTÁRIAS
import InssBracketsPage from './InssBracketsPage';
import IrrfBracketsPage from './IrrfBracketsPage';
import FgtsConfigPage from './FgtsConfigPage';

// Importar páginas - FASE 4: CONFIGURAÇÕES
import PayrollConfigPage from './PayrollConfigPage';
import BankHoursPage from './BankHours';
import HolidaysPage from './HolidaysPage';
import PeriodicExamsPage from './PeriodicExamsPage';
import DisciplinaryActionsPage from './DisciplinaryActionsPage';
import AwardsProductivityPage from './AwardsProductivityPage';
import AwardProductivityNewPage from './AwardProductivityNewPage';
import AwardProductivityEditPage from './AwardProductivityEditPage';
import AwardProductivityDetailPage from './AwardProductivityDetailPage';
import MedicalAgreementsPage from './MedicalAgreementsPage';
import MedicalAgreementNewPage from './MedicalAgreementNewPage';
import MedicalAgreementEditPage from './MedicalAgreementEditPage';
import MedicalAgreementDetailPage from './MedicalAgreementDetailPage';
import MedicalPlanNewPage from './MedicalPlanNewPage';
import MedicalPlanDetailPage from './MedicalPlanDetailPage';
import MedicalPlanEditPage from './MedicalPlanEditPage';
import EmployeeMedicalPlanNewPage from './EmployeeMedicalPlanNewPage';
import EmployeeDeductionsPage from './EmployeeDeductionsPage';
import EquipmentRentalMonthlyPaymentsPage from './EquipmentRentalMonthlyPaymentsPage';
import EquipmentRentalApprovalsPage from './EquipmentRentalApprovalsPage';
import ConfiguracaoFlashPage from './ConfiguracaoFlashPage';
import MedicalServicesPage from './MedicalServicesPage';
import UnionsPage from './UnionsPage';
import UnionNewPage from './UnionNewPage';
import EmployeeUnionMembershipNewPage from './EmployeeUnionMembershipNewPage';

// Importar páginas - FASE 5: GESTÃO OPERACIONAL (Em desenvolvimento)
import VacationsManagement from './VacationsManagement';
import MedicalCertificatesPage from './MedicalCertificatesPage';
import RecruitmentPage from './RecruitmentPage';
import TrainingPage from './TrainingPage';
import ConfiguracaoCorrecaoPontoPage from './ConfiguracaoCorrecaoPontoPage';
import TimeRecordSignatureConfigPage from './TimeRecordSignatureConfigPage';
import TimeRecordSettingsPage from './TimeRecordSettingsPage';
import LocationZonesPage from './LocationZonesPage';

// Importar página do Organograma
import OrganogramaPage from './OrganogramaPage';

// Importar páginas - FASE 6: PARÂMETROS E CONFIGURAÇÕES
import DelayReasonsPage from './DelayReasonsPage';
import CidCodesPage from './CidCodesPage';
import AbsenceTypesPage from './AbsenceTypesPage';
import AllowanceTypesPage from './AllowanceTypesPage';
import DeficiencyTypesPage from './DeficiencyTypesPage';

// Importar páginas - FASE 7: PROCESSAMENTO AVANÇADO (removido - unificado em PayrollPage)

// Importar páginas - FASE 8: INTEGRAÇÕES
import EsocialIntegrationPage from './EsocialIntegrationPage';

// Importar páginas - FASE 9: GESTÃO OPERACIONAL AVANÇADA
import CompensationRequestsPage from './CompensationRequestsPage';
import EsocialPage from './EsocialPage';

// Importar páginas - FASE 10: PLANEJAMENTO AVANÇADO
import EmployeeShiftsPage from './EmployeeShiftsPage';

// Importar páginas - FASE 11: RELATÓRIOS E ANALYTICS
import AnalyticsPage from './AnalyticsPage';
import DependentsManagement from './DependentsManagement';
import RecruitmentManagement from '../RecruitmentManagement';

// Importar página de Vínculos Funcionário-Usuário
import EmployeeUserLinks from './EmployeeUserLinks';

// Importar página de Vínculos de Benefícios
import EmployeeBenefitsPage from './EmployeeBenefitsPage';

// Importar página de Configuração de Integração Financeira
import FinancialIntegrationConfigPage from './FinancialIntegrationConfigPage';

// Importar páginas de Treinamentos Online
import OnlineTrainingPage from './OnlineTrainingPage';
import OnlineTrainingManagementPage from './OnlineTrainingManagementPage';
import OnlineTrainingsListPage from './OnlineTrainingsListPage';

// =====================================================
// ROTAS DO MÓDULO RH - NOVA ABORDAGEM
// =====================================================

export function RHRoutesNew() {
  return (
    <Routes>
      {/* Dashboard Principal */}
      <Route path="/" element={<RHDashboard />} />
      
      {/* Gestão de Funcionários - NOVA ABORDAGEM */}
      <Route path="/employees" element={<EmployeesPageNew />} />
      <Route path="/employees/new" element={<EmployeesPageNew />} />
      <Route path="/employees/:id" element={<EmployeesPageNew />} />
      <Route path="/employees/:id/edit" element={<EmployeesPageNew />} />
      
      {/* Vínculos Funcionário-Usuário */}
      <Route path="/employee-user-links" element={<EmployeeUserLinks />} />
      
      {/* Vínculos de Benefícios */}
      <Route path="/employee-benefits" element={<EmployeeBenefitsPage />} />
      <Route path="/employee-benefits/new" element={<EmployeeBenefitsPage />} />
      <Route path="/employee-benefits/:id" element={<EmployeeBenefitsPage />} />
      <Route path="/employee-benefits/:id/edit" element={<EmployeeBenefitsPage />} />
      
      {/* Gestão de Cargos - NOVA ABORDAGEM */}
      <Route path="/positions" element={<PositionsPageNew />} />
      <Route path="/positions/new" element={<PositionsPageNew />} />
      <Route path="/positions/:id" element={<PositionsPageNew />} />
      <Route path="/positions/:id/edit" element={<PositionsPageNew />} />
      
      {/* Gestão de Departamentos - NOVA ABORDAGEM */}
      <Route path="/units" element={<UnitsPageNew />} />
      <Route path="/units/new" element={<UnitsPageNew />} />
      <Route path="/units/:id" element={<UnitsPageNew />} />
      <Route path="/units/:id/edit" element={<UnitsPageNew />} />
      
      {/* Organograma */}
      <Route path="/organograma" element={<OrganogramaPage />} />
      
      {/* Gestão de Dependentes - NOVA ABORDAGEM */}
      <Route path="/dependents" element={<DependentsManagement />} />
      <Route path="/dependents/new" element={<DependentsManagement />} />
      <Route path="/dependents/:id" element={<DependentsManagement />} />
      <Route path="/dependents/:id/edit" element={<DependentsManagement />} />
      
      {/* Sistema de Recrutamento */}
      <Route path="/recruitment" element={<RecruitmentManagement />} />
      
      {/* Controle de Ponto - NOVA ABORDAGEM */}
      <Route path="/time-records" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/new" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/:id" element={<TimeRecordsPageNew />} />
      <Route path="/time-records/:id/edit" element={<TimeRecordsPageNew />} />
      
      {/* Configuração de Correção de Ponto */}
      <Route path="/correcao-ponto-config" element={<ConfiguracaoCorrecaoPontoPage />} />

      {/* Configuração de Assinatura de Ponto */}
      <Route path="/assinatura-ponto-config" element={<TimeRecordSignatureConfigPage />} />

      {/* Configurações de Ponto Eletrônico */}
      <Route path="/ponto-eletronico-config" element={<TimeRecordSettingsPage />} />
      
      {/* Configuração de Zonas de Localização */}
      <Route path="/location-zones" element={<LocationZonesPage />} />
      <Route path="/location-zones/new" element={<LocationZonesPage />} />
      <Route path="/location-zones/:id" element={<LocationZonesPage />} />
      <Route path="/location-zones/:id/edit" element={<LocationZonesPage />} />
      
      {/* Sistema de Benefícios - NOVA ABORDAGEM */}
      <Route path="/benefits" element={<BenefitsPageNew />} />
      <Route path="/benefits/new" element={<BenefitsPageNew />} />
      <Route path="/benefits/:id" element={<BenefitsPageNew />} />
      <Route path="/benefits/:id/edit" element={<BenefitsPageNew />} />
      
      {/* Pagamentos Mensais de Aluguéis */}
      <Route path="/equipment-rental-payments" element={<EquipmentRentalMonthlyPaymentsPage />} />
      
      {/* Solicitações de Aluguel de Equipamentos */}
      <Route path="/equipment-rental-approvals" element={<EquipmentRentalApprovalsPage />} />
      
      {/* Configuração Flash API */}
      <Route path="/configuracao-flash" element={<ConfiguracaoFlashPage />} />
      
      {/* Folha de Pagamento - NOVA ABORDAGEM */}
      <Route path="/payroll" element={<PayrollPage />} />
      <Route path="/payroll/new" element={<PayrollPage />} />
      <Route path="/payroll/:id" element={<PayrollPage />} />
      <Route path="/payroll/:id/edit" element={<PayrollPage />} />
      
      {/* Folhas Individuais por Funcionário */}
      <Route path="/payroll-individual" element={<PayrollIndividualPage />} />

      {/* FASE 1: ESTRUTURA ORGANIZACIONAL - NOVAS PÁGINAS */}
      
      {/* Turnos de Trabalho */}
      <Route path="/work-shifts" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/new" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/:id" element={<WorkShiftsPage />} />
      <Route path="/work-shifts/:id/edit" element={<WorkShiftsPage />} />
      
      {/* Contratos de Trabalho */}
      <Route path="/employment-contracts" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/new" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/:id" element={<EmploymentContractsPage />} />
      <Route path="/employment-contracts/:id/edit" element={<EmploymentContractsPage />} />

      {/* FASE 2: PARÂMETROS E CONFIGURAÇÕES */}
      
      {/* Rubricas */}
      <Route path="/rubricas" element={<RubricasPage />} />
      <Route path="/rubricas/new" element={<RubricasPage />} />
      <Route path="/rubricas/:id" element={<RubricasPage />} />
      <Route path="/rubricas/:id/edit" element={<RubricasPage />} />

      {/* FASE 3: CONFIGURAÇÕES TRIBUTÁRIAS */}
      
      {/* Faixas INSS */}
      <Route path="/inss-brackets" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/new" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/:id" element={<InssBracketsPage />} />
      <Route path="/inss-brackets/:id/edit" element={<InssBracketsPage />} />

      {/* Faixas IRRF */}
      <Route path="/irrf-brackets" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/new" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/:id" element={<IrrfBracketsPage />} />
      <Route path="/irrf-brackets/:id/edit" element={<IrrfBracketsPage />} />

      {/* Configurações FGTS */}
      <Route path="/fgts-config" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/new" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/:id" element={<FgtsConfigPage />} />
      <Route path="/fgts-config/:id/edit" element={<FgtsConfigPage />} />

      {/* Configuração de Integração Financeira */}
      <Route path="/financial-integration-config" element={<FinancialIntegrationConfigPage />} />

      {/* FASE 4: CONFIGURAÇÕES */}
      
      {/* Configurações de Folha */}
      <Route path="/payroll-config" element={<PayrollConfigPage />} />

      {/* FASE 5: GESTÃO OPERACIONAL (Em desenvolvimento) */}
      
      {/* Férias e Licenças */}
      <Route path="/vacations" element={<VacationsManagement />} />
      <Route path="/vacations/new" element={<VacationsManagement />} />
      <Route path="/vacations/:id" element={<VacationsManagement />} />
      <Route path="/vacations/:id/edit" element={<VacationsManagement />} />
      
      {/* Atestados Médicos */}
      <Route path="/medical-certificates" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/new" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id" element={<MedicalCertificatesPage />} />
      <Route path="/medical-certificates/:id/edit" element={<MedicalCertificatesPage />} />
      
      {/* Recrutamento */}
      <Route path="/recruitment" element={<RecruitmentPage />} />
      <Route path="/recruitment/new" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id" element={<RecruitmentPage />} />
      <Route path="/recruitment/:id/edit" element={<RecruitmentPage />} />
      
      {/* Treinamentos */}
      <Route path="/training" element={<TrainingPage />} />
      <Route path="/training/new" element={<TrainingPage />} />
      <Route path="/training/:id" element={<TrainingPage />} />
      <Route path="/training/:id/edit" element={<TrainingPage />} />
      
      {/* Treinamentos Online */}
      <Route path="/treinamentos" element={<OnlineTrainingsListPage />} />
      <Route path="/treinamentos-online/:trainingId" element={<OnlineTrainingPage />} />
      <Route path="/treinamentos-online/:trainingId/gestao" element={<OnlineTrainingManagementPage />} />
      
      {/* FASE 5: GESTÃO OPERACIONAL */}
      
      {/* Banco de Horas - NOVO SISTEMA */}
      <Route path="/bank-hours" element={<BankHoursPage />} />
      <Route path="/bank-hours/config" element={<BankHoursPage />} />
      <Route path="/bank-hours/dashboard" element={<BankHoursPage />} />
      
      <Route path="/holidays" element={<HolidaysPage />} />
      <Route path="/holidays/new" element={<HolidaysPage />} />
      <Route path="/holidays/:id" element={<HolidaysPage />} />
      <Route path="/holidays/:id/edit" element={<HolidaysPage />} />
      
      <Route path="/periodic-exams" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/new" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/:id" element={<PeriodicExamsPage />} />
      <Route path="/periodic-exams/:id/edit" element={<PeriodicExamsPage />} />
      
      <Route path="/disciplinary-actions" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/new" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/:id" element={<DisciplinaryActionsPage />} />
      <Route path="/disciplinary-actions/:id/edit" element={<DisciplinaryActionsPage />} />
      
      {/* FASE 6: GESTÃO DE BENEFÍCIOS E CONVÊNIOS */}
      <Route path="/awards-productivity" element={<AwardsProductivityPage />} />
      <Route path="/awards-productivity/new" element={<AwardProductivityNewPage />} />
      <Route path="/awards-productivity/:id" element={<AwardProductivityDetailPage />} />
      <Route path="/awards-productivity/:id/edit" element={<AwardProductivityEditPage />} />
      
      {/* Convênios Médicos e Odontológicos */}
      <Route path="/medical-agreements" element={<MedicalAgreementsPage />} />
      <Route path="/medical-agreements/new" element={<MedicalAgreementNewPage />} />
      <Route path="/medical-agreements/:id" element={<MedicalAgreementDetailPage />} />
      <Route path="/medical-agreements/:id/edit" element={<MedicalAgreementEditPage />} />
      <Route path="/medical-plans/new" element={<MedicalPlanNewPage />} />
      <Route path="/medical-plans/:id" element={<MedicalPlanDetailPage />} />
      <Route path="/medical-plans/:id/edit" element={<MedicalPlanEditPage />} />
      <Route path="/employee-medical-plans/new" element={<EmployeeMedicalPlanNewPage />} />
      <Route path="/employee-medical-plans/:id" element={<MedicalAgreementsPage />} />
      <Route path="/employee-medical-plans/:id/edit" element={<MedicalAgreementsPage />} />
      
      {/* Deduções e Serviços Médicos */}
      <Route path="/employee-deductions" element={<EmployeeDeductionsPage />} />
      <Route path="/employee-deductions/new" element={<EmployeeDeductionsPage />} />
      <Route path="/medical-services" element={<MedicalServicesPage />} />
      <Route path="/medical-services/new" element={<MedicalServicesPage />} />
      
      {/* Sindicatos e Gestão Sindical */}
      <Route path="/unions" element={<UnionsPage />} />
      <Route path="/unions/new" element={<UnionNewPage />} />
      <Route path="/unions/:id" element={<UnionsPage />} />
      <Route path="/unions/:id/edit" element={<UnionsPage />} />
      <Route path="/employee-union-memberships/new" element={<EmployeeUnionMembershipNewPage />} />
      <Route path="/employee-union-memberships/:id" element={<UnionsPage />} />
      <Route path="/employee-union-memberships/:id/edit" element={<UnionsPage />} />
      
      {/* FASE 6: PARÂMETROS E CONFIGURAÇÕES */}
      
      {/* Motivos de Atraso */}
      <Route path="/delay-reasons" element={<DelayReasonsPage />} />
      <Route path="/delay-reasons/new" element={<DelayReasonsPage />} />
      <Route path="/delay-reasons/:id" element={<DelayReasonsPage />} />
      <Route path="/delay-reasons/:id/edit" element={<DelayReasonsPage />} />
      
      {/* Códigos CID */}
      <Route path="/cid-codes" element={<CidCodesPage />} />
      <Route path="/cid-codes/new" element={<CidCodesPage />} />
      <Route path="/cid-codes/:id" element={<CidCodesPage />} />
      <Route path="/cid-codes/:id/edit" element={<CidCodesPage />} />
      
      {/* Tipos de Afastamento */}
      <Route path="/absence-types" element={<AbsenceTypesPage />} />
      <Route path="/absence-types/new" element={<AbsenceTypesPage />} />
      <Route path="/absence-types/:id" element={<AbsenceTypesPage />} />
      <Route path="/absence-types/:id/edit" element={<AbsenceTypesPage />} />
      
      {/* Tipos de Adicionais */}
      <Route path="/allowance-types" element={<AllowanceTypesPage />} />
      <Route path="/allowance-types/new" element={<AllowanceTypesPage />} />
      <Route path="/allowance-types/:id" element={<AllowanceTypesPage />} />
      <Route path="/allowance-types/:id/edit" element={<AllowanceTypesPage />} />
      
      {/* Tipos de Deficiência */}
      <Route path="/deficiency-types" element={<DeficiencyTypesPage />} />
      <Route path="/deficiency-types/new" element={<DeficiencyTypesPage />} />
      <Route path="/deficiency-types/:id" element={<DeficiencyTypesPage />} />
      <Route path="/deficiency-types/:id/edit" element={<DeficiencyTypesPage />} />

      {/* FASE 7: PROCESSAMENTO AVANÇADO */}
      
      {/* Consolidação de Eventos - REMOVIDO: Funcionalidade unificada em Folha de Pagamento */}

      {/* FASE 8: INTEGRAÇÕES */}
      
      {/* Integração eSocial */}
      <Route path="/esocial-integration" element={<EsocialIntegrationPage />} />
      <Route path="/esocial-integration/new" element={<EsocialIntegrationPage />} />
      <Route path="/esocial-integration/:id" element={<EsocialIntegrationPage />} />
      <Route path="/esocial-integration/:id/edit" element={<EsocialIntegrationPage />} />

      {/* FASE 9: GESTÃO OPERACIONAL AVANÇADA */}
      
      {/* Solicitações de Compensação */}
      <Route path="/compensation-requests" element={<CompensationRequestsPage />} />
      <Route path="/compensation-requests/new" element={<CompensationRequestsPage />} />
      <Route path="/compensation-requests/:id" element={<CompensationRequestsPage />} />
      <Route path="/compensation-requests/:id/edit" element={<CompensationRequestsPage />} />
      
      {/* eSocial */}
      <Route path="/esocial" element={<EsocialPage />} />
      <Route path="/esocial/new" element={<EsocialPage />} />
      <Route path="/esocial/:id" element={<EsocialPage />} />
      <Route path="/esocial/:id/edit" element={<EsocialPage />} />

      {/* FASE 10: PLANEJAMENTO AVANÇADO */}
      
      {/* Turnos de Funcionários */}
      <Route path="/employee-shifts" element={<EmployeeShiftsPage />} />
      <Route path="/employee-shifts/new" element={<EmployeeShiftsPage />} />
      <Route path="/employee-shifts/:id" element={<EmployeeShiftsPage />} />
      <Route path="/employee-shifts/:id/edit" element={<EmployeeShiftsPage />} />
      

      {/* FASE 11: RELATÓRIOS E ANALYTICS */}
      
      {/* Analytics & Relatórios */}
      <Route path="/analytics" element={<AnalyticsPage />} />
      
    </Routes>
  );
}

export default RHRoutesNew;
