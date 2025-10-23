# Serviços eSocial - MultiWeave Core

Este diretório contém todos os serviços relacionados ao eSocial, implementados como parte do sistema MultiWeave Core.

## 📋 Visão Geral

O sistema eSocial foi implementado em 3 fases principais:

### ✅ Fase 1 - Páginas e Componentes (Concluída)
- Páginas principais de gestão
- Componentes de interface
- Sistema de abas e filtros
- Tabelas de dados com paginação

### ✅ Fase 2 - Integração com APIs (Concluída)
- Geração de XML eSocial
- Validação de dados
- Sistema de envio
- Processamento de retornos
- Logs e auditoria

### ✅ Fase 3 - Relatórios e Analytics (Concluída)
- Relatórios personalizados
- Dashboards avançados
- Sistema de alertas
- Exportação de dados

## 🏗️ Arquitetura dos Serviços

### Serviços Principais

#### 1. **ESocialService** (`eSocialService.ts`)
Serviço principal que integra todos os outros serviços.

**Funcionalidades:**
- Processamento de eventos individuais
- Processamento de lotes
- Processamento de retornos
- Estatísticas e relatórios
- Monitoramento de saúde do sistema

**Uso:**
```typescript
import { initializeESocialService, defaultESocialServiceConfig } from '@/services/rh';

const eSocialService = initializeESocialService(defaultESocialServiceConfig);
const result = await eSocialService.processEvent(event, employeeData, companyData);
```

#### 2. **ESocialXMLService** (`eSocialXMLService.ts`)
Geração e validação de XML para eventos eSocial.

**Funcionalidades:**
- Geração de XML para todos os tipos de evento
- Validação de XML
- Geração de lotes XML
- Suporte a 40+ tipos de evento eSocial

**Tipos de Evento Suportados:**
- S-1000 a S-1030 (Informações do Empregador)
- S-1200 a S-1300 (Remuneração e Contribuições)
- S-2190 a S-2400 (Trabalhador e Vínculos)
- S-3000 a S-3500 (Eventos de Não Período)
- S-5001 a S-5013 (Contribuições Sociais)

#### 3. **ESocialValidationService** (`eSocialValidationService.ts`)
Validação de dados e conformidade com eSocial.

**Funcionalidades:**
- Validação de eventos individuais
- Validação de lotes
- Validação de conformidade
- Validação de CNPJ, CPF, PIS
- Validação de datas e formatos

#### 4. **ESocialSendService** (`eSocialSendService.ts`)
Envio de eventos para o eSocial.

**Funcionalidades:**
- Envio de eventos individuais
- Envio de lotes
- Simulação de API eSocial
- Processamento de retornos
- Consulta de status

#### 5. **ESocialReturnService** (`eSocialReturnService.ts`)
Processamento de retornos do eSocial.

**Funcionalidades:**
- Processamento de retornos individuais
- Processamento de retornos de lote
- Simulação de retornos
- Atualização de status
- Estatísticas de retorno

### Serviços de Suporte

#### 6. **ESocialAuditService** (`eSocialAuditService.ts`)
Sistema de logs e auditoria.

**Funcionalidades:**
- Logging de eventos
- Logging de operações
- Logging de sistema
- Consulta de logs
- Estatísticas de auditoria
- Monitoramento de saúde

#### 7. **ESocialReportService** (`eSocialReportService.ts`)
Geração de relatórios personalizados.

**Funcionalidades:**
- Relatórios por status
- Relatórios por tipo de evento
- Relatórios de tempo de processamento
- Relatórios de erro
- Dashboards interativos
- Gráficos e visualizações

#### 8. **ESocialAlertService** (`eSocialAlertService.ts`)
Sistema de alertas inteligentes.

**Funcionalidades:**
- Regras de alerta configuráveis
- Alertas por email, SMS, webhook
- Alertas de sistema e negócio
- Gestão de alertas
- Estatísticas de alertas

#### 9. **ESocialExportService** (`eSocialExportService.ts`)
Exportação de dados em múltiplos formatos.

**Funcionalidades:**
- Exportação CSV, Excel, PDF, JSON, XML
- Filtros e agrupamentos
- Exportação assíncrona
- Jobs de exportação
- Limpeza automática

## 🚀 Como Usar

### Inicialização Rápida

```typescript
import { initializeESocialServices } from '@/services/rh';

const services = initializeESocialServices({
  xml: {
    companyId: 'company-123',
    cnpj: '12345678000195',
    companyName: 'Empresa Exemplo',
    environment: 'testing',
    version: '1.0.0'
  },
  send: {
    environment: 'testing',
    apiUrl: 'https://api.esocial.gov.br',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }
});

// Usar os serviços
const result = await services.eSocialService.processEvent(event, employeeData, companyData);
const report = await services.reportService.generateEventStatusReport(events);
const alerts = await services.alertService.getAlerts();
```

### Processamento de Eventos

```typescript
// Evento individual
const result = await eSocialService.processEvent(
  event,
  employeeData,
  companyData,
  userId,
  userName
);

// Lote de eventos
const batchResult = await eSocialService.processBatch(
  events,
  employeeDataMap,
  companyData,
  userId,
  userName
);
```

### Geração de Relatórios

```typescript
// Relatório de status
const statusReport = await reportService.generateEventStatusReport(events);

// Relatório personalizado
const customReport = await reportService.generateReport(events, {
  title: 'Meu Relatório',
  format: 'pdf',
  filters: {
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    },
    status: ['accepted', 'rejected']
  },
  columns: [
    { key: 'tipo_evento', label: 'Tipo', type: 'string', visible: true },
    { key: 'status', label: 'Status', type: 'string', visible: true }
  ]
});
```

### Sistema de Alertas

```typescript
// Criar regra de alerta
const rule = await alertService.createRule({
  name: 'Eventos com Erro',
  description: 'Alerta para eventos com erro',
  enabled: true,
  conditions: [
    { field: 'status', operator: 'equals', value: 'error' }
  ],
  actions: [
    {
      type: 'email',
      config: {
        recipients: ['admin@empresa.com'],
        subject: 'Erro eSocial',
        message: 'Evento com erro detectado'
      }
    }
  ],
  priority: 'high',
  category: 'system',
  createdBy: 'admin'
});

// Avaliar alertas
const newAlerts = await alertService.evaluateAlerts(events);
```

### Exportação de Dados

```typescript
// Exportação simples
const exportResult = await exportService.exportData(events, {
  format: 'csv',
  includeHeaders: true,
  encoding: 'utf-8'
});

// Exportação assíncrona
const job = await exportService.createExportJob(events, {
  format: 'excel',
  filename: 'relatorio-esocial.xlsx'
});

// Acompanhar progresso
const jobStatus = await exportService.getExportJob(job.id);
```

## 📊 Monitoramento e Estatísticas

### Estatísticas de Eventos

```typescript
const stats = await eSocialService.getStatistics(events);
console.log(`Taxa de sucesso: ${stats.successRate}%`);
console.log(`Tempo médio: ${stats.averageProcessingTime}ms`);
```

### Estatísticas de Auditoria

```typescript
const auditStats = await eSocialService.getAuditStatistics();
console.log(`Total de logs: ${auditStats.totalLogs}`);
console.log(`Taxa de erro: ${auditStats.errorRate}%`);
```

### Saúde do Sistema

```typescript
const health = await eSocialService.getSystemHealth();
console.log(`Status: ${health.status}`);
console.log(`Uptime: ${health.uptime}s`);
```

## 🔧 Configuração

### Configuração de XML

```typescript
const xmlConfig = {
  companyId: 'company-123',
  cnpj: '12345678000195',
  companyName: 'Empresa Exemplo',
  environment: 'production', // ou 'testing'
  version: '1.0.0'
};
```

### Configuração de Envio

```typescript
const sendConfig = {
  environment: 'production', // ou 'testing'
  apiUrl: 'https://api.esocial.gov.br',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};
```

## 🛡️ Segurança e Auditoria

Todos os serviços incluem:

- **Logging completo** de todas as operações
- **Auditoria** de mudanças e acessos
- **Validação** rigorosa de dados
- **Tratamento de erros** robusto
- **Políticas RLS** no banco de dados

## 📈 Performance

- **Processamento assíncrono** para operações pesadas
- **Paginação** em relatórios e consultas
- **Cache** de configurações e dados
- **Limpeza automática** de logs antigos
- **Otimização** de consultas ao banco

## 🔄 Integração com Banco de Dados

O sistema utiliza as seguintes tabelas:

- `rh.esocial_events` - Eventos eSocial
- `rh.esocial_batches` - Lotes de envio
- `rh.audit_logs` - Logs de auditoria
- `rh.alert_rules` - Regras de alerta
- `rh.export_jobs` - Jobs de exportação

## 📝 Logs e Debugging

Para ativar logs detalhados:

```typescript
// Logs de debug
console.log('Debug mode enabled');

// Logs de auditoria
const logs = await auditService.getLogs({
  category: 'event',
  severity: 'error',
  startDate: '2024-01-01'
});
```

## 🚨 Tratamento de Erros

Todos os serviços retornam objetos padronizados:

```typescript
interface ServiceResult {
  success: boolean;
  message: string;
  errors?: string[];
  warnings?: string[];
  data?: any;
}
```

## 📚 Exemplos Completos

Veja os exemplos em:
- `src/pages/ESocialManagement.tsx` - Interface principal
- `src/components/rh/ESocialEventForm.tsx` - Formulários
- `src/hooks/rh/useESocialEvents.ts` - Hooks React

## 🔄 Atualizações e Manutenção

- **Versionamento** semântico
- **Backward compatibility** mantida
- **Migrações** de banco automáticas
- **Documentação** sempre atualizada

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2025  
**Mantido por:** Equipe MultiWeave Core
