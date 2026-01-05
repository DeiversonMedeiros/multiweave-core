# 📘 Módulo Metalúrgica - Documentação Completa

## 📋 Visão Geral

O módulo de Metalúrgica foi criado para gerenciar todo o processo de produção de uma empresa metalúrgica, desde o planejamento até a entrega do produto final, incluindo controle de qualidade, galvanização e indicadores de performance.

## 🏗️ Estrutura do Módulo

### Schemas e Tabelas Principais

#### 1. **Produtos e Estrutura (BOM)**
- `metalurgica.produtos` - Cadastro de produtos finais, semiacabados, matérias-primas e insumos
- `metalurgica.estrutura_produtos` - Estrutura de produtos (Bill of Materials) - define componentes necessários

#### 2. **Ordens de Produção e Serviço**
- `metalurgica.ordens_producao` - Ordens de Produção (OP) para produtos finais
- `metalurgica.ordens_servico` - Ordens de Serviço (OS) para semiacabados
- `metalurgica.solicitacoes_materiais` - Solicitações automáticas de materiais para produção

#### 3. **Controle de Produção**
- `metalurgica.lotes` - Controle de produção por lotes
- `metalurgica.maquinas` - Cadastro de máquinas e equipamentos
- `metalurgica.paradas_producao` - Registro de paradas de produção

#### 4. **Galvanização**
- `metalurgica.galvanizacoes` - Controle de envio e retorno para galvanização
- `metalurgica.galvanizacao_itens` - Itens (lotes) enviados para galvanização

#### 5. **Controle de Qualidade**
- `metalurgica.inspecoes` - Inspeções de qualidade (inicial, final, galvanizado)
- `metalurgica.certificados_qualidade` - Certificados gerados automaticamente
- `metalurgica.nao_conformidades` - Controle de não conformidades

#### 6. **PCP (Planejamento e Controle de Produção)**
- `metalurgica.planejamento_producao` - Planejamento de produção por período
- `metalurgica.planejamento_itens` - Itens do planejamento

#### 7. **Configurações**
- `metalurgica.tipos_parada` - Tipos de parada de produção

## 🔄 Fluxo Completo de Produção

### 1. **Cadastro Inicial**
1. Cadastrar produtos (finais, semiacabados, matérias-primas)
2. Definir estrutura de produtos (BOM) - componentes necessários
3. Cadastrar máquinas e equipamentos
4. Cadastrar tipos de parada

### 2. **Planejamento (PCP)**
1. Criar planejamento de produção para um período
2. Adicionar itens ao planejamento (produtos e quantidades)
3. Aprovar planejamento

### 3. **Criação de OP/OS**
1. Criar Ordem de Produção (OP) ou Ordem de Serviço (OS)
2. Sistema identifica materiais necessários automaticamente (via BOM)
3. Sistema verifica estoque disponível
4. Se faltar material, cria requisição de compra automaticamente
5. Aprovar OP/OS

### 4. **Reserva de Materiais**
1. Ao aprovar OP/OS, sistema cria solicitações de materiais
2. Sistema reserva materiais no estoque automaticamente
3. Se não houver estoque suficiente, cria requisição de compra

### 5. **Produção**
1. Iniciar produção (mudar status para "em_producao")
2. Registrar lotes de produção
3. Registrar paradas de produção (se necessário)
4. Concluir produção do lote

### 6. **Controle de Qualidade**
1. Realizar inspeção inicial (opcional)
2. Realizar inspeção final
3. Sistema gera certificado de qualidade automaticamente quando inspeção final é aprovada
4. Lote aprovado pode seguir para galvanização

### 7. **Galvanização**
1. Criar registro de galvanização
2. Adicionar lotes a serem galvanizados
3. Enviar para fornecedor externo
4. **Cenário Normal**: Produto retorna para inspeção final e expedição
5. **Cenário Emergência**: Produto entregue direto do fornecedor ao cliente

### 8. **Finalização**
1. Produtos finais retornam ao estoque
2. Podem ser solicitados para uso na operação

## 📊 Indicadores de Performance

### OEE (Overall Equipment Effectiveness)
Calcula disponibilidade, performance e qualidade:
```sql
SELECT * FROM metalurgica.calcular_oee(
    p_maquina_id := 'uuid-da-maquina',
    p_data_inicio := '2025-01-01',
    p_data_fim := '2025-01-31'
);
```

### MTBF (Mean Time Between Failures)
Tempo médio entre falhas:
```sql
SELECT metalurgica.calcular_mtbf(
    p_maquina_id := 'uuid-da-maquina',
    p_data_inicio := '2025-01-01',
    p_data_fim := '2025-01-31'
);
```

### MTTR (Mean Time To Repair)
Tempo médio de reparo:
```sql
SELECT metalurgica.calcular_mttr(
    p_maquina_id := 'uuid-da-maquina',
    p_data_inicio := '2025-01-01',
    p_data_fim := '2025-01-31'
);
```

## 🔧 Funções Principais

### Numeração Automática
- `metalurgica.gerar_numero_op(company_id)` - Gera número de OP (ex: OP-2025-000001)
- `metalurgica.gerar_numero_os(company_id)` - Gera número de OS (ex: OS-2025-000001)
- `metalurgica.gerar_numero_lote(company_id)` - Gera número de lote (ex: LOTE-2025-000001)
- `metalurgica.gerar_numero_certificado(company_id)` - Gera número de certificado (ex: CQ-2025-000001)

### Cálculo de Materiais
- `metalurgica.calcular_materiais_necessarios(produto_id, quantidade)` - Calcula todos os materiais necessários (incluindo componentes de componentes)

## ⚙️ Triggers Automáticos

1. **Criação de Solicitações de Materiais**: Ao aprovar OP/OS, cria automaticamente solicitações de materiais baseadas no BOM
2. **Reserva de Estoque**: Ao atender solicitação de material, reserva automaticamente no estoque
3. **Geração de Certificado**: Ao aprovar inspeção final, gera automaticamente certificado de qualidade
4. **Atualização de Quantidades**: Ao concluir lote, atualiza automaticamente quantidade produzida na OP/OS

## 🔒 Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado, garantindo que usuários só acessem dados de empresas às quais têm permissão.

## 📝 Observações Importantes

### Controle por Peso
- O sistema controla produção por peso (kg)
- Produtos têm `peso_unitario_kg`
- Lotes têm `peso_total_kg`
- Certificados incluem peso total

### Controle de Não Conformidades
- Sistema permite registrar não conformidades
- Suporta segregação em áreas de quarentena
- Permite retrabalho, sucata ou concessão ao cliente

### Paradas de Produção
- Tipos de parada configuráveis
- Algumas paradas afetam OEE, outras não (configurável)
- Registro manual de início e término

### Galvanização
- Suporta dois cenários:
  - **Normal**: Retorna para inspeção e expedição
  - **Emergência**: Entrega direta ao cliente (sem retorno físico)

## 🚀 Próximos Passos

1. Criar interfaces de usuário (frontend) para:
   - Cadastro de produtos e BOM
   - Criação e gestão de OP/OS
   - Controle de produção
   - PCP (Planejamento)
   - Dashboard de indicadores (OEE, MTBF, MTTR)
   - Controle de qualidade
   - Galvanização

2. Integrações:
   - Integração com módulo de compras para requisições automáticas
   - Integração com almoxarifado para movimentações de estoque
   - Geração de PDF para certificados de qualidade

3. Relatórios:
   - Relatório de produção
   - Relatório de indicadores
   - Relatório de não conformidades
   - Relatório de galvanização

## 📚 Referências

- Schema: `metalurgica`
- Todas as funções estão no schema `metalurgica`
- Integração com `almoxarifado` para estoque
- Integração com `compras` para requisições
- Integração com `public.partners` para fornecedores e clientes

