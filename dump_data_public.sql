--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.5

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
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, endereco, contato, ativo, created_at, updated_at, numero_empresa) FROM stdin;
ce390408-1c18-47fc-bd7d-76379ec488b7	ESTRATEGIC CONSTRUTORA DE EMPREENDIMENTOS E TELECOMUNICACOES LTDA	ESTRATEGIC	16835122000138		{"uf": "BA", "cep": "42827-904", "bairro": "Vila de Abrantes", "cidade": "Camaçari", "numero": "s/n", "logradouro": "Estrada do Coco, km11,5", "complemento": ""}	{"email": "", "telefone": "(71) 3362-6642"}	t	2025-11-10 17:07:56.182367+00	2025-11-10 17:07:56.182367+00	04
a9784891-9d58-4cc4-8404-18032105c335	Empresa Teste	Nova Empresa Teste	11222333000144	6512351	\N	71955557777	t	2025-10-03 21:31:32.06255+00	2025-11-10 17:25:57.352498+00	01
dc060329-50cd-4114-922f-624a6ab036d6	AXISENG LTDA	AXISENG	61876198000166		{"uf": "BA", "cep": "43704-425", "bairro": "Luis Eduardo Magalhaes", "cidade": "Simões Filho", "numero": "292", "logradouro": "R Jubiaba", "complemento": ""}	{"email": "", "telefone": "(71) 3251-8050"}	t	2025-11-06 17:58:19.023499+00	2025-11-10 17:26:03.706087+00	03
f83704f6-3278-4d59-81ca-45925a1ab855	SMARTVIEW RENT LTDA	SMARTVIEW	58066576000131		{"uf": "BA", "cep": "41.611-510", "bairro": "NOVA BRASILIA DE ITAPUA", "cidade": "SALVADOR", "numero": "01", "logradouro": "AV DORIVAL CAYMMI", "complemento": "EDIF VILA EX COMBATENTES"}	{"email": "", "telefone": "(71) 3251-8050"}	t	2025-11-13 20:53:21.781417+00	2025-11-13 20:53:21.781417+00	05
ce92d32f-0503-43ca-b3cc-fb09a462b839	TECHSTEEL METAL LTDA	TECHSTEEL	58335429000110		{"uf": "BA", "cep": "41.611-510", "bairro": "NOVA BRASILIA DE ITAPUA", "cidade": "SALVADOR", "numero": "01", "logradouro": "AV DORIVAL CAYMMI", "complemento": "EDIF VILA EX COMBATENTES LOJA 02"}	{"email": "", "telefone": "(71) 3251-8050"}	t	2025-11-13 20:56:37.052497+00	2025-11-13 20:56:37.052497+00	06
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, nome, email, ativo, created_at, updated_at, company_id, username) FROM stdin;
3f71c8fe-f082-4c13-b4c8-d1e13d1f3f3f	ANTONIO CARLOS BARBOSA FERREIRA	antonio.ferreira@estrategicengenharia.com.br	t	2025-11-12 17:30:08.927748+00	2025-11-17 15:23:24.23319+00	ce390408-1c18-47fc-bd7d-76379ec488b7	antonio.ferreira
83bb4aa0-d75c-4867-b583-0c1d1749a659	DAVID FREITAS MIRANDA	davi.miranda.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:37:29.076077+00	2025-11-17 15:28:02.741803+00	dc060329-50cd-4114-922f-624a6ab036d6	david.miranda
416dc382-f7da-485b-a1db-8a8fb3c29ffa	RAFAELA SANTOS DE SOUZA	rafaela.santos@estrategicengenharia.com.br	t	2025-11-11 13:11:16.825431+00	2025-11-17 15:23:52.816809+00	dc060329-50cd-4114-922f-624a6ab036d6	rafaela.souza
444bd5e6-7aaa-42f6-b4c6-d2243c13377e	Teste Técnico 2	testetecnico2@estrategicengenharia.com.br	t	2025-10-21 17:45:43.767365+00	2025-11-17 15:24:08.834286+00	\N	teste.tecnico2
fb7b5158-8539-4709-b8b9-f7a333378408	EDGAR RAIMUNDO CALASANS PEREIRA JUNIOR	edgar.junior.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:50:40.166573+00	2025-11-17 19:50:40.31234+00	f83704f6-3278-4d59-81ca-45925a1ab855	edgar.junior
4f133391-604b-45f6-9c83-926c1824c353	MARIA GILVANI DOS SANTOS	gilvani.santos@estrategicengenharia.com.br	t	2025-11-11 13:09:38.336068+00	2025-11-17 15:24:17.47492+00	dc060329-50cd-4114-922f-624a6ab036d6	gilvani.santos
4f94dde8-ab89-46e5-8ae1-572f29074ec7	BRUNO DE ALMEIDA DA BOA MORTE	bruno.almeida@estrategicengenharia.com.br	t	2025-11-12 17:31:54.957716+00	2025-11-17 15:24:30.842253+00	ce390408-1c18-47fc-bd7d-76379ec488b7	bruno.boamorte
50668c07-2cdf-4647-940b-6c1ce768a07d	RICARDO RAMOS DOS SANTOS	ricardo.santos.tecnico@estrategicengenharia.com.br	t	2025-11-11 13:12:08.200752+00	2025-11-17 15:24:39.511874+00	dc060329-50cd-4114-922f-624a6ab036d6	ricardo.santos
52838dff-efc6-4e76-91a3-82958d9dce1f	DEBORA SANTINO DA CRUZ	debora.santino@estrategicengenharia.com.br	t	2025-11-12 17:34:29.861784+00	2025-11-17 15:24:49.362847+00	ce390408-1c18-47fc-bd7d-76379ec488b7	debora.santino
660c0755-12c8-4e8b-b357-48a622fec861	ALINE ANDRADE SILVA	aline.andrade@estrategicengenharia.com.br	t	2025-11-12 17:27:36.784672+00	2025-11-17 15:25:40.210897+00	ce390408-1c18-47fc-bd7d-76379ec488b7	aline.andrade
5beb4b08-5096-4314-ae54-62f0eb392840	Teste Técnico	teste.tecnico@estrategicengenharia.com.br	t	2025-10-21 13:04:30.624492+00	2025-11-17 15:24:57.720448+00	\N	teste.tecnico
5e056722-c04c-46d1-877a-0eb653a685bc	JOSIMAR ALVES DA SILVA	josimar.alves.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:55:17.223767+00	2025-11-17 15:25:08.623842+00	dc060329-50cd-4114-922f-624a6ab036d6	josimar.alves
62610ab5-aaa6-495d-9878-d9cc720ada07	ANA PAULA CERQUEIRA DA SILVA	ana.paula@estrategicengenharia.com.br	t	2025-11-11 12:32:53.540321+00	2025-11-17 15:25:29.96919+00	dc060329-50cd-4114-922f-624a6ab036d6	ana.paula
6959a0c9-b7ad-405b-b4e6-e29778cfa353	Teste 1	teste1@estrategicengenharia.com.br	t	2025-11-07 07:46:46.360999+00	2025-11-17 15:25:55.254276+00	a9784891-9d58-4cc4-8404-18032105c335	teste1
69c4c305-37b9-46ac-9ea1-a19d875605fd	LORENA GOMES DA CRUZ	lorena.cruz@estrategicengenharia.com.br	t	2025-11-12 17:39:58.106003+00	2025-11-17 15:26:04.491155+00	ce390408-1c18-47fc-bd7d-76379ec488b7	lorena.cruz
9101cb2b-c74c-4eb0-bc8a-144af58412f8	VITOR ALVES DA COSTA NETO	vitor.neto.tecnico@estrategicengenharia.com.br	t	2025-11-11 13:15:35.921226+00	2025-11-17 15:28:21.73389+00	dc060329-50cd-4114-922f-624a6ab036d6	vitor.neto
70817d7a-e30d-4b04-8441-ae7911e7f896	CLEVISON DOS SANTOS NASCIMENTO	clevison.nascimento@estrategicengenharia.com.br	t	2025-11-12 17:33:10.469741+00	2025-11-17 15:26:26.605727+00	ce390408-1c18-47fc-bd7d-76379ec488b7	clevison.nascimento
745fa94a-4acd-425e-9489-eb99bbabeabb	ALANA PAULA BONFIM DOS SANTOS	alana.bonfim@estrategicengenharia.com.br	t	2025-11-12 17:26:39.262153+00	2025-11-17 15:26:44.384122+00	ce390408-1c18-47fc-bd7d-76379ec488b7	alana.bonfim
830ebc7b-1799-448a-84b4-2414b861abb8	Teste 12	teste12@estrategicengenharia.com.br	t	2025-11-10 20:32:14.73386+00	2025-11-17 15:27:51.189685+00	ce390408-1c18-47fc-bd7d-76379ec488b7	teste12
75f76a4b-5141-4b6a-ab4f-68d729e7a0bc	JOSE GUILHERME DE OLIVEIRA CARVALHO SANTOS	jose.santos.motorista@estrategicengenharia.com.br	t	2025-11-11 12:52:57.986092+00	2025-11-17 15:26:59.51083+00	dc060329-50cd-4114-922f-624a6ab036d6	jose.santos
77ef5ecc-e96e-4963-bbe8-915b83673ada	LOBATO NONATO SOUZA	l.souza@estrategicengenharia.com.br	t	2025-11-12 17:39:25.742106+00	2025-11-17 15:27:26.353705+00	ce390408-1c18-47fc-bd7d-76379ec488b7	l.souza
7b62fd6a-7f50-4298-9ae4-5cb71a03d0ce	CLAUDIO CESAR DE SOUZA SARMENTO	claudio.sarmento.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:35:34.314874+00	2025-11-17 15:27:44.240745+00	dc060329-50cd-4114-922f-624a6ab036d6	claudio.sarmento
8ad9a6f7-0b2d-40d1-8729-4350bb3f025a	BRISA MEIRELES LAGE	brisa.lage@estrategicengenharia.com.br	t	2025-11-11 12:34:48.320706+00	2025-11-17 15:28:11.477387+00	dc060329-50cd-4114-922f-624a6ab036d6	brisa.lage
a878627a-b372-4c5e-a4e8-84068a5bcc72	LAILA DOS SANTOS NOVAES	laila.novaes@estrategicengenharia.com.br	t	2025-11-12 17:38:34.055816+00	2025-11-17 15:29:25.64343+00	ce390408-1c18-47fc-bd7d-76379ec488b7	laila.novaes
a3e6fd42-5c99-4f1e-b3ee-56c47c2baf2b	ANDERSON SOARES DE JESUS	anderson.jesus@estrategicengenharia.com.br	t	2025-11-12 17:29:29.3097+00	2025-11-17 15:28:55.631662+00	ce390408-1c18-47fc-bd7d-76379ec488b7	anderson.jesus
b1ff9309-a096-4580-8b6c-c6e17a848fa0	ANDERSON DA CUNHA NASCIMENTO	anderson.nascimento@estrategicengenharia.com.br	t	2025-11-12 17:28:46.625851+00	2025-11-17 15:29:35.389839+00	ce390408-1c18-47fc-bd7d-76379ec488b7	anderson.nascimento
b29a79e0-6881-4cf4-8a66-f023cc96e064	RAYLAN DA CONCEICAO DA HORA	raylan.dahora@estrategicengenharia.com.br	t	2025-11-10 18:37:36.462272+00	2025-11-17 15:29:55.256953+00	ce390408-1c18-47fc-bd7d-76379ec488b7	raylan.dahora
b5f62f30-6b90-4b49-88a2-95c8cf23017f	DAIANA CONCEICAO CORREIA	daiana.correia@estrategicengenharia.com.br	t	2025-11-10 17:57:40.537356+00	2025-11-17 15:30:04.383738+00	ce390408-1c18-47fc-bd7d-76379ec488b7	daiana.correia
b82e6123-d3a4-4270-bbe4-c48918026c06	DEBORA FERNANDES FERRAGE	debora.ferrage@estrategicengenharia.com.br	t	2025-11-12 17:33:47.261475+00	2025-11-17 15:30:11.993346+00	ce390408-1c18-47fc-bd7d-76379ec488b7	debora.ferrage
c1386a66-0657-4b0e-94a4-eb7e17a06164	ROBSON SOUSA CONCEICAO	robson.conceicao.tecnico@estrategicengenharia.com.br	t	2025-11-11 13:14:49.281119+00	2025-11-17 15:30:21.912728+00	dc060329-50cd-4114-922f-624a6ab036d6	robson.conceicao
c71bce59-cb3c-4719-b4bf-4ccee5db52dc	FREDSON DOS SANTOS LUZ	fredson.luz@estrategicengenharia.com.br	t	2025-11-12 17:35:03.459665+00	2025-11-17 15:30:31.927659+00	ce390408-1c18-47fc-bd7d-76379ec488b7	fredson.luz
cc6da710-3c99-46e5-8694-939a547ab0ec	JAMILE ANDRADE CUNHA SANTOS	jamile.cunha@estrategicengenharia.com.br	t	2025-11-12 17:36:49.764108+00	2025-11-17 15:30:46.287836+00	ce390408-1c18-47fc-bd7d-76379ec488b7	jamile.cunha
e981d612-11f4-4b06-aac0-6cdab0d5f203	CECILIA MARIA CERQUEIRA DE OLIVEIRA	cecilia.oliveira@estrategicengenharia.com.br	t	2025-11-12 17:32:32.681255+00	2025-11-17 15:31:19.645817+00	ce390408-1c18-47fc-bd7d-76379ec488b7	cecilia.oliveira
f8115518-ed60-496b-88e0-dc63221a5186	KELLE IAMIRIS SANTOS BISPO	kelle.bispo@estrategicengenharia.com.br	t	2025-11-11 13:07:12.471457+00	2025-11-17 15:31:39.070214+00	dc060329-50cd-4114-922f-624a6ab036d6	kelle.bispo
fad227bd-1e41-49da-8210-f9b46f367276	MARIO DUARTE	mario.duarte@estrategicengenharia.com.br	t	2025-11-12 17:42:18.851306+00	2025-11-17 15:31:49.269172+00	ce390408-1c18-47fc-bd7d-76379ec488b7	mario.duarte
fed0f623-8713-4054-a17b-84dd9fa1f22c	JONAS DE JESUS SANTOS	jonas.santos.motorista@estrategicengenharia.com.br	t	2025-11-11 12:52:15.743679+00	2025-11-17 15:32:00.360326+00	dc060329-50cd-4114-922f-624a6ab036d6	jonas.santos
e745168f-addb-4456-a6fa-f4a336d874ac	DEIVERSON JORGE HONORATO MEDEIROS	deiverson.medeiros@estrategicengenharia.com.br	t	2025-10-03 21:28:18.158356+00	2025-11-17 15:17:48.158023+00	a9784891-9d58-4cc4-8404-18032105c335	deiverson.medeiros
297f57c0-b558-4dcf-bfc9-ec08b63845db	FAUSTO RODRIGO NASCIMENTO OLIVEIRA	fausto.oliveira@estrategicengenharia.com.br	t	2025-11-11 12:48:10.163869+00	2025-11-17 15:22:29.658077+00	dc060329-50cd-4114-922f-624a6ab036d6	fausto.oliveira
065789b3-c897-4449-82ff-c90a91e20a06	VITOR SANTOS DE JESUS	vitor.santos.motorista@estrategicengenharia.com.br	t	2025-11-11 13:16:28.768114+00	2025-11-17 15:20:43.549848+00	dc060329-50cd-4114-922f-624a6ab036d6	vitor.santos
2da01d46-7395-4ad7-abcd-fc27bb24adec	IANA ANDRADE BATISTA	iana.batista@estrategicengenharia.com.br	t	2025-11-11 12:49:05.766613+00	2025-11-17 15:22:39.525035+00	dc060329-50cd-4114-922f-624a6ab036d6	iana.batista
2db2094f-1990-4822-8199-4c6dabd2b453	KATIA SANTOS DA SILVA	katia.silva@estrategicengenharia.com.br	t	2025-11-11 12:58:54.78089+00	2025-11-17 15:22:47.431967+00	dc060329-50cd-4114-922f-624a6ab036d6	katia.silva
1300f9f0-9290-46c6-b108-afb13443c271	JUSSIARA DE SOUZA VIANA	jussiara.viana@estrategicengenharia.com.br	t	2025-11-11 12:57:29.211837+00	2025-11-17 15:21:26.307571+00	dc060329-50cd-4114-922f-624a6ab036d6	jussiara.viana
36b9788c-44c4-4722-8142-d156f8fa035b	ITALO GEISAN SANTOS DA PAIXAO	italo.paixao.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:50:26.092656+00	2025-11-17 15:23:05.192941+00	dc060329-50cd-4114-922f-624a6ab036d6	italo.paixao
2187fd71-ce7d-463f-9f69-b53e657d7955	DAIANA HONORATO MEDEIROS	daiana.medeiros@estrategicengenharia.com.br	t	2025-11-08 16:32:40.74961+00	2025-11-17 15:22:10.18618+00	dc060329-50cd-4114-922f-624a6ab036d6	daiana.medeiros
33c9e80d-f729-4ced-84a9-32ad1f9549d3	JOSIMAR SANTANA DOS REIS	josimar.silva@estrategicengenharia.com.br	t	2025-11-11 12:56:01.585934+00	2025-11-17 15:22:55.484817+00	dc060329-50cd-4114-922f-624a6ab036d6	josimar.reis
07eea26c-8878-4e7d-a56c-bc7b1173c432	MILTON SANTOS DE SOUSA	milton.sousa.tecnico@estrategicengenharia.com.br	t	2025-11-11 13:17:03.188421+00	2025-11-17 15:20:55.739053+00	dc060329-50cd-4114-922f-624a6ab036d6	milton.sousa
1190a8a2-be78-40f8-a248-e527340a71fb	JOAO VICTOR SILVA NUNES	joao.nunes@estrategicengenharia.com.br	t	2025-11-11 12:51:12.175686+00	2025-11-17 15:21:16.606043+00	dc060329-50cd-4114-922f-624a6ab036d6	joao.nunes
66760b50-1cbe-420d-b0dd-fbd71602a693	EDIELSON ABREU DOS SANTOS	edielson.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:51:15.953816+00	2025-11-17 19:51:16.113258+00	f83704f6-3278-4d59-81ca-45925a1ab855	edielson.santos
40c07e21-d62c-447d-9de6-16622a2d8729	ADENILSON LIMA DOS SANTOS 	adenilson.santos.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:31:53.098624+00	2025-11-17 15:23:36.808887+00	dc060329-50cd-4114-922f-624a6ab036d6	adenilson.santos
25016b5e-5e6e-41bb-ad35-193f5024dbe3	MARCUS VINICIUS ALENCAR DE BURGOS	marcus.burgos@estrategicengenharia.com.br	t	2025-11-12 17:41:38.116314+00	2025-11-17 15:22:20.472512+00	ce390408-1c18-47fc-bd7d-76379ec488b7	marcus.burgos
662a6715-8bb1-47e2-8dec-e42adbabe59a	MARCOS AURELIO DE ANDRADE BATISTA	marcos.batista@estrategicengenharia.com.br	t	2025-11-12 17:40:53.766384+00	2025-11-17 15:25:49.350634+00	ce390408-1c18-47fc-bd7d-76379ec488b7	marcos.batista
a6261b0f-36f6-45f8-b87b-9dce58fc3198	DANIELA ALVES QUEIROZ DE SOUZA	daniela.souza@estrategicengenharia.com.br	t	2025-11-11 12:36:31.466671+00	2025-11-17 15:29:06.077094+00	dc060329-50cd-4114-922f-624a6ab036d6	daniela.souza
6c17feb2-b75a-4c84-a0e6-3e81b2c9407b	ELTON OLIVEIRA DOS SANTOS	elton.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:53:20.256839+00	2025-11-17 19:53:20.428939+00	f83704f6-3278-4d59-81ca-45925a1ab855	elton.santos
3e2c7ef6-4436-4cf4-af3d-1f5620349a03	GENILSON AMORIM DE SOUZA	genilson.souza.tecnico@estrategicengenharia.com.br	t	2025-11-17 15:50:22.877537+00	2025-11-17 15:52:35.18253+00	dc060329-50cd-4114-922f-624a6ab036d6	genilson.souza
0cf2fd55-ce76-4897-8fc6-4eae6957e14b	LUANA DA CRUZ DA SILVA	luana.silva@estrategicengenharia.com.br	t	2025-11-17 20:12:20.26202+00	2025-11-17 20:12:20.439039+00	f83704f6-3278-4d59-81ca-45925a1ab855	luana.silva
b1317785-7651-4e4d-8e33-0dd9a8592efd	ALAN SANTOS DOS SANTOS	alan.santos.tecnico@estrategicnegenharia.com.br	t	2025-11-17 15:57:44.969896+00	2025-11-17 15:59:19.283112+00	dc060329-50cd-4114-922f-624a6ab036d6	alan.santos
245aefda-00d2-4819-9a74-c4e150c7c6fb	RENATO SOUZA CUNHA	renato.cunha.tecnico@estrategicengenharia.com.br	t	2025-11-17 16:06:29.851402+00	2025-11-17 16:06:29.964057+00	dc060329-50cd-4114-922f-624a6ab036d6	renato.cunha
3615605e-b1cf-4e8d-a468-b4784ac4c8c0	ALEXANDRE DE JESUS SANTOS DA SILVA	alexandre.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:45:46.740579+00	2025-11-17 19:45:46.838599+00	f83704f6-3278-4d59-81ca-45925a1ab855	alexandre.silva
497042e0-2153-4ef6-919b-32418d1f2294	ANTONIO CARLOS PORCIUNCULA RANGEL	antonio.ragel.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:47:25.441896+00	2025-11-17 19:47:25.595356+00	f83704f6-3278-4d59-81ca-45925a1ab855	antonio.ragel
46bbdef4-9c0e-44c8-b8d4-a43fe8d12722	CARLOS JOSE SUAREZ PALMERA	carlos.palmera.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:49:27.006433+00	2025-11-17 19:49:27.094992+00	f83704f6-3278-4d59-81ca-45925a1ab855	carlos.palmera
a5a58125-3dab-4862-99cb-c9ab2f1e47e9	CIDIMAR DE SOUZA OLIVEIRA	cidimar.oliveira@estrategicengenharia.com.br	t	2025-11-17 19:50:01.37038+00	2025-11-17 19:50:01.508461+00	f83704f6-3278-4d59-81ca-45925a1ab855	cidimar.oliveira
8c17d9c8-4297-4e80-8fe5-60d71e7e291b	MANOEL DA SILVA SANTOS	manoel.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:13:47.431647+00	2025-11-17 20:13:47.566527+00	f83704f6-3278-4d59-81ca-45925a1ab855	manoel.santos
d41fa983-a756-4228-9b82-4020d7dcba8c	ADRIANO JESUS DA SILVA BARBOSA	adriano.barbosa.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:49:17.395776+00	2025-11-17 20:49:17.502192+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	adriano.barbosa
4a35e536-4966-490d-9512-89c4daea5cfd	ADRIANO MARTINS DA CONCEICAO	adriano.conceicao.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:50:12.372141+00	2025-11-17 20:50:12.529365+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	adriano.conceicao
73ba67b1-a626-46f1-97a0-f383925f705a	ANDERSON CLEITON DA CRUZ LOPES	anderson.lopes.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:50:52.851299+00	2025-11-17 20:50:53.011142+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	anderson.lopes
b5f18c03-d757-4bf3-ba0a-51da1f61ee36	BRUNO LUIS SANTIAGO OLIVEIRA	bruno.oliveira.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:51:36.094372+00	2025-11-17 20:51:36.195914+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	bruno.oliveira
5ffebe72-705e-45c5-83f0-48a999256e39	CHARLES ALVES DOS SANTOS	charles.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:51:59.852335+00	2025-11-17 20:51:59.975366+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	charles.santos
ae4cc578-db65-419c-8118-dc5dbc7e32d9	DANIELA OLIVEIRA NASCIMENTO	daniel.nascimento.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:52:30.965874+00	2025-11-17 20:52:46.565297+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	daniela.nascimento
4b8cecb2-73a0-4a8b-b762-fcfe3cf258bb	DOUGLAS SOUZA SANTOS	douglas.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:54:07.126868+00	2025-11-17 20:54:07.253435+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	douglas.santos
baa5c54c-9beb-48c0-b6a5-1db57e89c7f0	EDVALDO REZENDE DOS SANTOS	edvaldo.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:54:59.560317+00	2025-11-17 20:54:59.683482+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	edvaldo.santos
e6fed591-7f4c-494b-b7b3-2524f1b4c053	EMERSON MANOEL SOUSA SANTANA	emerson.santana@estrategicengenharia.com.br	t	2025-11-17 20:55:50.677491+00	2025-11-17 20:56:12.764912+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	emerson.santana
bb71ca66-6b49-4e95-96bf-f607e94445a3	FLORISVALDO SENA LIMA	florisvaldo.lima.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:57:08.10687+00	2025-11-17 20:57:08.225195+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	florisvaldo.lima
b9d2ee53-facd-4ee7-9a4c-915beadd50a7	FRANCISCO SANTOS DE LIMA	francisco.lima.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:58:07.24446+00	2025-11-17 20:58:07.338896+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	francisco.lima
eb5afe0f-df68-4f95-8f0f-6b604d0514d3	GEAN DA ANUNCIAÇÃO ROCHA	gean.rocha@estrategicengenharia.com.br	t	2025-11-17 20:58:39.893648+00	2025-11-17 20:58:40.029624+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	gean.rocha
587949a0-a20a-4a99-bdcc-257bef2c4065	GENIVALDO SANTOS DA SILVA	genivaldo.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 21:00:22.730973+00	2025-11-17 21:00:22.874886+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	genivaldo.silva
2b8231a5-fac8-4152-a636-539ffcd5af4d	HEBERT CALVACANTE NERY	hebert.nery.tecnico@estrategicengenharia.com.br	t	2025-11-17 21:01:06.997714+00	2025-11-17 21:01:07.09192+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	hebert.nery
3b64e54c-d172-40b9-9cd5-9b8061c95c07	ICARO SANTOS ALVES	icaro.alves@estrategicengenharia.com.br	t	2025-11-17 21:03:44.913081+00	2025-11-17 21:03:45.055151+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	icaro.alves
6d22f435-8d3d-4cbc-88b0-8e3992a4a98d	IDALBERTO DOS SANTOS SILVA	idalberto.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 21:04:20.726007+00	2025-11-17 21:04:20.883075+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	idalberto.silva
8b513e72-d92c-44ed-a5d0-74c124fb0c1f	IVA FARIAS SANTANA JUNIOR	iva.junior.tecnico@estrategicengenharia.com.br	t	2025-11-17 21:04:46.758654+00	2025-11-17 21:04:46.915104+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	iva.junior
ed191236-b71c-419e-b7aa-ad0b47776dab	JEAN GOMES	jean.gomes.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:20:41.353976+00	2025-11-18 14:20:41.477937+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	jean.gomes
17df4d25-3137-4dd3-87a1-730a4a668884	JOAO VICTOR DOS SANTOS DE JESUS	joao.jesus.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:21:16.592134+00	2025-11-18 14:21:16.774865+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	joao.jesus
5150a482-bf49-4ec0-891c-b84e228d3398	JOSE CARLOS JESUS DOS SANTOS	jose.carlos.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:23:55.085552+00	2025-11-18 14:23:55.293446+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	jose.carlos
f408cdd5-717c-466c-8c87-2a774b56053f	JUAREZ MOTA CIRQUEIRA	juarez.cirqueira.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:24:25.752682+00	2025-11-18 14:24:25.852455+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	juarez.cirqueira
049c0717-62a1-47a7-af62-c12d579e4d12	JUTAI FERREIRA	jutai.ferreira.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:26:11.154815+00	2025-11-18 14:26:11.312956+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	jutai.ferreira
dd2870ce-ec5c-4209-b99d-0ca2ca315a82	LAISA MIRANDA DA CRUZ DIAS	laisa.dias@estrategicengenharia.com.br	t	2025-11-18 14:26:50.370671+00	2025-11-18 14:26:50.501461+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	laisa.dias
0ec9819b-945c-4424-ae2e-201f60ea5c94	MARCELO DOS SANTOS DE LIMA	marcelo.lima.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:32:20.026097+00	2025-11-18 14:32:20.114363+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	marcelo.lima
c0439736-4edb-4170-8c8a-547221936b3d	MARCOS MACHADO DOS SANTOS	marcos.santos.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:32:53.063974+00	2025-11-18 14:32:53.189185+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	marcos.santos
0ecc8e9d-8981-4f83-b440-7d4ed744c6cb	MATHEUS SANTOS FREITAS	matheus.freitas@estrategicengenharia.com.br	t	2025-11-18 14:34:25.274526+00	2025-11-18 14:34:25.414939+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	matheus.freitas
4b1d3a84-c5ff-45da-8c0c-5096dcc1e4cd	NANDSON CORREIA LIMA	nandson.lima.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:34:51.289809+00	2025-11-18 14:34:51.374863+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	nandson.lima
f9517ac2-8f13-4be5-95af-ae65c42f0696	PAMELA YASMIM LIMA PINHEIRO	pamela.pinheiro@estrategicengenharia.com.br	t	2025-11-18 14:35:22.524722+00	2025-11-18 14:35:22.666622+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	pamela.pinheiro
967aabaa-3e0e-406e-bc2f-3679673d0dc5	PAULO EDUARDO SILVA DE SENA OLIVEIRA	paulo.oliveira.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:36:01.14665+00	2025-11-18 14:36:01.296128+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	paulo.oliveira
e0d57706-ed52-4a42-90e6-6ef2e7f0c730	RAFAEL ARCANJO NASCIMENTO PASSOS	rafael.passos.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:36:26.880714+00	2025-11-18 14:36:26.971419+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	rafael.passos
769bc18f-b8df-4328-b37f-48af0538945b	TIAGO DE LIMA	tiago.lima.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:38:45.704509+00	2025-11-18 14:38:45.870834+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	tiago.lima
6bc1f0b7-9da2-405c-a625-4f226388c850	EDILSON DE JESUS FERREIRA	edilson.ferreira.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:52:02.210859+00	2025-11-17 19:52:02.352395+00	f83704f6-3278-4d59-81ca-45925a1ab855	edilson.ferreira
7e640212-1eb2-443f-bf6c-26aee5d66624	ENEILSON CUNHA ALMEIDA	eneilson.almeida.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:54:36.358603+00	2025-11-17 19:54:36.495259+00	f83704f6-3278-4d59-81ca-45925a1ab855	eneilson.almeida
6ea3485a-4d7d-43b2-b01a-ba9fe354a84a	JULIELSON SOUZA DA SILVA	julielson.silva.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:56:42.520696+00	2025-11-17 15:26:15.995667+00	dc060329-50cd-4114-922f-624a6ab036d6	julielson.silva
720e3e1b-e4f9-45bb-8f1e-29aa0e711443	Teste 16	teste16@estrategicengenharia.com.br	t	2025-11-17 10:17:50.043199+00	2025-11-17 15:26:34.910411+00	dc060329-50cd-4114-922f-624a6ab036d6	teste16
b182cdc0-058a-43ef-aede-6270f76d58d1	EVERSON GUILHERME BRAGA BARBOSA	everson.barbosa.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:55:13.809114+00	2025-11-17 19:55:13.946574+00	f83704f6-3278-4d59-81ca-45925a1ab855	everson.barbosa
1e3b09e0-38da-4b29-9dea-8be21e94d552	FERNANDO SANTOS CORREIA	fernando.correia.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:55:59.735701+00	2025-11-17 19:55:59.874664+00	f83704f6-3278-4d59-81ca-45925a1ab855	fernando.correia
99f57156-2a71-4f8f-af1c-78ff8e4258dc	GILCIMAR OLIVEIRA DA SILVA	gilcimar.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:56:35.562576+00	2025-11-17 19:56:35.714877+00	f83704f6-3278-4d59-81ca-45925a1ab855	gilcimar.silva
77813097-53ec-40e3-80c5-1d70ae351a85	MICHELON DE JESUS SILVA	michelon.silva@estrategicengenharia.com.br	t	2025-11-12 17:43:13.083498+00	2025-11-17 15:27:15.742421+00	ce390408-1c18-47fc-bd7d-76379ec488b7	michelon.silva
96c6d2df-7b86-4e11-b6fc-d9e4adc8969a	ROGERIO SANTOS DE SOUZA GUIMARAES	rogerio.guimaraes@estrategicengenharia.com.br	t	2025-11-12 17:44:18.20044+00	2025-11-17 15:28:35.356826+00	ce390408-1c18-47fc-bd7d-76379ec488b7	rogerio.guimaraes
400b4066-6cbe-48d6-917e-539dbccaf727	GIVANILDO MOTA CERQUEIRA	givanilso.cerqueira.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:57:09.10299+00	2025-11-17 19:57:09.252248+00	f83704f6-3278-4d59-81ca-45925a1ab855	givanilso.cerqueira
9989e703-ea99-42ac-ab26-77bc46eeed4d	TAILLA CECILIA MATTOS BOMFIM	tailla.bomfim@estrategicengenharia.com.br	t	2025-11-12 17:45:35.705605+00	2025-11-17 15:28:47.163312+00	ce390408-1c18-47fc-bd7d-76379ec488b7	tailla.bomfim
a81daf27-f713-4a6c-9c50-d9c3a4664e51	JANE LILIAN SANTOS DE MIRANDA	jane.miranda@estrategicengenharia.com.br	t	2025-11-12 17:55:24.548812+00	2025-11-17 15:29:13.944815+00	dc060329-50cd-4114-922f-624a6ab036d6	jane.miranda
d34a0b00-c9ec-402a-8b1c-56602a79343b	Teste 14	teste14@estrategicengenharia.com.br	t	2025-11-13 22:49:21.572408+00	2025-11-17 15:30:53.073834+00	dc060329-50cd-4114-922f-624a6ab036d6	teste14
d35e363f-4f7d-4c7b-ac89-96724393c93d	EURICO FELIX BISPO MACHADO	eurico.machado.tecnico@estrategicengenharia.com.br	t	2025-11-11 12:38:28.798983+00	2025-11-17 15:31:03.107418+00	dc060329-50cd-4114-922f-624a6ab036d6	eurico.machado
a9a68604-88e4-465d-86d4-d8a0651ec07a	GUSTAVO DE MIRANDA BORGES	gustavo.borges.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:57:45.53678+00	2025-11-17 19:57:45.705656+00	f83704f6-3278-4d59-81ca-45925a1ab855	gustavo.borges
e0d16164-969e-4fc7-8f13-1689b1d0d813	GUSTAVO DOS SANTOS BOAVENTURA	gustavo.boaventura.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:58:16.497842+00	2025-11-17 19:58:16.647195+00	f83704f6-3278-4d59-81ca-45925a1ab855	gustavo.boaventura
d6ed4799-50f0-40fb-bb8e-e042d53e0017	JUAN CLEVERTON SANTANA DORIA	juan.doria@estrategicengenharia.com.br	t	2025-11-13 11:42:09.121114+00	2025-11-17 15:31:12.161324+00	dc060329-50cd-4114-922f-624a6ab036d6	juan.doria
f0920156-ba6e-4c61-b961-f0143f4b8e10	VINICIUS ANDRADE DE MENDONÇA	vinicius.mendonca@estrategicengenharia.com.br	t	2025-11-12 17:46:08.085643+00	2025-11-17 15:31:29.5734+00	ce390408-1c18-47fc-bd7d-76379ec488b7	vinicius.mendonca
d92b2609-c51f-4e5e-b915-4c4c18d73902	Teste 17	teste17@estrategicengenharia.com.br	t	2025-11-17 10:23:49.166058+00	2025-11-17 15:11:41.689385+00	dc060329-50cd-4114-922f-624a6ab036d6	teste17
092aca0a-4645-4412-ba84-4fa99f68af6e	LUA CAMILLY SANTIAGO DA CONCEICAO FERREIRA	lua.ferreira@estrategicengenharia.com.br	t	2025-11-12 20:45:02.8222+00	2025-11-17 15:21:08.13484+00	ce390408-1c18-47fc-bd7d-76379ec488b7	lua.ferreira
13a3f2b3-578c-4ff0-89a0-3f0e62b205cb	RONALDO MIGUEZ PAIXÃO	ronaldo.miguez@estrategicengenharia.com.br	t	2025-11-12 17:45:03.520178+00	2025-11-17 15:21:35.904039+00	ce390408-1c18-47fc-bd7d-76379ec488b7	ronaldo.miguez
1734493e-ca46-499c-bb7c-587f6cf09292	GILBERTO SANTANA DOS SANTOS	gilberto.santos@estrategicengenharia.com.br	t	2025-11-12 17:35:51.093332+00	2025-11-17 15:21:46.087816+00	ce390408-1c18-47fc-bd7d-76379ec488b7	gilberto.santos
1c8703dd-6a75-48b1-88f0-cbdee90df590	NILDO BARBOZA JUNIOR	nildo.barbosa@estrategicengenharia.com.br	t	2025-11-13 20:59:53.288812+00	2025-11-17 15:21:56.42762+00	f83704f6-3278-4d59-81ca-45925a1ab855	nildo.junior
3d5e636f-8cc5-4b42-8acc-45c7e4a3ba3d	JOELMA SAMPAIO CALDAS	joelma.caldas@estrategicengenharia.com.br	t	2025-11-13 20:58:45.680322+00	2025-11-17 15:23:14.055315+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	joelma.caldas
cf497294-c28d-4146-9676-ed11ccc15886	JAILTON RODRIGUES AMORIM JUNIOR	jailton.junior.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:58:54.135673+00	2025-11-17 19:58:54.274964+00	f83704f6-3278-4d59-81ca-45925a1ab855	jailton.junior
7c7ae614-4228-4ec6-83a3-aa48fe77ff2c	JEAN PABLO FERREIRA PEREIRA	jean.pablo@estrategicengenharia.com.br	t	2025-11-17 15:54:32.175227+00	2025-11-17 15:55:09.775717+00	dc060329-50cd-4114-922f-624a6ab036d6	jean.pablo
93359439-3060-42f6-bcb9-800aed930d6b	JARIZON CERQUEIRA DE ALMEIDA	jarizon.almeira.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:59:37.633708+00	2025-11-17 19:59:37.776951+00	f83704f6-3278-4d59-81ca-45925a1ab855	jarizon.almeira
dc0e8bb9-56d5-465a-b7ee-d89f7f616e45	HELIO RANGEL NETO	helio.neto.tecnico@estrategicengenharia.com.br	t	2025-11-17 16:01:35.348176+00	2025-11-17 16:07:04.758682+00	dc060329-50cd-4114-922f-624a6ab036d6	helio.neto
6c091d7c-5ef9-4e70-b211-bb286dbf0571	JOAO VITOR GOMES DA SILVA	joao.silva@estrategicengenharia.com.br	t	2025-11-17 20:00:24.630834+00	2025-11-17 20:00:24.736898+00	f83704f6-3278-4d59-81ca-45925a1ab855	joao.silva
6496d8a1-3cbf-4884-9be2-997bc16707b6	GABRIEL DE ASSIS REIS	gabriel.reis.tecnico@estartegicengenharia.com.br	t	2025-11-17 16:07:55.955222+00	2025-11-17 16:07:56.108555+00	dc060329-50cd-4114-922f-624a6ab036d6	gabriel.reis
a65feb85-2394-45e5-9478-be8e51e89701	ANDERSON DO NASCIMENTO BISPO DE FREITAS	anderson.freitas.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:46:44.289242+00	2025-11-17 19:46:44.420039+00	f83704f6-3278-4d59-81ca-45925a1ab855	anderson.freitas
cca6ef95-93fd-4dce-a3a9-e30fb39f7182	BARTOLOMEU REIS CONCEICAO JUNIOR	bartolomeu.juniror.tecnico@estrategicengenharia.com.br	t	2025-11-17 19:48:48.117942+00	2025-11-17 19:48:48.251531+00	f83704f6-3278-4d59-81ca-45925a1ab855	bartolomeu.junior
bc3e4abc-23fa-4ef7-88f9-f058e7f5f8b0	JOSE ANTONIO SUAREZ PALMERA	jose.palmera.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:01:03.569156+00	2025-11-17 20:01:03.696926+00	f83704f6-3278-4d59-81ca-45925a1ab855	jose.palmera
979ab652-5acf-41e0-a94b-d098b9c8e81d	LINEILSON SOUZA SILVA	lineilson.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:01:33.902182+00	2025-11-17 20:01:33.995157+00	f83704f6-3278-4d59-81ca-45925a1ab855	lineilson.silva
a75e9919-cd7a-4b87-af98-9ee5cff01208	LUAN CLAUDIO ALVES E SILVA DE ANDRADE LIMA	luan.lima.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:02:12.865032+00	2025-11-17 20:02:12.983799+00	f83704f6-3278-4d59-81ca-45925a1ab855	luan.lima
d8fe3853-a18e-4176-b683-ed1e509ef398	LUIS HENRIQUE NASCIMENTO DOS SANTOS	luis.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:13:15.236753+00	2025-11-17 20:13:15.403063+00	f83704f6-3278-4d59-81ca-45925a1ab855	luis.santos
5de7836f-ac0b-4371-ac16-73e3f97b43ce	MARCELO JESUS DOS SANTOS	marcelo.santos.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:14:31.890024+00	2025-11-17 20:14:32.036377+00	f83704f6-3278-4d59-81ca-45925a1ab855	marcelo.santos
2e60b586-ca07-49c6-b009-2a861f8c1f0f	MARCIO SANTOS CARDIM	marcio.cardim@estrategicengenharia.com.br	t	2025-11-17 20:15:28.382213+00	2025-11-17 20:15:28.542733+00	f83704f6-3278-4d59-81ca-45925a1ab855	marcio.cardim
4f21a826-e659-4791-9239-d7989ec71bae	NELSON COSTA DO NASCIMENTO	nelson.nascimento.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:15:56.551027+00	2025-11-17 20:15:56.671902+00	f83704f6-3278-4d59-81ca-45925a1ab855	nelson.nascimento
55ddcc41-c609-4f2e-99c1-2c54696b66a9	NILDO BARBOZA JUNIOR	nildo.barboza@estrategicengenharia.com.br	t	2025-11-17 20:16:51.020834+00	2025-11-17 20:16:51.157104+00	f83704f6-3278-4d59-81ca-45925a1ab855	nildo.barboza
dc9e01c6-2359-43dd-a51b-16af6c50bc76	OSVALDO JOAQUIM PEREIRA JUNIOR	osvaldo.junior.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:17:30.314871+00	2025-11-17 20:17:30.508032+00	f83704f6-3278-4d59-81ca-45925a1ab855	osvaldo.junior
1d00058f-4486-4cb2-af97-b7e8de1b99cb	REGIVALDO BISPO DE SOUSA	regivaldo.sousa.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:18:09.419507+00	2025-11-17 20:18:09.588115+00	f83704f6-3278-4d59-81ca-45925a1ab855	regivaldo.sousa
8c7abacb-ac8d-42c8-b51c-bf257c4c6498	RIVALDO SANTOS DA HORA	rivaldo.hora.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:18:39.126246+00	2025-11-17 20:18:39.234245+00	f83704f6-3278-4d59-81ca-45925a1ab855	rivaldo.hora
d0f05020-7625-4bc5-a64d-a183eee8063b	UDSON SENA DA CRUZ	udson.cruz.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:19:09.699487+00	2025-11-17 20:19:09.79627+00	f83704f6-3278-4d59-81ca-45925a1ab855	udson.cruz
cb8c449a-cb45-4ec1-a606-544154ed0371	ULISSES TARSIS SANTOS DOS SANTOS	ulisses.santos@estrategicengenharia.com.br	t	2025-11-17 20:20:05.390527+00	2025-11-17 20:20:05.489839+00	f83704f6-3278-4d59-81ca-45925a1ab855	ulisses.santos
27ffe190-d998-4847-8928-c1f728ec1669	DIEGO LIMA DA SILVA	diego.silva.tecnico@estrategicengenharia.com.br	t	2025-11-17 20:53:36.425258+00	2025-11-17 20:53:36.552405+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	diego.silva
ab086526-fb31-4855-a0c0-0a1467c042db	ROBER RIBEIRO DOS SANTOS	rober.santos.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:36:56.177853+00	2025-11-18 14:36:56.258919+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	rober.santos
7952ddc4-daa0-4b26-aa8c-312616c0431e	ROBSON CARVALHO DE SANTANA	robson.santana.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:37:19.595728+00	2025-11-18 14:37:19.68626+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	robson.santana
8bb1fa0f-ce76-4a50-9bc5-cc03a122dec6	RUDIVAL VIEIRA ATAIDE	rudival.ataide.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:37:44.651253+00	2025-11-18 14:37:44.808122+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	rudival.ataide
66052b7d-c679-4943-85f6-ef6b3744094d	SAMUEL BISPO CONCEICAO SANTOS	samuel.santos.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:38:08.962077+00	2025-11-18 14:38:09.211578+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	samuel.santos
5e6d67d1-0475-435b-868e-5fb0df865b6f	WILKER DE SOUZA CALADO	wilker.calado.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:39:17.68294+00	2025-11-18 14:39:17.818839+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	wilker.calado
88afe2f0-0773-49fa-b063-fe4cdd7f66a9	YURI SANTOS E SILVA	yuri.silva.tecnico@estrategicengenharia.com.br	t	2025-11-18 14:39:51.908552+00	2025-11-18 14:39:52.21411+00	ce92d32f-0503-43ca-b3cc-fb09a462b839	yuri.silva
\.


--
-- Data for Name: aprovacoes_unificada; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.aprovacoes_unificada (id, company_id, processo_tipo, processo_id, nivel_aprovacao, aprovador_id, status, data_aprovacao, observacoes, aprovador_original_id, transferido_em, transferido_por, motivo_transferencia, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cost_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cost_centers (id, company_id, nome, codigo, ativo, created_at, updated_at, descricao, tipo, responsavel_id, data_inicio, data_fim, orcamento_anual, observacoes, parent_id) FROM stdin;
e2a9363d-446b-4af1-a724-b818deeb503d	a9784891-9d58-4cc4-8404-18032105c335	Teste Centro de Custo	123	t	2025-10-21 14:23:51.37236+00	2025-10-21 14:23:51.37236+00	\N	outros	\N	\N	\N	\N	\N	\N
21f89e4e-d952-47e6-9919-a4b752c987b6	a9784891-9d58-4cc4-8404-18032105c335	Administrativo	01	t	2025-11-08 15:07:25.909213+00	2025-11-08 15:07:25.909213+00	\N	administrativo	f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb	2025-11-01	\N	\N	\N	\N
e732a198-736a-4818-9f1e-44c988a529f0	a9784891-9d58-4cc4-8404-18032105c335	Financeiro	01.01	t	2025-11-08 15:08:49.241181+00	2025-11-08 15:08:49.241181+00	\N	administrativo	f1a121b9-fdf0-4b15-8162-aaaa0f5a1deb	2025-11-01	\N	\N	\N	21f89e4e-d952-47e6-9919-a4b752c987b6
8717a375-e13a-4354-b110-918c102148c7	dc060329-50cd-4114-922f-624a6ab036d6	Administrativo	01	t	2025-11-08 15:14:50.64853+00	2025-11-08 15:14:50.64853+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	\N
cf5f4f7a-b167-4d13-9bde-81fc0979d6c0	dc060329-50cd-4114-922f-624a6ab036d6	Financeiro	01.01	t	2025-11-08 15:15:18.795949+00	2025-11-08 15:15:18.795949+00	\N	administrativo	\N	\N	2025-11-01	\N	\N	8717a375-e13a-4354-b110-918c102148c7
5d80394c-b1f3-44d4-aafe-f0a2105a6cc6	dc060329-50cd-4114-922f-624a6ab036d6	Qualidade	01.02	t	2025-11-08 15:15:47.220984+00	2025-11-08 15:15:47.220984+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
350d2637-e50e-41b7-8d4b-4913e4535b99	dc060329-50cd-4114-922f-624a6ab036d6	Recursos Humanos	01.03	t	2025-11-08 15:17:58.022213+00	2025-11-08 15:17:58.022213+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
8ad4fe0a-b8d4-4c82-9638-9f93177c7326	dc060329-50cd-4114-922f-624a6ab036d6	Almoxarifado	01.04	t	2025-11-08 15:18:27.769205+00	2025-11-08 15:18:27.769205+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
bfb0b39b-a27d-4bd8-ab8c-0e36111aea49	dc060329-50cd-4114-922f-624a6ab036d6	Compras	01.05	t	2025-11-08 15:19:18.589459+00	2025-11-08 15:19:18.589459+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
8597fb8b-86b5-47aa-8ec5-641e01671e1e	dc060329-50cd-4114-922f-624a6ab036d6	Logística	01.06	t	2025-11-08 15:20:06.135267+00	2025-11-08 15:20:06.135267+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
4b2dbdd2-d324-4332-bacd-ea7821cf78d3	dc060329-50cd-4114-922f-624a6ab036d6	Frota	01.07	t	2025-11-08 15:20:33.143642+00	2025-11-08 15:20:33.143642+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
7bfb8b32-4b84-43a1-a281-12ca9c32b851	dc060329-50cd-4114-922f-624a6ab036d6	Comercial	01.08	t	2025-11-08 15:20:57.446433+00	2025-11-08 15:20:57.446433+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	8717a375-e13a-4354-b110-918c102148c7
1f202131-eb9f-4a0d-9b5e-c9e08984f493	dc060329-50cd-4114-922f-624a6ab036d6	Operacional	02	t	2025-11-08 15:21:26.469744+00	2025-11-08 15:21:26.469744+00	\N	operacional	\N	2025-11-01	\N	\N	\N	\N
e45ea8fa-70bc-4e11-8b13-3afd8dc290fa	dc060329-50cd-4114-922f-624a6ab036d6	Transmissão	02.01	t	2025-11-08 15:22:03.312444+00	2025-11-08 15:22:03.312444+00	\N	operacional	\N	2025-11-01	\N	\N	\N	1f202131-eb9f-4a0d-9b5e-c9e08984f493
9ca6672a-6e66-4e28-8fd9-8e52b6a50f6e	dc060329-50cd-4114-922f-624a6ab036d6	Manutenção	02.01.01	t	2025-11-08 15:23:14.703181+00	2025-11-08 15:23:14.703181+00	\N	operacional	\N	2025-11-01	\N	\N	\N	e45ea8fa-70bc-4e11-8b13-3afd8dc290fa
721014f6-dcab-425e-84f1-d85d54a4e362	dc060329-50cd-4114-922f-624a6ab036d6	Implantação	02.01.02	t	2025-11-08 15:24:14.303883+00	2025-11-08 15:24:14.303883+00	\N	operacional	\N	2025-11-01	\N	\N	\N	e45ea8fa-70bc-4e11-8b13-3afd8dc290fa
a5f5df69-bac6-420e-a188-df62440c6c16	dc060329-50cd-4114-922f-624a6ab036d6	Implantação BA	02.01.02.01	t	2025-11-08 15:25:01.680051+00	2025-11-08 15:25:01.680051+00	\N	operacional	\N	2025-11-01	\N	\N	\N	721014f6-dcab-425e-84f1-d85d54a4e362
ec3cebc2-805d-4803-b86b-6df7dd273b67	dc060329-50cd-4114-922f-624a6ab036d6	Implantação PE	02.01.02.02	t	2025-11-08 15:25:35.40863+00	2025-11-08 15:25:35.40863+00	\N	operacional	\N	2025-11-01	\N	\N	\N	721014f6-dcab-425e-84f1-d85d54a4e362
24bed6cc-d606-49a8-befc-7fe19c93c99b	dc060329-50cd-4114-922f-624a6ab036d6	Empresarial	02.01.03	t	2025-11-08 15:26:14.275673+00	2025-11-08 15:26:14.275673+00	\N	operacional	\N	2025-11-01	\N	\N	\N	e45ea8fa-70bc-4e11-8b13-3afd8dc290fa
61b2ab48-cfb7-4bf8-8b81-d79bd3c8c596	dc060329-50cd-4114-922f-624a6ab036d6	Infraestrutura	02.02	t	2025-11-08 15:27:02.647998+00	2025-11-08 15:27:02.647998+00	\N	operacional	\N	2025-11-01	\N	\N	\N	1f202131-eb9f-4a0d-9b5e-c9e08984f493
43487058-5e9d-49b8-9a3e-ca33627d7bad	dc060329-50cd-4114-922f-624a6ab036d6	Site New	02.02.01	t	2025-11-08 15:27:45.249109+00	2025-11-08 15:27:45.249109+00	\N	operacional	\N	2025-11-01	\N	\N	\N	61b2ab48-cfb7-4bf8-8b81-d79bd3c8c596
bf0580bb-d954-46e7-8d78-b84461926ed8	dc060329-50cd-4114-922f-624a6ab036d6	Rooftop	02.02.02	t	2025-11-08 15:28:34.029645+00	2025-11-08 15:28:34.029645+00	\N	operacional	\N	2025-11-01	\N	\N	\N	61b2ab48-cfb7-4bf8-8b81-d79bd3c8c596
5da35e89-534e-4a6e-8d17-21cb8b7a6953	dc060329-50cd-4114-922f-624a6ab036d6	Proteção	02.02.03	t	2025-11-08 15:29:01.283348+00	2025-11-08 15:29:01.283348+00	\N	operacional	\N	2025-11-01	\N	\N	\N	61b2ab48-cfb7-4bf8-8b81-d79bd3c8c596
e1a5c214-be9c-42e1-92da-f5bb7d98fb80	dc060329-50cd-4114-922f-624a6ab036d6	Manutenção	02.02.04	t	2025-11-08 15:29:26.512723+00	2025-11-08 15:29:26.512723+00	\N	operacional	\N	2025-11-01	\N	\N	\N	61b2ab48-cfb7-4bf8-8b81-d79bd3c8c596
736f6853-67a2-48d0-89ee-852d49dfe3b7	dc060329-50cd-4114-922f-624a6ab036d6	Rede de Acesso	02.03	t	2025-11-08 15:30:10.210786+00	2025-11-08 15:30:10.210786+00	\N	operacional	\N	2025-11-01	\N	\N	\N	1f202131-eb9f-4a0d-9b5e-c9e08984f493
9f67deff-7b27-4cd8-aa4f-0f1f21d41030	dc060329-50cd-4114-922f-624a6ab036d6	SLS Vtal	02.03.01	t	2025-11-08 15:30:57.185511+00	2025-11-08 15:30:57.185511+00	\N	operacional	\N	2025-11-01	\N	\N	\N	736f6853-67a2-48d0-89ee-852d49dfe3b7
a5600f22-3f7d-4c87-af00-eef5300607cb	ce390408-1c18-47fc-bd7d-76379ec488b7	Administrativo	01	t	2025-11-10 18:21:19.119209+00	2025-11-10 18:21:19.119209+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	\N
9a999b2e-9da7-40cd-8845-eaa713d0e7b8	ce390408-1c18-47fc-bd7d-76379ec488b7	Recursos Humanos	01.03	t	2025-11-10 18:21:43.495804+00	2025-11-10 18:21:43.495804+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
edc75154-19f7-4b0e-bb59-89edff9f1772	dc060329-50cd-4114-922f-624a6ab036d6	Vistoria EAF	02.01.04	t	2025-11-08 15:31:23.837336+00	2025-11-11 12:43:21.015487+00	\N	operacional	\N	2025-11-01	\N	\N	\N	e45ea8fa-70bc-4e11-8b13-3afd8dc290fa
cf5e533e-15d1-446e-b8bc-707bf7d6423f	ce390408-1c18-47fc-bd7d-76379ec488b7	Financeiro	01.01	t	2025-11-13 12:42:05.708054+00	2025-11-13 12:42:05.708054+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
b41bf523-a9f1-4e73-961d-576ecf410908	ce390408-1c18-47fc-bd7d-76379ec488b7	Qualidade	01.02	t	2025-11-13 12:42:37.543314+00	2025-11-13 12:42:37.543314+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
c134ecaf-17e4-46ac-ad31-dad77221686d	ce390408-1c18-47fc-bd7d-76379ec488b7	Almoxarido	01.04	t	2025-11-13 12:43:13.378227+00	2025-11-13 12:43:13.378227+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
9e1d8b7d-5550-471e-b134-891551895dca	ce390408-1c18-47fc-bd7d-76379ec488b7	Compras	01.05	t	2025-11-13 12:43:44.901027+00	2025-11-13 12:43:44.901027+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
de047e68-fba9-4d26-9708-540fc9d61856	ce390408-1c18-47fc-bd7d-76379ec488b7	Logística	01.06	t	2025-11-13 12:44:13.576356+00	2025-11-13 12:44:13.576356+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
4f5510b8-0152-4ba4-991d-ffa4e45cf7b9	ce390408-1c18-47fc-bd7d-76379ec488b7	Frota	01.07	t	2025-11-13 12:44:52.057635+00	2025-11-13 12:44:52.057635+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
950325d5-ccc0-440c-ab3e-5c27515ea3b0	ce390408-1c18-47fc-bd7d-76379ec488b7	Comercial	01.08	t	2025-11-13 12:45:20.060906+00	2025-11-13 12:45:20.060906+00	\N	administrativo	\N	2025-11-01	\N	\N	\N	a5600f22-3f7d-4c87-af00-eef5300607cb
9731c5cb-156c-4e17-9c3f-b75cc7b76e5a	ce390408-1c18-47fc-bd7d-76379ec488b7	Operacional	02	t	2025-11-13 12:45:44.090633+00	2025-11-13 12:45:44.090633+00	\N	operacional	\N	2025-11-01	\N	\N	\N	\N
b6bedc56-d215-4f94-a323-adcf30d8b121	ce390408-1c18-47fc-bd7d-76379ec488b7	Transmissão	02.01	t	2025-11-13 13:12:28.147879+00	2025-11-13 13:12:28.147879+00	\N	operacional	\N	2025-11-01	\N	\N	\N	9731c5cb-156c-4e17-9c3f-b75cc7b76e5a
bbd612a1-8d3f-4bfd-9e0f-c11b5d3d6eb2	ce390408-1c18-47fc-bd7d-76379ec488b7	Manutenção	02.01.01	t	2025-11-13 13:13:29.385949+00	2025-11-13 13:13:29.385949+00	\N	operacional	\N	2025-11-01	\N	\N	\N	b6bedc56-d215-4f94-a323-adcf30d8b121
3b4964ff-5f97-4949-a93a-e50cd07a7140	ce390408-1c18-47fc-bd7d-76379ec488b7	Implantação	02.01.02	t	2025-11-13 13:14:16.247437+00	2025-11-13 13:14:16.247437+00	\N	operacional	\N	2025-11-01	\N	\N	\N	b6bedc56-d215-4f94-a323-adcf30d8b121
607f863a-70c6-4d6e-9081-1eca97e0ce79	ce390408-1c18-47fc-bd7d-76379ec488b7	Implantação BA	02.01.02.01	t	2025-11-13 13:14:48.462187+00	2025-11-13 13:14:48.462187+00	\N	operacional	\N	2025-11-01	\N	\N	\N	3b4964ff-5f97-4949-a93a-e50cd07a7140
22bc241f-5d2e-45cb-bf89-5dee972fc554	ce390408-1c18-47fc-bd7d-76379ec488b7	Implantação PE	02.01.02.02	t	2025-11-13 13:15:20.105528+00	2025-11-13 13:15:20.105528+00	\N	operacional	\N	2025-11-01	\N	\N	\N	3b4964ff-5f97-4949-a93a-e50cd07a7140
b3ca6c2d-7690-4d9b-94b0-2ce2dc391f17	ce390408-1c18-47fc-bd7d-76379ec488b7	Empresarial	02.01.03	t	2025-11-13 13:15:50.883876+00	2025-11-13 13:15:50.883876+00	\N	operacional	\N	2025-11-01	\N	\N	\N	b6bedc56-d215-4f94-a323-adcf30d8b121
5e6927fa-6671-41e3-9434-05ddac939cec	ce390408-1c18-47fc-bd7d-76379ec488b7	Vistoria EAF	02.01.04	t	2025-11-13 13:16:24.498131+00	2025-11-13 13:16:24.498131+00	\N	operacional	\N	0025-12-01	\N	\N	\N	b6bedc56-d215-4f94-a323-adcf30d8b121
f529daef-495c-473b-aa4a-a985b24c5e8d	ce390408-1c18-47fc-bd7d-76379ec488b7	Infraestrutura	02.02	t	2025-11-13 13:17:10.355727+00	2025-11-13 13:17:10.355727+00	\N	operacional	\N	2025-11-01	\N	\N	\N	9731c5cb-156c-4e17-9c3f-b75cc7b76e5a
89220715-c77b-4620-a9c5-24f090dd0336	ce390408-1c18-47fc-bd7d-76379ec488b7	New Site	02.02.01	t	2025-11-13 13:17:45.084707+00	2025-11-13 13:17:45.084707+00	\N	operacional	\N	2025-11-01	\N	\N	\N	f529daef-495c-473b-aa4a-a985b24c5e8d
c6bd0a45-1411-4e24-8134-f894825b7423	ce390408-1c18-47fc-bd7d-76379ec488b7	Rooftop	02.02.02	t	2025-11-13 13:18:27.295648+00	2025-11-13 13:18:27.295648+00	\N	operacional	\N	2025-11-01	\N	\N	\N	f529daef-495c-473b-aa4a-a985b24c5e8d
4c98af02-0b14-47bb-b696-1c30788c1a37	ce390408-1c18-47fc-bd7d-76379ec488b7	Proteção	02.02.03	t	2025-11-13 13:18:52.888206+00	2025-11-13 13:18:52.888206+00	\N	operacional	\N	2025-11-01	\N	\N	\N	f529daef-495c-473b-aa4a-a985b24c5e8d
707e9025-16e5-40b7-b52f-fd8668d6aeca	ce390408-1c18-47fc-bd7d-76379ec488b7	Manutenção	02.02.04	t	2025-11-13 13:19:29.95159+00	2025-11-13 13:19:29.95159+00	\N	operacional	\N	2025-11-01	\N	\N	\N	f529daef-495c-473b-aa4a-a985b24c5e8d
126604a7-31f2-4ce8-8c12-fb6cebb10a2b	ce390408-1c18-47fc-bd7d-76379ec488b7	Rede de Acesso	02.03	t	2025-11-13 13:20:08.736844+00	2025-11-13 13:20:08.736844+00	\N	operacional	\N	2025-11-01	\N	\N	\N	9731c5cb-156c-4e17-9c3f-b75cc7b76e5a
eb202647-44d1-4b2e-b487-342100c841ee	ce390408-1c18-47fc-bd7d-76379ec488b7	SLS Vtal	02.03.01	t	2025-11-13 13:20:39.315726+00	2025-11-13 13:20:39.315726+00	\N	operacional	\N	2025-11-01	\N	\N	\N	126604a7-31f2-4ce8-8c12-fb6cebb10a2b
\.


--
-- Data for Name: configuracoes_aprovacao_unificada; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracoes_aprovacao_unificada (id, company_id, processo_tipo, centro_custo_id, departamento, classe_financeira, usuario_id, valor_limite, nivel_aprovacao, aprovadores, ativo, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: entity_ownership_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entity_ownership_config (id, entity_name, schema_name, table_name, enforce_ownership, enforce_cost_center, ownership_field, cost_center_field, description, created_at, updated_at) FROM stdin;
c5316fb6-61a3-4728-83cb-745489f658d4	requisicoes_compra	compras	requisicoes_compra	t	t	created_by	centro_custo_id	Requisições de compra - restrito por criador e centro de custo	2025-11-16 10:44:20.855105+00	2025-11-16 10:44:20.855105+00
e45c54c2-5e55-4757-a028-37ac3bcec683	contas_pagar	financeiro	contas_pagar	t	t	created_by	centro_custo_id	Contas a pagar - restrito por criador e centro de custo	2025-11-16 10:44:20.855105+00	2025-11-16 10:44:20.855105+00
d7f52671-122d-459d-93f9-3a65f3ab437d	transferencias	almoxarifado	transferencias	t	t	solicitante_id	\N	Transferências de materiais - restrito por criador e centro de custo dos itens	2025-11-16 10:44:20.855105+00	2025-11-16 10:44:20.855105+00
e2ed0a71-677f-4efb-b7cb-2bea852e9367	solicitacoes_saida_materiais	public	solicitacoes_saida_materiais	t	t	funcionario_solicitante_id	centro_custo_id	Solicitações de saída de materiais - restrito por solicitante e centro de custo	2025-11-16 11:22:24.424844+00	2025-11-16 11:22:31.021352+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, nome, descricao, permissoes, created_at, updated_at, is_active) FROM stdin;
2242ce27-800c-494e-b7b9-c75cb832aa4d	Super Admin	Acesso total ao sistema	{"admin": true, "all_modules": true}	2025-10-04 13:33:13.175734+00	2025-10-04 15:22:40.252923+00	t
cab40b7d-efca-4778-ad7a-528463c338ad	Teste Perfil	Teste de descrição de perfil	{}	2025-10-21 14:26:02.439504+00	2025-10-21 14:26:02.439504+00	t
8fe0f2a9-39b5-492b-8e57-70ed716c36fa	RHU - Gestor de Ponto		{}	2025-11-08 15:43:58.70042+00	2025-11-08 15:43:58.70042+00	t
f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	Gestor		{}	2025-11-11 12:33:51.458183+00	2025-11-11 12:33:51.458183+00	t
3ce71d8d-c9eb-4b18-9fd4-a72720421441	Colaborador	Acesso básico	{"user": true, "view_only": false}	2025-10-03 21:23:40.043216+00	2025-11-17 19:40:49.073485+00	t
\.


--
-- Data for Name: entity_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) FROM stdin;
d9d0d1b9-d88b-44c5-8ddf-002588172105	cab40b7d-efca-4778-ad7a-528463c338ad	registros_ponto	t	t	t	f	2025-10-21 14:27:38.680832+00	2025-10-21 14:27:41.003031+00
9716a12f-d7f6-4409-86ef-16d141f6e2b8	cab40b7d-efca-4778-ad7a-528463c338ad	acoes_disciplinares	t	f	f	f	2025-10-21 14:31:21.009399+00	2025-10-21 14:31:46.286811+00
8d64c488-2f8c-48a2-aecc-7dc04f2ec9c3	3ce71d8d-c9eb-4b18-9fd4-a72720421441	aprovacoes	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:11.279135+00
ea13b7b5-3902-4ca4-ba28-f96bb58fa11c	3ce71d8d-c9eb-4b18-9fd4-a72720421441	configuracoes_aprovacao	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:13.007494+00
5df657f8-e61e-444c-8abf-30caaf4727cf	3ce71d8d-c9eb-4b18-9fd4-a72720421441	lancamentos_contabeis	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:14.060598+00
ae4e3e27-da0a-4146-8fd0-1e6b6ac241d2	3ce71d8d-c9eb-4b18-9fd4-a72720421441	plano_contas	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:15.306158+00
f4007524-1b0d-4801-9749-2999efdd90af	3ce71d8d-c9eb-4b18-9fd4-a72720421441	nfse	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:16.462745+00
436839e4-de78-44ce-99ea-a4d9767b8546	3ce71d8d-c9eb-4b18-9fd4-a72720421441	nfe	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:17.567107+00
c17062d4-669b-4a2b-ba41-e42d73f08794	3ce71d8d-c9eb-4b18-9fd4-a72720421441	fluxo_caixa	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:19.464703+00
eee94a8f-1241-4bc8-ac7e-f4068061dac4	3ce71d8d-c9eb-4b18-9fd4-a72720421441	conciliacoes_bancarias	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:21.491189+00
b29ab572-c3c9-43d1-a8d6-f1920e416141	3ce71d8d-c9eb-4b18-9fd4-a72720421441	contas_bancarias	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:22.439476+00
a3abdfed-0d5d-4e05-9bf6-2d7728b5ee69	3ce71d8d-c9eb-4b18-9fd4-a72720421441	retornos_bancarios	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:24.395972+00
6e32e64b-6e95-4526-a970-3e4dc9721280	3ce71d8d-c9eb-4b18-9fd4-a72720421441	remessas_bancarias	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:28.070435+00
1bfcdeb6-61b6-4afc-ad82-5fb6b1427989	3ce71d8d-c9eb-4b18-9fd4-a72720421441	borderos	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:29.821593+00
17808fcf-e803-4857-9a85-11d41e9b80e8	3ce71d8d-c9eb-4b18-9fd4-a72720421441	contas_receber	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-10-27 19:48:31.036586+00
f82823f8-8b3b-43ba-9e9f-44a62fd3394d	2242ce27-800c-494e-b7b9-c75cb832aa4d	contas_pagar	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
4b7fd8ab-a507-4d2c-9b99-fc580a6939a5	2242ce27-800c-494e-b7b9-c75cb832aa4d	contas_receber	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
3008485f-d1fc-4b41-9416-718ce38ea8ab	2242ce27-800c-494e-b7b9-c75cb832aa4d	borderos	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
55138ec3-3eb9-45ec-a868-c8df8c1de1d5	2242ce27-800c-494e-b7b9-c75cb832aa4d	remessas_bancarias	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
40106c9f-fe63-45b0-b759-ee9ae57e4ac6	2242ce27-800c-494e-b7b9-c75cb832aa4d	retornos_bancarios	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
10f90440-9761-47a3-90aa-ee10675f93ac	2242ce27-800c-494e-b7b9-c75cb832aa4d	contas_bancarias	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
c1644b76-9097-4b91-8d61-5b1ce4c712fa	2242ce27-800c-494e-b7b9-c75cb832aa4d	conciliacoes_bancarias	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
4d151ef5-a0b9-4b35-885c-1baa058663a0	2242ce27-800c-494e-b7b9-c75cb832aa4d	fluxo_caixa	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
d042a8af-a0b4-48c0-8000-379adf9b42ca	2242ce27-800c-494e-b7b9-c75cb832aa4d	nfe	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
7212d5f6-3a27-4a80-a382-0bbcd1f96151	2242ce27-800c-494e-b7b9-c75cb832aa4d	nfse	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
c92a7ea7-d488-4b80-b54f-8862f3d32c30	2242ce27-800c-494e-b7b9-c75cb832aa4d	plano_contas	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
a4404434-ed94-473c-b954-c56c13096b74	2242ce27-800c-494e-b7b9-c75cb832aa4d	lancamentos_contabeis	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
05c7ac3c-f0f1-4890-beac-444f7986c3eb	2242ce27-800c-494e-b7b9-c75cb832aa4d	configuracoes_aprovacao	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
00a21765-a42e-4544-b42f-f7728c021ae0	2242ce27-800c-494e-b7b9-c75cb832aa4d	aprovacoes	t	t	t	t	2025-10-14 10:26:04.532644+00	2025-10-14 10:26:04.532644+00
8c5866b7-a30d-4697-bba9-9bc25d41f0b5	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	registros_ponto	t	t	t	f	2025-11-11 13:18:27.773998+00	2025-11-11 13:18:32.751692+00
13c9e904-4b14-413b-88e4-1746f7c5ba0f	2242ce27-800c-494e-b7b9-c75cb832aa4d	inss_brackets	t	t	t	t	2025-11-13 13:23:07.677992+00	2025-11-13 13:23:10.833862+00
33eb9565-6bcd-4983-a886-e45c870a1f92	2242ce27-800c-494e-b7b9-c75cb832aa4d	absence_types	t	t	t	t	2025-11-13 13:23:32.644717+00	2025-11-13 13:23:36.107211+00
daf34723-0e53-4736-9644-39b35e9906d8	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	disciplinary_actions	f	f	f	f	2025-11-11 13:19:00.369391+00	2025-11-11 13:20:02.51718+00
ac5b38e7-f96f-4633-9c59-467c12406f4b	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	periodic_exams	f	f	f	f	2025-11-11 13:18:40.689562+00	2025-11-11 13:20:06.08185+00
51a250ed-1183-4c9f-80bf-4a71a804b55b	2242ce27-800c-494e-b7b9-c75cb832aa4d	deficiency_types	t	t	t	t	2025-11-13 13:23:48.596451+00	2025-11-13 13:23:52.649128+00
6d76c760-c235-4e72-b0c1-3890ba6237ec	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	irrf_brackets	t	t	t	t	2025-11-12 20:31:37.829844+00	2025-11-12 20:31:43.276889+00
b68640a9-e913-4fc8-ba7a-a9b3c9bcce17	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	cid_codes	t	t	t	t	2025-11-12 20:32:40.983263+00	2025-11-12 20:35:33.257936+00
33636094-6b4d-490f-b581-4c8e6c6620ec	2242ce27-800c-494e-b7b9-c75cb832aa4d	unions	t	t	t	t	2025-11-13 13:24:07.836514+00	2025-11-13 13:24:14.375558+00
e5938ad2-5eb9-412d-a252-4dbbde898ad6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	medical_plans	t	t	t	t	2025-11-12 20:35:51.564096+00	2025-11-12 20:35:54.965046+00
bb2e6fee-3543-4e9b-ae2f-fd0884b841d7	3ce71d8d-c9eb-4b18-9fd4-a72720421441	contas_pagar	f	f	f	f	2025-10-14 10:26:04.696868+00	2025-11-02 09:04:37.346655+00
df654930-5f04-4b20-9db5-5e715e6e13ea	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	event_consolidation	t	t	t	t	2025-11-12 20:36:16.227511+00	2025-11-12 20:36:21.030662+00
1a74ba09-82c4-4ac2-9c77-45789a61b976	2242ce27-800c-494e-b7b9-c75cb832aa4d	event_consolidation	t	t	t	t	2025-11-13 13:24:20.805023+00	2025-11-13 13:24:27.663981+00
471cbf1f-4cd8-4eea-98e4-74ad5625c812	2242ce27-800c-494e-b7b9-c75cb832aa4d	materials_equipment	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:09:05.011423+00
79386cde-7b6c-459e-82e0-48b293ba57d7	2242ce27-800c-494e-b7b9-c75cb832aa4d	usuarios	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.48837+00
6459a74d-518c-4422-b806-911aa832ddee	2242ce27-800c-494e-b7b9-c75cb832aa4d	empresas	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.548438+00
5ae12ab1-2829-4e97-a30c-71175ee995f4	2242ce27-800c-494e-b7b9-c75cb832aa4d	perfis	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.615362+00
817ec223-e6fc-4d9a-8514-35b2a524cd76	2242ce27-800c-494e-b7b9-c75cb832aa4d	projetos	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.672392+00
7caa7e63-c3c6-458e-8abd-f3d68e05335f	3ce71d8d-c9eb-4b18-9fd4-a72720421441	treinamentos	t	f	f	f	2025-10-12 11:58:29.133938+00	2025-10-27 19:53:09.363594+00
ac37db67-1a89-4914-9b61-e24d9811698d	2242ce27-800c-494e-b7b9-c75cb832aa4d	parceiros	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.815273+00
9fab920d-3bdf-462b-a57d-e05a1db86a71	2242ce27-800c-494e-b7b9-c75cb832aa4d	centros_custo	t	t	t	t	2025-10-04 13:33:37.058081+00	2025-10-20 23:42:44.872079+00
cd53e23e-f403-46ee-af52-98651f6b09af	2242ce27-800c-494e-b7b9-c75cb832aa4d	exames_periodicos	t	t	t	t	2025-10-11 22:51:53.806373+00	2025-10-20 23:42:45.272349+00
45e2b927-de5a-4e91-92e4-934338ab6804	2242ce27-800c-494e-b7b9-c75cb832aa4d	acoes_disciplinares	t	t	t	t	2025-10-12 00:29:45.10982+00	2025-10-20 23:42:45.337903+00
f346ddd5-a5c2-46a0-8778-477a7bc4ae90	2242ce27-800c-494e-b7b9-c75cb832aa4d	treinamentos	t	t	t	t	2025-10-12 11:58:29.133938+00	2025-10-20 23:42:45.396867+00
bffeb909-35b4-4bbf-af71-2faf8822265a	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	payroll_calculation	t	t	t	t	2025-11-12 20:36:11.920943+00	2025-11-12 20:36:14.938336+00
f5562413-2034-4676-b89a-9f2a3e211162	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	time_records	f	f	f	f	2025-11-11 13:18:28.710091+00	2025-11-11 13:22:51.11106+00
ff9dfd77-dbf6-4fb2-a2fa-6a141d116592	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	allowance_types	t	t	t	t	2025-11-12 20:35:35.939611+00	2025-11-12 20:35:38.853344+00
1f0f5fcf-5034-4da2-a0c5-306df9f343d4	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	vacations	f	f	f	f	2025-11-11 13:18:34.94713+00	2025-11-11 13:20:13.619021+00
1ec69dc7-164b-4203-b4ed-9aedba691a06	3ce71d8d-c9eb-4b18-9fd4-a72720421441	disciplinary_actions	f	f	f	f	2025-11-02 09:28:34.832314+00	2025-11-11 13:23:14.396206+00
4391b568-aa08-4aeb-b626-ed1cd3ca7cee	2242ce27-800c-494e-b7b9-c75cb832aa4d	cid_codes	t	t	t	t	2025-11-13 13:23:37.634549+00	2025-11-13 13:23:42.468332+00
5de6c660-25fd-4d18-9c49-291522835d6d	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	employee_medical_plans	t	t	t	t	2025-11-12 20:35:56.03688+00	2025-11-12 20:35:58.900735+00
0a7da570-ec45-4a09-b1bb-caa16f19df78	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	fgts_config	t	t	t	t	2025-11-12 20:31:45.251113+00	2025-11-12 20:31:49.140909+00
39cb33f2-4bea-4bda-af2c-a8ca695f27ea	3ce71d8d-c9eb-4b18-9fd4-a72720421441	estoque_atual	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
f9384cee-c475-4cfa-8c75-7f45cbb1e355	3ce71d8d-c9eb-4b18-9fd4-a72720421441	movimentacoes_estoque	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
cccd695c-bd9b-49d1-b30c-d835b3180d10	3ce71d8d-c9eb-4b18-9fd4-a72720421441	entradas_materiais	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
36b9a933-62dc-4a78-8393-bc2b570870b2	3ce71d8d-c9eb-4b18-9fd4-a72720421441	entrada_itens	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
15bd18e5-42a5-4af4-8a86-9aa187629e18	3ce71d8d-c9eb-4b18-9fd4-a72720421441	checklist_recebimento	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
b7df89ce-38f1-42b6-b96c-706dc4c0c2a0	3ce71d8d-c9eb-4b18-9fd4-a72720421441	transferencias	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
997695fd-6c03-4099-9476-a07d48c48ee1	3ce71d8d-c9eb-4b18-9fd4-a72720421441	transferencia_itens	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
e931dc86-e342-4573-8c9d-b8212798333f	3ce71d8d-c9eb-4b18-9fd4-a72720421441	inventarios	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
01069dc8-2864-4257-8f60-49e4990fa7f2	3ce71d8d-c9eb-4b18-9fd4-a72720421441	inventario_itens	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
5101fd1f-27b5-4904-a2e3-7c3581980ddc	2242ce27-800c-494e-b7b9-c75cb832aa4d	estoque_atual	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
3bd3a407-3b10-490a-99e6-1d5e050e3696	2242ce27-800c-494e-b7b9-c75cb832aa4d	movimentacoes_estoque	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
2339a904-4053-4c43-9e38-433892c805e2	2242ce27-800c-494e-b7b9-c75cb832aa4d	entradas_materiais	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
c5dd1600-b3e8-4718-99db-813277e03489	2242ce27-800c-494e-b7b9-c75cb832aa4d	entrada_itens	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
7e9ed6d2-4df3-4e78-8fca-ffddc73cb3fc	2242ce27-800c-494e-b7b9-c75cb832aa4d	checklist_recebimento	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
64789819-fdd1-4233-b686-0933b853dfcc	2242ce27-800c-494e-b7b9-c75cb832aa4d	transferencias	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
bc754240-1766-406e-a337-193e21308068	2242ce27-800c-494e-b7b9-c75cb832aa4d	transferencia_itens	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
5a85e025-c78b-4c55-a058-486b3dfbffa8	2242ce27-800c-494e-b7b9-c75cb832aa4d	inventarios	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
0f7a50f0-5d5d-4262-bffc-da87a837320e	2242ce27-800c-494e-b7b9-c75cb832aa4d	inventario_itens	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.607459+00
a51f9865-7552-49b1-97e8-6d2c1ceed913	3ce71d8d-c9eb-4b18-9fd4-a72720421441	almoxarifados	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
5b710956-9b71-4804-87cb-ba12321a8518	2242ce27-800c-494e-b7b9-c75cb832aa4d	almoxarifados	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
e8f22eb5-01aa-40aa-a13c-dbcf87c31fe0	2242ce27-800c-494e-b7b9-c75cb832aa4d	irrf_brackets	t	t	t	t	2025-11-13 13:23:17.45782+00	2025-11-13 13:23:21.397303+00
f1876ab7-8e39-4d0a-8444-603842bfdc95	3ce71d8d-c9eb-4b18-9fd4-a72720421441	materiais_equipamentos	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
35f6e2cf-5c14-4916-bb24-852e4f390e9a	2242ce27-800c-494e-b7b9-c75cb832aa4d	materiais_equipamentos	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
c867e122-acb2-4465-bc7e-1d4b9d8aeb57	3ce71d8d-c9eb-4b18-9fd4-a72720421441	time_records	t	t	t	f	2025-11-02 09:14:07.657466+00	2025-11-17 13:36:05.95999+00
85ad8c1a-e2e5-4526-9796-7fc7cf74f1d4	3ce71d8d-c9eb-4b18-9fd4-a72720421441	solicitacoes_compra	f	f	f	f	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
75700768-1069-4b34-bcfe-2adf36cab9ed	2242ce27-800c-494e-b7b9-c75cb832aa4d	solicitacoes_compra	t	t	t	t	2025-10-14 23:29:32.607459+00	2025-10-14 23:29:32.661574+00
16b735a0-0f62-4f64-9fb7-50e07f34dbfb	3ce71d8d-c9eb-4b18-9fd4-a72720421441	holidays	f	f	f	f	2025-10-21 20:41:08.897551+00	2025-10-21 20:41:08.897551+00
09f9cde2-208b-45aa-88d7-27dbc18ea2f2	cab40b7d-efca-4778-ad7a-528463c338ad	ferias	t	t	t	f	2025-10-21 14:31:06.068845+00	2025-10-21 14:31:10.662644+00
f92b5013-b6f4-4b8b-99c2-e5cb2bc2bb27	cab40b7d-efca-4778-ad7a-528463c338ad	treinamentos	t	f	f	f	2025-10-21 14:33:59.637101+00	2025-10-21 14:33:59.637101+00
6f10a6c5-277a-479f-8726-052ae22ac9c8	2242ce27-800c-494e-b7b9-c75cb832aa4d	holidays	t	t	t	t	2025-10-21 20:41:08.897551+00	2025-10-21 20:41:08.897551+00
4a53d78c-4368-4964-9a9e-51ca1907ac2e	2242ce27-800c-494e-b7b9-c75cb832aa4d	funcionarios	t	t	t	t	2025-10-15 18:50:53.072005+00	2025-10-20 23:42:44.987204+00
b49503b3-a2e8-4142-9edd-1ecae4627a84	cab40b7d-efca-4778-ad7a-528463c338ad	holidays	f	f	f	f	2025-10-21 20:41:08.897551+00	2025-10-21 20:41:08.897551+00
8f0700ae-ba77-4435-ba37-1a5740fa7e0a	cab40b7d-efca-4778-ad7a-528463c338ad	empresas	t	f	f	f	2025-10-27 19:52:15.326632+00	2025-10-27 19:52:15.326632+00
5fe6138f-e4e3-4295-a3ec-7e3719e68b2b	cab40b7d-efca-4778-ad7a-528463c338ad	materiais_equipamentos	t	f	f	f	2025-10-27 19:52:16.17948+00	2025-10-27 19:52:16.17948+00
478aa6d9-3320-4967-ade0-2cb3b9aebe58	cab40b7d-efca-4778-ad7a-528463c338ad	funcionarios	t	f	f	f	2025-10-27 19:52:17.350579+00	2025-10-27 19:52:17.350579+00
e0ae1ac8-eb49-4aeb-93ca-454a1e22ef2d	cab40b7d-efca-4778-ad7a-528463c338ad	borderos	t	f	f	f	2025-10-27 19:52:19.594414+00	2025-10-27 19:52:19.594414+00
b51dd2e8-a3fe-4cd2-bd52-f33f75ba5c20	cab40b7d-efca-4778-ad7a-528463c338ad	contas_bancarias	t	f	f	f	2025-10-27 19:52:20.405292+00	2025-10-27 19:52:20.405292+00
33927367-8942-49bf-86ba-743fb014fd7f	cab40b7d-efca-4778-ad7a-528463c338ad	nfse	t	f	f	f	2025-10-27 19:52:21.481828+00	2025-10-27 19:52:21.481828+00
c2d116b8-bbff-45c2-bc28-9ced5191d559	cab40b7d-efca-4778-ad7a-528463c338ad	configuracoes_aprovacao	t	f	f	f	2025-10-27 19:52:22.274546+00	2025-10-27 19:52:22.274546+00
3f684e59-b49a-4640-a074-1392dbf8d3c5	cab40b7d-efca-4778-ad7a-528463c338ad	entradas_materiais	t	f	f	f	2025-10-27 19:52:23.338722+00	2025-10-27 19:52:23.338722+00
f64722b3-f69e-4e70-9d78-a903dd0c81e1	cab40b7d-efca-4778-ad7a-528463c338ad	transferencias	t	f	f	f	2025-10-27 19:52:24.176107+00	2025-10-27 19:52:24.176107+00
7df848b5-210b-442a-80e8-ea0d46c74d23	cab40b7d-efca-4778-ad7a-528463c338ad	almoxarifados	t	f	f	f	2025-10-27 19:52:25.361742+00	2025-10-27 19:52:25.361742+00
74484f16-4234-4044-8f78-e0de3136ed85	cab40b7d-efca-4778-ad7a-528463c338ad	pedidos_compra	t	f	f	f	2025-10-27 19:52:26.234951+00	2025-10-27 19:52:26.234951+00
a3911a2b-d04b-4050-8a2f-ddef5ad0c39d	cab40b7d-efca-4778-ad7a-528463c338ad	historico_compras	t	f	f	f	2025-10-27 19:52:27.349284+00	2025-10-27 19:52:27.349284+00
8f5e4615-a88a-482c-a543-c2db4ddf8394	2242ce27-800c-494e-b7b9-c75cb832aa4d	awards_productivity	t	t	t	t	2025-11-13 13:23:53.471664+00	2025-11-13 13:23:56.246272+00
fd7fcdfd-2332-4223-8dae-823cb61eb7dd	3ce71d8d-c9eb-4b18-9fd4-a72720421441	vacations	f	f	f	f	2025-11-02 09:16:50.320423+00	2025-11-02 09:16:52.756741+00
1f23bc36-6653-45c1-a8ec-4057e0fd7195	2242ce27-800c-494e-b7b9-c75cb832aa4d	dependents	t	t	t	t	2025-11-08 16:21:22.558598+00	2025-11-08 16:21:26.075106+00
a1680264-23fd-4cbf-b2a0-7bd2085dd84f	2242ce27-800c-494e-b7b9-c75cb832aa4d	vacations	t	t	t	t	2025-11-06 18:20:17.156855+00	2025-11-06 18:20:31.256838+00
efd05a0c-31a2-4972-8432-c0fd7975b4f9	2242ce27-800c-494e-b7b9-c75cb832aa4d	periodic_exams	t	t	t	t	2025-11-06 18:20:34.913381+00	2025-11-06 18:20:46.197589+00
73c63928-467f-41c8-9b5a-b601d9182035	2242ce27-800c-494e-b7b9-c75cb832aa4d	work_shifts	t	t	t	t	2025-11-06 18:20:53.847532+00	2025-11-06 18:21:05.17871+00
3ed85e68-d7b9-49e4-9168-dcc3348cd00e	2242ce27-800c-494e-b7b9-c75cb832aa4d	payroll	t	t	t	t	2025-11-08 16:21:49.337708+00	2025-11-08 16:21:53.969377+00
15989896-c6b3-4da9-a649-dd94f54ca70f	2242ce27-800c-494e-b7b9-c75cb832aa4d	income_statements	t	t	t	t	2025-11-08 16:21:55.296371+00	2025-11-08 16:21:59.001103+00
85abe915-6339-42f0-ad7f-45c45e75ade6	2242ce27-800c-494e-b7b9-c75cb832aa4d	configuracao_fiscal	t	t	t	t	2025-11-08 16:22:16.896475+00	2025-11-08 16:22:20.629857+00
225ca3a0-7cb0-40f9-b07e-9c6ac8486b61	2242ce27-800c-494e-b7b9-c75cb832aa4d	localizacoes_fisicas	t	t	t	t	2025-11-08 16:22:30.661966+00	2025-11-08 16:22:41.67672+00
bdb6f967-402b-4bb6-a2c7-321d6c21169e	2242ce27-800c-494e-b7b9-c75cb832aa4d	registros_ponto	t	t	t	t	2025-10-15 18:50:53.072005+00	2025-10-20 23:42:45.102747+00
1b2a0234-1eb4-40e9-99cf-f9c14feea23f	2242ce27-800c-494e-b7b9-c75cb832aa4d	ferias	t	t	t	t	2025-10-15 18:50:53.072005+00	2025-10-20 23:42:45.158597+00
b087e98e-5795-4283-92c5-46ebb88c415a	2242ce27-800c-494e-b7b9-c75cb832aa4d	reembolsos	t	t	t	t	2025-10-15 18:50:53.072005+00	2025-10-20 23:42:45.217371+00
095aaa09-568e-4ce3-b3ef-92f1191d29b7	2242ce27-800c-494e-b7b9-c75cb832aa4d	material_exit_requests	t	t	t	t	2025-11-08 16:22:49.451579+00	2025-11-08 16:22:55.126223+00
04aed379-b38c-46e3-97ca-efa81da543ef	2242ce27-800c-494e-b7b9-c75cb832aa4d	warehouse_reports	t	t	t	t	2025-11-08 16:23:09.249978+00	2025-11-08 16:23:12.551855+00
ebe10ab9-89b6-4941-b53b-c441cc80e667	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicles	t	t	t	t	2025-11-08 16:23:23.262024+00	2025-11-08 16:23:26.371071+00
79457d9a-1bf9-4e99-9ecb-71b7cccdf55c	3ce71d8d-c9eb-4b18-9fd4-a72720421441	projetos	f	f	f	f	2025-10-20 23:16:23.012278+00	2025-10-27 19:52:53.807056+00
cb19f9d9-eb6c-4de8-95f6-64fbe154e15a	cab40b7d-efca-4778-ad7a-528463c338ad	reembolsos	t	t	t	f	2025-10-21 14:31:12.674568+00	2025-10-21 14:31:14.838543+00
e3f4d6f4-4f4e-4886-a46d-cd902deab0ce	2242ce27-800c-494e-b7b9-c75cb832aa4d	configuracao_bancaria	t	t	t	t	2025-11-08 16:22:21.917579+00	2025-11-08 16:22:26.275922+00
a2f8dc3f-d0e4-491e-9d43-c9b9cebb1ae7	3ce71d8d-c9eb-4b18-9fd4-a72720421441	perfis	f	f	f	f	2025-10-20 23:16:22.743102+00	2025-10-27 19:46:48.259348+00
b4fa3735-5c62-4178-ae47-51fda12f578c	3ce71d8d-c9eb-4b18-9fd4-a72720421441	parceiros	f	f	f	f	2025-10-20 23:16:23.637061+00	2025-10-27 19:52:58.446818+00
078bc865-abda-4092-b707-8af3f37800d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	reembolsos	f	f	f	f	2025-10-20 23:16:25.331253+00	2025-11-02 09:17:04.943386+00
caf3c3dd-104d-4b64-b414-756299437804	3ce71d8d-c9eb-4b18-9fd4-a72720421441	centros_custo	f	f	f	f	2025-10-20 23:16:23.888289+00	2025-10-27 19:52:59.860541+00
03bc736f-280e-47c2-ae40-29c9ecc49556	3ce71d8d-c9eb-4b18-9fd4-a72720421441	funcionarios	f	f	f	f	2025-10-20 23:16:24.340153+00	2025-11-02 09:04:26.831579+00
02a75e9e-7cc7-4368-86cd-9875cdc6bf10	2242ce27-800c-494e-b7b9-c75cb832aa4d	rubricas	t	t	t	t	2025-11-08 16:21:11.043674+00	2025-11-08 16:21:14.542277+00
d1c8be3b-5b19-40e8-8293-3e357b8ea8c2	3ce71d8d-c9eb-4b18-9fd4-a72720421441	empresas	f	f	f	f	2025-10-20 23:16:22.479568+00	2025-11-02 09:13:57.706585+00
063e7b46-af77-4a04-ba3e-2da6988b2c3a	3ce71d8d-c9eb-4b18-9fd4-a72720421441	ferias	t	t	t	f	2025-10-20 23:16:25.04192+00	2025-10-27 19:47:40.380808+00
df69b315-9dd9-4294-ac1c-b6a7d539762f	2242ce27-800c-494e-b7b9-c75cb832aa4d	reimbursement_requests	t	t	t	t	2025-11-06 18:20:33.148131+00	2025-11-06 18:20:43.822798+00
62007e95-9bcb-4ab5-a2d9-54fcec38e446	3ce71d8d-c9eb-4b18-9fd4-a72720421441	acoes_disciplinares	t	f	f	f	2025-10-12 00:29:45.10982+00	2025-10-27 19:47:53.257318+00
fd704ade-bb91-4ac9-ab03-80e92d24454d	cab40b7d-efca-4778-ad7a-528463c338ad	perfis	t	f	f	f	2025-10-27 19:52:15.624248+00	2025-10-27 19:52:15.624248+00
4da764c9-d5ca-40de-894d-6fa3b566eeda	cab40b7d-efca-4778-ad7a-528463c338ad	parceiros	t	f	f	f	2025-10-27 19:52:16.46586+00	2025-10-27 19:52:16.46586+00
2358b1be-05c1-4bb4-a35d-ab265a85cff6	cab40b7d-efca-4778-ad7a-528463c338ad	cargos	t	f	f	f	2025-10-27 19:52:17.638689+00	2025-10-27 19:52:17.638689+00
15915aa0-d75e-43f4-b4b2-138b09222d07	cab40b7d-efca-4778-ad7a-528463c338ad	remessas_bancarias	t	f	f	f	2025-10-27 19:52:19.852822+00	2025-10-27 19:52:19.852822+00
b3abcdb4-72c4-4623-ae8c-a25ffd3b682b	cab40b7d-efca-4778-ad7a-528463c338ad	conciliacoes_bancarias	t	f	f	f	2025-10-27 19:52:20.678815+00	2025-10-27 19:52:20.678815+00
d97c4340-9f0c-43a1-8732-763dd5d99067	cab40b7d-efca-4778-ad7a-528463c338ad	plano_contas	t	f	f	f	2025-10-27 19:52:21.733782+00	2025-10-27 19:52:21.733782+00
cc00a884-79bc-4dfe-ad17-ff13b57b7045	cab40b7d-efca-4778-ad7a-528463c338ad	aprovacoes	t	f	f	f	2025-10-27 19:52:22.541299+00	2025-10-27 19:52:22.541299+00
11f1a52a-6b84-4298-99ec-1537ccc2d18c	cab40b7d-efca-4778-ad7a-528463c338ad	entrada_itens	t	f	f	f	2025-10-27 19:52:23.596015+00	2025-10-27 19:52:23.596015+00
831de84c-d0da-4c44-ba78-316984e2f989	cab40b7d-efca-4778-ad7a-528463c338ad	transferencia_itens	t	f	f	f	2025-10-27 19:52:24.472229+00	2025-10-27 19:52:24.472229+00
6f1d11f6-9237-4bbd-9b2b-2d78260ec6b4	cab40b7d-efca-4778-ad7a-528463c338ad	solicitacoes_compra	t	f	f	f	2025-10-27 19:52:25.641638+00	2025-10-27 19:52:25.641638+00
c4e3ffe8-5dd6-495e-a204-ba6ea183b0ca	cab40b7d-efca-4778-ad7a-528463c338ad	aprovacoes_compra	t	f	f	f	2025-10-27 19:52:26.523098+00	2025-10-27 19:52:26.523098+00
d49a9a1f-fdca-4354-afbd-4a0ea293112a	cab40b7d-efca-4778-ad7a-528463c338ad	avaliacao_fornecedores	t	f	f	f	2025-10-27 19:52:27.623464+00	2025-10-27 19:52:27.623464+00
7fa80173-fa78-4a0c-8657-7b938fb6f386	3ce71d8d-c9eb-4b18-9fd4-a72720421441	compensation_requests	t	f	f	f	2025-11-02 09:14:36.180654+00	2025-11-02 09:14:36.180654+00
4a8c6cd4-8e8a-4e93-b0d0-44aab181aac1	3ce71d8d-c9eb-4b18-9fd4-a72720421441	cargos	f	f	f	f	2025-10-19 11:42:01.211945+00	2025-11-02 09:15:49.164154+00
0f2c4459-e00c-4538-baee-d0cdd8f3f8bd	2242ce27-800c-494e-b7b9-c75cb832aa4d	employment_contracts	t	t	t	t	2025-11-08 16:21:27.433095+00	2025-11-08 16:21:31.345056+00
89c51c63-7fd9-4be9-926d-e0e8278cd176	2242ce27-800c-494e-b7b9-c75cb832aa4d	benefits	t	t	t	t	2025-11-08 16:21:38.301523+00	2025-11-08 16:21:42.298594+00
3068fb82-bef7-4786-a256-045bc7c65d6e	2242ce27-800c-494e-b7b9-c75cb832aa4d	esocial	t	t	t	t	2025-11-08 16:22:00.131828+00	2025-11-08 16:22:03.650747+00
8cbf3bf2-97fb-4238-813a-bb052065bd78	2242ce27-800c-494e-b7b9-c75cb832aa4d	warehouse_transfers	t	t	t	t	2025-11-08 16:22:43.267811+00	2025-11-08 16:22:47.79675+00
354de917-23b0-45d9-a897-7620766527aa	2242ce27-800c-494e-b7b9-c75cb832aa4d	inventory_dashboard	t	t	t	t	2025-11-08 16:22:57.570901+00	2025-11-08 16:23:01.469458+00
0f0b6cbc-c6b7-4491-b9f9-33396039c039	2242ce27-800c-494e-b7b9-c75cb832aa4d	fornecedores_dados	t	t	t	t	2025-11-08 16:23:18.135352+00	2025-11-08 16:23:21.762087+00
4d6757f2-6554-43ba-af4c-8c924808a397	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_documents	t	t	t	t	2025-11-08 16:23:28.291957+00	2025-11-08 16:23:34.207929+00
c9f129e2-3bab-4f20-bc17-f88680f253ee	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_inspections	t	t	t	t	2025-11-08 16:23:45.891328+00	2025-11-08 16:23:49.593031+00
32da580a-7096-4356-b0a6-9809178e6397	2242ce27-800c-494e-b7b9-c75cb832aa4d	employee_union_memberships	t	t	t	t	2025-11-13 13:24:08.689974+00	2025-11-13 13:24:15.582645+00
b75696f1-5d4f-4419-a232-c0996de487fa	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_maintenances	t	t	t	t	2025-11-08 16:23:54.928819+00	2025-11-08 16:23:57.972978+00
12ce6956-1e89-4d74-88d7-2832685138a1	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_requests	t	t	t	t	2025-11-08 16:24:05.290903+00	2025-11-08 16:24:09.023659+00
9728dc92-dcb3-41e3-ae5f-46d556adeaff	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	unions	t	t	t	t	2025-11-12 20:36:00.711781+00	2025-11-12 20:36:04.702002+00
c5f61a00-e9e8-4f6c-b0a8-636249b0331d	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	reimbursement_requests	f	f	f	f	2025-11-11 13:18:39.593922+00	2025-11-11 13:20:09.381981+00
8c4aafcd-1baf-4857-91cb-e2390d629e98	3ce71d8d-c9eb-4b18-9fd4-a72720421441	materials_equipment	t	f	f	f	2025-10-20 23:16:23.359602+00	2025-10-20 23:16:23.359602+00
6501517e-71d0-4e11-a12a-51109a40bfad	2242ce27-800c-494e-b7b9-c75cb832aa4d	fgts_config	t	t	t	t	2025-11-13 13:23:22.321559+00	2025-11-13 13:23:25.534589+00
79d14b51-9f65-4a42-99cc-7325a98c3ccd	3ce71d8d-c9eb-4b18-9fd4-a72720421441	reimbursement_requests	f	f	f	f	2025-11-02 09:17:01.331506+00	2025-11-11 13:23:12.023927+00
f1c6f5d1-e360-4aa5-b1d0-c93ea1fe8e11	3ce71d8d-c9eb-4b18-9fd4-a72720421441	income_statements	f	f	f	f	2025-11-02 09:35:44.916054+00	2025-11-11 13:23:19.938924+00
e020ff4e-4449-472d-b2e0-913e143d3f2e	3ce71d8d-c9eb-4b18-9fd4-a72720421441	registros_ponto	t	t	t	f	2025-10-20 23:16:24.783212+00	2025-11-17 13:19:36.733248+00
26926e42-50d8-4f7f-a0b8-058ca333170a	2242ce27-800c-494e-b7b9-c75cb832aa4d	allowance_types	t	t	t	t	2025-11-13 13:23:44.478799+00	2025-11-13 13:23:47.464893+00
d24d348f-6f87-4f9a-81b9-9301d1fe962a	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	delay_reasons	t	t	t	t	2025-11-12 20:31:55.153715+00	2025-11-12 20:32:26.598726+00
0815e5e5-32af-44d2-98c5-281d3dea6e0f	2242ce27-800c-494e-b7b9-c75cb832aa4d	cotacoes	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
e89eddee-0632-4c60-87de-58b88e5075c3	2242ce27-800c-494e-b7b9-c75cb832aa4d	pedidos_compra	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
f52b0051-cbe5-4d50-b059-ff7c64c15fb7	2242ce27-800c-494e-b7b9-c75cb832aa4d	aprovacoes_compra	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
2c75f662-7fc4-4d93-8f3b-40fae5554237	2242ce27-800c-494e-b7b9-c75cb832aa4d	fornecedores	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
70cae9d0-ce14-4e74-8a53-3260abe16d9a	2242ce27-800c-494e-b7b9-c75cb832aa4d	contratos_compra	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
bdbee250-4056-44a4-a9df-3f2b4ef5e59c	2242ce27-800c-494e-b7b9-c75cb832aa4d	historico_compras	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
56e1b5ba-4ab3-4ddd-8d62-a3751262287a	2242ce27-800c-494e-b7b9-c75cb832aa4d	avaliacao_fornecedores	t	t	t	t	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
decd7278-e738-43b8-8ed7-8d11e30b42a0	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	deficiency_types	t	t	t	t	2025-11-12 20:35:41.016075+00	2025-11-12 20:35:44.184524+00
1f8b71c4-f32e-4728-a397-14dfb0cce1cd	2242ce27-800c-494e-b7b9-c75cb832aa4d	medical_plans	t	t	t	t	2025-11-13 13:23:58.113748+00	2025-11-13 13:24:01.518428+00
f7f0519d-8be1-486b-a22d-1325862df100	3ce71d8d-c9eb-4b18-9fd4-a72720421441	unidades	f	f	f	f	2025-10-19 22:49:18.462756+00	2025-10-20 23:42:44.930473+00
fc6aa9e4-4e55-4655-8518-3ec22c47fc37	2242ce27-800c-494e-b7b9-c75cb832aa4d	unidades	t	t	t	t	2025-10-19 22:49:18.462756+00	2025-10-20 23:42:44.930473+00
3b00f05c-49a7-443f-8f70-d5e15545fbdc	2242ce27-800c-494e-b7b9-c75cb832aa4d	cargos	t	t	t	t	2025-10-19 11:42:01.036017+00	2025-10-20 23:42:45.044257+00
8479f89e-4d36-48da-b55a-f9e5f29876f1	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	medical_agreements	t	t	t	t	2025-11-08 16:27:42.421534+00	2025-11-12 17:02:26.501906+00
fe9035e5-e304-4f01-9335-93c8693915c6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	employment_contracts	t	t	t	t	2025-11-08 16:27:40.558873+00	2025-11-12 17:02:28.900702+00
34357261-d4dd-41c0-bd4d-5fb67ad3e22c	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	dependents	t	t	t	t	2025-11-08 16:27:38.552572+00	2025-11-12 17:02:32.172028+00
d2e5dedd-8eb5-438b-8496-78e74638f7c7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	employees	t	t	t	f	2025-11-08 16:26:26.073238+00	2025-11-10 20:30:39.798934+00
1816ef56-ef0c-4905-908c-3406a168c813	3ce71d8d-c9eb-4b18-9fd4-a72720421441	periodic_exams	f	f	f	f	2025-11-02 09:28:28.453932+00	2025-11-11 13:23:13.0593+00
88571c27-c583-4687-a79c-25c94f48cd7b	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	benefits	t	t	t	t	2025-11-08 16:27:44.318061+00	2025-11-12 17:02:23.44135+00
3438e7e5-1601-4a00-8edc-f151529a5c42	3ce71d8d-c9eb-4b18-9fd4-a72720421441	cotacoes	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
c0505e41-4322-4dff-b7c7-b9672ef8d089	3ce71d8d-c9eb-4b18-9fd4-a72720421441	pedidos_compra	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
b206f159-4cda-4c67-a3bb-d5d662b5ec67	3ce71d8d-c9eb-4b18-9fd4-a72720421441	aprovacoes_compra	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
cf5dce51-cf79-4dd2-899b-2385182e51bc	3ce71d8d-c9eb-4b18-9fd4-a72720421441	fornecedores	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
8cf18c57-8d7a-4f95-b9a8-feb46fbf06df	3ce71d8d-c9eb-4b18-9fd4-a72720421441	contratos_compra	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
fa8bbf49-8fe5-4191-84e1-27967b621a6d	3ce71d8d-c9eb-4b18-9fd4-a72720421441	historico_compras	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
0444f4ee-d668-420b-9020-50690791f5b3	3ce71d8d-c9eb-4b18-9fd4-a72720421441	avaliacao_fornecedores	f	f	f	f	2025-10-20 23:34:04.087405+00	2025-10-20 23:34:04.087405+00
b4c42752-dd77-4f16-8cef-cd1645fecbbc	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	units	t	t	t	f	2025-11-08 16:27:37.677946+00	2025-11-12 17:02:37.561169+00
031ea7be-3e95-407c-9108-c3bff5ee03db	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	holidays	t	t	t	t	2025-11-08 16:27:33.736316+00	2025-11-12 17:03:30.197253+00
676fa1e1-d7cd-4fac-b124-b87d38bff6c3	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	work_shifts	t	t	t	t	2025-11-08 16:27:32.440052+00	2025-11-12 17:03:31.474786+00
5977cbf9-3f4d-4b21-bedd-4c277c7303e7	3ce71d8d-c9eb-4b18-9fd4-a72720421441	usuarios	f	f	f	f	2025-10-20 23:16:22.229364+00	2025-10-27 19:46:29.602814+00
a09baeae-e078-4867-880f-8d94d68536b3	2242ce27-800c-494e-b7b9-c75cb832aa4d	accounts_payable	t	t	t	t	2025-11-08 16:22:08.720313+00	2025-11-08 16:22:12.96325+00
658ad083-e144-4a99-8511-0b880032d4fd	3ce71d8d-c9eb-4b18-9fd4-a72720421441	exames_periodicos	t	f	f	f	2025-10-11 22:51:53.806373+00	2025-10-27 19:47:46.509248+00
f38b8f1b-654c-4719-afb5-bf55e1f06bca	cab40b7d-efca-4778-ad7a-528463c338ad	exames_periodicos	t	f	f	f	2025-10-21 14:31:16.482009+00	2025-10-21 14:31:36.684662+00
d554b806-0395-4550-9a02-5e498747f61d	cab40b7d-efca-4778-ad7a-528463c338ad	usuarios	t	f	f	f	2025-10-27 19:52:15.023053+00	2025-10-27 19:52:15.023053+00
c5ff2be7-5704-4e5d-bd30-83d04d8adfab	cab40b7d-efca-4778-ad7a-528463c338ad	projetos	t	f	f	f	2025-10-27 19:52:15.9032+00	2025-10-27 19:52:15.9032+00
8d44abe9-5925-4eb3-997b-687d901f2e44	cab40b7d-efca-4778-ad7a-528463c338ad	centros_custo	t	f	f	f	2025-10-27 19:52:16.756846+00	2025-10-27 19:52:16.756846+00
b3c88284-b6a0-4cf0-9dce-25388cd6a4ea	cab40b7d-efca-4778-ad7a-528463c338ad	unidades	t	f	f	f	2025-10-27 19:52:17.05139+00	2025-10-27 19:52:17.05139+00
b699e10f-f79b-41e2-8324-2669d628d7ca	cab40b7d-efca-4778-ad7a-528463c338ad	contas_pagar	t	f	f	f	2025-10-27 19:52:19.052073+00	2025-10-27 19:52:19.052073+00
240bf27d-6c8c-439d-9df8-c5ecb506898b	cab40b7d-efca-4778-ad7a-528463c338ad	contas_receber	t	f	f	f	2025-10-27 19:52:19.334461+00	2025-10-27 19:52:19.334461+00
9b46ede2-0684-4fc9-aef4-8d05b422b1d4	cab40b7d-efca-4778-ad7a-528463c338ad	retornos_bancarios	t	f	f	f	2025-10-27 19:52:20.133376+00	2025-10-27 19:52:20.133376+00
b7c66218-2732-436b-a3d5-e3b4f416251d	cab40b7d-efca-4778-ad7a-528463c338ad	fluxo_caixa	t	f	f	f	2025-10-27 19:52:20.949507+00	2025-10-27 19:52:20.949507+00
d2a7d62b-0068-4ccd-9e16-15ef55d7f070	cab40b7d-efca-4778-ad7a-528463c338ad	nfe	t	f	f	f	2025-10-27 19:52:21.210991+00	2025-10-27 19:52:21.210991+00
d9a1db9b-4369-4c9f-b6c6-2105cb6ed808	cab40b7d-efca-4778-ad7a-528463c338ad	lancamentos_contabeis	t	f	f	f	2025-10-27 19:52:22.012151+00	2025-10-27 19:52:22.012151+00
9f399c49-194a-4e74-b775-8841187a3883	cab40b7d-efca-4778-ad7a-528463c338ad	estoque_atual	t	f	f	f	2025-10-27 19:52:22.802675+00	2025-10-27 19:52:22.802675+00
bb850608-1e76-43db-94e9-d482138801ea	cab40b7d-efca-4778-ad7a-528463c338ad	movimentacoes_estoque	t	f	f	f	2025-10-27 19:52:23.053068+00	2025-10-27 19:52:23.053068+00
96fbc049-23a6-4a36-a4f7-869dd6634ce9	cab40b7d-efca-4778-ad7a-528463c338ad	checklist_recebimento	t	f	f	f	2025-10-27 19:52:23.890914+00	2025-10-27 19:52:23.890914+00
c098c7c5-f3a9-4fef-8152-cb61e3e41b0b	cab40b7d-efca-4778-ad7a-528463c338ad	inventarios	t	f	f	f	2025-10-27 19:52:24.774306+00	2025-10-27 19:52:24.774306+00
55a72400-8e53-4ecd-8fb8-92c657f67acf	cab40b7d-efca-4778-ad7a-528463c338ad	inventario_itens	t	f	f	f	2025-10-27 19:52:25.050125+00	2025-10-27 19:52:25.050125+00
6b4e335a-f247-419c-9467-de2efa6541ac	cab40b7d-efca-4778-ad7a-528463c338ad	cotacoes	t	f	f	f	2025-10-27 19:52:25.914396+00	2025-10-27 19:52:25.914396+00
2d2f101e-c180-426a-9db3-61f3c67b50e8	cab40b7d-efca-4778-ad7a-528463c338ad	fornecedores	t	f	f	f	2025-10-27 19:52:26.793281+00	2025-10-27 19:52:26.793281+00
3c95d2a6-7cb0-4df1-b85a-1677341d91a2	cab40b7d-efca-4778-ad7a-528463c338ad	contratos_compra	t	f	f	f	2025-10-27 19:52:27.07845+00	2025-10-27 19:52:27.07845+00
5a483f7a-f5a4-494e-b87d-a9664bca2efb	3ce71d8d-c9eb-4b18-9fd4-a72720421441	solicitacoes_compensacao	f	f	f	f	2025-11-02 09:14:37.410597+00	2025-11-02 09:18:12.075412+00
d0c037d2-117a-4e0f-bd68-f280c47c3da9	2242ce27-800c-494e-b7b9-c75cb832aa4d	time_records	t	t	t	t	2025-11-06 18:20:12.292896+00	2025-11-06 18:20:15.634147+00
c9605d00-69d2-4fc4-9f82-53806f48fa98	2242ce27-800c-494e-b7b9-c75cb832aa4d	inventory_management	t	t	t	t	2025-11-08 16:23:02.795963+00	2025-11-08 16:23:07.164043+00
1d92a2ea-5208-4688-84b3-4050cc15b902	2242ce27-800c-494e-b7b9-c75cb832aa4d	disciplinary_actions	t	t	t	t	2025-11-06 18:20:47.1599+00	2025-11-06 18:20:50.273055+00
8e3cef71-afce-453f-910e-c7c410432724	2242ce27-800c-494e-b7b9-c75cb832aa4d	drivers	t	t	t	t	2025-11-08 16:23:35.882212+00	2025-11-08 16:23:39.274935+00
8b6c786f-2bbd-4e64-87a0-d9ab48fca95c	2242ce27-800c-494e-b7b9-c75cb832aa4d	positions	t	t	t	t	2025-11-06 18:20:52.894505+00	2025-11-06 18:21:01.892753+00
ae6497e8-376c-48bb-b410-156b664b06ca	2242ce27-800c-494e-b7b9-c75cb832aa4d	trainings	t	t	t	t	2025-11-06 18:20:51.112779+00	2025-11-06 18:21:02.873404+00
7e937dc5-0d88-47aa-9e80-80225a7af1d4	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_assignments	t	t	t	t	2025-11-08 16:23:40.625065+00	2025-11-08 16:23:44.801138+00
49b1198f-9f1d-404f-9c26-5d9a6565766f	2242ce27-800c-494e-b7b9-c75cb832aa4d	units	t	t	t	t	2025-11-08 16:21:16.085042+00	2025-11-08 16:21:20.095277+00
10a38614-b690-4778-b1d4-9a2eb5c26874	2242ce27-800c-494e-b7b9-c75cb832aa4d	medical_agreements	t	t	t	t	2025-11-08 16:21:32.757995+00	2025-11-08 16:21:36.273046+00
cbc6a107-df07-47ff-8f1f-ec4d1e3152c3	2242ce27-800c-494e-b7b9-c75cb832aa4d	inspection_items	t	t	t	t	2025-11-08 16:23:50.591391+00	2025-11-08 16:23:54.017631+00
1af692eb-29da-429f-adec-2851657d3ff3	2242ce27-800c-494e-b7b9-c75cb832aa4d	payroll_config	t	t	t	t	2025-11-08 16:21:43.725022+00	2025-11-08 16:21:47.369619+00
694ec560-d32b-496a-8ed4-4c26366aa9db	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_occurrences	t	t	t	t	2025-11-08 16:24:00.522738+00	2025-11-08 16:24:03.977162+00
3b3d4dcf-6fca-4b91-9c22-da94ea720ad7	2242ce27-800c-494e-b7b9-c75cb832aa4d	vehicle_images	t	t	t	t	2025-11-08 16:24:09.970205+00	2025-11-08 16:24:17.928307+00
464f12e4-9078-4521-85f4-aecffea09be5	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	time_records	t	t	t	f	2025-11-08 16:24:33.837268+00	2025-11-08 16:24:36.231357+00
b369fd4a-c7b5-4ffc-a668-5bd30af9055b	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	contas_receber	f	f	f	f	2025-11-08 16:27:56.193566+00	2025-11-08 16:27:56.82949+00
e9e921f2-9704-4ecb-8ae6-0a8ca3c456bb	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	contas_pagar	f	f	f	f	2025-11-08 16:27:54.690939+00	2025-11-08 16:27:58.126986+00
c412a505-d69b-4076-9b77-80b74b7e8d1e	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	employee_union_memberships	t	t	t	t	2025-11-12 20:36:05.838432+00	2025-11-12 20:36:09.888082+00
66967d57-08a8-482c-893b-a55e423e06ec	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	positions	t	t	t	t	2025-11-08 16:27:30.482445+00	2025-11-12 17:03:57.659651+00
672cda7e-7d93-4a9a-be01-d73c46db405d	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	registros_ponto	t	t	t	f	2025-11-08 16:26:23.241445+00	2025-11-08 16:29:20.129145+00
2752194d-d0eb-400e-b515-3a23728d2b2d	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	vacations	t	t	t	f	2025-11-08 16:26:32.249792+00	2025-11-08 16:29:24.61289+00
868ebc33-73b2-4893-8966-5e0991a565a7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	reimbursement_requests	t	t	t	f	2025-11-08 16:27:23.12195+00	2025-11-08 16:29:32.375888+00
b306dacc-cbb3-46cd-ab97-32dae885a201	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	periodic_exams	t	t	t	t	2025-11-08 16:27:24.755957+00	2025-11-08 16:29:41.138553+00
1061bfc5-b2f9-43e1-9d6e-dc093c59d1d2	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	trainings	t	t	t	t	2025-11-08 16:27:29.154884+00	2025-11-08 16:29:46.338448+00
38ad4988-772d-48ba-a90c-082fe33d85af	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	payroll_config	t	t	t	f	2025-11-08 16:27:46.167502+00	2025-11-08 16:30:24.198311+00
ec159c44-70c4-45df-8498-d77eaef6cb87	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	inss_brackets	t	t	t	t	2025-11-12 20:31:23.966598+00	2025-11-12 20:31:42.350826+00
a51cdba7-e867-407b-a9b3-cba03d08218f	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	absence_types	t	t	t	t	2025-11-12 20:32:25.488898+00	2025-11-12 20:32:39.860354+00
18368515-6708-452b-9ce9-112170fc013c	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	rubricas	t	t	t	f	2025-11-08 16:27:36.676734+00	2025-11-08 16:30:00.969409+00
581f4776-ae21-4db4-b4c8-a40bc94248b6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	disciplinary_actions	t	t	t	t	2025-11-08 16:27:25.9187+00	2025-11-12 17:04:13.889309+00
5765b1db-b8b9-4317-96e8-c7569560ae4b	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	awards_productivity	t	t	t	t	2025-11-12 20:35:45.704871+00	2025-11-12 20:35:49.473946+00
e1d20065-b18d-4edb-8bef-27260dbd2b2b	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	payroll	t	t	t	f	2025-11-08 16:27:47.270828+00	2025-11-08 16:30:25.242406+00
1dafbaf1-c176-4f14-9460-d0b03a21e398	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	income_statements	t	t	t	f	2025-11-08 16:27:49.089523+00	2025-11-08 16:30:26.338199+00
08723afb-e6cf-4a5f-b0e4-b159b15ce473	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	esocial	t	t	t	f	2025-11-08 16:27:52.817372+00	2025-11-08 16:30:30.760818+00
18bd3db4-9f43-4126-a96f-f41df2c72c4a	2242ce27-800c-494e-b7b9-c75cb832aa4d	employees	t	t	t	t	2025-11-10 17:09:26.089404+00	2025-11-10 17:09:29.421689+00
2b5276db-c2a7-4308-b9e2-e532e98f556f	2242ce27-800c-494e-b7b9-c75cb832aa4d	delay_reasons	t	t	t	t	2025-11-13 13:23:27.21078+00	2025-11-13 13:23:30.419574+00
64f62e01-79cc-48ae-88c0-af818001341c	2242ce27-800c-494e-b7b9-c75cb832aa4d	employee_medical_plans	t	t	t	t	2025-11-13 13:24:02.444798+00	2025-11-13 13:24:05.996304+00
8f446a8d-c98b-4b41-ab54-ab51ce8ebe5f	2242ce27-800c-494e-b7b9-c75cb832aa4d	payroll_calculation	t	t	t	t	2025-11-13 13:24:18.548795+00	2025-11-13 13:24:26.545886+00
\.


--
-- Data for Name: historico_edicoes_solicitacoes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.historico_edicoes_solicitacoes (id, company_id, processo_tipo, processo_id, usuario_editor_id, data_edicao, campos_alterados, valores_anteriores, valores_novos, aprovacoes_resetadas, data_reset, created_at) FROM stdin;
\.


--
-- Data for Name: module_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module_permissions (id, profile_id, module_name, can_read, can_create, can_edit, can_delete, created_at, updated_at) FROM stdin;
76e60de4-8d38-44b9-9db9-d9715ac94c6c	2242ce27-800c-494e-b7b9-c75cb832aa4d	dashboard	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-04 13:33:24.583874+00
cc9c1281-56d1-43a7-b154-64faeaf3dae9	3ce71d8d-c9eb-4b18-9fd4-a72720421441	empresas	f	f	f	f	2025-10-20 23:02:55.158579+00	2025-10-27 19:45:46.940571+00
30325bde-969d-46f1-a936-b717e5e4a4ef	3ce71d8d-c9eb-4b18-9fd4-a72720421441	projetos	f	f	f	f	2025-10-20 23:02:55.467671+00	2025-10-27 19:45:52.641304+00
3e9918bf-ac8e-42ee-a8db-4b2847919521	3ce71d8d-c9eb-4b18-9fd4-a72720421441	materiais_equipamentos	f	f	f	f	2025-10-20 23:02:55.750226+00	2025-10-27 19:45:54.479427+00
df743b2b-d33e-4f40-a3aa-9f65e318c9c7	3ce71d8d-c9eb-4b18-9fd4-a72720421441	centros_custo	f	f	f	f	2025-10-20 23:02:56.336168+00	2025-10-27 19:45:56.994073+00
8a9fe3e7-89c0-4a5d-8c3d-53fdfb785d28	3ce71d8d-c9eb-4b18-9fd4-a72720421441	financeiro	f	f	f	f	2025-10-14 10:26:04.472562+00	2025-10-27 19:46:00.85671+00
1a40d759-6e93-4591-acfc-7404ffde45f6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	compras	f	f	f	f	2025-10-16 11:01:03.947317+00	2025-10-27 19:46:03.496251+00
ac3a661c-5a3b-4f16-83a8-08209809900f	2242ce27-800c-494e-b7b9-c75cb832aa4d	configuracoes	t	t	t	t	2025-10-04 15:43:12.157125+00	2025-10-04 15:43:12.157125+00
940b88d4-de25-4217-9827-58f3de6245a4	3ce71d8d-c9eb-4b18-9fd4-a72720421441	rh	f	f	f	f	2025-10-11 22:51:53.867549+00	2025-10-27 19:46:07.643791+00
aa3dfce8-0a77-4493-90ca-5ec1df6a32ab	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	portal_colaborador	t	t	t	f	2025-11-11 13:17:51.238471+00	2025-11-11 13:17:53.791109+00
f8220c39-71a8-49c7-9f4a-3edf8305ee2a	2242ce27-800c-494e-b7b9-c75cb832aa4d	cadastros	t	t	t	t	2025-10-19 22:49:25.970922+00	2025-10-19 22:49:25.970922+00
11fec3b7-7127-4ab4-b4fd-22d59a814111	3ce71d8d-c9eb-4b18-9fd4-a72720421441	recrutamento	f	f	f	f	2025-10-12 11:13:53.820277+00	2025-10-27 19:46:09.409037+00
a00ddfba-6689-4b53-bb7d-46c1f1767f61	3ce71d8d-c9eb-4b18-9fd4-a72720421441	treinamento	f	f	f	f	2025-10-12 11:58:17.757163+00	2025-10-27 19:46:11.451361+00
a676d7cd-3624-4697-b679-837432796467	3ce71d8d-c9eb-4b18-9fd4-a72720421441	configuracoes	f	f	f	f	2025-10-20 23:02:56.683042+00	2025-10-27 19:46:18.156505+00
9222d83c-c038-4dc7-a27e-e78de4495bbc	3ce71d8d-c9eb-4b18-9fd4-a72720421441	dashboard	f	f	f	f	2025-10-20 23:02:54.498495+00	2025-10-27 19:46:24.250264+00
7eaa9ee0-a551-4737-942a-d70ee2641e03	2242ce27-800c-494e-b7b9-c75cb832aa4d	rh	t	t	t	t	2025-10-11 22:51:53.867549+00	2025-10-11 22:51:53.867549+00
d2d3e997-ed81-4f96-a661-7407a9e98c62	3ce71d8d-c9eb-4b18-9fd4-a72720421441	portal_colaborador	t	t	t	f	2025-10-20 23:02:56.980941+00	2025-10-27 19:47:15.363644+00
5de34c83-9584-47a0-8058-28df3f31c7e4	2242ce27-800c-494e-b7b9-c75cb832aa4d	treinamento	t	t	t	t	2025-10-12 11:58:17.757163+00	2025-10-12 11:58:17.757163+00
d8a3b8a0-2788-46c9-bfa8-caf52a6488d8	2242ce27-800c-494e-b7b9-c75cb832aa4d	financeiro	t	t	t	t	2025-10-10 15:42:04.216167+00	2025-10-14 10:26:04.310494+00
059a894b-78d6-4eeb-bb37-5b2cb3b9bf63	3ce71d8d-c9eb-4b18-9fd4-a72720421441	almoxarifado	f	f	f	f	2025-10-14 23:29:32.553181+00	2025-10-14 23:29:32.553181+00
f8752bbc-01c8-4ae1-92d6-e60d9be9740b	2242ce27-800c-494e-b7b9-c75cb832aa4d	almoxarifado	t	t	t	t	2025-10-14 23:29:32.553181+00	2025-10-14 23:29:32.553181+00
431e3953-6e26-4f53-b31b-e17110f398b9	2242ce27-800c-494e-b7b9-c75cb832aa4d	portal_colaborador	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
a7163bc1-e4b6-476f-b5f6-bcedd78b575c	2242ce27-800c-494e-b7b9-c75cb832aa4d	compras	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
1554900c-e34f-48d9-aba7-59cfdb880589	2242ce27-800c-494e-b7b9-c75cb832aa4d	logistica	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
c03c1adc-6a4a-4f54-9978-aee5af091a06	2242ce27-800c-494e-b7b9-c75cb832aa4d	frota	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
1f2a8de4-3e30-4f3b-a6ab-6db74fad43b0	2242ce27-800c-494e-b7b9-c75cb832aa4d	metalurgica	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
e3e3edbe-5551-48ca-aea0-61588aca16f7	2242ce27-800c-494e-b7b9-c75cb832aa4d	portal_gestor	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
e0cb0425-575d-4684-8bfb-d070be00f645	2242ce27-800c-494e-b7b9-c75cb832aa4d	comercial	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
9f795a97-15f2-4184-8e22-836a429c9d4f	2242ce27-800c-494e-b7b9-c75cb832aa4d	combustivel	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
6455ec93-4661-4ed6-b1ae-81aaf1af5f5c	2242ce27-800c-494e-b7b9-c75cb832aa4d	implantacao	t	t	t	t	2025-10-15 18:50:52.998172+00	2025-10-15 18:50:52.998172+00
44b6d2d4-e927-4ed8-af2a-6c05c64f4e28	2242ce27-800c-494e-b7b9-c75cb832aa4d	empresas	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-20 23:42:45.512261+00
0c79b88c-1cf7-420f-bf57-83c9bc0a7861	2242ce27-800c-494e-b7b9-c75cb832aa4d	usuarios	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-20 23:42:45.454215+00
abe9035f-1479-49bc-9cef-986bf70154f5	2242ce27-800c-494e-b7b9-c75cb832aa4d	projetos	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-20 23:42:45.570363+00
6e14639e-90c4-4438-9850-d81066f11243	2242ce27-800c-494e-b7b9-c75cb832aa4d	parceiros	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-20 23:42:45.686279+00
808dc6dd-2b72-43d4-9b8c-698e7b4ebd9f	2242ce27-800c-494e-b7b9-c75cb832aa4d	centros_custo	t	t	t	t	2025-10-04 13:33:24.583874+00	2025-10-20 23:42:45.744396+00
132ea428-2524-450d-9434-897e041663a5	2242ce27-800c-494e-b7b9-c75cb832aa4d	recrutamento	t	t	t	t	2025-10-12 11:13:45.305992+00	2025-10-20 23:42:45.798236+00
85b5fe41-9bdf-45cf-8ab6-612bb324b039	3ce71d8d-c9eb-4b18-9fd4-a72720421441	portal_gestor	f	f	f	f	2025-10-20 23:02:57.312859+00	2025-10-27 19:45:59.678451+00
4dbdb858-d9a2-464b-9e69-41fcbfed49fe	3ce71d8d-c9eb-4b18-9fd4-a72720421441	combustivel	f	f	f	f	2025-10-20 23:02:59.4833+00	2025-10-27 19:46:12.914962+00
7300fd8d-b250-4f53-8d97-919723946cc5	3ce71d8d-c9eb-4b18-9fd4-a72720421441	metalurgica	f	f	f	f	2025-10-20 23:02:59.822921+00	2025-10-27 19:46:14.114844+00
160ef4a4-1f49-4dda-abcf-c6fa0051c55d	3ce71d8d-c9eb-4b18-9fd4-a72720421441	comercial	f	f	f	f	2025-10-20 23:03:00.162994+00	2025-10-27 19:46:15.832126+00
398f3aa5-b1d3-4a16-83c9-0f0907655da4	3ce71d8d-c9eb-4b18-9fd4-a72720421441	implantacao	f	f	f	f	2025-10-20 23:03:00.485235+00	2025-10-27 19:46:16.894063+00
495beb3a-f144-47af-87e0-5b5d43ea2a21	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	portal_gestor	t	t	t	f	2025-11-11 13:17:55.544419+00	2025-11-11 13:17:57.48295+00
9b9f9507-bbe7-444f-a406-727c4b252f3a	cab40b7d-efca-4778-ad7a-528463c338ad	dashboard	t	f	f	f	2025-10-27 19:50:32.285304+00	2025-11-17 13:18:54.553686+00
ee302ef4-2261-4e83-b99a-1ebaeec1728a	3ce71d8d-c9eb-4b18-9fd4-a72720421441	users	t	f	f	f	2025-10-27 19:50:21.749709+00	2025-10-27 19:50:21.749709+00
95fb2818-b645-4311-8baf-76dcdca1814b	3ce71d8d-c9eb-4b18-9fd4-a72720421441	projects	t	f	f	f	2025-10-27 19:50:22.287449+00	2025-10-27 19:50:22.287449+00
5d75ecc0-9c3a-403d-9ef7-aba171fa7b61	3ce71d8d-c9eb-4b18-9fd4-a72720421441	cost_centers	t	f	f	f	2025-10-27 19:50:23.312994+00	2025-10-27 19:50:23.312994+00
2cec3ced-a7ad-4be5-b5b7-157095589970	2242ce27-800c-494e-b7b9-c75cb832aa4d	companies	t	t	t	t	2025-10-27 19:50:27.720803+00	2025-10-27 19:50:27.720803+00
8b022103-880a-4ba0-9424-1bc5bacce472	2242ce27-800c-494e-b7b9-c75cb832aa4d	partners	t	t	t	t	2025-10-27 19:50:28.679222+00	2025-10-27 19:50:28.679222+00
d39264c7-ca87-455e-a676-aa4699d34187	2242ce27-800c-494e-b7b9-c75cb832aa4d	recruitment	t	t	t	t	2025-10-27 19:50:31.056741+00	2025-10-27 19:50:31.056741+00
c6fcf1d3-6646-4c1e-8f0c-471428cdbee3	cab40b7d-efca-4778-ad7a-528463c338ad	companies	t	f	f	f	2025-10-27 19:50:32.921944+00	2025-10-27 19:50:32.921944+00
cae1cf81-699a-4d89-9bca-893d19b40d00	cab40b7d-efca-4778-ad7a-528463c338ad	materials_equipment	t	f	f	f	2025-10-27 19:50:33.602373+00	2025-10-27 19:50:33.602373+00
93f7fb98-f864-400e-aa97-2cf8b1c9a2eb	cab40b7d-efca-4778-ad7a-528463c338ad	cadastros	t	f	f	f	2025-10-27 19:50:34.691355+00	2025-10-27 19:50:34.691355+00
1c689753-cc49-4c10-8efc-59b3b763008f	cab40b7d-efca-4778-ad7a-528463c338ad	financeiro	t	f	f	f	2025-10-27 19:50:35.990483+00	2025-10-27 19:50:35.990483+00
d4bbfcf9-3ebc-4be0-a47c-2e0f1341385b	cab40b7d-efca-4778-ad7a-528463c338ad	almoxarifado	t	f	f	f	2025-10-27 19:50:36.618617+00	2025-10-27 19:50:36.618617+00
0857c370-7317-4188-88aa-def2e9ba4853	cab40b7d-efca-4778-ad7a-528463c338ad	logistica	t	f	f	f	2025-10-27 19:50:37.18973+00	2025-10-27 19:50:37.18973+00
d230fe9b-6f6d-49f8-99ff-7caecc478495	cab40b7d-efca-4778-ad7a-528463c338ad	treinamento	t	f	f	f	2025-10-27 19:50:37.989191+00	2025-10-27 19:50:37.989191+00
67c27328-aa73-4597-8489-65e0b3a99b5d	cab40b7d-efca-4778-ad7a-528463c338ad	metalurgica	t	f	f	f	2025-10-27 19:50:38.5217+00	2025-10-27 19:50:38.5217+00
952d16bc-94aa-4642-8ca6-41845abfda45	cab40b7d-efca-4778-ad7a-528463c338ad	implantacao	t	f	f	f	2025-10-27 19:50:39.041273+00	2025-10-27 19:50:39.041273+00
5aef9002-ff8f-49ec-98f5-472f9fda5008	3ce71d8d-c9eb-4b18-9fd4-a72720421441	cadastros	f	f	f	f	2025-10-19 22:49:25.970922+00	2025-11-02 09:41:24.942809+00
0a809381-08a0-476b-9384-23f97001d232	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	portal_gestor	f	f	f	f	2025-11-08 16:25:09.135517+00	2025-11-08 16:25:23.792255+00
940daeac-769a-4a09-8dc1-36af12ed2996	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	recrutamento	t	t	t	t	2025-11-08 16:25:40.887476+00	2025-11-08 16:25:55.044482+00
2086ea10-642c-483c-92c6-8d864256155c	3ce71d8d-c9eb-4b18-9fd4-a72720421441	usuarios	f	f	f	f	2025-10-20 23:02:54.840278+00	2025-10-27 19:45:39.631053+00
682ad360-f8ad-44e8-a03c-0072fa90414f	3ce71d8d-c9eb-4b18-9fd4-a72720421441	parceiros	f	f	f	f	2025-10-20 23:02:56.045003+00	2025-10-27 19:45:55.908486+00
0f37abcd-37e8-4452-a8b5-32ab5f8f9585	3ce71d8d-c9eb-4b18-9fd4-a72720421441	frota	f	f	f	f	2025-10-20 23:02:58.248478+00	2025-10-27 19:46:04.770376+00
9cd52880-ab0f-4d4c-a6d1-1dd4ea6fb8ed	2242ce27-800c-494e-b7b9-c75cb832aa4d	materiais_equipamentos	t	t	t	t	2025-10-20 23:09:05.125008+00	2025-10-20 23:42:45.628329+00
221c7279-11f6-45e9-aaf0-b28cb74d082e	3ce71d8d-c9eb-4b18-9fd4-a72720421441	logistica	f	f	f	f	2025-10-20 23:02:58.56711+00	2025-10-27 19:46:06.456683+00
59151afc-59ed-4650-9478-251b0e935444	cab40b7d-efca-4778-ad7a-528463c338ad	portal_colaborador	t	t	t	f	2025-10-21 14:26:39.076635+00	2025-10-21 14:27:06.771994+00
06d2b50b-4279-472a-a6ba-0ea440178a58	3ce71d8d-c9eb-4b18-9fd4-a72720421441	companies	t	f	f	f	2025-10-27 19:50:22.020605+00	2025-10-27 19:50:22.020605+00
ac91832c-75f9-4432-bc10-06c4c7d45bb1	3ce71d8d-c9eb-4b18-9fd4-a72720421441	materials_equipment	t	f	f	f	2025-10-27 19:50:22.582372+00	2025-10-27 19:50:22.582372+00
60b0a0e7-e6f2-40c7-9704-2a6319a95d20	3ce71d8d-c9eb-4b18-9fd4-a72720421441	partners	t	f	f	f	2025-10-27 19:50:23.01493+00	2025-10-27 19:50:23.01493+00
47ce2e28-0d54-4bdc-b25b-19e856810ab9	3ce71d8d-c9eb-4b18-9fd4-a72720421441	recruitment	t	f	f	f	2025-10-27 19:50:25.792894+00	2025-10-27 19:50:25.792894+00
993e7167-6b20-46c4-adf3-c87bba3af797	2242ce27-800c-494e-b7b9-c75cb832aa4d	users	t	t	t	t	2025-10-27 19:50:27.430264+00	2025-10-27 19:50:27.430264+00
dbd6b2df-9f9f-4387-a243-d83bef40066c	2242ce27-800c-494e-b7b9-c75cb832aa4d	projects	t	t	t	t	2025-10-27 19:50:28.024087+00	2025-10-27 19:50:28.024087+00
6094b17c-6cbd-47d2-91c8-ba022aab517e	2242ce27-800c-494e-b7b9-c75cb832aa4d	materials_equipment	t	t	t	t	2025-10-27 19:50:28.349991+00	2025-10-27 19:50:28.349991+00
d3e64a56-d25e-4bc5-a5fa-bdb42db9b574	2242ce27-800c-494e-b7b9-c75cb832aa4d	cost_centers	t	t	t	t	2025-10-27 19:50:28.985409+00	2025-10-27 19:50:28.985409+00
fa6a2301-640e-4fa6-9872-9d977344c4ec	cab40b7d-efca-4778-ad7a-528463c338ad	users	t	f	f	f	2025-10-27 19:50:32.621932+00	2025-10-27 19:50:32.621932+00
e9cb67e6-5ed2-4a0c-a232-c00cf6129c9a	cab40b7d-efca-4778-ad7a-528463c338ad	projects	t	f	f	f	2025-10-27 19:50:33.286839+00	2025-10-27 19:50:33.286839+00
b0a90922-8028-4b5b-9062-59930f9998e8	cab40b7d-efca-4778-ad7a-528463c338ad	partners	t	f	f	f	2025-10-27 19:50:33.976691+00	2025-10-27 19:50:33.976691+00
bcffc719-64e6-4114-b422-92161f1e22c6	cab40b7d-efca-4778-ad7a-528463c338ad	cost_centers	t	f	f	f	2025-10-27 19:50:34.342063+00	2025-10-27 19:50:34.342063+00
2e3c6cbb-5511-4d6c-ba83-9d66d0fa0574	cab40b7d-efca-4778-ad7a-528463c338ad	configuracoes	t	f	f	f	2025-10-27 19:50:35.105453+00	2025-10-27 19:50:35.105453+00
411cd593-dd07-4949-b9c9-a04395422b8d	cab40b7d-efca-4778-ad7a-528463c338ad	portal_gestor	t	f	f	f	2025-10-27 19:50:35.69109+00	2025-10-27 19:50:35.69109+00
eaa44ffa-1d18-4edc-b268-4fde23503e12	cab40b7d-efca-4778-ad7a-528463c338ad	compras	t	f	f	f	2025-10-27 19:50:36.270456+00	2025-10-27 19:50:36.270456+00
bba26a20-1bcc-4eeb-8327-ef720998cef0	cab40b7d-efca-4778-ad7a-528463c338ad	frota	t	f	f	f	2025-10-27 19:50:36.906357+00	2025-10-27 19:50:36.906357+00
8c9e3c19-864f-4348-9a4d-c2eb4d26159b	cab40b7d-efca-4778-ad7a-528463c338ad	rh	t	f	f	f	2025-10-27 19:50:37.449251+00	2025-10-27 19:50:37.449251+00
4f53ec55-b071-4834-9601-7be012b35e0b	cab40b7d-efca-4778-ad7a-528463c338ad	recruitment	t	f	f	f	2025-10-27 19:50:37.737667+00	2025-10-27 19:50:37.737667+00
378f3851-e49a-4886-8d6e-2d5a7d0c7553	cab40b7d-efca-4778-ad7a-528463c338ad	combustivel	t	f	f	f	2025-10-27 19:50:38.258796+00	2025-10-27 19:50:38.258796+00
44634695-9ad4-417f-a509-6f8296ecb918	cab40b7d-efca-4778-ad7a-528463c338ad	comercial	t	f	f	f	2025-10-27 19:50:38.769689+00	2025-10-27 19:50:38.769689+00
1f07741a-7fb2-4a1a-9266-0a26e8b3d2f6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	portal_colaborador	t	t	t	f	2025-11-08 16:25:02.994706+00	2025-11-08 16:25:05.255046+00
5637763d-7f43-4a6a-bce2-96a7dec2b978	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	treinamento	t	t	t	t	2025-11-08 16:25:44.275705+00	2025-11-08 16:25:47.472596+00
268a5a98-0902-4ae5-a461-1b5d0fe318e4	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	rh	t	t	t	t	2025-11-08 16:25:28.367702+00	2025-11-08 16:26:09.575743+00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, company_id, type, title, message, data, is_read, read_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partners (id, company_id, tipo, razao_social, nome_fantasia, cnpj, matriz_id, endereco, contato, ativo, created_at, updated_at, dados_bancarios, inscricao_estadual, inscricao_municipal, observacoes) FROM stdin;
10dda910-e833-4370-bc59-300cf2173456	a9784891-9d58-4cc4-8404-18032105c335	{fornecedor}	Teste Razão Social	Teste Parceiro	74154745000187	\N	\N	\N	t	2025-10-21 14:35:19.914365+00	2025-10-21 14:35:19.914365+00	\N	\N	\N	\N
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, company_id, cost_center_id, nome, codigo, ativo, created_at, updated_at) FROM stdin;
158824b4-b7db-40b9-9f04-2c1ede1f3950	a9784891-9d58-4cc4-8404-18032105c335	e2a9363d-446b-4af1-a724-b818deeb503d	Teste Projeto	1234	t	2025-10-21 14:24:34.506224+00	2025-10-21 14:24:34.506224+00
d6ccfc08-4635-4bba-af30-abfb94983c90	dc060329-50cd-4114-922f-624a6ab036d6	ec3cebc2-805d-4803-b86b-6df7dd273b67	PETAN05	PETAN05	t	2025-11-08 16:34:52.903429+00	2025-11-08 16:34:52.903429+00
\.


--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_companies (id, user_id, company_id, profile_id, ativo, created_at) FROM stdin;
5ba2d89b-d19e-4206-b749-215610ea5c99	4f94dde8-ab89-46e5-8ae1-572f29074ec7	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:31:55.006508+00
f20b4f53-8f59-46a4-871e-9dfbbf7b6208	5beb4b08-5096-4314-ae54-62f0eb392840	a9784891-9d58-4cc4-8404-18032105c335	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-10-21 13:04:30.689984+00
a78a214f-a464-44b3-94cb-9de5fdf808cd	444bd5e6-7aaa-42f6-b4c6-d2243c13377e	a9784891-9d58-4cc4-8404-18032105c335	cab40b7d-efca-4778-ad7a-528463c338ad	t	2025-10-21 17:45:43.822131+00
60f0d45f-3043-4ebd-a67a-a9fadfd0a1b3	e745168f-addb-4456-a6fa-f4a336d874ac	dc060329-50cd-4114-922f-624a6ab036d6	2242ce27-800c-494e-b7b9-c75cb832aa4d	t	2025-11-06 18:03:49.371414+00
dc6eac5d-6ea7-4bb8-a753-b1a17e0cb00b	e745168f-addb-4456-a6fa-f4a336d874ac	a9784891-9d58-4cc4-8404-18032105c335	cab40b7d-efca-4778-ad7a-528463c338ad	t	2025-10-03 21:32:27.311286+00
594be566-414e-44db-9eff-7f1cf7f6761d	2187fd71-ce7d-463f-9f69-b53e657d7955	dc060329-50cd-4114-922f-624a6ab036d6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-08 16:32:40.790192+00
762562da-4d67-49a1-9a11-3adef59f3237	e745168f-addb-4456-a6fa-f4a336d874ac	ce390408-1c18-47fc-bd7d-76379ec488b7	2242ce27-800c-494e-b7b9-c75cb832aa4d	t	2025-11-10 17:08:54.338251+00
9303f702-4ae7-4c3f-a55d-2af322e33e31	b5f62f30-6b90-4b49-88a2-95c8cf23017f	ce390408-1c18-47fc-bd7d-76379ec488b7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 17:57:40.592564+00
d3a44da3-e92e-4d18-82a7-7f22c92edd4d	b29a79e0-6881-4cf4-8a66-f023cc96e064	ce390408-1c18-47fc-bd7d-76379ec488b7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 18:37:36.523373+00
dc917e6e-19b6-4050-8bea-8b4973a92953	b5f62f30-6b90-4b49-88a2-95c8cf23017f	dc060329-50cd-4114-922f-624a6ab036d6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 18:41:05.940564+00
914b3107-4b4a-4358-812d-cd59aeff04df	b29a79e0-6881-4cf4-8a66-f023cc96e064	dc060329-50cd-4114-922f-624a6ab036d6	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 18:41:16.577072+00
78882230-2f31-4c8f-9aa5-762b2e577404	2187fd71-ce7d-463f-9f69-b53e657d7955	ce390408-1c18-47fc-bd7d-76379ec488b7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 18:56:17.28106+00
fe4e0c80-b843-4148-8453-8236f5c98a04	830ebc7b-1799-448a-84b4-2414b861abb8	ce390408-1c18-47fc-bd7d-76379ec488b7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-10 20:32:14.815872+00
39952d44-585d-41b4-8e1d-4fa025fbac3c	40c07e21-d62c-447d-9de6-16622a2d8729	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:31:53.141242+00
446fb534-c5d8-49b6-9916-2a90ed01bcbb	62610ab5-aaa6-495d-9878-d9cc720ada07	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:32:53.586187+00
162f5029-b0fa-4261-9990-60f8476ad6f4	8ad9a6f7-0b2d-40d1-8729-4350bb3f025a	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-11 12:34:48.351853+00
cae2bdae-4a72-46a8-aca6-3fdc1aeaf6c0	7b62fd6a-7f50-4298-9ae4-5cb71a03d0ce	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:35:34.351227+00
0a4fb60f-ce7e-4fb1-9dd2-25cf86aeeab9	a6261b0f-36f6-45f8-b87b-9dce58fc3198	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:36:31.517336+00
7e6b5b13-bdca-4523-ba46-0c69fccdb96d	83bb4aa0-d75c-4867-b583-0c1d1749a659	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:37:29.107311+00
2cebe3fb-3b3f-437b-9931-d850822b3a4c	d35e363f-4f7d-4c7b-ac89-96724393c93d	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:38:28.844893+00
adf812f8-f055-4aa4-b22c-4bfb05aac274	297f57c0-b558-4dcf-bfc9-ec08b63845db	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-11 12:48:10.20857+00
d880a7f1-8047-4037-a014-06cb9f0803f4	2da01d46-7395-4ad7-abcd-fc27bb24adec	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:49:05.805373+00
81b19538-d99e-4b22-8f21-23a267e47941	36b9788c-44c4-4722-8142-d156f8fa035b	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:50:26.131038+00
f6eff8ba-5165-401e-b5a6-948d7c67ddcf	1190a8a2-be78-40f8-a248-e527340a71fb	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:51:12.208869+00
420470aa-695a-4277-85dd-9caef28ea13a	fed0f623-8713-4054-a17b-84dd9fa1f22c	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:52:15.806511+00
c0ed6450-b892-4a01-a044-87acc7bcab91	75f76a4b-5141-4b6a-ab4f-68d729e7a0bc	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:52:58.023451+00
630e4fb8-94c1-4ba8-847a-adfd13786246	5e056722-c04c-46d1-877a-0eb653a685bc	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:55:17.258412+00
8525944c-e3e2-4c08-b5db-1b5b862ba75e	33c9e80d-f729-4ced-84a9-32ad1f9549d3	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:56:01.628931+00
ce9d09f1-2043-480b-81f9-c97a82d5501d	6ea3485a-4d7d-43b2-b01a-ba9fe354a84a	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:56:42.561171+00
b8f1004c-e1e2-4e5e-a280-1770ba33a491	1300f9f0-9290-46c6-b108-afb13443c271	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-11 12:57:29.244459+00
16b13a56-a37b-4b99-995e-a621d686ff64	2db2094f-1990-4822-8199-4c6dabd2b453	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 12:58:54.847646+00
2a1c155f-cc20-41cd-9259-c53514a056e6	f8115518-ed60-496b-88e0-dc63221a5186	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:07:12.508928+00
ff1b69ea-731c-475e-9169-373bf13d4b01	4f133391-604b-45f6-9c83-926c1824c353	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:09:38.367246+00
04eecbd9-0577-482e-9000-8a22925c9e3e	416dc382-f7da-485b-a1db-8a8fb3c29ffa	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-11 13:11:16.863041+00
7864484c-806a-4942-9103-5d9cd932da0c	50668c07-2cdf-4647-940b-6c1ce768a07d	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:12:08.249447+00
0cf4e0eb-34d6-4ad3-b664-39fdb4a76b65	c1386a66-0657-4b0e-94a4-eb7e17a06164	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:14:49.317629+00
9a6379d0-7943-41a2-973e-d2210dbd840a	9101cb2b-c74c-4eb0-bc8a-144af58412f8	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:15:35.958071+00
55b7ddf6-d149-4ba1-b729-d6f145aa68d3	07eea26c-8878-4e7d-a56c-bc7b1173c432	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:17:03.219937+00
c341ac95-86d5-4d10-bfad-ecdc86a11fc0	6959a0c9-b7ad-405b-b4e6-e29778cfa353	a9784891-9d58-4cc4-8404-18032105c335	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-07 07:46:46.391197+00
ed7f6570-6a09-4977-9015-fb6f8be4eb23	065789b3-c897-4449-82ff-c90a91e20a06	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-11 13:16:28.815101+00
53621c22-d8b9-440c-8324-61e8e5681763	745fa94a-4acd-425e-9489-eb99bbabeabb	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:26:39.303139+00
0da76838-2399-4f48-9fa5-125da6584929	660c0755-12c8-4e8b-b357-48a622fec861	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:27:36.826252+00
29a300b3-cf50-429a-9254-c1beb451a770	b1ff9309-a096-4580-8b6c-c6e17a848fa0	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:28:46.666884+00
4d63f6fe-558a-4347-a922-2629a2f9832a	a3e6fd42-5c99-4f1e-b3ee-56c47c2baf2b	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:29:29.341701+00
bddb7994-2120-4949-a0df-994fd67f6010	3f71c8fe-f082-4c13-b4c8-d1e13d1f3f3f	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:30:08.967418+00
b628c07e-95f5-4bbd-93da-9027be6a20a3	e981d612-11f4-4b06-aac0-6cdab0d5f203	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:32:32.786465+00
7b0466b0-e0aa-41ae-8630-bc633da187b4	70817d7a-e30d-4b04-8441-ae7911e7f896	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:33:10.661359+00
d042e3ad-f875-4994-9ac8-9724ae5d9393	b82e6123-d3a4-4270-bbe4-c48918026c06	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:33:47.294603+00
20c4decf-29f0-47cd-b7d9-0e7f5ad52a54	52838dff-efc6-4e76-91a3-82958d9dce1f	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:34:29.909534+00
3f915226-2eea-4d59-8aab-63ed26d902cb	c71bce59-cb3c-4719-b4bf-4ccee5db52dc	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:35:03.509645+00
2b6dfbae-f912-407f-afb6-6477d65fc549	1734493e-ca46-499c-bb7c-587f6cf09292	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:35:51.120198+00
e584fb8f-b1bb-4f0c-a7b3-b869fe9784d9	cc6da710-3c99-46e5-8694-939a547ab0ec	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:36:49.796957+00
cc3ca6cb-44b3-48c7-b5b5-935f355c9eb9	a878627a-b372-4c5e-a4e8-84068a5bcc72	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:38:34.092703+00
a0760f90-cc42-4f89-ae6e-282cd4fddd89	77ef5ecc-e96e-4963-bbe8-915b83673ada	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:39:25.779284+00
c846764e-1eb4-4b8e-8c3f-f0360b180c0a	69c4c305-37b9-46ac-9ea1-a19d875605fd	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:39:58.144589+00
9fd3dc1a-01b9-46d0-8977-6afe1ea8d006	662a6715-8bb1-47e2-8dec-e42adbabe59a	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:40:53.806094+00
5b4e041e-96ac-4f0f-bce9-21aba9b1a505	25016b5e-5e6e-41bb-ad35-193f5024dbe3	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:41:38.1476+00
20ad1b08-aca3-49fa-a166-3bbfdc3f0b4f	fad227bd-1e41-49da-8210-f9b46f367276	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:42:18.88782+00
fbf3bca9-9f4a-4a4e-bbc5-0ab90a4ca547	77813097-53ec-40e3-80c5-1d70ae351a85	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:43:13.119034+00
5f5cb943-083d-4b7a-a11b-a739753e2622	96c6d2df-7b86-4e11-b6fc-d9e4adc8969a	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:44:18.258193+00
d83301d1-9ddc-4e58-9a67-90fc16ab0f54	13a3f2b3-578c-4ff0-89a0-3f0e62b205cb	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:45:03.568002+00
50226ed8-3292-4c40-8e55-57dad02e148d	9989e703-ea99-42ac-ab26-77bc46eeed4d	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:45:35.738552+00
f9ebb043-e767-446b-ad01-a0b99ad13fe3	f0920156-ba6e-4c61-b961-f0143f4b8e10	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:46:08.147629+00
1fb4d922-cfdd-4619-a81b-4c074ff3cd52	8ad9a6f7-0b2d-40d1-8729-4350bb3f025a	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:48:39.545863+00
fa0b897c-1451-4618-b959-ad8cf28cc028	1300f9f0-9290-46c6-b108-afb13443c271	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:48:51.476903+00
713ba7f0-2e4b-4948-a7ca-6035761abd39	416dc382-f7da-485b-a1db-8a8fb3c29ffa	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:49:00.095481+00
38565c23-c7ae-406f-bdae-50c8a9207cbe	96c6d2df-7b86-4e11-b6fc-d9e4adc8969a	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:50:06.163324+00
dffe892b-2794-4238-88c6-f458a32f3374	13a3f2b3-578c-4ff0-89a0-3f0e62b205cb	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:50:14.697183+00
f0c15f1c-f8f3-43e4-8912-f7a18a034393	745fa94a-4acd-425e-9489-eb99bbabeabb	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:50:44.750545+00
f39d92df-f37a-4d01-b502-2dce6a025bfa	660c0755-12c8-4e8b-b357-48a622fec861	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:50:54.867293+00
d07aecbd-fb5e-45ff-8be0-2d36664ad9d7	b1ff9309-a096-4580-8b6c-c6e17a848fa0	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:04.961065+00
b41e3760-24ba-49f7-aa28-f142ea5e0b64	a3e6fd42-5c99-4f1e-b3ee-56c47c2baf2b	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:11.852896+00
caea7edf-10e7-4ec7-9d55-7f758c1fee73	3f71c8fe-f082-4c13-b4c8-d1e13d1f3f3f	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:24.371624+00
610732b2-dfcd-4185-a240-222a6e0db286	4f94dde8-ab89-46e5-8ae1-572f29074ec7	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:32.34163+00
74fdc512-5b45-4864-8c4d-cdfc4b104b05	e981d612-11f4-4b06-aac0-6cdab0d5f203	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:43.463017+00
fa8ceb0f-56cb-4495-b55f-cf93e6a9cbe0	70817d7a-e30d-4b04-8441-ae7911e7f896	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:51:53.207005+00
1e91c378-2521-4c25-8754-a30df92725a1	52838dff-efc6-4e76-91a3-82958d9dce1f	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:52:15.364449+00
a14bf2e0-a166-4060-a349-afec46ae9bfe	c71bce59-cb3c-4719-b4bf-4ccee5db52dc	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:52:26.985032+00
62b4b2f2-d1a9-4d22-9638-4f964c59815b	1734493e-ca46-499c-bb7c-587f6cf09292	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:52:38.285012+00
515d4b3c-d45f-4245-9672-bf40d8bc3629	cc6da710-3c99-46e5-8694-939a547ab0ec	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:52:55.705825+00
42fd02ad-d218-473f-9723-9ecf6d52d42d	77ef5ecc-e96e-4963-bbe8-915b83673ada	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:17.029949+00
389d8b76-2678-432f-9571-0607c98272c9	25016b5e-5e6e-41bb-ad35-193f5024dbe3	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:46.039965+00
ef46f0c0-1a7c-4b15-a090-60c95c6f7240	77813097-53ec-40e3-80c5-1d70ae351a85	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:54:07.295013+00
50aab58f-f2c6-46f9-b3f7-dbd3a954a4a8	9989e703-ea99-42ac-ab26-77bc46eeed4d	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:54:17.940901+00
94ac0de6-b365-4fa7-8f4b-6f8b52bc1a67	f0920156-ba6e-4c61-b961-f0143f4b8e10	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:54:27.331511+00
58aeafe8-5dc3-448b-92f3-b13d2315d783	a81daf27-f713-4a6c-9c50-d9c3a4664e51	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:55:24.630159+00
71ba88cd-2ea4-40bd-880f-296810c89086	a81daf27-f713-4a6c-9c50-d9c3a4664e51	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:55:43.416278+00
84d0487f-0055-4d63-a4f6-153674c59dc4	b82e6123-d3a4-4270-bbe4-c48918026c06	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:52:06.160316+00
69f30300-d342-4d06-a37c-ab9ad0ddfa8d	a878627a-b372-4c5e-a4e8-84068a5bcc72	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:07.051493+00
9cb14feb-80b4-45ab-a71c-1a90e5b43af7	69c4c305-37b9-46ac-9ea1-a19d875605fd	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:25.893318+00
efbe7be9-582b-4d53-b061-1c4dc9ada68c	fad227bd-1e41-49da-8210-f9b46f367276	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:55.569054+00
5acf7111-a5a1-48de-9013-65d37262e57f	662a6715-8bb1-47e2-8dec-e42adbabe59a	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-12 17:53:36.781808+00
ebb63d37-ef10-4fef-a761-ffb9c4c8417e	092aca0a-4645-4412-ba84-4fa99f68af6e	ce390408-1c18-47fc-bd7d-76379ec488b7	8fe0f2a9-39b5-492b-8e57-70ed716c36fa	t	2025-11-12 20:45:02.866403+00
12fab84a-f158-4871-b8e5-4ab63c2630ee	d6ed4799-50f0-40fb-bb8e-e042d53e0017	dc060329-50cd-4114-922f-624a6ab036d6	2242ce27-800c-494e-b7b9-c75cb832aa4d	t	2025-11-13 11:42:09.17164+00
cfc5fa5d-0c67-4ea4-9ac4-a58337ab7e96	d6ed4799-50f0-40fb-bb8e-e042d53e0017	ce390408-1c18-47fc-bd7d-76379ec488b7	2242ce27-800c-494e-b7b9-c75cb832aa4d	t	2025-11-13 11:42:54.94223+00
e6431a53-fb2b-4e6a-a5cf-45944ead0bed	3d5e636f-8cc5-4b42-8acc-45c7e4a3ba3d	ce92d32f-0503-43ca-b3cc-fb09a462b839	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 20:58:45.743398+00
9191b378-4869-428c-8678-9bc431883f59	1c8703dd-6a75-48b1-88f0-cbdee90df590	f83704f6-3278-4d59-81ca-45925a1ab855	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 20:59:53.339803+00
a21dd0f0-f2a3-4734-b4d2-47374a5ae34e	1c8703dd-6a75-48b1-88f0-cbdee90df590	ce92d32f-0503-43ca-b3cc-fb09a462b839	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:01:40.351295+00
37664330-2c28-4823-8021-b3fcb2af0a79	3d5e636f-8cc5-4b42-8acc-45c7e4a3ba3d	f83704f6-3278-4d59-81ca-45925a1ab855	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:02:05.062444+00
561cb802-84dc-4163-bb54-3cb043899678	1c8703dd-6a75-48b1-88f0-cbdee90df590	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:02:23.630176+00
677b359a-6c5a-4ae1-9d0e-4b8065cf8840	3d5e636f-8cc5-4b42-8acc-45c7e4a3ba3d	ce390408-1c18-47fc-bd7d-76379ec488b7	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:02:32.659095+00
2ff3302d-ebbd-45d3-bad3-5d03334ebf1e	1c8703dd-6a75-48b1-88f0-cbdee90df590	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:02:47.311586+00
1480a3c8-d3f7-4305-a941-c3ced1d1b66b	3d5e636f-8cc5-4b42-8acc-45c7e4a3ba3d	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-13 21:02:57.727064+00
cdc9b545-7e7d-4052-bd0e-51972b322193	d34a0b00-c9ec-402a-8b1c-56602a79343b	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-13 22:49:21.624741+00
15bd4409-6efb-49c3-8a5d-b1f09ea6d8e2	720e3e1b-e4f9-45bb-8f1e-29aa0e711443	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 10:17:50.081601+00
f668c2aa-dbef-4ae8-9a14-3fd7beab4232	d92b2609-c51f-4e5e-b915-4c4c18d73902	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 10:23:49.20093+00
f329d35a-95f0-4afd-bfab-3fdff8e48264	3e2c7ef6-4436-4cf4-af3d-1f5620349a03	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 15:50:22.914523+00
edc32b1d-9f8b-4335-8a72-01e73c07d995	7c7ae614-4228-4ec6-83a3-aa48fe77ff2c	dc060329-50cd-4114-922f-624a6ab036d6	f351d6c4-28d1-4e85-9e51-bb507a9f3e7e	t	2025-11-17 15:54:32.234383+00
61609919-a21a-42ff-a320-e44255daf862	b1317785-7651-4e4d-8e33-0dd9a8592efd	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 15:57:45.005872+00
3ac6704a-198f-4f26-a863-333d6028bb3e	dc0e8bb9-56d5-465a-b7ee-d89f7f616e45	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 16:01:35.385473+00
34d4739d-730f-4fcb-a747-0ae6614d168f	245aefda-00d2-4819-9a74-c4e150c7c6fb	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 16:06:29.903222+00
04a8b249-5cb4-42a8-aed4-d9d9825459e6	6496d8a1-3cbf-4884-9be2-997bc16707b6	dc060329-50cd-4114-922f-624a6ab036d6	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 16:07:56.015142+00
80ca6c5a-61f6-484c-926a-2cfb5570c7da	3615605e-b1cf-4e8d-a468-b4784ac4c8c0	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:45:46.778755+00
98adf25a-621c-4145-a77e-24da9f0e2fa1	a65feb85-2394-45e5-9478-be8e51e89701	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:46:44.32959+00
250cd176-dca5-4b93-81fa-bf1dc8defb99	497042e0-2153-4ef6-919b-32418d1f2294	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:47:25.491331+00
a596a3cd-2a6c-46df-bcb2-685c8f3da9d7	cca6ef95-93fd-4dce-a3a9-e30fb39f7182	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:48:48.166377+00
df233b5b-2960-4507-b561-db605becc611	46bbdef4-9c0e-44c8-b8d4-a43fe8d12722	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:49:27.036172+00
537fe395-d1f5-4a3b-b86f-3e51437571ae	a5a58125-3dab-4862-99cb-c9ab2f1e47e9	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:50:01.407781+00
f92b4616-b669-4be7-9d21-f167028a7e6c	fb7b5158-8539-4709-b8b9-f7a333378408	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:50:40.215928+00
c52f4b02-66db-4ef9-a181-f14defa157c2	66760b50-1cbe-420d-b0dd-fbd71602a693	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:51:16.006419+00
c59a20c7-2e3a-4fdf-ab9e-a1b07407304c	6bc1f0b7-9da2-405c-a625-4f226388c850	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:52:02.259011+00
14811c90-b003-414d-bf18-8038b4666bbe	6c17feb2-b75a-4c84-a0e6-3e81b2c9407b	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:53:20.323408+00
82febaf3-7d82-4c68-ace2-b8800727dcd4	7e640212-1eb2-443f-bf6c-26aee5d66624	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:54:36.427401+00
a701541f-9691-4271-ad3f-af21c35fd1ca	b182cdc0-058a-43ef-aede-6270f76d58d1	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:55:13.863265+00
2975a0b1-db1d-4890-ac75-20adb65859b0	1e3b09e0-38da-4b29-9dea-8be21e94d552	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:55:59.782376+00
905c9e2b-71d9-4de2-8e39-ec185ef0fa5a	99f57156-2a71-4f8f-af1c-78ff8e4258dc	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:56:35.622987+00
ac911f94-4042-4b51-8cbc-2ac2139ca893	400b4066-6cbe-48d6-917e-539dbccaf727	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:57:09.148907+00
a0141822-89e5-414b-9a46-5d4bf4cb22dd	a9a68604-88e4-465d-86d4-d8a0651ec07a	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:57:45.611396+00
5b4adb0e-ef8d-466e-9506-da534d5a63d4	e0d16164-969e-4fc7-8f13-1689b1d0d813	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:58:16.556328+00
044df164-6a61-45b6-bd23-78c9e556e560	cf497294-c28d-4146-9676-ed11ccc15886	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:58:54.18497+00
067107d4-79f0-4c8f-a38b-036f73f9f4bd	93359439-3060-42f6-bcb9-800aed930d6b	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 19:59:37.67949+00
6207aa49-5a9d-4bc2-a3a0-8029873e2c6b	6c091d7c-5ef9-4e70-b211-bb286dbf0571	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:00:24.682149+00
2339f7cf-b63e-4837-a67b-2315d6876b01	bc3e4abc-23fa-4ef7-88f9-f058e7f5f8b0	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:01:03.613512+00
ee4abaa3-342f-478c-80e6-1eca94d3737a	979ab652-5acf-41e0-a94b-d098b9c8e81d	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:01:33.936033+00
6bff849b-e980-4363-a117-9d0dc6a74fa2	a75e9919-cd7a-4b87-af98-9ee5cff01208	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:02:12.909842+00
1e1be783-97e7-4cec-9d6c-293b7862d8bb	0cf2fd55-ce76-4897-8fc6-4eae6957e14b	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:12:20.337874+00
66f56a5d-1457-45de-ad17-6dada2bfb485	d8fe3853-a18e-4176-b683-ed1e509ef398	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:13:15.289797+00
06d9ce50-7fe7-48d7-bbf2-66365baf16f9	8c17d9c8-4297-4e80-8fe5-60d71e7e291b	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:13:47.483753+00
60fb620d-6744-4883-b1f9-09d10d367b2a	5de7836f-ac0b-4371-ac16-73e3f97b43ce	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:14:31.942799+00
b64dcf09-186b-4ee7-92d9-bbe1e0f3f18e	2e60b586-ca07-49c6-b009-2a861f8c1f0f	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:15:28.44036+00
a1aada08-1a09-4e7e-9733-8a648a9fe314	4f21a826-e659-4791-9239-d7989ec71bae	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:15:56.595734+00
e985d414-c30e-49e8-b929-71f0fd89231b	55ddcc41-c609-4f2e-99c1-2c54696b66a9	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:16:51.070992+00
488528c5-6fa0-4b2e-80c2-90b8c157a164	dc9e01c6-2359-43dd-a51b-16af6c50bc76	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:17:30.38252+00
2a5cad36-9aae-49db-96cf-30de384925cc	1d00058f-4486-4cb2-af97-b7e8de1b99cb	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:18:09.483112+00
e99250f0-e5cc-4968-831e-9c92830f72f9	8c7abacb-ac8d-42c8-b51c-bf257c4c6498	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:18:39.170293+00
bd22f932-0f3e-45a7-87f8-6eb910710cdc	d0f05020-7625-4bc5-a64d-a183eee8063b	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:19:09.729407+00
09d21543-5690-4794-a012-0641713c0cf6	cb8c449a-cb45-4ec1-a606-544154ed0371	f83704f6-3278-4d59-81ca-45925a1ab855	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:20:05.430049+00
090efca6-d7ab-4bf7-b254-297948ab7773	d41fa983-a756-4228-9b82-4020d7dcba8c	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:49:17.432218+00
a0173a2a-73f1-471e-ba67-b9279d6d114b	4a35e536-4966-490d-9512-89c4daea5cfd	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:50:12.432918+00
190fb333-e058-4c24-bdb8-c3d1ef22479f	73ba67b1-a626-46f1-97a0-f383925f705a	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:50:52.901961+00
a0a89bb6-6b85-4ac9-a481-eedd50859972	b5f18c03-d757-4bf3-ba0a-51da1f61ee36	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:51:36.133216+00
7dd52e10-1001-4b13-a873-934a125f004c	5ffebe72-705e-45c5-83f0-48a999256e39	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:51:59.896753+00
4c90edb0-d9af-4708-8061-a3cadc3d7a49	ae4cc578-db65-419c-8118-dc5dbc7e32d9	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:52:31.004733+00
a3aefb8f-d3f3-4a2c-a65e-25c6efb9f4c7	27ffe190-d998-4847-8928-c1f728ec1669	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:53:36.486837+00
c810f522-ff3b-4385-b839-5037dc66be43	4b8cecb2-73a0-4a8b-b762-fcfe3cf258bb	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:54:07.167718+00
0903055a-0736-4f0d-b97a-55eedc286eb1	baa5c54c-9beb-48c0-b6a5-1db57e89c7f0	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:54:59.612517+00
4072dda5-bee1-4bee-aa1f-6ddb502f550b	e6fed591-7f4c-494b-b7b3-2524f1b4c053	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:55:50.740963+00
7b469bfa-2188-481f-98d6-fac090394fe7	bb71ca66-6b49-4e95-96bf-f607e94445a3	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:57:08.159582+00
c6fce05b-59e5-4aa1-a975-8992cb7ba30f	b9d2ee53-facd-4ee7-9a4c-915beadd50a7	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:58:07.273196+00
7ed0d280-26e2-43e9-9ca2-7eef9320f497	eb5afe0f-df68-4f95-8f0f-6b604d0514d3	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 20:58:39.937723+00
1a29e9d7-eae9-4bc0-9980-f15e0fd45a78	587949a0-a20a-4a99-bdcc-257bef2c4065	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 21:00:22.77986+00
66f79ba7-43d2-457c-95bc-0eaa5b77b431	2b8231a5-fac8-4152-a636-539ffcd5af4d	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 21:01:07.031384+00
de8275cb-ce48-4a0b-b3ea-44d0ec2a9268	3b64e54c-d172-40b9-9cd5-9b8061c95c07	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 21:03:44.982188+00
cf023f80-0cc3-44bf-a3ec-f7cd4dd0ed70	6d22f435-8d3d-4cbc-88b0-8e3992a4a98d	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 21:04:20.783409+00
a4285980-3b7c-4e89-8ac5-a73ab06f1f62	8b513e72-d92c-44ed-a5d0-74c124fb0c1f	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-17 21:04:46.842199+00
8e627b07-43e8-49ab-974f-7f5b819a8ac0	ed191236-b71c-419e-b7aa-ad0b47776dab	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:20:41.399403+00
c4e436e5-fed0-42d8-98c0-2d640024a817	17df4d25-3137-4dd3-87a1-730a4a668884	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:21:16.660246+00
6de756f6-8aab-4d7c-9e11-3fe0d66be135	5150a482-bf49-4ec0-891c-b84e228d3398	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:23:55.206514+00
d48e1323-4cae-4acc-abaa-d4f977abb18e	f408cdd5-717c-466c-8c87-2a774b56053f	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:24:25.799577+00
b5844c72-4235-412f-a374-ecf1c4072ea2	049c0717-62a1-47a7-af62-c12d579e4d12	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:26:11.203615+00
41667aa3-336f-4cc3-b3d2-3a355ed499fe	dd2870ce-ec5c-4209-b99d-0ca2ca315a82	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:26:50.416005+00
c2e788f1-f127-47dd-8401-9850e632acae	0ec9819b-945c-4424-ae2e-201f60ea5c94	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:32:20.065896+00
5d6a0693-d481-4f64-bbf2-90aae5e14f80	c0439736-4edb-4170-8c8a-547221936b3d	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:32:53.106799+00
a47ce139-476f-4ac2-bbcf-afef19aa3fc5	0ecc8e9d-8981-4f83-b440-7d4ed744c6cb	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:34:25.324459+00
dfc6c6bf-1d74-4b1f-87ad-04b747a0ef76	4b1d3a84-c5ff-45da-8c0c-5096dcc1e4cd	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:34:51.322915+00
d535d303-2bc5-4bf8-8f17-862d2748ff30	f9517ac2-8f13-4be5-95af-ae65c42f0696	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:35:22.571169+00
cb86553b-6ac5-42d7-9ef1-5a4acd28d4e5	967aabaa-3e0e-406e-bc2f-3679673d0dc5	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:36:01.204084+00
606e30bc-16c3-4d11-a103-14a38eb07183	e0d57706-ed52-4a42-90e6-6ef2e7f0c730	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:36:26.912517+00
fe987bac-7f11-4d04-b41a-ea0944871185	ab086526-fb31-4855-a0c0-0a1467c042db	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:36:56.206485+00
db3f15f0-cddc-4a5d-adf6-8d51ab535761	7952ddc4-daa0-4b26-aa8c-312616c0431e	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:37:19.627573+00
b5783f4c-06d1-4593-abcc-11baaff0a2ba	8bb1fa0f-ce76-4a50-9bc5-cc03a122dec6	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:37:44.700473+00
53245ec5-f186-4e35-bef5-91252094a111	66052b7d-c679-4943-85f6-ef6b3744094d	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:38:08.997547+00
4a54aecb-a5ea-4c26-8666-5717dc37969c	769bc18f-b8df-4328-b37f-48af0538945b	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:38:45.749429+00
a80d98eb-7123-4b66-962f-30bdc6977f7c	5e6d67d1-0475-435b-868e-5fb0df865b6f	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:39:17.728223+00
5c8c17a4-4889-4415-bada-f92cb2075163	88afe2f0-0773-49fa-b063-fe4cdd7f66a9	ce92d32f-0503-43ca-b3cc-fb09a462b839	3ce71d8d-c9eb-4b18-9fd4-a72720421441	t	2025-11-18 14:39:51.957072+00
\.


--
-- Data for Name: user_cost_center_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_cost_center_permissions (id, user_id, company_id, cost_center_id, can_read, can_create, can_edit, can_delete, created_at, created_by, updated_at) FROM stdin;
\.


--
-- Name: company_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_number_seq', 6, true);


--
-- PostgreSQL database dump complete
--

