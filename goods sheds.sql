--
-- PostgreSQL database dump
--

\restrict SzxfvvnQdjlt9mjcHCgcHT5gaGZe6yxw9u9hhTDUfOx3M72yEWquALcfxlQI6UU

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-11-26 15:12:24

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
-- TOC entry 238 (class 1259 OID 407377)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    user_name text NOT NULL,
    user_role text NOT NULL,
    source text NOT NULL,
    action text NOT NULL,
    detail text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 407376)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 237
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


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
    wagon_id integer,
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
-- TOC entry 5156 (class 0 OID 0)
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
-- TOC entry 5157 (class 0 OID 0)
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
-- TOC entry 5158 (class 0 OID 0)
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
    started_at timestamp with time zone,
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
-- TOC entry 5159 (class 0 OID 0)
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
-- TOC entry 5160 (class 0 OID 0)
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
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 227
-- Name: trucks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trucks_id_seq OWNED BY public.trucks.id;


--
-- TOC entry 236 (class 1259 OID 407351)
-- Name: uploaded_pdfs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uploaded_pdfs (
    id integer NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_hash text NOT NULL,
    rr_no text,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    uploaded_by integer NOT NULL,
    receipt_id integer
);


ALTER TABLE public.uploaded_pdfs OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 407350)
-- Name: uploaded_pdfs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.uploaded_pdfs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.uploaded_pdfs_id_seq OWNER TO postgres;

--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 235
-- Name: uploaded_pdfs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.uploaded_pdfs_id_seq OWNED BY public.uploaded_pdfs.id;


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
-- TOC entry 5163 (class 0 OID 0)
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
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 223
-- Name: wagons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wagons_id_seq OWNED BY public.wagons.id;


--
-- TOC entry 4922 (class 2604 OID 407380)
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- TOC entry 4918 (class 2604 OID 399290)
-- Name: loads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads ALTER COLUMN id SET DEFAULT nextval('public.loads_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 399236)
-- Name: parties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties ALTER COLUMN id SET DEFAULT nextval('public.parties_id_seq'::regclass);


--
-- TOC entry 4914 (class 2604 OID 399254)
-- Name: party_units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units ALTER COLUMN id SET DEFAULT nextval('public.party_units_id_seq'::regclass);


--
-- TOC entry 4903 (class 2604 OID 399123)
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- TOC entry 4907 (class 2604 OID 399179)
-- Name: rr_masters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters ALTER COLUMN id SET DEFAULT nextval('public.rr_masters_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 399207)
-- Name: trucks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks ALTER COLUMN id SET DEFAULT nextval('public.trucks_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 407354)
-- Name: uploaded_pdfs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_pdfs ALTER COLUMN id SET DEFAULT nextval('public.uploaded_pdfs_id_seq'::regclass);


--
-- TOC entry 4901 (class 2604 OID 399104)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4906 (class 2604 OID 399152)
-- Name: wagons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons ALTER COLUMN id SET DEFAULT nextval('public.wagons_id_seq'::regclass);


--
-- TOC entry 5149 (class 0 OID 407377)
-- Dependencies: 238
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, user_name, user_role, source, action, detail, created_at) FROM stdin;
66	6	Shed Manager	manager	admin	Signed in	Username manager	2026-11-24 17:14:46.606436+05:30
67	6	Shed Manager	manager	admin	Signed out		2026-11-24 17:15:09.100687+05:30
68	1	Admin	owner	admin	Signed in	Username admin	2026-11-24 17:15:12.608559+05:30
69	1	Admin	owner	mobile	Uploaded an RR PDF		2026-11-24 17:20:01.254086+05:30
70	1	Admin	owner	mobile	Saved an RR	Party KRISHI NUTRITION COMPANY	2026-11-24 17:20:43.997389+05:30
71	1	Admin	owner	mobile	Uploaded an RR PDF		2026-11-24 17:21:06.907728+05:30
72	1	Admin	owner	mobile	Saved an RR	Party KUPPANNA POULTRY FARM	2026-11-24 17:21:57.509902+05:30
65	1	Admin	owner	admin	Signed out		2026-11-24 17:14:32.521279+05:30
73	1	Admin	owner	mobile	Added a truck	Truck TN67FG7890	2026-11-24 17:48:31.247709+05:30
74	1	Admin	owner	mobile	Saved a load entry	350 bags, set 1	2026-11-24 17:48:44.565615+05:30
75	1	Admin	owner	unknown	Signed in	Username admin	2026-11-24 17:51:47.230818+05:30
76	1	Admin	owner	mobile	Added a truck	Truck TN59GH5678	2026-11-24 17:53:11.585947+05:30
77	1	Admin	owner	mobile	Added a truck	Truck TN34DF5633	2026-11-24 17:53:18.648203+05:30
78	1	Admin	owner	mobile	Added a truck	Truck TN89DC4567	2026-11-24 17:53:26.235777+05:30
79	1	Admin	owner	mobile	Added a truck	Truck TN67GH5678	2026-11-24 17:53:47.815424+05:30
80	1	Admin	owner	mobile	Added a truck	Truck TN88GF4569	2026-11-24 17:54:02.719448+05:30
81	1	Admin	owner	mobile	Saved a load entry	350 bags, set 2	2026-11-24 17:57:00.45234+05:30
82	1	Admin	owner	mobile	Saved a load entry	250 bags, set 1	2026-11-24 17:57:11.202626+05:30
83	1	Admin	owner	mobile	Signed out		2026-11-24 17:57:35.536471+05:30
84	\N	test	unknown	mobile	Failed sign-in	Username test	2026-11-24 17:57:41.226121+05:30
86	7	test	manager	mobile	Signed in	Username test	2026-11-24 17:58:31.322426+05:30
87	1	Admin	owner	admin	Signed out		2026-11-24 18:00:58.00296+05:30
88	6	Shed Manager	manager	admin	Signed in	Username manager	2026-11-24 18:01:01.069456+05:30
89	6	Shed Manager	manager	admin	Signed out		2026-11-24 18:01:27.820102+05:30
90	1	Admin	owner	admin	Signed in	Username admin	2026-11-24 18:01:30.972807+05:30
91	7	test	manager	mobile	Signed out		2026-11-24 18:01:35.655742+05:30
92	1	Admin	owner	mobile	Signed in	Username admin	2026-11-24 18:01:58.880119+05:30
93	1	Admin	owner	mobile	Signed out		2026-11-24 18:02:11.362169+05:30
94	7	test	manager	mobile	Signed in	Username test	2026-11-24 18:02:19.289918+05:30
95	7	test	manager	mobile	Signed out		2026-11-24 18:02:25.275553+05:30
96	1	Admin	owner	mobile	Signed in	Username admin	2026-11-24 18:02:33.687572+05:30
97	1	Admin	owner	mobile	Signed out		2026-11-24 18:02:39.961349+05:30
98	7	test	manager	mobile	Signed in	Username test	2026-11-24 18:02:46.568749+05:30
99	7	test	manager	mobile	Signed out		2026-11-24 18:03:04.969885+05:30
100	1	Admin	owner	mobile	Signed in	Username admin	2026-11-24 18:03:14.519962+05:30
101	1	Admin	owner	mobile	Saved a load entry	250 bags, set 1	2026-11-24 18:03:35.526904+05:30
102	1	Admin	owner	mobile	Saved a load entry	300 bags, set 2	2026-11-24 18:03:44.236653+05:30
103	1	Admin	owner	mobile	Closed an RR		2026-11-24 18:03:52.027206+05:30
104	1	Admin	owner	mobile	Signed out		2026-11-24 18:07:05.035152+05:30
105	7	test	manager	mobile	Signed in	Username test	2026-11-24 18:07:10.907922+05:30
106	1	Admin	owner	unknown	Signed in	Username admin	2026-11-24 18:07:23.912754+05:30
107	1	Admin	owner	unknown	Signed in	Username admin	2026-11-24 18:07:34.975368+05:30
108	1	Admin	owner	admin	Viewed the reports		2026-11-24 18:15:51.690652+05:30
109	1	Admin	owner	admin	Viewed the reports		2026-11-24 18:15:51.771188+05:30
110	1	Admin	owner	admin	Viewed the reports		2026-11-24 18:16:08.424326+05:30
111	1	Admin	owner	admin	Viewed the reports		2026-11-24 18:16:08.504483+05:30
112	1	Admin	owner	admin	Opened the audit log		2026-11-24 18:16:25.481111+05:30
113	1	Admin	owner	admin	Opened the audit log		2026-11-24 18:16:25.554314+05:30
85	1	Admin	owner	admin	Created a user	Username test	2026-11-24 17:58:26.159414+05:30
141	7	test	manager	mobile	Added a truck	Truck TN99AB5678	2026-11-25 10:37:01.149986+05:30
142	7	test	manager	mobile	Saved a load entry	350 bags, set 3	2026-11-25 10:37:17.580442+05:30
143	7	test	manager	mobile	Signed out		2026-11-26 14:19:37.392956+05:30
144	1	Admin	owner	mobile	Signed in	Username admin	2026-11-26 14:23:29.60411+05:30
145	1	Admin	owner	mobile	Closed an RR		2026-11-26 14:23:44.900227+05:30
146	1	Admin	owner	mobile	Uploaded an RR PDF		2026-11-26 14:24:19.039463+05:30
\.


--
-- TOC entry 5145 (class 0 OID 399287)
-- Dependencies: 234
-- Data for Name: loads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loads (id, truck_id, bags, set_no, created_by, created_at, wagon_id) FROM stdin;
5	5	350	1	1	2026-11-24 17:48:44.326107+05:30	65
6	6	350	2	1	2026-11-24 17:57:00.258885+05:30	45
7	7	250	1	1	2026-11-24 17:57:11.136915+05:30	44
8	9	250	1	1	2026-11-24 18:03:35.462131+05:30	65
9	10	300	2	1	2026-11-24 18:03:44.214505+05:30	66
10	8	350	3	7	2026-11-25 10:37:17.255825+05:30	46
\.


--
-- TOC entry 5141 (class 0 OID 399233)
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
-- TOC entry 5143 (class 0 OID 399251)
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
-- TOC entry 5133 (class 0 OID 399120)
-- Dependencies: 222
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, rr_no, rr_date, fnr, station_from, station_to, commodity_description, consignor_code, consignee_code, party_name, file_name, file_path, file_hash, status, uploaded_at, submitted_at, uploaded_by, shed_no, closed_at, started_at) FROM stdin;
4	282000008	2026-11-23	26111907087	GWD	ED	MAIZE ( RAKE DEMAND )	MRTH	KNCL	KUPPANNA POULTRY FARM	gadwal%20maize%20wagon%20rr.pdf	2026-11-24/282000008-1f92d999-3994-4123-97fc-90630368de58.pdf	3f7278131d4d5246c2af6e3e2fbcadca1f3142a0da9f7af98276a51b301ef7a7	submitted	2026-11-24 17:21:57.380437+05:30	2026-11-24 17:21:57.380437+05:30	1	\N	2026-11-24 18:03:52.024849+05:30	2026-11-24 17:22:40.75891+05:30
3	282010820	2026-11-20	26111421505	AGS	ED	BAJRA ( RAKE DEMAND )	APSK	APSK	KRISHI NUTRITION COMPANY	E-RR%20820.pdf	2026-11-24/282010820-cedd7bc1-ff0c-4434-8549-256df20b838c.pdf	c6e20094f6edd9bfbae06fc7d2fbae8b03f19ef6b9b3da060c6b2d14f35ec60d	submitted	2026-11-24 17:20:43.858859+05:30	2026-11-24 17:20:43.858859+05:30	1	\N	2026-11-26 14:23:44.878736+05:30	2026-11-24 17:22:42.062812+05:30
\.


--
-- TOC entry 5137 (class 0 OID 399176)
-- Dependencies: 226
-- Data for Name: rr_masters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rr_masters (id, file_name, file_path, file_hash, rr_no, uploaded_at, uploaded_by, receipt_id) FROM stdin;
35	E-RR%20820.pdf	2026-11-24/282010820-cedd7bc1-ff0c-4434-8549-256df20b838c.pdf	c6e20094f6edd9bfbae06fc7d2fbae8b03f19ef6b9b3da060c6b2d14f35ec60d	282010820	2026-11-24 17:20:43.858859+05:30	1	3
36	gadwal%20maize%20wagon%20rr.pdf	2026-11-24/282000008-1f92d999-3994-4123-97fc-90630368de58.pdf	3f7278131d4d5246c2af6e3e2fbcadca1f3142a0da9f7af98276a51b301ef7a7	282000008	2026-11-24 17:21:57.380437+05:30	1	4
\.


--
-- TOC entry 5139 (class 0 OID 399204)
-- Dependencies: 228
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trucks (id, sno, truck_date, truck_no, receipt_id, created_by, created_at, party_id, unit_id) FROM stdin;
5	1	2026-11-24	TN67FG7890	4	1	2026-11-24 17:48:31.234647+05:30	2	12
6	1	2026-11-24	TN59GH5678	3	1	2026-11-24 17:53:11.576756+05:30	1	1
7	2	2026-11-24	TN34DF5633	3	1	2026-11-24 17:53:18.637813+05:30	1	1
8	3	2026-11-24	TN89DC4567	3	1	2026-11-24 17:53:26.225463+05:30	1	1
9	2	2026-11-24	TN67GH5678	4	1	2026-11-24 17:53:47.805123+05:30	2	12
10	3	2026-11-24	TN88GF4569	4	1	2026-11-24 17:54:02.706394+05:30	2	12
11	4	2026-11-25	TN99AB5678	3	7	2026-11-25 10:37:01.138413+05:30	1	1
\.


--
-- TOC entry 5147 (class 0 OID 407351)
-- Dependencies: 236
-- Data for Name: uploaded_pdfs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.uploaded_pdfs (id, file_name, file_path, file_hash, rr_no, uploaded_at, uploaded_by, receipt_id) FROM stdin;
8	E-RR%20820.pdf	2026-11-24/upload-cedd7bc1-ff0c-4434-8549-256df20b838c.pdf	c6e20094f6edd9bfbae06fc7d2fbae8b03f19ef6b9b3da060c6b2d14f35ec60d	282010820	2026-11-24 17:20:01.241393+05:30	1	3
9	gadwal%20maize%20wagon%20rr.pdf	2026-11-24/upload-1f92d999-3994-4123-97fc-90630368de58.pdf	3f7278131d4d5246c2af6e3e2fbcadca1f3142a0da9f7af98276a51b301ef7a7	282000008	2026-11-24 17:21:06.903536+05:30	1	4
10	gael%20rr%20161126.pdf	2026-11-26/upload-df15d56a-1a00-4d78-bcba-e19ff8fb6b2a.pdf	ea5ebb3a33f76f1b760d6ae52ab60c4a2d00726344e6b40985063a6f3dd04bfc	282000070	2026-11-26 14:24:19.031584+05:30	1	\N
\.


--
-- TOC entry 5131 (class 0 OID 399101)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, username, password_hash, role, created_at) FROM stdin;
6	Shed Manager	manager	$2a$10$AS6R5ec18x1m67MDwqJY0uCb/A7j2uhPhCSVj6VzjjN3QO6cR.ZwS	manager	2026-11-24 15:30:14.94291+05:30
7	test	test	$2a$10$Vy8fD4YlEnD2pz.Lq3SXKePs7zJmhpUu/zcFiPAvU5i7kmFyObaGa	manager	2026-11-24 17:58:26.155459+05:30
1	Admin	admin	$2a$10$wemf6FSHdgTkXJZXNpwNSO73F6rVz5d3pNqQlko1.JKV/BT8MLwZi	owner	2026-11-18 12:01:47.862534+05:30
\.


--
-- TOC entry 5135 (class 0 OID 399149)
-- Dependencies: 224
-- Data for Name: wagons; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wagons (id, receipt_id, sno, owning_rly, wagon_type, wagon_no, article_count, shed_no) FROM stdin;
44	3	1	ER	BCNAHSM1	31022215080	1292	1
45	3	2	SE	BCNAM1	30079378571	1292	2
46	3	3	NR	BCNAHSM1	31032424816	1292	3
47	3	4	EC	BCNAHSM1	31102418295	1292	4
48	3	5	SW	BCNAHSM1	31150530277	1292	5
49	3	6	NF	BCNAHSM1	31052413555	1292	7
50	3	7	NC	BCNAHSM1	31130311971	1292	6
51	3	8	ER	BCNAM1	30020163898	1292	7
52	3	9	SE	BCNAHSM1	31072111950	1292	8
53	3	10	NR	BCNAM1	30030660011	1292	9
54	3	11	SE	BCNAM1	30079414798	1292	10
55	3	12	NE	BCNAHSM1	31042418577	1292	11
56	3	13	WR	BCNAHSM1	31082212791	1292	12
57	3	14	SEC	BCNAHSM1	31142618716	1292	13
58	3	15	SR	BCNAM1	30069765466	1292	14
59	3	16	NR	BCNAHSM1	31032410871	1292	15
60	3	17	SR	BCNAM1	30069771306	1292	16
61	3	18	ECO	BCNAHSM1	31120533833	1292	17
62	3	19	NR	BCNAM1	30030066783	1292	18
63	3	20	NW	BCNAHSM1	31110538817	1292	19
64	3	21	NR	BCNAHSM1	31032441493	1292	20
65	4	1	NC	BCNHL	33131087428	1140	1
66	4	2	WC	BCNHL	33160985337	1140	2
67	4	3	SC	BCNHL	33091243216	1140	3
68	4	4	NC	BCNHL	33131361917	1140	4
69	4	5	SEC	BCNHL	33140933969	1140	5
70	4	6	NR	BCNHL	33031523828	1140	6
71	4	7	NC	BCNHL	33130987156	1140	7
72	4	8	NC	BCNHL	33131011379	1140	8
73	4	9	ECO	BCNHL	33120954229	1140	9
74	4	10	WC	BCNHL	33160983470	1140	10
75	4	11	WR	BCNHL	33081523045	1140	11
76	4	12	NC	BCNHL	33131097663	1140	12
77	4	13	EC	BCNHL	33101010166	1140	13
78	4	14	NW	BCNHL	33111525292	1140	14
79	4	15	NW	BCNHL	33111419881	1140	15
80	4	16	NR	BCNHL	33031315256	1140	16
81	4	17	SC	BCNHL	33091224338	1140	17
82	4	18	SEC	BCNHL	33141472207	1140	18
83	4	19	NW	BCNHL	33111096594	1140	12
84	4	20	NW	BCNHL	33111089633	1140	1
85	4	21	SEC	BCNHL	33141361686	1140	3
86	4	22	NC	BCNHL	33131576175	1140	4
87	4	23	WR	BCNHL	33081316319	1140	5
88	4	24	ECO	BCNHL	33121189316	1140	6
89	4	25	ECO	BCNHL	33121193870	1140	7
90	4	26	NC	BCNHL	33130986340	1140	8
91	4	27	SC	BCNHL	33091230780	1140	9
92	4	28	WC	BCNHL	33161090801	1140	10
93	4	29	EC	BCNHL	33101098287	1140	13
94	4	30	NR	BCNHL	33031522630	1140	15
95	4	31	SC	BCNHL	33091221313	1140	16
96	4	32	NW	BCNHL	33111090837	1140	12
97	4	33	ECO	BCNHL	33121079075	1140	13
98	4	34	SEC	BCNHL	33141595784	1140	14
99	4	35	EC	BCNHL	33101095217	1140	11
100	4	36	EC	BCNHL	33101018834	1140	15
101	4	37	EC	BCNHL	33101010388	1140	18
102	4	38	NE	BCNHL	33041514670	1140	11
103	4	39	ECO	BCNHL	33121079457	1140	3
104	4	40	NE	BCNHL	33041514939	1140	4
105	4	41	NF	BCNHL	33051502544	1140	6
106	4	42	WR	BCNHL	33081317989	1140	9
107	4	43	NC	BCNHL	33131090985	1140	1
108	4	44	EC	BCNHL	33101062318	1140	3
109	4	45	NC	BCNHL	33131574935	1140	4
\.


--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 237
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 146, true);


--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 233
-- Name: loads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loads_id_seq', 10, true);


--
-- TOC entry 5167 (class 0 OID 0)
-- Dependencies: 229
-- Name: parties_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parties_id_seq', 580, true);


--
-- TOC entry 5168 (class 0 OID 0)
-- Dependencies: 231
-- Name: party_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.party_units_id_seq', 1740, true);


--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 221
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipts_id_seq', 4, true);


--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 225
-- Name: rr_masters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rr_masters_id_seq', 64, true);


--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 227
-- Name: trucks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trucks_id_seq', 11, true);


--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 235
-- Name: uploaded_pdfs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.uploaded_pdfs_id_seq', 10, true);


--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 223
-- Name: wagons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wagons_id_seq', 109, true);


--
-- TOC entry 4967 (class 2606 OID 407393)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 399301)
-- Name: loads loads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_pkey PRIMARY KEY (id);


--
-- TOC entry 4963 (class 2606 OID 399303)
-- Name: loads loads_truck_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_truck_id_key UNIQUE (truck_id);


--
-- TOC entry 4953 (class 2606 OID 399249)
-- Name: parties parties_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_name_key UNIQUE (name);


--
-- TOC entry 4955 (class 2606 OID 399247)
-- Name: parties parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parties
    ADD CONSTRAINT parties_pkey PRIMARY KEY (id);


--
-- TOC entry 4957 (class 2606 OID 399270)
-- Name: party_units party_units_party_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_party_id_name_key UNIQUE (party_id, name);


--
-- TOC entry 4959 (class 2606 OID 399268)
-- Name: party_units party_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_pkey PRIMARY KEY (id);


--
-- TOC entry 4936 (class 2606 OID 399142)
-- Name: receipts receipts_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_file_hash_key UNIQUE (file_hash);


--
-- TOC entry 4938 (class 2606 OID 399138)
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 399140)
-- Name: receipts receipts_rr_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_rr_no_key UNIQUE (rr_no);


--
-- TOC entry 4946 (class 2606 OID 399192)
-- Name: rr_masters rr_masters_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_file_hash_key UNIQUE (file_hash);


--
-- TOC entry 4948 (class 2606 OID 399190)
-- Name: rr_masters rr_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_pkey PRIMARY KEY (id);


--
-- TOC entry 4950 (class 2606 OID 399219)
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 407365)
-- Name: uploaded_pdfs uploaded_pdfs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_pdfs
    ADD CONSTRAINT uploaded_pdfs_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 399116)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4934 (class 2606 OID 399118)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4942 (class 2606 OID 399163)
-- Name: wagons wagons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_pkey PRIMARY KEY (id);


--
-- TOC entry 4944 (class 2606 OID 399165)
-- Name: wagons wagons_receipt_id_sno_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_receipt_id_sno_key UNIQUE (receipt_id, sno);


--
-- TOC entry 4951 (class 1259 OID 415486)
-- Name: trucks_receipt_sno_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX trucks_receipt_sno_key ON public.trucks USING btree (receipt_id, sno);


--
-- TOC entry 4982 (class 2606 OID 407394)
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4977 (class 2606 OID 399309)
-- Name: loads loads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4978 (class 2606 OID 399304)
-- Name: loads loads_truck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id);


--
-- TOC entry 4979 (class 2606 OID 407345)
-- Name: loads loads_wagon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loads
    ADD CONSTRAINT loads_wagon_id_fkey FOREIGN KEY (wagon_id) REFERENCES public.wagons(id);


--
-- TOC entry 4976 (class 2606 OID 399271)
-- Name: party_units party_units_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.party_units
    ADD CONSTRAINT party_units_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;


--
-- TOC entry 4968 (class 2606 OID 399143)
-- Name: receipts receipts_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4970 (class 2606 OID 399198)
-- Name: rr_masters rr_masters_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;


--
-- TOC entry 4971 (class 2606 OID 399193)
-- Name: rr_masters rr_masters_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_masters
    ADD CONSTRAINT rr_masters_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4972 (class 2606 OID 399227)
-- Name: trucks trucks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4973 (class 2606 OID 399276)
-- Name: trucks trucks_party_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id);


--
-- TOC entry 4974 (class 2606 OID 399222)
-- Name: trucks trucks_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id);


--
-- TOC entry 4975 (class 2606 OID 399281)
-- Name: trucks trucks_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.party_units(id);


--
-- TOC entry 4980 (class 2606 OID 407371)
-- Name: uploaded_pdfs uploaded_pdfs_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_pdfs
    ADD CONSTRAINT uploaded_pdfs_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE SET NULL;


--
-- TOC entry 4981 (class 2606 OID 407366)
-- Name: uploaded_pdfs uploaded_pdfs_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_pdfs
    ADD CONSTRAINT uploaded_pdfs_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4969 (class 2606 OID 399166)
-- Name: wagons wagons_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wagons
    ADD CONSTRAINT wagons_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id) ON DELETE CASCADE;


-- Completed on 2026-11-26 15:12:25

--
-- PostgreSQL database dump complete
--

\unrestrict SzxfvvnQdjlt9mjcHCgcHT5gaGZe6yxw9u9hhTDUfOx3M72yEWquALcfxlQI6UU

