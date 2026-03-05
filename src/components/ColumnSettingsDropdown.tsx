import { Settings2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import type { ColumnDef, ColumnSettings } from '@/hooks/useColumnSettings';

interface Props {
  columns: ColumnDef[];
  settings: Record<string, ColumnSettings>;
  toggleColumn: (key: string) => void;
  setColumnWidth: (key: string, width: number) => void;
  resetAll: () => void;
}

export function ColumnSettingsDropdown({ columns, settings, toggleColumn, setColumnWidth, resetAll }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-2.5">
          <Settings2 className="h-3.5 w-3.5" /> Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Column Settings</span>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground gap-1" onClick={resetAll}>
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {columns.map(col => {
            const s = settings[col.key];
            const visible = s?.visible !== false;
            const width = s?.width || col.defaultWidth || 0;
            return (
              <div key={col.key} className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={visible}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="h-3.5 w-3.5"
                  />
                  <label htmlFor={`col-${col.key}`} className="text-xs text-foreground cursor-pointer flex-1 select-none">
                    {col.label}
                  </label>
                </div>
                {visible && col.minWidth && (
                  <div className="ml-5.5 mt-1.5 flex items-center gap-2">
                    <Slider
                      value={[width || col.minWidth]}
                      min={col.minWidth}
                      max={Math.max(400, (col.defaultWidth || 150) * 2)}
                      step={10}
                      onValueChange={([v]) => setColumnWidth(col.key, v)}
                      className="flex-1"
                    />
                    <span className="text-[9px] text-muted-foreground w-8 text-right">{width || col.minWidth}px</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
