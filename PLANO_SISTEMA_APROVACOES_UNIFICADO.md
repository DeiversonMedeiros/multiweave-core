# PLANO: SISTEMA DE APROVAÇÕES UNIFICADO - VERSÃO ATUALIZADA

## ANÁLISE DO ESTADO ATUAL

### Estrutura Existente de Aprovações

O sistema já possui múltiplas estruturas de aprovação:

1. **Financeiro** (`financeiro.configuracoes_aprovacao` e `financeiro.aprovacoes`)
   - Focado em contas a pagar/receber
   - Baseado em valor limite, centro de custo, departamento, classe financeira
   - Sistema hierárquico por níveis
   - Status: `pendente`, `aprovado`, `rejeitado`

2. **Compras** (`compras.configuracoes_aprovacao`, `compras.aprovacoes_requisicao`, `compras.aprovacoes_cotacao`)
   - Focado em requisições e cotações
   - Baseado em valor limite, departamento, perfil
   - Sistema por níveis
   - Status: `pendente`, `aprovado`, `rejeitado`

3. **RH** (`rh.approval_levels`, `rh.approval_level_approvers`, `rh.compensation_approvals`)
   - Sistema hierárquico para compensações
   - Baseado em valores e horas
   - Status: `pending`, `approved`, `rejected`

4. **Almoxarifado** (`almoxarifado.transferencias`)
   - Aprovação simples para transferências
   - Campo `aprovador_id` direto
   - Status: `pendente`, `aprovado`, `rejeitado`, `transferido`

### Saídas de Materiais (Análise Atual)
- **Movimentações de Estoque**: `almoxarifado.movimentacoes_estoque` com `tipo_movimentacao = 'saida'`
- **Transferências**: `almoxarifado.transferencias` (entre almoxarifados)
- **Não existe**: Tabela específica para saídas de materiais para funcionários
- **Necessário**: Criar `almoxarifado.solicitacoes_saida_materiais`

### Portal do Gestor Atual
- Central de Aprovações com tipos: férias, compensações, reembolsos, atestados, equipamentos, correções de ponto
- Interface unificada mas limitada aos processos de RH
- **Não existe**: Sistema de transferência de aprovações entre usuários

## PROPOSTA DE SOLUÇÃO

### 1. NOVA ESTRUTURA UNIFICADA

#### 1.1 Tabela Principal de Configurações de Aprovação
```sql
CREATE TABLE public.configuracoes_aprovacao_unificada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Tipo de processo
    processo_tipo VARCHAR(50) NOT NULL CHECK (processo_tipo IN (
        'conta_pagar', 'requisicao_compra', 'cotacao_compra', 
        'solicitacao_saida_material', 'solicitacao_transferencia_material'
    )),
    
    -- Critérios de aplicação (todos opcionais para flexibilidade)
    centro_custo_id UUID REFERENCES cost_centers(id),
    departamento VARCHAR(100),
    classe_financeira VARCHAR(100),
    usuario_id UUID REFERENCES users(id),
    
    -- Limites e níveis
    valor_limite DECIMAL(15,2),
    nivel_aprovacao INTEGER NOT NULL DEFAULT 1,
    
    -- Aprovadores (múltiplos por nível)
    aprovadores JSONB NOT NULL, -- Array de {user_id, is_primary, ordem}
    
    -- Status e auditoria
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);
```

#### 1.2 Tabela de Aprovações Unificada
```sql
CREATE TABLE public.aprovacoes_unificada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificação da solicitação
    processo_tipo VARCHAR(50) NOT NULL,
    processo_id UUID NOT NULL, -- ID da tabela específica (conta_pagar, requisicao, etc.)
    
    -- Workflow
    nivel_aprovacao INTEGER NOT NULL,
    aprovador_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
    
    -- Dados da aprovação
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    
    -- Transferência de aprovação
    aprovador_original_id UUID REFERENCES users(id), -- Usuário original designado
    transferido_em TIMESTAMP WITH TIME ZONE,
    transferido_por UUID REFERENCES users(id),
    motivo_transferencia TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.3 Tabela de Histórico de Edições (Para Reset de Aprovações)
```sql
CREATE TABLE public.historico_edicoes_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificação da solicitação
    processo_tipo VARCHAR(50) NOT NULL,
    processo_id UUID NOT NULL,
    
    -- Dados da edição
    usuario_editor_id UUID NOT NULL REFERENCES users(id),
    data_edicao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campos_alterados JSONB, -- Array de campos que foram alterados
    valores_anteriores JSONB, -- Valores antes da alteração
    valores_novos JSONB, -- Valores após a alteração
    
    -- Reset de aprovações
    aprovacoes_resetadas BOOLEAN DEFAULT false,
    data_reset TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. FUNCIONALIDADES ESPECÍFICAS POR PROCESSO

#### 2.1 Contas a Pagar
- **Critérios**: Valor, centro de custo, departamento, classe financeira
- **Integração**: Usar dados existentes da tabela `financeiro.contas_pagar`
- **Campos relevantes**: `valor_original`, `centro_custo_id`, `departamento`, `classe_financeira`

#### 2.2 Requisição de Compras
- **Critérios**: Valor total, centro de custo, departamento, solicitante
- **Integração**: Usar dados da tabela `compras.requisicoes_compra`
- **Campos relevantes**: `valor_total`, `centro_custo_id`, `solicitante_id`

#### 2.3 Aprovação de Cotação de Compra
- **Critérios**: Valor da cotação, fornecedor, centro de custo
- **Integração**: Usar dados da tabela `compras.cotacoes`
- **Campos relevantes**: `valor_total`, `fornecedor_id`, `centro_custo_id`

#### 2.4 Solicitação de Saída de Materiais
- **Critérios**: Valor total dos materiais, centro de custo, tipo de material, funcionário solicitante
- **Integração**: Criar nova tabela `almoxarifado.solicitacoes_saida_materiais`
- **Campos relevantes**: `valor_total`, `centro_custo_id`, `tipo_material`, `funcionario_solicitante_id`
- **Tabela proposta**:
```sql
CREATE TABLE almoxarifado.solicitacoes_saida_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    funcionario_solicitante_id UUID NOT NULL REFERENCES users(id),
    almoxarifado_id UUID NOT NULL REFERENCES almoxarifado.almoxarifados(id),
    centro_custo_id UUID REFERENCES cost_centers(id),
    projeto_id UUID REFERENCES projects(id),
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    data_saida TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'entregue')),
    valor_total DECIMAL(15,2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2.5 Solicitação de Transferência de Materiais
- **Critérios**: Valor total, almoxarifado origem/destino, centro de custo
- **Integração**: Usar dados da tabela `almoxarifado.transferencias`
- **Campos relevantes**: `valor_total`, `almoxarifado_origem_id`, `almoxarifado_destino_id`, `centro_custo_id`

### 3. INTERFACE DE CONFIGURAÇÃO

#### 3.1 Página "Configurações de Aprovação"
- **Localização**: Portal Administrativo > Configurações > Aprovações
- **Funcionalidades**:
  - Listar todas as configurações existentes
  - Criar/editar configurações por processo
  - Definir critérios flexíveis (centro de custo, departamento, classe financeira, usuário)
  - Configurar múltiplos aprovadores por nível
  - Definir valores limites
  - Ativar/desativar configurações

#### 3.2 Interface de Configuração
```
┌─────────────────────────────────────────────────────────────┐
│ CONFIGURAÇÕES DE APROVAÇÃO                                 │
├─────────────────────────────────────────────────────────────┤
│ Processo: [Contas a Pagar ▼]                               │
│                                                             │
│ Critérios de Aplicação:                                     │
│ ☐ Centro de Custo: [Selecionar ▼]                          │
│ ☐ Departamento: [Digite...]                                │
│ ☐ Classe Financeira: [Digite...]                           │
│ ☐ Usuário Específico: [Selecionar ▼]                      │
│                                                             │
│ Limites:                                                    │
│ Valor Limite: [R$ 0,00]                                    │
│ Nível de Aprovação: [1]                                    │
│                                                             │
│ Aprovadores:                                                │
│ 1. [Usuário 1 ▼] ☑ Principal                              │
│ 2. [Usuário 2 ▼] ☐ Principal                              │
│ 3. [Usuário 3 ▼] ☐ Principal                              │
│ [+ Adicionar Aprovador]                                     │
│                                                             │
│ [Salvar] [Cancelar]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4. INTEGRAÇÃO COM PORTAL DO GESTOR

#### 4.1 Central de Aprovações Expandida
- **Manter**: Aprovações existentes de RH (férias, compensações, etc.)
- **Adicionar**: Novas seções para processos financeiros e de compras
- **Filtros**: Por tipo de processo, status, data, valor
- **Ações**: Aprovar, rejeitar, visualizar detalhes

#### 4.2 Estrutura da Página
```
┌─────────────────────────────────────────────────────────────┐
│ CENTRAL DE APROVAÇÕES                                      │
├─────────────────────────────────────────────────────────────┤
│ Filtros: [Todos ▼] [Pendentes ▼] [Últimos 30 dias ▼]      │
│                                                             │
│ ┌─ RH ──────────────────────────────────────────────────┐   │
│ │ Férias (3) | Compensações (2) | Reembolsos (4) | ... │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ FINANCEIRO ──────────────────────────────────────────┐   │
│ │ Contas a Pagar (5) | Contas a Receber (1) | ...      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ COMPRAS ─────────────────────────────────────────────┐   │
│ │ Requisições (8) | Cotações (3) | ...                 │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ ALMOXARIFADO ───────────────────────────────────────┐   │
│ │ Retiradas (2) | Transferências (1) | ...            │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5. IMPLEMENTAÇÃO TÉCNICA

#### 5.1 Funções de Banco de Dados
```sql
-- Função para determinar aprovadores necessários
CREATE FUNCTION get_required_approvers(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    nivel INTEGER,
    aprovador_id UUID,
    is_primary BOOLEAN
);

-- Função para criar aprovações automáticas
CREATE FUNCTION create_approvals_for_process(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN;

-- Função para processar aprovação (com 3 status)
CREATE FUNCTION process_approval(
    p_aprovacao_id UUID,
    p_status VARCHAR(20), -- 'aprovado', 'rejeitado', 'cancelado'
    p_observacoes TEXT,
    p_aprovador_id UUID
) RETURNS BOOLEAN;

-- Função para transferir aprovação
CREATE FUNCTION transfer_approval(
    p_aprovacao_id UUID,
    p_novo_aprovador_id UUID,
    p_motivo TEXT,
    p_transferido_por UUID
) RETURNS BOOLEAN;

-- Função para resetar aprovações após edição
CREATE FUNCTION reset_approvals_after_edit(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS BOOLEAN;

-- Função para verificar se pode editar (não cancelado)
CREATE FUNCTION can_edit_solicitation(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID
) RETURNS BOOLEAN;
```

#### 5.2 Triggers Automáticos
- Trigger em `financeiro.contas_pagar` para criar aprovações
- Trigger em `compras.requisicoes_compra` para criar aprovações
- Trigger em `compras.cotacoes` para criar aprovações
- Trigger em `almoxarifado.transferencias` para criar aprovações
- Trigger em nova tabela `almoxarifado.solicitacoes_saida_materiais`

#### 5.3 Triggers para Reset de Aprovações
- Trigger em `financeiro.contas_pagar` para detectar edições e resetar aprovações
- Trigger em `compras.requisicoes_compra` para detectar edições e resetar aprovações
- Trigger em `compras.cotacoes` para detectar edições e resetar aprovações
- Trigger em `almoxarifado.transferencias` para detectar edições e resetar aprovações
- Trigger em `almoxarifado.solicitacoes_saida_materiais` para detectar edições e resetar aprovações

#### 5.4 Componentes React
- `ConfiguracoesAprovacaoPage.tsx` - Página de configuração
- `AprovacaoConfigForm.tsx` - Formulário de configuração
- `CentralAprovacoesExpandida.tsx` - Central expandida
- `AprovacaoCard.tsx` - Card individual de aprovação
- `AprovacaoModal.tsx` - Modal para aprovar/rejeitar/cancelar
- `TransferirAprovacaoModal.tsx` - Modal para transferir aprovação
- `HistoricoEdicoesModal.tsx` - Modal para visualizar histórico de edições
- `SolicitacaoSaidaMateriaisPage.tsx` - Página para saídas de materiais

### 6. MIGRAÇÃO DOS DADOS EXISTENTES

#### 6.1 Estratégia de Migração
1. **Criar novas tabelas** sem afetar as existentes
2. **Migrar configurações** das tabelas antigas para a nova estrutura
3. **Migrar aprovações pendentes** para a nova tabela
4. **Atualizar triggers** para usar o novo sistema
5. **Deprecar tabelas antigas** gradualmente

#### 6.2 Scripts de Migração
```sql
-- Migrar configurações financeiras
INSERT INTO public.configuracoes_aprovacao_unificada (...)
SELECT ... FROM financeiro.configuracoes_aprovacao;

-- Migrar configurações de compras
INSERT INTO public.configuracoes_aprovacao_unificada (...)
SELECT ... FROM compras.configuracoes_aprovacao;

-- Migrar aprovações pendentes
INSERT INTO public.aprovacoes_unificada (...)
SELECT ... FROM financeiro.aprovacoes WHERE status = 'pendente';
```

### 7. NOVAS FUNCIONALIDADES IMPLEMENTADAS

#### 7.1 Sistema de 3 Status de Aprovação
- **Aprovar**: Aprova e segue para o próximo nível
- **Rejeitar**: Interrompe o fluxo e finaliza a solicitação
- **Cancelar**: Interrompe o fluxo e desabilita qualquer edição futura

#### 7.2 Reset Automático de Aprovações
- **Detecção de Edições**: Triggers detectam alterações em solicitações
- **Reset Completo**: Todas as aprovações voltam para o primeiro nível
- **Histórico**: Registro completo de todas as edições realizadas
- **Prevenção de Edição**: Solicitações canceladas não podem ser editadas

#### 7.3 Transferência de Aprovações
- **Transferência Temporária**: Aprovações podem ser transferidas para outros usuários
- **Motivo Obrigatório**: Justificativa da transferência deve ser informada
- **Histórico de Transferências**: Rastreamento completo de quem transferiu para quem
- **Notificações**: Usuário original e novo aprovador são notificados

#### 7.4 Saídas de Materiais (Não Retiradas)
- **Nova Tabela**: `almoxarifado.solicitacoes_saida_materiais`
- **Funcionário Solicitante**: Campo específico para quem solicita
- **Status de Entrega**: Controle de quando o material foi efetivamente entregue
- **Integração com Estoque**: Movimentação automática do estoque

### 8. VANTAGENS DA SOLUÇÃO

#### 8.1 Flexibilidade
- Critérios opcionais (pode configurar apenas centro de custo, ou apenas departamento, etc.)
- Múltiplos aprovadores por nível
- Diferentes níveis de aprovação por processo

#### 8.2 Unificação
- Interface única para todas as aprovações
- Lógica centralizada de aprovação
- Relatórios consolidados

#### 8.3 Escalabilidade
- Fácil adição de novos tipos de processo
- Sistema de níveis hierárquicos
- Configuração por empresa

#### 8.4 Manutenibilidade
- Código centralizado
- Regras de negócio em funções SQL
- Interface consistente

#### 8.5 Controle e Auditoria
- Histórico completo de edições
- Rastreamento de transferências
- Prevenção de edições indevidas
- Status claros e bem definidos

### 9. CRONOGRAMA DE IMPLEMENTAÇÃO

#### Fase 1: Estrutura Base (1-2 semanas)
- Criar tabelas unificadas
- Implementar funções básicas
- Criar página de configuração

#### Fase 2: Novas Funcionalidades (1-2 semanas)
- Implementar sistema de 3 status
- Criar funcionalidade de transferência
- Implementar reset de aprovações
- Criar tabela de saídas de materiais

#### Fase 3: Integração Financeiro (1 semana)
- Migrar contas a pagar
- Atualizar triggers
- Implementar reset automático
- Testes

#### Fase 4: Integração Compras (1 semana)
- Migrar requisições e cotações
- Atualizar triggers
- Implementar reset automático
- Testes

#### Fase 5: Integração Almoxarifado (1-2 semanas)
- Criar solicitações de saída de materiais
- Migrar transferências
- Atualizar triggers
- Implementar reset automático

#### Fase 6: Portal do Gestor (1-2 semanas)
- Expandir central de aprovações
- Implementar filtros e ações
- Adicionar funcionalidades de transferência
- Implementar histórico de edições

#### Fase 7: Migração e Deprecação (1 semana)
- Migrar dados existentes
- Deprecar tabelas antigas
- Documentação

### 10. CONSIDERAÇÕES ESPECIAIS

#### 10.1 Processos Diferentes
- **Contas a Pagar**: Baseado em valor e características financeiras
- **Requisições**: Baseado em valor e centro de custo
- **Cotações**: Baseado em valor e fornecedor
- **Saídas de Materiais**: Baseado em valor, tipo de material e funcionário
- **Transferências**: Baseado em valor e almoxarifados

#### 10.2 Regras de Negócio
- Aprovação sequencial por níveis
- Possibilidade de aprovação paralela no mesmo nível
- Notificações automáticas
- Histórico completo de aprovações
- **Reset automático** ao editar solicitações
- **Transferência de aprovações** com justificativa
- **3 status claros**: aprovar, rejeitar, cancelar

#### 10.3 Segurança
- RLS (Row Level Security) por empresa
- Permissões por perfil de usuário
- Auditoria completa de mudanças
- **Prevenção de edição** em solicitações canceladas
- **Rastreamento de transferências** com motivo

#### 10.4 Fluxo de Aprovação Atualizado
```
1. SOLICITAÇÃO CRIADA
   └─ Trigger detecta nova solicitação
   └─ Função get_required_approvers() consulta configurações
   └─ Função create_approvals_for_process() cria aprovações

2. APROVAÇÃO PROCESSADA
   └─ Usuário acessa Portal do Gestor
   └─ Visualiza aprovações pendentes na Central
   └─ Pode: Aprovar, Rejeitar ou Cancelar
   └─ Pode: Transferir para outro usuário
   └─ Função process_approval() atualiza status

3. EDIÇÃO DETECTADA
   └─ Trigger detecta alteração na solicitação
   └─ Função reset_approvals_after_edit() reseta aprovações
   └─ Histórico de edição é registrado
   └─ Aprovações voltam para o primeiro nível

4. WORKFLOW COMPLETO
   └─ Verifica se todos os níveis foram aprovados
   └─ Atualiza status da solicitação original
   └─ Envia notificações se necessário
   └─ Bloqueia edições se cancelado
```

## CONCLUSÃO

Esta solução unifica todos os processos de aprovação em um sistema flexível e escalável, mantendo a compatibilidade com os processos existentes e permitindo configurações granulares por tipo de processo. As novas funcionalidades de reset automático, transferência de aprovações e sistema de 3 status oferecem maior controle e flexibilidade, enquanto a interface unificada no Portal do Gestor facilita o gerenciamento. A estrutura modular permite fácil manutenção e expansão, com auditoria completa de todas as operações.
