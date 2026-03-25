-- Tabla de sesiones de entrevista
CREATE TABLE sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa text NOT NULL,
  giro text NOT NULL,
  monto text,
  bien text,
  contacto text,
  contexto text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_curso', 'completada')),
  correo_ejecutivo text NOT NULL,
  resumen text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Tabla de mensajes del chat
CREATE TABLE mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id uuid NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  orden integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_mensajes_sesion ON mensajes(sesion_id, orden ASC);
CREATE INDEX idx_sesiones_status ON sesiones(status);
CREATE INDEX idx_sesiones_created ON sesiones(created_at DESC);

-- RLS desactivado para uso interno (activar si se necesita auth)
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para uso con service_role key
CREATE POLICY "Allow all for service role" ON sesiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON mensajes FOR ALL USING (true) WITH CHECK (true);
