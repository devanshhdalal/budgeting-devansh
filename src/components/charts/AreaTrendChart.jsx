import { useMemo, useRef, useId } from 'react';
import { Group } from '@visx/group';
import { AreaClosed, line } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { LinearGradient } from '@visx/gradient';
import { curveMonotoneX } from '@visx/curve';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from '@visx/vendor/d3-array';
import { formatCurrency } from '@/utils/format';
import { formatAxisCurrency } from '@/utils/chartTheme';
import { useAnimeScope } from '@/motion/anime/useAnimeScope';
import { animatePathDraw } from '@/motion/anime/countUp';
import { createDrawable } from 'animejs/svg';
import { ChartEmpty } from './ChartShell';

const bisectDate = bisector((d) => new Date(`${d.isoDate}T12:00:00`)).left;

const tooltipStyles = {
  ...defaultStyles,
  background: 'var(--surface-solid)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-md)',
  color: 'var(--text)',
  padding: '10px 14px',
  fontSize: '0.8rem',
};

export const AreaTrendChart = ({
  data,
  width = 640,
  height = 280,
  compact = false,
  accentColor = 'var(--accent)',
  animateIn = true,
}) => {
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const gradientId = useId();

  const margin = compact
    ? { top: 8, right: 8, bottom: 24, left: 8 }
    : { top: 12, right: 12, bottom: 36, left: 44 };

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const { tooltipData, tooltipLeft, tooltipTop, showTooltip, hideTooltip } = useTooltip();

  const parsed = useMemo(
    () => data.map((d) => ({ ...d, date: new Date(`${d.isoDate}T12:00:00`) })),
    [data]
  );

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: parsed.length
          ? [parsed[0].date, parsed[parsed.length - 1].date]
          : [new Date(), new Date()],
        range: [0, innerW],
      }),
    [parsed, innerW]
  );

  const yMax = useMemo(() => Math.max(...parsed.map((d) => d.amount), 1) * 1.1, [parsed]);

  const yScale = useMemo(
    () => scaleLinear({ domain: [0, yMax], range: [innerH, 0], nice: true }),
    [innerH, yMax]
  );

  const linePath = useMemo(() => {
    const generator = line({
      x: (d) => xScale(d.date),
      y: (d) => yScale(d.amount),
      curve: curveMonotoneX,
    });
    return generator(parsed) ?? '';
  }, [parsed, xScale, yScale]);

  useAnimeScope(
    svgRef,
    () => {
      if (!animateIn || !pathRef.current || !linePath) return;
      pathRef.current.setAttribute('d', linePath);
      try {
        const drawable = createDrawable(pathRef.current);
        animatePathDraw(drawable, { duration: compact ? 600 : 900 });
      } catch {
        /* path not ready */
      }
    },
    [data, animateIn, compact, linePath]
  );

  if (!data.length) return <ChartEmpty message="No spending in this period" />;

  const handleMove = (event) => {
    const point = localPoint(event);
    if (!point) return;
    const x0 = xScale.invert(point.x - margin.left);
    const idx = bisectDate(parsed, x0, 1);
    const d0 = parsed[idx - 1];
    const d1 = parsed[idx];
    if (!d0 && !d1) return;
    const d =
      d1 && d0
        ? x0 - d0.date > d1.date - x0
          ? d1
          : d0
        : d0 || d1;
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(d.date) + margin.left,
      tooltipTop: yScale(d.amount) + margin.top,
    });
  };

  return (
    <div className="chart-area-wrap" style={{ width: '100%', overflow: 'hidden' }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <LinearGradient id={gradientId} from={accentColor} to={accentColor} fromOpacity={0.35} toOpacity={0.02} />
        <Group left={margin.left} top={margin.top}>
          <AreaClosed
            data={parsed}
            x={(d) => xScale(d.date)}
            y={(d) => yScale(d.amount)}
            yScale={yScale}
            strokeWidth={0}
            fill={`url(#${gradientId})`}
            curve={curveMonotoneX}
          />
          <path
            ref={pathRef}
            d={linePath}
            stroke={accentColor}
            strokeWidth={2.5}
            fill="transparent"
          />
          {!compact && (
            <>
              <AxisLeft
                scale={yScale}
                tickFormat={formatAxisCurrency}
                stroke="transparent"
                tickStroke="transparent"
                tickLabelProps={() => ({
                  fill: 'var(--text-faint)',
                  fontSize: 11,
                  textAnchor: 'end',
                  dy: '0.33em',
                  dx: -4,
                })}
                numTicks={4}
              />
              <AxisBottom
                top={innerH}
                scale={xScale}
                stroke="transparent"
                tickStroke="transparent"
                tickLabelProps={() => ({
                  fill: 'var(--text-faint)',
                  fontSize: 11,
                  textAnchor: 'middle',
                  dy: '0.71em',
                })}
                numTicks={compact ? 4 : 6}
              />
            </>
          )}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={hideTooltip}
            onTouchMove={handleMove}
            onTouchEnd={hideTooltip}
          />
          {tooltipData && (
            <circle
              cx={xScale(tooltipData.date)}
              cy={yScale(tooltipData.amount)}
              r={5}
              fill={accentColor}
              stroke="var(--bg-elevated)"
              strokeWidth={2}
            />
          )}
        </Group>
      </svg>
      {tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
          className="chart-tooltip-rich"
        >
          <span className="chart-tooltip-label">{tooltipData.fullLabel || tooltipData.name}</span>
          <span className="chart-tooltip-value">{formatCurrency(tooltipData.amount)}</span>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export default AreaTrendChart;
