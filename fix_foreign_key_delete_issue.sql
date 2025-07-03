-- Script para solucionar el problema de eliminación de reservas
-- El problema es que hay dos restricciones de clave foránea conflictivas:
-- 1. fk_ventas_reserva con DELETE NO ACTION (impide eliminación)
-- 2. ventas_reserva_id_fkey con DELETE CASCADE (permite eliminación)

-- Verificar las restricciones actuales
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
    AND tc.table_name = 'ventas'
    AND kcu.column_name = 'reserva_id';

-- Eliminar la restricción problemática que impide la eliminación
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS fk_ventas_reserva;

-- Verificar que solo quede la restricción con CASCADE
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
    AND tc.table_name = 'ventas'
    AND kcu.column_name = 'reserva_id';

-- Ahora también necesitamos asegurar que existe la política RLS para DELETE
-- Verificar políticas existentes
SELECT 
    policyname, 
    cmd, 
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'reservas' AND cmd = 'DELETE';

-- Crear política de DELETE si no existe
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar reservas" ON reservas;

CREATE POLICY "Usuarios autenticados pueden eliminar reservas"
ON reservas
FOR DELETE
TO authenticated
USING (true);

-- Verificar que la política se creó
SELECT 
    policyname, 
    cmd, 
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'reservas' AND cmd = 'DELETE';

-- Probar eliminación de una reserva sin ventas asociadas
-- (Reemplazar 'test-id' con un ID real de una reserva sin ventas)
-- DELETE FROM reservas 
-- WHERE id = 'test-id' 
--   AND NOT EXISTS (SELECT 1 FROM ventas WHERE reserva_id = 'test-id');

-- Verificar que la eliminación funcionó
-- SELECT COUNT(*) as reservas_restantes FROM reservas WHERE id = 'test-id';