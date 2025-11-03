/**
 * API functions for tax calendar import/export
 */

interface ImportResult {
  imported: number;
  errors: string[];
  duplicates: string[];
  success: boolean;
}

/**
 * Download the Excel template for calendar import
 */
export async function downloadTemplate(): Promise<void> {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/tax/calendar/download-template", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al descargar la plantilla" }));
    throw new Error(error.error || "No se pudo descargar la plantilla");
  }

  // Descargar el archivo
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-calendario-fiscal.xlsx";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Import tax calendar periods from an Excel file
 */
export async function importExcelFile(file: File): Promise<ImportResult> {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/tax/calendar/import-excel", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    // Si hay errores de validación, retornar el resultado parcial
    if (data.result) {
      return data.result;
    }
    throw new Error(data.error || "Error al importar el archivo");
  }

  return data.result;
}
