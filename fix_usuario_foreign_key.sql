-- Script para crear la relación de clave foránea entre reservas y usuarios
-- El problema es que no existe una relación entre la tabla reservas y la tabla auth.users

-- 1. Verificar la estructura actual de la tabla reservas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reservas' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar si existe la tabla usuarios en el esquema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'usuarios';

-- 3. Verificar las restricciones de clave foránea existentes en reservas
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'reservas';

-- 4. Crear tabla usuarios si no existe (para almacenar perfiles de usuario)
CREATE TABLE IF NOT EXISTS public.usuarios (
    uid UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS en la tabla usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para la tabla usuarios
CREATE POLICY "Usuarios pueden ver todos los perfiles" ON public.usuarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.usuarios
    FOR UPDATE TO authenticated USING (auth.uid() = uid);

CREATE POLICY "Usuarios pueden insertar su propio perfil" ON public.usuarios
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = uid);

-- 7. Crear función para manejar nuevos usuarios automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (uid, display_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Ahora crear la relación de clave foránea entre reservas y usuarios
ALTER TABLE public.reservas 
DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey;

ALTER TABLE public.reservas 
ADD CONSTRAINT reservas_usuario_id_fkey 
FOREIGN KEY (usuario_id) 
REFERENCES public.usuarios(uid) 
ON DELETE CASCADE;

-- 10. Migrar datos existentes de auth.users a la tabla usuarios
INSERT INTO public.usuarios (uid, display_name, phone)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.raw_user_meta_data->>'full_name', au.email),
    au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.uid = au.id
);

-- 11. Verificar que la relación se creó correctamente
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'reservas'
    AND kcu.column_name = 'usuario_id';

-- 12. Verificar que los datos se pueden consultar correctamente
SELECT 
    r.id,
    r.responsable,
    u.display_name,
    u.phone
FROM reservas r
LEFT JOIN usuarios u ON r.usuario_id = u.uid
LIMIT 5;