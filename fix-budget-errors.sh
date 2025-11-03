#!/bin/bash

echo "Arreglando errores de TypeScript en el sistema de presupuestos..."

# Arreglar gestoria-budget-service.ts
sed -i 's/async getBudgetById(id: number)/async getBudgetById(id: string)/g' server/services/gestoria-budget-service.ts
sed -i 's/async updateBudget(id: number,/async updateBudget(id: string,/g' server/services/gestoria-budget-service.ts
sed -i 's/async acceptBudget(id: number)/async acceptBudget(id: string)/g' server/services/gestoria-budget-service.ts
sed -i 's/async rejectBudget(id: number,/async rejectBudget(id: string,/g' server/services/gestoria-budget-service.ts
sed -i 's/async deleteBudget(id: number)/async deleteBudget(id: string)/g' server/services/gestoria-budget-service.ts
sed -i 's/async logStatisticsEvent.*evento.*id.*tipo.*/async logStatisticsEvent(evento: string, budgetId: string, tipoGestoria: string, userId?: string)/g' server/services/gestoria-budget-service.ts

# Arreglar conversion service
sed -i 's/async convertToClient(id: number,/async convertToClient(id: string,/g' server/services/gestoria-budget-conversion-service.ts
sed -i 's/async canConvertToClient(id: number)/async canConvertToClient(id: string)/g' server/services/gestoria-budget-conversion-service.ts

# Arreglar email service  
sed -i 's/async sendBudgetEmail(id: number,/async sendBudgetEmail(id: string,/g' server/services/gestoria-budget-email-service.ts

echo "Correcciones aplicadas!"
