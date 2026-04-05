-- Borrar y recrear la base de datos
DROP DATABASE IF EXISTS medussa_erp;
CREATE DATABASE medussa_erp;

-- Crear usuario y asignar permisos
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'medussa_user') THEN
        CREATE ROLE medussa_user WITH LOGIN PASSWORD 'secure_password';
    END IF;
END $$;

ALTER DATABASE medussa_erp OWNER TO medussa_user;

-- Conectar a medussa_erp y crear esquemas
CREATE SCHEMA IF NOT EXISTS configuracion;
CREATE SCHEMA IF NOT EXISTS seguridad;
CREATE SCHEMA IF NOT EXISTS auditoria;

GRANT ALL PRIVILEGES ON SCHEMA configuracion, seguridad, auditoria TO medussa_user;