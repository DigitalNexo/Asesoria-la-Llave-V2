#!/bin/bash
cd /root/www/Asesoria-la-Llave-V2
mysql -u app_area -p'masjic-natjew-9wyvBe' area_privada << 'EOF'
INSERT INTO client_tax_obligations (id, client_id, tax_calendar_id, model_number, period, year, due_date, status, created_at, updated_at)
SELECT UUID(), ctm.client_id, tc.id, tc.modelCode, tc.period, tc.year, tc.endDate, 'PENDING', NOW(), NOW()
FROM client_tax_models ctm
JOIN clients c ON c.id = ctm.client_id
JOIN tax_calendar tc ON tc.modelCode = ctm.model_number
WHERE ctm.is_active = 1 AND (ctm.end_date IS NULL OR ctm.end_date >= CURDATE())
  AND CURDATE() BETWEEN tc.startDate AND tc.endDate AND tc.active = 1
  AND NOT EXISTS (SELECT 1 FROM client_tax_obligations cto2 WHERE cto2.client_id = ctm.client_id AND cto2.tax_calendar_id = tc.id);
EOF
sudo systemctl restart asesoria-llave.service
echo "✅ HECHO - Recarga la página"
