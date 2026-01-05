-- =====================================================
-- LISTA DE MIGRATIONS RELACIONADAS A APROVAÇÃO
-- Ordem cronológica (por nome do arquivo)
-- =====================================================

/*
MIGRATIONS BASE (janeiro 2025):
1. 20250110000020_create_hierarchical_approval_system.sql
   - Sistema hierárquico de aprovações (pode não ser usado mais)

2. 20250116000001_create_unified_approval_system.sql
   - CRIA: Tabela aprovacoes_unificada
   - CRIA: Tabela configuracoes_aprovacao_unificada
   - CRIA: Tabela historico_edicoes_solicitacoes
   ⚠️ ESSENCIAL - Deve estar aplicada

3. 20250116000002_create_approval_functions.sql
   - CRIA: Função process_approval (versão original - pode ter bug)
   - CRIA: Outras funções de aprovação
   ⚠️ Pode ter o bug do status 'aprovado' vs 'aprovada'

4. 20250116000003_create_approval_reset_triggers.sql
   - CRIA: Triggers para reset de aprovações após edição

MIGRATIONS DE CORREÇÃO (dezembro 2025):

5. 20251209000001_fix_create_approvals_null_nivel.sql
   - Correção: Nível de aprovação NULL

6. 20251209000002_add_requisicao_compra_to_pending_approvals.sql
   - Adiciona: Suporte a requisicao_compra nas aprovações pendentes

7. 20251210000001_fix_process_approval_status_requisicao.sql
   - CORRIGE: Função process_approval para usar 'aprovada' (não 'aprovado')
   - CORRIGE: Mapeamento de status para requisicao_compra
   ✅ ESSENCIAL PARA O SEU PROBLEMA

8. 20251210220000_fix_requisicao_workflow_after_approval.sql
   - CORRIGE: Adiciona atualização de workflow_state = 'em_cotacao'
   - REFINA: Função process_approval
   ✅ ESSENCIAL PARA O SEU PROBLEMA

9. 20251211140000_add_updated_by_compras.sql
   - Adiciona: Campo updated_by nas tabelas de compras

10. 20251211142000_fix_record_edit_and_reset_approvals.sql
    - Correção: Reset de aprovações

11. 20251211143000_force_em_cotacao_for_approved_requisicoes.sql
    - ATUALIZA: Requisições já aprovadas para workflow_state = 'em_cotacao'
    - Migration de dados (não estrutura)

12. 20251211144500_fix_record_edit_and_reset_no_row_expansion.sql
    - Correção: Bug "row expansion" no trigger

MIGRATIONS RELACIONADAS:

13. 20251208000004_fix_approval_function_valor_total.sql
    - Correção: Função de aprovação (valor total)

14. 20251208220428_fix_all_approval_functions_profile_lookup.sql
    - Correção: Lookup de profile nas funções de aprovação

15. 20251206000001_fix_get_pending_approvals_type_conversion.sql
    - Correção: Conversão de tipo

16. 20251206000002_fix_get_pending_approvals_manager_filter.sql
    - Correção: Filtro de manager
*/











