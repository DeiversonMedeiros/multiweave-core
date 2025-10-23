SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

\restrict c6lkF8m4AAUm8rm72bVkBW1bohVNqRKynZQBpqwM4UH4W1d3R1bp9x56U1MYNMR

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
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "nome", "descricao", "permissoes", "created_at", "updated_at", "is_active") VALUES
	('20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'Administrador', 'Acesso completo ao sistema', '{"admin": true, "all_modules": true}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('34632fe2-980b-4382-b104-ea244ed586f8', 'Gerente', 'Acesso de gerência', '{"manager": true, "view_reports": true}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'Usuário', 'Acesso básico', '{"user": true, "view_only": false}', '2025-10-03 21:23:40.043216+00', '2025-10-03 21:23:40.043216+00', true),
	('2242ce27-800c-494e-b7b9-c75cb832aa4d', 'Super Admin', 'Acesso total ao sistema', '{"admin": true, "all_modules": true}', '2025-10-04 13:33:13.175734+00', '2025-10-04 15:22:40.252923+00', true);


--
-- Data for Name: entity_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."entity_permissions" ("id", "profile_id", "entity_name", "can_read", "can_create", "can_edit", "can_delete", "created_at", "updated_at") VALUES
	('79386cde-7b6c-459e-82e0-48b293ba57d7', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'users', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('6459a74d-518c-4422-b806-911aa832ddee', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'companies', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('5ae12ab1-2829-4e97-a30c-71175ee995f4', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'profiles', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('817ec223-e6fc-4d9a-8514-35b2a524cd76', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'projects', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('471cbf1f-4cd8-4eea-98e4-74ad5625c812', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materials', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('ac37db67-1a89-4914-9b61-e24d9811698d', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'partners', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('9fab920d-3bdf-462b-a57d-e05a1db86a71', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cost_centers', true, true, true, true, '2025-10-04 13:33:37.058081+00', '2025-10-04 13:33:37.058081+00'),
	('cd53e23e-f403-46ee-af52-98651f6b09af', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'periodic_exams', true, true, true, true, '2025-10-11 22:51:53.806373+00', '2025-10-11 22:51:53.806373+00'),
	('7c3876ce-90db-4ca5-ab7f-2bf73636f40a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'periodic_exams', true, true, true, true, '2025-10-11 22:51:53.806373+00', '2025-10-11 22:51:53.806373+00'),
	('e86be6bc-cf7a-4bc6-b6db-0ed527ea08d6', '34632fe2-980b-4382-b104-ea244ed586f8', 'periodic_exams', true, true, true, false, '2025-10-11 22:51:53.806373+00', '2025-10-11 22:51:53.806373+00'),
	('658ad083-e144-4a99-8511-0b880032d4fd', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'periodic_exams', true, false, false, false, '2025-10-11 22:51:53.806373+00', '2025-10-11 22:51:53.806373+00'),
	('9310b30d-9dbb-4e2f-839d-92d7a0baf28f', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'disciplinary_actions', true, true, true, true, '2025-10-12 00:29:45.10982+00', '2025-10-12 00:29:45.10982+00'),
	('526afb9e-9d14-496a-b780-1f291c99787b', '34632fe2-980b-4382-b104-ea244ed586f8', 'disciplinary_actions', true, true, true, false, '2025-10-12 00:29:45.10982+00', '2025-10-12 00:29:45.10982+00'),
	('62007e95-9bcb-4ab5-a2d9-54fcec38e446', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'disciplinary_actions', false, false, false, false, '2025-10-12 00:29:45.10982+00', '2025-10-12 00:29:45.10982+00'),
	('45e2b927-de5a-4e91-92e4-934338ab6804', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'disciplinary_actions', true, true, true, true, '2025-10-12 00:29:45.10982+00', '2025-10-12 00:29:45.10982+00'),
	('e57e4389-d1cc-44d8-985e-184c71d8bfbc', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'trainings', true, true, true, true, '2025-10-12 11:58:29.133938+00', '2025-10-12 11:58:29.133938+00'),
	('904ecce2-0eef-4d96-98f1-fa73acfbe325', '34632fe2-980b-4382-b104-ea244ed586f8', 'trainings', true, true, true, false, '2025-10-12 11:58:29.133938+00', '2025-10-12 11:58:29.133938+00'),
	('7caa7e63-c3c6-458e-8abd-f3d68e05335f', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'trainings', true, false, false, false, '2025-10-12 11:58:29.133938+00', '2025-10-12 11:58:29.133938+00'),
	('f346ddd5-a5c2-46a0-8778-477a7bc4ae90', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'trainings', true, true, true, true, '2025-10-12 11:58:29.133938+00', '2025-10-12 11:58:29.133938+00'),
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
	('bb2e6fee-3543-4e9b-ae2f-fd0884b841d7', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_pagar', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('17808fcf-e803-4857-9a85-11d41e9b80e8', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_receber', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('1bfcdeb6-61b6-4afc-ad82-5fb6b1427989', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'borderos', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('6e32e64b-6e95-4526-a970-3e4dc9721280', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'remessas_bancarias', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('a3abdfed-0d5d-4e05-9bf6-2d7728b5ee69', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'retornos_bancarios', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('b29ab572-c3c9-43d1-a8d6-f1920e416141', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'contas_bancarias', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('eee94a8f-1241-4bc8-ac7e-f4068061dac4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'conciliacoes_bancarias', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('c17062d4-669b-4a2b-ba41-e42d73f08794', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'fluxo_caixa', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('436839e4-de78-44ce-99ea-a4d9767b8546', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfe', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('f4007524-1b0d-4801-9749-2999efdd90af', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'nfse', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('ae4e3e27-da0a-4146-8fd0-1e6b6ac241d2', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'plano_contas', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('5df657f8-e61e-444c-8abf-30caaf4727cf', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'lancamentos_contabeis', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('ea13b7b5-3902-4ca4-ba28-f96bb58fa11c', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'configuracoes_aprovacao', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('8d64c488-2f8c-48a2-aecc-7dc04f2ec9c3', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'aprovacoes', true, false, false, false, '2025-10-14 10:26:04.696868+00', '2025-10-14 10:26:04.696868+00'),
	('c297f5a5-cddc-49f9-89c8-9c965de792e7', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'estoque_atual', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5e128485-8029-4fa5-a97f-fda4e8fe019d', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'movimentacoes_estoque', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('e3b2a021-9b9a-466f-878b-89e3955d7acf', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'entradas_materiais', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('5a548ba3-57f3-4724-8147-b87761cded83', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'entrada_itens', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
	('f27b3163-f376-4d0f-ad56-667eb2b3196c', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'checklist_recebimento', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.607459+00'),
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
	('75700768-1069-4b34-bcfe-2adf36cab9ed', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'solicitacoes_compra', true, true, true, true, '2025-10-14 23:29:32.607459+00', '2025-10-14 23:29:32.661574+00');


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: module_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."module_permissions" ("id", "profile_id", "module_name", "can_read", "can_create", "can_edit", "can_delete", "created_at", "updated_at") VALUES
	('76e60de4-8d38-44b9-9db9-d9715ac94c6c', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'dashboard', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('0c79b88c-1cf7-420f-bf57-83c9bc0a7861', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'users', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('44b6d2d4-e927-4ed8-af2a-6c05c64f4e28', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'companies', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('abe9035f-1479-49bc-9cef-986bf70154f5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'projects', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('790fb87d-32d6-4797-9a46-dcdb7571d411', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'materials', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('6e14639e-90c4-4438-9850-d81066f11243', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'partners', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('808dc6dd-2b72-43d4-9b8c-698e7b4ebd9f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'cost_centers', true, true, true, true, '2025-10-04 13:33:24.583874+00', '2025-10-04 13:33:24.583874+00'),
	('ac3a661c-5a3b-4f16-83a8-08209809900f', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'configuracoes', true, true, true, true, '2025-10-04 15:43:12.157125+00', '2025-10-04 15:43:12.157125+00'),
	('4d91e404-8b44-45a3-9834-d4228f1b4d30', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'configuracoes', true, true, true, true, '2025-10-04 15:43:20.182753+00', '2025-10-04 15:43:20.182753+00'),
	('717c6d7b-9a2b-4d8f-8454-71a45f66bb88', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'users', true, false, false, false, '2025-10-04 15:46:19.490698+00', '2025-10-04 15:46:19.490698+00'),
	('c2aed148-47de-4625-a14b-61bff908a918', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'dashboard', true, true, true, true, '2025-10-04 16:10:13.938451+00', '2025-10-04 16:13:01.058775+00'),
	('7eaa9ee0-a551-4737-942a-d70ee2641e03', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'rh', true, true, true, true, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('34b31638-8803-4ca2-b2df-37734f3c9c1a', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'rh', true, true, true, true, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('07e490fa-db68-4535-ba67-3c4583a78841', '34632fe2-980b-4382-b104-ea244ed586f8', 'rh', true, true, true, false, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('940b88d4-de25-4217-9827-58f3de6245a4', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'rh', true, false, false, false, '2025-10-11 22:51:53.867549+00', '2025-10-11 22:51:53.867549+00'),
	('c1c799d5-ec31-4d00-ba9f-5f627cdf49a5', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'recruitment', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-12 11:13:45.305992+00'),
	('aee9e7e6-f7d7-4d6b-8ad1-268e76825f3a', '34632fe2-980b-4382-b104-ea244ed586f8', 'recruitment', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-12 11:13:45.305992+00'),
	('132ea428-2524-450d-9434-897e041663a5', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'recruitment', true, true, true, true, '2025-10-12 11:13:45.305992+00', '2025-10-12 11:13:45.305992+00'),
	('11fec3b7-7127-4ab4-b4fd-22d59a814111', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'recruitment', true, false, false, false, '2025-10-12 11:13:53.820277+00', '2025-10-12 11:13:53.820277+00'),
	('2b862149-6eb3-480b-94a4-a7da65e3b401', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'treinamento', true, true, true, true, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('964604a4-7199-458c-b6fc-01cf417bde85', '34632fe2-980b-4382-b104-ea244ed586f8', 'treinamento', true, true, true, false, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('a00ddfba-6689-4b53-bb7d-46c1f1767f61', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'treinamento', true, false, false, false, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('5de34c83-9584-47a0-8058-28df3f31c7e4', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'treinamento', true, true, true, true, '2025-10-12 11:58:17.757163+00', '2025-10-12 11:58:17.757163+00'),
	('d8a3b8a0-2788-46c9-bfa8-caf52a6488d8', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'financeiro', true, true, true, true, '2025-10-10 15:42:04.216167+00', '2025-10-14 10:26:04.310494+00'),
	('805bc22a-9519-4ebd-bc7e-524b62915127', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'financeiro', true, true, true, true, '2025-10-14 10:26:04.368669+00', '2025-10-14 10:26:04.368669+00'),
	('5bfe4794-184c-4615-9504-1061e7b4a8ae', '34632fe2-980b-4382-b104-ea244ed586f8', 'financeiro', true, true, true, false, '2025-10-14 10:26:04.420515+00', '2025-10-14 10:26:04.420515+00'),
	('8a9fe3e7-89c0-4a5d-8c3d-53fdfb785d28', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'financeiro', true, false, false, false, '2025-10-14 10:26:04.472562+00', '2025-10-14 10:26:04.472562+00'),
	('d38aecf0-09a5-421b-bc63-5653415869eb', '20bef50d-2e82-4e1c-926d-c47b659e3cfd', 'almoxarifado', true, true, true, true, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('f575bc69-7723-4d54-bf4b-98cd19c9bdc5', '34632fe2-980b-4382-b104-ea244ed586f8', 'almoxarifado', true, true, true, false, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('059a894b-78d6-4eeb-bb37-5b2cb3b9bf63', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', 'almoxarifado', false, false, false, false, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('f8752bbc-01c8-4ae1-92d6-e60d9be9740b', '2242ce27-800c-494e-b7b9-c75cb832aa4d', 'almoxarifado', true, true, true, true, '2025-10-14 23:29:32.553181+00', '2025-10-14 23:29:32.553181+00'),
	('00d4fc0e-9eb2-487c-97ae-b1fe9883d72c', '34632fe2-980b-4382-b104-ea244ed586f8', 'dashboard', false, false, false, false, '2025-10-15 17:37:20.584258+00', '2025-10-15 17:37:22.871721+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "nome", "email", "ativo", "created_at", "updated_at", "company_id") VALUES
	('e745168f-addb-4456-a6fa-f4a336d874ac', 'Deiverson Jorge Honorato Medeiros', 'deiverson.medeiros@estrategicengenharia.com.br', true, '2025-10-03 21:28:18.158356+00', '2025-10-04 16:23:23.061595+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('a1aa1fde-03cb-42b3-bd67-4ac5def143db', 'Teste1', 'teste1@estrategicengenharia.com.br', true, '2025-10-13 18:36:25.124164+00', '2025-10-13 18:45:15.825422+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('3be90091-7fa2-45bd-9555-54fdf167fc1f', 'Teste 2', 'teste2@estrategicengenharia.com.br', true, '2025-10-13 19:04:59.292315+00', '2025-10-13 19:04:59.292315+00', NULL),
	('973e7d99-94f8-4070-bd4f-e018ae92a6fd', 'Teste 6', 'teste6@estrategicengenharia.com.br', true, '2025-10-13 19:12:22.258442+00', '2025-10-13 19:12:22.258442+00', NULL),
	('c732b045-65b9-4cb0-b84b-cfca9987ec6a', 'Teste 4', 'teste4@estrategicengenharia.com.br', true, '2025-10-13 19:03:34.552867+00', '2025-10-13 19:16:52.293047+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('4b3ddff3-505b-4e3d-af3d-0c824c9c7756', 'Teste 5', 'teste5@estrategicengenharia.com.br', true, '2025-10-13 19:17:06.148135+00', '2025-10-13 19:17:06.148135+00', NULL),
	('8d7ad676-3611-4a3c-ae09-f707ebb8d3dc', 'Teste 7', 'teste7@estrategicengenharia.com.br', true, '2025-10-13 19:18:27.999929+00', '2025-10-13 19:18:27.999929+00', NULL),
	('4ef296f5-a364-4da7-a2d6-6450cf81975a', 'Teste 8', 'teste8@estrategicengenharia.com.br', true, '2025-10-13 19:21:24.931004+00', '2025-10-13 19:21:24.931004+00', NULL),
	('aece2423-01c8-4af2-bbed-4b7a1f7be300', 'Teste 9', 'teste9@estrategicengenharia.com.br', true, '2025-10-13 19:28:48.608639+00', '2025-10-13 19:29:44.817958+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('95aff25e-1b9e-416d-87fd-a3f67ea9cc23', 'Teste 10', 'teste10@estrategicengenharia.com.br', true, '2025-10-13 19:30:55.011599+00', '2025-10-13 19:36:56.506566+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('f1a67bda-bd84-40ff-8714-f5db1b62b18d', 'Teste 11', 'teste11@estrategicengenharia.com.br', true, '2025-10-13 19:46:04.496782+00', '2025-10-13 19:48:29.033146+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('42e98858-58ef-47e9-9f0c-64206d665990', 'Teste 12', 'teste12@estrategicengenharia.com.br', true, '2025-10-13 19:49:25.096631+00', '2025-10-13 19:51:19.268703+00', 'a9784891-9d58-4cc4-8404-18032105c335'),
	('90260bc3-dcdd-4905-8bd2-6b94569f5335', 'Teste 13', 'teste13@estrategicengenharia.com.br', true, '2025-10-13 19:52:18.430138+00', '2025-10-13 19:52:18.430138+00', NULL),
	('54cb536b-eb18-484a-b1db-1728ebbad218', 'Teste 14', 'teste14@estrategicengenharia.com.br', true, '2025-10-13 19:56:50.129131+00', '2025-10-13 19:56:50.129131+00', NULL),
	('a2d13349-cc6f-4fdb-8dfc-378326445973', 'Teste 15', 'teste15@estrategicengenharia.com.br', true, '2025-10-13 20:00:20.376702+00', '2025-10-13 20:00:20.376702+00', NULL),
	('83946149-becc-4501-8893-fc5a0decf6d7', 'Teste 16', 'teste16@estrategicengenharia.com.br', true, '2025-10-13 20:23:40.120683+00', '2025-10-13 20:24:55.08584+00', 'a9784891-9d58-4cc4-8404-18032105c335');


--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_companies" ("id", "user_id", "company_id", "profile_id", "ativo", "created_at") VALUES
	('dc6eac5d-6ea7-4bb8-a753-b1a17e0cb00b', 'e745168f-addb-4456-a6fa-f4a336d874ac', 'a9784891-9d58-4cc4-8404-18032105c335', '2242ce27-800c-494e-b7b9-c75cb832aa4d', true, '2025-10-03 21:32:27.311286+00'),
	('575c65e2-bc24-4bb8-9715-2fd0d6726206', 'a1aa1fde-03cb-42b3-bd67-4ac5def143db', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 18:36:25.169413+00'),
	('d54e120c-b187-43c7-b82d-3e0ca5b12eb8', '3be90091-7fa2-45bd-9555-54fdf167fc1f', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:04:59.325434+00'),
	('dba88681-c439-4899-8403-3915a5a34cb0', '973e7d99-94f8-4070-bd4f-e018ae92a6fd', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:12:22.288886+00'),
	('d21e77fc-0206-43df-9564-6e5f9c3888a5', 'c732b045-65b9-4cb0-b84b-cfca9987ec6a', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:16:43.378016+00'),
	('dc7c95d2-302d-49f5-bf2d-ae07cb0d2331', '4b3ddff3-505b-4e3d-af3d-0c824c9c7756', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:17:10.99262+00'),
	('c6ea98cc-d4bd-4092-be45-14ea011352a0', '8d7ad676-3611-4a3c-ae09-f707ebb8d3dc', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:18:28.036784+00'),
	('8afd667e-4395-420e-ac5b-9cbf1a922705', '4ef296f5-a364-4da7-a2d6-6450cf81975a', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:21:24.985754+00'),
	('b5d58328-8a79-4c1a-9eeb-388de632995b', 'aece2423-01c8-4af2-bbed-4b7a1f7be300', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:28:48.650627+00'),
	('109d447f-3cae-4bce-836d-96aac559bda5', '95aff25e-1b9e-416d-87fd-a3f67ea9cc23', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:30:55.058658+00'),
	('38838af9-9cc2-499e-93d5-6dd069b22e5d', 'f1a67bda-bd84-40ff-8714-f5db1b62b18d', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:46:04.534818+00'),
	('70670a48-4412-404a-ba5e-ab7809661150', '42e98858-58ef-47e9-9f0c-64206d665990', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:49:25.134685+00'),
	('3d3d05e6-6905-4063-a24c-4a06ffc25477', '90260bc3-dcdd-4905-8bd2-6b94569f5335', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:52:18.470053+00'),
	('3a3b6049-4b51-44bd-9bb3-a70a8878660e', '54cb536b-eb18-484a-b1db-1728ebbad218', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 19:56:50.172251+00'),
	('162cd297-1866-4838-a25e-6244e219997f', 'a2d13349-cc6f-4fdb-8dfc-378326445973', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 20:00:20.417668+00'),
	('d25e8285-c638-4ed2-bfc4-fdce73f9bfa1', '83946149-becc-4501-8893-fc5a0decf6d7', 'a9784891-9d58-4cc4-8404-18032105c335', '3ce71d8d-c9eb-4b18-9fd4-a72720421441', true, '2025-10-13 20:23:40.153372+00');


--
-- Name: company_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."company_number_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict c6lkF8m4AAUm8rm72bVkBW1bohVNqRKynZQBpqwM4UH4W1d3R1bp9x56U1MYNMR

RESET ALL;
