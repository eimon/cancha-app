-- Script para verificar y configurar políticas RLS para la tabla reservas
-- Este script ayuda a diagnosticar por qué el campo 'pagado' no se actualiza

-- 1. Verificar si RLS está habilitado en la tabla reservas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'reservas';

-- 2. Verificar políticas existentes en la tabla reservas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reservas';

-- 3. Verificar permisos de la tabla reservas
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'reservas';

-- 4. Verificar el rol actual del usuario
SELECT current_user, current_setting('role');

-- 5. Verificar si hay triggers en la tabla reservas
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'reservas';

-- 6. Probar una actualización simple del campo pagado
-- (Comentado para evitar ejecución accidental)
/*
UPDATE reservas 
SET pagada = false 
WHERE id = 'test-id';
*/

-- 7. Si necesitas crear/actualizar políticas RLS para permitir actualización de reservas
-- (Ejecutar solo si es necesario después de revisar los resultados anteriores)

/*
-- Deshabilitar RLS temporalmente para pruebas (solo para superusuarios)
ALTER TABLE reservas DISABLE ROW LEVEL SECURITY;

-- O crear/actualizar política para permitir actualización de reservas
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar reservas" ON reservas;

CREATE POLICY "Usuarios autenticados pueden actualizar reservas"
ON reservas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Asegurar que RLS esté habilitado
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Verificar que la política se creó correctamente
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'reservas';
*/