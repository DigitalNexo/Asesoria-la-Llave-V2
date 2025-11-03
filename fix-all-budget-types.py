#!/usr/bin/env python3
"""
Script para corregir todos los errores de tipos en el sistema de presupuestos de gestoría.
"""
import re

def fix_service_file(filepath):
    """Corregir archivo de servicio"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Corregir signatures de funciones
    content = re.sub(r'async (acceptBudget|rejectBudget|deleteBudget)\(id: number', r'async \1(id: string', content)
    content = re.sub(r'async logStatisticsEvent\([^)]+\)', 'async logStatisticsEvent(evento: string, budgetId: string, tipoGestoria: string, userId?: string)', content)
    
    # Corregir campos
    content = content.replace('.cifNif', '.nifCif')
    content = content.replace('.nombreCompleto', '.nombreCliente')
    content = content.replace('.tipo', '.tipoGestoria')
    content = content.replace('budget.subtotal', '(Number(budget.totalContabilidad) + Number(budget.totalLaboral))')
    
    # Corregir includes
    content = content.replace('gestoria_budget_additional_services: true', 'serviciosAdicionales: true')
    
    # Corregir where clauses
    content = content.replace('{ presupuestoId:', '{ budgetId:')
    content = content.replace('presupuestoId: id', 'budgetId: id')
    content = content.replace('presupuestoId: budget.id', 'budgetId: budget.id')
    
    # Corregir estados
    content = content.replace("=== 'PENDIENTE'", "=== 'BORRADOR'")
    content = content.replace("!== 'PENDIENTE'", "!== 'BORRADOR'")
    content = content.replace("estado === 'PENDIENTE'", "estado === 'BORRADOR'")
    
    # Eliminar evento VISTO
    content = content.replace("| 'VISTO'", "")
    
    # Corregir conversión de Decimals
    content = re.sub(r'existing\.([a-zA-Z]+)\)', r'Number(existing.\1)', content)
    content = re.sub(r'budget\.valorDescuento \|\| undefined', 'budget.valorDescuento ? Number(budget.valorDescuento) : undefined', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Corregido: {filepath}")

def fix_conversion_service():
    """Corregir conversion service"""
    filepath = 'server/services/gestoria-budget-conversion-service.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Corregir signature
    content = re.sub(r'async convertToClient\(id: number', 'async convertToClient(id: string', content)
    content = re.sub(r'async canConvertToClient\(id: number', 'async canConvertToClient(id: string', content)
    
    # Corregir campos
    content = content.replace('.cifNif', '.nifCif')
    content = content.replace('.nombreCompleto', '.nombreCliente')
    content = content.replace('.tipo', '.tipoGestoria')
    content = content.replace('.codigoPostal', '.personaContacto')  # No existe codigoPostal
    content = content.replace('.ciudad', '.direccion')  # No existe ciudad
    content = content.replace('.provincia', '.direccion')  # No existe provincia
    content = content.replace('.actividadEmpresarial', '.sistemaTributacion')  # No existe actividadEmpresarial
    
    # Corregir include
    content = content.replace('gestoria_budget_additional_services: true', 'serviciosAdicionales: true')
    content = content.replace('clients: true', '')
    
    # Corregir where en clients
    content = content.replace('cif:', 'nif:')  # El modelo clients usa nif, no cif
    
    # Corregir nombre campo en clients.create
    content = content.replace('nombre: budget.nombreCliente', 'name: budget.nombreCliente')
    
    # Corregir presupuestoId a budgetId
    content = content.replace('{ presupuestoId:', '{ budgetId:')
    content = content.replace('presupuestoId: ', 'budgetId: ')
    
    # Corregir fechaConversion (no existe)
    content = content.replace('fechaConversion:', '// fechaConversion:')
    
    # Corregir client_documents (no existe como modelo)
    content = content.replace('prisma.client_documents', 'prisma.documents')
    
    # Corregir clienteId a clientId en variables
    content = re.sub(r'\bclienteId\b(?!:)', 'clientId', content)
    
    # Eliminar conversiones de Decimal
    content = re.sub(r's\.precio', 'Number(s.precio)', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Corregido: {filepath}")

def fix_email_service():
    """Corregir email service"""
    filepath = 'server/services/gestoria-budget-email-service.ts'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Corregir signature
    content = re.sub(r'async sendBudgetEmail\(id: number', 'async sendBudgetEmail(id: string', content)
    
    # Corregir campos
    content = content.replace('.cifNif', '.nifCif')
    content = content.replace('.nombreCompleto', '.nombreCliente')
    content = content.replace('.tipo', '.tipoGestoria')
    content = content.replace('budget.fechaValidez', 'new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1000)')
    content = content.replace('budget.subtotal', '(Number(budget.totalContabilidad) + Number(budget.totalLaboral))')
    content = content.replace('.codigoPostal', '.personaContacto')
    content = content.replace('.ciudad', '.direccion')
    content = content.replace('.provincia', '.direccion')
    content = content.replace('.actividadEmpresarial', '.sistemaTributacion')
    content = content.replace('.motivoDescuento', '.tipoDescuento')
    content = content.replace('.observaciones', '.direccion')  # No existe observaciones
    
    # Corregir include
    content = content.replace('gestoria_budget_additional_services: true', 'serviciosAdicionales: true')
    
    # Corregir config fields
    content = content.replace('nombreEmpresaOficial', 'nombreEmpresa')
    content = content.replace('nombreEmpresaOnline', 'nombreEmpresa')
    
    # Corregir presupuestoId
    content = content.replace('presupuestoId:', 'budgetId:')
    
    # Corregir conversión de Decimals
    content = re.sub(r'budget\.(facturacion|totalContabilidad|totalLaboral|descuentoCalculado|totalFinal|valorDescuento)', r'Number(budget.\1)', content)
    content = re.sub(r's\.precio', 'Number(s.precio)', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Corregido: {filepath}")

def fix_filing_dialog():
    """Corregir FilingDetailsDialog.tsx"""
    filepath = 'client/src/components/impuestos/FilingDetailsDialog.tsx'
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Eliminar referencia a periodId si existe
        content = re.sub(r'filing\.periodId', 'filing.id', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Corregido: {filepath}")
    except:
        print(f"⚠ No se pudo corregir: {filepath}")

if __name__ == '__main__':
    print("Corrigiendo errores de tipos en sistema de presupuestos...")
    print()
    
    fix_service_file('server/services/gestoria-budget-service.ts')
    fix_conversion_service()
    fix_email_service()
    fix_filing_dialog()
    
    print()
    print("✅ Correcciones completadas!")
