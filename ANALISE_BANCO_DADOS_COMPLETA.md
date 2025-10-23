# Análise Completa do Banco de Dados - Esquema Public

## 📊 Resumo da Estrutura Atual

### **Tabelas Existentes (11 tabelas)**
1. `companies` - Empresas
2. `cost_centers` - Centros de Custo  
3. `entity_permissions` - Permissões de Entidades
4. `materials` - Materiais
5. `module_permissions` - Permissões de Módulos
6. `notifications` - Notificações
7. `partners` - Parceiros
8. `profiles` - Perfis de Usuário
9. `projects` - Projetos
10. `user_companies` - Associações Usuário-Empresa
11. `users` - Usuários

### **Funções RPC Identificadas (50+ funções)**
- **Verificação de Admin**: `is_admin`, `is_admin_simple`, `is_admin_production`, `is_admin_by_permissions`, etc.
- **Verificação de Permissões**: `check_module_permission`, `check_entity_permission`, `check_user_permission`
- **Gestão de Dados**: `get_entity_data`, `create_entity_data`, `update_entity_data`, `delete_entity_data`
- **Gestão de Perfis**: `create_profile`, `update_profile`, `get_user_profile`
- **Auditoria**: `audit_log`, `get_audit_logs`, `cleanup_old_audit_logs`
- **RH**: `create_employee`, `get_periodic_exams`, `create_periodic_exam`, `get_bank_hours_balance`
- **Financeiro**: `get_required_approval_level`, `create_compensation_approvals`

## 🔍 Análise Detalhada dos Dados

### **1. Perfis de Usuário (6 perfis)**
```sql
-- Perfis existentes:
- Super Admin (2242ce27-800c-494e-b7b9-c75cb832aa4d) - Acesso total
- Administrador (20bef50d-2e82-4e1c-926d-c47b659e3cfd) - Acesso completo
- Gerente (34632fe2-980b-4382-b104-ea244ed586f8) - Acesso de gerência
- Usuário (3ce71d8d-c9eb-4b18-9fd4-a72720421441) - Acesso básico
- Teste Perfil (94a3729e-8669-40c1-85e4-e94085d779d4) - Perfil de teste
- Perfil RPC Teste (d5226275-4b1f-4bc4-b9db-9c8ec3345774) - Perfil criado via RPC
```

### **2. Módulos Configurados (25 módulos)**
```sql
-- Módulos de produção:
- dashboard, users, companies, projects, materials, partners, cost_centers
- configuracoes, rh, recruitment, treinamento, financeiro, almoxarifado
- portal_colaborador, portal_gestor, compras, logistica, frota
- metalurgica, comercial, combustivel, implantacao

-- Módulos de teste (PROBLEMA):
- teste_modulo, teste_modulo2, teste_modulo3, teste_modulo4
- teste_final, teste_ambiguidade
```

### **3. Entidades Configuradas (25 entidades)**
```sql
-- Entidades básicas:
- users, companies, profiles, projects, materials, partners, cost_centers

-- Entidades RH:
- periodic_exams, disciplinary_actions, trainings, employees, time_records
- vacations, reimbursements

-- Entidades Financeiras:
- contas_pagar, contas_receber, borderos, remessas_bancarias, retornos_bancarios
- contas_bancarias, conciliacoes_bancarias, fluxo_caixa, nfe, nfse
- plano_contas, lancamentos_contabeis, configuracoes_aprovacao, aprovacoes

-- Entidades Almoxarifado:
- estoque_atual, movimentacoes_estoque, entradas_materiais, entrada_itens
- checklist_recebimento, transferencias, transferencia_itens, inventarios
- inventario_itens, almoxarifados, materiais_equipamentos, solicitacoes_compra
```

### **4. Usuários (16 usuários)**
- **1 Super Admin**: Deiverson Jorge Honorato Medeiros
- **15 usuários de teste**: Teste1 até Teste16
- **1 empresa ativa**: Empresa Teste (a9784891-9d58-4cc4-8404-18032105c335)

## 🚨 Problemas Identificados

### **1. Módulos de Teste Poluindo o Sistema**
```sql
-- PROBLEMA: Módulos de teste não deveriam estar em produção
'teste_modulo', 'teste_modulo2', 'teste_modulo3', 'teste_modulo4'
'teste_final', 'teste_ambiguidade'
```

### **2. Perfil "Gerente" com Permissões Inconsistentes**
```sql
-- PROBLEMA: Gerente tem permissões negadas para módulos básicos
-- Linha 50: Gerente tem 'users' = false, false, false, false
-- Linha 51: Gerente tem 'dashboard' = false, false, false, false
```

### **3. Múltiplas Funções is_admin Conflitantes**
- `is_admin` - Função original
- `is_admin_simple` - Função simplificada
- `is_admin_production` - Baseada em permissões de produção
- `is_admin_by_permissions` - Baseada em permissões
- `is_admin_by_permissions_flexible` - Versão flexível
- `is_admin_by_permissions_simple` - Versão simples
- `is_admin_new` - Nova implementação
- `is_admin_by_core_permissions` - Baseada em permissões core

### **4. Perfis de Teste Desnecessários**
- "Teste Perfil" - Perfil vazio sem permissões
- "Perfil RPC Teste" - Perfil criado via RPC sem permissões

### **5. Usuários de Teste em Produção**
- 15 usuários de teste que não deveriam estar em produção
- Muitos sem empresa associada (company_id = NULL)

## 📋 Recomendações de Correção

### **Fase 1: Limpeza Imediata**

1. **Remover módulos de teste:**
```sql
DELETE FROM module_permissions WHERE module_name LIKE 'teste_%';
```

2. **Remover perfis de teste:**
```sql
DELETE FROM profiles WHERE nome LIKE '%Teste%';
```

3. **Remover usuários de teste:**
```sql
DELETE FROM users WHERE nome LIKE 'Teste%';
DELETE FROM user_companies WHERE user_id IN (
  SELECT id FROM users WHERE nome LIKE 'Teste%'
);
```

### **Fase 2: Padronização de Funções**

1. **Manter apenas uma função is_admin:**
```sql
-- Manter apenas is_admin_simple e remover as outras
DROP FUNCTION IF EXISTS is_admin_production;
DROP FUNCTION IF EXISTS is_admin_by_permissions;
-- ... remover outras implementações
```

2. **Padronizar verificação de permissões:**
```sql
-- Usar apenas check_module_permission e check_entity_permission
-- Remover funções duplicadas
```

### **Fase 3: Correção de Permissões**

1. **Corrigir perfil Gerente:**
```sql
-- Restaurar permissões básicas para Gerente
UPDATE module_permissions 
SET can_read = true, can_create = false, can_edit = false, can_delete = false
WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
AND module_name IN ('dashboard', 'users');
```

2. **Garantir consistência de permissões:**
```sql
-- Verificar se todos os perfis têm permissões para módulos essenciais
-- Garantir que Super Admin tenha todas as permissões
```

### **Fase 4: Validação e Testes**

1. **Testar funções RPC:**
```sql
-- Testar is_admin_simple com usuários existentes
-- Testar check_module_permission com diferentes perfis
-- Testar get_entity_data com diferentes entidades
```

2. **Validar RLS policies:**
```sql
-- Verificar se todas as tabelas têm RLS habilitado
-- Testar políticas de acesso por empresa
```

## 🎯 Scripts de Correção Prontos

### **Script 1: Limpeza Completa**
```sql
-- Remover módulos de teste
DELETE FROM module_permissions WHERE module_name LIKE 'teste_%';

-- Remover perfis de teste
DELETE FROM profiles WHERE nome LIKE '%Teste%';

-- Remover usuários de teste
DELETE FROM user_companies WHERE user_id IN (
  SELECT id FROM users WHERE nome LIKE 'Teste%'
);
DELETE FROM users WHERE nome LIKE 'Teste%';
```

### **Script 2: Correção do Perfil Gerente**
```sql
-- Restaurar permissões básicas para Gerente
UPDATE module_permissions 
SET can_read = true, can_create = false, can_edit = false, can_delete = false
WHERE profile_id = '34632fe2-980b-4382-b104-ea244ed586f8' 
AND module_name IN ('dashboard', 'users');
```

### **Script 3: Padronização de Funções**
```sql
-- Manter apenas is_admin_simple
DROP FUNCTION IF EXISTS is_admin_production;
DROP FUNCTION IF EXISTS is_admin_by_permissions;
DROP FUNCTION IF EXISTS is_admin_by_permissions_flexible;
DROP FUNCTION IF EXISTS is_admin_by_permissions_simple;
DROP FUNCTION IF EXISTS is_admin_new;
DROP FUNCTION IF EXISTS is_admin_by_core_permissions;
```

## 📊 Status Atual vs. Ideal

| Aspecto | Status Atual | Status Ideal |
|---------|--------------|--------------|
| Módulos | 25 (6 de teste) | 19 (0 de teste) |
| Perfis | 6 (2 de teste) | 4 (0 de teste) |
| Usuários | 16 (15 de teste) | 1 (0 de teste) |
| Funções is_admin | 8 conflitantes | 1 padronizada |
| Permissões Gerente | Inconsistentes | Corretas |

## 🚀 Próximos Passos

1. **Executar Script 1** - Limpeza completa
2. **Executar Script 2** - Correção do Gerente  
3. **Executar Script 3** - Padronização de funções
4. **Testar sistema** - Validar funcionamento
5. **Implementar RLS** - Ativar políticas de segurança

O banco está funcional, mas precisa de limpeza e padronização para funcionar corretamente em produção.
