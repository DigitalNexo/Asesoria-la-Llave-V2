#!/usr/bin/env python3
"""
Script para arreglar TODOS los errores TypeScript en los servicios de presupuestos
"""

import re

# ========== ARCHIVO: gestoria-budget-conversion-service.ts ==========

conversion_fixes = [
    # Fix budgetId type (number -> string)
    (r'budgetId: number', 'budgetId: string'),
    
    # Fix ID conversions
    (r'where: \{ id: budgetId \}', 'where: { id: budgetId }'),
    
    # Fix clientId property (should be clienteId)
    (r'budget\.clientId', 'budget.clienteId'),
    
    # Fix client schema fields (nif -> cifNif)
    (r"nif: budget\.nifCif", "cifNif: budget.nifCif"),
    (r"\{ nif: budget\.nifCif \}", "{ cifNif: budget.nifCif }"),
    
    # Fix duplicate nif property
    (r"name: budget\.nombreCliente,\s+nif: this\.isCIF.*?\s+nif: this\.isNIF.*?null,",
     "nombre: budget.nombreCliente,\n        cifNif: budget.nifCif,"),
    
    # Fix client return type (number -> string)
    (r'Promise<number>', 'Promise<string>'),
    (r'async convertToClient\(\s+budgetId: string,.*?\): Promise<string>',
     'async convertToClient(\n    budgetId: string,\n    options: ConvertBudgetToClientOptions = {}\n  ): Promise<string>'),
    
    # Fix clientId in tax assignments
    (r'clientId:', 'clienteId:'),
    
    # Fix budget ID in statistics
    (r"budgetId: budgetId,", "budgetId: budgetId,"),
    
    # Fix tipo -> tipoGestoria in events
    (r"tipo: budget\.tipoGestoria,", "tipoGestoria: budget.tipoGestoria,"),
    
    # Fix return type
    (r'return client\.id;', 'return client.id;'),
    
    # Fix tipoServicio property
    (r's\.tipoGestoriaServicio', 's.tipoServicio'),
    
    # Fix document client ID
    (r'clienteId: client\.id', 'client_id: client.id'),
    
    # Fix includes
    (r'include: \{ clients: true \}', ''),
    (r'\.clients', ''),
]

# Read file
with open('server/services/gestoria-budget-conversion-service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Apply fixes
for pattern, replacement in conversion_fixes:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL | re.MULTILINE)

# Fix the complete convertToClient method
content = re.sub(
    r'async convertToClient\([^{]+\{.*?return client\.id;',
    '''async convertToClient(
    budgetId: string,
    options: ConvertBudgetToClientOptions = {}
  ): Promise<string> {
    
    // 1. Validar presupuesto
    const budget = await prisma.gestoria_budgets.findUnique({
      where: { id: budgetId },
      include: {
        serviciosAdicionales: true
      }
    });
    
    if (!budget) {
      throw new Error(`Presupuesto con ID ${budgetId} no encontrado`);
    }
    
    if (budget.estado !== 'ACEPTADO') {
      throw new Error('Solo se pueden convertir presupuestos en estado ACEPTADO');
    }
    
    if (budget.clienteId) {
      throw new Error('Este presupuesto ya ha sido convertido a cliente');
    }
    
    if (!budget.nifCif) {
      throw new Error('El presupuesto debe tener CIF/NIF para convertirlo a cliente');
    }
    
    // 2. Verificar que no exista ya un cliente con el mismo CIF/NIF
    const existingClient = await prisma.clients.findFirst({
      where: {
        OR: [
          { cifNif: budget.nifCif },
          { cif: budget.nifCif }
        ]
      }
    });
    
    if (existingClient) {
      throw new Error(`Ya existe un cliente con CIF/NIF ${budget.nifCif}`);
    }
    
    // 3. Crear cliente
    const client = await prisma.clients.create({
      data: {
        nombre: budget.nombreCliente,
        cifNif: budget.nifCif,
        email: budget.email || null,
        telefono: options.telefono || budget.telefono || null,
        direccion: options.direccion || budget.direccion || null,
        personaContacto: options.personaContacto || budget.personaContacto || null,
        activo: true,
        fechaAlta: new Date()
      }
    });
    
    // 4. Crear asignaciones de modelos fiscales
    await this.createTaxAssignments(client.id, budget);
    
    // 5. Archivar PDF del presupuesto como documento del cliente
    await this.archiveBudgetPDF(budget, client.id);
    
    // 6. Actualizar presupuesto con el ID del cliente
    await prisma.gestoria_budgets.update({
      where: { id: budgetId },
      data: {
        clienteId: client.id
      }
    });
    
    // 7. Registrar evento de conversión
    await prisma.gestoria_budget_statistics_events.create({
      data: {
        budgetId: budgetId,
        tipoGestoria: budget.tipoGestoria,
        evento: 'CONVERTED',
        fecha: new Date()
      }
    });
    
    return client.id''',
    content,
    flags=re.DOTALL
)

# Fix createTaxAssignments method
content = re.sub(
    r'private async createTaxAssignments\(clientId: number, budget: any\): Promise<void> \{.*?await prisma\.client_tax_assignments\.createMany\(\{.*?data: assignments.*?\}\);',
    '''private async createTaxAssignments(clientId: string, budget: any): Promise<void> {
    const assignments = [];
    
    let periodicidad = 'TRIMESTRAL';
    if (budget.periodoDeclaraciones === 'Mensual') {
      periodicidad = 'MENSUAL';
    } else if (budget.periodoDeclaraciones === 'Anual') {
      periodicidad = 'ANUAL';
    }
    
    if (budget.modelo303) {
      assignments.push({
        id: `${clientId}-303-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '303',
        periodicidad: periodicidad,
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo111) {
      assignments.push({
        id: `${clientId}-111-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '111',
        periodicidad: 'TRIMESTRAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo115) {
      assignments.push({
        id: `${clientId}-115-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '115',
        periodicidad: 'TRIMESTRAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo130) {
      assignments.push({
        id: `${clientId}-130-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '130',
        periodicidad: periodicidad,
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo100) {
      assignments.push({
        id: `${clientId}-100-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '100',
        periodicidad: 'ANUAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo349) {
      assignments.push({
        id: `${clientId}-349-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '349',
        periodicidad: 'TRIMESTRAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (budget.modelo347) {
      assignments.push({
        id: `${clientId}-347-${Date.now()}`,
        clientId: clientId,
        taxModelCode: '347',
        periodicidad: 'ANUAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    if (assignments.length > 0) {
      await prisma.client_tax_assignments.createMany({
        data: assignments
      });
    }''',
    content,
    flags=re.DOTALL
)

# Fix archiveBudgetPDF method
content = re.sub(
    r'private async archiveBudgetPDF\(budget: any, clientId: number\): Promise<void> \{.*?await prisma\.documents\.create\(\{.*?data: \{.*?\}.*?\}\);',
    '''private async archiveBudgetPDF(budget: any, clientId: string): Promise<void> {
    if (!budget.pdfPath) return;
    
    await prisma.documents.create({
      data: {
        id: `doc-budget-${budget.id}-${Date.now()}`,
        client_id: clientId,
        file_name: `Presupuesto_${budget.numero}.pdf`,
        file_path: budget.pdfPath,
        file_type: 'application/pdf',
        document_type: 'PRESUPUESTO',
        upload_date: new Date()
      }
    });''',
    content,
    flags=re.DOTALL
)

# Fix canConvertToClient method
content = re.sub(
    r'async canConvertToClient\(budgetId: number\): Promise<\{.*?return \{.*?\};',
    '''async canConvertToClient(budgetId: string): Promise<{
    canConvert: boolean;
    reason?: string;
  }> {
    const budget = await prisma.gestoria_budgets.findUnique({
      where: { id: budgetId }
    });
    
    if (!budget) {
      return { canConvert: false, reason: 'Presupuesto no encontrado' };
    }
    
    if (budget.estado !== 'ACEPTADO') {
      return { canConvert: false, reason: 'El presupuesto no ha sido aceptado' };
    }
    
    if (budget.clienteId) {
      return { canConvert: false, reason: 'Ya convertido a cliente' };
    }
    
    if (!budget.nifCif) {
      return { canConvert: false, reason: 'Falta CIF/NIF' };
    }
    
    const existingClient = await prisma.clients.findFirst({
      where: {
        OR: [
          { cifNif: budget.nifCif },
          { cif: budget.nifCif }
        ]
      }
    });
    
    if (existingClient) {
      return { canConvert: false, reason: `Ya existe cliente con CIF/NIF ${budget.nifCif}` };
    }
    
    return { canConvert: true }''',
    content,
    flags=re.DOTALL
)

# Write back
with open('server/services/gestoria-budget-conversion-service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fixed gestoria-budget-conversion-service.ts")

# ========== ARCHIVO: gestoria-budget-email-service.ts ==========

with open('server/services/gestoria-budget-email-service.ts', 'r', encoding='utf-8') as f:
    email_content = f.read()

# Fix email service
email_content = re.sub(r'async sendBudgetEmail\(\s+budgetId: number,', 'async sendBudgetEmail(\n    budgetId: string,', email_content)
email_content = re.sub(r'where: \{ id: budgetId \}', 'where: { id: budgetId }', email_content)
email_content = re.sub(r'\.gestoria_budget_additional_services', '.serviciosAdicionales', email_content)
email_content = re.sub(r'budget\.tipoGestoriaDescuento', 'budget.tipoDescuento', email_content)
email_content = re.sub(r'budgetId: budgetId,\s+tipo:', 'budgetId: budgetId,\n        tipoGestoria:', email_content)

with open('server/services/gestoria-budget-email-service.ts', 'w', encoding='utf-8') as f:
    f.write(email_content)

print("✅ Fixed gestoria-budget-email-service.ts")

# ========== ARCHIVO: FilingDetailsDialog.tsx ==========

with open('client/src/components/impuestos/FilingDetailsDialog.tsx', 'r', encoding='utf-8') as f:
    dialog_content = f.read()

# Remove periodId usage
dialog_content = re.sub(r'filing\.periodId', 'filing.id', dialog_content)

with open('client/src/components/impuestos/FilingDetailsDialog.tsx', 'w', encoding='utf-8') as f:
    f.write(dialog_content)

print("✅ Fixed FilingDetailsDialog.tsx")

print("\n🎉 ¡Todos los archivos arreglados!")
