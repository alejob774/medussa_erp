-- Extensiones de seguridad y rendimiento [cite: 33, 34]
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Esquemas recomendados para evitar el caos [cite: 24, 32]
CREATE SCHEMA IF NOT EXISTS seguridad;
CREATE SCHEMA IF NOT EXISTS maestros;
CREATE SCHEMA IF NOT EXISTS compras;
CREATE SCHEMA IF NOT EXISTS inventarios;
CREATE SCHEMA IF NOT EXISTS produccion;
CREATE SCHEMA IF NOT EXISTS comercial;
CREATE SCHEMA IF NOT EXISTS finanzas;
CREATE SCHEMA IF NOT EXISTS auditoria; -- Para trazabilidad de cumplimiento

-- Configuración de zona horaria local [cite: 41, 42]
SET timezone = 'America/Bogota';

-- Tabla de Auditoría (Trazabilidad Obligatoria)
CREATE TABLE auditoria.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID,
    accion VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN
    modulo VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    id_entidad UUID,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    dispositivo TEXT,
    data_previa JSONB, -- Estado anterior del registro
    data_nueva JSONB   -- Estado posterior al cambio
);

-- Tabla para HU-001: Parámetros Generales
CREATE TABLE IF NOT EXISTS configuracion.parametros_generales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa VARCHAR(150) NOT NULL,
    nit VARCHAR(20) NOT NULL,
    moneda VARCHAR(10) NOT NULL DEFAULT 'COP',
    zona_horaria VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    formato_fecha VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    correo_corporativo VARCHAR(100),
    -- Campos de Auditoría Obligatorios
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);