import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, KanbanSquare, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Impuestos() {
  const [, navigate] = useLocation();
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Impuestos</h1>
        <p className="text-muted-foreground mt-1">Gestión fiscal centralizada</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-muted/40 rounded-xl p-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => navigate("/impuestos/control")}>
          <CardContent className="p-4 flex items-center gap-4">
            <KanbanSquare className="h-6 w-6" />
            <div>
              <p className="font-semibold">Impuestos 360</p>
              <p className="text-sm text-muted-foreground">Tablero Kanban de presentaciones</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => navigate("/impuestos/calendario") }>
          <CardContent className="p-4 flex items-center gap-4">
            <FileText className="h-6 w-6" />
            <div>
              <p className="font-semibold">Calendario AEAT</p>
              <p className="text-sm text-muted-foreground">Periodos oficiales y vencimientos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => navigate("/impuestos/reportes") }>
          <CardContent className="p-4 flex items-center gap-4">
            <BarChart2 className="h-6 w-6" />
            <div>
              <p className="font-semibold">Reportes</p>
              <p className="text-sm text-muted-foreground">KPIs, resúmenes y exportes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
