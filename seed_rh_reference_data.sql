-- =====================================================
-- SEED DE DADOS DE REFERÊNCIA RH (idempotente por empresa)
-- - Rubricas padrão
-- - Faixas INSS (Jan/2024)
-- - Faixas IRRF (exemplo base; só insere se não houver dados atuais)
-- - Tipos de Afastamento
-- - Motivos de Atraso/Falta
-- - Códigos CID (subset comum)
-- - Tipos de Deficiência (LBI)
--
-- Observações:
-- - O seed é idempotente: usa WHERE NOT EXISTS/ON CONFLICT para evitar duplicatas
-- - Escopo por empresa: cria para todas as empresas ativas em public.companies
-- - Ajuste os valores de IRRF conforme legislação vigente, se já não houver dados
-- =====================================================

BEGIN;

-- ---------------------------------------------
-- Contexto de empresas
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
)

-- ---------------------------------------------
-- Rubricas padrão
-- ---------------------------------------------
-- Tabela: rh.rubricas (unique por (codigo, company_id) se existir)
INSERT INTO rh.rubricas (
  company_id, codigo, nome, descricao, tipo, categoria, natureza,
  calculo_automatico, formula_calculo, valor_fixo, percentual,
  base_calculo, incidencia_ir, incidencia_inss, incidencia_fgts,
  incidencia_contribuicao_sindical, ordem_exibicao, obrigatorio, ativo
)
SELECT e.company_id, v.codigo, v.nome, v.descricao, v.tipo, v.categoria, v.natureza,
       v.calculo_automatico::boolean, v.formula_calculo,
       CASE WHEN v.valor_fixo IS NULL THEN NULL ELSE (v.valor_fixo::numeric(12,2)) END AS valor_fixo,
       CASE WHEN v.percentual IS NULL THEN NULL ELSE (v.percentual::numeric(5,4)) END AS percentual,
       v.base_calculo,
       v.incidencia_ir::boolean, v.incidencia_inss::boolean, v.incidencia_fgts::boolean,
       v.incidencia_contribuicao_sindical::boolean, v.ordem_exibicao::int, v.obrigatorio::boolean, v.ativo::boolean
FROM empresas e
CROSS JOIN (
  VALUES
    ('SALARIO_BASE','Salário Base','Remuneração base mensal','provento','vencimentos','fixo', true, NULL, NULL, NULL,'salario_base', false, true, true, false, 1, true, true),
    ('HORA_EXTRA_50','Hora Extra 50%','Horas extras com adicional de 50%','provento','extras','variavel', false, NULL, NULL, 0.50,'salario_base', true, true, true, false, 10, false, true),
    ('HORA_EXTRA_100','Hora Extra 100%','Horas extras com adicional de 100%','provento','extras','variavel', false, NULL, NULL, 1.00,'salario_base', true, true, true, false, 11, false, true),
    ('ADIC_NOTURNO','Adicional Noturno','Adicional noturno (20%)','provento','adicionais','variavel', false, NULL, NULL, 0.20,'salario_base', true, true, true, false, 12, false, true),
    ('INSALUBRIDADE','Adicional Insalubridade','Percentual conforme laudo','provento','adicionais','variavel', false, NULL, NULL, NULL,'salario_base', true, true, true, false, 13, false, true),
    ('PERICULOSIDADE','Adicional Periculosidade','30% do salário base','provento','adicionais','variavel', false, NULL, NULL, 0.30,'salario_base', true, true, true, false, 14, false, true),
    ('DSR','Descanso Semanal Remunerado','Reflexo de horas extras','provento','reflexos','variavel', false, NULL, NULL, NULL,'salario_base', true, true, true, false, 20, false, true),

    ('DESC_VALE_TRANSP','Vale-Transporte','Desconto VT até 6%','desconto','beneficios','variavel', false, NULL, NULL, 0.06,'salario_base', false, false, false, false, 30, false, true),
    ('DESC_ADIANTAMENTO','Adiantamento Salarial','Adiantamento do mês','desconto','adiantamentos','variavel', false, NULL, NULL, NULL,'salario_base', false, false, false, false, 31, false, true),
    ('DESC_FALTAS_ATRASOS','Faltas e Atrasos','Desconto por ausência/atraso','desconto','faltas','variavel', false, NULL, NULL, NULL,'salario_base', false, false, false, false, 32, false, true),
    ('INSS_EMPREGADO','INSS Empregado','Contribuição previdenciária do empregado','desconto','encargos','variavel', true, 'INSS', NULL, NULL,'salario_base', false, false, false, false, 40, true, true),
    ('IRRF','IRRF','Imposto de Renda Retido na Fonte','desconto','impostos','variavel', true, 'IRRF', NULL, NULL,'salario_base', false, false, false, false, 41, true, true),

    ('FGTS','FGTS','Depósito de 8% (empresa)','informacao','encargos','variavel', true, 'FGTS', NULL, 0.08,'salario_base', false, false, true, false, 50, true, true)
) AS v(codigo,nome,descricao,tipo,categoria,natureza,calculo_automatico,formula_calculo,valor_fixo,percentual,base_calculo,incidencia_ir,incidencia_inss,incidencia_fgts,incidencia_contribuicao_sindical,ordem_exibicao,obrigatorio,ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM rh.rubricas r
  WHERE r.company_id = e.company_id AND r.codigo = v.codigo
);

-- ---------------------------------------------
-- INSS Brackets (Jan/2024) – só se não houver ativos no período
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('INSS_FAIXA_1','1ª Faixa - Até R$ 1.412,00',2024,1,  0.00, 1412.00, 0.075,  0.00, true),
      ('INSS_FAIXA_2','2ª Faixa - De R$ 1.412,01 até R$ 2.666,68',2024,1, 1412.01, 2666.68, 0.090, 21.18, true),
      ('INSS_FAIXA_3','3ª Faixa - De R$ 2.666,69 até R$ 4.000,03',2024,1, 2666.69, 4000.03, 0.120,101.18, true),
      ('INSS_FAIXA_4','4ª Faixa - De R$ 4.000,04 até R$ 7.786,02',2024,1, 4000.04, 7786.02, 0.140,181.18, true)
  ) AS t(codigo,descricao,ano_vigencia,mes_vigencia,valor_minimo,valor_maximo,aliquota,valor_deducao,ativo)
)
INSERT INTO rh.inss_brackets (
  company_id, codigo, descricao, ano_vigencia, mes_vigencia,
  valor_minimo, valor_maximo, aliquota, valor_deducao, ativo
)
SELECT e.company_id, d.codigo, d.descricao, d.ano_vigencia, d.mes_vigencia,
       d.valor_minimo, d.valor_maximo, d.aliquota, d.valor_deducao, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.inss_brackets b
  WHERE b.company_id = e.company_id
    AND b.ano_vigencia = d.ano_vigencia
    AND b.mes_vigencia = d.mes_vigencia
    AND b.ativo IS TRUE
);

-- ---------------------------------------------
-- FGTS Config (configuração padrão 2024) – só se não houver ativos
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('FGTS_PADRAO_2024','FGTS Padrão 2024',2024,1, 0.0800, 0.0000, 0.0000, NULL, 0.00, 0.4000, true)
  ) AS t(codigo,descricao,ano_vigencia,mes_vigencia,aliquota_fgts,aliquota_multa,aliquota_juros,teto_salario,valor_minimo_contribuicao,multa_rescisao,ativo)
)
INSERT INTO rh.fgts_config (
  company_id, codigo, descricao, ano_vigencia, mes_vigencia,
  aliquota_fgts, aliquota_multa, aliquota_juros, teto_salario,
  valor_minimo_contribuicao, multa_rescisao, ativo
)
SELECT e.company_id, d.codigo, d.descricao, d.ano_vigencia, d.mes_vigencia,
       d.aliquota_fgts, d.aliquota_multa, d.aliquota_juros, 
       CASE WHEN d.teto_salario IS NULL THEN NULL ELSE d.teto_salario::numeric(12,2) END AS teto_salario,
       d.valor_minimo_contribuicao::numeric(10,2), d.multa_rescisao, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.fgts_config f
  WHERE f.company_id = e.company_id
    AND f.ano_vigencia = d.ano_vigencia
    AND f.mes_vigencia = d.mes_vigencia
    AND f.ativo IS TRUE
);

-- ---------------------------------------------
-- IRRF Brackets (exemplo mensal) – só se não houver ativos
-- Nota: Ajuste os valores conforme legislação vigente se necessário
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('IRRF_1','Isento',        2024,1,    0.00,  2112.00, 0.0000,   0.00, 0, 189.59, true),
      ('IRRF_2','Faixa 2',       2024,1, 2112.01,  2826.65, 0.0750, 158.40, 0, 189.59, true),
      ('IRRF_3','Faixa 3',       2024,1, 2826.66,  3751.05, 0.1500, 370.40, 0, 189.59, true),
      ('IRRF_4','Faixa 4',       2024,1, 3751.06,  4664.68, 0.2250, 651.73, 0, 189.59, true),
      ('IRRF_5','Faixa 5',       2024,1, 4664.69, 9999999.0,0.2750, 884.96, 0, 189.59, true)
  ) AS t(codigo,descricao,ano_vigencia,mes_vigencia,valor_minimo,valor_maximo,aliquota,valor_deducao,numero_dependentes,valor_por_dependente,ativo)
)
INSERT INTO rh.irrf_brackets (
  company_id, codigo, descricao, ano_vigencia, mes_vigencia,
  valor_minimo, valor_maximo, aliquota, valor_deducao,
  numero_dependentes, valor_por_dependente, ativo
)
SELECT e.company_id, d.codigo, d.descricao, d.ano_vigencia, d.mes_vigencia,
       d.valor_minimo, d.valor_maximo, d.aliquota, d.valor_deducao,
       d.numero_dependentes, d.valor_por_dependente, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.irrf_brackets b
  WHERE b.company_id = e.company_id
    AND b.ano_vigencia = d.ano_vigencia
    AND b.mes_vigencia = d.mes_vigencia
    AND b.ativo IS TRUE
);

-- ---------------------------------------------
-- Tipos de Afastamento
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('FERIAS','Férias','Gozo de férias', 'ferias', 30, true, false, false, false, false, true, true),
      ('AFAST_MED','Afastamento Médico','Atestado médico', 'afastamento_medico', NULL, true, false, false, false, true, true, true),
      ('LIC_MAT','Licença Maternidade','120 dias', 'licenca_maternidade', 120, true, false, false, false, true, true, true),
      ('LIC_PAT','Licença Paternidade','5 dias', 'licenca_paternidade', 5, true, false, false, false, true, true, true),
      ('LIC_LUTO','Licença Luto','2 dias', 'licenca_luto', 2, true, false, false, false, false, false, true),
      ('LIC_CAS','Licença Casamento','3 dias', 'licenca_casamento', 3, true, false, false, false, false, false, true),
      ('SUSPENSAO','Suspensão Disciplinar','Suspensão', 'suspensao', NULL, false, true, true, false, true, true, true),
      ('SEM_VENC','Afastamento sem Vencimento','Sem remuneração', 'afastamento_sem_vencimento', NULL, false, true, true, false, true, true, true)
  ) AS t(codigo,nome,descricao,tipo,maximo_dias,remunerado,desconta_salario,desconta_ferias,desconta_13_salario,requer_anexo,requer_aprovacao,ativo)
)
INSERT INTO rh.absence_types (
  company_id, codigo, nome, descricao, tipo, maximo_dias,
  remunerado, desconta_salario, desconta_ferias, desconta_13_salario,
  requer_anexo, requer_aprovacao, ativo
)
SELECT e.company_id, d.codigo, d.nome, d.descricao, d.tipo, d.maximo_dias,
       d.remunerado, d.desconta_salario, d.desconta_ferias, d.desconta_13_salario,
       d.requer_anexo, d.requer_aprovacao, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.absence_types a
  WHERE a.company_id = e.company_id AND a.codigo = d.codigo
);

-- ---------------------------------------------
-- Motivos de Atraso/Falta
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('ATR_ATE_10','Atraso até 10min','Tolerância eventual', 'atraso', false, false, false, false, true),
      ('ATR_MAIS_10','Atraso > 10min','Sujeito a desconto', 'atraso', true, true, true, false, true),
      ('FALTA_INJ','Falta Injustificada','Desconto integral', 'injustificado', true, true, true, false, true),
      ('FALTA_JUS','Falta Justificada','Conforme lei/atestado', 'justificado', false, false, true, true, true),
      ('SAIDA_ANT','Saída Antecipada','Saída antes do horário', 'saida_antecipada', true, true, true, false, true)
  ) AS t(codigo,nome,descricao,tipo,desconta_salario,desconta_horas,requer_justificativa,requer_anexo,ativo)
)
INSERT INTO rh.delay_reasons (
  company_id, codigo, nome, descricao, tipo,
  desconta_salario, desconta_horas, requer_justificativa, requer_anexo, ativo
)
SELECT e.company_id, d.codigo, d.nome, d.descricao, d.tipo,
       d.desconta_salario, d.desconta_horas, d.requer_justificativa, d.requer_anexo, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.delay_reasons r
  WHERE r.company_id = e.company_id AND r.codigo = d.codigo
);

-- ---------------------------------------------
-- Códigos CID (subset)
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('J06.9','Infecção aguda das vias aéreas superiores, não especificada','Doenças respiratórias','J06', true),
      ('M54.5','Dor lombar baixa','Transtornos do sistema músculo-esquelético','M54', true),
      ('A09.9','Gastroenterite e colite de origem infecciosa, não especificada','Doenças infecciosas','A09', true),
      ('F41.1','Transtorno de ansiedade generalizada','Transtornos mentais','F41', true),
      ('J00','Resfriado comum','Doenças respiratórias','J00', true),
      ('G43.9','Enxaqueca, não especificada','Transtornos do sistema nervoso','G43', true),
      ('K21.9','Doença do refluxo gastroesofágico, sem esofagite','Trato digestivo','K21', true),
      ('B34.9','Infecção viral, não especificada','Doenças infecciosas','B34', true),
      ('Z20.9','Contato com e exposição a doença transmissível, não especificada','Fatores que influenciam o estado de saúde','Z20', true),
      ('U07.1','COVID-19, vírus identificado','Doenças infecciosas','U07', true)
  ) AS t(codigo,descricao,categoria,subcategoria,ativo)
)
INSERT INTO rh.cid_codes (
  company_id, codigo, descricao, categoria, subcategoria, ativo
)
SELECT e.company_id, d.codigo, d.descricao, d.categoria, d.subcategoria, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.cid_codes c
  WHERE c.company_id = e.company_id AND c.codigo = d.codigo
);

-- ---------------------------------------------
-- Tipos de Deficiência (LBI)
-- ---------------------------------------------
WITH empresas AS (
  SELECT id AS company_id
  FROM public.companies
  WHERE ativo IS TRUE
),
defaults AS (
  SELECT * FROM (
    VALUES
      ('DEF_FIS','Deficiência Física','Comprometimento físico','fisica','moderada', true, true, false, true),
      ('DEF_VIS','Deficiência Visual','Comprometimento visual','visual','moderada', true, true, false, true),
      ('DEF_AUD','Deficiência Auditiva','Comprometimento auditivo','auditiva','moderada', true, true, false, true),
      ('DEF_INT','Deficiência Intelectual','Comprometimento intelectual','intelectual',NULL, false, true, false, true),
      ('DEF_MEN','Deficiência Mental','Transtorno mental persistente','mental',NULL, false, true, false, true),
      ('DEF_MULT','Deficiência Múltipla','Associação de deficiências','multipla',NULL, false, true, false, true),
      ('DEF_OUT','Outra Deficiência','Outros casos','outra',NULL, false, true, false, true)
  ) AS t(codigo,nome,descricao,tipo,grau,beneficios_lei_8213,beneficios_lei_13146,isento_contribuicao_sindical,ativo)
)
INSERT INTO rh.deficiency_types (
  company_id, codigo, nome, descricao, tipo, grau,
  beneficios_lei_8213, beneficios_lei_13146, isento_contribuicao_sindical, ativo
)
SELECT e.company_id, d.codigo, d.nome, d.descricao, d.tipo, d.grau,
       d.beneficios_lei_8213, d.beneficios_lei_13146, d.isento_contribuicao_sindical, d.ativo
FROM empresas e
JOIN defaults d ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM rh.deficiency_types x
  WHERE x.company_id = e.company_id AND x.codigo = d.codigo
);

COMMIT;


