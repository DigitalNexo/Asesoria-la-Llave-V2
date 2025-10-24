import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { ClientType } from "@shared/tax-rules";
import type {
  ClientTaxAssignment,
  TaxAssignmentPayload,
  TaxModelsConfig,
} from "./types";
import { TaxAssignmentDialog } from "./TaxAssignmentDialog";
import { TaxAssignmentRow } from "./TaxAssignmentRow";
import {
  createTaxAssignment,
  deleteTaxAssignment,
  updateTaxAssignment,
  bulkDeleteTaxAssignments,
} from "./api";

interface ClientFiscalFormProps {
  clientId?: string;
  clientType: ClientType;
  assignments: ClientTaxAssignment[];
  taxModelsConfig: TaxModelsConfig[];
  onAssignmentsChange: (updater: (prev: ClientTaxAssignment[]) => ClientTaxAssignment[]) => void;
  disabled?: boolean;
}

function sortAssignments(assignments: ClientTaxAssignment[]): ClientTaxAssignment[] {
  return [...assignments].sort((a, b) => {
    const dateDiff = new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return a.taxModelCode.localeCompare(b.taxModelCode);
  });
}

export function ClientFiscalForm({
  clientId,
  clientType,
  assignments,
  taxModelsConfig,
  onAssignmentsChange,
  disabled,
}: ClientFiscalFormProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [focusedAssignment, setFocusedAssignment] = useState<ClientTaxAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientTaxAssignment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hardDelete, setHardDelete] = useState<boolean>(true);

  const assignedCodes = useMemo(
    () => assignments.map((assignment) => assignment.taxModelCode),
    [assignments]
  );

  const createMutation = useMutation({
    mutationFn: async (payload: TaxAssignmentPayload) => {
      if (!clientId) {
        throw new Error("El cliente debe guardarse antes de añadir impuestos");
      }
      return await createTaxAssignment(clientId, payload);
    },
    onSuccess: (newAssignment) => {
      onAssignmentsChange((prev) => sortAssignments([...prev, newAssignment]));
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
      }
      toast({
        title: "Impuesto asignado",
        description: `El modelo ${newAssignment.taxModelCode} se asignó correctamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "No se pudo asignar el impuesto",
        description: error?.message ?? "Intenta de nuevo más tarde",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      payload,
    }: {
      assignmentId: string;
      payload: Partial<TaxAssignmentPayload> & { activeFlag?: boolean };
    }) => {
      return await updateTaxAssignment(assignmentId, payload);
    },
    onSuccess: (updatedAssignment) => {
      onAssignmentsChange((prev) =>
        sortAssignments(
          prev.map((assignment) =>
            assignment.id === updatedAssignment.id ? updatedAssignment : assignment
          )
        )
      );
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
      }
      toast({
        title: "Asignación actualizada",
        description: `Modelo ${updatedAssignment.taxModelCode} actualizado correctamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "No se pudo actualizar el impuesto",
        description: error?.message ?? "Intenta de nuevo más tarde",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      // Respeta el switch de "Borrado definitivo"
      return await deleteTaxAssignment(assignmentId, hardDelete);
    },
    onSuccess: (result) => {
      if (result.softDeleted) {
        onAssignmentsChange((prev) =>
          sortAssignments(
            prev.map((assignment) =>
              assignment.id === result.assignment.id ? result.assignment : assignment
            )
          )
        );
        if (clientId) {
          queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
        }
        toast({
          title: "Asignación desactivada",
          description: result.message,
        });
      } else {
        onAssignmentsChange((prev) =>
          prev.filter((assignment) => assignment.id !== result.assignment.id)
        );
        toast({
          title: "Asignación eliminada",
          description: result.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "No se pudo eliminar el impuesto",
        description: error?.message ?? "Intenta de nuevo más tarde",
        variant: "destructive",
      });
    },
  });

  const handleOpenCreate = () => {
    setDialogMode("create");
    setFocusedAssignment(null);
    setDialogOpen(true);
  };

  const handleEdit = (assignment: ClientTaxAssignment) => {
    setDialogMode("edit");
    setFocusedAssignment(assignment);
    setDialogOpen(true);
  };

  const handleDelete = (assignment: ClientTaxAssignment) => {
    setDeleteTarget(assignment);
  };

  const handleToggleActive = (assignment: ClientTaxAssignment, nextActive: boolean) => {
    updateMutation.mutate({
      assignmentId: assignment.id,
      payload: { activeFlag: nextActive },
    });
  };

  const isProcessing = createMutation.isPending || updateMutation.isPending;

  const toggleSelect = (checked: boolean, assignment: ClientTaxAssignment) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(assignment.id);
      else next.delete(assignment.id);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asignaciones fiscales</CardTitle>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCreate} disabled={!clientId || disabled}>
            Añadir impuesto
          </Button>
          <div className="flex items-center gap-2 pl-2 border-l">
            <Switch id="hard-delete" checked={hardDelete} onCheckedChange={setHardDelete} />
            <Label htmlFor="hard-delete" className="text-xs text-muted-foreground">Borrado definitivo</Label>
          </div>
          <Button
            variant="outline"
            disabled={!clientId || disabled || assignments.length === 0}
            onClick={async () => {
              if (!clientId) return;
              const ok = window.confirm('¿Eliminar todas las asignaciones fiscales de este cliente? Los modelos con histórico se desactivarán.');
              if (!ok) return;
              try {
                const res = await bulkDeleteTaxAssignments(clientId, { hard: hardDelete });
                if (Array.isArray(res.assignments)) {
                  onAssignmentsChange(() => res.assignments!);
                } else {
                  onAssignmentsChange(() => []);
                }
                queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
                toast({ title: 'Limpieza completada', description: `${res.deleted} eliminadas, ${res.deactivated} desactivadas` });
              } catch (e: any) {
                toast({ title: 'Error', description: e?.message ?? 'No se pudo limpiar', variant: 'destructive' });
              }
            }}
          >
            Borrar modelos
          </Button>
          <Button
            variant="destructive"
            disabled={!clientId || disabled || selectedIds.size === 0}
            onClick={async () => {
              if (!clientId) return;
              const ids = Array.from(selectedIds);
              const ok = window.confirm(`¿Eliminar/desactivar modelos seleccionados? (${ids.length} registros)`);
              if (!ok) return;
              try {
                const res = await bulkDeleteTaxAssignments(clientId, { assignmentIds: ids, hard: hardDelete });
                setSelectedIds(new Set());
                if (Array.isArray(res.assignments)) {
                  onAssignmentsChange(() => res.assignments!);
                } else {
                  queryClient.invalidateQueries({ queryKey: ["client-detail", clientId] });
                }
                toast({ title: 'Selección procesada', description: `${res.deleted} eliminadas, ${res.deactivated} desactivadas` });
              } catch (e: any) {
                toast({ title: 'Error', description: e?.message ?? 'No se pudo procesar la selección', variant: 'destructive' });
              }
            }}
          >
            Borrar seleccionados
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!clientId ? (
          <p className="text-sm text-muted-foreground">
            Guarda los datos del cliente para gestionar sus modelos fiscales.
          </p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay impuestos asignados. Añade un modelo fiscal para empezar a controlar sus
            obligaciones.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Periodicidad</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead>Baja</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TaxAssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    selectable
                    selected={selectedIds.has(assignment.id)}
                    onSelectChange={toggleSelect}
                    disabled={disabled || updateMutation.isPending || deleteMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <TaxAssignmentDialog
        open={dialogOpen}
        mode={dialogMode}
        clientType={clientType}
        assignedCodes={assignedCodes}
        taxModelsConfig={taxModelsConfig}
        assignment={focusedAssignment}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (payload, assignmentId) => {
          if (dialogMode === "create") {
            await createMutation.mutateAsync(payload);
          } else if (assignmentId) {
            await updateMutation.mutateAsync({ assignmentId, payload });
          }
        }}
        isSubmitting={isProcessing}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar asignación fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la asignación del modelo{" "}
              <strong>{deleteTarget?.taxModelCode}</strong>. Si existen históricos, se dará de baja
              automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Borrado definitivo</p>
              <p className="text-xs text-muted-foreground">Si está activado, se eliminará también el histórico asociado a este modelo.</p>
            </div>
            <Switch checked={hardDelete} onCheckedChange={setHardDelete} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
