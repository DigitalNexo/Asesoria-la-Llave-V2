import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners, useDroppable, useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// wouter Link/location not needed here; TaxesNav handles internal navigation
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { KanbanSquare, FileText, MoreVertical, Paperclip, Eye, Download, RefreshCw, Upload } from "lucide-react";
import { TAX_MODEL_METADATA } from "@shared/tax-rules";
import { FilingPresentedDialog } from "@/components/impuestos/FilingPresentedDialog";
import { FilingDetailsDialog } from "@/components/impuestos/FilingDetailsDialog";
import { TaxesNav } from "@/components/taxes-nav";
import { getTaxModels, type TaxModel } from "@/features/tax-models/api";

type BoardStatus = "PENDIENTE" | "CALCULADO" | "PRESENTADO";

interface FilingCard {
  id: string;
  clientId: string;
  clientName: string;
  nifCif: string;
  taxModelCode: string;
  periodId: string;
  periodLabel: string | null;
  periodKind: string | null;
  periodStatus: string | null;
  calendarStatus: string | null; // Estado del tax_calendar (PENDIENTE/ABIERTO/CERRADO)
  status: BoardStatus;
}

type PeriodicityFilter = "ALL" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "SPECIAL";

const PERIODICITY_FILTER_MAP: Record<Exclude<PeriodicityFilter, "ALL">, string[]> = {
  MONTHLY: ["MENSUAL"],
  QUARTERLY: ["TRIMESTRAL"],
  ANNUAL: ["ANUAL"],
  SPECIAL: ["ESPECIAL_FRACCIONADO"],
};

const PERIODICITY_OPTIONS: Array<{ value: PeriodicityFilter; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "ANNUAL", label: "Anual" },
  { value: "SPECIAL", label: "Especial 202" },
];

export default function ImpuestosControl() {
  const { toast } = useToast();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [clientId, setClientId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BoardStatus>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [modelCode, setModelCode] = useState<string>("");
  const [gestorId, setGestorId] = useState<string>("");
  const [periodId, setPeriodId] = useState<string>("");
  const [periodicity, setPeriodicity] = useState<PeriodicityFilter>("ALL");
  const [includeClosedPeriods, setIncludeClosedPeriods] = useState<boolean>(false);

  // Estados para los diálogos
  const [presentedDialogData, setPresentedDialogData] = useState<{
    filingId: string;
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodId: string;
    periodLabel: string;
    year: number;
    previousStatus: BoardStatus;
  } | null>(null);

  const [detailsDialogData, setDetailsDialogData] = useState<{
    id: string;
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodLabel: string;
    year: number;
    status: string;
    presentedAt?: string;
    notes?: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  // Exponer funciones globales para que CardItem pueda acceder a los diálogos
  useEffect(() => {
    (window as any).openFilingDetails = (item: FilingCard) => {
      setDetailsDialogData({
        id: item.id,
        clientId: item.clientId,
        clientName: item.clientName,
        taxModelCode: item.taxModelCode,
        periodLabel: item.periodLabel || "",
        year,
        status: item.status,
        presentedAt: undefined, // Se cargará desde el backend
        notes: undefined,
      });
    };

    (window as any).replaceFilingDocuments = (item: FilingCard) => {
      setPresentedDialogData({
        filingId: item.id,
        clientId: item.clientId,
        clientName: item.clientName,
        taxModelCode: item.taxModelCode,
        periodId: item.periodId,
        periodLabel: item.periodLabel || "",
        year,
        previousStatus: item.status,
      });
    };

    return () => {
      delete (window as any).openFilingDetails;
      delete (window as any).replaceFilingDocuments;
    };
  }, [year]);

  const clientsQuery = useQuery<any[]>({
    queryKey: ["/api/clients"],
    staleTime: 60_000,
  });

  const filingsQuery = useQuery<FilingCard[]>({
    queryKey: ["/api/tax/filings", year, clientId, statusFilter, modelCode, gestorId, periodId, searchTerm, includeClosedPeriods],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("year", String(year));
      if (clientId && clientId !== 'all') params.set("clientId", clientId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (modelCode && modelCode !== 'ALL') params.set("model", modelCode);
      if (gestorId) params.set("gestorId", gestorId);
      if (periodId) params.set("periodId", periodId);
      if (searchTerm) params.set("q", searchTerm.trim());
      if (includeClosedPeriods) params.set("includeClosedPeriods", "true");
      const url = `/api/tax/filings${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudieron cargar los datos");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Periodos fiscales (para seleccionar periodo activo)
  const periodsQuery = useQuery<any[]>({
    queryKey: ["/api/tax/periods", year],
    queryFn: async () => {
      const res = await fetch(`/api/tax/periods?year=${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudieron cargar periodos");
      return res.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!periodId) return;
    const periods = periodsQuery.data ?? [];
    const stillValid = periods.some(
      (p) => p.id === periodId && (periodicity === "ALL" || p.kind === periodicity)
    );
    if (!stillValid) {
      setPeriodId("");
    }
  }, [periodicity, periodId, periodsQuery.data]);

  const patchMutation = useMutation({
    mutationFn: async ({ id, status, presentedAt }: { id: string; status: BoardStatus; presentedAt?: string | null }) => {
      return apiRequest("PATCH", `/api/tax/filings/${id}`, { status, presentedAt: presentedAt ?? null });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message ?? "No se pudo actualizar el estado", variant: "destructive" });
      filingsQuery.refetch();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax/filings"], exact: false });
    },
  });

  const rows = filingsQuery.data ?? [];
  const normalizeStatus = (s: string | null | undefined): BoardStatus => {
    const u = (s || "").toUpperCase();
    if (u === "PRESENTADO") return "PRESENTADO";
    if (u === "CALCULADO" || u === "IN_PROGRESS" || u === "COMPLETADO" || u === "COMPLETED") return "CALCULADO";
    if (u === "PENDIENTE" || u === "NOT_STARTED" || u === "PENDING") return "PENDIENTE";
    return "PENDIENTE";
  };
  
  // Cargar modelos fiscales dinámicamente desde la API
  const { data: taxModelsData = [] } = useQuery<TaxModel[]>({
    queryKey: ["/api/tax-models"],
    queryFn: getTaxModels,
  });

  const modelsList = useMemo(() => {
    // Combinar modelos de la BD con los estáticos para compatibilidad
    const dbModels = taxModelsData.map(m => ({ code: m.code, name: m.name }));
    const staticModels = Object.entries(TAX_MODEL_METADATA).map(([code, meta]) => ({ code, name: meta.name }));
    
    // Crear un mapa para evitar duplicados (priorizar BD)
    const modelsMap = new Map<string, { code: string; name: string }>();
    staticModels.forEach(m => modelsMap.set(m.code, m));
    dbModels.forEach(m => modelsMap.set(m.code, m));
    
    return Array.from(modelsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [taxModelsData]);

  const board = useMemo(() => {
    const col: Record<BoardStatus, FilingCard[]> = {
      PENDIENTE: [], CALCULADO: [], PRESENTADO: [],
    };
    rows.forEach((r) => {
      const periodKind = String(r.periodKind ?? "").toUpperCase();
      if (periodicity !== "ALL" && periodKind !== periodicity) {
        return;
      }
      const st = normalizeStatus((r as any).status);
      if (statusFilter === "all" || st === statusFilter) {
        const key: BoardStatus = st in col ? st : "PENDIENTE";
        col[key].push({ ...r, status: key });
      }
    });
    return col;
  }, [rows, statusFilter, periodicity]);

  const onDragEnd = (evt: DragEndEvent) => {
    const activeId = String(evt.active.id);
    const overId = evt.over?.id as BoardStatus | undefined;
    
    if (!overId) return;
    const current = rows.find((r) => r.id === activeId);
    
    if (!current || current.status === overId) return;

    // Si se arrastra a PRESENTADO, abrir diálogo
    if (overId === "PRESENTADO") {
      setPresentedDialogData({
        filingId: current.id,
        clientId: current.clientId,
        clientName: current.clientName,
        taxModelCode: current.taxModelCode,
        periodId: current.periodId,
        periodLabel: current.periodLabel || "",
        year,
        previousStatus: current.status,
      });
      return; // No hacer cambio optimista aún
    }

    // Optimistic UI para otros casos
    queryClient.setQueriesData<FilingCard[] | undefined>({ queryKey: ["/api/tax/filings"], exact: false }, (prev) => {
      if (!Array.isArray(prev)) return prev as any;
      return prev.map((p) => (p.id === current.id ? { ...p, status: overId } : p));
    });

    if (current.status === "PRESENTADO") {
      const reason = window.prompt("Motivo del cambio de estado (salir de Presentado)");
      patchMutation.mutate({ id: current.id, status: overId, presentedAt: null });
      return;
    }
    patchMutation.mutate({ id: current.id, status: overId });
  };

  // Handler para confirmar presentación con documentos
  const handlePresentedConfirm = async (presentedAt: string, documents: File[]) => {
    if (!presentedDialogData) return;

    const isReplacement = presentedDialogData.previousStatus === "PRESENTADO";

    try {
      // 0. Si es reemplazo, archivar documentos anteriores
      if (isReplacement) {
        const docsRes = await fetch(
          `/api/documents?clientId=${presentedDialogData.clientId}&type=tax_filing_document`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
          }
        );

        if (docsRes.ok) {
          const allDocs = await docsRes.json();
          const oldDocs = allDocs.filter((doc: any) => {
            try {
              const metadata = JSON.parse(doc.description || "{}");
              return metadata.filingId === presentedDialogData.filingId;
            } catch {
              return false;
            }
          });

          // Archivar cada documento antiguo
          for (const oldDoc of oldDocs) {
            await fetch(`/api/documents/${oldDoc.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              credentials: "include",
              body: JSON.stringify({
                status: "archived",
              }),
            });
          }
        }
      }

      // 1. Crear documentos y subir archivos
      const documentIds: string[] = [];

      for (const file of documents) {
        // Crear registro de documento
        const metadata = {
          filingId: presentedDialogData.filingId,
          clientId: presentedDialogData.clientId,
          taxModelCode: presentedDialogData.taxModelCode,
          periodId: presentedDialogData.periodId,
          periodLabel: presentedDialogData.periodLabel,
          year: presentedDialogData.year,
          filingStatus: "PRESENTED",
          linkedAt: new Date().toISOString(),
        };

        const docRes = await fetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
          body: JSON.stringify({
            type: "tax_filing_document",
            name: `${presentedDialogData.taxModelCode} - ${presentedDialogData.periodLabel} - ${file.name}`,
            description: JSON.stringify(metadata),
            clientId: presentedDialogData.clientId,
          }),
        });

        if (!docRes.ok) throw new Error("Error al crear documento");
        const doc = await docRes.json();
        documentIds.push(doc.id);

        // Subir archivo
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Error al subir archivo");
      }

      // 2. Actualizar filing con fecha y estado
      // Agregar entrada al historial
      const historyEntry = {
        status: "PRESENTED",
        timestamp: new Date().toISOString(),
      };

      const notesData = {
        history: [historyEntry],
        documentIds,
      };

      await apiRequest("PATCH", `/api/tax/filings/${presentedDialogData.filingId}`, {
        status: "PRESENTED",
        presentedAt,
        notes: JSON.stringify(notesData),
      });

      // 3. Actualizar UI
      queryClient.invalidateQueries({ queryKey: ["/api/tax/filings"], exact: false });

      toast({
        title: isReplacement ? "Documentos reemplazados" : "Presentación registrada",
        description: isReplacement
          ? `Documentos del modelo ${presentedDialogData.taxModelCode} reemplazados correctamente (${documents.length} nuevo(s))`
          : `Modelo ${presentedDialogData.taxModelCode} marcado como presentado con ${documents.length} documento(s)`,
      });

      setPresentedDialogData(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo completar la presentación",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handler para cancelar presentación
  const handlePresentedCancel = () => {
    setPresentedDialogData(null);
    // No hacer nada más, la tarjeta se queda en su posición original
  };

  // Helper to change status from UI buttons
  const changeStatus = async (id: string, status: BoardStatus, presentedAt?: string | null) => {
    try {
      await apiRequest('PATCH', `/api/tax/filings/${id}`, { status, presentedAt: presentedAt ?? null });
      queryClient.invalidateQueries({ queryKey: ["/api/tax/filings"], exact: false });
      toast({ title: 'Actualizado', description: `Estado actualizado a ${status}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Impuestos</h1>
        <p className="text-sm text-muted-foreground">Seguimiento y planificación fiscal con la misma experiencia consistente que Administración.</p>
      </div>

      <TaxesNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Impuestos 360</h2>
          <p className="text-sm text-muted-foreground">Tablero de presentaciones fiscales</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar cliente, NIF o modelo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
          <Button variant="ghost" onClick={() => setSearchTerm("")}>Limpiar</Button>
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
          <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as PeriodicityFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Periodicidad" />
            </SelectTrigger>
            <SelectContent>
              {PERIODICITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {(periodsQuery.data ?? [])
                .filter((p) => (periodicity === "ALL" ? true : p.kind === periodicity))
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label} / {p.year}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="CALCULADO">Calculado</SelectItem>
              <SelectItem value="PRESENTADO">Presentado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(clientsQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.razonSocial}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modelCode || 'ALL'} onValueChange={(v) => setModelCode(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {modelsList.map((m) => (<SelectItem key={m.code} value={m.code}>{m.code} · {m.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input placeholder="Gestor (ID)" value={gestorId} onChange={(e) => setGestorId(e.target.value)} className="w-40" />
          <Button
            variant="outline"
            onClick={async () => {
              // Crear periodos si faltan
              if ((periodsQuery.data ?? []).length === 0) {
                const ok = window.confirm('No hay periodos para este año. ¿Crear año fiscal ahora?');
                if (ok) {
                  const res = await fetch('/api/tax/periods/create-year', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                    credentials: 'include',
                    body: JSON.stringify({ year }),
                  });
                  if (res.ok) {
                    await periodsQuery.refetch();
                    toast({ title: 'Año fiscal creado', description: `Se han creado periodos base para ${year}` });
                  } else {
                    try { const j = await res.json(); toast({ title: 'Error', description: j?.error || 'No se pudo crear el año fiscal', variant: 'destructive' }); } catch { toast({ title: 'Error', description: 'No se pudo crear el año fiscal', variant: 'destructive' }); }
                    return;
                  }
                }
              }

              // Asegurar tarjetas (filings) para el año
              const res2 = await fetch('/api/tax/filings/ensure-year', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                credentials: 'include',
                body: JSON.stringify({ year }),
              });
              if (res2.ok) {
                try { const j = await res2.json(); toast({ title: 'Tarjetas generadas', description: `Año ${year}` }); } catch {}
                filingsQuery.refetch();
              } else {
                try { const j = await res2.json(); toast({ title: 'Error', description: j?.error || 'No se pudieron generar las tarjetas', variant: 'destructive' }); } catch { toast({ title: 'Error', description: 'No se pudieron generar las tarjetas', variant: 'destructive' }); }
              }
            }}
          >
            Generar tarjetas
          </Button>
          <div className="flex items-center gap-2 border-l pl-2">
            <input
              type="checkbox"
              id="includeClosedPeriods"
              checked={includeClosedPeriods}
              onChange={(e) => setIncludeClosedPeriods(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="includeClosedPeriods" className="text-sm font-medium cursor-pointer">
              Incluir periodos cerrados
            </label>
          </div>
        </div>
      </div>

      {filingsQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border p-12 text-center text-sm text-muted-foreground">
          <p>No hay tarjetas para este año.</p>
          <p className="mt-1">Usa el botón <span className="font-semibold">Generar tarjetas</span> para crearlas a partir de las asignaciones activas.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            <Column title="Pendiente" accent="bg-red-50 border-red-200" badge="bg-red-100 text-red-700" items={board.PENDIENTE} />
            <Column title="Calculado" accent="bg-amber-50 border-amber-200" badge="bg-amber-100 text-amber-700" items={board.CALCULADO} />
            <Column title="Presentado" accent="bg-emerald-50 border-emerald-200" badge="bg-emerald-100 text-emerald-700" items={board.PRESENTADO} />
          </div>
        </DndContext>
      )}

      {/* Diálogos */}
      <FilingPresentedDialog
        open={!!presentedDialogData}
        filingData={presentedDialogData}
        onConfirm={handlePresentedConfirm}
        onCancel={handlePresentedCancel}
      />

      <FilingDetailsDialog
        open={!!detailsDialogData}
        filingData={detailsDialogData}
        onClose={() => setDetailsDialogData(null)}
      />
    </div>
  );
}

function Column({ title, accent, badge, items }: { title: string; accent: string; badge: string; items: FilingCard[] }) {
  const id = title.toUpperCase();
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} id={id} className={`relative flex h-full min-h-[320px] flex-col gap-3 rounded-xl border p-4 ${accent} ${isOver ? 'ring-2 ring-primary/40' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        <Badge variant="secondary" className="bg-background text-muted-foreground">{items.length}</Badge>
      </div>
      <VirtualColumn items={items} renderItem={(it) => <CardItem key={it.id} item={it} badgeClass={badge} />} />
    </div>
  );
}

function CardItem({ item, badgeClass }: { item: FilingCard; badgeClass: string }) {
  // Bloquear la tarjeta solo si el periodo del modelo en tax_calendar está CERRADO
  const isPeriodClosed = item.calendarStatus === 'CERRADO';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: isPeriodClosed,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const [isExpanded, setIsExpanded] = useState(false);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const { toast } = useToast();

  // Cargar conteo de documentos si está PRESENTADO
  useEffect(() => {
    if (item.status === 'PRESENTADO') {
      loadDocumentCount();
    }
  }, [item.id, item.status]);

  const loadDocumentCount = async () => {
    try {
      const res = await fetch(`/api/documents?clientId=${item.clientId}&type=tax_filing_document`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const docs = await res.json();
        // Filtrar documentos de este filing específico
        const filingDocs = docs.filter((doc: any) => {
          try {
            const metadata = JSON.parse(doc.description || '{}');
            return metadata.filingId === item.id;
          } catch {
            return false;
          }
        });
        setDocumentCount(filingDocs.length);
      }
    } catch (error) {
      // Silencioso, no mostrar error
    }
  };

  const handleDownloadAllDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?clientId=${item.clientId}&type=tax_filing_document`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const docs = await res.json();
        const filingDocs = docs.filter((doc: any) => {
          try {
            const metadata = JSON.parse(doc.description || '{}');
            return metadata.filingId === item.id;
          } catch {
            return false;
          }
        });

        if (filingDocs.length === 0) {
          toast({
            title: 'Sin documentos',
            description: 'No hay documentos adjuntos para descargar',
            variant: 'destructive',
          });
          return;
        }

        // Descargar cada documento
        for (const doc of filingDocs) {
          const downloadRes = await fetch(`/api/documents/${doc.id}/download`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
          });

          if (downloadRes.ok) {
            const blob = await downloadRes.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.file_name || `documento-${doc.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }

          // Pausa entre descargas
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        toast({
          title: 'Descarga completada',
          description: `${filingDocs.length} documento(s) descargado(s)`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron descargar los documentos',
        variant: 'destructive',
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleViewDetails = () => {
    // Necesitamos acceso al setDetailsDialogData del componente padre
    // Lo haremos agregando una prop callback
    if (typeof (window as any).openFilingDetails === 'function') {
      (window as any).openFilingDetails(item);
    }
  };

  const handleReplaceDocuments = () => {
    // Abrir el diálogo de presentación en modo reemplazo
    if (typeof (window as any).replaceFilingDocuments === 'function') {
      (window as any).replaceFilingDocuments(item);
    }
  };

  const handleChangeStatus = async (newStatus: BoardStatus) => {
    try {
      if (newStatus === 'PRESENTADO') {
        const date = window.prompt('Fecha de presentación (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
        if (!date) return;
        await apiRequest('PATCH', `/api/tax/filings/${item.id}`, { status: newStatus, presentedAt: date });
        toast({ title: 'Actualizado', description: `Marcado como PRESENTADO (${date})` });
      } else {
        await apiRequest('PATCH', `/api/tax/filings/${item.id}`, { status: newStatus, presentedAt: null });
        toast({ title: 'Actualizado', description: `Estado cambiado a ${newStatus}` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/tax/filings"], exact: false });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'No se pudo actualizar', variant: 'destructive' });
    }
  };

  const modelMeta = TAX_MODEL_METADATA[item.taxModelCode as keyof typeof TAX_MODEL_METADATA];

  return (
    <div
      ref={setNodeRef}
      id={item.id}
      {...(isPeriodClosed ? {} : listeners)}
      {...(isPeriodClosed ? {} : attributes)}
      style={style}
      className={`rounded-lg border transition-all duration-200 ${
        isPeriodClosed
          ? 'bg-gray-50 border-gray-300 opacity-60 cursor-not-allowed'
          : isDragging
            ? 'bg-white opacity-80 ring-2 ring-primary/50 shadow-lg'
            : 'bg-white shadow-sm hover:shadow-md'
      } ${isExpanded ? 'p-4 shadow-xl' : 'p-3'}`}
    >
      {/* Vista Compacta - Siempre visible */}
      <div 
        className="cursor-pointer select-none"
        onClick={(e) => {
          // Solo expandir si no se está arrastrando
          if (!isDragging) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.clientName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs font-mono ${badgeClass}`}>
                  {item.taxModelCode}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.periodLabel || 'Sin periodo'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <Badge
                variant={item.status === 'PRESENTADO' ? 'default' : 'secondary'}
                className="text-xs whitespace-nowrap"
              >
                {item.status}
              </Badge>
              {isPeriodClosed && (
                <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700">
                  CERRADO
                </Badge>
              )}
              {item.status === 'PRESENTADO' && documentCount > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {documentCount}
                </Badge>
              )}
              {item.status === 'PRESENTADO' && documentCount === 0 && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Sin docs
                </Badge>
              )}
              {isExpanded && (
                <span className="text-xs text-muted-foreground">Click para cerrar</span>
              )}
            </div>
          </div>

          {/* Botón para subir documentos si está PRESENTADO sin docs */}
          {item.status === 'PRESENTADO' && documentCount === 0 && !isExpanded && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleReplaceDocuments();
              }}
              className="w-full text-xs bg-amber-50 border-amber-300 hover:bg-amber-100 text-amber-900 flex items-center justify-center gap-2"
            >
              <Upload className="h-3 w-3" />
              Subir documentos ahora
            </Button>
          )}
        </div>

        {/* Dropdown de acciones para PRESENTADO - Solo visible si NO está expandido */}
        {item.status === 'PRESENTADO' && !isExpanded && (
          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-70 hover:opacity-100"
                  disabled={loadingDocs}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleViewDetails} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Ver detalles e historial
                </DropdownMenuItem>

                {documentCount > 0 && (
                  <>
                    <DropdownMenuItem onClick={handleDownloadAllDocuments} className="gap-2" disabled={loadingDocs}>
                      <Download className="h-4 w-4" />
                      Descargar documentos ({documentCount})
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleReplaceDocuments} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Reemplazar documentos
                    </DropdownMenuItem>
                  </>
                )}

                {documentCount === 0 && (
                  <>
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">
                      Sin documentos adjuntos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleReplaceDocuments} className="gap-2 text-blue-600">
                      <Upload className="h-4 w-4" />
                      Subir documentos ahora
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Detalles Expandidos */}
      {isExpanded && (
        <div className="mt-4 space-y-3 border-t pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Información del Modelo */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Información del Modelo
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <span className="ml-1 font-medium">{item.taxModelCode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <span className="ml-1 font-medium">{modelMeta?.name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Datos del Cliente
            </p>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Razón Social:</span>
                <span className="ml-1 font-medium">{item.clientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">NIF/CIF:</span>
                <span className="ml-1 font-mono font-medium">{item.nifCif}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ID Cliente:</span>
                <span className="ml-1 font-mono text-muted-foreground">{item.clientId}</span>
              </div>
            </div>
          </div>

          {/* Periodo */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Periodo Fiscal
            </p>
            <div className="text-xs">
              <span className="text-muted-foreground">Periodo:</span>
              <span className="ml-1 font-medium">{item.periodLabel || 'Sin asignar'}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">ID Periodo:</span>
              <span className="ml-1 font-mono text-muted-foreground">{item.periodId}</span>
            </div>
          </div>

          {/* Documentos adjuntos - Solo si está PRESENTADO */}
          {item.status === 'PRESENTADO' && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Documentos Adjuntos
                </p>
                {documentCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    {documentCount} archivo(s)
                  </Badge>
                )}
              </div>
              {documentCount === 0 ? (
                <div className="text-xs text-muted-foreground italic bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="flex items-center gap-2">
                    <Upload className="h-3 w-3" />
                    No hay documentos adjuntos todavía
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplaceDocuments();
                    }}
                    className="mt-2 w-full text-xs bg-white hover:bg-amber-100"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Subir documentos
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2">
                    <Paperclip className="h-3 w-3" />
                    {documentCount} documento(s) adjunto(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAllDocuments();
                      }}
                      disabled={loadingDocs}
                      className="flex-1 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Descargar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails();
                      }}
                      className="flex-1 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver detalles
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acciones - Botones para cambiar estado */}
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Cambiar Estado
            </p>
            {isPeriodClosed ? (
              <p className="text-xs text-muted-foreground italic">
                Este periodo está cerrado. No se pueden realizar cambios.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.status !== 'PENDIENTE' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeStatus('PENDIENTE');
                    }}
                    className="flex-1 text-xs"
                  >
                    → Pendiente
                  </Button>
                )}
                {item.status !== 'CALCULADO' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeStatus('CALCULADO');
                    }}
                    className="flex-1 text-xs"
                  >
                    → Calculado
                  </Button>
                )}
                {item.status !== 'PRESENTADO' && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeStatus('PRESENTADO');
                    }}
                    className="flex-1 text-xs"
                >
                  → Presentado
                </Button>
              )}
              </div>
            )}
          </div>

          {/* ID de tarjeta (para debug/soporte) */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            <span className="font-mono">ID: {item.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function VirtualColumn<T extends { id: string }>({ items, renderItem }: { items: T[]; renderItem: (it: T) => JSX.Element }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  
  // Desactivar virtualización para evitar problemas de z-index con tarjetas expandidas
  // Con virtualización, las tarjetas tienen position: absolute y se superponen
  if (items.length === 0) {
    return <div className="flex-1"><p className="mt-6 text-center text-xs text-muted-foreground">Sin asignaciones.</p></div>;
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto space-y-3">
      {items.map((item) => (
        <div key={item.id}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
