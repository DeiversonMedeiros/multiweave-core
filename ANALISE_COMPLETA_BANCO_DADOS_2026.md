# 📊 Análise Completa do Banco de Dados - MultiWeave Core

**Data da Análise:** 09/01/2026  
**Projeto:** Omni (wmtftyaqucwfsnnjepiy)  
**Host:** db.wmtftyaqucwfsnnjepiy.supabase.co

---

## 📈 ESTATÍSTICAS GERAIS

| Métrica | Quantidade |
|---------|-----------|
| **Total de Schemas** | 18 schemas principais (excluindo temporários) |
| **Total de Tabelas** | 292 tabelas |
| **Total de Funções** | 611 funções |
| **Total de Triggers** | 281 triggers |
| **Total de Políticas RLS** | 550 políticas |
| **Total de Índices** | 1.241 índices |
| **Total de Views** | 15 views |
| **Total de Enums** | 57 enums |

---

## 📦 SCHEMAS PRINCIPAIS

### 1. **`public`** - Schema Core (17 tabelas, 179 colunas)
Sistema base de multi-tenancy e permissões.

**Tabelas Principais:**
- `companies` - Empresas (multi-tenancy)
- `users` - Usuários do sistema
- `user_companies` - Relação usuário-empresa-perfil
- `profiles` - Perfis de acesso
- `module_permissions` - Permissões de módulos
- `entity_permissions` - Permissões de entidades
- `partners` - Parceiros (clientes/fornecedores/transportadores)
- `projects` - Projetos
- `cost_centers` - Centros de custo
- `materials` - Materiais básicos
- `notifications` - Notificações do sistema

**Características:**
- Sistema de multi-tenancy completo
- Controle granular de permissões (módulos e entidades)
- Base para todos os outros módulos

---

### 2. **`rh`** - Recursos Humanos (118 tabelas, 1.891 colunas)
Módulo mais complexo do sistema, com gestão completa de RH.

**Principais Áreas:**

#### **Funcionários e Cadastros:**
- `employees` - Funcionários
- `dependents` - Dependentes
- `employment_contracts` - Contratos de trabalho
- `work_shifts` - Turnos de trabalho
- `employee_shifts` - Atribuição de turnos

#### **Controle de Ponto:**
- `time_records` - Registros de ponto
- `time_record_events` - Eventos de ponto (entrada/saída)
- `attendance_corrections` - Correções de ponto
- `time_record_photos` - Fotos dos registros

#### **Folha de Pagamento:**
- `rubricas` - Rubricas de folha
- `payroll_events` - Eventos de folha
- `payroll_config` - Configurações de folha
- `calculation_logs` - Logs de cálculos
- `inss_brackets` - Tabelas INSS
- `irrf_brackets` - Tabelas IRRF
- `fgts_config` - Configurações FGTS

#### **Banco de Horas:**
- `time_bank` - Banco de horas
- `bank_hours_types` - Tipos de banco de horas
- `bank_hours_assignments` - Atribuições de banco

#### **Férias:**
- `holidays` - Feriados
- Tabelas de gestão de períodos aquisitivos e férias

#### **Benefícios:**
- `benefits` - Benefícios
- `medical_agreements` - Convênios médicos
- `reimbursements` - Reembolsos
- `awards_productivity` - Prêmios e produtividade

#### **Treinamentos:**
- `trainings` - Treinamentos
- `training_enrollments` - Inscrições
- `training_attendance` - Presenças

#### **Exames e Saúde:**
- `periodic_exams` - Exames periódicos
- `medical_certificates` - Atestados médicos

#### **eSocial:**
- `esocial_tables` - Tabelas eSocial
- `esocial_batches` - Lotes eSocial
- `esocial_events` - Eventos eSocial
- `esocial_integrations` - Integrações

#### **Outros:**
- `disciplinary_actions` - Ações disciplinares
- `unions` - Sindicatos
- `compensation_requests` - Solicitações de compensação

**Características:**
- Módulo mais extenso (118 tabelas)
- Integração com eSocial
- Cálculos complexos de folha
- Sistema de banco de horas CLT
- Gestão completa de férias e benefícios

---

### 3. **`financeiro`** - Módulo Financeiro (32 tabelas, 694 colunas)
Gestão financeira completa.

**Principais Áreas:**

#### **Contas a Pagar/Receber:**
- `contas_pagar` - Contas a pagar
- `contas_receber` - Contas a receber
- `parcelas` - Parcelas

#### **Plano de Contas:**
- `plano_contas` - Plano de contas
- `classes_financeiras` - Classes financeiras
- `categorias_financeiras` - Categorias

#### **Fluxo de Caixa:**
- `fluxo_caixa` - Fluxo de caixa
- `lancamentos_contabeis` - Lançamentos contábeis

#### **Aprovações:**
- Sistema integrado de aprovações financeiras

**Características:**
- Integração com sistema de aprovações
- Classes financeiras para categorização
- Gestão de parcelas e vencimentos

---

### 4. **`compras`** - Módulo de Compras (24 tabelas, 343 colunas)
Gestão completa do processo de compras.

**Tabelas Principais:**
- `requisicoes_compra` - Requisições de compra
- `cotacoes` - Cotações
- `pedidos_compra` - Pedidos de compra
- `fornecedores_dados` - Dados de fornecedores
- `itens_requisicao` - Itens de requisição
- `itens_cotacao` - Itens de cotação
- `itens_pedido` - Itens de pedido

**Características:**
- Workflow completo: Requisição → Cotação → Pedido
- Sistema de aprovações integrado
- Gestão de fornecedores

---

### 5. **`almoxarifado`** - Almoxarifado/Estoque (15 tabelas, 178 colunas)
Gestão de estoque e materiais.

**Tabelas Principais:**
- `almoxarifados` - Almoxarifados
- `materiais_equipamentos` - Materiais e equipamentos
- `estoque_atual` - Estoque atual
- `movimentacoes_estoque` - Movimentações
- `entradas_materiais` - Entradas
- `entrada_itens` - Itens de entrada
- `transferencias` - Transferências
- `transferencia_itens` - Itens de transferência
- `inventarios` - Inventários
- `inventario_itens` - Itens de inventário
- `localizacoes_fisicas` - Localizações físicas (rua/nível/posição)
- `solicitacoes_saida_materiais` - Solicitações de saída

**Características:**
- Controle de localização física (rua/nível/posição)
- Gestão completa de movimentações
- Inventários periódicos
- Integração com compras

---

### 6. **`frota`** - Gestão de Frota (10 tabelas, 116 colunas)
Gestão de veículos e motoristas.

**Tabelas Principais:**
- `vehicles` - Veículos
- `drivers` - Motoristas
- `maintenances` - Manutenções
- `incidents` - Incidentes
- `inspections` - Inspeções
- `requests` - Solicitações

**Características:**
- Gestão de manutenções preventivas e corretivas
- Controle de incidentes
- Inspeções periódicas

---

### 7. **`combustivel`** - Gestão de Combustível (12 tabelas, 178 colunas)
Gestão de abastecimentos e consumo.

**Tabelas Principais:**
- `refuel_records` - Registros de abastecimento
- `refuel_requests` - Solicitações de abastecimento
- `fuel_budgets` - Orçamentos de combustível
- `driver_consumption` - Consumo por motorista
- `fuel_types` - Tipos de combustível
- `approved_gas_stations` - Postos aprovados
- `refuel_limits` - Limites de abastecimento
- `consumption_alerts` - Alertas de consumo

**Características:**
- Controle de orçamento
- Alertas de consumo
- Limites por motorista/veículo
- Integração com frota

---

### 8. **`logistica`** - Logística (6 tabelas, 106 colunas)
Gestão de transporte e logística.

**Tabelas Principais:**
- `logistic_requests` - Solicitações logísticas
- `trips` - Viagens
- `trip_items` - Itens de viagem
- `routes` - Rotas

**Características:**
- Gestão de viagens
- Planejamento de rotas
- Integração com frota e combustível

---

### 9. **`metalurgica`** - Módulo Metalúrgica (16 tabelas, 217 colunas)
Módulo específico para indústria metalúrgica.

**Características:**
- Processos específicos da indústria
- Integração com produção

---

### 10. **`tributario`** - Módulo Tributário (6 tabelas, 120 colunas)
Gestão tributária.

**Características:**
- Cálculos tributários
- Integração com financeiro

---

### 11. **`auth`** - Autenticação (20 tabelas, 189 colunas)
Sistema de autenticação do Supabase.

**Tabelas Principais:**
- `users` - Usuários de autenticação
- `sessions` - Sessões
- `identities` - Identidades (OAuth, etc.)
- `mfa_factors` - Fatores MFA
- `refresh_tokens` - Tokens de refresh

**Características:**
- Gerenciado pelo Supabase
- Suporte a MFA
- OAuth providers

---

### 12. **`storage`** - Armazenamento (9 tabelas, 72 colunas)
Sistema de armazenamento de arquivos.

**Características:**
- Buckets de armazenamento
- Gerenciado pelo Supabase Storage

---

## ⚙️ FUNÇÕES PRINCIPAIS

### **Funções de Permissões:**
- `is_admin()` - Verifica se usuário é admin
- `check_module_permission()` - Verifica permissão de módulo
- `check_entity_permission()` - Verifica permissão de entidade
- `get_user_companies()` - Obtém empresas do usuário

### **Funções de Gestão de Dados:**
- `get_entity_data()` - Obtém dados de entidade com filtros
- `create_entity_data()` - Cria registro de entidade
- `update_entity_data()` - Atualiza registro
- `delete_entity_data()` - Deleta registro

### **Funções de RH:**
- `create_employee()` - Cria funcionário
- `get_time_records()` - Obtém registros de ponto
- `calculate_overtime()` - Calcula horas extras
- `get_bank_hours_balance()` - Obtém saldo de banco de horas
- `approve_vacation()` - Aprova férias
- `reject_vacation()` - Rejeita férias

### **Funções de Aprovações:**
- `get_pending_approvals()` - Obtém aprovações pendentes
- `approve_request()` - Aprova solicitação
- `reject_request()` - Rejeita solicitação
- `get_required_approvers()` - Obtém aprovadores necessários

### **Funções Financeiras:**
- `generate_titulo_number()` - Gera número de título
- `calculate_interest()` - Calcula juros
- `get_financial_summary()` - Obtém resumo financeiro

### **Funções de Compras:**
- `create_cotacao()` - Cria cotação
- `approve_cotacao()` - Aprova cotação
- `create_pedido_from_cotacao()` - Cria pedido a partir de cotação

**Total: 611 funções** distribuídas pelos schemas

---

## 🔔 TRIGGERS PRINCIPAIS

### **Triggers de Auditoria:**
- Triggers de `updated_at` em várias tabelas
- Triggers de log de alterações

### **Triggers de Validação:**
- Validações de dados antes de inserção/atualização
- Triggers de integridade referencial

### **Triggers de Negócio:**
- Cálculo automático de campos derivados
- Atualização de totais e somas
- Geração automática de números sequenciais

**Total: 281 triggers**

---

## 🔒 POLÍTICAS RLS (Row Level Security)

### **Políticas por Schema:**

#### **`public`:**
- Políticas de multi-tenancy (filtro por `company_id`)
- Políticas baseadas em permissões de perfil
- Políticas de acesso por módulo/entidade

#### **`rh`:**
- Políticas de acesso a dados de funcionários
- Políticas de acesso a registros de ponto
- Políticas de acesso a folha de pagamento

#### **`financeiro`:**
- Políticas de acesso a dados financeiros
- Políticas baseadas em níveis de aprovação

#### **`compras`:**
- Políticas de acesso a requisições e cotações
- Políticas baseadas em workflow

**Total: 550 políticas RLS**

**Características:**
- Sistema robusto de segurança
- Isolamento de dados por empresa
- Controle granular de acesso

---

## 📇 ÍNDICES

**Total: 1.241 índices**

### **Tipos de Índices:**
- **Primary Keys:** Todas as tabelas
- **Foreign Keys:** Índices em chaves estrangeiras
- **Unique Constraints:** Índices únicos
- **Performance:** Índices em campos frequentemente consultados
- **Compostos:** Índices compostos para queries complexas

### **Índices por Schema:**
- `rh`: Maior quantidade (devido à complexidade)
- `financeiro`: Índices em campos de busca
- `compras`: Índices em workflow
- `public`: Índices em multi-tenancy

---

## 👁️ VIEWS

**Total: 15 views**

### **Views Principais:**
- Views de agregação de dados
- Views de relatórios
- Views de simplificação de queries complexas

---

## 🏷️ ENUMS

**Total: 57 enums**

### **Enums Principais:**
- `partner_type`: cliente, fornecedor, transportador
- `material_type`: produto, serviço, matéria_prima
- `user_role`: admin, user, manager
- Status de workflow (pendente, aprovado, rejeitado)
- Tipos de eventos e ações
- Status de funcionários e registros

---

## 🔗 RELACIONAMENTOS PRINCIPAIS

### **Multi-Tenancy:**
- `companies` → Todas as tabelas principais (via `company_id`)
- `user_companies` → Relação usuário-empresa-perfil

### **RH:**
- `employees` → Centro de várias relações
  - `time_records` → `time_record_events`
  - `employment_contracts`
  - `bank_hours_assignments`
  - `dependents`
  - `periodic_exams`

### **Compras:**
- `requisicoes_compra` → `cotacoes` → `pedidos_compra`
- Relação com `almoxarifado` via materiais

### **Financeiro:**
- `contas_pagar` / `contas_receber` → `parcelas`
- Relação com `plano_contas` e `classes_financeiras`

---

## 📊 ANÁLISE DE COMPLEXIDADE

### **Schemas Mais Complexos:**
1. **`rh`** - 118 tabelas, 1.891 colunas (módulo mais extenso)
2. **`financeiro`** - 32 tabelas, 694 colunas
3. **`compras`** - 24 tabelas, 343 colunas
4. **`almoxarifado`** - 15 tabelas, 178 colunas
5. **`metalurgica`** - 16 tabelas, 217 colunas

### **Schemas Mais Simples:**
- `tributario` - 6 tabelas
- `logistica` - 6 tabelas
- `frota` - 10 tabelas

---

## 🔍 PONTOS DE ATENÇÃO

### **1. Schemas Temporários:**
- Muitos schemas `pg_temp_*` e `pg_toast_temp_*` (normais em PostgreSQL)
- Não afetam a estrutura real

### **2. Complexidade do Módulo RH:**
- 118 tabelas no schema `rh`
- Muitas relações e dependências
- Cálculos complexos de folha

### **3. Sistema de Permissões:**
- 550 políticas RLS
- Sistema granular de permissões
- Multi-tenancy bem implementado

### **4. Funções:**
- 611 funções (muitas lógicas de negócio no banco)
- Considerar mover algumas para a aplicação se necessário

### **5. Triggers:**
- 281 triggers
- Muitos para auditoria e validação
- Garantem integridade dos dados

---

## ✅ CONCLUSÕES

### **Pontos Fortes:**
1. ✅ Estrutura bem organizada por schemas
2. ✅ Sistema robusto de multi-tenancy
3. ✅ Segurança implementada (RLS)
4. ✅ Módulos bem definidos
5. ✅ Integridade referencial mantida
6. ✅ Sistema de aprovações unificado

### **Recomendações:**
1. 📝 Documentar funções complexas
2. 🔍 Revisar índices para otimização
3. 📊 Monitorar performance de queries
4. 🧹 Considerar arquivamento de dados antigos
5. 📚 Manter documentação atualizada

---

## 📁 ARQUIVOS GERADOS

1. **`ANALISE_BANCO_DADOS_COMPLETA.json`** - Análise completa em JSON
2. **`ANALISE_BANCO_DADOS_RELATORIO.txt`** - Relatório resumido em texto
3. **`dump_data.sql`** - Dump dos dados (schema public)
4. **`dump_schema.sql`** - Dump do schema (em processamento)

---

**Análise realizada em:** 09/01/2026  
**Ferramenta:** Script Node.js + PostgreSQL  
**Versão do Banco:** PostgreSQL 17.6.1.067
