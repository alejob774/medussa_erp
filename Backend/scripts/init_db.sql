-- =============================================
-- 1. EXTENSIONES Y LIMPIEZA
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP SCHEMA IF EXISTS seguridad CASCADE;
DROP SCHEMA IF EXISTS configuracion CASCADE;
DROP SCHEMA IF EXISTS inventario CASCADE;

-- =============================================
-- 2. CREACIÓN DE ESQUEMAS
-- =============================================
CREATE SCHEMA seguridad;
CREATE SCHEMA configuracion;
CREATE SCHEMA inventario;

-- =============================================
-- 3. ESQUEMA: SEGURIDAD (Usuarios y Roles)
-- =============================================
CREATE TABLE seguridad.roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE seguridad.usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20), -- Alias de rol para lógica rápida
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Intermedia HU-002: Vínculo Empresa-Usuario-Rol
CREATE TABLE seguridad.usuario_empresa_rol (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES seguridad.usuarios(id) ON DELETE CASCADE,
    empresa_id VARCHAR(50) NOT NULL, -- ID de empresa (ej: EMP-001)
    rol_id INTEGER REFERENCES seguridad.roles(id),
    UNIQUE(usuario_id, empresa_id)
);

-- =============================================
-- 4. ESQUEMA: CONFIGURACIÓN (Módulos y Menús)
-- =============================================
CREATE TABLE configuracion.modulos (
    id VARCHAR(50) PRIMARY KEY, -- Ej: 'MOD-INV'
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0,
    estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE configuracion.menus (
    id SERIAL PRIMARY KEY,
    modulo_id VARCHAR(50) REFERENCES configuracion.modulos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    icono VARCHAR(50),
    orden INTEGER DEFAULT 0
);

-- Permisos por Rol (HU-003)
CREATE TABLE seguridad.rol_permisos (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER REFERENCES seguridad.roles(id) ON DELETE CASCADE,
    modulo_id VARCHAR(50) REFERENCES configuracion.modulos(id) ON DELETE CASCADE,
    puede_leer BOOLEAN DEFAULT TRUE,
    puede_escribir BOOLEAN DEFAULT FALSE,
    UNIQUE(rol_id, modulo_id)
);

-- =============================================
-- 5. ESQUEMA: INVENTARIO (HU-004)
-- =============================================
CREATE TABLE inventario.categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    empresa_id VARCHAR(50) NOT NULL
);

CREATE TABLE inventario.productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(100),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    categoria_id INTEGER REFERENCES inventario.categorias(id),
    empresa_id VARCHAR(50) NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Esquema de auditoría (opcionalmente separado para rendimiento)
CREATE TABLE IF NOT EXISTS seguridad.auditoria (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES seguridad.usuarios(id),
    user_name VARCHAR(150) NOT NULL,
    empresa_id VARCHAR(50) NOT NULL, -- Soporte multiempresa
    modulo VARCHAR(150) NOT NULL,
    accion VARCHAR(150) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN
    descripcion TEXT,
    ip_origen VARCHAR(50) NOT NULL,
    user_agent VARCHAR(300) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload_antes JSONB, -- JSONB es más eficiente en PostgreSQL
    payload_despues JSONB
);

-- Permisos para el usuario de la App
GRANT ALL PRIVILEGES ON seguridad.auditoria TO medussa_user;
GRANT USAGE, SELECT ON SEQUENCE seguridad.auditoria_id_seq TO medussa_user;

-- =============================================
-- 6. DATOS INICIALES (SEMILLAS)
-- =============================================

-- Roles básicos
INSERT INTO seguridad.roles (id, nombre, descripcion) VALUES 
(1, 'admin', 'Administrador total del sistema'),
(2, 'operador', 'Personal de almacén y ventas');

-- Configuración de Menú para el Administrador
INSERT INTO configuracion.modulos (id, nombre, icono, orden) VALUES 
('MOD-INV', 'Inventario', 'box', 1),
('MOD-SEG', 'Seguridad', 'shield', 2);

INSERT INTO configuracion.menus (modulo_id, nombre, url, icono, orden) VALUES 
('MOD-INV', 'Productos', '/inventario/productos', 'list', 1),
('MOD-INV', 'Categorías', '/inventario/categorias', 'tag', 2),
('MOD-SEG', 'Usuarios', '/seguridad/usuarios', 'users', 1);

-- Permisos para el Rol Admin (ID: 1)
INSERT INTO seguridad.rol_permisos (rol_id, modulo_id, puede_leer, puede_escribir) VALUES 
(1, 'MOD-INV', true, true),
(1, 'MOD-SEG', true, true);

-- =============================================
-- 7. GESTIÓN DE PERMISOS (PARA MEDUSSA_USER)
-- =============================================
-- Reasignar dueños para evitar InsufficientPrivilege
ALTER SCHEMA seguridad OWNER TO medussa_user;
ALTER SCHEMA configuracion OWNER TO medussa_user;
ALTER SCHEMA inventario OWNER TO medussa_user;

GRANT USAGE ON SCHEMA seguridad TO medussa_user;
GRANT USAGE ON SCHEMA configuracion TO medussa_user;
GRANT USAGE ON SCHEMA inventario TO medussa_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA seguridad TO medussa_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA configuracion TO medussa_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA inventario TO medussa_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA seguridad TO medussa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA configuracion TO medussa_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA inventario TO medussa_user;

-- Permisos por defecto para el futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA seguridad GRANT ALL ON TABLES TO medussa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA configuracion GRANT ALL ON TABLES TO medussa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA inventario GRANT ALL ON TABLES TO medussa_user;