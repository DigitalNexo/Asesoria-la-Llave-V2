#!/bin/bash
# SCRIPT RÁPIDO - SOLO GENERAR OBLIGACIONES Y REINICIAR

cd /root/www/Asesoria-la-Llave-V2

echo "🚀 GENERANDO OBLIGACIONES Y REINICIANDO..."

# Generar obligaciones
mysql -u app_area -p'masjic-natjew-9wyvBe' area_privada << 'EOF'
INSERT INTO client_tax_obligations (id, client_id, tax_calendar_id, model_number, period, year, due_date, status, created_at, updated_at)
SELECT 
    UUID() as id,
    ctm.client_id,
    tc.id as tax_calendar_id,
    tc.modelCode as model_number,
    tc.period,
    tc.year,
    tc.endDate as due_date,
    'PENDING' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM client_tax_models ctm
INNER JOIN clients c ON c.id = ctm.client_id
INNER JOIN tax_calendar tc ON tc.modelCode = ctm.model_number
WHERE ctm.is_active = 1
  AND (ctm.end_date IS NULL OR ctm.end_date >= CURDATE())
  AND CURDATE() BETWEEN tc.startDate AND tc.endDate
  AND tc.active = 1
  AND NOT EXISTS (
      SELECT 1 FROM client_tax_obligations cto2
      WHERE cto2.client_id = ctm.client_id
        AND cto2.tax_calendar_id = tc.id
  );

SELECT COUNT(*) as 'Obligaciones Creadas' FROM client_tax_obligations WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE);
EOF

# Reiniciar servicio
sudo systemctl restart asesoria-llave.service

echo ""
echo "✅ HECHO! Recarga la página de Control de Impuestos"
