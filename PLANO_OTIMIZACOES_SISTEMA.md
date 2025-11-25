# 📊 Plano de Otimizações - MultiWeave Core

## Resumo Executivo

Este documento apresenta um plano detalhado para implementar otimizações de performance, reduzindo consumo de banda, carga no banco de dados e custos de hospedagem. As otimizações são baseadas em técnicas comprovadas e adaptadas para a arquitetura atual do sistema.

---

## 📋 Análise do Estado Atual

### ✅ Já Implementado
- React Query configurado (mas com `staleTime` inconsistente)
- Code splitting básico no `vite.config.ts`
- 1 view materializada: `periodic_exams_mv`
- Alguns índices criados (mas não otimizados)
- Função RPC `get_entity_data` para consultas genéricas
- Sistema de exportação CSV básico

### ❌ Oportunidades de Melhoria
- Views materializadas para dashboards e estatísticas
- Cache do React Query não otimizado (muitos com `staleTime: 0`)
- Paginação ainda usando offset (não cursor-based)
- Exportações CSV sem otimização (carregam todos os dados)
- Sem compressão de imagens no upload
- Sem lazy loading de imagens
- Sem debounce em buscas
- Índices não otimizados para consultas frequentes
- Sem funções RPC para agregações pesadas
- Sem Web Workers para processamento pesado

---

## 🎯 Fases de Implementação

### **FASE 1: Otimizações de Banco de Dados** ⭐⭐⭐⭐⭐
**Prioridade: ALTA | Impacto: MUITO ALTO | Esforço: MÉDIO**

#### 1.1 Views Materializadas para Dashboards

**Objetivo:** Pré-calcular estatísticas e reduzir processamento em tempo real.

**Views a Criar:**

1. **`dashboard_stats_mv`** - Estatísticas gerais do sistema
   - Total de funcionários por status
   - Total de registros de ponto por mês
   - Total de treinamentos ativos
   - Total de veículos por status
   - Total de estoque (valor e quantidade)

2. **`rh_dashboard_stats_mv`** - Estatísticas do módulo RH
   - Funcionários por departamento
   - Registros de ponto por status
   - Treinamentos por status
   - Exames periódicos vencidos/próximos
   - Ações disciplinares por tipo

3. **`frota_dashboard_stats_mv`** - Estatísticas do módulo Frota
   - Veículos por status
   - Manutenções agendadas
   - Incidentes por tipo
   - Custo total de manutenção por período

4. **`almoxarifado_dashboard_stats_mv`** - Estatísticas de Almoxarifado
   - Estoque atual (valor total, quantidade)
   - Itens em ruptura
   - Movimentações por período
   - Entradas/saídas por mês

5. **`financial_dashboard_stats_mv`** - Estatísticas Financeiras
   - Contas a pagar/receber por status
   - Fluxo de caixa por período
   - Total de lançamentos contábeis

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_dashboard_materialized_views.sql`

**Função de Refresh:**
```sql
CREATE OR REPLACE FUNCTION refresh_all_statistics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY rh_dashboard_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY frota_dashboard_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY almoxarifado_dashboard_stats_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY financial_dashboard_stats_mv;
END;
$$ LANGUAGE plpgsql;
```

**Trigger Automático:**
- Criar triggers que atualizam views após INSERT/UPDATE/DELETE em tabelas relevantes
- OU configurar job agendado (pg_cron) para refresh diário às 2h

**Arquivos Afetados:**
- `src/hooks/rh/useReports.ts` - Usar view em vez de calcular
- `src/hooks/frota/useFrotaData.ts` - Usar view para dashboard
- `src/services/portal-gestor/gestorDashboardService.ts` - Usar views
- `src/pages/Dashboard.tsx` - Usar views materializadas

---

#### 1.2 Índices Otimizados

**Objetivo:** Acelerar consultas frequentes identificadas no sistema.

**Índices a Criar:**

1. **Tabela `rh.employees`:**
   ```sql
   -- Índice composto para ordenação por data de criação
   CREATE INDEX idx_employees_created_at_id ON rh.employees(created_at DESC, id DESC);
   
   -- Índice parcial para funcionários ativos
   CREATE INDEX idx_employees_active ON rh.employees(company_id, status) 
   WHERE status = 'ativo';
   
   -- Índice para busca por matrícula/CPF
   CREATE INDEX idx_employees_search ON rh.employees(company_id, matricula, cpf);
   ```

2. **Tabela `rh.time_records`:**
   ```sql
   -- Índice composto para consultas por funcionário e data
   CREATE INDEX idx_time_records_employee_date ON rh.time_records(employee_id, data DESC, id DESC);
   
   -- Índice para status e data
   CREATE INDEX idx_time_records_status_date ON rh.time_records(company_id, status, data DESC);
   ```

3. **Tabela `frota.vehicles`:**
   ```sql
   -- Índice composto para ordenação
   CREATE INDEX idx_vehicles_created_at_id ON frota.vehicles(created_at DESC, id DESC);
   
   -- Índice parcial para veículos ativos
   CREATE INDEX idx_vehicles_active ON frota.vehicles(company_id, situacao) 
   WHERE situacao = 'ativo';
   ```

4. **Tabela `almoxarifado.estoque_atual`:**
   ```sql
   -- Índice composto para consultas por almoxarifado
   CREATE INDEX idx_estoque_almoxarifado ON almoxarifado.estoque_atual(almoxarifado_id, material_equipamento_id);
   
   -- Índice para itens em ruptura
   CREATE INDEX idx_estoque_ruptura ON almoxarifado.estoque_atual(company_id, quantidade) 
   WHERE quantidade <= 0;
   ```

5. **Tabelas com campos JSONB:**
   ```sql
   -- Índices GIN para campos JSONB (se houver)
   CREATE INDEX idx_reports_form_data_gin ON reports USING GIN (form_data);
   CREATE INDEX idx_reports_checklist_data_gin ON reports USING GIN (checklist_data);
   ```

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_optimized_indexes.sql`

---

#### 1.3 Funções RPC para Agregações

**Objetivo:** Processar agregações no servidor e reduzir transferência de dados.

**Funções a Criar:**

1. **`get_rh_dashboard_stats()`** - Estatísticas do RH
   ```sql
   CREATE OR REPLACE FUNCTION rh.get_rh_dashboard_stats(
     p_company_id UUID,
     p_start_date DATE DEFAULT NULL,
     p_end_date DATE DEFAULT NULL
   )
   RETURNS TABLE (
     total_employees BIGINT,
     active_employees BIGINT,
     total_time_records BIGINT,
     pending_time_records BIGINT,
     total_trainings BIGINT,
     active_trainings BIGINT
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT 
       COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL) as total_employees,
       COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ativo') as active_employees,
       COUNT(tr.id) FILTER (WHERE tr.id IS NOT NULL) as total_time_records,
       COUNT(tr.id) FILTER (WHERE tr.status = 'pendente') as pending_time_records,
       COUNT(t.id) FILTER (WHERE t.id IS NOT NULL) as total_trainings,
       COUNT(t.id) FILTER (WHERE t.is_active = true) as active_trainings
     FROM rh.employees e
     LEFT JOIN rh.time_records tr ON tr.employee_id = e.id
       AND (p_start_date IS NULL OR tr.data >= p_start_date)
       AND (p_end_date IS NULL OR tr.data <= p_end_date)
     LEFT JOIN rh.trainings t ON t.company_id = e.company_id
     WHERE e.company_id = p_company_id;
   END;
   $$ LANGUAGE plpgsql STABLE;
   ```

2. **`get_frota_dashboard_stats()`** - Estatísticas da Frota
3. **`get_almoxarifado_dashboard_stats()`** - Estatísticas de Almoxarifado
4. **`get_time_records_for_export()`** - Registros de ponto otimizados para exportação
5. **`get_employees_for_export()`** - Funcionários otimizados para exportação

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_create_optimized_rpc_functions.sql`

**Uso no Frontend:**
- Substituir múltiplas queries por uma única chamada RPC
- Reduzir de 5-10 queries para 1 query

---

### **FASE 2: Otimizações de Cache (React Query)** ⭐⭐⭐⭐
**Prioridade: ALTA | Impacto: ALTO | Esforço: BAIXO**

#### 2.1 Padronização de Cache

**Problema Atual:**
- Muitos hooks com `staleTime: 0` ou `cacheTime: 0`
- Cache inconsistente entre módulos
- Refetch desnecessário

**Solução:**

1. **Criar configuração centralizada:**
   ```typescript
   // src/lib/react-query-config.ts
   export const queryConfig = {
     // Dados dinâmicos (atualizam frequentemente)
     dynamic: {
       staleTime: 2 * 60 * 1000,      // 2 minutos
       gcTime: 5 * 60 * 1000,         // 5 minutos
       refetchOnWindowFocus: false,
       refetchOnMount: false,
     },
     
     // Dados semi-estáticos (atualizam ocasionalmente)
     semiStatic: {
       staleTime: 5 * 60 * 1000,      // 5 minutos
       gcTime: 10 * 60 * 1000,         // 10 minutos
       refetchOnWindowFocus: false,
     },
     
     // Dados estáticos (raramente mudam)
     static: {
       staleTime: 60 * 60 * 1000,      // 1 hora
       gcTime: 24 * 60 * 60 * 1000,     // 24 horas
       refetchOnWindowFocus: false,
       refetchOnMount: false,
     },
     
     // Dashboard (atualiza periodicamente)
     dashboard: {
       staleTime: 1 * 60 * 1000,       // 1 minuto
       gcTime: 5 * 60 * 1000,          // 5 minutos
       refetchInterval: 5 * 60 * 1000, // 5 minutos
     }
   };
   ```

2. **Atualizar hooks existentes:**
   - `src/hooks/generic/useEntityData.ts` - Usar `semiStatic`
   - `src/hooks/rh/usePeriodicExams.ts` - Usar `semiStatic` (remover `staleTime: 0`)
   - `src/hooks/rh/useEmployees.ts` - Usar `semiStatic`
   - `src/hooks/frota/useFrotaData.ts` - Usar `semiStatic`
   - `src/hooks/useProjects.ts` - Usar `static`
   - `src/hooks/useCostCenters.ts` - Usar `static`

**Arquivos a Modificar:**
- Todos os hooks em `src/hooks/**/*.ts`
- Aplicar configuração apropriada conforme tipo de dado

---

#### 2.2 Pré-carregamento de Dados Estáticos

**Objetivo:** Carregar dados estáticos uma vez e filtrar no cliente.

**Implementar:**

1. **Hook para dados estáticos:**
   ```typescript
   // src/hooks/useStaticData.ts
   export function useStaticData<T>(
     queryKey: string[],
     queryFn: () => Promise<T[]>,
     filterFn?: (item: T) => boolean
   ) {
     const { data: allData = [] } = useQuery({
       queryKey,
       queryFn,
       ...queryConfig.static,
     });
     
     const filteredData = useMemo(() => {
       if (!filterFn) return allData;
       return allData.filter(filterFn);
     }, [allData, filterFn]);
     
     return filteredData;
   }
   ```

2. **Aplicar em:**
   - Centros de custo (filtrar por empresa no cliente)
   - Projetos (filtrar por empresa no cliente)
   - Parceiros (filtrar por tipo no cliente)
   - Perfis (dados estáticos)

**Arquivos a Criar/Modificar:**
- `src/hooks/useStaticData.ts` (novo)
- `src/hooks/useCostCenters.ts` - Usar `useStaticData`
- `src/hooks/useProjects.ts` - Usar `useStaticData`

---

### **FASE 3: Otimizações de Paginação** ⭐⭐⭐⭐
**Prioridade: MÉDIA | Impacto: ALTO | Esforço: MÉDIO**

#### 3.1 Paginação Baseada em Cursor

**Problema Atual:**
- Paginação usando `offset` (lenta para grandes volumes)
- Função `get_entity_data` usa offset

**Solução:**

1. **Criar função RPC com cursor:**
   ```sql
   CREATE OR REPLACE FUNCTION get_entity_data_cursor(
     schema_name TEXT,
     table_name TEXT,
     company_id_param UUID,
     last_id UUID DEFAULT NULL,
     limit_param INTEGER DEFAULT 50,
     order_by TEXT DEFAULT 'created_at',
     order_direction TEXT DEFAULT 'DESC'
   )
   RETURNS TABLE (
     id UUID,
     data JSONB,
     total_count BIGINT
   ) AS $$
   -- Implementação com cursor
   $$;
   ```

2. **Hook para paginação cursor-based:**
   ```typescript
   // src/hooks/useCursorPagination.ts
   export function useCursorPagination<T>(params: {
     queryKey: string[];
     queryFn: (cursor?: string) => Promise<{ data: T[]; nextCursor?: string }>;
     pageSize?: number;
   }) {
     // Implementação
   }
   ```

3. **Aplicar em:**
   - Listagem de funcionários
   - Registros de ponto
   - Veículos
   - Estoque
   - Qualquer lista com > 1000 registros

**Arquivos a Criar/Modificar:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_cursor_pagination_function.sql`
- `src/hooks/useCursorPagination.ts` (novo)
- `src/hooks/rh/useEmployees.ts` - Adicionar opção cursor-based
- `src/hooks/rh/useTimeRecords.ts` - Adicionar opção cursor-based

---

#### 3.2 Lazy Loading de Dados

**Objetivo:** Carregar dados completos apenas quando necessário.

**Implementar:**

1. **Hook para lazy loading:**
   ```typescript
   // src/hooks/useLazyEntityData.ts
   export function useLazyEntityData<T>() {
     const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
     
     const loadData = async (id: string) => {
       if (loadedIds.has(id)) return;
       // Carregar dados
       setLoadedIds(prev => new Set(prev).add(id));
     };
     
     return { loadData, isLoaded: (id: string) => loadedIds.has(id) };
   }
   ```

2. **Aplicar em:**
   - Detalhes de funcionários (carregar apenas quando expandir)
   - Histórico de registros de ponto (carregar por demanda)
   - Detalhes de veículos
   - Itens de estoque (carregar detalhes sob demanda)

**Arquivos a Criar:**
- `src/hooks/useLazyEntityData.ts` (novo)

---

### **FASE 4: Otimizações de Exportação** ⭐⭐⭐⭐⭐
**Prioridade: ALTA | Impacto: MUITO ALTO | Esforço: MÉDIO**

#### 4.1 Exportação Otimizada com Seleção Seletiva

**Problema Atual:**
- Exportações carregam todos os campos (incluindo JSONB grandes)
- Timeout em exportações grandes
- Processamento bloqueia UI

**Solução:**

1. **Função RPC para exportação:**
   ```sql
   CREATE OR REPLACE FUNCTION get_employees_for_export(
     p_company_id UUID,
     p_start_date DATE DEFAULT NULL,
     p_end_date DATE DEFAULT NULL
   )
   RETURNS TABLE (
     id UUID,
     matricula TEXT,
     nome TEXT,
     cpf TEXT,
     email TEXT,
     cargo TEXT,
     departamento TEXT,
     status TEXT,
     data_admissao DATE
     -- Apenas campos essenciais, SEM JSONB
   ) AS $$
   -- Implementação
   $$;
   ```

2. **Exportação em lotes (cursor-based):**
   ```typescript
   // src/services/export/optimizedExportService.ts
   export async function exportEmployeesOptimized(
     companyId: string,
     onProgress?: (progress: number) => void
   ) {
     let lastId: string | null = null;
     const BATCH_SIZE = 500;
     const allData: any[] = [];
     
     while (true) {
       const { data, nextCursor } = await fetchBatch(lastId, BATCH_SIZE);
       if (!data || data.length === 0) break;
       
       allData.push(...data);
       lastId = nextCursor;
       
       onProgress?.(allData.length);
       
       // Pequeno delay para não sobrecarregar
       await new Promise(resolve => setTimeout(resolve, 100));
     }
     
     return generateCSV(allData);
   }
   ```

**Arquivos a Criar/Modificar:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_export_functions.sql`
- `src/services/export/optimizedExportService.ts` (novo)
- `src/components/rh/EnhancedDataTable.tsx` - Usar exportação otimizada
- `src/hooks/rh/useReports.ts` - Atualizar `useReportExport`

---

#### 4.2 Web Workers para Processamento

**Objetivo:** Processar CSV em background sem bloquear UI.

**Implementar:**

1. **Worker para processamento CSV:**
   ```typescript
   // src/workers/csvExport.worker.ts
   self.onmessage = (event) => {
     const { type, data } = event.data;
     
     if (type === 'PROCESS_CSV') {
       const csv = generateCSV(data);
       self.postMessage({ type: 'CSV_READY', csv });
     }
   };
   ```

2. **Serviço que usa worker:**
   ```typescript
   // src/services/export/csvWorkerService.ts
   export function exportWithWorker(data: any[], filename: string) {
     const worker = new Worker(
       new URL('@/workers/csvExport.worker.ts', import.meta.url),
       { type: 'module' }
     );
     
     worker.postMessage({ type: 'PROCESS_CSV', data });
     worker.onmessage = (event) => {
       if (event.data.type === 'CSV_READY') {
         downloadCSV(event.data.csv, filename);
         worker.terminate();
       }
     };
   }
   ```

**Arquivos a Criar:**
- `src/workers/csvExport.worker.ts` (novo)
- `src/services/export/csvWorkerService.ts` (novo)

---

### **FASE 5: Otimizações de Imagens** ⭐⭐⭐
**Prioridade: MÉDIA | Impacto: MÉDIO | Esforço: BAIXO**

#### 5.1 Compressão de Imagens no Upload

**Implementar:**

1. **Serviço de compressão:**
   ```typescript
   // src/lib/imageOptimization.ts
   export async function compressImage(
     file: File,
     options: {
       maxWidth?: number;
       maxHeight?: number;
       quality?: number;
     } = {}
   ): Promise<File> {
     // Implementação usando Canvas API
   }
   ```

2. **Aplicar em:**
   - Upload de fotos de funcionários
   - Upload de fotos de veículos
   - Upload de anexos em registros de ponto
   - Upload de documentos

**Arquivos a Criar/Modificar:**
- `src/lib/imageOptimization.ts` (novo)
- `src/hooks/useImageUpload.ts` - Adicionar compressão
- `src/services/cameraService.ts` - Adicionar compressão

---

#### 5.2 Lazy Loading de Imagens

**Implementar:**

1. **Componente LazyImage:**
   ```typescript
   // src/components/ui/LazyImage.tsx
   export function LazyImage({ src, alt, className }: LazyImageProps) {
     const [isInView, setIsInView] = useState(false);
     const imgRef = useRef<HTMLImageElement>(null);
     
     useEffect(() => {
       const observer = new IntersectionObserver(
         ([entry]) => {
           if (entry.isIntersecting) {
             setIsInView(true);
             observer.disconnect();
           }
         },
         { rootMargin: '50px' }
       );
       
       if (imgRef.current) observer.observe(imgRef.current);
       return () => observer.disconnect();
     }, []);
     
     return (
       <img
         ref={imgRef}
         src={isInView ? src : undefined}
         alt={alt}
         className={className}
         loading="lazy"
       />
     );
   }
   ```

2. **Aplicar em:**
   - Galeria de fotos de funcionários
   - Fotos de veículos
   - Anexos em listagens

**Arquivos a Criar:**
- `src/components/ui/LazyImage.tsx` (novo)

---

### **FASE 6: Otimizações de Build e Assets** ⭐⭐
**Prioridade: BAIXA | Impacto: BAIXO | Esforço: BAIXO**

#### 6.1 Code Splitting Otimizado

**Modificar `vite.config.ts`:**
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-select',
          '@radix-ui/react-tabs'
        ],
        'charts': ['recharts'],
        'query': ['@tanstack/react-query'],
        'utils': ['date-fns', 'lodash'],
        'rh-module': [
          './src/pages/rh/**',
          './src/hooks/rh/**',
          './src/services/rh/**'
        ],
        'frota-module': [
          './src/pages/frota/**',
          './src/hooks/frota/**'
        ],
        'almoxarifado-module': [
          './src/pages/almoxarifado/**',
          './src/hooks/almoxarifado/**'
        ]
      }
    }
  },
  chunkSizeWarningLimit: 1000,
  assetsInlineLimit: 4096
}
```

---

#### 6.2 Debounce em Buscas

**Implementar:**

1. **Hook useDebounce:**
   ```typescript
   // src/hooks/useDebounce.ts
   export function useDebounce<T>(value: T, delay: number): T {
     const [debouncedValue, setDebouncedValue] = useState<T>(value);
     
     useEffect(() => {
       const handler = setTimeout(() => {
         setDebouncedValue(value);
       }, delay);
       
       return () => clearTimeout(handler);
     }, [value, delay]);
     
     return debouncedValue;
   }
   ```

2. **Aplicar em:**
   - Busca de funcionários
   - Busca de veículos
   - Busca de materiais
   - Qualquer campo de busca

**Arquivos a Criar/Modificar:**
- `src/hooks/useDebounce.ts` (novo)
- Componentes com busca - Adicionar debounce

---

## 📅 Cronograma de Implementação

### Semana 1-2: FASE 1 (Banco de Dados)
- [ ] Criar views materializadas
- [ ] Criar função de refresh
- [ ] Criar índices otimizados
- [ ] Criar funções RPC para agregações
- [ ] Testar performance

### Semana 3: FASE 2 (Cache)
- [ ] Criar configuração centralizada
- [ ] Atualizar todos os hooks
- [ ] Implementar pré-carregamento de dados estáticos
- [ ] Testar cache

### Semana 4: FASE 3 (Paginação)
- [ ] Implementar paginação cursor-based
- [ ] Criar hook de lazy loading
- [ ] Aplicar em listagens principais
- [ ] Testar performance

### Semana 5: FASE 4 (Exportação)
- [ ] Criar funções RPC para exportação
- [ ] Implementar exportação otimizada
- [ ] Criar Web Worker
- [ ] Aplicar em todas as exportações
- [ ] Testar com grandes volumes

### Semana 6: FASE 5-6 (Imagens e Build)
- [ ] Implementar compressão de imagens
- [ ] Criar componente LazyImage
- [ ] Otimizar code splitting
- [ ] Implementar debounce
- [ ] Testes finais

---

## 📊 Métricas de Sucesso

### Antes vs Depois (Estimativas)

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tempo de carregamento do Dashboard** | 3-5s | 0.5-1s | 70-80% |
| **Queries por página** | 10-15 | 2-3 | 70-80% |
| **Tamanho de exportação CSV** | 50-100MB | 5-10MB | 80-90% |
| **Tempo de exportação** | 30-60s | 5-10s | 80-85% |
| **Uso de banda (mês)** | 100GB | 20-30GB | 70-80% |
| **Carga no banco** | Alta | Baixa | 60-70% |
| **Cache hit rate** | 20-30% | 70-80% | 50-60% |

---

## 🔧 Métodos para Contornar Falhas

### 1. View Materializada Desatualizada
```sql
-- Atualizar manualmente
REFRESH MATERIALIZED VIEW CONCURRENTLY nome_da_view;
```

### 2. Cache Desatualizado
```typescript
// Invalidar cache
queryClient.invalidateQueries(['query-key']);

// Forçar refetch
queryClient.refetchQueries(['query-key']);
```

### 3. Exportação com Timeout
- Reduzir `BATCH_SIZE` de 500 para 100
- Usar cursor-based pagination
- Processar em worker em background

### 4. Performance de Índices
```sql
-- Reindexar
REINDEX INDEX nome_do_indice;

-- Verificar uso
EXPLAIN ANALYZE SELECT ...;
```

---

## ✅ Checklist de Implementação

### Banco de Dados
- [ ] Criar 5 views materializadas
- [ ] Criar função `refresh_all_statistics_views()`
- [ ] Configurar trigger ou job agendado
- [ ] Criar 15+ índices otimizados
- [ ] Criar 5+ funções RPC para agregações
- [ ] Testar performance com EXPLAIN ANALYZE

### Frontend - Cache
- [ ] Criar `src/lib/react-query-config.ts`
- [ ] Atualizar 20+ hooks com cache apropriado
- [ ] Implementar `useStaticData` hook
- [ ] Aplicar em centros de custo, projetos, parceiros

### Frontend - Paginação
- [ ] Criar função RPC `get_entity_data_cursor`
- [ ] Criar hook `useCursorPagination`
- [ ] Aplicar em 5+ listagens principais
- [ ] Criar hook `useLazyEntityData`

### Frontend - Exportação
- [ ] Criar funções RPC para exportação
- [ ] Criar `optimizedExportService`
- [ ] Criar Web Worker `csvExport.worker.ts`
- [ ] Aplicar em todas as exportações CSV

### Frontend - Imagens
- [ ] Criar `imageOptimization.ts`
- [ ] Aplicar compressão em uploads
- [ ] Criar componente `LazyImage`
- [ ] Aplicar lazy loading em galerias

### Build
- [ ] Otimizar `vite.config.ts` com code splitting
- [ ] Criar hook `useDebounce`
- [ ] Aplicar debounce em buscas

---

## 🎯 Priorização por Impacto

1. **CRÍTICO (Fazer Primeiro):**
   - Views materializadas para dashboards
   - Funções RPC para agregações
   - Exportação otimizada
   - Cache do React Query

2. **IMPORTANTE (Fazer em Seguida):**
   - Índices otimizados
   - Paginação cursor-based
   - Web Workers para exportação

3. **DESEJÁVEL (Fazer Depois):**
   - Compressão de imagens
   - Lazy loading de imagens
   - Code splitting otimizado
   - Debounce em buscas

---

## 📝 Notas de Implementação

- Todas as otimizações devem manter compatibilidade com sistema atual
- Implementar feature flags para ativar/desativar otimizações
- Monitorar performance após cada fase
- Documentar mudanças em CHANGELOG
- Testar em ambiente de staging antes de produção

---

**Documento criado em:** 2025-11-08  
**Versão:** 1.0  
**Autor:** Sistema de Otimizações MultiWeave Core

