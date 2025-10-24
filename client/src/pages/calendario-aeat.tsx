import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { TAX_MODEL_METADATA } from "@shared/tax-rules";
import { CalendarDays, Filter, Plus, RotateCcw, Search, Trash2, KanbanSquare, FileText, AlertTriangle, AlarmClock, Clock3, Timer, CheckCircle2, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Row = {
  id: string;
  modelCode: string;
  period: string;
  year: number;
  startDate: string;
  endDate: string;
  status?: "PENDIENTE" | "ABIERTO" | "CERRADO";
  daysToStart: number | null;
  daysToEnd: number | null;
};

type Periodicity = "TODAS" | "MENSUAL" | "TRIMESTRAL" | "ANUAL" | "ESPECIAL";

export default function CalendarioAEATPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [periodicity, setPeriodicity] = useState<Periodicity>("TODAS");
  const [model, setModel] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PENDIENTE" | "ABIERTO" | "CERRADO">("TODOS");
  const [query, setQuery] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<{ modelCode: string; period: string; startDate: string; endDate: string }>({ modelCode: "", period: "", startDate: "", endDate: "" });
  const [draft, setDraft] = useState<Record<string, { startDate?: string; endDate?: string }>>({});
  const [sortKey, setSortKey] = useState<"model"|"period"|"start"|"end">("end");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const { data: rows = [], refetch } = useQuery<Row[]>({
    queryKey: ["/api/tax/calendar", year, periodicity, model, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("year", String(year));
      if (model && model !== 'ALL') params.set("model", model);
      if (periodicity === "MENSUAL") params.set("periodicity", "monthly");
      if (periodicity === "TRIMESTRAL") params.set("periodicity", "quarterly");
      if (periodicity === "ANUAL") params.set("periodicity", "annual");
      if (periodicity === "ESPECIAL") params.set("periodicity", "special");
      if (statusFilter !== 'TODOS') params.set('status', statusFilter);
      const res = await fetch(`/api/tax/calendar?${params.toString()}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el calendario");
      return res.json();
    },
    staleTime: 30_000,
  });

  const createYear = useMutation({
    mutationFn: async (y: number) => {
      return fetch(`/api/tax/calendar/create-year`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
        body: JSON.stringify({ year: y }),
      }).then((r) => { if(!r.ok) throw new Error("No se pudo crear el año"); return r.json(); });
    },
    onSuccess: () => refetch(),
  });

  const exportIcs = () => {
    window.open(`/api/tax/calendar/${year}.ics`, "_blank");
  };

  const seedYear = async () => {
    try {
      const body: any = { year };
      if (model && model !== 'ALL') body.model = model;
      if (periodicity && periodicity !== 'TODAS') {
        body.periodicity = periodicity === 'MENSUAL' ? 'monthly' : periodicity === 'TRIMESTRAL' ? 'quarterly' : periodicity === 'ANUAL' ? 'annual' : 'special';
      }
      const res = await fetch(`/api/tax/calendar/seed-year`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j?.error || ''; } catch {}
        throw new Error(detail || 'No se pudo sembrar el año');
      }
      const json = await res.json();
      toast({ title: 'Año sembrado', description: `${json.created} periodos generados` });
      refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const computeStatus = (r: Row): "PENDIENTE" | "ABIERTO" | "CERRADO" => {
    if (r.status === 'PENDIENTE' || r.status === 'ABIERTO' || r.status === 'CERRADO') return r.status;
    const now = new Date();
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    if (now > end) return 'CERRADO';
    if (now >= start) return 'ABIERTO';
    return 'PENDIENTE';
  };

  const counts = useMemo(() => {
    const c = { PENDIENTE: 0, ABIERTO: 0, CERRADO: 0 } as Record<"PENDIENTE"|"ABIERTO"|"CERRADO", number>;
    for (const r of rows) {
      const s = computeStatus(r);
      c[s] += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (statusFilter !== 'TODOS') {
      list = list.filter((r) => computeStatus(r) === statusFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'end') cmp = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      if (sortKey === 'start') cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (sortKey === 'model') cmp = a.modelCode.localeCompare(b.modelCode);
      if (sortKey === 'period') cmp = a.period.localeCompare(b.period);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(r => `${r.modelCode}`.toLowerCase().includes(q) || `${r.period}`.toLowerCase().includes(q));
  }, [rows, query, statusFilter]);

  const statusBadge = (r: Row) => {
    const s = computeStatus(r);
    if (s === 'PENDIENTE') return <Badge className="bg-red-100 text-red-700">PENDIENTE</Badge>;
    if (s === 'ABIERTO') return <Badge className="bg-amber-100 text-amber-700">ABIERTO</Badge>;
    return <Badge className="bg-gray-200 text-gray-700">CERRADO</Badge>;
  };

  // Colores e iconografía más vistosos para las cuentas atrás
  const renderStartCountdown = (r: Row) => {
    const now = new Date();
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    // Si ya empezó el periodo
    if (now >= start && now <= end) {
      return (
        <Badge className="bg-emerald-600 text-white inline-flex items-center">
          <Timer className="h-3 w-3 mr-1" /> En curso
        </Badge>
      );
    }
    const ds = r.daysToStart;
    if (ds == null) return '—';
    // Más vivo: <=3 rojo fuerte, <=7 naranja, >7 azul
    const cls = ds <= 3
      ? 'bg-red-600 text-white'
      : ds <= 7
        ? 'bg-orange-500 text-white'
        : 'bg-primary text-primary-foreground';
    const Icon = ds <= 3 ? AlertTriangle : ds <= 7 ? AlarmClock : Clock3;
    return (
      <Badge className={`${cls} inline-flex items-center`}>
        <Icon className="h-3 w-3 mr-1" /> {dayLabel(ds)}
      </Badge>
    );
  };

  const renderEndCountdown = (r: Row) => {
    const now = new Date();
    const end = new Date(r.endDate);
    if (now > end) {
      return (
        <Badge className="bg-gray-500 text-white inline-flex items-center">
          <XCircle className="h-3 w-3 mr-1" /> Vencido
        </Badge>
      );
    }
    const de = r.daysToEnd;
    if (de == null) return '—';
    // Más vivo: <=1 rojo intenso, <=3 rojo, <=7 ámbar, >7 verde
    const cls = de <= 1
      ? 'bg-red-700 text-white'
      : de <= 3
        ? 'bg-red-600 text-white'
        : de <= 7
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-600 text-white';
    const Icon = de <= 3 ? AlertTriangle : de <= 7 ? AlarmClock : CheckCircle2;
    return (
      <Badge className={`${cls} inline-flex items-center`}>
        <Icon className="h-3 w-3 mr-1" /> {dayLabel(de)}
      </Badge>
    );
  };

  const headerButton = (label: string, key: typeof sortKey) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
      }}
      className="text-left hover:underline inline-flex items-center gap-1"
    >
      <span>{label}</span>
      {sortKey === key ? <span className="text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span> : null}
    </button>
  );

  const dayLabel = (n: number | null) => n === null ? "—" : `${n} día${Math.abs(n) === 1 ? "" : "s"}`;

  const modelsList = useMemo(() => Object.entries(TAX_MODEL_METADATA).map(([code, meta]) => ({ code, name: meta.name })), []);
  // humanPeriod ya está definido más arriba

  const fmtInput = (iso: string) => {
    try {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    } catch { return ''; }
  };

  const patchDate = async (id: string) => {
    const d = draft[id];
    if (!d) return;
    const payload: any = {};
    if (d.startDate) payload.startDate = d.startDate;
    if (d.endDate) payload.endDate = d.endDate;
    if (!Object.keys(payload).length) return;
    const res = await fetch(`/api/tax/calendar/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('No se pudo actualizar');
    setDraft((prev) => { const n = { ...prev }; delete n[id]; return n; });
    refetch();
  };

  const createPeriod = async () => {
    try {
      if (!form.modelCode || !form.period || !form.startDate || !form.endDate) {
        throw new Error("Completa todos los campos");
      }
      const payload = { modelCode: form.modelCode.toUpperCase(), period: form.period.toUpperCase(), year, startDate: form.startDate, endDate: form.endDate };
      const res = await fetch(`/api/tax/calendar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detail = "";
        try { const j = await res.json(); detail = j?.error || ""; } catch {}
        throw new Error(detail || (res.status === 409 ? "Periodo duplicado (Modelo/Periodo/Año)" : "No se pudo crear el periodo"));
      }
      setIsDialogOpen(false);
      setForm({ modelCode: "", period: "", startDate: "", endDate: "" });
      toast({ title: "Periodo creado" });
      // Ajustar filtro para asegurar que el nuevo periodo se vea
      const p = payload.period;
      if (p === 'ANUAL') setPeriodicity('ANUAL');
      else if (/^[1234]T$/.test(p)) setPeriodicity('TRIMESTRAL');
      else if (/^M\d{2}$/.test(p)) setPeriodicity('MENSUAL');
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "", variant: "destructive" });
    }
  };

  const humanPeriod = (code: string) => {
    const map: Record<string, string> = {
      M01: 'Enero', M02: 'Febrero', M03: 'Marzo', M04: 'Abril', M05: 'Mayo', M06: 'Junio',
      M07: 'Julio', M08: 'Agosto', M09: 'Septiembre', M10: 'Octubre', M11: 'Noviembre', M12: 'Diciembre',
    };
    return map[code] || code;
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page header and sub-navigation */}
      <div className="space-y-4">
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

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Calendario fiscal AEAT</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">Gestiona los modelos oficiales con sus fechas de apertura y cierre.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Añadir periodo</Button>
              <Button variant="outline" onClick={seedYear} className="gap-2"><Filter className="h-4 w-4" /> Sembrar Año</Button>
              <Button variant="outline" onClick={() => createYear.mutate(year)} className="gap-2"><RotateCcw className="h-4 w-4" /> Nuevo año fiscal</Button>
              <Button variant="outline" onClick={exportIcs} className="gap-2">Exportar .ICS</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Año</span>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24 h-9" />
            </div>
            <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Periodicidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="MENSUAL">Mensual</SelectItem>
                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                <SelectItem value="ANUAL">Anual</SelectItem>
                <SelectItem value="ESPECIAL">Especial 202</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="ABIERTO">Abierto</SelectItem>
                <SelectItem value="CERRADO">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-60 h-9"><SelectValue placeholder="Filtrar por modelo (ej. 303)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los modelos</SelectItem>
                {modelsList.map((m) => (<SelectItem key={m.code} value={m.code}>{m.code} · {m.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 w-64 h-9" placeholder="Buscar modelo o periodo" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Badge className="bg-red-100 text-red-700">Pendiente {counts.PENDIENTE}</Badge>
              <Badge className="bg-amber-100 text-amber-700">Abierto {counts.ABIERTO}</Badge>
              <Badge className="bg-gray-200 text-gray-700">Cerrado {counts.CERRADO}</Badge>
            </div>
          </div>

          {/* Table header */}
          {filtered.length > 0 ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-8 text-xs text-muted-foreground px-2">
                <div>{headerButton('Modelo','model')}</div>
                <div>{headerButton('Periodo','period')}</div>
                <div>Estado</div>
                <div>{headerButton('Fecha inicio','start')}</div>
                <div>Inicio en</div>
                <div>{headerButton('Fecha fin','end')}</div>
                <div>Finaliza en</div>
                <div>Activo</div>
              </div>
              {filtered.map((r) => {
                const d = draft[r.id] || {};
                const startVal = d.startDate ?? fmtInput(r.startDate);
                const endVal = d.endDate ?? fmtInput(r.endDate);
                const status = computeStatus(r);
                const leftBorder = status === 'PENDIENTE' ? 'border-l-4 border-l-red-400' : status === 'ABIERTO' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-gray-400';
                return (
                  <div key={r.id} className={`grid grid-cols-8 items-center rounded-lg border p-3 bg-card/50 hover:bg-card transition group ${leftBorder}`}>
                    <div className="font-medium flex items-center gap-2"><Badge variant="outline" className="bg-muted">{r.modelCode}</Badge></div>
                    <div>{humanPeriod(r.period)} / {r.year}</div>
                    <div>{statusBadge(r)}</div>
                    <div>
                      <Input type="date" value={startVal} onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...prev[r.id], startDate: e.target.value } }))} onBlur={() => patchDate(r.id)} className="h-8" />
                    </div>
                    <div>{renderStartCountdown(r)}</div>
                    <div>
                      <Input type="date" value={endVal} onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...prev[r.id], endDate: e.target.value } }))} onBlur={() => patchDate(r.id)} className="h-8" />
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <span>{renderEndCountdown(r)}</span>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={async () => {
                        const ok = window.confirm('¿Eliminar este periodo?');
                        if (!ok) return;
                        try {
                          const res = await fetch(`/api/tax/calendar/${encodeURIComponent(r.id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, credentials: 'include' });
                          if (!res.ok && res.status !== 204) throw new Error('No se pudo eliminar');
                          toast({ title: 'Periodo eliminado' });
                          refetch();
                        } catch (e: any) {
                          toast({ title: 'Error', description: e?.message ?? '', variant: 'destructive' });
                        }
                      }} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={true}
                        onCheckedChange={async (checked) => {
                          try {
                            const res = await fetch(`/api/tax/calendar/${encodeURIComponent(r.id)}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                              credentials: 'include',
                              body: JSON.stringify({ active: checked }),
                            });
                            if (!res.ok) throw new Error('No se pudo actualizar');
                            refetch();
                          } catch (e: any) {
                            toast({ title: 'Error', description: e?.message ?? '', variant: 'destructive' });
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground border rounded-xl">
              <p>No hay periodos configurados para este año.</p>
              <p className="mt-1">Utiliza el botón <span className="font-medium">“Añadir periodo”</span> para empezar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear periodo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs">Modelo</label>
                <Select value={form.modelCode || undefined} onValueChange={(v) => setForm({ ...form, modelCode: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {modelsList.map((m) => (<SelectItem key={m.code} value={m.code}>{m.code} · {m.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs">Periodo</label>
                <Select value={form.period || undefined} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`).map((m) => (
                      <SelectItem key={m} value={m}>{humanPeriod(m)}</SelectItem>
                    ))}
                    {["1T","2T","3T","4T"].map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs">Fecha inicio</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs">Fecha fin</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={createPeriod}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
