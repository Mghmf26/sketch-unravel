import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
}

export function Sparkline({ data, width = 80, height = 28, color = 'hsl(var(--primary))', filled = true }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const padding = 2;
    const h = height - padding * 2;

    const points = data.map((v, i) => ({
      x: i * step,
      y: padding + h - ((v - min) / range) * h,
    }));

    // Smooth curve using quadratic bezier
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cx = (points[i - 1].x + points[i].x) / 2;
      d += ` Q ${points[i - 1].x + (cx - points[i - 1].x) * 0.5},${points[i - 1].y} ${cx},${(points[i - 1].y + points[i].y) / 2}`;
      d += ` T ${points[i].x},${points[i].y}`;
    }

    return d;
  }, [data, width, height]);

  const fillPath = useMemo(() => {
    if (!filled || data.length < 2) return '';
    return `${path} L ${width},${height} L 0,${height} Z`;
  }, [path, filled, data, width, height]);

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {filled && (
        <path d={fillPath} fill={color} opacity={0.1} />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
