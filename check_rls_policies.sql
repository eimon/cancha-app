-- Script para verificar y configurar políticas RLS para la tabla ventas
-- Este script ayuda a diagnosticar por qué las ventas no se eliminan

-- 1. Verificar si RLS está habilitado en la tabla ventas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'ventas';

-- 2. Verificar políticas existentes en la tabla ventas
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
WHERE tablename = 'ventas';

-- 3. Verificar políticas en tablas relacionadas
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
WHERE tablename IN ('items_venta', 'pagos_venta', 'reservas');

-- 4. Si necesitas crear políticas RLS para permitir eliminación de ventas
-- (Ejecutar solo si es necesario después de revisar los resultados anteriores)

/*
-- Política para permitir eliminación de ventas a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar ventas"
ON ventas
FOR DELETE
TO authenticated
USING (true);

-- Política para permitir eliminación de items_venta a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar items_venta"
ON items_venta
FOR DELETE
TO authenticated
USING (true);

-- Política para permitir eliminación de pagos_venta a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar pagos_venta"
ON pagos_venta
FOR DELETE
TO authenticated
USING (true);

-- Política para permitir actualización de reservas (para SET NULL)
CREATE POLICY "Usuarios autenticados pueden actualizar reservas"
ON reservas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- 5. Verificar el rol actual del usuario
SELECT current_user, current_setting('role');

-- 6. Verificar si hay triggers que puedan interferir
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('ventas', 'items_venta', 'pagos_venta', 'reservas');