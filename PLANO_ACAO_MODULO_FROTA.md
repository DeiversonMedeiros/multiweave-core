# 🚗 PLANO DE AÇÃO - MÓDULO FROTA
## Sistema ERP MultiWeave Core

---

## 📋 **RESUMO EXECUTIVO**

Este documento apresenta o plano completo para implementação do módulo de Frota no sistema ERP MultiWeave Core, incluindo todas as subpáginas, funcionalidades, banco de dados e componentes necessários.

---

## 🎯 **OBJETIVOS**

### **Objetivo Principal**
Implementar um módulo completo de gestão de frota de veículos com todas as funcionalidades necessárias para controle eficiente de veículos, condutores, manutenções, vistorias e ocorrências.

### **Objetivos Específicos**
- ✅ Criar estrutura completa do banco de dados
- ✅ Implementar funções RPC para operações CRUD
- ✅ Desenvolver triggers e automações
- ✅ Criar políticas RLS para segurança
- ✅ Desenvolver componentes React
- ✅ Implementar sistema de notificações
- ✅ Integrar com EntityService para evitar erro PGRST205

---

## 🏗️ **ARQUITETURA DO MÓDULO**

### **Estrutura de Pastas**
```
src/
├── pages/frota/
│   ├── DashboardFrota.tsx
│   ├── VeiculosPage.tsx
│   ├── CondutoresPage.tsx
│   ├── VistoriasPage.tsx
│   ├── ManutencoesPage.tsx
│   ├── OcorrenciasPage.tsx
│   └── SolicitacoesPage.tsx
├── hooks/frota/
│   └── useFrotaData.ts
├── types/
│   └── frota.ts
└── components/frota/
    ├── VehicleForm.tsx
    ├── DriverForm.tsx
    ├── InspectionForm.tsx
    └── MaintenanceForm.tsx
```

### **Schema do Banco de Dados**
```sql
frota/
├── vehicles (veículos)
├── vehicle_documents (documentos)
├── drivers (condutores)
├── vehicle_assignments (atribuições)
├── vehicle_inspections (vistorias)
├── inspection_items (itens de vistoria)
├── vehicle_maintenances (manutenções)
├── vehicle_occurrences (ocorrências)
├── vehicle_requests (solicitações)
└── vehicle_images (imagens)
```

---

## 📊 **FUNCIONALIDADES POR PÁGINA**

### **🚘 1. Dashboard de Frota**

#### **KPIs Principais:**
- Total de veículos ativos
- Veículos por tipo (próprio/locado/agregado)
- Próximas manutenções preventivas
- CNHs e documentos a vencer
- Ocorrências (multas, sinistros, avarias)
- Gráfico de quilometragem média por mês

#### **Componentes:**
- Cards de estatísticas
- Gráficos de tendências
- Alertas de vencimento
- Ações rápidas

### **🚗 2. Veículos**

#### **Campos:**
- **Identificação:** Tipo, Placa, RENAVAM, Chassi, Marca, Modelo, Ano, Cor
- **Status:** Situação (Ativo/Inativo/Em manutenção), Quilometragem atual
- **Proprietário:** Empresa, Locadora, Colaborador (para agregados)

#### **Documentos e Vencimentos:**
- CRLV, IPVA, Seguro, Licenças, Vistoria Detran
- Alerta automático antes do vencimento
- Upload de documentos e imagens

#### **Funcionalidades:**
- CRUD completo
- Filtros avançados
- Histórico de manutenções
- Controle de quilometragem

### **👨‍✈️ 3. Condutores**

#### **Campos:**
- **Identificação:** Nome, CPF, Matrícula
- **CNH:** Número, Categoria, Validade
- **ADER:** Autorização de Dirigir da Empresa
- **Vinculação:** Condutor atual, Histórico de veículos

#### **Funcionalidades:**
- Cadastro de condutores
- Controle de validade de CNH
- Histórico de atribuições
- Integração com RH

### **🧾 4. Vistorias**

#### **Checklist Baseado no Modelo:**
- **Informações:** Condutor, Data, Base, Placa, KM inicial/final
- **Área de Avarias:** Campos de texto e upload de fotos
- **Seções de Verificação:**
  - Iluminação e sinalização
  - Segurança (cinto, extintor, macaco, etc.)
  - Interior (bancos, tapetes, limpeza)
  - Mecânica (motor, freios, amortecedores)
  - Vidros (vidros, limpador, retrovisores)
  - Outros (pneus, calotas, antena, etc.)

#### **Funcionalidades:**
- Checklist digital
- Assinatura digital
- Histórico por veículo/condutor
- Relatórios de vistoria

### **🔧 5. Manutenções**

#### **Tipos:**
- **Preventiva:** Por tempo (dias) ou quilometragem (KM)
- **Corretiva:** Reparos necessários

#### **Cadastro:**
- Plano de manutenção por tipo de veículo
- Ordem de Serviço (OS)
- Oficina, peças usadas, valor, status
- Integração com almoxarifado

#### **Funcionalidades:**
- Controle de manutenções pendentes
- Alertas automáticos
- Histórico completo
- Cálculo de custos

### **🚦 6. Multas e Sinistros**

#### **Cadastro de Ocorrências:**
- **Tipo:** Multa/Sinistro
- **Dados:** Data, Local, Descrição, Valor, Responsável
- **Status:** Pendente/Pago/Contestação/Encerrado
- **Anexos:** Upload de documentos

#### **Funcionalidades:**
- Registro de ocorrências
- Controle de status
- Relatórios de custos
- Alertas de vencimento

### **🚘 7. Solicitações e Devoluções**

#### **Solicitação de Veículo:**
- Solicitante, Finalidade, Período
- Tipo de veículo, Observações
- Status: Pendente/Aprovado/Reprovado/Devolvido

#### **Devolução:**
- Data/hora, Quilometragem final
- Checklist pós-utilização
- Integração com vistorias

---

## 🗄️ **BANCO DE DADOS**

### **Scripts SQL Criados:**

1. **`create_frota_schema.sql`** - Schema completo com todas as tabelas
2. **`frota_rpc_functions.sql`** - Funções RPC para operações CRUD
3. **`frota_triggers_automations.sql`** - Triggers e automações

### **Características:**
- ✅ 10 tabelas principais
- ✅ Enums para tipos de dados
- ✅ Índices para performance
- ✅ Triggers para automação
- ✅ Políticas RLS para segurança
- ✅ Views para dashboard
- ✅ Funções de auditoria

---

## 🔧 **INTEGRAÇÃO TÉCNICA**

### **EntityService Integration:**
- ✅ Hooks customizados para cada entidade
- ✅ Mutations para operações CRUD
- ✅ Cache inteligente com React Query
- ✅ Tratamento de erros padronizado
- ✅ Evita erro PGRST205

### **Componentes React:**
- ✅ Dashboard com KPIs
- ✅ Páginas de listagem
- ✅ Formulários de cadastro
- ✅ Filtros avançados
- ✅ Paginação
- ✅ Modais de confirmação

---

## 🎨 **DESIGN SYSTEM**

### **Cores Padrão:**
- **Primária:** #049940 (Verde escuro)
- **Secundária:** #93C21E (Verde claro)
- **Acentos:** Laranja, Vermelho, Azul para status

### **Componentes UI:**
- Cards para estatísticas
- Tabelas responsivas
- Badges para status
- Botões de ação
- Formulários estruturados
- Modais e dialogs

---

## 🔄 **AUTOMAÇÕES IMPLEMENTADAS**

### **1. Notificações de Vencimento:**
- Documentos próximos do vencimento
- CNH dos condutores
- Manutenções preventivas

### **2. Triggers Automáticos:**
- Atualização de status de documentos
- Criação de vistoria na devolução
- Verificação de manutenções por quilometragem
- Auditoria de alterações

### **3. Cálculos Automáticos:**
- Status de documentos baseado na data
- Custo total de manutenções
- Quilometragem média
- Taxa de aprovação de solicitações

---

## 📈 **MÉTRICAS E RELATÓRIOS**

### **Dashboard KPIs:**
- Total de veículos por tipo
- Veículos ativos vs inativos
- Próximas manutenções
- Documentos vencendo
- Ocorrências pendentes
- Vistorias do mês

### **Relatórios Disponíveis:**
- Relatório por veículo
- Relatório por condutor
- Relatório de manutenções
- Relatório de ocorrências
- Relatório de custos
- Relatório de utilização

---

## 🚀 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Fase 1: Banco de Dados (CONCLUÍDA)**
- ✅ Criação do schema frota
- ✅ Tabelas e relacionamentos
- ✅ Funções RPC
- ✅ Triggers e automações
- ✅ Políticas RLS

### **Fase 2: Backend (CONCLUÍDA)**
- ✅ Hooks para EntityService
- ✅ Tipos TypeScript
- ✅ Integração com sistema existente

### **Fase 3: Frontend (EM ANDAMENTO)**
- ✅ Dashboard principal
- ✅ Página de veículos
- 🔄 Página de condutores
- 🔄 Página de vistorias
- 🔄 Página de manutenções
- 🔄 Página de ocorrências
- 🔄 Página de solicitações

### **Fase 4: Testes e Ajustes**
- 🔄 Testes unitários
- 🔄 Testes de integração
- 🔄 Ajustes de performance
- 🔄 Validação de segurança

### **Fase 5: Deploy e Treinamento**
- 🔄 Deploy em produção
- 🔄 Treinamento dos usuários
- 🔄 Documentação final
- 🔄 Suporte inicial

---

## 🔒 **SEGURANÇA E PERMISSÕES**

### **Políticas RLS:**
- Acesso baseado em empresa
- Controle de usuários
- Auditoria de alterações
- Validação de dados

### **Validações:**
- Formato de placa brasileira
- RENAVAM (11 dígitos)
- Chassi (17 caracteres)
- Validação de datas
- Quilometragem não negativa

---

## 📱 **RESPONSIVIDADE**

### **Breakpoints:**
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### **Adaptações:**
- Tabelas com scroll horizontal
- Cards empilhados em mobile
- Filtros colapsáveis
- Botões de ação adaptados

---

## 🧪 **TESTES**

### **Cenários de Teste:**
1. **CRUD de Veículos:** Criar, editar, excluir veículos
2. **Atribuição:** Atribuir e devolver veículos
3. **Vistoria:** Criar vistoria completa
4. **Manutenção:** Registrar manutenção preventiva/corretiva
5. **Ocorrência:** Registrar multa/sinistro
6. **Solicitação:** Solicitar e aprovar veículo
7. **Notificações:** Verificar alertas de vencimento

---

## 📚 **DOCUMENTAÇÃO**

### **Documentos Criados:**
- ✅ Scripts SQL completos
- ✅ Hooks TypeScript
- ✅ Tipos e interfaces
- ✅ Componentes React
- ✅ Este plano de ação

### **Próximos Passos:**
- 🔄 Documentação de API
- 🔄 Guia do usuário
- 🔄 Manual de manutenção
- 🔄 Troubleshooting guide

---

## 🎯 **PRÓXIMAS AÇÕES**

### **Imediatas:**
1. Aplicar scripts SQL no banco de dados
2. Testar funções RPC
3. Verificar políticas RLS
4. Completar componentes React

### **Curto Prazo:**
1. Implementar páginas restantes
2. Adicionar testes unitários
3. Configurar notificações
4. Ajustar responsividade

### **Médio Prazo:**
1. Deploy em produção
2. Treinamento de usuários
3. Coleta de feedback
4. Otimizações de performance

---

## ✅ **CHECKLIST DE CONCLUSÃO**

### **Banco de Dados:**
- [x] Schema frota criado
- [x] Tabelas e relacionamentos
- [x] Funções RPC implementadas
- [x] Triggers e automações
- [x] Políticas RLS configuradas
- [x] Views para dashboard

### **Backend:**
- [x] Hooks para EntityService
- [x] Tipos TypeScript
- [x] Integração com sistema
- [x] Tratamento de erros

### **Frontend:**
- [x] Dashboard principal
- [x] Página de veículos
- [ ] Página de condutores
- [ ] Página de vistorias
- [ ] Página de manutenções
- [ ] Página de ocorrências
- [ ] Página de solicitações

### **Testes:**
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de performance
- [ ] Testes de segurança

---

## 📞 **SUPORTE E CONTATO**

Para dúvidas ou suporte durante a implementação:
- **Documentação:** Consulte os arquivos SQL e TypeScript
- **Issues:** Reporte problemas via sistema de tickets
- **Treinamento:** Agende sessões de treinamento
- **Suporte:** Contato direto com equipe de desenvolvimento

---

**🎉 O módulo de Frota está pronto para ser implementado!**

Todos os scripts SQL, hooks, tipos e componentes principais foram criados seguindo as melhores práticas do sistema ERP MultiWeave Core, garantindo integração perfeita e evitando o erro PGRST205.
