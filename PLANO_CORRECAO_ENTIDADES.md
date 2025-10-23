# 🎯 Plano de Correção de Entidades - Implementação Gradual

## 📋 Estratégia de Implementação

**Objetivo:** Implementar proteção por entidades de forma gradual e segura, testando cada etapa antes de prosseguir.

**Princípio:** "Faça pequeno, teste, valide, continue"

---

## 🚀 Fase 1: Preparação e Validação (1 dia)

### **1.1 Backup e Preparação**
- [ ] Criar backup do banco de dados atual
- [ ] Documentar estado atual das permissões
- [ ] Verificar se todas as entidades estão mapeadas no banco

### **1.2 Teste de Infraestrutura**
- [ ] Testar `RequireEntity` em uma página isolada
- [ ] Validar `PermissionGuard` com `entity=`
- [ ] Verificar `usePermissions` para entidades
- [ ] Confirmar que as funções RPC estão funcionando

### **1.3 Página de Teste**
- [ ] Criar página de teste simples para validar entidades
- [ ] Testar com diferentes perfis de usuário
- [ ] Verificar logs de permissões

---

## 🔧 Fase 2: Páginas de Cadastros Básicas (2 dias)

### **2.1 Dia 1: Usuários e Empresas**

#### **Usuarios.tsx (Prioridade Alta)**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. canCreateModule → canCreateEntity  
3. PermissionGuard module → entity
4. Testar cada mudança individualmente
```

**Checklist:**
- [ ] Backup do arquivo original
- [ ] Mudança 1: RequireModule → RequireEntity
- [ ] Teste: Login com diferentes perfis
- [ ] Mudança 2: canCreateModule → canCreateEntity
- [ ] Teste: Botão "Novo Usuário"
- [ ] Mudança 3: PermissionGuard module → entity
- [ ] Teste: Formulário de criação
- [ ] Validação completa da página

#### **Empresas.tsx (Prioridade Alta)**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. Adicionar PermissionGuard nos botões
3. Implementar canCreateEntity
```

**Checklist:**
- [ ] Backup do arquivo original
- [ ] Mudança 1: RequireModule → RequireEntity
- [ ] Teste: Acesso à página
- [ ] Mudança 2: Adicionar PermissionGuard
- [ ] Teste: Botão "Nova Empresa"
- [ ] Mudança 3: Implementar canCreateEntity
- [ ] Teste: Formulário de criação
- [ ] Validação completa da página

### **2.2 Dia 2: Projetos e Materiais**

#### **Projetos.tsx**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. canCreateModule → canCreateEntity
3. PermissionGuard module → entity
```

#### **Materiais.tsx**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. canCreateModule → canCreateEntity
3. PermissionGuard module → entity
```

**Validação Fase 2:**
- [ ] Todas as 4 páginas funcionando
- [ ] Testes com diferentes perfis
- [ ] Logs de permissões verificados
- [ ] Documentação atualizada

---

## 🔧 Fase 3: Páginas de Cadastros Restantes (1 dia)

### **3.1 Parceiros e Centros de Custo**

#### **Parceiros.tsx**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. Adicionar proteção por entidade
3. Implementar botões protegidos
```

#### **CentrosCusto.tsx**
```typescript
// Mudanças:
1. RequireModule → RequireEntity
2. Adicionar proteção por entidade
3. Implementar botões protegidos
```

**Validação Fase 3:**
- [ ] Todas as 6 páginas de cadastros funcionando
- [ ] Testes completos de permissões
- [ ] Documentação atualizada

---

## 🔧 Fase 4: Páginas RH Básicas (2 dias)

### **4.1 Dia 1: Funcionários e Cargos**

#### **EmployeesPage.tsx (Prioridade Alta)**
```typescript
// Mudanças:
1. RequireModule("rh") → RequireEntity("employees")
2. PermissionButton module → entity
3. Implementar proteção granular
```

#### **PositionsPage.tsx**
```typescript
// Mudanças:
1. RequireModule("rh") → RequireEntity("positions")
2. Implementar proteção por entidade
```

### **4.2 Dia 2: Unidades e Outras Entidades RH**

#### **UnitsPage.tsx**
```typescript
// Mudanças:
1. RequireModule("rh") → RequireEntity("units")
2. Implementar proteção por entidade
```

**Validação Fase 4:**
- [ ] Páginas RH básicas funcionando
- [ ] Testes com perfis diferentes
- [ ] Verificação de granularidade

---

## 🔧 Fase 5: Páginas RH Avançadas (3 dias)

### **5.1 Dia 1: Folha de Pagamento**
- PayrollPage.tsx
- PayrollCalculationPage.tsx
- FgtsConfigPage.tsx

### **5.2 Dia 2: Benefícios e Treinamentos**
- BenefitsPage.tsx
- TrainingPage.tsx
- VacationsPage.tsx

### **5.3 Dia 3: Recrutamento e eSocial**
- RecruitmentPage.tsx
- EsocialPage.tsx
- Outras páginas RH

**Validação Fase 5:**
- [ ] Todas as páginas RH funcionando
- [ ] Testes completos de permissões
- [ ] Verificação de performance

---

## 🔧 Fase 6: Páginas Portal e Almoxarifado (2 dias)

### **6.1 Dia 1: Portal Colaborador**
- Páginas que lidam com entidades específicas
- Implementar proteção granular

### **6.2 Dia 2: Almoxarifado**
- Páginas de estoque e materiais
- Implementar proteção por entidade

**Validação Fase 6:**
- [ ] Todas as páginas funcionando
- [ ] Testes completos
- [ ] Documentação final

---

## 🧪 Estratégia de Testes

### **Teste por Página (Após cada mudança):**
1. **Login com Super Admin** - Deve ter acesso total
2. **Login com Administrador** - Deve ter acesso conforme permissões
3. **Login com Gerente** - Deve ter acesso limitado
4. **Login com Usuário** - Deve ter acesso mínimo
5. **Teste de Botões** - Verificar se aparecem/desaparecem corretamente
6. **Teste de Formulários** - Verificar se abrem/fecham corretamente

### **Teste por Fase (Após cada fase):**
1. **Teste de Integração** - Todas as páginas da fase funcionando
2. **Teste de Performance** - Verificar se não há lentidão
3. **Teste de Logs** - Verificar logs de permissões
4. **Teste de Rollback** - Verificar se pode reverter se necessário

---

## 📊 Critérios de Sucesso

### **Por Página:**
- [ ] RequireEntity implementado
- [ ] PermissionGuard com entity= funcionando
- [ ] usePermissions para entidades funcionando
- [ ] Botões aparecem/desaparecem corretamente
- [ ] Formulários abrem/fecham corretamente
- [ ] Logs de permissões funcionando

### **Por Fase:**
- [ ] Todas as páginas da fase funcionando
- [ ] Testes com diferentes perfis passando
- [ ] Performance mantida
- [ ] Documentação atualizada
- [ ] Backup de segurança criado

---

## 🚨 Plano de Rollback

### **Se algo der errado:**
1. **Imediato:** Reverter arquivo para versão anterior
2. **Banco:** Restaurar backup se necessário
3. **Teste:** Verificar se sistema voltou ao normal
4. **Análise:** Identificar o que causou o problema
5. **Correção:** Ajustar e tentar novamente

### **Checkpoints de Segurança:**
- Backup antes de cada fase
- Teste após cada página
- Validação após cada fase
- Documentação de cada mudança

---

## 📁 Estrutura de Arquivos

### **Backups:**
```
backups/
├── fase-1-backup/
├── fase-2-backup/
├── fase-3-backup/
└── ...
```

### **Testes:**
```
testes/
├── pagina-usuarios-teste.md
├── pagina-empresas-teste.md
└── ...
```

### **Documentação:**
```
docs/
├── PLANO_CORRECAO_ENTIDADES.md
├── RELATORIO_ANALISE_ENTIDADES.md
└── RELATORIO_IMPLEMENTACAO_ENTIDADES.md
```

---

## ⏰ Cronograma Estimado

| Fase | Duração | Páginas | Status |
|------|---------|---------|--------|
| **Fase 1** | 1 dia | Preparação | ⏳ Pendente |
| **Fase 2** | 2 dias | 4 páginas | ⏳ Pendente |
| **Fase 3** | 1 dia | 2 páginas | ⏳ Pendente |
| **Fase 4** | 2 dias | 10 páginas | ⏳ Pendente |
| **Fase 5** | 3 dias | 30 páginas | ⏳ Pendente |
| **Fase 6** | 2 dias | 15 páginas | ⏳ Pendente |
| **Total** | **11 dias** | **71 páginas** | **⏳ Pendente** |

---

## 🎯 Próximo Passo

**Iniciar Fase 1: Preparação e Validação**

1. Criar backup do banco
2. Testar infraestrutura de entidades
3. Criar página de teste
4. Validar funcionamento básico

**Tempo estimado:** 1 dia
**Risco:** Baixo (apenas preparação)
**Benefício:** Base sólida para implementação

---

**Status:** ✅ **PLANO CRIADO** - Pronto para implementação gradual e segura!
