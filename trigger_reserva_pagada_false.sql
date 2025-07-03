-- Trigger para cambiar el estado de la reserva a 'pendiente' cuando pagada cambie a false
-- Este trigger se ejecuta cuando se actualiza una reserva y detecta el cambio en el campo pagada

-- Función que será ejecutada por el trigger
CREATE OR REPLACE FUNCTION actualizar_estado_reserva_no_pagada()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el campo 'pagada' cambió de true a false
    IF OLD.pagada = true AND NEW.pagada = false THEN
        -- Cambiar el estado a 'pendiente'
        NEW.estado = 'pendiente';
        
        -- Log opcional para debugging
        RAISE NOTICE 'Reserva % cambió de pagada=true a pagada=false. Estado actualizado a pendiente.', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger que se ejecuta ANTES de cada UPDATE en la tabla reservas
DROP TRIGGER IF EXISTS trigger_reserva_pagada_false ON reservas;

CREATE TRIGGER trigger_reserva_pagada_false
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estado_reserva_no_pagada();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_reserva_pagada_false';

-- Comentarios sobre el funcionamiento:
-- 1. El trigger se ejecuta ANTES de cada UPDATE en la tabla reservas
-- 2. Solo actúa cuando 'pagada' cambia de true a false
-- 3. Automáticamente establece el estado como 'pendiente'
-- 4. Permite que otros campos se actualicen normalmente
-- 5. El trigger no interfiere con otros cambios de estado manuales