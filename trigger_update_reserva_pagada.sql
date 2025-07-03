-- Trigger para actualizar el campo 'pagada' de una reserva cuando se elimina una venta asociada

-- Función que se ejecutará cuando se elimine una venta
CREATE OR REPLACE FUNCTION update_reserva_pagada_on_venta_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la venta eliminada tenía una reserva asociada
  IF OLD.reserva_id IS NOT NULL THEN
    -- Actualizar el campo 'pagada' de la reserva a FALSE
    UPDATE reservas 
    SET pagada = FALSE,
        updated_at = NOW()
    WHERE id = OLD.reserva_id;
    
    -- Log para debugging (opcional)
    RAISE NOTICE 'Reserva % marcada como no pagada debido a eliminación de venta %', OLD.reserva_id, OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger que se ejecuta DESPUÉS de eliminar una venta
DROP TRIGGER IF EXISTS trigger_update_reserva_on_venta_delete ON ventas;

CREATE TRIGGER trigger_update_reserva_on_venta_delete
  AFTER DELETE ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION update_reserva_pagada_on_venta_delete();

-- Comentarios:
-- Este trigger se ejecuta automáticamente cada vez que se elimina una fila de la tabla 'ventas'
-- Si la venta eliminada tenía una reserva_id asociada, marca esa reserva como no pagada (pagada = FALSE)
-- También actualiza el campo updated_at de la reserva para mantener el registro de cuándo se modificó