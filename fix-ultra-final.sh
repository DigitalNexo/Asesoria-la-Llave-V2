#!/bin/bash

# Arreglar los últimos errores en prisma-storage.ts

FILE="server/prisma-storage.ts"

echo "�� Arreglando los últimos errores en $FILE..."

# 1. filing?.period → filing?.fiscal_periods (2 occurrences)
perl -i -pe 's/filing\?\.period\?\.ends_at/filing?.fiscal_periods?.ends_at/g' "$FILE"
perl -i -pe 's/filing\?\.period\)/filing?.fiscal_periods)/g' "$FILE"

# 2. client.usersAsignado → client.responsableAsignado  
perl -i -pe 's/client\.usersAsignado/client.responsableAsignado/g' "$FILE"

# 3. user.role → user.roles (2 occurrences)
perl -i -pe 's/user\?\.role(?!s|Id|_)/user?.roles/g' "$FILE"
perl -i -pe 's/user\.roles\.permissions/user.roles.role_permissions/g' "$FILE"
perl -i -pe 's/rp\.permission(?!s|Id)/rp.permissions/g' "$FILE"

# 4. tx.sMTPAccount → tx.smtp_accounts
perl -i -pe 's/tx\.sMTPAccount/tx.smtp_accounts/g' "$FILE"

# 5. contenidoHtml en updates de Prisma debe ser contenido_html
perl -i -pe 's/contenidoHtml: version\.contenidoHtml/contenido_html: version.contenido_html/g' "$FILE"

# 6. uploadedBy → uploaded_by en Prisma create
perl -i -pe 's/uploadedBy: insertAttachment\.uploadedBy/uploaded_by: insertAttachment.uploadedBy/g' "$FILE"

echo "✅ Arreglos aplicados"
