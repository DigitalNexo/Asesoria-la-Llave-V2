import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from './utils';

type ExceptionsData = {
  duplicateFilings?: Array<{ key: string; count: number }>;
  latePresented?: Array<{
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodId: string;
    dueDate: string;
    presentedAt: string;
  }>;
  overdueFilings?: Array<{
    clientId: string;
    clientName: string;
    taxModelCode: string;
    periodId: string;
    dueDate: string;
  }>;
};

export default function AlertsPanel({ data, isLoading }: { data?: ExceptionsData; isLoading: boolean }) {
  const duplicate = data?.duplicateFilings ?? [];
  const late = data?.latePresented ?? [];
  const overdue = data?.overdueFilings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas y excepciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {isLoading ? (
          <div>Cargando alertas…</div>
        ) : (
          <>
            <Section
              title="Vencidas sin presentar"
              emptyLabel="Sin vencidos"
              badgeClass="bg-destructive/10 text-destructive"
              items={overdue.map((item) => ({
                id: `${item.clientId}-${item.taxModelCode}-${item.periodId}`,
                title: `${item.clientName}`,
                description: `${item.taxModelCode} · Venció ${fmtDate(item.dueDate)}`,
              }))}
            />
            <Section
              title="Presentadas fuera de plazo"
              emptyLabel="Sin retrasos"
              badgeClass="bg-amber-100 text-amber-700"
              items={late.map((item) => ({
                id: `${item.clientId}-${item.taxModelCode}-${item.periodId}`,
                title: `${item.clientName}`,
                description: `${item.taxModelCode} · entregada ${fmtDate(item.presentedAt)} (límite ${fmtDate(item.dueDate)})`,
              }))}
            />
            <Section
              title="Duplicados detectados"
              emptyLabel="Sin duplicados"
              badgeClass="bg-blue-100 text-blue-700"
              items={duplicate.map((dup) => ({
                id: dup.key,
                title: dup.key,
                description: `${dup.count} registros`,
              }))}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  items,
  emptyLabel,
  badgeClass,
}: {
  title: string;
  items: Array<{ id: string; title: string; description: string }>;
  emptyLabel: string;
  badgeClass: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{title}</span>
        <Badge className={badgeClass}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs">{emptyLabel}</div>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2">
              <div className="font-medium text-foreground">{item.title}</div>
              <div className="text-xs">{item.description}</div>
            </div>
          ))}
          {items.length > 6 && (
            <div className="text-xs text-muted-foreground">+{items.length - 6} registros adicionales</div>
          )}
        </div>
      )}
    </div>
  );
}

