# 📋 Implementação: Documentos e Alertas do Módulo Frota

## ✅ Funcionalidades Implementadas

### 1. 📎 Sistema de Anexo de Documentos de Veículos

#### Componente Criado
- **Arquivo**: `src/components/frota/VehicleDocumentsTab.tsx`
- **Funcionalidades**:
  - Upload de documentos (PDF, imagens, Word)
  - Seleção de tipo de documento (CRLV, IPVA, Seguro, Licença, Vistoria)
  - Campo de número do documento
  - **Campo de data de vencimento (incluindo IPVA)**
  - Campo de observações
  - Listagem de documentos com status visual
  - Download de documentos
  - Exclusão de documentos
  - Badges de status (Vencido, Vence em X dias, Válido)

#### Integração
- Integrado ao diálogo de documentos na página de veículos
- Acessível através do botão de documentos (ícone FileText) na tabela de veículos

#### Hooks Criados
- `useDeleteDocument()` - Adicionado em `src/hooks/frota/useFrotaData.ts`

### 2. 🚨 Página de Alertas

#### Página Criada
- **Arquivo**: `src/pages/frota/AlertasPage.tsx`
- **Funcionalidades**:
  - Cards de estatísticas (Total, Críticos, Atenção, Informativos)
  - Filtros avançados:
    - Busca por placa/veículo
    - Filtro por tipo (Documentos, Manutenções, Licenças, Vistorias)
    - Filtro por severidade (Crítico, Atenção, Informativo)
    - Filtro por período (7, 15, 30, 60, 90 dias)
  - Lista de alertas com:
    - Ícones de severidade
    - Badges de tipo e severidade
    - Informações do veículo (placa, marca, modelo)
    - Data de vencimento formatada
    - Contador de dias até vencimento
    - Navegação para páginas relacionadas
  - Design responsivo e moderno
  - Estados vazios informativos

#### Rota Adicionada
- Rota `/frota/alertas` adicionada em `src/pages/frota/FrotaRoutes.tsx`

#### Tipos de Alertas
1. **Documentos Vencendo**
   - Baseado em `useExpiringDocuments`
   - Severidade baseada em dias até vencimento:
     - Crítico: Vencido ou vence em até 7 dias
     - Atenção: Vence em 8-15 dias
     - Informativo: Vence em mais de 15 dias

2. **Manutenções Próximas**
   - Baseado em `useUpcomingMaintenances`
   - Severidade baseada em dias até agendamento:
     - Crítico: Atrasada ou em até 3 dias
     - Atenção: Em 4-7 dias
     - Informativo: Em mais de 7 dias

### 3. 🗄️ Storage e Migrações

#### Migração Criada
- **Arquivo**: `supabase/migrations/20251227000002_create_vehicle_documents_bucket.sql`
- **Conteúdo**:
  - Instruções para criar bucket `vehicle-documents`
  - Políticas RLS para upload, leitura e exclusão
  - Restrições por empresa (multitenancy)

## 📝 Como Usar

### 1. Configurar Storage no Supabase

**IMPORTANTE**: Execute manualmente no Supabase Dashboard:

1. Acesse **Storage** no Supabase Dashboard
2. Clique em **Create bucket**
3. Nome: `vehicle-documents`
4. Marque como **Private** (não público)
5. Habilite **RLS** (Row Level Security)
6. Execute a migração `20251227000002_create_vehicle_documents_bucket.sql` para criar as políticas RLS

### 2. Acessar Documentos de um Veículo

1. Vá para a página **Frota > Veículos**
2. Clique no botão de **documentos** (ícone FileText) na linha do veículo
3. No diálogo que abrir:
   - Preencha o tipo de documento
   - Adicione número do documento (opcional)
   - **Selecione a data de vencimento (obrigatório para IPVA)**
   - Faça upload do arquivo
   - Adicione observações (opcional)

### 3. Acessar Página de Alertas

1. Vá para **Frota > Alertas** no menu
2. Use os filtros para encontrar alertas específicos
3. Clique em um alerta para navegar para a página relacionada

## 🎨 Características Visuais

### Componente de Documentos
- Cards organizados
- Badges coloridos por status
- Ícones intuitivos
- Feedback visual durante upload
- Validação de tipos e tamanhos de arquivo

### Página de Alertas
- Cards de estatísticas no topo
- Filtros em card separado
- Alertas em cards clicáveis
- Cores por severidade:
  - 🔴 Vermelho: Crítico
  - 🟡 Amarelo: Atenção
  - 🔵 Azul: Informativo
- Ícones por tipo de alerta
- Informações completas do veículo

## 🔧 Estrutura de Arquivos

```
src/
├── components/
│   └── frota/
│       └── VehicleDocumentsTab.tsx (NOVO)
├── pages/
│   └── frota/
│       ├── AlertasPage.tsx (NOVO)
│       ├── FrotaRoutes.tsx (ATUALIZADO)
│       └── VeiculosPage.tsx (ATUALIZADO)
├── hooks/
│   └── frota/
│       └── useFrotaData.ts (ATUALIZADO - adicionado useDeleteDocument)
└── types/
    └── frota.ts (já existia - tipos utilizados)

supabase/
└── migrations/
    └── 20251227000002_create_vehicle_documents_bucket.sql (NOVO)
```

## ⚠️ Observações Importantes

1. **Bucket Storage**: O bucket `vehicle-documents` precisa ser criado manualmente no Supabase Dashboard antes de usar a funcionalidade de upload.

2. **Campo de Vencimento de IPVA**: O campo de vencimento já existia na tabela `vehicle_documents` e agora está disponível no formulário. É especialmente importante para IPVA.

3. **Hooks Existentes**: A página de alertas utiliza hooks já existentes:
   - `useExpiringDocuments()` - para documentos vencendo
   - `useUpcomingMaintenances()` - para manutenções próximas

4. **Navegação**: Ao clicar em um alerta, o usuário é redirecionado para a página relacionada (veículos ou manutenções) com o estado necessário para filtrar.

## 🚀 Próximos Passos (Opcional)

- [ ] Adicionar notificações push para alertas críticos
- [ ] Implementar ações rápidas nos alertas (marcar como resolvido, adiar)
- [ ] Adicionar exportação de relatório de alertas
- [ ] Implementar alertas de licenças de condutores
- [ ] Adicionar alertas de vistorias pendentes

