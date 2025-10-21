import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ClientType, TaxPeriodicity } from "@shared/tax-rules";
import type { ClientTaxAssignment, TaxAssignmentPayload, TaxModelsConfig } from "./types";
import { getAllowedPeriods, getCompatibleTaxModels, getTaxModelName } from "./validators";

interface TaxAssignmentDialogProps {
  open: boolean;
  mode: "create" | "edit";
  clientType: ClientType;
  assignedCodes: string[];
  taxModelsConfig: TaxModelsConfig[];
  assignment?: ClientTaxAssignment | null;
  onClose: () => void;
  onSubmit: (payload: TaxAssignmentPayload, assignmentId?: string) => Promise<void>;
  isSubmitting: boolean;
}

const schema = z
  .object({
    taxModelCode: z.string().min(1, "Selecciona un modelo"),
    periodicity: z.string().min(1, "Selecciona la periodicidad"),
    startDate: z
      .string()
      .min(1, "La fecha de alta es obligatoria")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Fecha de alta inválida"),
    endDate: z
      .string()
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Fecha de baja inválida"),
    activeFlag: z.boolean(),
    notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate) {
      const start = Date.parse(data.startDate);
      const end = Date.parse(data.endDate);
      if (end < start) {
        ctx.addIssue({
          path: ["endDate"],
          code: z.ZodIssueCode.custom,
          message: "La fecha de baja debe ser posterior a la fecha de alta",
        });
      }
    }
  });

type TaxAssignmentFormValues = z.infer<typeof schema>;

function formatDateForInput(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PERIODICITY_LABELS: Record<TaxPeriodicity, string> = {
  ANUAL: "Anual",
  TRIMESTRAL: "Trimestral",
  MENSUAL: "Mensual",
  ESPECIAL_FRACCIONADO: "Pagos fraccionados (Abr/Oct/Dic)",
};

export function TaxAssignmentDialog({
  open,
  mode,
  clientType,
  assignedCodes,
  taxModelsConfig,
  assignment,
  onClose,
  onSubmit,
  isSubmitting,
}: TaxAssignmentDialogProps) {
  const form = useForm<TaxAssignmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      taxModelCode: assignment?.taxModelCode ?? "",
      periodicity: assignment?.periodicity ?? "",
      startDate: formatDateForInput(assignment?.startDate) || "",
      endDate: formatDateForInput(assignment?.endDate) || "",
      activeFlag: assignment ? assignment.activeFlag && !assignment.endDate : true,
      notes: assignment?.notes ?? "",
    },
  });

  const currentAssignedCodes = useMemo(() => {
    if (mode === "edit" && assignment) {
      return assignedCodes.filter((code) => code !== assignment.taxModelCode);
    }
    return assignedCodes;
  }, [assignedCodes, assignment, mode]);

  const compatibleModels = useMemo(() => {
    return getCompatibleTaxModels(clientType, taxModelsConfig).filter(
      (config) => !currentAssignedCodes.includes(config.code)
    );
  }, [clientType, taxModelsConfig, currentAssignedCodes]);

  const selectedModelCode = form.watch("taxModelCode");
  const allowedPeriods = getAllowedPeriods(selectedModelCode, taxModelsConfig);
  const selectedPeriodicity = form.watch("periodicity");
  const endDateValue = form.watch("endDate");
  const activeValue = form.watch("activeFlag");

  useEffect(() => {
    if (!open) {
      form.reset({
        taxModelCode: assignment?.taxModelCode ?? "",
        periodicity: assignment?.periodicity ?? "",
        startDate: formatDateForInput(assignment?.startDate) || "",
        endDate: formatDateForInput(assignment?.endDate) || "",
        activeFlag: assignment ? assignment.activeFlag && !assignment.endDate : true,
        notes: assignment?.notes ?? "",
      });
      return;
    }
    if (!assignment && compatibleModels.length > 0) {
      form.setValue("taxModelCode", compatibleModels[0].code);
      const periods = getAllowedPeriods(compatibleModels[0].code, taxModelsConfig);
      if (periods.length > 0) {
        form.setValue("periodicity", periods[0]);
      }
      if (!form.getValues("startDate")) {
        form.setValue("startDate", formatDateForInput(new Date()));
      }
    }
  }, [open, assignment, compatibleModels, taxModelsConfig, form]);

  useEffect(() => {
    if (selectedModelCode) {
      const periods = getAllowedPeriods(selectedModelCode, taxModelsConfig);
      if (periods.length > 0 && !periods.includes(selectedPeriodicity as TaxPeriodicity)) {
        form.setValue("periodicity", periods[0]);
      }
    }
  }, [selectedModelCode, selectedPeriodicity, form, taxModelsConfig]);

  useEffect(() => {
    if (endDateValue) {
      if (activeValue) {
        form.setValue("activeFlag", false);
      }
    }
  }, [endDateValue, activeValue, form]);

  const modelLabels = useMemo(() => {
    const periods = getAllowedPeriods(selectedModelCode, taxModelsConfig);
    const labels = taxModelsConfig.find((config) => config.code === selectedModelCode)?.labels;
    return { periods, labels };
  }, [selectedModelCode, taxModelsConfig]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: TaxAssignmentPayload = {
      taxModelCode: values.taxModelCode,
      periodicity: values.periodicity as TaxPeriodicity,
      startDate: values.startDate,
      endDate: values.endDate ? values.endDate : null,
      activeFlag: values.endDate ? false : values.activeFlag,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    await onSubmit(payload, assignment?.id);
    onClose();
  });

  const modelName = selectedModelCode
    ? getTaxModelName(selectedModelCode, taxModelsConfig)
    : null;

  return (
    <Dialog open={open} onOpenChange={(value) => !isSubmitting && !value ? onClose() : undefined}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Añadir impuesto" : `Editar modelo ${selectedModelCode || ""}`}
          </DialogTitle>
          <DialogDescription>
            Gestiona los modelos fiscales asignados a este cliente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="taxModelCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <Select
                    disabled={isSubmitting || compatibleModels.length === 0}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value.toUpperCase())}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {compatibleModels.map((model) => (
                        <SelectItem value={model.code} key={model.code}>
                          {model.code} — {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="periodicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodicidad</FormLabel>
                  <Select
                    disabled={isSubmitting || allowedPeriods.length === 0}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value.toUpperCase())}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona periodicidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedPeriods.map((period) => (
                        <SelectItem value={period} key={period}>
                          {PERIODICITY_LABELS[period]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modelLabels.labels && modelLabels.labels.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Presentaciones en: {modelLabels.labels.join(", ")}
                    </p>
                  )}
                  {selectedPeriodicity && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPeriodicity === "MENSUAL" && "Se generarán periodos M01..M12 cada año."}
                      {selectedPeriodicity === "TRIMESTRAL" && "Se generarán 1T, 2T, 3T y 4T cada año."}
                      {selectedPeriodicity === "ANUAL" && "Una presentación anual por ejercicio."}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de alta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de baja</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value || "")}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="activeFlag"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Activo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      El impuesto permanecerá activo mientras no tenga fecha de baja.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={Boolean(endDateValue) || isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={modelName ? `Notas internas sobre el modelo ${modelName}` : "Notas internas"}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || compatibleModels.length === 0}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
