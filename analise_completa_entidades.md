# Análise Completa: Entidades de Permissão

## Resumo Executivo

Esta análise compara as entidades de permissão que existem no banco de dados com as entidades disponíveis na interface de gerenciamento de permissões (`PermissionManager`).

## 1. Entidades no Banco de Dados (Perfil Gestor)

**Total: 65 entidades**

Lista completa das entidades que existem no banco para o perfil Gestor:

1. accounts_payable
2. acoes_disciplinares
3. almoxarifados
4. approval_center ⚠️
5. approval_configs ⚠️
6. approvals ⚠️
7. aprovacoes
8. aprovacoes_compra
9. avaliacao_fornecedores
10. benefits
11. borderos
12. cargos
13. centros_custo
14. checklist_recebimento
15. conciliacoes_bancarias
16. configuracoes_aprovacao
17. contas_bancarias
18. contas_pagar
19. contas_receber
20. contratos_compra
21. cotacoes
22. disciplinary_actions
23. empresas
24. entrada_itens
25. entradas_materiais
26. estoque_atual
27. exam_management ⚠️
28. exames_periodicos
29. ferias
30. fluxo_caixa
31. fornecedores
32. funcionarios
33. historico_compras
34. income_statements
35. inventario_itens
36. inventarios
37. lancamentos_contabeis
38. manager_dashboard ⚠️
39. materiais_equipamentos
40. movimentacoes_estoque
41. nfe
42. nfse
43. parceiros
44. pedidos_compra
45. perfis
46. periodic_exams
47. plano_contas
48. portal_colaborador ⚠️
49. projetos
50. reembolsos
51. registros_ponto
52. reimbursement_requests
53. remessas_bancarias
54. retornos_bancarios
55. services
56. solicitacoes_compra
57. time_records
58. time_tracking_management ⚠️
59. transferencia_itens
60. transferencias
61. treinamentos
62. unidades
63. usuarios
64. vacation_approvals ⚠️
65. vacations

⚠️ = Entidades criadas manualmente que podem não estar na interface

## 2. Entidades no PermissionManager (Código)

**Total: ~100+ entidades** (lista hardcoded no arquivo `PermissionManager.tsx`)

### Entidades que ESTÃO no PermissionManager:

- usuarios ✅
- empresas ✅
- perfis ✅
- projetos ✅
- materiais_equipamentos ✅
- parceiros ✅
- services ✅
- centros_custo ✅
- employees (mas no banco é 'funcionarios')
- registros_ponto ✅
- time_records ✅
- vacations ✅
- reimbursement_requests ✅
- periodic_exams ✅
- disciplinary_actions ✅
- trainings (mas no banco é 'treinamentos')
- positions (não existe no banco)
- work_shifts (não existe no banco)
- holidays (não existe no banco)
- rubricas (não existe no banco)
- units (mas no banco é 'unidades')
- dependents (não existe no banco)
- employment_contracts (não existe no banco)
- medical_agreements (não existe no banco)
- benefits ✅
- payroll_config (não existe no banco)
- payroll (não existe no banco)
- income_statements ✅
- esocial (não existe no banco)
- inss_brackets (não existe no banco)
- irrf_brackets (não existe no banco)
- fgts_config (não existe no banco)
- delay_reasons (não existe no banco)
- absence_types (não existe no banco)
- cid_codes (não existe no banco)
- allowance_types (não existe no banco)
- deficiency_types (não existe no banco)
- awards_productivity (não existe no banco)
- medical_plans (não existe no banco)
- employee_medical_plans (não existe no banco)
- unions (não existe no banco)
- employee_union_memberships (não existe no banco)
- payroll_calculation (não existe no banco)
- event_consolidation (não existe no banco)
- contas_pagar ✅
- contas_receber ✅
- borderos ✅
- remessas_bancarias ✅
- retornos_bancarios ✅
- contas_bancarias ✅
- conciliacoes_bancarias ✅
- fluxo_caixa ✅
- nfe ✅
- nfse ✅
- plano_contas ✅
- lancamentos_contabeis ✅
- configuracoes_aprovacao ✅
- aprovacoes ✅
- accounts_payable ✅
- configuracao_fiscal (não existe no banco)
- configuracao_bancaria (não existe no banco)
- estoque_atual ✅
- movimentacoes_estoque ✅
- entradas_materiais ✅
- entrada_itens ✅
- checklist_recebimento ✅
- transferencias ✅
- transferencia_itens ✅
- inventarios ✅
- inventario_itens ✅
- almoxarifados ✅
- localizacoes_fisicas (não existe no banco)
- warehouse_transfers (não existe no banco)
- material_exit_requests (não existe no banco)
- inventory_dashboard (não existe no banco)
- inventory_management (não existe no banco)
- warehouse_reports (não existe no banco)
- solicitacoes_compra ✅
- cotacoes ✅
- pedidos_compra ✅
- aprovacoes_compra ✅
- fornecedores ✅
- contratos_compra ✅
- historico_compras ✅
- avaliacao_fornecedores ✅
- fornecedores_dados (não existe no banco)
- vehicles (não existe no banco)
- vehicle_documents (não existe no banco)
- drivers (não existe no banco)
- vehicle_assignments (não existe no banco)
- vehicle_inspections (não existe no banco)
- inspection_items (não existe no banco)
- vehicle_maintenances (não existe no banco)
- vehicle_occurrences (não existe no banco)
- vehicle_requests (não existe no banco)
- vehicle_images (não existe no banco)

### Entidades que NÃO ESTÃO no PermissionManager mas existem no banco:

❌ **Entidades criadas manualmente que não aparecem na interface:**

1. **approval_center** - Usado em `CentralAprovacoes.tsx`
2. **approval_configs** - Usado em `CentralAprovacoesExpandida.tsx`
3. **approvals** - Usado em `CentralAprovacoesExpandida.tsx`
4. **exam_management** - Usado em `AcompanhamentoExames.tsx`
5. **manager_dashboard** - Usado em `GestorDashboard.tsx`
6. **portal_colaborador** - Usado em `TestPortal.tsx`
7. **time_tracking_management** - Usado em `AcompanhamentoPonto.tsx`
8. **vacation_approvals** - Usado em `AprovacaoFerias.tsx`

### Entidades que estão no PermissionManager mas não existem no banco:

❌ **Entidades listadas no código mas não criadas no banco:**

- positions
- work_shifts
- holidays
- rubricas
- dependents
- employment_contracts
- medical_agreements
- payroll_config
- payroll
- esocial
- inss_brackets
- irrf_brackets
- fgts_config
- delay_reasons
- absence_types
- cid_codes
- allowance_types
- deficiency_types
- awards_productivity
- medical_plans
- employee_medical_plans
- unions
- employee_union_memberships
- payroll_calculation
- event_consolidation
- configuracao_fiscal
- configuracao_bancaria
- localizacoes_fisicas
- warehouse_transfers
- material_exit_requests
- inventory_dashboard
- inventory_management
- warehouse_reports
- fornecedores_dados
- vehicles
- vehicle_documents
- drivers
- vehicle_assignments
- vehicle_inspections
- inspection_items
- vehicle_maintenances
- vehicle_occurrences
- vehicle_requests
- vehicle_images

## 3. Problemas Identificados

### Problema 1: Entidades criadas manualmente não aparecem na interface
As 8 entidades criadas manualmente para dar acesso aos portais não aparecem na interface de gerenciamento porque não estão na lista hardcoded do `PermissionManager`.

### Problema 2: Inconsistências de nomenclatura
- `employees` no código vs `funcionarios` no banco
- `trainings` no código vs `treinamentos` no banco
- `units` no código vs `unidades` no banco

### Problema 3: Entidades listadas mas não criadas
Muitas entidades estão listadas no `PermissionManager` mas nunca foram criadas no banco de dados.

## 4. Recomendações

### Opção 1: Adicionar entidades faltantes ao PermissionManager
Adicionar as 8 entidades criadas manualmente à lista do `PermissionManager.tsx` para que apareçam na interface.

### Opção 2: Remover entidades do banco que não estão na interface
Remover as entidades criadas manualmente e usar apenas as entidades que estão na interface.

### Opção 3: Criar todas as entidades faltantes no banco
Criar todas as entidades listadas no `PermissionManager` que não existem no banco.

## 5. Conclusão

O sistema tem uma **desconexão** entre:
- O que está no banco de dados (65 entidades para o perfil Gestor)
- O que está na interface (lista hardcoded no código)
- O que foi criado manualmente (8 entidades específicas dos portais)

As entidades criadas manualmente (`approval_center`, `approval_configs`, `approvals`, `exam_management`, `manager_dashboard`, `portal_colaborador`, `time_tracking_management`, `vacation_approvals`) **funcionam no sistema** (as páginas verificam essas permissões), mas **não aparecem na interface** de gerenciamento porque não estão na lista do `PermissionManager`.

