import { useState, useMemo, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Sector,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/utils/format';
import { useChartColors } from '@/hooks/useChartColors';
import { getCategoryColor, formatAxisCurrency } from '@/utils/chartTheme';

const DONUT_TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] };

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 3}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={4}
      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }}
    />
  );
};

const ChartEmpty = ({ message }) => (
  <div className="chart-empty">
    <div className="chart-empty-ring" aria-hidden />
    <p>{message}</p>
  </div>
);

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip chart-tooltip-rich">
      <span className="chart-tooltip-label">{row.fullLabel || row.name}</span>
      <span className="chart-tooltip-value">{formatCurrency(row.amount)}</span>
    </div>
  );
};

const GradientBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={8} ry={8} />;
};

const DonutCenter = ({ activeItem, total, categoryCount }) => (
  <div className="chart-donut-center" aria-live="polite">
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeItem ? activeItem.name : 'total'}
        className="chart-donut-center-inner"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={DONUT_TRANSITION}
      >
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
            <span className="chart-donut-eyebrow">{categoryCount} categories</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
);

export const SpendingPieChart = ({ data, categories = [], onCategoryClick }) => {
  const colors = useChartColors();
  const [activeIndex, setActiveIndex] = useState(null);

  const sliceColors = useMemo(
    () => data.map((row) => getCategoryColor(row.name, categories, colors)),
    [data, categories, colors]
  );

  const total = data[0]?.total ?? data.reduce((sum, row) => sum + row.value, 0);
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  if (!data.length) {
    return <ChartEmpty message="No category spending in this view" />;
  }

  const clearActive = () => setActiveIndex(null);
  const setActive = (i) => setActiveIndex(i);

  return (
    <div
      className="chart-pie-stack"
      onMouseLeave={clearActive}
    >
      <div className="chart-pie-stage">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              activeIndex={activeIndex ?? undefined}
              activeShape={activeIndex !== null ? renderActiveShape : undefined}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="var(--bg-elevated)"
              strokeWidth={2}
              isAnimationActive
              onMouseEnter={(_, i) => setActive(i)}
              onMouseMove={(_, i) => setActive(i)}
              onClick={(_, i) => onCategoryClick?.(data[i]?.name)}
              animationDuration={650}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={sliceColors[i]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.38}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <DonutCenter
          activeItem={activeItem}
          total={total}
          categoryCount={data.length}
        />
      </div>

      <div className="chart-category-chips" role="list">
        {data.map((item, i) => (
          <button
            key={item.name}
            type="button"
            role="listitem"
            className={`chart-chip${activeIndex === i ? ' is-active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={clearActive}
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

const AXIS_TICK = { fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'SF Pro Display' };

export const SpendingBarChart = ({ data }) => {
  const colors = useChartColors();
  const gradientId = useId();

  const { peak, yMax } = useMemo(() => {
    const max = data.reduce((acc, d) => (d.amount > acc ? d.amount : acc), 0);
    return { peak: max, yMax: max > 0 ? Math.ceil(max * 1.12) : 100 };
  }, [data]);

  if (!data.length) {
    return <ChartEmpty message="No daily spending in this period" />;
  }

  return (
    <div className="chart-bar-wrap">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 4 }} barCategoryGap="22%">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[0]} stopOpacity={0.95} />
              <stop offset="100%" stopColor={colors[0]} stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={10} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={formatAxisCurrency}
            tick={AXIS_TICK}
            domain={[0, yMax]}
          />
          <Tooltip cursor={{ fill: 'var(--accent-soft)', radius: 8 }} content={<BarTooltip />} />
          <Bar
            dataKey="amount"
            fill={`url(#${gradientId})`}
            radius={[8, 8, 0, 0]}
            maxBarSize={48}
            shape={<GradientBar />}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-bar-footer">
        <span>Last {data.length} days with activity</span>
        <span className="chart-bar-footer-peak">Peak {formatCurrency(peak)}</span>
      </div>
    </div>
  );
};
