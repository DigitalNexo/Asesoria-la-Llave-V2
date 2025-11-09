-- Insertar configuraciones base para Asesoría La Llave y Gestoría Online

-- Eliminar configuraciones existentes si las hay
DELETE FROM gestoria_budget_configurations WHERE tipo IN ('ASESORIA_LA_LLAVE', 'GESTORIA_ONLINE');

-- CONFIGURACIÓN 1: ASESORÍA LA LLAVE
INSERT INTO gestoria_budget_configurations (
  id,
  tipo,
  activo,
  version,
  fechaVigencia,
  precioBaseFactura,
  precioBaseNomina,
  precioModelo303,
  precioModelo111,
  precioModelo115,
  precioModelo130,
  precioModelo100,
  precioModelo349,
  precioModelo347,
  precioSolicitudCertificados,
  precioCensosAEAT,
  precioRecepcionNotificaciones,
  precioEstadisticasINE,
  precioSolicitudAyudas,
  precioLaboralBase,
  precioLaboralNomina,
  factorTributacionEstimacion,
  factorTributacionDirecta,
  factorPeriodoMensual,
  factorPeriodoTrimestral,
  factorPeriodoAnual,
  rangoFacturacion1Hasta,
  rangoFacturacion1Factor,
  rangoFacturacion2Hasta,
  rangoFacturacion2Factor,
  rangoFacturacion3Factor,
  fechaCreacion,
  fechaModificacion
) VALUES (
  UUID(),
  'ASESORIA_LA_LLAVE',
  1,
  '1.0',
  NOW(),
  2.50,     -- precio base factura
  15.00,    -- precio base nómina
  25.00,    -- modelo 303
  15.00,    -- modelo 111
  20.00,    -- modelo 115
  20.00,    -- modelo 130
  50.00,    -- modelo 100
  30.00,    -- modelo 349
  30.00,    -- modelo 347
  25.00,    -- solicitud certificados
  20.00,    -- censos AEAT
  30.00,    -- recepción notificaciones
  15.00,    -- estadísticas INE
  40.00,    -- solicitud ayudas
  80.00,    -- laboral base
  12.00,    -- laboral por nómina
  1.00,     -- factor tributación estimación
  1.10,     -- factor tributación directa
  1.20,     -- factor periodo mensual
  1.00,     -- factor periodo trimestral
  0.90,     -- factor periodo anual
  30000,    -- rango 1 hasta
  1.00,     -- rango 1 factor
  60000,    -- rango 2 hasta
  1.15,     -- rango 2 factor
  1.30,     -- rango 3 factor
  NOW(),
  NOW()
);

-- CONFIGURACIÓN 2: GESTORÍA ONLINE
INSERT INTO gestoria_budget_configurations (
  id,
  tipo,
  activo,
  version,
  fechaVigencia,
  precioBaseFactura,
  precioBaseNomina,
  precioModelo303,
  precioModelo111,
  precioModelo115,
  precioModelo130,
  precioModelo100,
  precioModelo349,
  precioModelo347,
  precioSolicitudCertificados,
  precioCensosAEAT,
  precioRecepcionNotificaciones,
  precioEstadisticasINE,
  precioSolicitudAyudas,
  precioLaboralBase,
  precioLaboralNomina,
  factorTributacionEstimacion,
  factorTributacionDirecta,
  factorPeriodoMensual,
  factorPeriodoTrimestral,
  factorPeriodoAnual,
  rangoFacturacion1Hasta,
  rangoFacturacion1Factor,
  rangoFacturacion2Hasta,
  rangoFacturacion2Factor,
  rangoFacturacion3Factor,
  fechaCreacion,
  fechaModificacion
) VALUES (
  UUID(),
  'GESTORIA_ONLINE',
  1,
  '1.0',
  NOW(),
  2.00,     -- precio base factura (más económico)
  12.00,    -- precio base nómina (más económico)
  20.00,    -- modelo 303
  12.00,    -- modelo 111
  18.00,    -- modelo 115
  18.00,    -- modelo 130
  45.00,    -- modelo 100
  25.00,    -- modelo 349
  25.00,    -- modelo 347
  20.00,    -- solicitud certificados
  18.00,    -- censos AEAT
  25.00,    -- recepción notificaciones
  12.00,    -- estadísticas INE
  35.00,    -- solicitud ayudas
  70.00,    -- laboral base
  10.00,    -- laboral por nómina
  1.00,     -- factor tributación estimación
  1.10,     -- factor tributación directa
  1.20,     -- factor periodo mensual
  1.00,     -- factor periodo trimestral
  0.90,     -- factor periodo anual
  30000,    -- rango 1 hasta
  1.00,     -- rango 1 factor
  60000,    -- rango 2 hasta
  1.15,     -- rango 2 factor
  1.30,     -- rango 3 factor
  NOW(),
  NOW()
);

-- Verificar inserción
SELECT 
  id,
  tipo,
  activo,
  version,
  precioBaseFactura,
  precioModelo303,
  fechaCreacion
FROM gestoria_budget_configurations
ORDER BY tipo;
