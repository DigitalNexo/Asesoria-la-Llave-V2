-- Insertar configuraciones base para Asesoría La Llave y Gestoría Online

-- Eliminar configuraciones existentes si las hay
DELETE FROM gestoria_budget_configurations WHERE tipo IN ('ASESORIA_LA_LLAVE', 'GESTORIA_ONLINE');

-- CONFIGURACIÓN 1: ASESORÍA LA LLAVE
INSERT INTO gestoria_budget_configurations (
  id,
  tipo,
  nombre,
  activo,
  precioBasePorFactura,
  precioBasePorNomina,
  porcentajeRegimenGeneral,
  porcentajeModulos,
  porcentajeEDN,
  recargoPeriodoMensual,
  minimoMensual,
  precioModelo303,
  precioModelo111,
  precioModelo115,
  precioModelo130,
  precioModelo100,
  precioModelo349,
  precioModelo347,
  precioCertificados,
  precioCensos,
  precioNotificaciones,
  precioEstadisticas,
  precioAyudas,
  nombreEmpresa,
  nifEmpresa,
  direccionEmpresa,
  telefonoEmpresa,
  emailEmpresa,
  logoPath,
  creadoPor,
  fechaCreacion,
  fechaModificacion
) VALUES (
  UUID(),
  'ASESORIA_LA_LLAVE',
  'Configuración Asesoría La Llave - Oficial',
  1,
  2.50,     -- precio base por factura
  15.00,    -- precio base por nómina
  0.00,     -- porcentaje régimen general
  -10.00,   -- porcentaje módulos (descuento)
  10.00,    -- porcentaje EDN (incremento)
  20.00,    -- recargo periodo mensual
  50.00,    -- mínimo mensual
  25.00,    -- modelo 303
  15.00,    -- modelo 111
  20.00,    -- modelo 115
  20.00,    -- modelo 130
  50.00,    -- modelo 100
  30.00,    -- modelo 349
  30.00,    -- modelo 347
  25.00,    -- certificados
  20.00,    -- censos
  30.00,    -- notificaciones
  15.00,    -- estadísticas
  40.00,    -- ayudas
  'Asesoría La Llave',
  'B12345678',
  'Calle Principal, 123, Madrid',
  '915 XXX XXX',
  'info@asesorialallav.es',
  NULL,
  'admin',
  NOW(),
  NOW()
);

-- CONFIGURACIÓN 2: GESTORÍA ONLINE
INSERT INTO gestoria_budget_configurations (
  id,
  tipo,
  nombre,
  activo,
  precioBasePorFactura,
  precioBasePorNomina,
  porcentajeRegimenGeneral,
  porcentajeModulos,
  porcentajeEDN,
  recargoPeriodoMensual,
  minimoMensual,
  precioModelo303,
  precioModelo111,
  precioModelo115,
  precioModelo130,
  precioModelo100,
  precioModelo349,
  precioModelo347,
  precioCertificados,
  precioCensos,
  precioNotificaciones,
  precioEstadisticas,
  precioAyudas,
  nombreEmpresa,
  nifEmpresa,
  direccionEmpresa,
  telefonoEmpresa,
  emailEmpresa,
  logoPath,
  creadoPor,
  fechaCreacion,
  fechaModificacion
) VALUES (
  UUID(),
  'GESTORIA_ONLINE',
  'Configuración Gestoría Online - Digital',
  1,
  2.00,     -- precio base por factura (más económico)
  12.00,    -- precio base por nómina (más económico)
  0.00,     -- porcentaje régimen general
  -10.00,   -- porcentaje módulos (descuento)
  10.00,    -- porcentaje EDN (incremento)
  20.00,    -- recargo periodo mensual
  45.00,    -- mínimo mensual (más económico)
  20.00,    -- modelo 303
  12.00,    -- modelo 111
  18.00,    -- modelo 115
  18.00,    -- modelo 130
  45.00,    -- modelo 100
  25.00,    -- modelo 349
  25.00,    -- modelo 347
  20.00,    -- certificados
  18.00,    -- censos
  25.00,    -- notificaciones
  12.00,    -- estadísticas
  35.00,    -- ayudas
  'Gestoría Online',
  'B87654321',
  'Online - Servicio 100% Digital',
  '900 XXX XXX',
  'contacto@gestoriaonline.es',
  NULL,
  'admin',
  NOW(),
  NOW()
);

-- Verificar inserción
SELECT 
  id,
  tipo,
  nombre,
  activo,
  precioBasePorFactura,
  precioModelo303,
  minimoMensual
FROM gestoria_budget_configurations
ORDER BY tipo;
