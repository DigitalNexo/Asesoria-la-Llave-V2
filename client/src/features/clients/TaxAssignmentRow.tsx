import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { ClientTaxAssignment } from "./types";
import { getEffectiveActiveState } from "./validators";

interface TaxAssignmentRowProps {
  assignment: ClientTaxAssignment;
  onEdit: (assignment: ClientTaxAssignment) => void;
  onDelete: (assignment: ClientTaxAssignment) => void;
  onToggleActive: (assignment: ClientTaxAssignment, nextActive: boolean) => void;
  disabled?: boolean;
}

const PERIODICITY_BADGE: Record<string, string> = {
  ANUAL: "default",
  TRIMESTRAL: "secondary",
  MENSUAL: "outline",
  ESPECIAL_FRACCIONADO: "destructive",
};

const PERIODICITY_LABEL: Record<string, string> = {
  ANUAL: "Anual",
  TRIMESTRAL: "Trimestral",
  MENSUAL: "Mensual",
  ESPECIAL_FRACCIONADO: "Especial fraccionado",
};

function formatDisplayDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function TaxAssignmentRow({
  assignment,
  onEdit,
  onDelete,
  onToggleActive,
  disabled,
}: TaxAssignmentRowProps) {
  const effectiveActive = getEffectiveActiveState(assignment);
  const periodicity = assignment.periodicity;
  const badgeVariant = PERIODICITY_BADGE[periodicity] ?? "default";
  const periodicityLabel = PERIODICITY_LABEL[periodicity] ?? periodicity;
  const hasEndDate = Boolean(assignment.endDate);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>{`${assignment.taxModelCode}`}</span>
          {assignment.taxModel?.name && (
            <span className="text-xs text-muted-foreground">{assignment.taxModel.name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={badgeVariant as any}>{periodicityLabel}</Badge>
      </TableCell>
      <TableCell>{formatDisplayDate(assignment.startDate)}</TableCell>
      <TableCell>{formatDisplayDate(assignment.endDate)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={effectiveActive}
            disabled={disabled || hasEndDate}
            onCheckedChange={(value) => onToggleActive(assignment, value)}
          />
          <span className="text-sm text-muted-foreground">
            {effectiveActive ? "Activo" : hasEndDate ? "Baja" : "Inactivo"}
          </span>
        </div>
      </TableCell>
      <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
        {assignment.notes || "—"}
      </TableCell>
      <TableCell className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onEdit(assignment)}
          disabled={disabled}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(assignment)}
          disabled={disabled}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
