-- Database: medussa_erp

-- DROP DATABASE IF EXISTS medussa_erp;

CREATE DATABASE medussa_erp
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

GRANT TEMPORARY, CONNECT ON DATABASE medussa_erp TO PUBLIC;

GRANT ALL ON DATABASE medussa_erp TO medussa_user;

GRANT ALL ON DATABASE medussa_erp TO postgres;

-- SCHEMA: configuracion

-- DROP SCHEMA IF EXISTS configuracion ;

CREATE SCHEMA IF NOT EXISTS configuracion
    AUTHORIZATION postgres;

GRANT ALL ON SCHEMA configuracion TO medussa_user;

GRANT ALL ON SCHEMA configuracion TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA configuracion
GRANT ALL ON TABLES TO medussa_user;

-- SCHEMA: seguridad

-- DROP SCHEMA IF EXISTS seguridad ;

CREATE SCHEMA IF NOT EXISTS seguridad
    AUTHORIZATION postgres;

GRANT ALL ON SCHEMA seguridad TO medussa_user;

GRANT ALL ON SCHEMA seguridad TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA seguridad
GRANT ALL ON TABLES TO medussa_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA seguridad
GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA seguridad
GRANT ALL ON SEQUENCES TO medussa_user;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA seguridad
GRANT ALL ON SEQUENCES TO postgres;

-- Table: configuracion.configuraciones

-- DROP TABLE IF EXISTS configuracion.configuraciones;

CREATE TABLE IF NOT EXISTS configuracion.configuraciones
(
    id integer NOT NULL DEFAULT nextval('configuracion.configuraciones_id_seq'::regclass),
    nombre_empresa character varying(100) COLLATE pg_catalog."default" NOT NULL,
    nit character varying(20) COLLATE pg_catalog."default" NOT NULL,
    direccion character varying(150) COLLATE pg_catalog."default" NOT NULL,
    ciudad character varying(100) COLLATE pg_catalog."default" NOT NULL,
    pais character varying(100) COLLATE pg_catalog."default" NOT NULL,
    moneda character varying(10) COLLATE pg_catalog."default" NOT NULL,
    zona_horaria character varying(50) COLLATE pg_catalog."default" NOT NULL,
    telefono character varying(20) COLLATE pg_catalog."default",
    formato_fecha character varying(20) COLLATE pg_catalog."default",
    empresa_id character varying COLLATE pg_catalog."default" NOT NULL,
    email character varying(100) COLLATE pg_catalog."default",
    logo character varying(255) COLLATE pg_catalog."default",
    sector character varying(100) COLLATE pg_catalog."default",
    estado boolean DEFAULT true,
    fecha_inicio_operacion timestamp without time zone,
    configuraciones_iniciales jsonb,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion timestamp with time zone,
    CONSTRAINT configuraciones_pkey PRIMARY KEY (id),
    CONSTRAINT unique_nit UNIQUE (nit),
    CONSTRAINT unique_nombre_empresa UNIQUE (nombre_empresa)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS configuracion.configuraciones
    OWNER to medussa_user;

GRANT ALL ON TABLE configuracion.configuraciones TO medussa_user;
-- Index: ix_configuracion_configuraciones_empresa_id

-- DROP INDEX IF EXISTS configuracion.ix_configuracion_configuraciones_empresa_id;

CREATE INDEX IF NOT EXISTS ix_configuracion_configuraciones_empresa_id
    ON configuracion.configuraciones USING btree
    (empresa_id COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: ix_configuracion_configuraciones_id

-- DROP INDEX IF EXISTS configuracion.ix_configuracion_configuraciones_id;

CREATE INDEX IF NOT EXISTS ix_configuracion_configuraciones_id
    ON configuracion.configuraciones USING btree
    (id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
    
-- Table: configuracion.empresa_sector

-- DROP TABLE IF EXISTS configuracion.empresa_sector;

CREATE TABLE IF NOT EXISTS configuracion.empresa_sector
(
    id integer NOT NULL DEFAULT nextval('configuracion.empresa_sector_id_seq'::regclass),
    nombre character varying(100) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT empresa_sector_pkey PRIMARY KEY (id),
    CONSTRAINT empresa_sector_nombre_key UNIQUE (nombre)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS configuracion.empresa_sector
    OWNER to postgres;

GRANT ALL ON TABLE configuracion.empresa_sector TO medussa_user;

GRANT ALL ON TABLE configuracion.empresa_sector TO postgres;

-- Table: configuracion.menus

-- DROP TABLE IF EXISTS configuracion.menus;

CREATE TABLE IF NOT EXISTS configuracion.menus
(
    id integer NOT NULL DEFAULT nextval('configuracion.menus_id_seq'::regclass),
    modulo_id character varying COLLATE pg_catalog."default",
    nombre character varying COLLATE pg_catalog."default" NOT NULL,
    url character varying COLLATE pg_catalog."default" NOT NULL,
    icono character varying COLLATE pg_catalog."default",
    orden integer DEFAULT 0,
    CONSTRAINT menus_pkey PRIMARY KEY (id),
    CONSTRAINT menus_modulo_id_fkey FOREIGN KEY (modulo_id)
        REFERENCES configuracion.modulos (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS configuracion.menus
    OWNER to postgres;

GRANT ALL ON TABLE configuracion.menus TO medussa_user;

GRANT ALL ON TABLE configuracion.menus TO postgres;

-- Table: configuracion.modulos

-- DROP TABLE IF EXISTS configuracion.modulos;

CREATE TABLE IF NOT EXISTS configuracion.modulos
(
    id character varying COLLATE pg_catalog."default" NOT NULL,
    nombre character varying COLLATE pg_catalog."default" NOT NULL,
    icono character varying COLLATE pg_catalog."default",
    orden integer DEFAULT 0,
    estado boolean DEFAULT true,
    CONSTRAINT modulos_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS configuracion.modulos
    OWNER to postgres;

GRANT ALL ON TABLE configuracion.modulos TO medussa_user;

GRANT ALL ON TABLE configuracion.modulos TO postgres;

-- Table: configuracion.parametros_generales

-- DROP TABLE IF EXISTS configuracion.parametros_generales;

CREATE TABLE IF NOT EXISTS configuracion.parametros_generales
(
    id uuid NOT NULL,
    nombre_empresa character varying(150) COLLATE pg_catalog."default" NOT NULL,
    nit character varying(20) COLLATE pg_catalog."default" NOT NULL,
    moneda character varying(10) COLLATE pg_catalog."default" NOT NULL DEFAULT 'COP'::character varying,
    zona_horaria character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'America/Bogota'::character varying,
    formato_fecha character varying(20) COLLATE pg_catalog."default" NOT NULL DEFAULT 'DD/MM/YYYY'::character varying,
    correo_corporativo character varying(100) COLLATE pg_catalog."default",
    estado boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT parametros_generales_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS configuracion.parametros_generales
    OWNER to postgres;

GRANT ALL ON TABLE configuracion.parametros_generales TO medussa_user;

GRANT ALL ON TABLE configuracion.parametros_generales TO postgres;

-- Table: seguridad.auditoria

-- DROP TABLE IF EXISTS seguridad.auditoria;

CREATE TABLE IF NOT EXISTS seguridad.auditoria
(
    id integer NOT NULL DEFAULT nextval('seguridad.auditoria_id_seq'::regclass),
    user_id integer,
    user_name character varying(150) COLLATE pg_catalog."default" NOT NULL,
    empresa_id character varying(50) COLLATE pg_catalog."default" NOT NULL,
    modulo character varying(150) COLLATE pg_catalog."default" NOT NULL,
    accion character varying(150) COLLATE pg_catalog."default" NOT NULL,
    descripcion text COLLATE pg_catalog."default",
    ip_origen character varying(50) COLLATE pg_catalog."default" NOT NULL,
    user_agent character varying(300) COLLATE pg_catalog."default" NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payload_antes jsonb,
    payload_despues jsonb,
    CONSTRAINT auditoria_pkey PRIMARY KEY (id),
    CONSTRAINT auditoria_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES seguridad.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.auditoria
    OWNER to postgres;

GRANT ALL ON TABLE seguridad.auditoria TO medussa_user;

GRANT ALL ON TABLE seguridad.auditoria TO postgres;

-- Table: seguridad.empresas

-- DROP TABLE IF EXISTS seguridad.empresas;

CREATE TABLE IF NOT EXISTS seguridad.empresas
(
    id character varying COLLATE pg_catalog."default" NOT NULL,
    nombre character varying COLLATE pg_catalog."default" NOT NULL,
    nit character varying COLLATE pg_catalog."default",
    estado boolean DEFAULT true,
    CONSTRAINT empresas_pkey PRIMARY KEY (id),
    CONSTRAINT empresas_nit_key UNIQUE (nit)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.empresas
    OWNER to medussa_user;

GRANT ALL ON TABLE seguridad.empresas TO medussa_user;

-- Table: seguridad.perfiles_empresa

-- DROP TABLE IF EXISTS seguridad.perfiles_empresa;

CREATE TABLE IF NOT EXISTS seguridad.perfiles_empresa
(
    id integer NOT NULL DEFAULT nextval('seguridad.perfiles_empresa_id_seq'::regclass),
    nombre character varying(100) COLLATE pg_catalog."default" NOT NULL,
    descripcion character varying(300) COLLATE pg_catalog."default",
    empresa_id character varying COLLATE pg_catalog."default" NOT NULL,
    permisos jsonb NOT NULL,
    estado boolean DEFAULT true,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT perfiles_empresa_pkey PRIMARY KEY (id),
    CONSTRAINT unique_perfil_nombre_empresa UNIQUE (nombre, empresa_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.perfiles_empresa
    OWNER to postgres;

GRANT ALL ON TABLE seguridad.perfiles_empresa TO medussa_user;

GRANT ALL ON TABLE seguridad.perfiles_empresa TO postgres;

-- Table: seguridad.rol_permisos

-- DROP TABLE IF EXISTS seguridad.rol_permisos;

CREATE TABLE IF NOT EXISTS seguridad.rol_permisos
(
    id integer NOT NULL DEFAULT nextval('seguridad.rol_permisos_id_seq'::regclass),
    rol_id integer,
    modulo_id character varying COLLATE pg_catalog."default",
    puede_leer boolean DEFAULT true,
    puede_escribir boolean DEFAULT false,
    CONSTRAINT rol_permisos_pkey PRIMARY KEY (id),
    CONSTRAINT rol_permisos_rol_id_modulo_id_key UNIQUE (rol_id, modulo_id),
    CONSTRAINT rol_permisos_modulo_id_fkey FOREIGN KEY (modulo_id)
        REFERENCES configuracion.modulos (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT rol_permisos_rol_id_fkey FOREIGN KEY (rol_id)
        REFERENCES seguridad.roles (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.rol_permisos
    OWNER to postgres;

GRANT ALL ON TABLE seguridad.rol_permisos TO medussa_user;

GRANT ALL ON TABLE seguridad.rol_permisos TO postgres;

-- Table: seguridad.roles

-- DROP TABLE IF EXISTS seguridad.roles;

CREATE TABLE IF NOT EXISTS seguridad.roles
(
    id integer NOT NULL DEFAULT nextval('seguridad.roles_id_seq'::regclass),
    nombre character varying(50) COLLATE pg_catalog."default" NOT NULL,
    descripcion character varying(200) COLLATE pg_catalog."default",
    empresa_id character varying COLLATE pg_catalog."default" NOT NULL,
    permisos json,
    estado character varying(20) COLLATE pg_catalog."default" DEFAULT 'activo'::character varying,
    fecha_creacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT unique_rol_nombre_por_empresa UNIQUE (nombre, empresa_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.roles
    OWNER to medussa_user;

GRANT ALL ON TABLE seguridad.roles TO medussa_user;

-- Table: seguridad.usuario_empresa_config

-- DROP TABLE IF EXISTS seguridad.usuario_empresa_config;

CREATE TABLE IF NOT EXISTS seguridad.usuario_empresa_config
(
    id integer NOT NULL DEFAULT nextval('seguridad.usuario_empresa_config_id_seq'::regclass),
    usuario_id integer,
    empresa_id character varying(50) COLLATE pg_catalog."default" NOT NULL,
    rol_id integer,
    perfil_id integer,
    CONSTRAINT usuario_empresa_config_pkey PRIMARY KEY (id),
    CONSTRAINT usuario_empresa_config_usuario_id_empresa_id_key UNIQUE (usuario_id, empresa_id),
    CONSTRAINT usuario_empresa_config_rol_id_fkey FOREIGN KEY (rol_id)
        REFERENCES seguridad.roles (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT usuario_empresa_config_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES seguridad.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.usuario_empresa_config
    OWNER to postgres;

GRANT ALL ON TABLE seguridad.usuario_empresa_config TO medussa_user;

GRANT ALL ON TABLE seguridad.usuario_empresa_config TO postgres;

-- Table: seguridad.usuarios

-- DROP TABLE IF EXISTS seguridad.usuarios;

CREATE TABLE IF NOT EXISTS seguridad.usuarios
(
    id integer NOT NULL DEFAULT nextval('seguridad.usuarios_id_seq'::regclass),
    nombre character varying COLLATE pg_catalog."default" NOT NULL,
    email character varying COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying COLLATE pg_catalog."default" NOT NULL,
    rol character varying COLLATE pg_catalog."default",
    estado boolean DEFAULT true,
    username character varying COLLATE pg_catalog."default",
    apellido character varying(100) COLLATE pg_catalog."default",
    cargo character varying(150) COLLATE pg_catalog."default",
    celular character varying(20) COLLATE pg_catalog."default",
    telefono_fijo character varying(20) COLLATE pg_catalog."default",
    foto_url text COLLATE pg_catalog."default",
    CONSTRAINT usuarios_pkey PRIMARY KEY (id),
    CONSTRAINT usuarios_email_key UNIQUE (email),
    CONSTRAINT usuarios_username_key UNIQUE (username)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.usuarios
    OWNER to medussa_user;

GRANT ALL ON TABLE seguridad.usuarios TO medussa_user;

-- Table: seguridad.usuarios_empresas_roles

-- DROP TABLE IF EXISTS seguridad.usuarios_empresas_roles;

CREATE TABLE IF NOT EXISTS seguridad.usuarios_empresas_roles
(
    id integer NOT NULL DEFAULT nextval('seguridad.usuarios_empresas_roles_id_seq'::regclass),
    usuario_id integer,
    empresa_id character varying COLLATE pg_catalog."default" NOT NULL,
    rol_id integer,
    estado character varying COLLATE pg_catalog."default" DEFAULT 'activo'::character varying,
    CONSTRAINT usuarios_empresas_roles_pkey PRIMARY KEY (id),
    CONSTRAINT usuarios_empresas_roles_rol_id_fkey FOREIGN KEY (rol_id)
        REFERENCES seguridad.roles (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT usuarios_empresas_roles_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES seguridad.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS seguridad.usuarios_empresas_roles
    OWNER to medussa_user;

GRANT ALL ON TABLE seguridad.usuarios_empresas_roles TO medussa_user;


