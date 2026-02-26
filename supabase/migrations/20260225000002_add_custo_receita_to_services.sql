-- Descrição: Adiciona campos de custo e receita na tabela public.services

alter table public.services
  add column if not exists custo numeric(14,2),
  add column if not exists receita numeric(14,2);

comment on column public.services.custo is 'Custo padrão do serviço';
comment on column public.services.receita is 'Receita (preço de venda) padrão do serviço';

