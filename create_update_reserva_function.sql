-- Función RPC para actualizar el campo 'pagada' de una reserva
-- Esta función evita las políticas RLS y permite la actualización directa

-- Crear la función RPC
CREATE OR REPLACE FUNCTION update_reserva_pagada(
  reserva_id UUID,
  nueva_pagada BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del propietario de la función
AS $$
DECLARE
  result JSON;
  affected_rows INTEGER;
BEGIN
  -- Actualizar la reserva
  UPDATE reservas 
  SET 
    pagada = nueva_pagada,
    updated_at = NOW()
  WHERE id = reserva_id;
  
  -- Obtener el número de filas afectadas
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Verificar si se actualizó alguna fila
  IF affected_rows = 0 THEN
    result := json_build_object(
      'success', false,
      'message', 'No se encontró la reserva con el ID especificado',
      'reserva_id', reserva_id,
      'affected_rows', affected_rows
    );
  ELSE
    result := json_build_object(
      'success', true,
      'message', 'Reserva actualizada correctamente',
      'reserva_id', reserva_id,
      'nueva_pagada', nueva_pagada,
      'affected_rows', affected_rows
    );
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', 'Error al actualizar la reserva: ' || SQLERRM,
      'reserva_id', reserva_id,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION update_reserva_pagada(UUID, BOOLEAN) TO authenticated;

-- Comentarios para documentación
COMMENT ON FUNCTION update_reserva_pagada(UUID, BOOLEAN) IS 
'Función RPC para actualizar el campo pagada de una reserva, evitando restricciones RLS';

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_reserva_pagada';

-- Ejemplo de uso (comentado)
/*
SELECT update_reserva_pagada(
  'tu-reserva-id-aqui'::UUID,
  false
);
*/