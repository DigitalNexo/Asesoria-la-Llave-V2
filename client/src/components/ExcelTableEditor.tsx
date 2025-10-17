import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus } from "lucide-react";

interface ExcelTableEditorProps {
  initialData?: string[][];
  onSave: (data: string[][]) => void;
  onCancel: () => void;
}

export function ExcelTableEditor({ initialData, onSave, onCancel }: ExcelTableEditorProps) {
  const [numRows, setNumRows] = useState(initialData?.length || 3);
  const [numCols, setNumCols] = useState(initialData?.[0]?.length || 3);
  const [tableData, setTableData] = useState<string[][]>(
    initialData || Array(3).fill(null).map(() => Array(3).fill(""))
  );

  useEffect(() => {
    if (initialData) {
      setTableData(initialData);
      setNumRows(initialData.length);
      setNumCols(initialData[0]?.length || 3);
    }
  }, [initialData]);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = value;
    setTableData(newData);
  };

  const addRow = () => {
    const newData = [...tableData, Array(numCols).fill("")];
    setTableData(newData);
    setNumRows(numRows + 1);
  };

  const removeRow = () => {
    if (numRows > 1) {
      const newData = tableData.slice(0, -1);
      setTableData(newData);
      setNumRows(numRows - 1);
    }
  };

  const addColumn = () => {
    const newData = tableData.map(row => [...row, ""]);
    setTableData(newData);
    setNumCols(numCols + 1);
  };

  const removeColumn = () => {
    if (numCols > 1) {
      const newData = tableData.map(row => row.slice(0, -1));
      setTableData(newData);
      setNumCols(numCols - 1);
    }
  };

  const handleSave = () => {
    onSave(tableData);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 items-center">
          <Label className="text-sm">Filas:</Label>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={removeRow}
            disabled={numRows <= 1}
            className="h-8 w-8"
            data-testid="button-remove-row"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input 
            type="number" 
            value={numRows} 
            readOnly 
            className="w-16 h-8 text-center"
          />
          <Button 
            size="icon" 
            variant="outline" 
            onClick={addRow}
            className="h-8 w-8"
            data-testid="button-add-row"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 items-center">
          <Label className="text-sm">Columnas:</Label>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={removeColumn}
            disabled={numCols <= 1}
            className="h-8 w-8"
            data-testid="button-remove-column"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input 
            type="number" 
            value={numCols} 
            readOnly 
            className="w-16 h-8 text-center"
          />
          <Button 
            size="icon" 
            variant="outline" 
            onClick={addColumn}
            className="h-8 w-8"
            data-testid="button-add-column"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-auto max-h-[400px]" data-testid="excel-table-grid">
        <table className="w-full border-collapse">
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border p-0">
                    <Input
                      value={cell}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      data-testid={`cell-${rowIndex}-${colIndex}`}
                      placeholder={rowIndex === 0 ? `Columna ${colIndex + 1}` : ""}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-table">
          Cancelar
        </Button>
        <Button onClick={handleSave} data-testid="button-save-table">
          Insertar Tabla
        </Button>
      </div>
    </div>
  );
}
