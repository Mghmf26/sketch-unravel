import { Badge } from '@/components/ui/badge';

export type StepTypeValue = 'critical' | 'mechanical' | 'decisional' | null | undefined;

const STEP_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  mechanical: { label: 'Mechanical', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-300' },
  decisional: { label: 'Decisional', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
};

export const STEP_TYPE_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'decisional', label: 'Decisional' },
];

export function StepTypeBadge({ stepType, size = 'sm' }: { stepType: StepTypeValue; size?: 'sm' | 'xs' }) {
  if (!stepType) return null;
  const config = STEP_TYPE_CONFIG[stepType];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${config.bg} ${config.text} ${config.border} ${size === 'xs' ? 'text-[8px]' : 'text-[9px]'}`}>
      {config.label}
    </span>
  );
}
