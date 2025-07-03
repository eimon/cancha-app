-- Función RPC para obtener los display_names de usuarios
-- Esta función permite acceder a los datos de auth.users desde el cliente

CREATE OR REPLACE FUNCTION get_user_display_names(user_ids UUID[])
RETURNS TABLE(
  user_id UUID,
  display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    COALESCE(
      au.raw_user_meta_data->>'display_name',
      au.raw_user_meta_data->>'full_name',
      au.email
    ) as display_name
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_user_display_names(UUID[]) TO authenticated;

-- Comentario para documentación
COMMENT ON FUNCTION get_user_display_names(UUID[]) IS 
'Función RPC para obtener los display_names de usuarios por sus IDs';

-- Verificar que la función se creó correctamente
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'get_user_display_names';