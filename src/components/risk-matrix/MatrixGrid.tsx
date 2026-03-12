import { useState } from 'react';
import { CheckCircle, XCircle, Pencil } from 'lucide-react';
import { LEVEL_LABELS } from '@/lib/api-risk-matrix';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MatrixGridProps {
  impactLevels: string[];
  freqLevels: string[];
  getCellColor: (impact: string, freq: string) => string;
  isAcceptable: (impact: string, freq: string) => boolean | null;
  onCellClick: (impact: string, freq: string) => void;
  readonly?: boolean;
  impactDescriptions?: Record<string, string>;
  onImpactDescriptionChange?: (level: string, value: string) => void;
}

export default function MatrixGrid({
  impactLevels, freqLevels, getCellColor, isAcceptable, onCellClick, readonly,
  impactDescriptions = {}, onImpactDescriptionChange,
}: MatrixGridProps) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);

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
            {LEVEL_LABELS[f] && LEVEL_LABELS[f] !== f && (
              <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[f]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center mr-1" style={{ width: 20 }}>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider"
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
                {LEVEL_LABELS[impact] && LEVEL_LABELS[impact] !== impact && (
                  <p className="text-[8px] text-muted-foreground/70 leading-tight">{LEVEL_LABELS[impact]}</p>
                )}
              </div>
              {freqLevels.map(freq => {
                const acc = isAcceptable(impact, freq);
                return (
                  <button
                    key={`${impact}-${freq}`}
                    className={`w-16 h-12 rounded-md border text-[10px] font-bold transition-all flex items-center justify-center ${getCellColor(impact, freq)} ${readonly ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                    onClick={() => !readonly && onCellClick(impact, freq)}
                    disabled={readonly}
                    title={`Impact: ${LEVEL_LABELS[impact] || impact}, Frequency: ${LEVEL_LABELS[freq] || freq} — ${acc === true ? 'Acceptable' : acc === false ? 'Not Acceptable' : 'Not Set'}`}
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

      {/* Risk Appetite / Impact Descriptions */}
      <div className="mt-4 pt-3 border-t">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Risk Appetite — Impact Definitions
        </p>
        <div className="grid gap-1.5">
          {[...impactLevels].reverse().reverse().map(level => {
            const desc = impactDescriptions[level] || '';
            const isEditing = editingLevel === level;
            return (
              <div key={level} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-[60px] text-right shrink-0">
                  {LEVEL_LABELS[level] || level}:
                </span>
                {isEditing && onImpactDescriptionChange ? (
                  <Input
                    autoFocus
                    className="h-7 text-xs flex-1"
                    value={desc}
                    placeholder={`e.g. €1M – €2M loss`}
                    onChange={e => onImpactDescriptionChange(level, e.target.value)}
                    onBlur={() => setEditingLevel(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingLevel(null)}
                  />
                ) : (
                  <div
                    className={`flex-1 text-xs rounded px-2 py-1 border min-h-[28px] flex items-center gap-1 ${
                      onImpactDescriptionChange ? 'cursor-pointer hover:bg-muted/50' : ''
                    } ${desc ? 'text-foreground border-border' : 'text-muted-foreground/50 border-dashed border-muted-foreground/30'}`}
                    onClick={() => onImpactDescriptionChange && setEditingLevel(level)}
                  >
                    {desc || 'Click to define risk appetite…'}
                    {onImpactDescriptionChange && <Pencil className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-auto" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
