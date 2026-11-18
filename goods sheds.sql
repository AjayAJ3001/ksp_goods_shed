--
-- PostgreSQL database dump
--

\restrict EHzvEurSQW7gcpbCvfcGeaGRaCMRW3OxOv62U1nxso9DA1pSC88HH2SejjffASo

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-11-18 18:15:00

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 234 (class 1259 OID 399287)
-- Name: loads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loads (
    id integer NOT NULL,
    truck_id integer NOT NULL,
    bags integer NOT NULL,
    set_no integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loads_bags_check CHECK ((bags > 0)),
    CONSTRAINT loads_set_no_check CHECK (((set_no >= 1) AND (set_no <= 18)))
);


ALTER TABLE public.loads OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 399286)
-- Name: loads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loads_id_seq OWNER TO postgres;

--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 233
-- Name: loads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loads_id_seq OWNED BY public.loads.id;


--
-- TOC entry 230 (class 1259 OID 399233)
-- Name: parties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parties (
    id integer NOT NULL,
    name text NOT NULL,
    contact_person text,
    mobile_number text,
    address text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT parties_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])))
);


ALTER TABLE public.parties OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 399232)
-- Name: parties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parties_id_seq OWNER TO postgres;

--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 229
-- Name: parties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parties_id_seq OWNED BY public.parties.id;


--
-- TOC entry 232 (class 1259 OID 399251)
-- Name: party_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.party_units (
    id integer NOT NULL,
    party_id integer NOT NULL,
    name text NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT party_units_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])))
);


ALTER TABLE public.party_units OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 399250)
-- Name: party_units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.party_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.party_units_id_seq OWNER TO postgres;

--
-- TOC entry 5131 (class 0 OID 0)
-- Dependencies: 231
-- Name: party_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.party_units_id_seq OWNED BY public.party_units.id;


--
-- TOC entry 222 (class 1259 OID 399120)
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    rr_no text NOT NULL,
    rr_date date,
    fnr text,
    station_from text,
    station_to text,
    commodity_description text,
    consignor_code text,
    consignee_code text,
    party_name text,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_hash text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    uploaded_by integer NOT NULL,
    shed_no text,
    closed_at timestamp with time zone,
    CONSTRAINT receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text])))
);


ALTER TABLE public.receipts OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 399119)
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receipts_id_seq OWNER TO postgres;

--
-- TOC entry 5132 (class 0 OID 0)
-- Dependencies: 221
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- TOC entry 226 (class 1259 OID 399176)
-- Name: rr_masters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rr_masters (
    id integer NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_hash text NOT NULL,
    rr_no text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by integer NOT NULL,
    receipt_id integer
);


ALTER TABLE public.rr_masters OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 399175)
-- Name: rr_masters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rr_masters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rr_masters_id_seq OWNER TO postgres;

--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 225
-- Name: rr_masters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rr_masters_id_seq OWNED BY public.rr_masters.id;


--
-- TOC entry 228 (class 1259 OID 399204)
-- Name: trucks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trucks (
    id integer NOT NULL,
    sno integer NOT NULL,
    truck_date date NOT NULL,
    truck_no text NOT NULL,
    receipt_id integer NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    party_id integer,
    unit_id integer
);


ALTER TABLE public.trucks OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 399203)
-- Name: trucks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trucks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trucks_id_seq OWNER TO postgres;

--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 227
-- Name: trucks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trucks_id_seq OWNED BY public.trucks.id;


--
-- TOC entry 220 (class 1259 OID 399101)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'manager'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 399100)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 224 (class 1259 OID 399149)
-- Name: wagons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wagons (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    sno integer NOT NULL,
    owning_rly text NOT NULL,
    wagon_type text NOT NULL,
    wagon_no text NOT NULL,
    article_count integer NOT NULL,
    shed_no text
);


ALTER TABLE public.wagons OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 399148)
-- Name: wagons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wagons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wagons_id_seq OWNER TO postgres;

--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 223
-- Name: wagons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wagons_id_seq OWNED BY public.wagons.id;


--
-- TOC entry 4908 (class 2604 OID 399290)
-- Name: loads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads ALTER COLUMN id SET DEFAULT nextval('public.loads_id_seq'::regclass);


--
-- TOC entry 4901 (class 2604 OID 399236)
-- Name: parties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties ALTER COLUMN id SET DEFAULT nextval('public.parties_id_seq'::regclass);


--
-- TOC entry 4904 (class 2604 OID 399254)
-- Name: party_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units ALTER COLUMN id SET DEFAULT nextval('public.party_units_id_seq'::regclass);


--
-- TOC entry 4893 (class 2604 OID 399123)
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- TOC entry 4897 (class 2604 OID 399179)
-- Name: rr_masters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters ALTER COLUMN id SET DEFAULT nextval('public.rr_masters_id_seq'::regclass);


--
-- TOC entry 4899 (class 2604 OID 399207)
-- Name: trucks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks ALTER COLUMN id SET DEFAULT nextval('public.trucks_id_seq'::regclass);


--
-- TOC entry 4891 (class 2604 OID 399104)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4896 (class 2604 OID 399152)
-- Name: wagons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons ALTER COLUMN id SET DEFAULT nextval('public.wagons_id_seq'::regclass);


--
-- TOC entry 5123 (class 0 OID 399287)
-- Dependencies: 234
-- Data for Name: loads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loads (id, truck_id, bags, set_no, created_by, created_at) FROM stdin;
1	1	25	2	1	2026-11-18 15:16:16.397996+05:30
3	2	500	3	1	2026-11-18 17:00:48.736431+05:30
\.


--
-- TOC entry 5119 (class 0 OID 399233)
-- Dependencies: 230
-- Data for Name: parties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parties (id, name, contact_person, mobile_number, address, status, created_at) FROM stdin;
1	KRISHI NUTRITION COMPANY	\N	\N	\N	ACTIVE	2026-11-18 14:17:22.008808+05:30
2	KUPPANNA POULTRY FARM	\N	\N	\N	ACTIVE	2026-11-18 14:17:22.011464+05:30
3	SWAMI FEEDS	\N	\N	\N	ACTIVE	2026-11-18 14:17:22.012289+05:30
4	VENKATESHWARA HATCHERIES	\N	\N	\N	ACTIVE	2026-11-18 14:17:22.012886+05:30
5	SENTHIL ANDAVAR FEEDS	\N	\N	\N	ACTIVE	2026-11-18 14:17:22.013428+05:30
\.


--
-- TOC entry 5121 (class 0 OID 399251)
-- Dependencies: 232
-- Data for Name: party_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.party_units (id, party_id, name, rate, status, created_at) FROM stdin;
1	1	SIPCOT	300.00	ACTIVE	2026-11-18 14:17:22.013932+05:30
2	1	RGS-VAVIKADAI	300.00	ACTIVE	2026-11-18 14:17:22.016707+05:30
3	1	GOBI-SAKTHI FEEDS	400.00	ACTIVE	2026-11-18 14:17:22.017501+05:30
4	1	PALLADAM-PPK HATCHERIES	550.00	ACTIVE	2026-11-18 14:17:22.018242+05:30
5	1	PAPPAMPATTI-VALARMATHI FEEDS	595.00	ACTIVE	2026-11-18 14:17:22.018947+05:30
6	1	NACHIPALAYAM-SUGUNA FEEDS	650.00	ACTIVE	2026-11-18 14:17:22.019496+05:30
7	1	NAMAKKAL	465.00	ACTIVE	2026-11-18 14:17:22.019986+05:30
8	1	PUDHUCHATHARAM	465.00	ACTIVE	2026-11-18 14:17:22.020411+05:30
9	1	VENNANTHUR	445.00	ACTIVE	2026-11-18 14:17:22.020868+05:30
10	2	MUTHUR	350.00	ACTIVE	2026-11-18 14:17:22.021445+05:30
11	2	VELLAKOOIL	400.00	ACTIVE	2026-11-18 14:17:22.021945+05:30
12	2	MULLANUR	490.00	ACTIVE	2026-11-18 14:17:22.022399+05:30
13	3	MULLANUR	475.00	ACTIVE	2026-11-18 14:17:22.022809+05:30
14	4	KUNDADAM	450.00	ACTIVE	2026-11-18 14:17:22.023227+05:30
15	5	PALANI	600.00	ACTIVE	2026-11-18 14:17:22.024135+05:30
\.


--
-- TOC entry 5111 (class 0 OID 399120)
-- Dependencies: 222
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, rr_no, rr_date, fnr, station_from, station_to, commodity_description, consignor_code, consignee_code, party_name, file_name, file_path, file_hash, status, uploaded_at, submitted_at, uploaded_by, shed_no, closed_at) FROM stdin;
1	282000305	2026-11-07	26103121275	PRNA	ED	MAIZE ( RAKE DEMAND )	SYJT	NAPP	Krishi	ERR(PRNA-ED).pdf	2026-11-18/282000305-84b48499-2d18-4158-a36c-e1c72113e6f3.pdf	73097c57a495621e6b79a65a2551595d841f5f71f22f02c717b220eb6468b0fe	submitted	2026-11-18 12:52:39.180122+05:30	2026-11-18 12:52:39.180122+05:30	1	\N	\N
\.


--
-- TOC entry 5115 (class 0 OID 399176)
-- Dependencies: 226
-- Data for Name: rr_masters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rr_masters (id, file_name, file_path, file_hash, rr_no, uploaded_at, uploaded_by, receipt_id) FROM stdin;
1	ERR(PRNA-ED).pdf	2026-11-18/282000305-84b48499-2d18-4158-a36c-e1c72113e6f3.pdf	73097c57a495621e6b79a65a2551595d841f5f71f22f02c717b220eb6468b0fe	282000305	2026-11-18 12:52:39.180122+05:30	1	1
\.


--
-- TOC entry 5117 (class 0 OID 399204)
-- Dependencies: 228
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trucks (id, sno, truck_date, truck_no, receipt_id, created_by, created_at, party_id, unit_id) FROM stdin;
1	1	2026-11-18	TN59AB2345	1	1	2026-11-18 14:44:04.824433+05:30	1	1
2	2	2026-11-18	TN67AB6789	1	1	2026-11-18 17:00:09.226775+05:30	1	1
\.


--
-- TOC entry 5109 (class 0 OID 399101)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, username, password_hash, role, created_at) FROM stdin;
1	Owner	admin	$2a$10$bLgzTB38LqT3igaksemcrO/vTc0HdEbBQoKDUMxTZsm0Dv4WQ0HXS	owner	2026-11-18 12:01:47.862534+05:30
2	Shed Manager	manager	$2a$10$c7VSiiJlB2NzuUYTvMbrFe9PbzlgXt.cPd9thBq2zcZUwUebUTUSu	manager	2026-11-18 12:01:47.986201+05:30
\.


--
-- TOC entry 5113 (class 0 OID 399149)
-- Dependencies: 224
-- Data for Name: wagons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wagons (id, receipt_id, sno, owning_rly, wagon_type, wagon_no, article_count, shed_no) FROM stdin;
1	1	1	SEC	BCNAHSM1	31142628128	1050	1
2	1	2	SEC	BCNAHSM1	31142627749	1050	2
3	1	3	SEC	BCNAHSM1	31142628104	1050	3
4	1	4	SEC	BCNAHSM1	31142628180	1050	4
5	1	5	SEC	BCNAHSM1	31142628234	1050	5
6	1	6	SEC	BCNAHSM1	31142628227	1050	6
7	1	7	SEC	BCNAHSM1	31142628135	1050	7
8	1	8	SEC	BCNAHSM1	31142628159	1050	8
9	1	9	SEC	BCNAHSM1	31142628203	1050	9
10	1	10	SEC	BCNAHSM1	31142628012	1050	10
11	1	11	SEC	BCNAHSM1	31142627817	1050	11
12	1	12	SEC	BCNAHSM1	31142628142	1050	12
13	1	13	SEC	BCNAHSM1	31142628081	1050	13
14	1	14	SEC	BCNAHSM1	31142627800	1050	14
15	1	15	SEC	BCNAHSM1	31142627794	1050	15
16	1	16	SEC	BCNAHSM1	31142627787	1050	16
17	1	17	SEC	BCNAHSM1	31142627770	1050	17
18	1	18	SEC	BCNAHSM1	31142627992	1050	18
19	1	19	SEC	BCNAHSM1	31142628029	1050	1
20	1	20	SEC	BCNAHSM1	31142628036	1050	2
21	1	21	SEC	BCNAHSM1	31142628005	1050	3
22	1	22	SEC	BCNAHSM1	31142628197	1050	4
23	1	23	SEC	BCNAHSM1	31142628210	1050	4
24	1	24	SEC	BCNAHSM1	31142628166	1050	5
25	1	25	SEC	BCNAHSM1	31142628173	1050	5
26	1	26	SEC	BCNAHSM1	31142628067	1050	6
27	1	27	SEC	BCNAHSM1	31142628050	1050	6
28	1	28	SEC	BCNAHSM1	31142627930	1050	6
29	1	29	NR	BCNAM1	30039760033	1050	6
30	1	30	SC	BCNAHSM1	31092413614	1050	7
31	1	31	NR	BCNAHSM1	31032434891	1050	7
32	1	32	SEC	BCNAHSM1	31142313697	1050	7
33	1	33	SEC	BCNAHSM1	31142326178	1050	8
34	1	34	SEC	BCNAHSM1	31142627947	1050	8
35	1	35	SEC	BCNAHSM1	31142627961	1050	8
36	1	36	SEC	BCNAHSM1	31142627954	1050	8
37	1	37	EC	BCNAHSM1	31102332287	1050	4
38	1	38	NR	BCNAHSM1	31032412257	1050	4
39	1	39	NW	BCNAHSM1	31110540032	1050	6
40	1	40	WC	BCNAHSM1	31160311323	1050	9
41	1	41	CR	BCNAM1	30019765188	1050	11
42	1	42	WR	BCNAM1	30089661328	1050	12
\.


--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 233
-- Name: loads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loads_id_seq', 3, true);


--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 229
-- Name: parties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parties_id_seq', 120, true);


--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 231
-- Name: party_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.party_units_id_seq', 360, true);


--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 221
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipts_id_seq', 1, true);


--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 225
-- Name: rr_masters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rr_masters_id_seq', 26, true);


--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 227
-- Name: trucks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trucks_id_seq', 2, true);


--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 223
-- Name: wagons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wagons_id_seq', 42, true);


--
-- TOC entry 4947 (class 2606 OID 399301)
-- Name: loads loads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_pkey PRIMARY KEY (id);


--
-- TOC entry 4949 (class 2606 OID 399303)
-- Name: loads loads_truck_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_truck_id_key UNIQUE (truck_id);


--
-- TOC entry 4939 (class 2606 OID 399249)
-- Name: parties parties_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_name_key UNIQUE (name);


--
-- TOC entry 4941 (class 2606 OID 399247)
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- TOC entry 4943 (class 2606 OID 399270)
-- Name: party_units party_units_party_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_party_id_name_key UNIQUE (party_id, name);


--
-- TOC entry 4945 (class 2606 OID 399268)
-- Name: party_units party_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 399142)
-- Name: receipts receipts_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_file_hash_key UNIQUE (file_hash);


--
-- TOC entry 4923 (class 2606 OID 399138)
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 4925 (class 2606 OID 399140)
-- Name: receipts receipts_rr_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_rr_no_key UNIQUE (rr_no);


--
-- TOC entry 4931 (class 2606 OID 399192)
-- Name: rr_masters rr_masters_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_file_hash_key UNIQUE (file_hash);


--
-- TOC entry 4933 (class 2606 OID 399190)
-- Name: rr_masters rr_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_pkey PRIMARY KEY (id);


--
-- TOC entry 4935 (class 2606 OID 399219)
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- TOC entry 4937 (class 2606 OID 399221)
-- Name: trucks trucks_sno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_sno_key UNIQUE (sno);


--
-- TOC entry 4917 (class 2606 OID 399116)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 399118)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4927 (class 2606 OID 399163)
-- Name: wagons wagons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_pkey PRIMARY KEY (id);


--
-- TOC entry 4929 (class 2606 OID 399165)
-- Name: wagons wagons_receipt_id_sno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_receipt_id_sno_key UNIQUE (receipt_id, sno);


--
-- TOC entry 4959 (class 2606 OID 399309)
-- Name: loads loads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4960 (class 2606 OID 399304)
-- Name: loads loads_truck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id);


--
-- TOC entry 4958 (class 2606 OID 399271)
-- Name: party_units party_units_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- TOC entry 4950 (class 2606 OID 399143)
-- Name: receipts receipts_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4952 (class 2606 OID 399198)
-- Name: rr_masters rr_masters_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;


--
-- TOC entry 4953 (class 2606 OID 399193)
-- Name: rr_masters rr_masters_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4954 (class 2606 OID 399227)
-- Name: trucks trucks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4955 (class 2606 OID 399276)
-- Name: trucks trucks_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- TOC entry 4956 (class 2606 OID 399222)
-- Name: trucks trucks_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id);


--
-- TOC entry 4957 (class 2606 OID 399281)
-- Name: trucks trucks_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.party_units(id);


--
-- TOC entry 4951 (class 2606 OID 399166)
-- Name: wagons wagons_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


-- Completed on 2026-11-18 18:15:01

--
-- PostgreSQL database dump complete
--

\unrestrict EHzvEurSQW7gcpbCvfcGeaGRaCMRW3OxOv62U1nxso9DA1pSC88HH2SejjffASo

