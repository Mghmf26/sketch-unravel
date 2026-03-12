import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Grid3x3, Shield, CheckCircle, XCircle, Info, Copy, FileText } from 'lucide-react';
import {
  fetchRiskMatrix, fetchRiskMatrixCells, upsertRiskMatrix,
  saveCellAcceptability, applyTemplateMatrix, saveImpactDescriptions,
  LEVEL_LABELS, STANDARD_TEMPLATES,
  type RiskMatrix, type RiskMatrixCell, type RiskMatrixTemplate,
} from '@/lib/api-risk-matrix';
import MatrixGrid from '@/components/risk-matrix/MatrixGrid';
import TemplateSelector from '@/components/risk-matrix/TemplateSelector';

interface RiskMatrixEditorProps {
  processId: string;
}

export default function RiskMatrixEditor({ processId }: RiskMatrixEditorProps) {
  const [matrix, setMatrix] = useState<RiskMatrix | null>(null);
  const [cells, setCells] = useState<RiskMatrixCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const impactLevels = matrix?.impact_levels || STANDARD_TEMPLATES[0].impactLevels;
  const freqLevels = matrix?.frequency_levels || STANDARD_TEMPLATES[0].frequencyLevels;

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
    if (!matrix) return null;
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

  const handleSelectTemplate = async (template: RiskMatrixTemplate) => {
    setSaving(true);
    try {
      const m = await upsertRiskMatrix(
        processId, 'standard', template.name, template.description,
        template.impactLevels, template.frequencyLevels,
      );
      await applyTemplateMatrix(m.id, template.key);
      toast({ title: `Applied "${template.name}" template` });
      await reload();
    } catch {
      toast({ title: 'Error applying template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustom = async () => {
    setSaving(true);
    try {
      await upsertRiskMatrix(processId, 'user-defined', 'Custom Risk Matrix');
      toast({ title: 'Custom matrix created — click cells to configure' });
      await reload();
    } catch {
      toast({ title: 'Error creating matrix', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateAsCustom = async () => {
    if (!matrix) return;
    setSaving(true);
    try {
      await upsertRiskMatrix(
        processId, 'user-defined',
        `${matrix.name} (Custom)`, matrix.description || undefined,
        matrix.impact_levels, matrix.frequency_levels,
      );
      toast({ title: 'Duplicated as custom matrix — you can now edit cells' });
      await reload();
    } catch {
      toast({ title: 'Error duplicating matrix', variant: 'destructive' });
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

  const displayImpactLevels = [...impactLevels].reverse();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">Loading risk matrix...</CardContent>
      </Card>
    );
  }

  // No matrix assigned — show template selection
  if (!matrix) {
    return (
      <TemplateSelector
        saving={saving}
        onSelectTemplate={handleSelectTemplate}
        onCreateCustom={handleCreateCustom}
      />
    );
  }

  const isStandard = matrix.matrix_type === 'standard';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Grid3x3 className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{matrix.name}</CardTitle>
              <CardDescription className="text-xs">
                {matrix.description || (isStandard ? 'Predefined benchmark matrix' : 'Custom-configured matrix')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isStandard ? 'default' : 'secondary'} className="text-[10px]">
              {isStandard ? 'Standard Template' : 'User-Defined'}
            </Badge>
            {isStandard && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={handleDuplicateAsCustom} disabled={saving}>
                <Copy className="h-3.5 w-3.5" /> Duplicate as Custom
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={() => { setMatrix(null); setCells([]); }} disabled={saving}>
              <FileText className="h-3.5 w-3.5" /> Change Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {!isStandard && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
            <Info className="h-4 w-4 shrink-0" />
            <p className="text-xs">Click cells to toggle between acceptable (green) and not acceptable (red). Unset cells are shown in gray.</p>
          </div>
        )}
        {isStandard && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            <Info className="h-4 w-4 shrink-0" />
            <p className="text-xs">This is a standard template and cannot be modified. Use "Duplicate as Custom" to create an editable copy.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <MatrixGrid
            impactLevels={displayImpactLevels}
            freqLevels={freqLevels}
            getCellColor={getCellColor}
            isAcceptable={isAcceptable}
            onCellClick={handleCellToggle}
            readonly={isStandard}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-emerald-100 border-emerald-300" />
            <span className="text-xs text-muted-foreground">Acceptable</span>
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
