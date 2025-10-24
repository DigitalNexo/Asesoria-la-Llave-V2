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
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanSquare, FileText } from "lucide-react";
import { TAX_MODEL_METADATA } from "@shared/tax-rules";

type BoardStatus = "PENDIENTE" | "CALCULADO" | "PRESENTADO";

interface FilingCard {
  id: string;
  clientId: string;
  clientName: string;
  nifCif: string;
  taxModelCode: string;
  periodId: string;
  periodLabel: string | null;
  status: BoardStatus;
}

export default function ImpuestosControl() {
  const { toast } = useToast();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [clientId, setClientId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BoardStatus>("all");
  const [modelCode, setModelCode] = useState<string>("");
  const [gestorId, setGestorId] = useState<string>("");
  const [periodId, setPeriodId] = useState<string>("");
  const [periodicity, setPeriodicity] = useState<"ANNUAL" | "QUARTERLY" | "SPECIAL">("QUARTERLY");

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const clientsQuery = useQuery<any[]>({
    queryKey: ["/api/clients"],
    staleTime: 60_000,
  });

  const filingsQuery = useQuery<FilingCard[]>({
    queryKey: ["/api/tax/filings", year, clientId, statusFilter, modelCode, gestorId, periodId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("year", String(year));
      if (clientId && clientId !== 'all') params.set("clientId", clientId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (modelCode && modelCode !== 'ALL') params.set("model", modelCode);
      if (gestorId) params.set("gestorId", gestorId);
      if (periodId) params.set("periodId", periodId);
      // Nota: si más adelante añadimos periodId, aquí se incluye
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
  const modelsList = useMemo(() => Object.entries(TAX_MODEL_METADATA).map(([code, meta]) => ({ code, name: meta.name })), []);

  const board = useMemo(() => {
    const col: Record<BoardStatus, FilingCard[]> = {
      PENDIENTE: [], CALCULADO: [], PRESENTADO: [],
    };
    rows.forEach((r) => {
      const st = normalizeStatus((r as any).status);
      if (statusFilter === "all" || st === statusFilter) {
        const key: BoardStatus = st in col ? st : "PENDIENTE";
        col[key].push({ ...r, status: key });
      }
    });
    return col;
  }, [rows, statusFilter]);

  const onDragEnd = (evt: DragEndEvent) => {
    const activeId = String(evt.active.id);
    const overId = evt.over?.id as BoardStatus | undefined;
    if (!overId) return;
    const current = rows.find((r) => r.id === activeId);
    if (!current || current.status === overId) return;

    // Optimistic UI (actualiza todas las queries de /api/tax/filings)
    queryClient.setQueriesData<FilingCard[] | undefined>({ queryKey: ["/api/tax/filings"], exact: false }, (prev) => {
      if (!Array.isArray(prev)) return prev as any;
      return prev.map((p) => (p.id === current.id ? { ...p, status: overId } : p));
    });

    if (overId === "PRESENTADO") {
      const value = window.prompt("Fecha de presentación (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
      patchMutation.mutate({ id: current.id, status: overId, presentedAt: value || undefined });
    } else {
      if (current.status === "PRESENTADO") {
        const reason = window.prompt("Motivo del cambio de estado (salir de Presentado)");
        patchMutation.mutate({ id: current.id, status: overId, presentedAt: null });
        return;
      }
      patchMutation.mutate({ id: current.id, status: overId });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Impuestos</h1>
          <p className="text-sm text-muted-foreground">Seguimiento y planificación fiscal con la misma experiencia consistente que Administración.</p>
        </div>
        {(() => {
          const [location, navigate] = useLocation();
          const current = location?.startsWith('/impuestos/calendario') ? 'calendar' : 'control';
          return (
            <Tabs value={current} className="">
              <TabsList className="h-auto grid grid-cols-2 md:grid-cols-3 gap-1 p-1">
                <TabsTrigger value="control" onClick={() => navigate('/impuestos/control')}>
                  <KanbanSquare className="h-4 w-4 mr-2" /> Control de impuestos
                </TabsTrigger>
                <TabsTrigger value="calendar" onClick={() => navigate('/impuestos/calendario')}>
                  <FileText className="h-4 w-4 mr-2" /> Calendario fiscal
                </TabsTrigger>
                <TabsTrigger value="reports" onClick={() => navigate('/impuestos/reportes')}>
                  <FileText className="h-4 w-4 mr-2" /> Reportes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          );
        })()}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Impuestos 360</h2>
          <p className="text-sm text-muted-foreground">Tablero de presentaciones fiscales</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
          <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Periodicidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="QUARTERLY">Trimestral</SelectItem>
              <SelectItem value="ANNUAL">Anual</SelectItem>
              <SelectItem value="SPECIAL">Especial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {(periodsQuery.data ?? [])
                .filter((p) => p.kind === periodicity)
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} id={item.id} {...listeners} {...attributes} style={style} className={`rounded-lg border bg-white p-3 shadow-sm ${isDragging ? 'opacity-80 ring-1 ring-primary/50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{item.clientName}</p>
        <Badge className={`text-xs ${badgeClass}`}>{item.taxModelCode}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{item.periodLabel ?? "Periodo"}</span>
        <span>{item.nifCif}</span>
      </div>
    </div>
  );
}

function VirtualColumn<T>({ items, renderItem }: { items: T[]; renderItem: (it: T) => JSX.Element }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 8,
  });

  if (items.length === 0) {
    return <div className="flex-1"><p className="mt-6 text-center text-xs text-muted-foreground">Sin asignaciones.</p></div>;
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((row) => (
          <div key={row.key} data-index={row.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}>
            {renderItem(items[row.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
