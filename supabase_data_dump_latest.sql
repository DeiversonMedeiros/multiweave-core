SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict UphrYbbDbMWqXKyljk2n3UmfS9ULhn1dmwoWNBzQrmng5VAGNjp23EulSrZW1eB

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."companies" ("id", "razao_social", "nome_fantasia", "cnpj", "inscricao_estadual", "endereco", "contato", "ativo", "created_at", "updated_at", "numero_empresa") VALUES
	('a9784891-9d58-4cc4-8404-18032105c335', 'Empresa Teste', 'Nova Empresa Teste', '11.222.333/0001-44', '6512351', NULL, '71955557777', true, '2025-10-03 21:31:32.06255+00', '2025-10-13 22:41:26.86973+00', '01');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "nome", "email", "ativo", "created_at", "updated_at", "company_id") VALUES
	('e745168f-addb-4456-a6fa-f4a336d874ac', 'Deiverson Jorge Honorato Medeiros', 'deiverson.medeiros@estrategicengenharia.com.br', true, '2025-10-03 21:28:18.158356+00', '2025-10-04 16:23:23.061595+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('5beb4b08-5096-4314-ae54-62f0eb392840', 'Teste Técnico', 'teste.tecnico@estrategicengenharia.com.br', true, '2025-10-21 13:04:30.624492+00', '2025-10-21 13:04:30.624492+00', NULL),
	('444bd5e6-7aaa-42f6-b4c6-d2243c13377e', 'Teste Técnico 2', 'testetecnico2@estrategicengenharia.com.br', true, '2025-10-21 17:45:43.767365+00', '2025-10-21 17:45:43.767365+00', NULL);


--
-- Data for Name: aprovacoes_unificada; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cost_centers" ("id", "company_id", "nome", "codigo", "ativo", "created_at", "updated_at") VALUES
	('e2a9363d-446b-4af1-a724-b818deeb503d', 'a9784891-9d58-4cc4-8404-18032105c335', 'Teste Centro de Custo', '123', true, '2025-10-21 14:23:51.37236+00', '2025-10-21 14:23:51.37236+00');


--
-- Data for Name: configuracoes_aprovacao_unificada; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "nome", "descricao", "permissoes", "created_at", "updated_at", "is_active") VALUES
	('20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'Administrador', 'Acesso completo ao sistema', '{"admin": true, "all_modules": true}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('34632fe2-980b-4382-b104-ea244ed586f8', 'Gerente', 'Acesso de gerência', '{"manager": true, "view_reports": true}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'Usuário', 'Acesso básico', '{"user": true, "view_only": false}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('2242ce27-800c-494e-b7b9-c75cb832aa4d', 'Super Admin', 'Acesso total ao sistema', '{"admin": true, "all_modules": true}', '2025-10-04 13:33:13.175734+00', '2025-10-04 15:22:40.252923+00', true),
	('cab40b7d-efca-4778-ad7a-528463c338ad', 'Teste Perfil', 'Teste de descrição de perfil', '{}', '2025-10-21 14:26:02.439504+00', '2025-10-21 14:26:02.439504+00', true);


--
-- Data for Name: entity_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."entity_permissions" ("id", "profile_id", "entity_name", "can_read", "can_create", "can_edit", "can_delete", "created_at", "updated_at") VALUES
	('d9d0d1b9-d88b-44c5-8ddf-002588172105', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'registros_ponto', true, true, true, false, '2025-10-21 14:27:38.680832+00', '2025-10-21 14:27:41.003031+00'),
	('0ba96b25-fd98-442e-9427-c7cc5f8d508b', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'holidays', true, true, true, true, '2025-10-21 20:41:08.897551+00', '2025-10-21 20:41:08.897551+00'),
	('9716a12f-d7f6-4409-86ef-16d141f6e2b8', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'acoes_disciplinares', true, false, false, false, '2025-10-21 14:31:21.009399+00', '2025-10-21 14:31:46.286811+00'),
	('033ec055-9c41-4bcd-a25b-c0992d19f864', '34632fe2-980b-4382-b104-ea244ed586f8', 'holidays', true, true, true, true, '2025-10-21 20:41:08.897551+00', '2025-10-21 20:41:08.897551+00'),
	('8d64c488-2f8c-48a2-aecc-7dc04f2ec9c3', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:11.279135+00'),
	('ea13b7b5-3902-4ca4-ba28-f96bb58fa11c', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'configuracoes_aprovacao', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:13.007494+00'),
	('5df657f8-e61e-444c-8abf-30caaf4727cf', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'lancamentos_contabeis', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:14.060598+00'),
	('ae4e3e27-da0a-4146-8fd0-1e6b6ac241d2', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'plano_contas', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:15.306158+00'),
	('f4007524-1b0d-4801-9749-2999efdd90af', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfse', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:16.462745+00'),
	('436839e4-de78-44ce-99ea-a4d9767b8546', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfe', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:17.567107+00'),
	('c17062d4-669b-4a2b-ba41-e42d73f08794', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'fluxo_caixa', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:19.464703+00'),
	('eee94a8f-1241-4bc8-ac7e-f4068061dac4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'conciliacoes_bancarias', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:21.491189+00'),
	('b29ab572-c3c9-43d1-a8d6-f1920e416141', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_bancarias', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:22.439476+00'),
	('a3abdfed-0d5d-4e05-9bf6-2d7728b5ee69', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'retornos_bancarios', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:24.395972+00'),
	('6e32e64b-6e95-4526-a970-3e4dc9721280', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'remessas_bancarias', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:28.070435+00'),
	('1bfcdeb6-61b6-4afc-ad82-5fb6b1427989', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'borderos', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:29.821593+00'),
	('17808fcf-e803-4857-9a85-11d41e9b80e8', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_receber', false, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:48:31.036586+00'),
	('f82823f8-8b3b-43ba-9e9f-44a62fd3394d', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_pagar', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('4b7fd8ab-a507-4d2c-9b99-fc580a6939a5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_receber', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('3008485f-d1fc-4b41-9416-718ce38ea8ab', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'borderos', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('55138ec3-3eb9-45ec-a868-c8df8c1de1d5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'remessas_bancarias', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('40106c9f-fe63-45b0-b759-ee9ae57e4ac6', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'retornos_bancarios', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('10f90440-9761-47a3-90aa-ee10675f93ac', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contas_bancarias', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('c1644b76-9097-4b91-8d61-5b1ce4c712fa', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'conciliacoes_bancarias', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('4d151ef5-a0b9-4b35-885c-1baa058663a0', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'fluxo_caixa', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('d042a8af-a0b4-48c0-8000-379adf9b42ca', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'nfe', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('7212d5f6-3a27-4a80-a382-0bbcd1f96151', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'nfse', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('c92a7ea7-d488-4b80-b54f-8862f3d32c30', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'plano_contas', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('a4404434-ed94-473c-b954-c56c13096b74', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'lancamentos_contabeis', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('05c7ac3c-f0f1-4890-beac-444f7986c3eb', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'configuracoes_aprovacao', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('00a21765-a42e-4544-b42f-f7728c021ae0', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'aprovacoes', true, true, true, true, '2025-10-14 10:26:04.532644+00', '2025-10-14 10:26:04.532644+00'),
	('2352920b-5dca-4834-83a7-dace3dce07af', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_pagar', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('6dfc60a9-02cf-49b1-b87a-1b71df6a7ffd', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_receber', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('bbeb3473-e430-4866-a1ea-959f390e973e', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'borderos', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('3cee1066-1ea6-4c11-b2c8-4af99289b901', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'remessas_bancarias', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('f0e4745f-4ccf-4e15-8bd2-7a4986180e4e', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'retornos_bancarios', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('31bb6c41-4030-4c0b-aa52-f8c99c68e5be', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contas_bancarias', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('ebf41699-45af-48d3-a775-34c6e2f5e071', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'conciliacoes_bancarias', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('2ed9395b-103e-4513-b61e-1de34c93e79e', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'fluxo_caixa', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('4dbf4299-a399-4ee8-ac78-4bff0bc8d5e7', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'nfe', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('61087e53-0236-4aa2-8265-8b915720744f', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'nfse', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('8db1ad55-4280-499b-9c8b-342cfa2395b6', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'plano_contas', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('fb4844b7-b3fb-4166-8dcb-f8e604db391e', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'lancamentos_contabeis', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('1c78af62-afc3-4754-adda-9dd806a2cd35', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'configuracoes_aprovacao', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('7a8b417c-1718-46df-8898-8b958b6e5dbc', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'aprovacoes', true, true, true, true, '2025-10-14 10:26:04.590752+00', '2025-10-14 10:26:04.590752+00'),
	('e0cf8273-ecd1-4147-a3fc-29f6a7888cb8', '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_pagar', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('e3a156ef-0239-4083-b878-dbf894c0259f', '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_receber', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('9307644c-9292-4876-969f-039b38ab4e7b', '34632fe2-980b-4382-b104-ea244ed586f8', 'borderos', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('947643f5-d3c7-4d6b-ab6f-4c16a58ae4fd', '34632fe2-980b-4382-b104-ea244ed586f8', 'remessas_bancarias', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('8d40907c-88d2-4618-8f97-e40dea4b08a0', '34632fe2-980b-4382-b104-ea244ed586f8', 'retornos_bancarios', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('de109d1f-eb0e-448f-a8fe-35a577bd83ac', '34632fe2-980b-4382-b104-ea244ed586f8', 'contas_bancarias', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('b17d2f6b-a65f-4db0-8554-83c21296b8d7', '34632fe2-980b-4382-b104-ea244ed586f8', 'conciliacoes_bancarias', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('f4ff43ef-7661-4ee7-aa32-aab012e25b5d', '34632fe2-980b-4382-b104-ea244ed586f8', 'fluxo_caixa', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('0601d2a2-674a-4645-bd02-7542ab38202f', '34632fe2-980b-4382-b104-ea244ed586f8', 'nfe', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('1b2dedf0-074a-48eb-a99a-8b191aa6efd9', '34632fe2-980b-4382-b104-ea244ed586f8', 'nfse', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('33c68d79-d8b0-40e2-8308-258a891acbb8', '34632fe2-980b-4382-b104-ea244ed586f8', 'plano_contas', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('0a2f33cf-f736-4544-afe5-785840b8b823', '34632fe2-980b-4382-b104-ea244ed586f8', 'lancamentos_contabeis', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('388cc9d9-3514-4f61-b641-5f53c6e52f61', '34632fe2-980b-4382-b104-ea244ed586f8', 'configuracoes_aprovacao', true, false, false, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('702d7a04-520c-4ec3-b3ae-67ee877de156', '34632fe2-980b-4382-b104-ea244ed586f8', 'aprovacoes', true, true, true, false, '2025-10-14 10:26:04.642808+00', '2025-10-14 10:26:04.642808+00'),
	('bb2e6fee-3543-4e9b-ae2f-fd0884b841d7', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_pagar', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-27 19:53:10.465034+00'),
	('c297f5a5-cddc-49f9-89c8-9c965de792e7', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'estoque_atual', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5e128485-8029-4fa5-a97f-fda4e8fe019d', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'movimentacoes_estoque', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('e3b2a021-9b9a-466f-878b-89e3955d7acf', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'entradas_materiais', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5a548ba3-57f3-4724-8147-b87761cded83', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'entrada_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('f27b3163-f376-4d0f-ad56-667eb2b3196c', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'checklist_recebimento', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('471cbf1f-4cd8-4eea-98e4-74ad5625c812', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materials_equipment', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:09:05.011423+00'),
	('79386cde-7b6c-459e-82e0-48b293ba57d7', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'usuarios', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.48837+00'),
	('6459a74d-518c-4422-b806-911aa832ddee', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'empresas', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.548438+00'),
	('5ae12ab1-2829-4e97-a30c-71175ee995f4', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'perfis', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.615362+00'),
	('817ec223-e6fc-4d9a-8514-35b2a524cd76', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'projetos', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.672392+00'),
	('7caa7e63-c3c6-458e-8abd-f3d68e05335f', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'treinamentos', true, false, false, false, '2025-10-12 11:58:29.133938+00', '2025-10-27 19:53:09.363594+00'),
	('ac37db67-1a89-4914-9b61-e24d9811698d', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'parceiros', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.815273+00'),
	('9fab920d-3bdf-462b-a57d-e05a1db86a71', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'centros_custo', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-20 23:42:44.872079+00'),
	('cd53e23e-f403-46ee-af52-98651f6b09af', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'exames_periodicos', true, true, true, true, '2025-10-11 22:51:53.806373+00', '2025-10-20 23:42:45.272349+00'),
	('7c3876ce-90db-4ca5-ab7f-2bf73636f40a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'exames_periodicos', true, true, true, true, '2025-10-11 22:51:53.806373+00', '2025-10-20 23:42:45.272349+00'),
	('9310b30d-9dbb-4e2f-839d-92d7a0baf28f', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'acoes_disciplinares', true, true, true, true, '2025-10-12 00:29:45.10982+00', '2025-10-20 23:42:45.337903+00'),
	('526afb9e-9d14-496a-b780-1f291c99787b', '34632fe2-980b-4382-b104-ea244ed586f8', 'acoes_disciplinares', true, true, true, false, '2025-10-12 00:29:45.10982+00', '2025-10-20 23:42:45.337903+00'),
	('45e2b927-de5a-4e91-92e4-934338ab6804', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'acoes_disciplinares', true, true, true, true, '2025-10-12 00:29:45.10982+00', '2025-10-20 23:42:45.337903+00'),
	('e57e4389-d1cc-44d8-985e-184c71d8bfbc', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'treinamentos', true, true, true, true, '2025-10-12 11:58:29.133938+00', '2025-10-20 23:42:45.396867+00'),
	('904ecce2-0eef-4d96-98f1-fa73acfbe325', '34632fe2-980b-4382-b104-ea244ed586f8', 'treinamentos', true, true, true, false, '2025-10-12 11:58:29.133938+00', '2025-10-20 23:42:45.396867+00'),
	('f346ddd5-a5c2-46a0-8778-477a7bc4ae90', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'treinamentos', true, true, true, true, '2025-10-12 11:58:29.133938+00', '2025-10-20 23:42:45.396867+00'),
	('b8d63aba-7404-4daf-b2b2-7bfe4b11c51b', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'transferencias', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('480217f7-40d2-462e-9e29-027b7abfa915', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'transferencia_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('a8497df0-6be6-43ba-a9e9-f0adefd5a5ff', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'inventarios', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('4170e6fd-f883-4691-87f1-3d01ef3c4a34', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'inventario_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('8d4f1c2f-d733-4794-982f-01da43ae3aa1', '34632fe2-980b-4382-b104-ea244ed586f8', 'estoque_atual', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('e98529a5-a1f6-4228-b532-f30782426a4b', '34632fe2-980b-4382-b104-ea244ed586f8', 'movimentacoes_estoque', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('11ef3aa4-fd98-445e-a4e9-8bf719d2adc3', '34632fe2-980b-4382-b104-ea244ed586f8', 'entradas_materiais', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('ee72541b-f906-48d6-b117-95e9d14752c5', '34632fe2-980b-4382-b104-ea244ed586f8', 'entrada_itens', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('7842a564-2543-4849-a092-c41921aeb53d', '34632fe2-980b-4382-b104-ea244ed586f8', 'checklist_recebimento', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('11961ca7-0a6b-40e3-b81c-f8b217b2e620', '34632fe2-980b-4382-b104-ea244ed586f8', 'transferencias', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('6f8621fa-b903-4a81-bb1a-e88f54aa8beb', '34632fe2-980b-4382-b104-ea244ed586f8', 'transferencia_itens', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('a82dcee0-b052-4f95-b5ae-fa49eeb3c4f8', '34632fe2-980b-4382-b104-ea244ed586f8', 'inventarios', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('41ddb65c-1333-4443-aefe-d300e1ac29a5', '34632fe2-980b-4382-b104-ea244ed586f8', 'inventario_itens', true, true, true, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('39cb33f2-4bea-4bda-af2c-a8ca695f27ea', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'estoque_atual', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('f9384cee-c475-4cfa-8c75-7f45cbb1e355', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'movimentacoes_estoque', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('cccd695c-bd9b-49d1-b30c-d835b3180d10', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'entradas_materiais', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('36b9a933-62dc-4a78-8393-bc2b570870b2', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'entrada_itens', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('15bd18e5-42a5-4af4-8a86-9aa187629e18', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'checklist_recebimento', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('b7df89ce-38f1-42b6-b96c-706dc4c0c2a0', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'transferencias', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('997695fd-6c03-4099-9476-a07d48c48ee1', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'transferencia_itens', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('e931dc86-e342-4573-8c9d-b8212798333f', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'inventarios', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('01069dc8-2864-4257-8f60-49e4990fa7f2', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'inventario_itens', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5101fd1f-27b5-4904-a2e3-7c3581980ddc', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'estoque_atual', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('3bd3a407-3b10-490a-99e6-1d5e050e3696', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'movimentacoes_estoque', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('2339a904-4053-4c43-9e38-433892c805e2', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'entradas_materiais', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('c5dd1600-b3e8-4718-99db-813277e03489', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'entrada_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('7e9ed6d2-4df3-4e78-8fca-ffddc73cb3fc', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'checklist_recebimento', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('64789819-fdd1-4233-b686-0933b853dfcc', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'transferencias', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('bc754240-1766-406e-a337-193e21308068', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'transferencia_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5a85e025-c78b-4c55-a058-486b3dfbffa8', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'inventarios', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('0f7a50f0-5d5d-4262-bffc-da87a837320e', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'inventario_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('db32c7ba-bf1b-4a08-a8a7-70fc1b5f9246', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'almoxarifados', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('080cb6e2-33ab-4ea2-9a7d-a66f53179adc', '34632fe2-980b-4382-b104-ea244ed586f8', 'almoxarifados', true, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('a51f9865-7552-49b1-97e8-6d2c1ceed913', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'almoxarifados', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('5b710956-9b71-4804-87cb-ba12321a8518', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'almoxarifados', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('d3748a03-8fad-4a9f-ab50-07637d3f7edd', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'materiais_equipamentos', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('4c862e6e-8dec-4d1a-9d28-a5597ba142fa', '34632fe2-980b-4382-b104-ea244ed586f8', 'materiais_equipamentos', true, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('f1876ab7-8e39-4d0a-8444-603842bfdc95', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'materiais_equipamentos', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('35f6e2cf-5c14-4916-bb24-852e4f390e9a', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materiais_equipamentos', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('8c55bf55-1e7f-4542-a3e2-6c54a967c0b0', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'solicitacoes_compra', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('ae862c34-e25c-4bb8-a663-6bef39f921d8', '34632fe2-980b-4382-b104-ea244ed586f8', 'solicitacoes_compra', true, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('85ad8c1a-e2e5-4526-9796-7fc7cf74f1d4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'solicitacoes_compra', false, false, false, false, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('75700768-1069-4b34-bcfe-2adf36cab9ed', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'solicitacoes_compra', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00'),
	('16b735a0-0f62-4f64-9fb7-50e07f34dbfb', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'holidays', false, false, false, false, '2025-10-21 20:41:08.897551+00', '2025-10-21 20:41:08.897551+00'),
	('09f9cde2-208b-45aa-88d7-27dbc18ea2f2', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'ferias', true, true, true, false, '2025-10-21 14:31:06.068845+00', '2025-10-21 14:31:10.662644+00'),
	('f92b5013-b6f4-4b8b-99c2-e5cb2bc2bb27', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'treinamentos', true, false, false, false, '2025-10-21 14:33:59.637101+00', '2025-10-21 14:33:59.637101+00'),
	('6f10a6c5-277a-479f-8726-052ae22ac9c8', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'holidays', true, true, true, true, '2025-10-21 20:41:08.897551+00', '2025-10-21 20:41:08.897551+00'),
	('4a53d78c-4368-4964-9a9e-51ca1907ac2e', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'funcionarios', true, true, true, true, '2025-10-15 18:50:53.072005+00', '2025-10-20 23:42:44.987204+00'),
	('b49503b3-a2e8-4142-9edd-1ecae4627a84', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'holidays', false, false, false, false, '2025-10-21 20:41:08.897551+00', '2025-10-21 20:41:08.897551+00'),
	('8f0700ae-ba77-4435-ba37-1a5740fa7e0a', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'empresas', true, false, false, false, '2025-10-27 19:52:15.326632+00', '2025-10-27 19:52:15.326632+00'),
	('5fe6138f-e4e3-4295-a3ec-7e3719e68b2b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'materiais_equipamentos', true, false, false, false, '2025-10-27 19:52:16.17948+00', '2025-10-27 19:52:16.17948+00'),
	('478aa6d9-3320-4967-ade0-2cb3b9aebe58', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'funcionarios', true, false, false, false, '2025-10-27 19:52:17.350579+00', '2025-10-27 19:52:17.350579+00'),
	('e0ae1ac8-eb49-4aeb-93ca-454a1e22ef2d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'borderos', true, false, false, false, '2025-10-27 19:52:19.594414+00', '2025-10-27 19:52:19.594414+00'),
	('b51dd2e8-a3fe-4cd2-bd52-f33f75ba5c20', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'contas_bancarias', true, false, false, false, '2025-10-27 19:52:20.405292+00', '2025-10-27 19:52:20.405292+00'),
	('33927367-8942-49bf-86ba-743fb014fd7f', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'nfse', true, false, false, false, '2025-10-27 19:52:21.481828+00', '2025-10-27 19:52:21.481828+00'),
	('c2d116b8-bbff-45c2-bc28-9ced5191d559', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'configuracoes_aprovacao', true, false, false, false, '2025-10-27 19:52:22.274546+00', '2025-10-27 19:52:22.274546+00'),
	('3f684e59-b49a-4640-a074-1392dbf8d3c5', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'entradas_materiais', true, false, false, false, '2025-10-27 19:52:23.338722+00', '2025-10-27 19:52:23.338722+00'),
	('f64722b3-f69e-4e70-9d78-a903dd0c81e1', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'transferencias', true, false, false, false, '2025-10-27 19:52:24.176107+00', '2025-10-27 19:52:24.176107+00'),
	('7df848b5-210b-442a-80e8-ea0d46c74d23', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'almoxarifados', true, false, false, false, '2025-10-27 19:52:25.361742+00', '2025-10-27 19:52:25.361742+00'),
	('74484f16-4234-4044-8f78-e0de3136ed85', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'pedidos_compra', true, false, false, false, '2025-10-27 19:52:26.234951+00', '2025-10-27 19:52:26.234951+00'),
	('a3911a2b-d04b-4050-8a2f-ddef5ad0c39d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'historico_compras', true, false, false, false, '2025-10-27 19:52:27.349284+00', '2025-10-27 19:52:27.349284+00'),
	('bdb6f967-402b-4bb6-a2c7-321d6c21169e', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'registros_ponto', true, true, true, true, '2025-10-15 18:50:53.072005+00', '2025-10-20 23:42:45.102747+00'),
	('e397d27d-c2e3-4f63-9ae7-ac2b4bf973fb', '34632fe2-980b-4382-b104-ea244ed586f8', 'registros_ponto', false, false, false, false, '2025-10-15 21:15:27.645934+00', '2025-10-20 23:42:45.102747+00'),
	('1b2a0234-1eb4-40e9-99cf-f9c14feea23f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'ferias', true, true, true, true, '2025-10-15 18:50:53.072005+00', '2025-10-20 23:42:45.158597+00'),
	('b087e98e-5795-4283-92c5-46ebb88c415a', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'reembolsos', true, true, true, true, '2025-10-15 18:50:53.072005+00', '2025-10-20 23:42:45.217371+00'),
	('79457d9a-1bf9-4e99-9ecb-71b7cccdf55c', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'projetos', false, false, false, false, '2025-10-20 23:16:23.012278+00', '2025-10-27 19:52:53.807056+00'),
	('cb19f9d9-eb6c-4de8-95f6-64fbe154e15a', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'reembolsos', true, true, true, false, '2025-10-21 14:31:12.674568+00', '2025-10-21 14:31:14.838543+00'),
	('d1c8be3b-5b19-40e8-8293-3e357b8ea8c2', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'empresas', true, false, false, false, '2025-10-20 23:16:22.479568+00', '2025-10-27 19:46:35.72879+00'),
	('a2f8dc3f-d0e4-491e-9d43-c9b9cebb1ae7', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'perfis', false, false, false, false, '2025-10-20 23:16:22.743102+00', '2025-10-27 19:46:48.259348+00'),
	('b4fa3735-5c62-4178-ae47-51fda12f578c', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'parceiros', false, false, false, false, '2025-10-20 23:16:23.637061+00', '2025-10-27 19:52:58.446818+00'),
	('03bc736f-280e-47c2-ae40-29c9ecc49556', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'funcionarios', true, false, false, false, '2025-10-20 23:16:24.340153+00', '2025-10-27 19:46:55.86901+00'),
	('caf3c3dd-104d-4b64-b414-756299437804', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'centros_custo', false, false, false, false, '2025-10-20 23:16:23.888289+00', '2025-10-27 19:52:59.860541+00'),
	('e020ff4e-4449-472d-b2e0-913e143d3f2e', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'registros_ponto', true, true, true, true, '2025-10-20 23:16:24.783212+00', '2025-10-27 19:47:36.415277+00'),
	('063e7b46-af77-4a04-ba3e-2da6988b2c3a', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'ferias', true, true, true, false, '2025-10-20 23:16:25.04192+00', '2025-10-27 19:47:40.380808+00'),
	('078bc865-abda-4092-b707-8af3f37800d6', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'reembolsos', true, true, true, false, '2025-10-20 23:16:25.331253+00', '2025-10-27 19:47:42.982068+00'),
	('62007e95-9bcb-4ab5-a2d9-54fcec38e446', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'acoes_disciplinares', true, false, false, false, '2025-10-12 00:29:45.10982+00', '2025-10-27 19:47:53.257318+00'),
	('fd704ade-bb91-4ac9-ab03-80e92d24454d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'perfis', true, false, false, false, '2025-10-27 19:52:15.624248+00', '2025-10-27 19:52:15.624248+00'),
	('4da764c9-d5ca-40de-894d-6fa3b566eeda', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'parceiros', true, false, false, false, '2025-10-27 19:52:16.46586+00', '2025-10-27 19:52:16.46586+00'),
	('2358b1be-05c1-4bb4-a35d-ab265a85cff6', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'cargos', true, false, false, false, '2025-10-27 19:52:17.638689+00', '2025-10-27 19:52:17.638689+00'),
	('15915aa0-d75e-43f4-b4b2-138b09222d07', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'remessas_bancarias', true, false, false, false, '2025-10-27 19:52:19.852822+00', '2025-10-27 19:52:19.852822+00'),
	('b3abcdb4-72c4-4623-ae8c-a25ffd3b682b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'conciliacoes_bancarias', true, false, false, false, '2025-10-27 19:52:20.678815+00', '2025-10-27 19:52:20.678815+00'),
	('d97c4340-9f0c-43a1-8732-763dd5d99067', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'plano_contas', true, false, false, false, '2025-10-27 19:52:21.733782+00', '2025-10-27 19:52:21.733782+00'),
	('cc00a884-79bc-4dfe-ad17-ff13b57b7045', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'aprovacoes', true, false, false, false, '2025-10-27 19:52:22.541299+00', '2025-10-27 19:52:22.541299+00'),
	('11f1a52a-6b84-4298-99ec-1537ccc2d18c', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'entrada_itens', true, false, false, false, '2025-10-27 19:52:23.596015+00', '2025-10-27 19:52:23.596015+00'),
	('831de84c-d0da-4c44-ba78-316984e2f989', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'transferencia_itens', true, false, false, false, '2025-10-27 19:52:24.472229+00', '2025-10-27 19:52:24.472229+00'),
	('6f1d11f6-9237-4bbd-9b2b-2d78260ec6b4', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'solicitacoes_compra', true, false, false, false, '2025-10-27 19:52:25.641638+00', '2025-10-27 19:52:25.641638+00'),
	('c4e3ffe8-5dd6-495e-a204-ba6ea183b0ca', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'aprovacoes_compra', true, false, false, false, '2025-10-27 19:52:26.523098+00', '2025-10-27 19:52:26.523098+00'),
	('d49a9a1f-fdca-4354-afbd-4a0ea293112a', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'avaliacao_fornecedores', true, false, false, false, '2025-10-27 19:52:27.623464+00', '2025-10-27 19:52:27.623464+00'),
	('fcbad3a0-a733-4835-960f-4a2110b513cd', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'materials_equipment', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:13:42.951138+00'),
	('2fb1d551-18dc-4ede-b7f7-9e06856d922d', '34632fe2-980b-4382-b104-ea244ed586f8', 'materials_equipment', true, false, false, false, '2025-10-20 23:16:14.652174+00', '2025-10-20 23:16:14.652174+00'),
	('8c4aafcd-1baf-4857-91cb-e2390d629e98', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'materials_equipment', true, false, false, false, '2025-10-20 23:16:23.359602+00', '2025-10-20 23:16:23.359602+00'),
	('29c2f8de-7616-4b35-95e9-5c161c473427', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cotacoes', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('acfcddb0-d3dd-46cf-b808-359c04a1a1ed', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'pedidos_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('e085e548-7ac7-48f1-97fc-bc163ea268ca', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'aprovacoes_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('83c4c735-9fe3-4589-b1e7-26209dd8c38d', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'fornecedores', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('b2ff87df-21e5-467a-9c20-e981b964d18f', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'contratos_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('f3555244-fcee-4f2b-9251-f3dcfa8d00cd', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'historico_compras', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('34e25de8-3f20-41e2-9266-9347416132eb', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'avaliacao_fornecedores', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('0815e5e5-32af-44d2-98c5-281d3dea6e0f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cotacoes', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('e89eddee-0632-4c60-87de-58b88e5075c3', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'pedidos_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('f52b0051-cbe5-4d50-b059-ff7c64c15fb7', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'aprovacoes_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('2c75f662-7fc4-4d93-8f3b-40fae5554237', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'fornecedores', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('70cae9d0-ce14-4e74-8a53-3260abe16d9a', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'contratos_compra', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('bdbee250-4056-44a4-a9df-3f2b4ef5e59c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'historico_compras', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('56e1b5ba-4ab3-4ddd-8d62-a3751262287a', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'avaliacao_fornecedores', true, true, true, true, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('2b18f666-25ce-4726-a9ca-0d526bfe214d', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'empresas', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.548438+00'),
	('2f0a078b-aedd-4a1c-97bd-321959c719d6', '34632fe2-980b-4382-b104-ea244ed586f8', 'empresas', true, false, false, false, '2025-10-20 23:16:13.683912+00', '2025-10-20 23:42:44.548438+00'),
	('49af9a81-40b5-4c3d-b8c2-48b162163d98', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'perfis', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.615362+00'),
	('cee7afaa-1365-4716-a658-1a734fa76068', '34632fe2-980b-4382-b104-ea244ed586f8', 'perfis', true, false, false, false, '2025-10-20 23:16:14.034754+00', '2025-10-20 23:42:44.615362+00'),
	('b007c2b3-ad65-49ec-a980-ebed52dbc8ba', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'projetos', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.672392+00'),
	('48246825-5547-4cea-93b7-b23b7fb8f5a6', '34632fe2-980b-4382-b104-ea244ed586f8', 'projetos', true, false, false, false, '2025-10-20 23:16:14.355427+00', '2025-10-20 23:42:44.672392+00'),
	('4879353b-56f5-44bd-acd0-49fa32d1decb', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'parceiros', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.815273+00'),
	('9c16a521-e33d-4e31-8884-e791a762bcaa', '34632fe2-980b-4382-b104-ea244ed586f8', 'parceiros', true, false, false, false, '2025-10-20 23:16:14.927064+00', '2025-10-20 23:42:44.815273+00'),
	('e711ea4f-124e-40aa-9f17-451d5bf87111', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'centros_custo', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.872079+00'),
	('989c40b1-24a5-4340-99ea-c1a15f37b3f8', '34632fe2-980b-4382-b104-ea244ed586f8', 'centros_custo', true, false, false, false, '2025-10-20 23:16:15.17979+00', '2025-10-20 23:42:44.872079+00'),
	('0d3768cc-18fc-41db-aa04-6ab9efac9d4b', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'unidades', true, true, true, true, '2025-10-19 22:49:18.462756+00', '2025-10-20 23:42:44.930473+00'),
	('a7cc35b0-f4bb-4f43-9a14-b1b489d55b44', '34632fe2-980b-4382-b104-ea244ed586f8', 'unidades', true, true, true, false, '2025-10-19 22:49:18.462756+00', '2025-10-20 23:42:44.930473+00'),
	('f7f0519d-8be1-486b-a22d-1325862df100', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'unidades', false, false, false, false, '2025-10-19 22:49:18.462756+00', '2025-10-20 23:42:44.930473+00'),
	('fc6aa9e4-4e55-4655-8518-3ec22c47fc37', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'unidades', true, true, true, true, '2025-10-19 22:49:18.462756+00', '2025-10-20 23:42:44.930473+00'),
	('a5a8d612-6265-4047-bfe0-92b06511b333', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'funcionarios', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.987204+00'),
	('f4ce66a4-a9ff-451b-87cf-70100c3767e7', '34632fe2-980b-4382-b104-ea244ed586f8', 'funcionarios', true, false, false, false, '2025-10-20 23:16:15.608488+00', '2025-10-20 23:42:44.987204+00'),
	('3b00f05c-49a7-443f-8f70-d5e15545fbdc', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cargos', true, true, true, true, '2025-10-19 11:42:01.036017+00', '2025-10-20 23:42:45.044257+00'),
	('c18854f2-67f1-465c-bcfa-fdd62fd555ee', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cargos', true, true, true, true, '2025-10-19 11:42:01.098594+00', '2025-10-20 23:42:45.044257+00'),
	('83a599b6-4b5e-4e4f-9f7f-feb6750fd4c2', '34632fe2-980b-4382-b104-ea244ed586f8', 'cargos', true, true, true, false, '2025-10-19 11:42:01.152612+00', '2025-10-20 23:42:45.044257+00'),
	('4a8c6cd4-8e8a-4e93-b0d0-44aab181aac1', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cargos', true, false, false, false, '2025-10-19 11:42:01.211945+00', '2025-10-20 23:42:45.044257+00'),
	('ff456176-5336-4078-a216-dce5de73fcf3', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'registros_ponto', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:45.102747+00'),
	('0ce138aa-0976-46e2-968a-da284286591a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'ferias', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:45.158597+00'),
	('ff402302-11ca-4249-8d57-e03900251a1b', '34632fe2-980b-4382-b104-ea244ed586f8', 'ferias', true, false, false, false, '2025-10-20 23:16:16.308745+00', '2025-10-20 23:42:45.158597+00'),
	('7d1da680-60c0-400c-84e7-0427e14f4fe7', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'reembolsos', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:45.217371+00'),
	('841d1731-7a87-44e1-a1ec-ef6946a3d2e9', '34632fe2-980b-4382-b104-ea244ed586f8', 'reembolsos', true, false, false, false, '2025-10-20 23:16:16.606102+00', '2025-10-20 23:42:45.217371+00'),
	('4b4b9562-ecba-498e-8a1c-33ebd6e0e22c', '34632fe2-980b-4382-b104-ea244ed586f8', 'cotacoes', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('376bd1c4-310c-4202-851c-3facd0a5bb80', '34632fe2-980b-4382-b104-ea244ed586f8', 'pedidos_compra', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('fdcd421a-08eb-40ae-85df-8985ac698c32', '34632fe2-980b-4382-b104-ea244ed586f8', 'aprovacoes_compra', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('a0f8f650-6f6b-4748-9450-17444fbaeafc', '34632fe2-980b-4382-b104-ea244ed586f8', 'fornecedores', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('45141aa5-8d7a-4eb9-a099-5868eb3e79d0', '34632fe2-980b-4382-b104-ea244ed586f8', 'contratos_compra', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('c5085736-fe1a-4d5c-a235-431c731ded8a', '34632fe2-980b-4382-b104-ea244ed586f8', 'historico_compras', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('f530fbaf-fc13-492b-8a97-d00310babf0c', '34632fe2-980b-4382-b104-ea244ed586f8', 'avaliacao_fornecedores', true, true, true, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('3438e7e5-1601-4a00-8edc-f151529a5c42', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cotacoes', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('c0505e41-4322-4dff-b7c7-b9672ef8d089', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'pedidos_compra', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('b206f159-4cda-4c67-a3bb-d5d662b5ec67', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes_compra', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('cf5dce51-cf79-4dd2-899b-2385182e51bc', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'fornecedores', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('8cf18c57-8d7a-4f95-b9a8-feb46fbf06df', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contratos_compra', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('fa8bbf49-8fe5-4191-84e1-27967b621a6d', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'historico_compras', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('0444f4ee-d668-420b-9020-50690791f5b3', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'avaliacao_fornecedores', false, false, false, false, '2025-10-20 23:34:04.087405+00', '2025-10-20 23:34:04.087405+00'),
	('def4a359-24bc-443b-8ca4-991abe88eec8', '34632fe2-980b-4382-b104-ea244ed586f8', 'usuarios', false, false, false, false, '2025-10-15 18:55:32.2642+00', '2025-10-20 23:42:44.48837+00'),
	('daac2da4-258e-4acc-ac87-f0ef94ce1536', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'usuarios', true, true, true, true, '2025-10-20 23:13:42.951138+00', '2025-10-20 23:42:44.48837+00'),
	('e86be6bc-cf7a-4bc6-b6db-0ed527ea08d6', '34632fe2-980b-4382-b104-ea244ed586f8', 'exames_periodicos', true, true, true, false, '2025-10-11 22:51:53.806373+00', '2025-10-20 23:42:45.272349+00'),
	('5977cbf9-3f4d-4b21-bedd-4c277c7303e7', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'usuarios', false, false, false, false, '2025-10-20 23:16:22.229364+00', '2025-10-27 19:46:29.602814+00'),
	('658ad083-e144-4a99-8511-0b880032d4fd', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'exames_periodicos', true, false, false, false, '2025-10-11 22:51:53.806373+00', '2025-10-27 19:47:46.509248+00'),
	('f38b8f1b-654c-4719-afb5-bf55e1f06bca', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'exames_periodicos', true, false, false, false, '2025-10-21 14:31:16.482009+00', '2025-10-21 14:31:36.684662+00'),
	('d554b806-0395-4550-9a02-5e498747f61d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'usuarios', true, false, false, false, '2025-10-27 19:52:15.023053+00', '2025-10-27 19:52:15.023053+00'),
	('c5ff2be7-5704-4e5d-bd30-83d04d8adfab', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'projetos', true, false, false, false, '2025-10-27 19:52:15.9032+00', '2025-10-27 19:52:15.9032+00'),
	('8d44abe9-5925-4eb3-997b-687d901f2e44', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'centros_custo', true, false, false, false, '2025-10-27 19:52:16.756846+00', '2025-10-27 19:52:16.756846+00'),
	('b3c88284-b6a0-4cf0-9dce-25388cd6a4ea', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'unidades', true, false, false, false, '2025-10-27 19:52:17.05139+00', '2025-10-27 19:52:17.05139+00'),
	('b699e10f-f79b-41e2-8324-2669d628d7ca', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'contas_pagar', true, false, false, false, '2025-10-27 19:52:19.052073+00', '2025-10-27 19:52:19.052073+00'),
	('240bf27d-6c8c-439d-9df8-c5ecb506898b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'contas_receber', true, false, false, false, '2025-10-27 19:52:19.334461+00', '2025-10-27 19:52:19.334461+00'),
	('9b46ede2-0684-4fc9-aef4-8d05b422b1d4', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'retornos_bancarios', true, false, false, false, '2025-10-27 19:52:20.133376+00', '2025-10-27 19:52:20.133376+00'),
	('b7c66218-2732-436b-a3d5-e3b4f416251d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'fluxo_caixa', true, false, false, false, '2025-10-27 19:52:20.949507+00', '2025-10-27 19:52:20.949507+00'),
	('d2a7d62b-0068-4ccd-9e16-15ef55d7f070', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'nfe', true, false, false, false, '2025-10-27 19:52:21.210991+00', '2025-10-27 19:52:21.210991+00'),
	('d9a1db9b-4369-4c9f-b6c6-2105cb6ed808', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'lancamentos_contabeis', true, false, false, false, '2025-10-27 19:52:22.012151+00', '2025-10-27 19:52:22.012151+00'),
	('9f399c49-194a-4e74-b775-8841187a3883', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'estoque_atual', true, false, false, false, '2025-10-27 19:52:22.802675+00', '2025-10-27 19:52:22.802675+00'),
	('bb850608-1e76-43db-94e9-d482138801ea', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'movimentacoes_estoque', true, false, false, false, '2025-10-27 19:52:23.053068+00', '2025-10-27 19:52:23.053068+00'),
	('96fbc049-23a6-4a36-a4f7-869dd6634ce9', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'checklist_recebimento', true, false, false, false, '2025-10-27 19:52:23.890914+00', '2025-10-27 19:52:23.890914+00'),
	('c098c7c5-f3a9-4fef-8152-cb61e3e41b0b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'inventarios', true, false, false, false, '2025-10-27 19:52:24.774306+00', '2025-10-27 19:52:24.774306+00'),
	('55a72400-8e53-4ecd-8fb8-92c657f67acf', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'inventario_itens', true, false, false, false, '2025-10-27 19:52:25.050125+00', '2025-10-27 19:52:25.050125+00'),
	('6b4e335a-f247-419c-9467-de2efa6541ac', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'cotacoes', true, false, false, false, '2025-10-27 19:52:25.914396+00', '2025-10-27 19:52:25.914396+00'),
	('2d2f101e-c180-426a-9db3-61f3c67b50e8', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'fornecedores', true, false, false, false, '2025-10-27 19:52:26.793281+00', '2025-10-27 19:52:26.793281+00'),
	('3c95d2a6-7cb0-4df1-b85a-1677341d91a2', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'contratos_compra', true, false, false, false, '2025-10-27 19:52:27.07845+00', '2025-10-27 19:52:27.07845+00');


--
-- Data for Name: historico_edicoes_solicitacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: module_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."module_permissions" ("id", "profile_id", "module_name", "can_read", "can_create", "can_edit", "can_delete", "created_at", "updated_at") VALUES
	('76e60de4-8d38-44b9-9db9-d9715ac94c6c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'dashboard', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('cc9c1281-56d1-43a7-b154-64faeaf3dae9', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'empresas', false, false, false, false, '2025-10-20 23:02:55.158579+00', '2025-10-27 19:45:46.940571+00'),
	('30325bde-969d-46f1-a936-b717e5e4a4ef', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'projetos', false, false, false, false, '2025-10-20 23:02:55.467671+00', '2025-10-27 19:45:52.641304+00'),
	('3e9918bf-ac8e-42ee-a8db-4b2847919521', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'materiais_equipamentos', false, false, false, false, '2025-10-20 23:02:55.750226+00', '2025-10-27 19:45:54.479427+00'),
	('df743b2b-d33e-4f40-a3aa-9f65e318c9c7', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'centros_custo', false, false, false, false, '2025-10-20 23:02:56.336168+00', '2025-10-27 19:45:56.994073+00'),
	('8a9fe3e7-89c0-4a5d-8c3d-53fdfb785d28', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'financeiro', false, false, false, false, '2025-10-14 10:26:04.472562+00', '2025-10-27 19:46:00.85671+00'),
	('1a40d759-6e93-4591-acfc-7404ffde45f6', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'compras', false, false, false, false, '2025-10-16 11:01:03.947317+00', '2025-10-27 19:46:03.496251+00'),
	('ac3a661c-5a3b-4f16-83a8-08209809900f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'configuracoes', true, true, true, true, '2025-10-04 15:43:12.157125+00', '2025-10-04 15:43:12.157125+00'),
	('4d91e404-8b44-45a3-9834-d4228f1b4d30', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'configuracoes', true, true, true, true, '2025-10-04 15:43:20.182753+00', '2025-10-04 15:43:20.182753+00'),
	('940b88d4-de25-4217-9827-58f3de6245a4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'rh', false, false, false, false, '2025-10-11 22:51:53.867549+00', '2025-10-27 19:46:07.643791+00'),
	('dd7e8463-8d1d-4dd6-ba73-7f49b7f3906a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cadastros', true, true, true, true, '2025-10-19 22:49:25.970922+00', '2025-10-19 22:49:25.970922+00'),
	('386fb80a-b109-44c2-b16e-07e3a3d2c656', '34632fe2-980b-4382-b104-ea244ed586f8', 'cadastros', true, true, true, false, '2025-10-19 22:49:25.970922+00', '2025-10-19 22:49:25.970922+00'),
	('c2aed148-47de-4625-a14b-61bff908a918', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'dashboard', true, true, true, true, '2025-10-04 16:10:13.938451+00', '2025-10-04 16:13:01.058775+00'),
	('5aef9002-ff8f-49ec-98f5-472f9fda5008', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cadastros', true, false, false, false, '2025-10-19 22:49:25.970922+00', '2025-10-19 22:49:25.970922+00'),
	('f8220c39-71a8-49c7-9f4a-3edf8305ee2a', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cadastros', true, true, true, true, '2025-10-19 22:49:25.970922+00', '2025-10-19 22:49:25.970922+00'),
	('11fec3b7-7127-4ab4-b4fd-22d59a814111', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'recrutamento', false, false, false, false, '2025-10-12 11:13:53.820277+00', '2025-10-27 19:46:09.409037+00'),
	('a00ddfba-6689-4b53-bb7d-46c1f1767f61', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'treinamento', false, false, false, false, '2025-10-12 11:58:17.757163+00', '2025-10-27 19:46:11.451361+00'),
	('a676d7cd-3624-4697-b679-837432796467', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'configuracoes', false, false, false, false, '2025-10-20 23:02:56.683042+00', '2025-10-27 19:46:18.156505+00'),
	('9222d83c-c038-4dc7-a27e-e78de4495bbc', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'dashboard', false, false, false, false, '2025-10-20 23:02:54.498495+00', '2025-10-27 19:46:24.250264+00'),
	('7eaa9ee0-a551-4737-942a-d70ee2641e03', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'rh', true, true, true, true, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('34b31638-8803-4ca2-b2df-37734f3c9c1a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'rh', true, true, true, true, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('07e490fa-db68-4535-ba67-3c4583a78841', '34632fe2-980b-4382-b104-ea244ed586f8', 'rh', true, true, true, false, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('9572566e-f630-4b4f-a18b-da298f0837fe', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'users', true, true, true, true, '2025-10-27 19:50:13.236219+00', '2025-10-27 19:50:13.236219+00'),
	('d2d3e997-ed81-4f96-a661-7407a9e98c62', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'portal_colaborador', true, true, true, false, '2025-10-20 23:02:56.980941+00', '2025-10-27 19:47:15.363644+00'),
	('a1c4bd9a-2ee2-46f2-9029-af6b2cc6e3f1', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'materials_equipment', true, true, true, true, '2025-10-27 19:50:13.938033+00', '2025-10-27 19:50:13.938033+00'),
	('3262f28f-0fb7-4f46-8f28-788330076868', '34632fe2-980b-4382-b104-ea244ed586f8', 'projects', true, false, false, false, '2025-10-27 19:50:17.320523+00', '2025-10-27 19:50:17.320523+00'),
	('2b862149-6eb3-480b-94a4-a7da65e3b401', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'treinamento', true, true, true, true, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('964604a4-7199-458c-b6fc-01cf417bde85', '34632fe2-980b-4382-b104-ea244ed586f8', 'treinamento', true, true, true, false, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('5de34c83-9584-47a0-8058-28df3f31c7e4', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'treinamento', true, true, true, true, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('d8a3b8a0-2788-46c9-bfa8-caf52a6488d8', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'financeiro', true, true, true, true, '2025-10-10 15:42:04.216167+00', '2025-10-14 10:26:04.310494+00'),
	('805bc22a-9519-4ebd-bc7e-524b62915127', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'financeiro', true, true, true, true, '2025-10-14 10:26:04.368669+00', '2025-10-14 10:26:04.368669+00'),
	('5bfe4794-184c-4615-9504-1061e7b4a8ae', '34632fe2-980b-4382-b104-ea244ed586f8', 'financeiro', true, true, true, false, '2025-10-14 10:26:04.420515+00', '2025-10-14 10:26:04.420515+00'),
	('d38aecf0-09a5-421b-bc63-5653415869eb', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'almoxarifado', true, true, true, true, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('f575bc69-7723-4d54-bf4b-98cd19c9bdc5', '34632fe2-980b-4382-b104-ea244ed586f8', 'almoxarifado', true, true, true, false, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('059a894b-78d6-4eeb-bb37-5b2cb3b9bf63', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'almoxarifado', false, false, false, false, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('f8752bbc-01c8-4ae1-92d6-e60d9be9740b', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'almoxarifado', true, true, true, true, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('431e3953-6e26-4f53-b31b-e17110f398b9', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'portal_colaborador', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('a7163bc1-e4b6-476f-b5f6-bcedd78b575c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'compras', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('1554900c-e34f-48d9-aba7-59cfdb880589', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'logistica', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('c03c1adc-6a4a-4f54-9978-aee5af091a06', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'frota', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('1f2a8de4-3e30-4f3b-a6ab-6db74fad43b0', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'metalurgica', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('e3e3edbe-5551-48ca-aea0-61588aca16f7', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'portal_gestor', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('e0cb0425-575d-4684-8bfb-d070be00f645', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'comercial', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('9f795a97-15f2-4184-8e22-836a429c9d4f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'combustivel', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('6455ec93-4661-4ed6-b1ae-81aaf1af5f5c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'implantacao', true, true, true, true, '2025-10-15 18:50:52.998172+00', '2025-10-15 18:50:52.998172+00'),
	('d3f38130-e7a5-414f-85db-b0df78c00930', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'portal_colaborador', true, true, true, true, '2025-10-20 23:02:43.346371+00', '2025-10-20 23:02:43.346371+00'),
	('4d7b21a8-3eb8-44c5-9fed-9c20f7199477', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'portal_gestor', true, true, true, true, '2025-10-20 23:02:43.879503+00', '2025-10-20 23:02:43.879503+00'),
	('beffabe3-6646-4504-97aa-da58bc139da2', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'frota', true, true, true, true, '2025-10-20 23:02:44.810623+00', '2025-10-20 23:02:44.810623+00'),
	('44b6d2d4-e927-4ed8-af2a-6c05c64f4e28', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'empresas', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-20 23:42:45.512261+00'),
	('902229e8-5ecf-4566-bd81-f860f68f652c', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'logistica', true, true, true, true, '2025-10-20 23:02:45.110213+00', '2025-10-20 23:02:45.110213+00'),
	('4ae3d1b1-b995-498d-bac0-edae291a62b9', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'combustivel', true, true, true, true, '2025-10-20 23:02:46.040814+00', '2025-10-20 23:02:46.040814+00'),
	('f03e9405-63f0-4946-851c-16cec182b22c', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'metalurgica', true, true, true, true, '2025-10-20 23:02:46.414933+00', '2025-10-20 23:02:46.414933+00'),
	('aa205930-c1ab-43d1-9c20-f371a0b3f0de', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'comercial', true, true, true, true, '2025-10-20 23:02:46.69837+00', '2025-10-20 23:02:46.69837+00'),
	('b207d52f-2f84-40d9-8d3d-253794bbfb5a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'compras', true, true, true, true, '2025-10-16 11:01:03.831391+00', '2025-10-16 11:01:03.831391+00'),
	('b33cd29d-5dec-422c-a6e3-ac107a18f2f3', '34632fe2-980b-4382-b104-ea244ed586f8', 'compras', true, true, true, false, '2025-10-16 11:01:03.891236+00', '2025-10-16 11:01:03.891236+00'),
	('00d4fc0e-9eb2-487c-97ae-b1fe9883d72c', '34632fe2-980b-4382-b104-ea244ed586f8', 'dashboard', true, true, false, false, '2025-10-15 17:37:20.584258+00', '2025-10-19 10:36:00.027564+00'),
	('4f2a5c8c-454f-4e3c-a1a6-d4f195830b3d', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'implantacao', true, true, true, true, '2025-10-20 23:02:47.008939+00', '2025-10-20 23:02:47.008939+00'),
	('605d0aa6-bbd1-419d-ad9e-74bf81403142', '34632fe2-980b-4382-b104-ea244ed586f8', 'configuracoes', true, false, false, false, '2025-10-20 23:02:50.350073+00', '2025-10-20 23:02:50.350073+00'),
	('96a9b8c8-06c7-4206-8e3e-50beebc83926', '34632fe2-980b-4382-b104-ea244ed586f8', 'portal_colaborador', true, false, false, false, '2025-10-20 23:02:50.720045+00', '2025-10-20 23:02:50.720045+00'),
	('76116756-d2a7-4109-85f7-b0e75c5006f2', '34632fe2-980b-4382-b104-ea244ed586f8', 'portal_gestor', true, false, false, false, '2025-10-20 23:02:51.081448+00', '2025-10-20 23:02:51.081448+00'),
	('cf9336ab-449d-4828-acf9-3dc14c549928', '34632fe2-980b-4382-b104-ea244ed586f8', 'frota', true, false, false, false, '2025-10-20 23:02:51.976453+00', '2025-10-20 23:02:51.976453+00'),
	('2702200e-7b49-40f0-9b61-4e42cf5c010c', '34632fe2-980b-4382-b104-ea244ed586f8', 'logistica', true, false, false, false, '2025-10-20 23:02:52.290242+00', '2025-10-20 23:02:52.290242+00'),
	('e20ccd1e-3615-4a4e-ae13-b13d7c96b0ee', '34632fe2-980b-4382-b104-ea244ed586f8', 'combustivel', true, false, false, false, '2025-10-20 23:02:53.180147+00', '2025-10-20 23:02:53.180147+00'),
	('23559ba4-e135-4630-a49c-fa85858c7846', '34632fe2-980b-4382-b104-ea244ed586f8', 'metalurgica', true, false, false, false, '2025-10-20 23:02:53.486572+00', '2025-10-20 23:02:53.486572+00'),
	('c8080e80-ca08-4d95-af72-4d8283b7c6bf', '34632fe2-980b-4382-b104-ea244ed586f8', 'comercial', true, false, false, false, '2025-10-20 23:02:53.834186+00', '2025-10-20 23:02:53.834186+00'),
	('ae30de16-4c84-4ccd-9850-314c654854c0', '34632fe2-980b-4382-b104-ea244ed586f8', 'implantacao', true, false, false, false, '2025-10-20 23:02:54.162387+00', '2025-10-20 23:02:54.162387+00'),
	('0c79b88c-1cf7-420f-bf57-83c9bc0a7861', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'usuarios', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-20 23:42:45.454215+00'),
	('717c6d7b-9a2b-4d8f-8454-71a45f66bb88', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'usuarios', true, false, false, false, '2025-10-04 15:46:19.490698+00', '2025-10-20 23:42:45.454215+00'),
	('8a2b0e07-4b17-4b1a-92f9-0a43d5d8f03a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'empresas', true, true, true, true, '2025-10-20 23:02:41.441681+00', '2025-10-20 23:42:45.512261+00'),
	('465d83b3-b726-4cd3-9a90-8e95c200473a', '34632fe2-980b-4382-b104-ea244ed586f8', 'empresas', true, false, false, false, '2025-10-15 20:58:53.865523+00', '2025-10-20 23:42:45.512261+00'),
	('abe9035f-1479-49bc-9cef-986bf70154f5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'projetos', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-20 23:42:45.570363+00'),
	('54b3dfb1-4d11-4884-bb4f-5d531d48be02', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'projetos', true, true, true, true, '2025-10-20 23:02:41.879017+00', '2025-10-20 23:42:45.570363+00'),
	('a952f1c0-6d6f-44c9-b755-c2b7362a92da', '34632fe2-980b-4382-b104-ea244ed586f8', 'projetos', true, false, false, false, '2025-10-15 20:58:53.865523+00', '2025-10-20 23:42:45.570363+00'),
	('c92cac38-0b90-4f43-a5a4-42df07332048', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'materiais_equipamentos', true, true, true, true, '2025-10-20 23:02:42.181867+00', '2025-10-20 23:42:45.628329+00'),
	('50b13079-9dba-4667-b3fe-1e3ee1023da4', '34632fe2-980b-4382-b104-ea244ed586f8', 'materiais_equipamentos', true, false, false, false, '2025-10-20 23:02:48.298065+00', '2025-10-20 23:42:45.628329+00'),
	('6e14639e-90c4-4438-9850-d81066f11243', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'parceiros', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-20 23:42:45.686279+00'),
	('33d364e0-af18-4f9b-8364-daf0255e0bd3', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'parceiros', true, true, true, true, '2025-10-20 23:02:42.523577+00', '2025-10-20 23:42:45.686279+00'),
	('5474f86e-96c4-414f-bc79-dc093a3b53b0', '34632fe2-980b-4382-b104-ea244ed586f8', 'parceiros', true, false, false, false, '2025-10-15 20:58:53.865523+00', '2025-10-20 23:42:45.686279+00'),
	('808dc6dd-2b72-43d4-9b8c-698e7b4ebd9f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'centros_custo', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-20 23:42:45.744396+00'),
	('577243aa-cccf-44d3-8620-152085d7d10c', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'centros_custo', true, true, true, true, '2025-10-20 23:02:42.818518+00', '2025-10-20 23:42:45.744396+00'),
	('e294f1ff-99fe-4c31-8601-bcb4a1fa965b', '34632fe2-980b-4382-b104-ea244ed586f8', 'centros_custo', true, false, false, false, '2025-10-15 20:58:53.865523+00', '2025-10-20 23:42:45.744396+00'),
	('c1c799d5-ec31-4d00-ba9f-5f627cdf49a5', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'recrutamento', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-20 23:42:45.798236+00'),
	('aee9e7e6-f7d7-4d6b-8ad1-268e76825f3a', '34632fe2-980b-4382-b104-ea244ed586f8', 'recrutamento', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-20 23:42:45.798236+00'),
	('132ea428-2524-450d-9434-897e041663a5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'recrutamento', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-20 23:42:45.798236+00'),
	('85b5fe41-9bdf-45cf-8ab6-612bb324b039', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'portal_gestor', false, false, false, false, '2025-10-20 23:02:57.312859+00', '2025-10-27 19:45:59.678451+00'),
	('4dbdb858-d9a2-464b-9e69-41fcbfed49fe', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'combustivel', false, false, false, false, '2025-10-20 23:02:59.4833+00', '2025-10-27 19:46:12.914962+00'),
	('7300fd8d-b250-4f53-8d97-919723946cc5', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'metalurgica', false, false, false, false, '2025-10-20 23:02:59.822921+00', '2025-10-27 19:46:14.114844+00'),
	('160ef4a4-1f49-4dda-abcf-c6fa0051c55d', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'comercial', false, false, false, false, '2025-10-20 23:03:00.162994+00', '2025-10-27 19:46:15.832126+00'),
	('398f3aa5-b1d3-4a16-83c9-0f0907655da4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'implantacao', false, false, false, false, '2025-10-20 23:03:00.485235+00', '2025-10-27 19:46:16.894063+00'),
	('173f4bb8-b3cb-4c4a-894d-780eb9ad2126', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'companies', true, true, true, true, '2025-10-27 19:50:13.497834+00', '2025-10-27 19:50:13.497834+00'),
	('e1adae4c-bce8-4ee5-a8fa-8a46f24c5071', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'partners', true, true, true, true, '2025-10-27 19:50:14.16024+00', '2025-10-27 19:50:14.16024+00'),
	('c1bc74f8-9731-405c-a149-6ddc521306f0', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'recruitment', true, true, true, true, '2025-10-27 19:50:15.753917+00', '2025-10-27 19:50:15.753917+00'),
	('cd337714-2468-4881-a930-1ad598d7eb47', '34632fe2-980b-4382-b104-ea244ed586f8', 'users', true, false, false, false, '2025-10-27 19:50:16.690045+00', '2025-10-27 19:50:16.690045+00'),
	('6f22722f-7778-4a66-bdd4-71429415fb83', '34632fe2-980b-4382-b104-ea244ed586f8', 'materials_equipment', true, false, false, false, '2025-10-27 19:50:17.614096+00', '2025-10-27 19:50:17.614096+00'),
	('78678dbf-ce21-478e-9055-295126f43c8e', '34632fe2-980b-4382-b104-ea244ed586f8', 'cost_centers', true, false, false, false, '2025-10-27 19:50:18.264087+00', '2025-10-27 19:50:18.264087+00'),
	('ee302ef4-2261-4e83-b99a-1ebaeec1728a', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'users', true, false, false, false, '2025-10-27 19:50:21.749709+00', '2025-10-27 19:50:21.749709+00'),
	('95fb2818-b645-4311-8baf-76dcdca1814b', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'projects', true, false, false, false, '2025-10-27 19:50:22.287449+00', '2025-10-27 19:50:22.287449+00'),
	('5d75ecc0-9c3a-403d-9ef7-aba171fa7b61', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'cost_centers', true, false, false, false, '2025-10-27 19:50:23.312994+00', '2025-10-27 19:50:23.312994+00'),
	('2cec3ced-a7ad-4be5-b5b7-157095589970', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'companies', true, true, true, true, '2025-10-27 19:50:27.720803+00', '2025-10-27 19:50:27.720803+00'),
	('8b022103-880a-4ba0-9424-1bc5bacce472', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'partners', true, true, true, true, '2025-10-27 19:50:28.679222+00', '2025-10-27 19:50:28.679222+00'),
	('d39264c7-ca87-455e-a676-aa4699d34187', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'recruitment', true, true, true, true, '2025-10-27 19:50:31.056741+00', '2025-10-27 19:50:31.056741+00'),
	('9b9f9507-bbe7-444f-a406-727c4b252f3a', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'dashboard', true, false, false, false, '2025-10-27 19:50:32.285304+00', '2025-10-27 19:50:32.285304+00'),
	('c6fcf1d3-6646-4c1e-8f0c-471428cdbee3', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'companies', true, false, false, false, '2025-10-27 19:50:32.921944+00', '2025-10-27 19:50:32.921944+00'),
	('cae1cf81-699a-4d89-9bca-893d19b40d00', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'materials_equipment', true, false, false, false, '2025-10-27 19:50:33.602373+00', '2025-10-27 19:50:33.602373+00'),
	('93f7fb98-f864-400e-aa97-2cf8b1c9a2eb', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'cadastros', true, false, false, false, '2025-10-27 19:50:34.691355+00', '2025-10-27 19:50:34.691355+00'),
	('1c689753-cc49-4c10-8efc-59b3b763008f', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'financeiro', true, false, false, false, '2025-10-27 19:50:35.990483+00', '2025-10-27 19:50:35.990483+00'),
	('d4bbfcf9-3ebc-4be0-a47c-2e0f1341385b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'almoxarifado', true, false, false, false, '2025-10-27 19:50:36.618617+00', '2025-10-27 19:50:36.618617+00'),
	('0857c370-7317-4188-88aa-def2e9ba4853', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'logistica', true, false, false, false, '2025-10-27 19:50:37.18973+00', '2025-10-27 19:50:37.18973+00'),
	('d230fe9b-6f6d-49f8-99ff-7caecc478495', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'treinamento', true, false, false, false, '2025-10-27 19:50:37.989191+00', '2025-10-27 19:50:37.989191+00'),
	('67c27328-aa73-4597-8489-65e0b3a99b5d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'metalurgica', true, false, false, false, '2025-10-27 19:50:38.5217+00', '2025-10-27 19:50:38.5217+00'),
	('952d16bc-94aa-4642-8ca6-41845abfda45', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'implantacao', true, false, false, false, '2025-10-27 19:50:39.041273+00', '2025-10-27 19:50:39.041273+00'),
	('2086ea10-642c-483c-92c6-8d864256155c', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'usuarios', false, false, false, false, '2025-10-20 23:02:54.840278+00', '2025-10-27 19:45:39.631053+00'),
	('682ad360-f8ad-44e8-a03c-0072fa90414f', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'parceiros', false, false, false, false, '2025-10-20 23:02:56.045003+00', '2025-10-27 19:45:55.908486+00'),
	('0f37abcd-37e8-4452-a8b5-32ab5f8f9585', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'frota', false, false, false, false, '2025-10-20 23:02:58.248478+00', '2025-10-27 19:46:04.770376+00'),
	('d6a7d30c-b599-4922-9af8-2fc316bd174a', '34632fe2-980b-4382-b104-ea244ed586f8', 'usuarios', true, false, false, false, '2025-10-15 18:54:32.573166+00', '2025-10-20 23:42:45.454215+00'),
	('9cd52880-ab0f-4d4c-a6d1-1dd4ea6fb8ed', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materiais_equipamentos', true, true, true, true, '2025-10-20 23:09:05.125008+00', '2025-10-20 23:42:45.628329+00'),
	('221c7279-11f6-45e9-aaf0-b28cb74d082e', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'logistica', false, false, false, false, '2025-10-20 23:02:58.56711+00', '2025-10-27 19:46:06.456683+00'),
	('59151afc-59ed-4650-9478-251b0e935444', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'portal_colaborador', true, true, true, false, '2025-10-21 14:26:39.076635+00', '2025-10-21 14:27:06.771994+00'),
	('72c97aea-fc38-4aa9-b5b9-b4127a7ee5ba', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'projects', true, true, true, true, '2025-10-27 19:50:13.727619+00', '2025-10-27 19:50:13.727619+00'),
	('a3c86f36-5a5b-40c9-bac3-a537df854131', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'cost_centers', true, true, true, true, '2025-10-27 19:50:14.399248+00', '2025-10-27 19:50:14.399248+00'),
	('190942ea-fb02-48f2-b7eb-fecb399ef6a6', '34632fe2-980b-4382-b104-ea244ed586f8', 'companies', true, false, false, false, '2025-10-27 19:50:16.953146+00', '2025-10-27 19:50:16.953146+00'),
	('8abd5cae-6874-4f90-850f-b48d989422ca', '34632fe2-980b-4382-b104-ea244ed586f8', 'partners', true, false, false, false, '2025-10-27 19:50:17.961992+00', '2025-10-27 19:50:17.961992+00'),
	('0ff14f26-8443-4d1e-a6d9-a497e8a26af4', '34632fe2-980b-4382-b104-ea244ed586f8', 'recruitment', true, false, false, false, '2025-10-27 19:50:20.19926+00', '2025-10-27 19:50:20.19926+00'),
	('06d2b50b-4279-472a-a6ba-0ea440178a58', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'companies', true, false, false, false, '2025-10-27 19:50:22.020605+00', '2025-10-27 19:50:22.020605+00'),
	('ac91832c-75f9-4432-bc10-06c4c7d45bb1', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'materials_equipment', true, false, false, false, '2025-10-27 19:50:22.582372+00', '2025-10-27 19:50:22.582372+00'),
	('60b0a0e7-e6f2-40c7-9704-2a6319a95d20', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'partners', true, false, false, false, '2025-10-27 19:50:23.01493+00', '2025-10-27 19:50:23.01493+00'),
	('47ce2e28-0d54-4bdc-b25b-19e856810ab9', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'recruitment', true, false, false, false, '2025-10-27 19:50:25.792894+00', '2025-10-27 19:50:25.792894+00'),
	('993e7167-6b20-46c4-adf3-c87bba3af797', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'users', true, true, true, true, '2025-10-27 19:50:27.430264+00', '2025-10-27 19:50:27.430264+00'),
	('dbd6b2df-9f9f-4387-a243-d83bef40066c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'projects', true, true, true, true, '2025-10-27 19:50:28.024087+00', '2025-10-27 19:50:28.024087+00'),
	('6094b17c-6cbd-47d2-91c8-ba022aab517e', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materials_equipment', true, true, true, true, '2025-10-27 19:50:28.349991+00', '2025-10-27 19:50:28.349991+00'),
	('d3e64a56-d25e-4bc5-a5fa-bdb42db9b574', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cost_centers', true, true, true, true, '2025-10-27 19:50:28.985409+00', '2025-10-27 19:50:28.985409+00'),
	('fa6a2301-640e-4fa6-9872-9d977344c4ec', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'users', true, false, false, false, '2025-10-27 19:50:32.621932+00', '2025-10-27 19:50:32.621932+00'),
	('e9cb67e6-5ed2-4a0c-a232-c00cf6129c9a', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'projects', true, false, false, false, '2025-10-27 19:50:33.286839+00', '2025-10-27 19:50:33.286839+00'),
	('b0a90922-8028-4b5b-9062-59930f9998e8', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'partners', true, false, false, false, '2025-10-27 19:50:33.976691+00', '2025-10-27 19:50:33.976691+00'),
	('bcffc719-64e6-4114-b422-92161f1e22c6', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'cost_centers', true, false, false, false, '2025-10-27 19:50:34.342063+00', '2025-10-27 19:50:34.342063+00'),
	('2e3c6cbb-5511-4d6c-ba83-9d66d0fa0574', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'configuracoes', true, false, false, false, '2025-10-27 19:50:35.105453+00', '2025-10-27 19:50:35.105453+00'),
	('411cd593-dd07-4949-b9c9-a04395422b8d', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'portal_gestor', true, false, false, false, '2025-10-27 19:50:35.69109+00', '2025-10-27 19:50:35.69109+00'),
	('eaa44ffa-1d18-4edc-b268-4fde23503e12', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'compras', true, false, false, false, '2025-10-27 19:50:36.270456+00', '2025-10-27 19:50:36.270456+00'),
	('bba26a20-1bcc-4eeb-8327-ef720998cef0', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'frota', true, false, false, false, '2025-10-27 19:50:36.906357+00', '2025-10-27 19:50:36.906357+00'),
	('8c9e3c19-864f-4348-9a4d-c2eb4d26159b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'rh', true, false, false, false, '2025-10-27 19:50:37.449251+00', '2025-10-27 19:50:37.449251+00'),
	('4f53ec55-b071-4834-9601-7be012b35e0b', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'recruitment', true, false, false, false, '2025-10-27 19:50:37.737667+00', '2025-10-27 19:50:37.737667+00'),
	('378f3851-e49a-4886-8d6e-2d5a7d0c7553', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'combustivel', true, false, false, false, '2025-10-27 19:50:38.258796+00', '2025-10-27 19:50:38.258796+00'),
	('44634695-9ad4-417f-a509-6f8296ecb918', 'cab40b7d-efca-4778-ad7a-528463c338ad', 'comercial', true, false, false, false, '2025-10-27 19:50:38.769689+00', '2025-10-27 19:50:38.769689+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."partners" ("id", "company_id", "tipo", "razao_social", "nome_fantasia", "cnpj", "matriz_id", "endereco", "contato", "ativo", "created_at", "updated_at") VALUES
	('10dda910-e833-4370-bc59-300cf2173456', 'a9784891-9d58-4cc4-8404-18032105c335', '{fornecedor}', 'Teste Razão Social', 'Teste Parceiro', '74154745000187', NULL, NULL, NULL, true, '2025-10-21 14:35:19.914365+00', '2025-10-21 14:35:19.914365+00');


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."projects" ("id", "company_id", "cost_center_id", "nome", "codigo", "ativo", "created_at", "updated_at") VALUES
	('158824b4-b7db-40b9-9f04-2c1ede1f3950', 'a9784891-9d58-4cc4-8404-18032105c335', 'e2a9363d-446b-4af1-a724-b818deeb503d', 'Teste Projeto', '1234', true, '2025-10-21 14:24:34.506224+00', '2025-10-21 14:24:34.506224+00');


--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_companies" ("id", "user_id", "company_id", "profile_id", "ativo", "created_at") VALUES
	('dc6eac5d-6ea7-4bb8-a753-b1a17e0cb00b', 'e745168f-addb-4456-a6fa-f4a336d874ac', 'a9784891-9d58-4cc4-8404-18032105c335', '2242ce27-800c-494e-b7b9-c75cb832aa4d', true, '2025-10-03 21:32:27.311286+00'),
	('f20b4f53-8f59-46a4-871e-9dfbbf7b6208', '5beb4b08-5096-4314-ae54-62f0eb392840', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-21 13:04:30.689984+00'),
	('a78a214f-a464-44b3-94cb-9de5fdf808cd', '444bd5e6-7aaa-42f6-b4c6-d2243c13377e', 'a9784891-9d58-4cc4-8404-18032105c335', 'cab40b7d-efca-4778-ad7a-528463c338ad', true, '2025-10-21 17:45:43.822131+00');


--
-- Name: company_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."company_number_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict UphrYbbDbMWqXKyljk2n3UmfS9ULhn1dmwoWNBzQrmng5VAGNjp23EulSrZW1eB

RESET ALL;
