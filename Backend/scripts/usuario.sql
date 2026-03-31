-- 1. Crear el usuario con su contraseña
-- Cambia 'tu_password_seguro' por el que tengas en tu archivo .env
CREATE ROLE medussa_user WITH LOGIN PASSWORD '0';

-- 2. Darle permisos para crear bases de datos (opcional, pero útil para desarrollo)
ALTER ROLE medussa_user CREATEDB;

-- 3. Asegurarse de que pueda conectarse a la base de datos actual
GRANT CONNECT ON DATABASE medussa_erp TO medussa_user;