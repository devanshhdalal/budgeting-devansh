import { useMemo, useRef } from 'react';
import { Group } from '@visx/group';
import { BarGroup } from '@visx/shape';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { formatCurrency } from '@/utils/format';
import { useChartColors } from '@/hooks/useChartColors';
import { useAnimeScope } from '@/motion/anime/useAnimeScope';
import { animate } from 'animejs/animation';
import { easings } from '@/motion/anime/easings';
import { motionEnabled } from '@/motion/anime/reducedMotion';
import { ChartEmpty } from './ChartShell';

const PAD = { top: 16, right: 16, bottom: 48, left: 16 };
const KEYS = ['limit', 'actual'];

export const BudgetCompareChart = ({ data }) => {
  const wrapRef = useRef(null);
  const colors = useChartColors();
  const colorScale = scaleOrdinal({
    domain: KEYS,
    range: ['var(--text-faint)', colors[0] ?? 'var(--accent)'],
  });

  const width = 640;
  const height = Math.max(220, data.length * 48 + PAD.top + PAD.bottom);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const rows = useMemo(
    () =>
      data.map((row) => ({
        category: row.label || row.category,
        limit: row.limit,
        actual: row.actual,
      })),
    [data]
  );

  const x0 = useMemo(
    () => scaleBand({ domain: rows.map((r) => r.category), range: [0, innerW], padding: 0.2 }),
    [rows, innerW]
  );

  const x1 = useMemo(
    () =>
      scaleBand({
        domain: KEYS,
        range: [0, x0.bandwidth()],
        padding: 0.12,
      }),
    [x0]
  );

  const yMax = useMemo(
    () => Math.max(...rows.flatMap((r) => [r.limit, r.actual]), 1) * 1.08,
    [rows]
  );

  const yScale = useMemo(
    () => scaleLinear({ domain: [0, yMax], range: [innerH, 0], nice: true }),
    [innerH, yMax]
  );

  useAnimeScope(
    wrapRef,
    () => {
      if (!wrapRef.current || !motionEnabled()) return;
      const limitBars = wrapRef.current.querySelectorAll('.budget-bar-limit');
      const actualBars = wrapRef.current.querySelectorAll('.budget-bar-actual');
      animate(limitBars, { scaleY: [0, 1], duration: 480, ease: easings.clayOut, transformOrigin: 'bottom' });
      animate(actualBars, {
        scaleY: [0, 1],
        duration: 680,
        delay: 80,
        ease: easings.snapSpring,
        transformOrigin: 'bottom',
      });
    },
    [data]
  );

  if (!data.length) return <ChartEmpty message="No budget categories configured" />;

  return (
    <div ref={wrapRef} className="chart-budget-compare" style={{ width: '100%', overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <Group left={PAD.left} top={PAD.top}>
          <BarGroup data={rows} keys={KEYS} height={innerH} x0={(d) => d.category} x0Scale={x0} x1Scale={x1} yScale={yScale} color={colorScale}>
            {(barGroups) =>
              barGroups.map((barGroup) => (
                <Group key={`bar-group-${barGroup.index}-${barGroup.x0}`} left={barGroup.x0}>
                  {barGroup.bars.map((bar) => (
                    <rect
                      key={`${barGroup.index}-${bar.index}-${bar.value}`}
                      className={bar.key === 'limit' ? 'budget-bar-limit' : 'budget-bar-actual'}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={bar.color}
                      rx={4}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
                    />
                  ))}
                  <text
                    x={x0.bandwidth() / 2}
                    y={innerH + 18}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {barGroup.x0.length > 10 ? `${barGroup.x0.slice(0, 9)}…` : barGroup.x0}
                  </text>
                </Group>
              ))
            }
          </BarGroup>
        </Group>
      </svg>
      <div className="chart-budget-legend">
        <span><i style={{ background: 'var(--text-faint)' }} /> Limit</span>
        <span><i style={{ background: colors[0] }} /> Spent</span>
        {rows.slice(0, 3).map((r) => (
          <span key={r.category} className="chart-budget-legend-stat">
            {r.category}: {formatCurrency(r.actual)} / {formatCurrency(r.limit)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BudgetCompareChart;
