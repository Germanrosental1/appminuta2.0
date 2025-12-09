-- Desactivar temporalmente RLS para la tabla profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Crear una política que permita acceso público a la tabla profiles
CREATE POLICY "Acceso público temporal a profiles" 
  ON public.profiles FOR ALL 
  USING (true);
