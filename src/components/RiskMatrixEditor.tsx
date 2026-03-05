import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Grid3x3, Shield, CheckCircle, XCircle, Info } from 'lucide-react';
import {
  fetchRiskMatrix, fetchRiskMatrixCells, upsertRiskMatrix,
  saveCellAcceptability, applyStandardMatrix,
  STANDARD_IMPACT_LEVELS, STANDARD_FREQUENCY_LEVELS, LEVEL_LABELS,
  STANDARD_ACCEPTABLE_CELLS,
  type RiskMatrix, type RiskMatrixCell,
} from '@/lib/api-risk-matrix';

interface RiskMatrixEditorProps {
  processId: string;
}

export default function RiskMatrixEditor({ processId }: RiskMatrixEditorProps) {
  const [matrix, setMatrix] = useState<RiskMatrix | null>(null);
  const [cells, setCells] = useState<RiskMatrixCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const impactLevels = matrix?.impact_levels || STANDARD_IMPACT_LEVELS;
  const freqLevels = matrix?.frequency_levels || STANDARD_FREQUENCY_LEVELS;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchRiskMatrix(processId);
      setMatrix(m);
      if (m) {
        const c = await fetchRiskMatrixCells(m.id);
        setCells(c);
      } else {
        setCells([]);
      }
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => { reload(); }, [reload]);

  const isAcceptable = (impact: string, freq: string): boolean | null => {
    if (!matrix) {
      // Show standard preview
      return STANDARD_ACCEPTABLE_CELLS.some(([i, f]) => i === impact && f === freq);
    }
    const cell = cells.find(c => c.impact_level === impact && c.frequency_level === freq);
    if (!cell) return null;
    return cell.acceptable;
  };

  const handleCellToggle = async (impact: string, freq: string) => {
    if (!matrix) return;
    const current = isAcceptable(impact, freq);
    const newVal = current === null ? true : !current;
    setSaving(true);
    try {
      await saveCellAcceptability(matrix.id, impact, freq, newVal);
      await reload();
    } catch {
      toast({ title: 'Error saving cell', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMatrix = async (type: 'user-defined' | 'standard') => {
    setSaving(true);
    try {
      const m = await upsertRiskMatrix(processId, type);
      if (type === 'standard') {
        await applyStandardMatrix(m.id);
      }
      toast({ title: type === 'standard' ? 'Standard matrix applied' : 'Custom matrix created' });
      await reload();
    } catch {
      toast({ title: 'Error creating matrix', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchType = async (type: 'user-defined' | 'standard') => {
    if (!matrix) return;
    setSaving(true);
    try {
      await upsertRiskMatrix(processId, type);
      if (type === 'standard') {
        await applyStandardMatrix(matrix.id);
      }
      toast({ title: type === 'standard' ? 'Switched to standard matrix' : 'Switched to custom matrix' });
      await reload();
    } catch {
      toast({ title: 'Error switching matrix', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCellColor = (impact: string, freq: string): string => {
    const acc = isAcceptable(impact, freq);
    if (acc === true) return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800';
    if (acc === false) return 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800';
    return 'bg-muted/30 hover:bg-muted/50 border-border text-muted-foreground';
  };

  // Reversed impact levels for display (VH at top)
  const displayImpactLevels = [...impactLevels].reverse();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">Loading risk matrix...</CardContent>
      </Card>
    );
  }

  // No matrix assigned yet
  if (!matrix) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Grid3x3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Risk Matrix Assigned</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Choose a risk matrix type to define acceptable risk combinations for this business process.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              <Button variant="outline" className="gap-2" onClick={() => handleCreateMatrix('user-defined')} disabled={saving}>
                <Shield className="h-4 w-4" />
                User-Defined Matrix
              </Button>
              <Button className="gap-2" onClick={() => handleCreateMatrix('standard')} disabled={saving}>
                <Grid3x3 className="h-4 w-4" />
                Standard Matrix
              </Button>
            </div>

            {/* Standard matrix preview */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Standard Matrix Preview</p>
              <div className="inline-block">
                <MatrixGrid
                  impactLevels={displayImpactLevels}
                  freqLevels={STANDARD_FREQUENCY_LEVELS}
                  getCellColor={getCellColor}
                  isAcceptable={isAcceptable}
                  onCellClick={() => {}}
                  readonly
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Grid3x3 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{matrix.name}</CardTitle>
              <CardDescription className="text-xs">
                {matrix.matrix_type === 'standard' ? 'Predefined benchmark matrix' : 'Custom-configured matrix'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={matrix.matrix_type === 'standard' ? 'default' : 'secondary'} className="text-[10px]">
              {matrix.matrix_type === 'standard' ? 'Standard' : 'User-Defined'}
            </Badge>
            <Select value={matrix.matrix_type} onValueChange={v => handleSwitchType(v as any)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user-defined">User-Defined</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {matrix.matrix_type === 'user-defined' && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <Info className="h-4 w-4 shrink-0" />
            <p className="text-xs">Click cells to toggle between acceptable (green) and not acceptable (red). Unset cells are shown in gray.</p>
          </div>
        )}
        {matrix.matrix_type === 'standard' && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            <Info className="h-4 w-4 shrink-0" />
            <p className="text-xs">This is the standard benchmark matrix. Switch to "User-Defined" to customize acceptable combinations.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <MatrixGrid
            impactLevels={displayImpactLevels}
            freqLevels={freqLevels}
            getCellColor={getCellColor}
            isAcceptable={isAcceptable}
            onCellClick={handleCellToggle}
            readonly={matrix.matrix_type === 'standard'}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-emerald-100 border-emerald-300" />
            <span className="text-xs text-muted-foreground">Acceptable (OK)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-red-100 border-red-300" />
            <span className="text-xs text-muted-foreground">Not Acceptable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-muted/30 border-border" />
            <span className="text-xs text-muted-foreground">Not Set</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          {(() => {
            const total = impactLevels.length * freqLevels.length;
            const acceptableCount = cells.filter(c => c.acceptable).length;
            const notAcceptableCount = cells.filter(c => !c.acceptable).length;
            return (
              <>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-emerald-600">{acceptableCount}</span> acceptable
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-red-600">{notAcceptableCount}</span> not acceptable
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">{total - acceptableCount - notAcceptableCount}</span> not set
                </div>
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

// Matrix grid sub-component
function MatrixGrid({
  impactLevels, freqLevels, getCellColor, isAcceptable, onCellClick, readonly,
}: {
  impactLevels: string[];
  freqLevels: string[];
  getCellColor: (impact: string, freq: string) => string;
  isAcceptable: (impact: string, freq: string) => boolean | null;
  onCellClick: (impact: string, freq: string) => void;
  readonly?: boolean;
}) {
  return (
    <div className="inline-flex flex-col">
      {/* Column header */}
      <div className="flex items-end mb-1 pl-[100px]">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-full mb-1">
          Frequency →
        </span>
      </div>
      <div className="flex items-center mb-1 pl-[100px]">
        {freqLevels.map(f => (
          <div key={f} className="w-16 text-center">
            <span className="text-[10px] font-bold text-muted-foreground">{f}</span>
            <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[f]}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center mr-1" style={{ width: 20 }}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Impact ↑
          </span>
        </div>

        {/* Row labels + cells */}
        <div className="flex flex-col gap-1">
          {impactLevels.map(impact => (
            <div key={impact} className="flex items-center gap-1">
              <div className="w-[76px] text-right pr-2">
                <span className="text-[10px] font-bold text-muted-foreground">{impact}</span>
                <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[impact]}</p>
              </div>
              {freqLevels.map(freq => {
                const acc = isAcceptable(impact, freq);
                return (
                  <button
                    key={`${impact}-${freq}`}
                    className={`w-16 h-12 rounded-md border text-[10px] font-bold transition-all flex items-center justify-center ${getCellColor(impact, freq)} ${readonly ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                    onClick={() => !readonly && onCellClick(impact, freq)}
                    disabled={readonly}
                    title={`Impact: ${LEVEL_LABELS[impact]}, Frequency: ${LEVEL_LABELS[freq]} — ${acc === true ? 'Acceptable' : acc === false ? 'Not Acceptable' : 'Not Set'}`}
                  >
                    {acc === true && <CheckCircle className="h-4 w-4" />}
                    {acc === false && <XCircle className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
