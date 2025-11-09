import { useEffect, useState, useCallback } from 'react';

export type InvoiceTier = {
  id: string;
  orden: number;
  minFacturas: number;
  maxFacturas: number | null;
  precio: number;
  etiqueta?: string;
};

export type PayrollTier = {
  id: string;
  orden: number;
  minNominas: number;
  maxNominas: number | null;
  precio: number;
  etiqueta?: string;
};

export type BillingTier = {
  id: string;
  orden: number;
  minFacturacion: number;
  maxFacturacion: number | null;
  multiplicador: number;
  etiqueta?: string;
};

export type FiscalModel = {
  id: string;
  codigoModelo: string;
  nombreModelo: string;
  precio: number;
  activo: boolean;
  orden: number;
};

export type ServiceItem = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  tipoServicio: 'MENSUAL' | 'PUNTUAL';
  activo: boolean;
  orden: number;
};

export type AutonomoConfig = {
  id: string;
  nombre: string;
  activo: boolean;
  porcentajePeriodoMensual: number;
  porcentajeEDN: number;
  porcentajeModulos: number;
  minimoMensual: number;
};

export default function useAutonomoConfig() {
  const [config, setConfig] = useState<AutonomoConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gestoria-budgets/config/autonomo');
      if (!res.ok) throw new Error('Error fetching config');
      const json = await res.json();
      setConfig(json.data || json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const refresh = () => fetchConfig();

  // Config general
  const updateConfig = async (payload: Partial<AutonomoConfig>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating config');
    return res.json();
  };

  // Invoice tiers
  const getInvoiceTiers = async (): Promise<InvoiceTier[]> => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/invoice-tiers');
    const json = await res.json();
    const data = json.data || [];
    // Convert precio from string to number
    return data.map((item: any) => ({
      ...item,
      precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio
    }));
  };

  const createInvoiceTier = async (payload: Omit<InvoiceTier, 'id'>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/invoice-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error creating invoice tier');
    return res.json();
  };

  const updateInvoiceTier = async (id: string, payload: Partial<InvoiceTier>) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/invoice-tiers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating invoice tier');
    return res.json();
  };

  const deleteInvoiceTier = async (id: string) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/invoice-tiers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting invoice tier');
    return res.json();
  };

  const reorderInvoiceTiers = async (orders: { id: string; orden: number }[]) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/invoice-tiers/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error('Error reordering invoice tiers');
    return res.json();
  };

  // Payroll tiers
  const getPayrollTiers = async (): Promise<PayrollTier[]> => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/payroll-tiers');
    const json = await res.json();
    const data = json.data || [];
    // Convert precio from string to number
    return data.map((item: any) => ({
      ...item,
      precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio
    }));
  };

  const createPayrollTier = async (payload: Omit<PayrollTier, 'id'>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/payroll-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error creating payroll tier');
    return res.json();
  };

  const updatePayrollTier = async (id: string, payload: Partial<PayrollTier>) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/payroll-tiers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating payroll tier');
    return res.json();
  };

  const deletePayrollTier = async (id: string) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/payroll-tiers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting payroll tier');
    return res.json();
  };

  // Billing tiers
  const getBillingTiers = async (): Promise<BillingTier[]> => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/billing-tiers');
    const json = await res.json();
    const data = json.data || [];
    // Convert multiplicador from string to number
    return data.map((item: any) => ({
      ...item,
      multiplicador: typeof item.multiplicador === 'string' ? parseFloat(item.multiplicador) : item.multiplicador
    }));
  };

  const createBillingTier = async (payload: Omit<BillingTier, 'id'>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/billing-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error creating billing tier');
    return res.json();
  };

  const updateBillingTier = async (id: string, payload: Partial<BillingTier>) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/billing-tiers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating billing tier');
    return res.json();
  };

  const deleteBillingTier = async (id: string) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/billing-tiers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting billing tier');
    return res.json();
  };

  // Fiscal models
  const getFiscalModels = async (): Promise<FiscalModel[]> => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/fiscal-models');
    const json = await res.json();
    const data = json.data || [];
    // Convert precio from string to number
    return data.map((item: any) => ({
      ...item,
      precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio
    }));
  };

  const createFiscalModel = async (payload: Omit<FiscalModel, 'id'>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/fiscal-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error creating fiscal model');
    return res.json();
  };

  const updateFiscalModel = async (id: string, payload: Partial<FiscalModel>) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/fiscal-models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating fiscal model');
    return res.json();
  };

  const deleteFiscalModel = async (id: string) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/fiscal-models/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting fiscal model');
    return res.json();
  };

  // Services
  const getServices = async (): Promise<ServiceItem[]> => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/services');
    const json = await res.json();
    const data = json.data || [];
    // Convert precio from string to number
    return data.map((item: any) => ({
      ...item,
      precio: typeof item.precio === 'string' ? parseFloat(item.precio) : item.precio
    }));
  };

  const createService = async (payload: Omit<ServiceItem, 'id'>) => {
    const res = await fetch('/api/gestoria-budgets/config/autonomo/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error creating service');
    return res.json();
  };

  const updateService = async (id: string, payload: Partial<ServiceItem>) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error updating service');
    return res.json();
  };

  const deleteService = async (id: string) => {
    const res = await fetch(`/api/gestoria-budgets/config/autonomo/services/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting service');
    return res.json();
  };

  return {
    config,
    loading,
    refresh,
    updateConfig,
    // invoice
    getInvoiceTiers,
    createInvoiceTier,
    updateInvoiceTier,
    deleteInvoiceTier,
    reorderInvoiceTiers,
    // payroll
    getPayrollTiers,
    createPayrollTier,
    updatePayrollTier,
    deletePayrollTier,
    // billing
    getBillingTiers,
    createBillingTier,
    updateBillingTier,
    deleteBillingTier,
    // fiscal
    getFiscalModels,
    createFiscalModel,
    updateFiscalModel,
    deleteFiscalModel,
    // services
    getServices,
    createService,
    updateService,
    deleteService,
  };
}
