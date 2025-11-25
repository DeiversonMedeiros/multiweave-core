# 📊 Análise Detalhada do Banco de Dados - MultiWeave Core

## Data da Análise: 2025-11-08

---

## 1. ESTRUTURA DE SCHEMAS

### Schemas Identificados:

1. **`public`** - Schema principal
   - Tabelas core do sistema
   - Multi-tenancy (companies, users, user_companies)
   - Permissões (profiles, module_permissions, entity_permissions)
   - Cadastros básicos (partners, projects, cost_centers, materials)

2. **`rh`** - Recursos Humanos
   - Funcionários (employees)
   - Registros de ponto (time_records, time_record_events)
   - Treinamentos (trainings, training_enrollments, training_attendance)
   - Exames periódicos (periodic_exams)
   - Folha de pagamento (rubricas, employment_contracts)
   - Benefícios (medical_agreements, dependents, reimbursements)
   - Banco de horas (bank_hours_types, bank_hours_assignments)
   - eSocial (esocial_batches, esocial_events)

3. **`frota`** - Gestão de Frota
   - Veículos (vehicles)
   - Motoristas (drivers)
   - Manutenções (maintenances)
   - Incidentes (incidents)
   - Inspeções (inspections)
   - Solicitações (requests)

4. **`almoxarifado`** - Almoxarifado/Estoque
   - Almoxarifados (almoxarifados)
   - Materiais e Equipamentos (materiais_equipamentos)
   - Estoque Atual (estoque_atual)
   - Movimentações (movimentacoes_estoque)
   - Entradas (entradas_materiais, entrada_itens)
   - Transferências (transferencias, transferencia_itens)
   - Inventários (inventarios, inventario_itens)

5. **`financeiro`** - Módulo Financeiro
   - Contas a Pagar/Receber
   - Fluxo de Caixa
   - Lançamentos Contábeis
   - Plano de Contas
   - NF-e / NFSe
   - Aprovações

6. **`compras`** - Módulo de Compras
   - Requisições (requisicoes)
   - Cotações (cotacoes)
   - Pedidos (pedidos)
   - Fornecedores (fornecedores_dados)

---

## 2. TABELAS PRINCIPAIS POR SCHEMA

### Schema `public` (11 tabelas principais)

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `companies` | Empresas (multi-tenancy) | id, razao_social, cnpj, ativo |
| `users` | Usuários do sistema | id (FK auth.users), nome, email, ativo |
| `user_companies` | Relação usuário-empresa | user_id, company_id, profile_id, ativo |
| `profiles` | Perfis de acesso | id, nome, permissoes (JSONB), is_active |
| `module_permissions` | Permissões de módulos | profile_id, module_name, can_read/create/edit/delete |
| `entity_permissions` | Permissões de entidades | profile_id, entity_name, can_read/create/edit/delete |
| `partners` | Parceiros (clientes/fornecedores) | id, company_id, tipo, cnpj, ativo |
| `projects` | Projetos | id, company_id, cost_center_id, nome, codigo |
| `cost_centers` | Centros de Custo | id, company_id, parent_id, codigo, nome, tipo |
| `materials` | Materiais básicos | id, company_id, nome, tipo |
| `notifications` | Notificações | id, user_id, company_id, tipo, mensagem |

### Schema `rh` (30+ tabelas)

**Principais:**

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `employees` | Funcionários | id, company_id, matricula, nome, cpf, status, cost_center_id, work_shift_id |
| `time_records` | Registros de ponto | id, employee_id, data, entrada, saida, status |
| `time_record_events` | Eventos de ponto | id, time_record_id, tipo, hora, latitude, longitude |
| `trainings` | Treinamentos | id, company_id, nome, data_inicio, data_fim, is_active |
| `training_enrollments` | Inscrições | id, training_id, employee_id, status |
| `periodic_exams` | Exames periódicos | id, employee_id, tipo, data_vencimento, status |
| `bank_hours_types` | Tipos de banco de horas | id, company_id, nome, tipo |
| `bank_hours_assignments` | Atribuições de banco | id, employee_id, bank_hours_type_id, saldo |
| `work_shifts` | Turnos de trabalho | id, company_id, nome, entrada, saida |
| `rubricas` | Rubricas de folha | id, company_id, codigo, descricao, tipo |
| `employment_contracts` | Contratos de trabalho | id, employee_id, tipo, data_inicio, data_fim |
| `medical_agreements` | Convênios médicos | id, company_id, nome, tipo |
| `dependents` | Dependentes | id, employee_id, nome, parentesco |
| `reimbursement_requests` | Solicitações de reembolso | id, employee_id, valor, status |
| `location_zones` | Zonas de localização | id, company_id, nome, latitude, longitude, raio |
| `employee_location_zones` | Zonas por funcionário | employee_id, location_zone_id |

### Schema `frota` (10+ tabelas)

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `vehicles` | Veículos | id, company_id, placa, modelo, situacao, tipo |
| `drivers` | Motoristas | id, company_id, employee_id, cnh, validade_cnh |
| `maintenances` | Manutenções | id, vehicle_id, tipo, data_agendada, status |
| `incidents` | Incidentes | id, vehicle_id, tipo, data, descricao |
| `inspections` | Inspeções | id, vehicle_id, data, resultado |
| `requests` | Solicitações de veículo | id, employee_id, vehicle_id, status |

### Schema `almoxarifado` (15+ tabelas)

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `almoxarifados` | Almoxarifados | id, company_id, nome, codigo, responsavel_id |
| `materiais_equipamentos` | Materiais/Equipamentos | id, company_id, codigo_interno, descricao, tipo, estoque_minimo, estoque_maximo |
| `estoque_atual` | Estoque atual | id, material_equipamento_id, almoxarifado_id, quantidade_atual, quantidade_reservada |
| `movimentacoes_estoque` | Movimentações | id, material_equipamento_id, tipo, quantidade, data |
| `entradas_materiais` | Entradas | id, company_id, fornecedor_id, data_entrada, valor_total, status |
| `entrada_itens` | Itens de entrada | id, entrada_id, material_equipamento_id, quantidade, valor_unitario |
| `transferencias` | Transferências | id, company_id, almoxarifado_origem, almoxarifado_destino, status |
| `transferencia_itens` | Itens de transferência | id, transferencia_id, material_equipamento_id, quantidade |
| `inventarios` | Inventários | id, company_id, almoxarifado_id, data_inicio, status |
| `inventario_itens` | Itens de inventário | id, inventario_id, material_equipamento_id, quantidade_contada |

### Schema `financeiro` (20+ tabelas)

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `contas_pagar` | Contas a pagar | id, company_id, fornecedor_id, valor, vencimento, status |
| `contas_receber` | Contas a receber | id, company_id, cliente_id, valor, vencimento, status |
| `fluxo_caixa` | Fluxo de caixa | id, company_id, data, tipo, valor |
| `plano_contas` | Plano de contas | id, company_id, codigo, descricao, tipo |
| `lancamentos_contabeis` | Lançamentos | id, company_id, conta_id, valor, data |
| `aprovacoes` | Aprovações | id, company_id, tipo, status, aprovador_id |

### Schema `compras` (10+ tabelas)

| Tabela | Descrição | Campos Importantes |
|--------|-----------|-------------------|
| `requisicoes` | Requisições | id, company_id, solicitante_id, status, prioridade |
| `cotacoes` | Cotações | id, requisicao_id, fornecedor_id, status |
| `pedidos` | Pedidos | id, cotacao_id, fornecedor_id, status, valor_total |
| `fornecedores_dados` | Dados de fornecedores | id, partner_id, categoria, avaliacao |

---

## 3. FUNÇÕES RPC IDENTIFICADAS

### Funções de Permissões e Admin

- `is_admin(user_id UUID)` - Verifica se usuário é admin
- `is_admin_simple(user_id UUID)` - Versão simplificada
- `check_module_permission(user_id UUID, module_name TEXT)` - Verifica permissão de módulo
- `check_entity_permission(user_id UUID, entity_name TEXT, action TEXT)` - Verifica permissão de entidade
- `get_user_profile(user_id UUID, company_id UUID)` - Obtém perfil do usuário

### Funções Genéricas de Dados

- `get_entity_data(schema_name TEXT, table_name TEXT, company_id UUID, ...)` - Busca dados genéricos
- `create_entity_data(schema_name TEXT, table_name TEXT, data JSONB, company_id UUID)` - Cria registro
- `update_entity_data(schema_name TEXT, table_name TEXT, id UUID, data JSONB)` - Atualiza registro
- `delete_entity_data(schema_name TEXT, table_name TEXT, id UUID)` - Deleta registro

### Funções RH

- `get_time_records_simple(company_id UUID, ...)` - Busca registros de ponto
- `recalculate_time_record_hours(time_record_id UUID)` - Recalcula horas
- `calculate_and_accumulate_bank_hours(...)` - Calcula banco de horas
- `get_periodic_exams(company_id UUID, ...)` - Busca exames periódicos
- `get_bank_hours_balance(employee_id UUID)` - Saldo de banco de horas

### Funções Financeiras

- `get_required_approval_level(...)` - Nível de aprovação necessário
- `create_compensation_approvals(...)` - Cria aprovações de compensação

### Funções de Gestão

- `create_user_company_relationship(...)` - Cria relação usuário-empresa
- `get_cost_center_path(cost_center_id UUID)` - Caminho hierárquico do centro de custo
- `check_cost_center_hierarchy()` - Valida hierarquia

### Funções de Configuração

- `create_signature_config_for_new_company()` - Cria configuração de assinatura
- `update_module_permission_production(...)` - Atualiza permissão de módulo
- `update_entity_permission_production(...)` - Atualiza permissão de entidade

---

## 4. TRIGGERS IDENTIFICADOS

### Triggers de Atualização de Timestamp

- `update_updated_at_column()` - Atualiza `updated_at` automaticamente
- Aplicado em múltiplas tabelas

### Triggers de Configuração

- `trigger_create_signature_config` - Cria configuração de assinatura para nova empresa

### Triggers de Validação

- `trigger_check_cost_center_hierarchy` - Valida hierarquia de centros de custo

---

## 5. POLÍTICAS RLS (Row Level Security)

### Estratégia de Multi-Tenancy

- **Isolamento por `company_id`**: Todas as tabelas principais têm `company_id`
- **Políticas baseadas em `user_companies`**: Usuários só acessam dados de empresas associadas
- **Políticas de Admin**: Admins podem acessar todas as empresas

### Tabelas com RLS Ativo

- `public.companies`
- `public.users`
- `public.user_companies`
- `public.profiles`
- `rh.employees`
- `rh.time_records`
- `frota.vehicles`
- `almoxarifado.almoxarifados`
- E outras...

---

## 6. ÍNDICES EXISTENTES

### Índices Básicos

- Primary keys (automáticos)
- Foreign keys (alguns têm índices)
- `company_id` em várias tabelas

### Índices Específicos Identificados

- `idx_employees_cost_center_id` - employees.cost_center_id
- `idx_employees_work_shift_id` - employees.work_shift_id
- `idx_employee_location_zones_employee_id` - employee_location_zones
- `idx_cost_centers_parent_id` - cost_centers.parent_id
- `idx_equipment_rental_monthly_payments_*` - Vários índices na tabela de pagamentos

### Oportunidades de Otimização

- **Faltam índices compostos** para consultas frequentes
- **Faltam índices parciais** para filtros comuns (ex: status = 'ativo')
- **Faltam índices GIN** para campos JSONB

---

## 7. VIEWS MATERIALIZADAS EXISTENTES

### Views Identificadas

1. **`periodic_exams_mv`** (schema: public)
   - Agrega dados de exames periódicos
   - Atualizada via função `refresh_periodic_exams_mv()`

### Oportunidades

- **Faltam views para dashboards** (estatísticas agregadas)
- **Faltam views para relatórios** (dados pré-calculados)

---

## 8. PADRÕES IDENTIFICADOS

### Estrutura de Tabelas

1. **Campos Padrão:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `company_id UUID NOT NULL` (multi-tenancy)
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - `ativo BOOLEAN DEFAULT true` (soft delete)

2. **Nomenclatura:**
   - Tabelas: plural, snake_case (ex: `employees`, `time_records`)
   - Campos: snake_case (ex: `company_id`, `created_at`)
   - Funções: snake_case (ex: `get_entity_data`)

3. **Relacionamentos:**
   - Foreign keys com `ON DELETE CASCADE` ou `ON DELETE SET NULL`
   - Constraints de unicidade quando necessário

### Estratégia de Multi-Tenancy

- **Isolamento por `company_id`**: Todas as tabelas principais têm este campo
- **RLS Policies**: Garantem isolamento no nível de banco
- **Funções RPC**: Recebem `company_id` como parâmetro

---

## 9. PONTOS DE ATENÇÃO PARA OTIMIZAÇÕES

### 1. Consultas Frequentes Identificadas

- **Dashboard**: Agregações de múltiplas tabelas
- **Listagens**: Ordenação por `created_at DESC` + `id DESC`
- **Filtros**: Por `company_id`, `status`, `ativo`
- **Busca**: Por nome, matrícula, CPF (ILIKE)

### 2. Tabelas com Maior Volume (Estimado)

- `rh.time_records` - Registros diários de ponto
- `rh.time_record_events` - Eventos de ponto
- `almoxarifado.movimentacoes_estoque` - Movimentações frequentes
- `public.notifications` - Notificações acumuladas

### 3. Agregações Pesadas

- Estatísticas de dashboard (múltiplas tabelas)
- Relatórios de RH (agregações por período)
- Estatísticas de estoque (cálculos de valor)
- Relatórios financeiros (somas, médias)

---

## 10. CHECKLIST PARA IMPLEMENTAÇÃO

### Antes de Criar Views Materializadas

- [x] Identificar tabelas principais
- [x] Identificar agregações frequentes
- [x] Verificar relacionamentos
- [x] Entender padrão de multi-tenancy
- [ ] Testar queries de agregação
- [ ] Verificar volume de dados

### Antes de Criar Índices

- [x] Identificar consultas frequentes
- [x] Identificar campos de ordenação
- [x] Identificar campos de filtro
- [ ] Analisar EXPLAIN ANALYZE das queries
- [ ] Verificar impacto em INSERT/UPDATE

### Antes de Criar Funções RPC

- [x] Identificar agregações pesadas
- [x] Identificar consultas complexas
- [x] Entender parâmetros necessários
- [ ] Testar lógica de agregação
- [ ] Verificar performance

---

## 11. CONCLUSÕES

### Estrutura Sólida

- ✅ Multi-tenancy bem implementado
- ✅ RLS policies ativas
- ✅ Padrões consistentes
- ✅ Relacionamentos bem definidos

### Oportunidades de Otimização

- ⚠️ Faltam views materializadas para dashboards
- ⚠️ Faltam índices otimizados para consultas frequentes
- ⚠️ Faltam funções RPC para agregações pesadas
- ⚠️ Cache do React Query não otimizado
- ⚠️ Exportações não otimizadas

### Próximos Passos

1. **FASE 1**: Criar views materializadas e índices
2. **FASE 2**: Otimizar cache do React Query
3. **FASE 3**: Implementar paginação cursor-based
4. **FASE 4**: Otimizar exportações
5. **FASE 5-6**: Otimizações de imagens e build

---

**Documento criado em:** 2025-11-08  
**Versão:** 1.0  
**Status:** ✅ Pronto para implementação da FASE 1

