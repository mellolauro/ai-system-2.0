--
-- PostgreSQL database dump
--

\restrict BYiMRx5ZoseqJLtIUM1eHHR79Q72BiTTykZ7Xh541psoQLXLlhf6sVYvBRK01KC

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admin
--

COMMENT ON SCHEMA public IS '';


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."OrderStatus" OWNER TO admin;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED',
    'CANCELLED'
);


ALTER TYPE public."PaymentStatus" OWNER TO admin;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AIRequest; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."AIRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text,
    prompt text NOT NULL,
    response text,
    tokens integer,
    agent text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AIRequest" OWNER TO admin;

--
-- Name: Cart; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Cart" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Cart" OWNER TO admin;

--
-- Name: CartItem; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."CartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL
);


ALTER TABLE public."CartItem" OWNER TO admin;

--
-- Name: Conversation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Conversation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Conversation" OWNER TO admin;

--
-- Name: Delivery; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Delivery" (
    id text NOT NULL,
    "orderNumber" text,
    "customerPhone" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "tenantId" text,
    "driverId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "addressLine" text,
    "deliveredAt" timestamp(3) without time zone,
    "estimatedDelivery" timestamp(3) without time zone,
    latitude double precision,
    longitude double precision,
    "orderId" text,
    "recipientName" text,
    "recipientPhone" text
);


ALTER TABLE public."Delivery" OWNER TO admin;

--
-- Name: Driver; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Driver" (
    id text NOT NULL,
    "tenantId" text,
    name text NOT NULL,
    phone text NOT NULL,
    vehicle text,
    plate text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastLocationAt" timestamp(3) without time zone,
    latitude double precision,
    longitude double precision,
    status text DEFAULT 'AVAILABLE'::text NOT NULL,
    "vehicleInfo" text
);


ALTER TABLE public."Driver" OWNER TO admin;

--
-- Name: DriverLocation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."DriverLocation" (
    id text NOT NULL,
    "driverId" text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DriverLocation" OWNER TO admin;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Message" OWNER TO admin;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "cancelReason" text,
    hidden boolean DEFAULT false NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "paymentMethod" text,
    total double precision NOT NULL,
    "trackingCode" text,
    carrier text,
    "paidAt" timestamp(3) without time zone,
    "shippedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO admin;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "productName" text,
    quantity integer NOT NULL,
    price double precision NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO admin;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    price double precision NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "imageUrl" text,
    active boolean DEFAULT true NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Product" OWNER TO admin;

--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    url text NOT NULL,
    "productId" text NOT NULL
);


ALTER TABLE public."ProductImage" OWNER TO admin;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    "maxTokens" integer DEFAULT 50000 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "agentName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO admin;

--
-- Name: Tool; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Tool" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    config jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Tool" OWNER TO admin;

--
-- Name: User; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "telegramId" text,
    phone text,
    email text,
    name text NOT NULL,
    "avatarUrl" text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO admin;

--
-- Name: UserMemory; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."UserMemory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserMemory" OWNER TO admin;

--
-- Name: WhatsAppSession; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."WhatsAppSession" (
    id text NOT NULL,
    phone text NOT NULL,
    "sessionId" text NOT NULL,
    "tenantId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WhatsAppSession" OWNER TO admin;

--
-- Data for Name: AIRequest; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."AIRequest" (id, "tenantId", "userId", prompt, response, tokens, agent, "createdAt") FROM stdin;
\.


--
-- Data for Name: Cart; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Cart" (id, "userId", "tenantId", status, "updatedAt", "createdAt") FROM stdin;
cmtrutqjw000f85sf8sojci4u	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	checked_out	2026-09-07 23:11:05.376	2026-09-07 23:11:00.525
\.


--
-- Data for Name: CartItem; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."CartItem" (id, "cartId", "productId", quantity) FROM stdin;
cmtrutqky000h85sf3n887l9b	cmtrutqjw000f85sf8sojci4u	cmtrewm0w000l85k6chbacbmh	1
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Conversation" (id, "userId", "tenantId", "createdAt") FROM stdin;
cmtrki20i000185e8mwktr2ch	user_123	cmtr96kjb000085vfrvtxmqwj	2026-09-07 18:21:59.346
cmtrpmnhg000785e8nqyyvxj2	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-07 20:45:31.876
cmtrpr65t000185koznoy8nds	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-07 20:49:02.705
cmtrup41o000185sf2pbs9fkk	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-07 23:07:24.733
cmtuqw4un0001857dwt058ax2	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-09 23:44:12.431
cmtxgxi2b0001852e5t5hqp8q	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-11 21:28:38.579
cmtxh3ztg000185a0r1tuozha	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-11 21:33:41.525
cmtxhskya000185qka0fruyvl	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-11 21:52:48.659
cmty8k32400038588eazcl2nm	cmty8k2s400018588h0d9t2v5	cmtr96kjb000085vfrvtxmqwj	2026-09-12 10:22:01.852
cmty9jmoc000185a1jlf3rfly	cmty8k2s400018588h0d9t2v5	cmtr96kjb000085vfrvtxmqwj	2026-09-12 10:49:40.236
cmtyfqtxm000b85a1prqyucn7	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-12 13:43:13.93
cmtyq3y7d000185yeby1ohv4i	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-12 18:33:22.154
cmtyqvegv000185gbf454m10n	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-12 18:54:42.943
cmtyslgci000385cpm2sfjlnh	cmtyslgbj000185cpqt228dju	cmtr96kjb000085vfrvtxmqwj	2026-09-12 19:42:58.051
cmtyty9t5000d85cp411ot0zv	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-12 20:20:55.721
cmtz17vft000385s8v6i1ycxz	cmtz17ved000185s8f2g71u95	cmtr96kjb000085vfrvtxmqwj	2026-09-12 23:44:20.97
cmtzsbso6000185xg926mzt5u	cmtz17ved000185s8f2g71u95	cmtr96kjb000085vfrvtxmqwj	2026-09-13 12:23:13.638
cmtzspm37000v85xgm2r9jgaa	cmtrpjzcb000185c715vfvf5p	cmtr96kjb000085vfrvtxmqwj	2026-09-13 12:33:58.291
\.


--
-- Data for Name: Delivery; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Delivery" (id, "orderNumber", "customerPhone", status, "tenantId", "driverId", "createdAt", "updatedAt", "addressLine", "deliveredAt", "estimatedDelivery", latitude, longitude, "orderId", "recipientName", "recipientPhone") FROM stdin;
64375648-7796-477b-9f50-4514d1467b5e	PED-1042	+5521999999999	IN_TRANSIT	cmtr96kjb000085vfrvtxmqwj	driver_01	2026-09-07 18:17:26.79	2026-09-07 18:17:26.79	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Driver; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Driver" (id, "tenantId", name, phone, vehicle, plate, active, "createdAt", "updatedAt", "lastLocationAt", latitude, longitude, status, "vehicleInfo") FROM stdin;
driver_01	cmtr96kjb000085vfrvtxmqwj	Carlos Entregador	+5521999999999	Moto Honda CG 160	ABC-1234	t	2026-09-07 18:11:32.214	2026-09-07 21:28:04.548	2026-09-07 21:28:04.547	-22.74824	-43.449875	AVAILABLE	\N
\.


--
-- Data for Name: DriverLocation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."DriverLocation" (id, "driverId", latitude, longitude, "timestamp") FROM stdin;
da3274c0-962e-4c44-8679-614e20050446	driver_01	-22.755946	-43.460019	2026-09-07 21:12:15.336
c2c30281-31d1-4252-b772-e015804eb85e	driver_01	-22.755773	-43.459806	2026-09-07 21:12:18.259
d013631d-d629-4844-82d6-f2fbfe765a99	driver_01	-22.755604	-43.459593	2026-09-07 21:12:21.27
ed492e45-1cc7-4604-adb3-299d848faf2e	driver_01	-22.75545	-43.459417	2026-09-07 21:12:24.259
32fe57a7-8e27-47f1-8692-4b5dc8363f5e	driver_01	-22.755941	-43.459996	2026-09-07 21:15:55.533
78e442aa-55a2-4796-b6aa-c1cd85cd3bd7	driver_01	-22.75581	-43.459772	2026-09-07 21:15:58.454
fa683441-093c-4775-8c5a-71104a64b66e	driver_01	-22.75567	-43.459589	2026-09-07 21:16:01.51
660e82dd-3539-4aa1-ad43-3f5ad1eaf410	driver_01	-22.755523	-43.45937	2026-09-07 21:16:04.454
c352ec0e-241a-4e93-9466-4bf8445c54ed	driver_01	-22.755377	-43.459172	2026-09-07 21:16:07.46
237a361c-cbab-4b67-9569-d34c0c354034	driver_01	-22.755248	-43.458975	2026-09-07 21:16:10.454
43df26d5-aa95-4979-9058-4c0372141cc2	driver_01	-22.755074	-43.458781	2026-09-07 21:16:13.46
549cf64b-237e-4f90-933c-7aabd50dcc49	driver_01	-22.754901	-43.458601	2026-09-07 21:16:16.466
0fdc7ee3-733c-4af6-bc8e-bac1b9491c2b	driver_01	-22.754776	-43.458425	2026-09-07 21:16:19.466
0ad6fe49-a5bb-4894-a2de-abc987c6e941	driver_01	-22.754616	-43.458239	2026-09-07 21:16:22.466
f8c2727f-6a15-422c-817d-afea21abe8e3	driver_01	-22.754471	-43.45805	2026-09-07 21:16:25.472
772f10f4-1b66-4a51-bc2b-f66576e53b4d	driver_01	-22.754343	-43.457841	2026-09-07 21:16:28.488
94973e17-ed58-4cca-8bd4-12f6dd895929	driver_01	-22.754199	-43.45764	2026-09-07 21:16:31.484
8639e21b-0cb3-48c9-b70a-536c1995f400	driver_01	-22.754052	-43.45744	2026-09-07 21:16:34.477
dc5753f4-4d1e-4501-980e-8b833cc4c43f	driver_01	-22.753898	-43.457234	2026-09-07 21:16:37.495
df1d90d2-7e2b-423c-91ae-a09d8e8e8b03	driver_01	-22.753732	-43.457032	2026-09-07 21:16:40.488
faa29950-07e4-417a-b17a-1cf7d0994c81	driver_01	-22.7536	-43.456856	2026-09-07 21:16:43.488
d4b87d98-bd3f-47ce-b63a-9b1ed939459a	driver_01	-22.753431	-43.456661	2026-09-07 21:16:46.489
daa4ff9a-7534-47a1-8796-25067af24d2f	driver_01	-22.753272	-43.456475	2026-09-07 21:16:49.507
ca64dd0e-9579-409a-9484-6a53c7f99823	driver_01	-22.753132	-43.456298	2026-09-07 21:16:52.5
cf00fd14-5a61-46bb-8b7a-418633a4f830	driver_01	-22.75298	-43.456102	2026-09-07 21:16:55.518
54147318-491b-4425-867a-35a8f5753a05	driver_01	-22.75281	-43.455895	2026-09-07 21:16:58.5
fc259449-26cd-4b89-ab0f-ff12cbf77582	driver_01	-22.752684	-43.455678	2026-09-07 21:17:01.511
d59d3a8d-00df-4074-9887-d416a85f04c1	driver_01	-22.752535	-43.455497	2026-09-07 21:17:04.553
8dc3a1f5-aecf-472a-bf94-7ae5b8ae8ff9	driver_01	-22.752398	-43.455307	2026-09-07 21:17:07.512
ddb91a22-8a67-42d9-a9f4-33c8df8c5777	driver_01	-22.752243	-43.455117	2026-09-07 21:17:10.542
3b6258b3-5d83-41b2-a877-8f5b4f66b882	driver_01	-22.752083	-43.454936	2026-09-07 21:17:13.511
21c01fc5-cc42-4409-9543-68d8560f1a8f	driver_01	-22.751917	-43.454755	2026-09-07 21:17:16.542
a02c8f0e-5e7e-49c9-b45d-6fd6547f35a5	driver_01	-22.751744	-43.45456	2026-09-07 21:17:19.523
e8f3770e-3238-4f92-88f0-53aa53fd02c8	driver_01	-22.751588	-43.454351	2026-09-07 21:17:22.523
23df48f8-87e4-4465-ac10-95fe29d3ba13	driver_01	-22.751444	-43.454148	2026-09-07 21:17:25.523
0bbaf543-5789-4a9f-b81b-5e85bf65858c	driver_01	-22.751305	-43.453924	2026-09-07 21:17:28.534
00598564-7ad0-419a-8821-b81458225944	driver_01	-22.751137	-43.453732	2026-09-07 21:17:31.534
f1f110f7-8275-4537-a04f-9aec1d481b86	driver_01	-22.750997	-43.453554	2026-09-07 21:17:34.543
812de2a7-584a-4d0c-957c-9d228c696793	driver_01	-22.750837	-43.453373	2026-09-07 21:17:37.546
e23d713d-ca46-4555-a121-ffa6dc893e07	driver_01	-22.75068	-43.45317	2026-09-07 21:17:40.555
391364b9-8e15-4b92-9f82-306b68a4c2d9	driver_01	-22.750509	-43.452949	2026-09-07 21:17:43.546
7cab7825-4e87-4482-a9dd-124b0ee40d52	driver_01	-22.75037	-43.452753	2026-09-07 21:17:46.557
aa10a92b-384b-417d-96f1-2b934bdc8c1e	driver_01	-22.750219	-43.452568	2026-09-07 21:17:49.546
391adb4b-09ac-4bec-ab3a-08d2407383ee	driver_01	-22.750045	-43.452386	2026-09-07 21:17:52.546
d7d44bd5-76bf-4cf1-bf9f-a377def0a11b	driver_01	-22.749917	-43.452191	2026-09-07 21:17:55.558
2300521e-3302-4ce2-9aa1-29a9cf72905c	driver_01	-22.749781	-43.452004	2026-09-07 21:17:58.557
3acca834-8e00-4825-a553-5e4215cf6f91	driver_01	-22.749644	-43.45178	2026-09-07 21:18:01.57
4a499ac8-1fbe-4c68-8b72-918c4d6d1129	driver_01	-22.755967	-43.459987	2026-09-07 21:25:31.493
e84ab723-a2a9-4ece-af8a-50345f288a96	driver_01	-22.755811	-43.459766	2026-09-07 21:25:34.438
0c54990d-05b5-4ad7-92dc-7db83dfc3ea8	driver_01	-22.755684	-43.459584	2026-09-07 21:25:37.438
631771b9-e63b-491c-a282-4bc3a3fe5d8d	driver_01	-22.755523	-43.459361	2026-09-07 21:25:40.437
174be97b-08e3-4890-aa69-fdb75fa0a9e3	driver_01	-22.755352	-43.459172	2026-09-07 21:25:43.444
4c9ea984-9167-463c-bc07-b5bbdd99e7dd	driver_01	-22.755197	-43.458976	2026-09-07 21:25:46.438
473fd818-052d-4c84-8d5d-6f27b3eaf771	driver_01	-22.755051	-43.458796	2026-09-07 21:25:49.444
ef7cda40-abc3-4b8c-b788-becd87172d62	driver_01	-22.75491	-43.458605	2026-09-07 21:25:52.438
794b215d-774a-4b43-8116-f155890f8b7f	driver_01	-22.754741	-43.458424	2026-09-07 21:25:55.52
6995686c-cd22-4194-b890-0bbca9c7339c	driver_01	-22.754591	-43.458242	2026-09-07 21:25:58.449
66c867f5-0417-4579-9c45-fbf149305c33	driver_01	-22.754435	-43.45802	2026-09-07 21:26:01.467
08bd0904-7016-4b3f-9d72-4419c9d588b2	driver_01	-22.75427	-43.457838	2026-09-07 21:26:04.449
b988590c-2685-4922-a4eb-1a8e41375217	driver_01	-22.754117	-43.457653	2026-09-07 21:26:07.467
02e6772a-0fe3-498e-8cff-c4f6ff33b368	driver_01	-22.753961	-43.457478	2026-09-07 21:26:10.45
3d8a9e24-fe9a-44b6-b457-79333d93f05c	driver_01	-22.753802	-43.45729	2026-09-07 21:26:13.457
171b50cd-cb7b-4cbb-b631-35d22b098783	driver_01	-22.753661	-43.4571	2026-09-07 21:26:16.461
4ff71f31-36f9-4f1d-aae5-93764f44a76b	driver_01	-22.753522	-43.456905	2026-09-07 21:26:19.461
726aed32-d13f-44b6-9fd6-9f98b6848198	driver_01	-22.753396	-43.456724	2026-09-07 21:26:22.461
e609997f-8a6b-4448-a645-39e926bbbf1b	driver_01	-22.753222	-43.456507	2026-09-07 21:26:25.491
52e40e86-d54f-4a45-87ca-b87d122b3577	driver_01	-22.753096	-43.456298	2026-09-07 21:26:28.472
deee2fde-dcd0-4368-99c4-195d7f9a31bc	driver_01	-22.752923	-43.456118	2026-09-07 21:26:31.48
c41501eb-a4ba-473b-a3b4-e9eb1d6825d6	driver_01	-22.752762	-43.455902	2026-09-07 21:26:34.473
fe87ac87-5d04-48e4-a86e-1a6bfa8d7ae0	driver_01	-22.752629	-43.455704	2026-09-07 21:26:37.484
3928fba0-832b-4d22-85e0-63a21a6ddc8b	driver_01	-22.752491	-43.455509	2026-09-07 21:26:40.484
bec3d7a9-6dc3-4ee7-ba1f-fd5c37287ff9	driver_01	-22.75236	-43.45529	2026-09-07 21:26:43.484
d8d7d8ae-513e-45b2-9899-8aa971571909	driver_01	-22.752188	-43.455096	2026-09-07 21:26:46.484
973e7fa4-be16-48d2-a44d-3baed5cc7e29	driver_01	-22.752026	-43.45488	2026-09-07 21:26:49.493
6bf454b8-8469-4bf4-b8f1-bf73e1f0ada2	driver_01	-22.751851	-43.454703	2026-09-07 21:26:52.495
7838a35d-1a28-4d7c-b7fd-28986de9c3ab	driver_01	-22.751719	-43.454483	2026-09-07 21:26:55.516
a3c35c0b-f28a-42cb-9880-a035c7662b1d	driver_01	-22.751573	-43.454289	2026-09-07 21:26:58.495
7f2acfcb-5aa2-44be-b1f4-54bc98fec89b	driver_01	-22.751438	-43.454096	2026-09-07 21:27:01.506
a5b1d6f3-6e0c-4106-b3d6-69153415d5ee	driver_01	-22.751274	-43.453913	2026-09-07 21:27:04.507
5cdc9861-856e-4836-acbf-c3454a54c559	driver_01	-22.751136	-43.4537	2026-09-07 21:27:07.528
8a52dc05-f025-4c17-852e-5eacd51f36cd	driver_01	-22.750966	-43.453486	2026-09-07 21:27:10.507
ade72eb7-a1a5-49a3-8f03-16868a7af2b4	driver_01	-22.750806	-43.453291	2026-09-07 21:27:13.528
c106d513-5810-4c40-91f9-9769fb12f91a	driver_01	-22.750664	-43.453104	2026-09-07 21:27:16.529
2cf81af3-908e-4d54-919c-6f03e45197a5	driver_01	-22.750509	-43.452903	2026-09-07 21:27:19.529
016e6cca-6281-4ffb-b654-86e4f9e1db8b	driver_01	-22.750356	-43.452678	2026-09-07 21:27:22.518
9b0813e8-eba5-4867-9448-8aaf8c138d9d	driver_01	-22.750227	-43.452475	2026-09-07 21:27:25.529
e4857a6f-f80e-4069-8c45-a59cf979d6b1	driver_01	-22.750079	-43.452277	2026-09-07 21:27:28.53
d8354c8d-b61c-4ce7-833c-b1d258751581	driver_01	-22.749924	-43.452098	2026-09-07 21:27:31.551
8b096383-0d3b-46e5-9ddc-ae9cf437a66c	driver_01	-22.74975	-43.451893	2026-09-07 21:27:34.541
25776d91-c862-4f29-92d2-6b10739b9299	driver_01	-22.74962	-43.451707	2026-09-07 21:27:37.551
f548015e-b1a8-414a-a09b-ac18aa97b05c	driver_01	-22.749474	-43.45151	2026-09-07 21:27:40.541
0d5a5d6e-9d9d-4871-82b7-d7304f87f509	driver_01	-22.749318	-43.451309	2026-09-07 21:27:43.541
d777d02a-ff16-4940-aa02-5d5e8a65e648	driver_01	-22.749162	-43.451088	2026-09-07 21:27:46.552
d671bce9-a79f-46ab-868d-3462ed83ac08	driver_01	-22.749019	-43.450892	2026-09-07 21:27:49.552
2befffc9-4ff5-4e50-b74b-8dc0ce440e10	driver_01	-22.748858	-43.450697	2026-09-07 21:27:52.552
3b4ce3a1-5c58-4d87-860f-976ae8c3a4e0	driver_01	-22.748732	-43.450486	2026-09-07 21:27:55.552
ddd26d5b-9c9d-4508-a175-8d8939473769	driver_01	-22.748568	-43.450274	2026-09-07 21:27:58.564
019a5bac-aecb-43e2-9da8-ce932d1f12a7	driver_01	-22.748399	-43.45006	2026-09-07 21:28:01.564
35c7fa73-54fe-4884-b1ae-3bd52388863d	driver_01	-22.74824	-43.449875	2026-09-07 21:28:04.564
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Message" (id, "conversationId", role, content, "createdAt") FROM stdin;
cmtrkidde000385e8m1ma5fye	cmtrki20i000185e8mwktr2ch	user	Qual é o status de entrega do meu pedido PED-1042?	2026-09-07 18:22:14.066
cmtrkide9000585e8leh9q38k	cmtrki20i000185e8mwktr2ch	assistant	O seu pedido **PED-1042** está com status **Enviado (SHIPPED)**. O pagamento foi confirmado (PAID) e a transportadora é a **Logística Própria**.\n\nO código de rastreamento é **TRK-1042BR**. O pedido já saiu para entrega, mas ainda não foi entregue. Se quiser, posso te ajudar a rastrear a localização atual da entrega.	2026-09-07 18:22:14.097
cmtrpmtfb000985e88ouuxlck	cmtrpmnhg000785e8nqyyvxj2	user	Qual o nome da empresa?	2026-09-07 20:45:39.575
cmtrpmtg3000b85e8261getu5	cmtrpmnhg000785e8nqyyvxj2	assistant	TECNO SHOPPING	2026-09-07 20:45:39.603
cmtrprlem000385ko7rgmli9j	cmtrpr65t000185koznoy8nds	user	Qual o nome da empresa?	2026-09-07 20:49:22.461
cmtrprlfb000585ko14ywchir	cmtrpr65t000185koznoy8nds	assistant	TECNO SHOPPING	2026-09-07 20:49:22.488
cmtrupiok000385sfxvzzsmvr	cmtrup41o000185sf2pbs9fkk	user	Olá, você tem algum monitor?	2026-09-07 23:07:43.699
cmtrupiph000585sffxitwnn6	cmtrup41o000185sf2pbs9fkk	assistant	Olá! Sim, temos alguns monitores disponíveis. Aqui estão as opções:\n\n1. **LG UltraGear**  \n   - Descrição: LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600  \n   - Preço: R$ 1.800,00  \n   - Estoque: 20 unidades  \n\n2. **Monitor Gamer Aoc**  \n   - Descrição: Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto  \n   - Preço: R$ 490,00  \n   - Estoque: 15 unidades  \n\n3. **Monitor LG Ultragear**  \n   - Descrição: Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms  \n   - Preço: R$ 950,00  \n   - Estoque: 15 unidades  \n\nVocê gostaria de saber mais detalhes sobre algum desses modelos, ver as imagens ou adicionar algum ao carrinho? Estou à disposição para ajudar!	2026-09-07 23:07:43.733
cmtruqt6f000785sfn3e41wcv	cmtrup41o000185sf2pbs9fkk	user	Sim, gostaria desse de 950,00	2026-09-07 23:08:43.96
cmtruqt76000985sft0fj71ht	cmtrup41o000185sf2pbs9fkk	assistant	Perfeito! O Monitor LG Ultragear por R$ 950,00 é uma ótima escolha. Quantas unidades você deseja adicionar ao carrinho?	2026-09-07 23:08:43.987
cmtrus5wq000b85sfic7ued8l	cmtrup41o000185sf2pbs9fkk	user	Apenas 1 unidades, vocttem mais detalhes dele?	2026-09-07 23:09:47.113
cmtrus5xb000d85sf490ey0pa	cmtrup41o000185sf2pbs9fkk	assistant	O Monitor LG Ultragear (modelo 27g523) possui as seguintes especificações:\n\n- **Tamanho:** 27 polegadas\n- **Painel:** IPS\n- **Taxa de atualização:** 200Hz\n- **Tempo de resposta:** 1ms\n- **Preço:** R$ 950,00\n- **Estoque disponível:** 15 unidades\n- **Status:** Ativo e disponível para compra\n\nO produto possui uma imagem cadastrada. Você gostaria de vê-la ou já deseja adicionar 1 unidade ao seu carrinho?	2026-09-07 23:09:47.133
cmtruty1i000n85sfst7nflzq	cmtrup41o000185sf2pbs9fkk	user	Pode adicionar no meu carrinho e fechar o pedido	2026-09-07 23:11:10.231
cmtruty29000p85sfivjiumw2	cmtrup41o000185sf2pbs9fkk	assistant	Seu pedido foi criado com sucesso! Aqui estão os detalhes:\n\n**Pedido ID:** cmtrutua4000j85sf41b19wcx  \n**Status:** PENDING (aguardando pagamento)  \n**Valor total:** R$ 950,00  \n**Item:** Monitor LG Ultragear (1 unidade)  \n**Data de criação:** 07/09/2026 às 20:11 (horário local)\n\nO carrinho foi finalizado e o pedido está aguardando confirmação de pagamento. Você deseja prosseguir com o pagamento agora ou prefere receber mais informações sobre as formas de pagamento disponíveis? Estou aqui para ajudar!	2026-09-07 23:11:10.258
cmtruv729000r85sfh7yscf65	cmtrup41o000185sf2pbs9fkk	user	Como seria a forma de pagamento?	2026-09-07 23:12:08.575
cmtruv730000t85sf0eky9ygj	cmtrup41o000185sf2pbs9fkk	assistant	I don't see any specific payment method configuration in the workspace files. However, based on typical e-commerce setups, common payment methods often include:\n\n**Available Payment Options:**\n- **Boleto Bancário** (Brazilian bank slip)\n- **Cartão de Crédito/Débito** (Credit/Debit cards - Visa, Mastercard, American Express, etc.)\n- **PIX** (Instant payment transfer - widely used in Brazil)\n- **PayPal** (International payment)\n- **Transferência Bancária** (Bank transfer)\n\nFor the TECNO SHOPPING company, I would expect the most common Brazilian payment methods to be available. However, I should check with your human to confirm which specific payment methods they accept, as this can vary by business.\n\nCould you let me know:\n1. Which payment method(s) does TECNO SHOPPING accept?\n2. Do you need assistance with any specific payment process (like generating a boleto or PIX QR code)?\n\nThis will help me provide you with the most accurate information and next steps for completing your order.	2026-09-07 23:12:08.604
cmtsl4nh2000v85sfp5j7ujsn	cmtrup41o000185sf2pbs9fkk	user	Sobre o monitor que pedi para reservar, você tem uma imagem dele ?	2026-09-08 11:27:19.765
cmtsl4nhw000x85sfbudtpwbp	cmtrup41o000185sf2pbs9fkk	assistant	Aqui está a imagem do Monitor LG Ultragear que você reservou:\nSe precisar de mais alguma coisa, é só avisar!	2026-09-08 11:27:19.796
cmttaep3j000z85sfxdi8d8n1	cmtrup41o000185sf2pbs9fkk	user	Sobre o monitor que pedi para reservar, envie a imagem dele.	2026-09-08 23:14:58.831
cmttaep49001185sflmrnn246	cmtrup41o000185sf2pbs9fkk	assistant	Aqui está a imagem do Monitor LG Ultragear que você reservou:\nSe precisar de mais alguma coisa, é só avisar!	2026-09-08 23:14:58.857
cmttahkpo001385sfotyy2khi	cmtrup41o000185sf2pbs9fkk	user	Quais monitores vocês têm disponíveis? Mostre as imagens dos produtos.	2026-09-08 23:17:13.114
cmttahkqa001585sfupu7dpss	cmtrup41o000185sf2pbs9fkk	assistant	Aqui estão os monitores disponíveis com suas imagens:\n**1. LG UltraGear**\n- Descrição: LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Preço: R$ 1.800,00\n- Estoque: 20 unidades\n**2. Monitor Gamer Aoc**\n- Descrição: Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Preço: R$ 490,00\n- Estoque: 15 unidades\n**3. Monitor LG Ultragear**\n- Descrição: Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Preço: R$ 950,00\n- Estoque: 15 unidades\nVocê gostaria de saber mais detalhes sobre algum desses modelos ou adicionar algum ao carrinho? Estou à disposição para ajudar!	2026-09-08 23:17:13.138
cmtvhvkfi0003857dd6bs1hqv	cmtuqw4un0001857dwt058ax2	user	Olá, como está o status do meu pedido?	2026-09-10 12:19:35.596
cmtvhvkgw0005857d5okiqebs	cmtuqw4un0001857dwt058ax2	assistant	Olá! Verifiquei o status do seu pedido mais recente e aqui estão as informações:\n\n**Pedido:** cmtrutua4000j85sf41b19wcx  \n**Status do pedido:** PENDING (pendente)  \n**Status do pagamento:** PENDING (pendente)  \n**Valor total:** R$ 950,00  \n**Itens:** 1× Monitor LG Ultragear  \n\nAinda não há código de rastreamento ou transportadora atribuída, pois o pagamento está pendente. Assim que o pagamento for confirmado, o pedido será processado e você receberá as atualizações de rastreamento.\n\nPosso ajudar com algo mais sobre este pedido ou sobre outro assunto?	2026-09-10 12:19:35.648
cmtvhx6ku0007857ddslcwl53	cmtuqw4un0001857dwt058ax2	user	Sim, você tem fotos ou imagens desse monitor ?	2026-09-10 12:20:50.957
cmtvhx6l70009857dz7p09gr5	cmtuqw4un0001857dwt058ax2	assistant	Sim, aqui está uma imagem do Monitor LG Ultragear:\nPosso ajudar com mais alguma coisa sobre este produto ou sobre seu pedido?	2026-09-10 12:20:50.972
cmtvjxdw2000b857d4mwc3to7	cmtuqw4un0001857dwt058ax2	user	<media:image>	2026-09-10 13:16:59.667
cmtygo07i000l85a11uk6pxvo	cmtyfqtxm000b85a1prqyucn7	user	Qual o nome da empresa?	2026-09-12 14:09:01.71
cmtvjxdwq000d857dj95xjv2r	cmtuqw4un0001857dwt058ax2	assistant	Perfeito! A imagem do Monitor LG Ultragear foi enviada. \n\nPosso ajudar com mais alguma coisa sobre este produto, seu pedido ou qualquer outra dúvida que você tenha? Estou aqui para ajudar!	2026-09-10 13:16:59.69
cmtvjy1fm000f857dv15j3q2n	cmtuqw4un0001857dwt058ax2	user	Vocês tem um mouse igual a esse ?	2026-09-10 13:17:30.176
cmtvjy1gd000h857dum2299cx	cmtuqw4un0001857dwt058ax2	assistant	Sim, temos vários mouses disponíveis! Aqui estão as opções:\n\n**Mouses disponíveis:**\n\n1. **Kit Teclado e Mouse Sem Fio** - R$ 90,00\n   - Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n   - Estoque: 65 unidades\n\n2. **Mouse Branco Sem Fio** - R$ 148,00\n   - Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000\n   - Estoque: 15 unidades\n\n3. **Mouse Gamer Para Jogo** - R$ 30,00\n   - Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb\n   - Estoque: 80 unidades\n\n4. **Mouse Gamer Redragon** - R$ 160,00\n   - Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K\n   - Estoque: 67 unidades\n\nPosso te mostrar imagens de algum desses mouses ou ajudar com mais detalhes sobre algum modelo específico? Também posso verificar se há algum mouse com características específicas que você esteja procurando (como sem fio, gamer, com iluminação RGB, etc.).	2026-09-10 13:17:30.205
cmtvk0618000j857d39yl1dtn	cmtuqw4un0001857dwt058ax2	user	Mouse gamer igual a da foto enviada, você tem?	2026-09-10 13:19:09.452
cmtvk061r000l857dpbgy1khz	cmtuqw4un0001857dwt058ax2	assistant	Entendi! Você está procurando um mouse gamer semelhante ao que vê na foto. Porém, a imagem que você enviou anteriormente era do **Monitor LG Ultragear**, não de um mouse.\nTemos dois modelos de mouses gamer em nosso estoque. Vou mostrar as imagens deles para você ver se algum se parece com o que você tem em mente:\n**Mouse Gamer Para Jogo** (R$ 30,00)\n- Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb\n- Estoque: 80 unidades\n**Mouse Gamer Redragon** (R$ 160,00)\n- Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K\n- Estoque: 67 unidades\nAlgum desses mouses se parece com o que você está procurando? Se não, pode me descrever melhor as características que você deseja (cor, tipo de iluminação, formato, etc.) que eu posso ajudar a encontrar a melhor opção para você!	2026-09-10 13:19:09.471
cmtvk1kos000n857dq00bdxyl	cmtuqw4un0001857dwt058ax2	user	Me envie a foto do mouse gamer Redragon King	2026-09-10 13:20:15.101
cmtvk1kpl000p857dunzz6ck7	cmtuqw4un0001857dwt058ax2	assistant	Aqui está a imagem do Mouse Gamer Redragon King Pro 1K Preto:\nEste mouse custa R$ 160,00 e temos 67 unidades em estoque. Gostaria de adquirir este mouse ou prefere ver mais detalhes sobre algum outro modelo?	2026-09-10 13:20:15.13
cmtvv739n000r857dpkxyvyl5	cmtuqw4un0001857dwt058ax2	user	Você tem algum monitor de até mil reais?	2026-09-10 18:32:28.234
cmtvv73a6000t857dxin1r4fa	cmtuqw4un0001857dwt058ax2	assistant	Sim, temos dois monitores disponíveis dentro do seu orçamento de até R$ 1.000,00:\n**Monitores disponíveis (até R$ 1.000):**\n1. **Monitor Gamer AOC** - R$ 490,00\n - Monitor Gamer AOC 23,8'' 100Hz 1ms 24B30HM2 Preto\n - Estoque: 15 unidades\n2. **Monitor LG Ultragear** - R$ 950,00 (o mesmo que você já tem no pedido)\n - Monitor LG Ultragear - 27G523 - IPS de 27", 200Hz, 1ms\n - Estoque: 15 unidades\nPosso mostrar as imagens desses monitores para você ver as diferenças e escolher o que mais lhe agrada?\n**Monitor Gamer AOC:**\n**Monitor LG Ultragear:**\nGostaria de adquirir algum desses monitores ou prefere ver mais detalhes sobre as especificações técnicas?	2026-09-10 18:32:28.255
cmtwpocct000v857d5a3tyqvm	cmtuqw4un0001857dwt058ax2	user	Você tem algum monitor de até mil reais? Mostre as imagens.	2026-09-11 08:45:41.645
cmtwpocdf000x857db60bnpay	cmtuqw4un0001857dwt058ax2	assistant	Aqui estão as imagens dos monitores disponíveis até R$ 1.000,00:\n1. **Monitor Gamer AOC** - R$ 490,00\n - Monitor Gamer AOC 23,8'' 100Hz 1ms 24B30HM2 Preto\n - Estoque: 15 unidades\n2. **Monitor LG Ultragear** - R$ 950,00\n - Monitor LG Ultragear - 27G523 - IPS de 27", 200Hz, 1ms\n - Estoque: 15 unidades\nGostaria de adquirir algum desses monitores ou prefere ver mais detalhes sobre as especificações técnicas?	2026-09-11 08:45:41.668
cmtxd592u000z857d5n4sjwvi	cmtuqw4un0001857dwt058ax2	user	Qual o nome da empresa?	2026-09-11 19:42:41.719
cmtxd593j0011857dtun281dn	cmtuqw4un0001857dwt058ax2	assistant	O nome da empresa é **TECNO SHOPPING**.	2026-09-11 19:42:41.743
cmtxdxyk30013857detzxh3dr	cmtuqw4un0001857dwt058ax2	user	Quais monitores vocês tem disponível	2026-09-11 20:05:01.106
cmtxdxykx0015857d1vcykjkq	cmtuqw4un0001857dwt058ax2	assistant	Temos os seguintes monitores disponíveis no momento:\n\n**1. LG UltraGear**  \n- **Descrição:** LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600  \n- **Preço:** R$ 1.800,00  \n- **Estoque:** 20 unidades  \n\n**2. Monitor Gamer AOC**  \n- **Descrição:** Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto  \n- **Preço:** R$ 490,00  \n- **Estoque:** 15 unidades  \n\n**3. Monitor LG Ultragear** (mesmo que você já tem no pedido)  \n- **Descrição:** Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms  \n- **Preço:** R$ 950,00  \n- **Estoque:** 15 unidades  \n\nGostaria de ver as imagens de algum desses monitores ou obter mais detalhes sobre especificações técnicas? Também posso ajudar a adicionar algum ao carrinho ou finalizar a compra, se desejar.	2026-09-11 20:05:01.137
cmtxezk100017857ddt5elojv	cmtuqw4un0001857dwt058ax2	user	Qual o nome da empresa?	2026-09-11 20:34:15.204
cmtxezk1q0019857dkm0rsob7	cmtuqw4un0001857dwt058ax2	assistant	O nome da empresa é **TECNO SHOPPING**. \n\nPosso ajudar com mais alguma informação sobre nossos produtos ou serviços?	2026-09-11 20:34:15.23
cmtxf0fk4001b857dotwrkb9n	cmtuqw4un0001857dwt058ax2	user	Sim, quais monitores vocês tem disponíveis?	2026-09-11 20:34:56.068
cmtxf0fkm001d857dzxzkhaex	cmtuqw4un0001857dwt058ax2	assistant	Temos os seguintes monitores disponíveis no momento:\n\n**1. LG UltraGear**  \n- **Descrição:** LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600  \n- **Preço:** R$ 1.800,00  \n- **Estoque:** 20 unidades  \n\n**2. Monitor Gamer AOC**  \n- **Descrição:** Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto  \n- **Preço:** R$ 490,00  \n- **Estoque:** 15 unidades  \n\n**3. Monitor LG Ultragear** (mesmo que você já tem no pedido)  \n- **Descrição:** Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms  \n- **Preço:** R$ 950,00  \n- **Estoque:** 15 unidades  \n\nGostaria de ver as imagens de algum desses monitores ou obter mais detalhes sobre especificações técnicas? Também posso ajudar a adicionar algum ao carrinho ou finalizar a compra, se desejar. Qual monitor você tem mais interesse?	2026-09-11 20:34:56.087
cmtxf1sxp001f857dru30h0pt	cmtuqw4un0001857dwt058ax2	user	Sim, me envie imagens deles	2026-09-11 20:36:00.061
cmtyg3l9k000j85a1abqxwtp7	cmtyfqtxm000b85a1prqyucn7	assistant	O nome da empresa é **TECNO SHOPPING**.	2026-09-12 13:53:09.224
cmtygo082000n85a1s0rg8yqe	cmtyfqtxm000b85a1prqyucn7	assistant	O nome da empresa é **TECNO SHOPPING**.	2026-09-12 14:09:01.731
cmtygs4mx000p85a1dwtxq47b	cmtyfqtxm000b85a1prqyucn7	user	Quais mouses vocês tem disponíveis, me mande imagens	2026-09-12 14:12:14.072
cmtxf1syg001h857dh701jq5r	cmtuqw4un0001857dwt058ax2	assistant	Aqui estão as imagens dos monitores disponíveis:\n\n**1. LG UltraGear** - R$ 1.800,00\nLG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\nEstoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\nMonitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\nEstoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\nMonitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\nEstoque: 15 unidades (mesmo que você já tem no pedido)\n\nAqui estão as imagens dos três monitores disponíveis:\n\n**1. LG UltraGear** - R$ 1.800,00\n- LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Estoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\n- Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Estoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\n- Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Estoque: 15 unidades (mesmo que você já tem no pedido)\n\nAs imagens foram enviadas acima. Gostaria de adquirir algum desses monitores ou prefere ver mais detalhes sobre as especificações técnicas de algum modelo específico? Também posso ajudar a adicionar ao carrinho ou finalizar a compra, se desejar.	2026-09-11 20:36:00.089
cmtxfrh8j001j857dybxvaomx	cmtuqw4un0001857dwt058ax2	user	Qual o nome da empresa?	2026-09-11 20:55:57.956
cmtxfrh96001l857dxyj0o1kq	cmtuqw4un0001857dwt058ax2	assistant	O nome da empresa é **TECNO SHOPPING**. \n\nPosso ajudar com mais alguma informação sobre nossos produtos ou serviços?	2026-09-11 20:55:57.978
cmtxfzrzs001n857da2tjcd2q	cmtuqw4un0001857dwt058ax2	user	Quais monitores vocês tem disponíveis? Me envie as imagens	2026-09-11 21:02:25.143
cmtxfzs0f001p857ds88y4f5g	cmtuqw4un0001857dwt058ax2	assistant	Aqui estão as imagens dos monitores disponíveis:\n\n**1. LG UltraGear** - R$ 1.800,00\n- LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Estoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\n- Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Estoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\n- Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Estoque: 15 unidades (mesmo que você já tem no pedido)\n\nAqui estão as imagens dos monitores disponíveis:\n\n**1. LG UltraGear** - R$ 1.800,00\n- LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Estoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\n- Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Estoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\n- Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Estoque: 15 unidades (mesmo que você já tem no pedido)	2026-09-11 21:02:25.167
cmtxgy1770003852e1uubkkz3	cmtxgxi2b0001852e5t5hqp8q	user	Quais monitores vocês tem disponíveis? Me envie as imagens	2026-09-11 21:29:03.378
cmtxgy1880005852ezmxq2x3x	cmtxgxi2b0001852e5t5hqp8q	assistant	Aqui estão as imagens dos monitores disponíveis novamente, conforme solicitado:\n\n**1. LG UltraGear** - R$ 1.800,00\n- LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Estoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\n- Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Estoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\n- Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Estoque: 15 unidades (mesmo que você já tem no pedido)\n\nAqui estão as imagens dos monitores disponíveis novamente, conforme solicitado:\n\n**1. LG UltraGear** - R$ 1.800,00\n- LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Estoque: 20 unidades\n\n**2. Monitor Gamer AOC** - R$ 490,00\n- Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Estoque: 15 unidades\n\n**3. Monitor LG Ultragear** - R$ 950,00\n- Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Estoque: 15 unidades (mesmo que você já tem no pedido)	2026-09-11 21:29:03.416
cmtxh46vv000385a0a8ul6lb8	cmtxh3ztg000185a0r1tuozha	user	Qual o nome da empresa?	2026-09-11 21:33:50.683
cmtxh46wo000585a01gjzwwlc	cmtxh3ztg000185a0r1tuozha	assistant	O nome da empresa é **TECNO SHOPPING**. \n\nPosso ajudar com mais alguma informação sobre nossos produtos ou serviços?	2026-09-11 21:33:50.712
cmtxhsq30000385qkx8efvj5s	cmtxhskya000185qka0fruyvl	user	Qual o nome da empresa?	2026-09-11 21:52:55.308
cmtxhsq3r000585qkr5l951cd	cmtxhskya000185qka0fruyvl	assistant	O nome da empresa é **TECNO SHOPPING**.	2026-09-11 21:52:55.335
cmtxhvpi4000785qkql64palp	cmtxhskya000185qka0fruyvl	user	Quais monitores vocês tem disponíveis? Me envie as imagens	2026-09-11 21:55:14.523
cmtxhvpit000985qkveorcmd2	cmtxhskya000185qka0fruyvl	assistant	LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- Preço: R$ 1.800\n- Estoque: 20 unidades\nMonitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n- Preço: R$ 490\n- Estoque: 15 unidades\nMonitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- Preço: R$ 950\n- Estoque: 15 unidades	2026-09-11 21:55:14.55
cmty8k99700058588wbo2a6aq	cmty8k32400038588eazcl2nm	user	Olá qual o nome da empresa?	2026-09-12 10:22:09.884
cmty8k99q00078588kllsybit	cmty8k32400038588eazcl2nm	assistant	TECNO SHOPPING	2026-09-12 10:22:09.902
cmty8o4my000985880jopm2uq	cmty8k32400038588eazcl2nm	user	Quais monitores vocês tem disponível? Me envie as imagens	2026-09-12 10:25:10.521
cmty8o4ng000b85889nsdjrfb	cmty8k32400038588eazcl2nm	assistant	Monitores disponíveis:\n\n1. LG UltraGear\n   Descrição: LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n   Preço: R$ 1800\n   Estoque: 20\n\n2. Monitor Gamer Aoc\n   Descrição: Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto\n   Preço: R$ 490\n   Estoque: 15\n\n3. Monitor LG Ultragear\n   Descrição: Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n   Preço: R$ 950\n   Estoque: 15	2026-09-12 10:25:10.54
cmty9jur5000385a1cuvxzveh	cmty9jmoc000185a1jlf3rfly	user	Qual o nome da empresa?	2026-09-12 10:49:50.705
cmty9jurr000585a1wxgmw8en	cmty9jmoc000185a1jlf3rfly	assistant	O nome da empresa é TECNO SHOPPING.	2026-09-12 10:49:50.727
cmty9njiq000785a1otm3ks6j	cmty9jmoc000185a1jlf3rfly	user	Quais monitores você tem disponível, pode mandar imagens	2026-09-12 10:52:42.77
cmty9njj7000985a17m756opz	cmty9jmoc000185a1jlf3rfly	assistant	Aqui estão os monitores disponíveis no nosso catálogo:\n\n**1. LG UltraGear**\n- **Preço:** R$ 1.800,00\n- **Estoque:** 20 unidades\n- **Descrição:** LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600\n- **Imagem:** MEDIA:/uploads/products/1788796083721-399561711.jpg\n\n**2. Monitor Gamer AOC**\n- **Preço:** R$ 490,00\n- **Estoque:** 15 unidades\n- **Descrição:** Monitor Gamer AOC 23,8'' 100hz 1ms 24b30hm2 Preto\n- **Imagem:** MEDIA:/uploads/products/1788795986842-988690677.jpg\n\n**3. Monitor LG Ultragear**\n- **Preço:** R$ 950,00\n- **Estoque:** 15 unidades\n- **Descrição:** Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms\n- **Imagem:** MEDIA:/uploads/products/1788795920763-767328288.jpg\n\nTodos os produtos estão ativos e prontos para compra. Deseja mais detalhes sobre algum deles ou adicionar algum ao carrinho?	2026-09-12 10:52:42.787
cmtyfqzu8000d85a1seqg3k4n	cmtyfqtxm000b85a1prqyucn7	user	Qual o nome da empresa?	2026-09-12 13:43:21.584
cmtyfqzuk000f85a13irjvbyx	cmtyfqtxm000b85a1prqyucn7	assistant	O nome da empresa é **TECNO SHOPPING**.	2026-09-12 13:43:21.596
cmtyg3l94000h85a1q8bey13f	cmtyfqtxm000b85a1prqyucn7	user	Qual o nome da empresa?	2026-09-12 13:53:09.207
cmtygs4ng000r85a17kifulvt	cmtyfqtxm000b85a1prqyucn7	assistant	Aqui estão os mouses disponíveis no nosso catálogo:\n\n**1. Kit Teclado e Mouse Sem Fio**\n- Descrição: Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- Preço: R$ 90,00\n- Estoque: 65 unidades\n- Imagem: MEDIA:/uploads/products/1788796381033-656535055.jpg\n\n**2. Mouse Branco Sem Fio**\n- Descrição: Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000\n- Preço: R$ 148,00\n- Estoque: 15 unidades\n- Imagem: MEDIA:/uploads/products/1788796307092-723074349.jpg\n\n**3. Mouse Gamer Para Jogo**\n- Descrição: Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb\n- Preço: R$ 30,00\n- Estoque: 80 unidades\n- Imagem: MEDIA:/uploads/products/1788796229506-984002336.jpg\n\n**4. Mouse Gamer Redragon**\n- Descrição: Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K\n- Preço: R$ 160,00\n- Estoque: 67 unidades\n- Imagem: MEDIA:/uploads/products/1788796162031-266613661.jpg\n\nSe você gostou de algum produto e deseja adicioná-lo ao carrinho ou obter mais detalhes, é só me avisar!	2026-09-12 14:12:14.092
cmtyq46k2000385yepvqgvmq6	cmtyq3y7d000185yeby1ohv4i	user	Qual o nome da empresa?	2026-09-12 18:33:32.978
cmtyq46kn000585ye2y8sbzmc	cmtyq3y7d000185yeby1ohv4i	assistant	TECNO SHOPPING	2026-09-12 18:33:32.999
cmtyq7dw0000785ye3rcpcasf	cmtyq3y7d000185yeby1ohv4i	user	Quais mouses vocês tem disponíveis, me mande imagens	2026-09-12 18:36:02.446
cmtyq7dwl000985yeyrj5vzmo	cmtyq3y7d000185yeby1ohv4i	assistant	A TECNO SHOPPING tem os seguintes mouses disponíveis em nosso catálogo:\n\n1. **Kit Teclado e Mouse Sem Fio**\n   - Descrição: Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n   - Preço: R$ 90,00\n   - Estoque: 65 unidades\n   - Imagem: `/uploads/products/1788796381033-656535055.jpg`\n\n2. **Mouse Branco Sem Fio**\n   - Descrição: Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000\n   - Preço: R$ 148,00\n   - Estoque: 15 unidades\n   - Imagem: `/uploads/products/1788796307092-723074349.jpg`\n\n3. **Mouse Gamer Para Jogo**\n   - Descrição: Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb\n   - Preço: R$ 30,00\n   - Estoque: 80 unidades\n   - Imagem: `/uploads/products/1788796229506-984002336.jpg`\n\n4. **Mouse Gamer Redragon**\n   - Descrição: Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K\n   - Preço: R$ 160,00\n   - Estoque: 67 unidades\n   - Imagem: `/uploads/products/1788796162031-266613661.jpg`\n\nTodos os produtos estão ativos e disponíveis para compra. Para visualizar as imagens, você pode acessar os caminhos fornecidos acima (eles são relativos ao nosso servidor de produtos).\n\nDeseja mais detalhes sobre algum desses mouses ou gostaria de adicionar algum ao carrinho?	2026-09-12 18:36:02.469
cmtyqvnwx000385gbgvvrtegk	cmtyqvegv000185gbf454m10n	user	Quais mouses vocês tem disponíveis?	2026-09-12 18:54:55.186
cmtyqvny0000585gb30tef5g9	cmtyqvegv000185gbf454m10n	assistant	Temos os seguintes mouses disponíveis no momento:\n\n1. **Kit Teclado e Mouse Sem Fio**  \n   - Descrição: Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras  \n   - Preço: R$ 90,00  \n   - Estoque: 65 unidades  \n\n2. **Mouse Branco Sem Fio**  \n   - Descrição: Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000  \n   - Preço: R$ 148,00  \n   - Estoque: 15 unidades  \n\n3. **Mouse Gamer Para Jogo**  \n   - Descrição: Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb  \n   - Preço: R$ 30,00  \n   - Estoque: 80 unidades  \n\n4. **Mouse Gamer Redragon**  \n   - Descrição: Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K  \n   - Preço: R$ 160,00  \n   - Estoque: 67 unidades  \n\nTodos os produtos estão ativos e prontos para compra. Se quiser mais detalhes sobre algum deles ou adicionar ao carrinho, é só me informar!	2026-09-12 18:54:55.224
cmtyqwtyu000785gb8kuueitw	cmtyqvegv000185gbf454m10n	user	Qual o status do meu último pedido?	2026-09-12 18:55:49.686
cmtyqwtzl000985gb8sc931bn	cmtyqvegv000185gbf454m10n	assistant	O status do seu último pedido é **PENDING** (pendente). Aqui estão os detalhes:\n\n- **Pedido:** #cmtrutua4000j85sf41b19wcx\n- **Produto:** Monitor LG Ultragear (1 unidade)\n- **Total:** R$ 950,00\n- **Status do pagamento:** PENDING\n- **Data do pedido:** 07/09/2026\n- **Código de rastreamento:** Ainda não disponível\n- **Transportadora:** Ainda não definida\n\nO pedido ainda não foi pago nem enviado. Assim que houver atualizações, entraremos em contato. Precisa de mais alguma coisa?	2026-09-12 18:55:49.714
cmtyslm0o000585cpufbp3w8w	cmtyslgci000385cpm2sfjlnh	user	Oi	2026-09-12 19:43:05.4
cmtyslm1g000785cpfp88t1kh	cmtyslgci000385cpm2sfjlnh	assistant	Oi! 👋 Sou o agente de vendas da **TECNO SHOPPING**. Como posso ajudá-lo hoje? Você está procurando algum produto específico ou tem alguma dúvida sobre nossos itens, promoções ou condições de pagamento? Estou aqui para orientar você na melhor escolha.	2026-09-12 19:43:05.428
cmtyslyri000985cptwnlwb5p	cmtyslgci000385cpm2sfjlnh	user	Quais produtos vocês vendem?	2026-09-12 19:43:21.918
cmtyslys3000b85cp74l4d5mb	cmtyslgci000385cpm2sfjlnh	assistant	A TECNO SHOPPING possui os seguintes produtos disponíveis em nosso catálogo:\n\n1. **Filtro de linha** - R$ 110,00  \n   Filtro de linha DPS Clamper Iclamper Energia 8 LCF, Preto, 026775  \n   Estoque: 50 unidades\n\n2. **Fonte Corsair** - R$ 470,00  \n   Fonte Corsair CX750, 750W, 80 Plus Bronze, Preto, CP-9020279-BR  \n   Estoque: 20 unidades\n\n3. **Headphone Baseus** - R$ 390,00  \n   Headphone Baseus EH10 NC, Drivers 40mm, Bluetooth, Preto, A0203800  \n   Estoque: 25 unidades\n\n4. **Headset Gamer** - R$ 280,00  \n   Headset Gamer Havit H630bt Bluetooth 5.3 On-ear 3d  \n   Estoque: 35 unidades\n\n5. **Kit Teclado e Mouse Sem Fio** - R$ 90,00  \n   Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras  \n   Estoque: 65 unidades\n\n6. **LG UltraGear** - R$ 1.800,00  \n   LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600  \n   Estoque: 20 unidades\n\n7. **Monitor Gamer Aoc** - R$ 490,00  \n   Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto  \n   Estoque: 15 unidades\n\n8. **Monitor LG Ultragear** - R$ 950,00  \n   Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms  \n   Estoque: 15 unidades\n\n9. **Mouse Branco Sem Fio** - R$ 148,00  \n   Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000  \n   Estoque: 15 unidades\n\n10. **Mouse Gamer Para Jogo** - R$ 30,00  \n    Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb  \n    Estoque: 80 unidades\n\nTodos os produtos acima estão ativos e disponíveis para compra. Se você quiser saber mais detalhes sobre algum produto específico (como ver imagens, verificar disponibilidade ou adicionar ao carrinho), é só me dizer o nome ou o ID do produto que eu ajudo! 😊\n\nVocê está interessado em algum desses itens ou tem alguma dúvida sobre condições de pagamento, prazos de entrega ou promoções?	2026-09-12 19:43:21.939
cmtytyilc000f85cpcna7adwf	cmtyty9t5000d85cp411ot0zv	user	Olá, qual o nome da empresa?	2026-09-12 20:21:07.105
cmtytyilz000h85cpg6r386eq	cmtyty9t5000d85cp411ot0zv	assistant	TECNO SHOPPING	2026-09-12 20:21:07.128
cmtz181lg000585s8obio4ytd	cmtz17vft000385s8v6i1ycxz	user	Olá, qual o nome da empresa	2026-09-12 23:44:28.948
cmtz181mc000785s80kzhlu4e	cmtz17vft000385s8v6i1ycxz	assistant	Olá! O nome da empresa é **TECNO SHOPPING**. Como posso ajudá-lo hoje?	2026-09-12 23:44:28.98
cmtz190uh000985s8bqm47ogh	cmtz17vft000385s8v6i1ycxz	user	Quais produtos vocês trabalham?	2026-09-12 23:45:14.632
cmtz190uv000b85s8ofyx1944	cmtz17vft000385s8v6i1ycxz	assistant	A TECNO SHOPPING trabalha com diversos produtos de informática, periféricos e acessórios. Segue a lista dos itens atualmente disponíveis:\n\n- **Filtro de linha** – R$ 110,00  \n- **Fonte Corsair CX750** – R$ 470,00  \n- **Headphone Baseus EH10 NC** – R$ 390,00  \n- **Headset Gamer Havit H630bt** – R$ 280,00  \n- **Kit Teclado e Mouse Sem Fio CSI50** – R$ 90,00  \n- **LG UltraGear Monitor Gamer 32"** – R$ 1.800,00  \n- **Monitor Gamer AOC 23,8"** – R$ 490,00  \n- **Monitor LG Ultragear 27"** – R$ 950,00  \n- **Mouse Branco Sem Fio Gamer Attack Shark R1** – R$ 148,00  \n- **Mouse Gamer Para Jogo 3.200 DPI** – R$ 30,00  \n\nTodos os produtos estão em estoque e prontos para compra. Se quiser saber mais detalhes sobre algum item (descrição completa, imagens, etc.) ou adicionar algo ao carrinho, é só me informar o nome ou o ID do produto que eu ajudo! 😊	2026-09-12 23:45:14.647
cmtz1ai3u000d85s8m7xlvt3d	cmtz17vft000385s8v6i1ycxz	user	Você vende pizza?	2026-09-12 23:46:23.658
cmtz1ai47000f85s8ab9avgcu	cmtz17vft000385s8v6i1ycxz	assistant	Não, a TECNO SHOPPING é especializada em produtos de informática, periféricos e acessórios. Não trabalhamos com alimentos como pizza. \n\nSe você estiver procurando por algum item de tecnologia, estou à disposição para ajudar! 😊	2026-09-12 23:46:23.672
cmtzsbxl4000385xguycgj15a	cmtzsbso6000185xg926mzt5u	user	Bom dia!  Você poderia... se você tem que ter claro...  Poderia me mandar as imagens, por favor?	2026-09-13 12:23:20.009
cmtzsbxlp000585xgc9x7l6ha	cmtzsbso6000185xg926mzt5u	assistant	Bom dia! Claro que posso ajudar com as imagens. Porém, para poder enviar as imagens corretas, você poderia me dizer qual produto ou tipo de item você está interessado? Por exemplo, está procurando por eletrônicos, móveis, roupas ou alguma categoria específica da TECNO SHOPPING?\n\nAssim que você me informar o que está buscando, eu poderei pesquisar no nosso catálogo e enviar as imagens dos produtos disponíveis. 😊	2026-09-13 12:23:20.03
cmtzsd6vp000785xgj95607b6	cmtzsbso6000185xg926mzt5u	user	Seria teclados.	2026-09-13 12:24:18.709
cmtzsd6wm000985xg67qk8o1b	cmtzsbso6000185xg926mzt5u	assistant	Encontrei dois teclados disponíveis no nosso catálogo. Seguem as imagens e detalhes de cada um:\n\n**1. Kit Teclado e Mouse Sem Fio**\n- **Nome:** Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- **Descrição:** Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- **Preço:** R$ 90,00\n- **Estoque:** 65 unidades\n- **Imagem:** \n\n**2. Teclado Mecânico sem fio**\n- **Nome:** Teclado Mecânico sem fio\n- **Descrição:** Teclado Mecânico sem fio Logitech MX Mechanical Mini\n- **Preço:** R$ 1.000,00\n- **Estoque:** 10 unidades\n- **Imagem:** \n\nVocê gostaria de mais detalhes sobre algum desses teclados, ou deseja adicionar algum ao carrinho? 😊	2026-09-13 12:24:18.742
cmtzse0ua000b85xgtk4e0xnb	cmtzsbso6000185xg926mzt5u	user	Tygglaðu.	2026-09-13 12:24:57.539
cmtzse0uq000d85xgvqtymnbj	cmtzsbso6000185xg926mzt5u	assistant	De nada! Fico feliz em ajudar. Se precisar de mais alguma informação ou quiser prosseguir com a compra, estou à disposição. 😊	2026-09-13 12:24:57.554
cmtzserdz000f85xg9qf18s6l	cmtzsbso6000185xg926mzt5u	user	Eu criei a imagem de tecrados.	2026-09-13 12:25:31.943
cmtzserem000h85xg5ir1pu3r	cmtzsbso6000185xg926mzt5u	assistant	Que legal que você criou uma imagem de teclados! 😊 Como posso ajudar você com essa imagem? Por exemplo:\n\n- Precisa de ajuda para identificar algum teclado específico na imagem?\n- Deseja comparar com os produtos que temos no catálogo da TECNO SHOPPING?\n- Quer saber se algum dos teclados que mostrei anteriormente corresponde ao que está na imagem?\n- Ou talvez queira adicionar algum produto semelhante ao carrinho?\n\nFico no aguardo dos detalhes para poder auxiliá-lo da melhor forma possível! 💻✨	2026-09-13 12:25:31.966
cmtzsfiv3000j85xgwm6822ae	cmtzsbso6000185xg926mzt5u	user	Então, eu queria que você me mandasse  as imagens e teclados que você tem aí.	2026-09-13 12:26:07.551
cmtzsfiwq000l85xgo6mfjsas	cmtzsbso6000185xg926mzt5u	assistant	Claro! Vou resender as informações dos teclados disponíveis no nosso catálogo da TECNO SHOPPING:\n\n**1. Kit Teclado e Mouse Sem Fio**\n- **Nome:** Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- **Preço:** R$ 90,00\n- **Estoque:** 65 unidades\n\n**2. Teclado Mecânico sem fio**\n- **Nome:** Teclado Mecânico sem fio Logitech MX Mechanical Mini\n- **Preço:** R$ 1.000,00\n- **Estoque:** 10 unidades\n\nEsses são os dois teclados que temos atualmente em estoque. Se você quiser ver as imagens novamente ou precisar de mais detalhes sobre algum deles (como especificações técnicas, compatibilidade, etc.), é só me dizer!\n\nDeseja adicionar algum ao carrinho ou tem alguma outra pergunta? 😊	2026-09-13 12:26:07.61
cmtzsglcf000n85xgkj8g8dy1	cmtzsbso6000185xg926mzt5u	user	Então, eu queria as imagens do teclado que você tem.	2026-09-13 12:26:57.422
cmtzsgld2000p85xg3hdlcapw	cmtzsbso6000185xg926mzt5u	assistant	Aqui estão as imagens e detalhes dos teclados disponíveis no nosso catálogo:\n\n**1. Kit Teclado e Mouse Sem Fio**\n- **Nome:** Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- **Descrição:** Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras\n- **Preço:** R$ 90,00\n- **Estoque:** 65 unidades\n- **Imagem:** MEDIA:/uploads/products/1788796381033-656535055.jpg\n\n**2. Teclado Mecânico sem fio**\n- **Nome:** Teclado Mecânico sem fio Logitech MX Mechanical Mini\n- **Descrição:** Teclado Mecânico sem fio Logitech MX Mechanical Mini\n- **Preço:** R$ 1.000,00\n- **Estoque:** 10 unidades\n- **Imagem:** MEDIA:/uploads/products/1788796449038-926950372.jpg\n\nVocê gostaria de mais detalhes sobre algum desses teclados, ou deseja adicionar algum ao carrinho? 😊	2026-09-13 12:26:57.446
cmtzsmy54000r85xgg18ctl8i	cmtzsbso6000185xg926mzt5u	user	Você pode mandar a imagem desse teclado mecânico sem fio?  Obrigado.	2026-09-13 12:31:53.942
cmtzsmy5o000t85xgph5q3yll	cmtzsbso6000185xg926mzt5u	assistant	No response from OpenClaw.	2026-09-13 12:31:53.965
cmtzspx4k000x85xg1j4tf74u	cmtzspm37000v85xgm2r9jgaa	user	Olá, Bom dia, você teria teclado? pode me enviar imagens deles?	2026-09-13 12:34:12.596
cmtzspx50000z85xgexh3vq1q	cmtzspm37000v85xgm2r9jgaa	assistant	Bom dia! Sim, temos teclados disponíveis. Aqui estão algumas opções com imagens:\n1. **Kit Teclado e Mouse Sem Fio** – CSI50, 2.4GHz, ABNT2, Preto – Intelbras\n Preço: R$ 90,00\n Estoque: 65 unidades\n2. **Teclado Mecânico sem fio** – Logitech MX Mechanical Mini\n Preço: R$ 1.000,00\n Estoque: 10 unidades\nSe quiser mais detalhes ou adicionar algum ao carrinho, é só me avisar!	2026-09-13 12:34:12.612
cmtzsrgwb001185xg2dk4l1nn	cmtzspm37000v85xgm2r9jgaa	user	E monitor, você teria algum...  Foz.	2026-09-13 12:35:24.875
cmtzsrgws001385xga990ef5i	cmtzspm37000v85xgm2r9jgaa	assistant	Bom dia! Sim, temos alguns monitores disponíveis. Aqui estão as opções:\n\n1. **LG UltraGear 32"** – Monitor Gamer 32" VA, 165Hz, 1ms, QHD 2K (2560x1440), HDR10, AMD FreeSync – Preto\n   - Preço: **R$ 1.800,00** | Estoque: 20 unidades\n   - ![Imagem](/uploads/products/1788796083721-399561711.jpg)\n\n2. **Monitor LG Ultragear 27"** – 27", IPS, 200Hz, 1ms\n   - Preço: **R$ 950,00** | Estoque: 15 unidades\n   - ![Imagem](/uploads/products/1788795920763-767328288.jpg)\n\n3. **Monitor Gamer AOC 23,8"** – 100Hz, 1ms, 24B30HM2 Preto\n   - Preço: **R$ 490,00** | Estoque: 15 unidades\n   - ![Imagem](/uploads/products/1788795986842-988690677.jpg)\n\nTem algum que te interessou? Posso te dar mais detalhes ou adicionar ao carrinho! 😊	2026-09-13 12:35:24.893
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Order" (id, "tenantId", "userId", status, "cancelReason", hidden, "paymentStatus", "paymentMethod", total, "trackingCode", carrier, "paidAt", "shippedAt", "deliveredAt", "cancelledAt", "createdAt", "updatedAt") FROM stdin;
PED-1042	cmtr96kjb000085vfrvtxmqwj	user_123	SHIPPED	\N	f	PAID	\N	150	TRK-1042BR	Logística Própria	\N	\N	\N	\N	2026-09-07 18:17:26.757	2026-09-07 18:17:26.757
cmtrutua4000j85sf41b19wcx	cmtr96kjb000085vfrvtxmqwj	cmtrpjzcb000185c715vfvf5p	PENDING	\N	f	PENDING	\N	950	\N	\N	\N	\N	\N	\N	2026-09-07 23:11:05.357	2026-09-07 23:11:05.357
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."OrderItem" (id, "orderId", "productId", "productName", quantity, price) FROM stdin;
cmtrutua5000l85sfbnmdatvz	cmtrutua4000j85sf41b19wcx	cmtrewm0w000l85k6chbacbmh	\N	1	950
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Product" (id, name, description, price, stock, "imageUrl", active, "tenantId", "createdAt") FROM stdin;
cmtremcb4000185k6rfxxnapt	Filtro de linha	Filtro de linha DPS Clamper Iclamper Energia 8 LCF, Preto, 026775	110	50	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:37:21.615
cmtrep6cc000585k6xcp3pjhv	Fone de Ouvido JBL	Fone de Ouvido JBL Live 780NC, Bluetooth, Preto, JBLLIVE780NCBLKBR	824	30	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:39:33.851
cmtrer88v000985k62eekv91l	Fonte Corsair	Fonte Corsair CX750, 750W, 80 Plus Bronze, Preto, CP-9020279-BR	470	20	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:41:09.59
cmtretif9000d85k6dp44ow5h	Headphone Baseus	Headphone Baseus EH10 NC, Drivers 40mm, Bluetooth, Preto, A0203800	390	25	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:42:56.132
cmtreutsd000h85k6hzfvgnlc	Headset Gamer 	Headset Gamer Havit H630bt Bluetooth 5.3 On-ear 3d	280	35	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:43:57.516
cmtrewm0w000l85k6chbacbmh	Monitor LG Ultragear	Monitor LG Ultragear - 27g523 - Ips De 27, 200hz, 1ms	950	15	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:45:20.767
cmtrey11n000p85k6aqzd69rd	Monitor Gamer Aoc	Monitor Gamer Aoc 23,8'' 100hz 1ms 24b30hm2 Preto	490	15	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:46:26.851
cmtrf03rv000t85k6jw1ycv6b	LG UltraGear	LG UltraGear Monitor Gamer 32" VA 165Hz 1ms (MBR) QHD 2K (2560x1440) HDR10 AMD FreeSync, Preto - 32GN600	1800	20	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:48:03.738
cmtrf1s6v000x85k6veqo8yqz	Mouse Gamer Redragon	Mouse Gamer Redragon King Pro 1K Preto Preto - M916-PRO-1K	160	67	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:49:22.038
cmtrf3894001185k6u7dnmxl4	Mouse Gamer Para Jogo	Mouse Gamer Para Jogo 3.200 Dpi Óptico Com Luzes Led Rgb Usb	30	80	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:50:29.511
cmtrf4w5v001585k6asxpqj2u	Mouse Branco Sem Fio	Mouse Branco Sem Fio Gamer Attack Shark R1 Paw3311 DPI 18000	148	15	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:51:47.109
cmtrf6h67001985k6c42m3t5e	Kit Teclado e Mouse Sem Fio	Kit Teclado e Mouse Sem Fio CSI50, 2.4GHz, ABNT2, Preto Intelbras	90	65	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:53:01.038
cmtrf7xna001d85k67qwsfqja	Teclado Mecânico sem fio	Teclado Mecânico sem fio Logitech MX Mechanical Mini	1000	10	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:54:09.045
cmtrf9yc7001h85k6g0kc629l	Smart TV Hisense	Smart TV Hisense HI-QLED 4K 65" Polegadas com Dolby Vision, Dolby Gaming e Alexa - 65Q6QV	3400	15	\N	t	cmtr96kjb000085vfrvtxmqwj	2026-09-07 15:55:43.254
\.


--
-- Data for Name: ProductImage; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ProductImage" (id, url, "productId") FROM stdin;
cmtremcbo000385k6bpyzae8k	/uploads/products/1788795441595-890289270.jpg	cmtremcb4000185k6rfxxnapt
cmtrep6cx000785k6nf1r97vd	/uploads/products/1788795573828-56050748.jpg	cmtrep6cc000585k6xcp3pjhv
cmtrer89g000b85k67ot07guy	/uploads/products/1788795669585-264498322.jpg	cmtrer88v000985k62eekv91l
cmtretifv000f85k6pasj2y3g	/uploads/products/1788795776111-423509608.jpg	cmtretif9000d85k6dp44ow5h
cmtreutsu000j85k6yf852x8s	/uploads/products/1788795837507-758243245.jpg	cmtreutsd000h85k6hzfvgnlc
cmtrewm1u000n85k68xexm49w	/uploads/products/1788795920763-767328288.jpg	cmtrewm0w000l85k6chbacbmh
cmtrey12b000r85k61jkejc86	/uploads/products/1788795986842-988690677.jpg	cmtrey11n000p85k6aqzd69rd
cmtrf03s7000v85k6e393e5cp	/uploads/products/1788796083721-399561711.jpg	cmtrf03rv000t85k6jw1ycv6b
cmtrf1s87000z85k62a1td9wo	/uploads/products/1788796162031-266613661.jpg	cmtrf1s6v000x85k6veqo8yqz
cmtrf389p001385k6884n660w	/uploads/products/1788796229506-984002336.jpg	cmtrf3894001185k6u7dnmxl4
cmtrf4w6k001785k64kh7bnd0	/uploads/products/1788796307092-723074349.jpg	cmtrf4w5v001585k6asxpqj2u
cmtrf6h6r001b85k6zemjimhe	/uploads/products/1788796381033-656535055.jpg	cmtrf6h67001985k6c42m3t5e
cmtrf7xo1001f85k6661idih1	/uploads/products/1788796449038-926950372.jpg	cmtrf7xna001d85k67qwsfqja
cmtrf9ycr001j85k6nqpkhl3x	/uploads/products/1788796543239-44405329.jpg	cmtrf9yc7001h85k6g0kc629l
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Tenant" (id, name, plan, "maxTokens", active, "agentName", "createdAt") FROM stdin;
cmtr96kjb000085vfrvtxmqwj	TECNO SHOPPING	free	50000	t	main	2026-09-07 13:05:07.701
\.


--
-- Data for Name: Tool; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Tool" (id, "tenantId", name, type, config, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, "telegramId", phone, email, name, "avatarUrl", role, "tenantId", "createdAt") FROM stdin;
user_123	\N	\N	\N	Cliente Teste	\N	USER	cmtr96kjb000085vfrvtxmqwj	2026-09-07 18:10:01.576
cmtrpjzcb000185c715vfvf5p	\N	5521986213555	\N	Lauro Mello	\N	USER	cmtr96kjb000085vfrvtxmqwj	2026-09-07 20:43:27.276
cmty8k2s400018588h0d9t2v5	1218571836	\N	\N	lauro	\N	USER	cmtr96kjb000085vfrvtxmqwj	2026-09-12 10:22:01.492
cmtyslgbj000185cpqt228dju	\N	5521973754462	\N	Cliente WhatsApp	\N	USER	cmtr96kjb000085vfrvtxmqwj	2026-09-12 19:42:58.015
cmtz17ved000185s8f2g71u95	\N	5521967493187	\N	Katia Lins	\N	USER	cmtr96kjb000085vfrvtxmqwj	2026-09-12 23:44:20.917
\.


--
-- Data for Name: UserMemory; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UserMemory" (id, "userId", key, value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: WhatsAppSession; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."WhatsAppSession" (id, phone, "sessionId", "tenantId", "createdAt") FROM stdin;
\.


--
-- Name: AIRequest AIRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."AIRequest"
    ADD CONSTRAINT "AIRequest_pkey" PRIMARY KEY (id);


--
-- Name: CartItem CartItem_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY (id);


--
-- Name: Cart Cart_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_pkey" PRIMARY KEY (id);


--
-- Name: Conversation Conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY (id);


--
-- Name: Delivery Delivery_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Delivery"
    ADD CONSTRAINT "Delivery_pkey" PRIMARY KEY (id);


--
-- Name: DriverLocation DriverLocation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DriverLocation"
    ADD CONSTRAINT "DriverLocation_pkey" PRIMARY KEY (id);


--
-- Name: Driver Driver_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Driver"
    ADD CONSTRAINT "Driver_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: Tool Tool_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Tool"
    ADD CONSTRAINT "Tool_pkey" PRIMARY KEY (id);


--
-- Name: UserMemory UserMemory_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserMemory"
    ADD CONSTRAINT "UserMemory_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WhatsAppSession WhatsAppSession_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."WhatsAppSession"
    ADD CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY (id);


--
-- Name: AIRequest_tenantId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "AIRequest_tenantId_idx" ON public."AIRequest" USING btree ("tenantId");


--
-- Name: CartItem_cartId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "CartItem_cartId_idx" ON public."CartItem" USING btree ("cartId");


--
-- Name: Cart_userId_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Cart_userId_status_idx" ON public."Cart" USING btree ("userId", status);


--
-- Name: Conversation_userId_tenantId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Conversation_userId_tenantId_idx" ON public."Conversation" USING btree ("userId", "tenantId");


--
-- Name: Delivery_driverId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Delivery_driverId_idx" ON public."Delivery" USING btree ("driverId");


--
-- Name: Delivery_orderId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Delivery_orderId_key" ON public."Delivery" USING btree ("orderId");


--
-- Name: Delivery_tenantId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Delivery_tenantId_idx" ON public."Delivery" USING btree ("tenantId");


--
-- Name: DriverLocation_driverId_timestamp_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "DriverLocation_driverId_timestamp_idx" ON public."DriverLocation" USING btree ("driverId", "timestamp");


--
-- Name: Driver_phone_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Driver_phone_idx" ON public."Driver" USING btree (phone);


--
-- Name: Driver_phone_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Driver_phone_key" ON public."Driver" USING btree (phone);


--
-- Name: Driver_tenantId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Driver_tenantId_idx" ON public."Driver" USING btree ("tenantId");


--
-- Name: Message_conversationId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Message_conversationId_idx" ON public."Message" USING btree ("conversationId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: Order_tenantId_paymentStatus_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_tenantId_paymentStatus_idx" ON public."Order" USING btree ("tenantId", "paymentStatus");


--
-- Name: Order_tenantId_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_tenantId_status_idx" ON public."Order" USING btree ("tenantId", status);


--
-- Name: Order_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_tenantId_userId_idx" ON public."Order" USING btree ("tenantId", "userId");


--
-- Name: Order_trackingCode_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Order_trackingCode_idx" ON public."Order" USING btree ("trackingCode");


--
-- Name: Product_tenantId_active_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Product_tenantId_active_idx" ON public."Product" USING btree ("tenantId", active);


--
-- Name: Tenant_active_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Tenant_active_idx" ON public."Tenant" USING btree (active);


--
-- Name: Tool_tenantId_active_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Tool_tenantId_active_idx" ON public."Tool" USING btree ("tenantId", active);


--
-- Name: UserMemory_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UserMemory_userId_idx" ON public."UserMemory" USING btree ("userId");


--
-- Name: UserMemory_userId_key_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "UserMemory_userId_key_key" ON public."UserMemory" USING btree ("userId", key);


--
-- Name: User_phone_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_phone_idx" ON public."User" USING btree (phone);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_telegramId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_telegramId_key" ON public."User" USING btree ("telegramId");


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: User_tenantId_role_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_tenantId_role_idx" ON public."User" USING btree ("tenantId", role);


--
-- Name: CartItem CartItem_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public."Cart"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CartItem CartItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Cart Cart_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Cart Cart_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conversation Conversation_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conversation Conversation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Delivery Delivery_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Delivery"
    ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."Driver"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Delivery Delivery_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Delivery"
    ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Delivery Delivery_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Delivery"
    ADD CONSTRAINT "Delivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DriverLocation DriverLocation_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."DriverLocation"
    ADD CONSTRAINT "DriverLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."Driver"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Driver Driver_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Driver"
    ADD CONSTRAINT "Driver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Tool Tool_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Tool"
    ADD CONSTRAINT "Tool_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserMemory UserMemory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserMemory"
    ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WhatsAppSession WhatsAppSession_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."WhatsAppSession"
    ADD CONSTRAINT "WhatsAppSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict BYiMRx5ZoseqJLtIUM1eHHR79Q72BiTTykZ7Xh541psoQLXLlhf6sVYvBRK01KC

