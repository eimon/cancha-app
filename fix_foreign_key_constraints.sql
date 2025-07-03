-- Script SQL para modificar las restricciones de clave foránea
-- entre las tablas ventas y reservas

-- 1. Primero eliminamos la restricción existente
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_venta_id_fkey;

-- 2. Recreamos la restricción con el comportamiento deseado:
-- - SET NULL cuando se elimina una venta (la reserva queda sin venta asociada)
-- - No afecta cuando se elimina una reserva (la venta puede existir independientemente)
ALTER TABLE reservas 
ADD CONSTRAINT reservas_venta_id_fkey 
FOREIGN KEY (venta_id) 
REFERENCES ventas(id) 
ON DELETE SET NULL;

-- 3. Para el comportamiento inverso (eliminar venta cuando se elimina reserva),
-- necesitamos una restricción en la tabla ventas hacia reservas
-- Primero verificamos si existe y la eliminamos
ALTER TABLE ventas 
DROP CONSTRAINT IF EXISTS ventas_reserva_id_fkey;

-- 4. Recreamos la restricción con CASCADE para eliminar venta cuando se elimina reserva
ALTER TABLE ventas 
ADD CONSTRAINT ventas_reserva_id_fkey 
FOREIGN KEY (reserva_id) 
REFERENCES reservas(id) 
ON DELETE CASCADE;

-- Comentarios sobre el comportamiento resultante:
-- - Si eliminas una VENTA: la reserva asociada queda con venta_id = NULL
-- - Si eliminas una RESERVA: la venta asociada se elimina automáticamente
-- - Esto permite mayor flexibilidad en la gestión de datos

-- Para verificar las restricciones creadas, puedes ejecutar:
-- SELECT conname, confrelid::regclass, conrelid::regclass, confdeltype 
-- FROM pg_constraint 
-- WHERE conname IN ('reservas_venta_id_fkey', 'ventas_reserva_id_fkey');