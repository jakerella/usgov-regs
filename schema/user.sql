CREATE TABLE public.users
(
    id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    phash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    api_key character varying(255) COLLATE pg_catalog."default",
    create_time timestamp with time zone NOT NULL,
    reset_token character varying(255) COLLATE pg_catalog."default",
    reset_timeout timestamp with time zone,
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT email UNIQUE (email)
);