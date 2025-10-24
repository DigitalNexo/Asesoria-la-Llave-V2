import { useState, useMemo } from 'react';
import { useFilings, ReportsFilters } from './useReportsApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { statusBadgeClass, fmtDate } from './utils';

export default function DetailTable({ filters }: { filters: ReportsFilters }) {
  const [page, setPage] = useState(1);
  const size = 50;
  const { data, isLoading } = useFilings({ ...filters, page, size });
  const total = (data as any)?.total ?? 0;
  const items = (data as any)?.items ?? [];
  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{total} resultados</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page<=1} onClick={()=> setPage((p)=>Math.max(1,p-1))}>Anterior</Button>
          <div className="text-sm">{page}/{pages}</div>
          <Button variant="outline" size="sm" disabled={page>=pages} onClick={()=> setPage((p)=>Math.min(pages,p+1))}>Siguiente</Button>
        </div>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha cálculo</TableHead>
              <TableHead>Fecha presentación</TableHead>
              <TableHead>Días ciclo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : (
              items.map((r:any)=> (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={()=> window.location.href = '/impuestos/calendario'}>
                  <TableCell className="font-medium">{r.modelCode}</TableCell>
                  <TableCell>{r.periodLabel}</TableCell>
                  <TableCell>{r.gestor || '—'}</TableCell>
                  <TableCell>{r.cliente || '—'}</TableCell>
                  <TableCell><Badge className={statusBadgeClass(r.status)}>{String(r.status).toUpperCase()}</Badge></TableCell>
                  <TableCell>{fmtDate(undefined)}</TableCell>
                  <TableCell>{fmtDate(r.presentedAt)}</TableCell>
                  <TableCell>{r.cycleDays ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
