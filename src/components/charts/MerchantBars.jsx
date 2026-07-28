import { useMemo, useRef } from 'react';
import { Group } from '@visx/group';
import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { formatCurrency } from '@/utils/format';
import { useAnimeScope } from '@/motion/anime/useAnimeScope';
import { animateBarStagger } from '@/motion/anime/countUp';
import { ChartEmpty } from './ChartShell';

const ROW_H = 36;
const PAD = { top: 8, right: 16, bottom: 8, left: 120 };

export const MerchantBars = ({ data, accentColor = 'var(--accent)', animateIn = true }) => {
  const wrapRef = useRef(null);
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const width = 640;
  const height = data.length * ROW_H + PAD.top + PAD.bottom;
  const innerW = width - PAD.left - PAD.right;

  const yScale = useMemo(
    () =>
      scaleBand({
        domain: data.map((d) => d.name),
        range: [0, data.length * ROW_H],
        padding: 0.28,
      }),
    [data]
  );

  const xScale = useMemo(
    () => scaleLinear({ domain: [0, maxVal], range: [0, innerW], nice: true }),
    [maxVal, innerW]
  );

  useAnimeScope(
    wrapRef,
    () => {
      if (!animateIn) return;
      const bars = wrapRef.current?.querySelectorAll('.merchant-bar-fill');
      if (bars?.length) animateBarStagger(bars);
    },
    [data, animateIn]
  );

  if (!data.length) return <ChartEmpty message="No merchant data in this period" />;

  return (
    <div ref={wrapRef} className="chart-merchant-bars" style={{ width: '100%', overflow: 'hidden' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <Group left={PAD.left} top={PAD.top}>
          {data.map((row) => {
            const barW = xScale(row.value);
            const y = yScale(row.name) ?? 0;
            const barH = yScale.bandwidth();
            return (
              <Group key={row.name} top={y}>
                <text
                  x={-8}
                  y={barH / 2}
                  dy="0.33em"
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize={12}
                  fontWeight={600}
                >
                  {row.name.length > 14 ? `${row.name.slice(0, 13)}…` : row.name}
                </text>
                <Bar
                  className="merchant-bar-fill"
                  x={0}
                  y={0}
                  width={barW}
                  height={barH}
                  fill={row.name === 'Other' ? 'var(--text-faint)' : accentColor}
                  rx={6}
                  style={{ transformOrigin: 'left center', transformBox: 'fill-box' }}
                />
                <text
                  x={barW + 8}
                  y={barH / 2}
                  dy="0.33em"
                  fill="var(--text)"
                  fontSize={12}
                  fontWeight={600}
                >
                  {formatCurrency(row.value)}
                </text>
              </Group>
            );
          })}
        </Group>
      </svg>
    </div>
  );
};

export default MerchantBars;
