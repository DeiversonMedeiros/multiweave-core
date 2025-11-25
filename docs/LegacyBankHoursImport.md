# Importação de Horas Legadas

## Objetivo
Permitir que empresas que já possuem histórico de banco de horas consolidado migrem seus saldos atuais para o sistema sem depender de registros de ponto prévios.

## Visão Geral
- Nova tabela `rh.bank_hours_legacy_imports` armazena cada lançamento legado e referencia a transação gerada no banco de horas.
- A função `public.adjust_bank_hours_balance` agora aceita a data da transação, permitindo ajustes retroativos.
- Nova função RPC `public.import_legacy_bank_hours` encapsula a importação e garante rastreabilidade.
- Interface adicionada na aba **Legado** de `RH > Banco de Horas`, com formulário guiado e histórico das importações.

## Como usar
1. Acesse `RH → Banco de Horas → Legado`.
2. Preencha:
   - **Colaborador**: lista de funcionários ativos.
   - **Data de referência**: data real do saldo legado.
   - **Quantidade de horas**: positivo (crédito) ou negativo (débito).
   - **Descrição**: motivo ou referência da migração.
3. Clique em **Importar Horas**. O sistema:
   - Cria/garante a configuração de banco de horas do colaborador.
   - Gera uma transação do tipo *adjustment* na data informada.
   - Atualiza o saldo atual.
   - Registra o lançamento em `bank_hours_legacy_imports`.

O histórico das importações fica visível no mesmo painel, com nome do colaborador, data, horas e observação.

## Testes manuais sugeridos
1. **Importação básica**
   - Selecionar colaborador, informar +10 horas, data retroativa.
   - Verificar balanço em `Dashboard` e registro na aba *Legado*.
2. **Importação negativa**
   - Lançar -3 horas para o mesmo colaborador.
   - Confirmar saldo atualizado e registro vermelho no histórico.
3. **Sem configuração prévia**
   - Escolher colaborador recém-criado (sem banco de horas).
   - Importar horas e validar que a configuração/saldo são criados automaticamente.
4. **Auditoria via banco**
   - Consultar `rh.bank_hours_legacy_imports` e `rh.bank_hours_transactions` para garantir vínculos (`transaction_id`).

## Observações
- Todos os acessos seguem arquitetura em camadas (`Pages → Hooks → Services → EntityService/RPC`).
- As funções RPC estão disponíveis somente via `public` schema, evitando consultas diretas a schemas privados.


