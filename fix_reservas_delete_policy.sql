-- Script para verificar y configurar políticas RLS para permitir eliminación de reservas
-- Este script ayuda a solucionar el problema de eliminación de reservas

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
WHERE tablename = 'reservas' AND cmd = 'DELETE';

-- 3. Crear política para permitir eliminación de reservas a usuarios autenticados
-- (Solo si no existe una política de DELETE)
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar reservas" ON reservas;

CREATE POLICY "Usuarios autenticados pueden eliminar reservas"
ON reservas
FOR DELETE
TO authenticated
USING (true);

-- 4. Verificar que la política se creó correctamente
SELECT 
    policyname, 
    cmd, 
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'reservas' AND cmd = 'DELETE';

-- 5. Verificar el usuario actual y sus permisos
SELECT 
    current_user, 
    current_setting('role'),
    session_user;

-- 6. Verificar permisos de tabla
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'reservas' AND privilege_type = 'DELETE';

-- 7. Si el problema persiste, verificar restricciones de clave foránea
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'reservas';

-- 8. Probar eliminación de una reserva específica (reemplazar 'test-id' con un ID real)
-- DELETE FROM reservas WHERE id = 'test-id' AND NOT EXISTS (
--     SELECT 1 FROM ventas WHERE reserva_id = 'test-id'
-- );