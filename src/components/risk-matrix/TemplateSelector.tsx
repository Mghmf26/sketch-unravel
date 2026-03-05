import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Grid3x3, Shield, CheckCircle, XCircle } from 'lucide-react';
import { STANDARD_TEMPLATES, LEVEL_LABELS, type RiskMatrixTemplate } from '@/lib/api-risk-matrix';

interface TemplateSelectorProps {
  saving: boolean;
  onSelectTemplate: (template: RiskMatrixTemplate) => void;
  onCreateCustom: () => void;
}

export default function TemplateSelector({ saving, onSelectTemplate, onCreateCustom }: TemplateSelectorProps) {
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const previewTemplate = STANDARD_TEMPLATES.find(t => t.key === previewKey) || null;

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Grid3x3 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Select a Risk Matrix</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
              Choose a standard template based on recognized frameworks, or create a fully custom matrix.
            </p>
          </div>

          {/* Standard Templates */}
          <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto mt-4">
            {STANDARD_TEMPLATES.map(t => (
              <button
                key={t.key}
                className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  previewKey === t.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
                onClick={() => setPreviewKey(previewKey === t.key ? null : t.key)}
                disabled={saving}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Grid3x3 className="h-4 w-4 text-primary" />
                  <Badge variant="outline" className="text-[9px]">
                    {t.impactLevels.length}×{t.frequencyLevels.length}
                  </Badge>
                </div>
                <p className="text-sm font-semibold leading-tight">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.description}</p>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            {previewKey && (
              <Button
                className="gap-2"
                onClick={() => {
                  const t = STANDARD_TEMPLATES.find(t => t.key === previewKey);
                  if (t) onSelectTemplate(t);
                }}
                disabled={saving}
              >
                <Grid3x3 className="h-4 w-4" />
                Apply {STANDARD_TEMPLATES.find(t => t.key === previewKey)?.name}
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={onCreateCustom} disabled={saving}>
              <Shield className="h-4 w-4" />
              Create Custom Matrix
            </Button>
          </div>

          {/* Template Preview */}
          {previewTemplate && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {previewTemplate.name} — Preview
              </p>
              <div className="inline-block">
                <MiniPreview template={previewTemplate} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniPreview({ template }: { template: RiskMatrixTemplate }) {
  const displayImpact = [...template.impactLevels].reverse();
  return (
    <div className="inline-flex flex-col">
      <div className="flex items-end mb-1 pl-[100px]">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center w-full mb-1">
          Frequency →
        </span>
      </div>
      <div className="flex items-center mb-1 pl-[100px]">
        {template.frequencyLevels.map(f => (
          <div key={f} className="w-16 text-center">
            <span className="text-[10px] font-bold text-muted-foreground">{f}</span>
            {LEVEL_LABELS[f] && LEVEL_LABELS[f] !== f && (
              <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[f]}</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="flex flex-col items-center justify-center mr-1" style={{ width: 20 }}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Impact ↑
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {displayImpact.map(impact => (
            <div key={impact} className="flex items-center gap-1">
              <div className="w-[76px] text-right pr-2">
                <span className="text-[10px] font-bold text-muted-foreground">{impact}</span>
                {LEVEL_LABELS[impact] && LEVEL_LABELS[impact] !== impact && (
                  <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[impact]}</p>
                )}
              </div>
              {template.frequencyLevels.map(freq => {
                const acc = template.acceptableCells.some(([i, f]) => i === impact && f === freq);
                return (
                  <div
                    key={`${impact}-${freq}`}
                    className={`w-16 h-12 rounded-md border text-[10px] font-bold flex items-center justify-center ${
                      acc
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-red-100 border-red-300 text-red-800'
                    }`}
                    title={`Impact: ${LEVEL_LABELS[impact] || impact}, Frequency: ${LEVEL_LABELS[freq] || freq} — ${acc ? 'Acceptable' : 'Not Acceptable'}`}
                  >
                    {acc ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
