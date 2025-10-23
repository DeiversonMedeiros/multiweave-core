# Plano de Implementação - Módulo de Treinamento

## Visão Geral
Este documento detalha o plano de implementação das funcionalidades das abas da página de Treinamento, organizadas por prioridade e complexidade.

## Estrutura Atual
- ✅ Banco de dados configurado (5 tabelas)
- ✅ Sistema de permissões implementado
- ✅ Página principal com navegação por abas
- ✅ Hook `useTraining` criado
- ✅ Estrutura base dos componentes

---

## 1. ABA TREINAMENTOS

### 1.1 Funcionalidades Principais
- **Listagem de treinamentos** com filtros e busca
- **Cadastro de novos treinamentos**
- **Edição de treinamentos existentes**
- **Exclusão lógica de treinamentos**
- **Visualização detalhada de treinamentos**

### 1.2 Componentes a Implementar

#### 1.2.1 TrainingList.tsx
```typescript
interface TrainingListProps {
  onEdit: (training: Training) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

// Funcionalidades:
- Tabela com paginação
- Filtros por tipo, status, data
- Busca por nome/descrição
- Ações: visualizar, editar, excluir
- Status badges
- Indicadores de vagas disponíveis
```

#### 1.2.2 TrainingForm.tsx
```typescript
interface TrainingFormProps {
  training?: Training;
  onSave: (training: Training) => void;
  onCancel: () => void;
}

// Funcionalidades:
- Formulário com validação
- Campos: nome, descrição, tipo, categoria, datas, vagas, etc.
- Upload de anexos
- Preview de treinamento
- Validação de datas e vagas
```

#### 1.2.3 TrainingDetails.tsx
```typescript
interface TrainingDetailsProps {
  trainingId: string;
}

// Funcionalidades:
- Visualização completa dos dados
- Lista de inscritos
- Histórico de presença
- Certificados emitidos
- Estatísticas do treinamento
```

### 1.3 Estados e Validações
- **Status do treinamento**: planejado → inscrições_abertas → em_andamento → concluído
- **Validação de datas**: data_inicio < data_fim
- **Controle de vagas**: vagas_totais >= vagas_disponiveis
- **Aprovação**: treinamentos podem precisar de aprovação

---

## 2. ABA INSCRIÇÕES

### 2.1 Funcionalidades Principais
- **Listagem de inscrições** por treinamento
- **Inscrição de funcionários** em treinamentos
- **Aprovação/rejeição** de inscrições
- **Cancelamento de inscrições**
- **Histórico de inscrições**

### 2.2 Componentes a Implementar

#### 2.2.1 EnrollmentList.tsx
```typescript
interface EnrollmentListProps {
  trainingId?: string;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onCancel: (id: string, reason: string) => void;
}

// Funcionalidades:
- Tabela com inscrições
- Filtros por treinamento, funcionário, status
- Ações: aprovar, rejeitar, cancelar
- Status badges
- Informações do funcionário
```

#### 2.2.2 EnrollmentForm.tsx
```typescript
interface EnrollmentFormProps {
  trainingId: string;
  onEnroll: (employeeId: string, observacoes?: string) => void;
  onCancel: () => void;
}

// Funcionalidades:
- Seleção de funcionários
- Verificação de vagas disponíveis
- Campo de observações
- Validação de duplicatas
```

#### 2.2.3 EnrollmentActions.tsx
```typescript
interface EnrollmentActionsProps {
  enrollment: TrainingEnrollment;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCancel: (reason: string) => void;
}

// Funcionalidades:
- Botões de ação baseados no status
- Modal de confirmação
- Campo para justificativa
- Histórico de alterações
```

### 2.3 Fluxo de Inscrições
1. **Funcionário solicita inscrição** ou **RH inscreve**
2. **Aguardando aprovação** (se necessário)
3. **Inscrição confirmada**
4. **Participação no treinamento**
5. **Conclusão ou cancelamento**

---

## 3. ABA PRESENÇA

### 3.1 Funcionalidades Principais
- **Registro de presença** por data
- **Controle de entrada e saída**
- **Cálculo automático de percentual**
- **Relatórios de presença**
- **Justificativas de ausência**

### 3.2 Componentes a Implementar

#### 3.2.1 AttendanceList.tsx
```typescript
interface AttendanceListProps {
  trainingId: string;
  date?: string;
  onRegister: (data: AttendanceData) => void;
}

// Funcionalidades:
- Lista de funcionários inscritos
- Registro de presença por data
- Indicadores visuais de presença
- Filtros por data e status
```

#### 3.2.2 AttendanceForm.tsx
```typescript
interface AttendanceFormProps {
  trainingId: string;
  employeeId: string;
  date: string;
  onSave: (attendance: TrainingAttendance) => void;
}

// Funcionalidades:
- Seleção de tipo de presença
- Campos de horário entrada/saída
- Campo de observações
- Cálculo automático de percentual
```

#### 3.2.3 AttendanceCalendar.tsx
```typescript
interface AttendanceCalendarProps {
  trainingId: string;
  onDateSelect: (date: string) => void;
}

// Funcionalidades:
- Calendário com datas do treinamento
- Indicadores de presença por data
- Navegação entre datas
- Resumo de presença
```

### 3.3 Tipos de Presença
- **Presente**: 100% de presença
- **Atrasado**: 80% de presença
- **Saída antecipada**: 60% de presença
- **Ausente**: 0% de presença

---

## 4. ABA CERTIFICADOS

### 4.1 Funcionalidades Principais
- **Geração automática de certificados**
- **Emissão manual de certificados**
- **Controle de validade**
- **Templates personalizáveis**
- **Download de certificados**

### 4.2 Componentes a Implementar

#### 4.2.1 CertificateList.tsx
```typescript
interface CertificateListProps {
  trainingId?: string;
  employeeId?: string;
  onGenerate: (trainingId: string, employeeId: string) => void;
  onDownload: (certificateId: string) => void;
}

// Funcionalidades:
- Lista de certificados emitidos
- Filtros por treinamento, funcionário, status
- Ações: gerar, baixar, visualizar
- Status de validade
```

#### 4.2.2 CertificateGenerator.tsx
```typescript
interface CertificateGeneratorProps {
  trainingId: string;
  employeeId: string;
  onGenerate: (data: CertificateData) => void;
}

// Funcionalidades:
- Validação de critérios de aprovação
- Campos: nota final, observações
- Preview do certificado
- Configurações de validade
```

#### 4.2.3 CertificateTemplate.tsx
```typescript
interface CertificateTemplateProps {
  certificate: TrainingCertificate;
  onEdit: (id: string) => void;
}

// Funcionalidades:
- Visualização do certificado
- Edição de template
- Download em PDF
- Compartilhamento
```

### 4.3 Critérios de Aprovação
- **Presença mínima**: 80%
- **Nota mínima**: 7.0 (se aplicável)
- **Conclusão do treinamento**
- **Aprovação do instrutor**

---

## 5. ABA RELATÓRIOS

### 5.1 Funcionalidades Principais
- **Relatórios de participação**
- **Estatísticas de treinamentos**
- **Relatórios de certificados**
- **Análise de performance**
- **Exportação de dados**

### 5.2 Componentes a Implementar

#### 5.2.1 ReportsDashboard.tsx
```typescript
interface ReportsDashboardProps {
  filters: ReportFilters;
  onFilterChange: (filters: ReportFilters) => void;
}

// Funcionalidades:
- Gráficos e métricas
- Filtros por período, treinamento, funcionário
- Cards com estatísticas
- Exportação de relatórios
```

#### 5.2.2 ParticipationReport.tsx
```typescript
interface ParticipationReportProps {
  filters: ReportFilters;
}

// Funcionalidades:
- Relatório de participação por funcionário
- Relatório de participação por treinamento
- Taxa de presença
- Análise de absenteísmo
```

#### 5.2.3 CertificateReport.tsx
```typescript
interface CertificateReportProps {
  filters: ReportFilters;
}

// Funcionalidades:
- Relatório de certificados emitidos
- Relatório de certificados vencidos
- Taxa de aprovação
- Análise por categoria
```

### 5.3 Tipos de Relatórios
- **Participação**: presença, ausências, atrasos
- **Certificados**: emitidos, vencidos, válidos
- **Performance**: aprovação, notas, feedback
- **Financeiro**: custos, ROI, investimento

---

## 6. CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Estrutura Base (Semana 1)
- [ ] Criar componentes base para cada aba
- [ ] Implementar navegação entre abas
- [ ] Configurar estados e contextos
- [ ] Implementar hooks específicos

### Fase 2: Treinamentos (Semana 2)
- [ ] TrainingList com filtros e busca
- [ ] TrainingForm com validações
- [ ] TrainingDetails com visualização completa
- [ ] Integração com API

### Fase 3: Inscrições (Semana 3)
- [ ] EnrollmentList com ações
- [ ] EnrollmentForm para inscrições
- [ ] Sistema de aprovação
- [ ] Notificações de status

### Fase 4: Presença (Semana 4)
- [ ] AttendanceList com registro
- [ ] AttendanceForm com validações
- [ ] AttendanceCalendar para visualização
- [ ] Cálculo automático de percentuais

### Fase 5: Certificados (Semana 5)
- [ ] CertificateList com geração
- [ ] CertificateGenerator com critérios
- [ ] Sistema de templates
- [ ] Geração de PDF

### Fase 6: Relatórios (Semana 6)
- [ ] ReportsDashboard com métricas
- [ ] Relatórios específicos
- [ ] Exportação de dados
- [ ] Gráficos e visualizações

---

## 7. CONSIDERAÇÕES TÉCNICAS

### 7.1 Performance
- **Paginação** em todas as listas
- **Lazy loading** para componentes pesados
- **Cache** de dados frequentemente acessados
- **Debounce** em campos de busca

### 7.2 UX/UI
- **Loading states** para todas as operações
- **Error boundaries** para tratamento de erros
- **Toast notifications** para feedback
- **Confirmações** para ações destrutivas

### 7.3 Validações
- **Validação no frontend** para UX
- **Validação no backend** para segurança
- **Mensagens de erro** claras e específicas
- **Prevenção de duplicatas**

### 7.4 Acessibilidade
- **Navegação por teclado**
- **Screen readers** compatíveis
- **Contraste adequado**
- **Textos alternativos**

---

## 8. TESTES

### 8.1 Testes Unitários
- [ ] Hooks de treinamento
- [ ] Funções de validação
- [ ] Cálculos de presença
- [ ] Geração de certificados

### 8.2 Testes de Integração
- [ ] Fluxo completo de treinamento
- [ ] Sistema de inscrições
- [ ] Controle de presença
- [ ] Geração de relatórios

### 8.3 Testes E2E
- [ ] Cadastro de treinamento
- [ ] Inscrição de funcionário
- [ ] Registro de presença
- [ ] Emissão de certificado

---

## 9. DEPLOYMENT

### 9.1 Preparação
- [ ] Build de produção
- [ ] Testes de integração
- [ ] Validação de permissões
- [ ] Backup do banco de dados

### 9.2 Deploy
- [ ] Deploy incremental
- [ ] Monitoramento de erros
- [ ] Rollback plan
- [ ] Documentação de usuário

---

## 10. MANUTENÇÃO

### 10.1 Monitoramento
- **Logs de erro** em produção
- **Métricas de performance**
- **Feedback dos usuários**
- **Análise de uso**

### 10.2 Melhorias
- **Otimizações** baseadas em uso
- **Novas funcionalidades** solicitadas
- **Correções** de bugs
- **Atualizações** de segurança

---

Este plano fornece uma estrutura completa para implementar todas as funcionalidades do módulo de treinamento de forma organizada e eficiente.
