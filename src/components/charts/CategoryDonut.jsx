import { useMemo, useState, useRef } from 'react';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { formatCurrency } from '@/utils/format';
import { getCategoryColor } from '@/utils/chartTheme';
import { useChartColors } from '@/hooks/useChartColors';
import { useAnimeScope } from '@/motion/anime/useAnimeScope';
import { animate } from 'animejs/animation';
import { easings } from '@/motion/anime/easings';
import { motionEnabled } from '@/motion/anime/reducedMotion';
import { ChartEmpty } from './ChartShell';

const DONUT = { width: 220, height: 220, margin: 12, inner: 58, outer: 88 };

export const CategoryDonut = ({ data, categories = [], onCategoryClick, selectedCategory }) => {
  const colors = useChartColors();
  const svgRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(null);

  const sliceColors = useMemo(
    () => data.map((row) => getCategoryColor(row.name, categories, colors)),
    [data, categories, colors]
  );

  const total = data[0]?.total ?? data.reduce((sum, row) => sum + row.value, 0);
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  useAnimeScope(
    svgRef,
    () => {
      if (!svgRef.current || !motionEnabled()) return;
      const arcs = svgRef.current.querySelectorAll('.donut-arc');
      animate(arcs, {
        opacity: [0, 1],
        scale: [0.92, 1],
        duration: 520,
        delay: (_, i) => i * 60,
        ease: easings.clayOut,
      });
    },
    [data]
  );

  if (!data.length) return <ChartEmpty message="No category spending in this view" />;

  const cx = DONUT.width / 2;
  const cy = DONUT.height / 2;

  return (
    <div className="chart-pie-stack">
      <div className="chart-pie-stage">
        <svg ref={svgRef} width={DONUT.width} height={DONUT.height} aria-hidden>
          <Group top={DONUT.margin} left={DONUT.margin}>
            <Pie
              data={data}
              pieValue={(d) => d.value}
              outerRadius={DONUT.outer}
              innerRadius={DONUT.inner}
              padAngle={0.02}
            >
              {(pie) =>
                pie.arcs.map((arc, i) => {
                  const isActive = activeIndex === i;
                  const isSelected = selectedCategory === arc.data.name;
                  const dimmed =
                    (activeIndex !== null && !isActive) ||
                    (selectedCategory && selectedCategory !== 'All' && !isSelected);
                  return (
                    <g key={arc.data.name} className="donut-arc">
                      <path
                        d={pie.path(arc) ?? ''}
                        fill={sliceColors[i]}
                        opacity={dimmed ? 0.35 : 1}
                        stroke="var(--bg-elevated)"
                        strokeWidth={2}
                        style={{
                          transform: isActive ? 'scale(1.04)' : 'scale(1)',
                          transformOrigin: `${cx}px ${cy}px`,
                          transition: 'transform 0.18s var(--ease-out)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={() => onCategoryClick?.(arc.data.name)}
                      />
                    </g>
                  );
                })
              }
            </Pie>
          </Group>
        </svg>
        <div className="chart-donut-center" aria-live="polite">
          {activeItem ? (
            <>
              <span className="chart-donut-label">{activeItem.name}</span>
              <span className="chart-donut-value">{formatCurrency(activeItem.value)}</span>
              <span className="chart-donut-eyebrow">{activeItem.percent}% of total</span>
            </>
          ) : (
            <>
              <span className="chart-donut-label">Total spent</span>
              <span className="chart-donut-value">{formatCurrency(total)}</span>
              <span className="chart-donut-eyebrow">{data.length} categories</span>
            </>
          )}
        </div>
      </div>
      <div className="chart-category-chips scroll-reveal-item" role="list">
        {data.map((item, i) => (
          <button
            key={item.name}
            type="button"
            role="listitem"
            className={`chart-chip${activeIndex === i ? ' is-active' : ''}${selectedCategory === item.name ? ' is-active' : ''}`}
            onMouseEnter={() => setActiveIndex(i)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
            onClick={() => onCategoryClick?.(item.name)}
          >
            <span className="chart-chip-dot" style={{ background: sliceColors[i] }} />
            <span className="chart-chip-name">{item.name}</span>
            <span className="chart-chip-pct">{item.percent}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryDonut;
