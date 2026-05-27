import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { formatCurrency } from '../utils/format';

const COLORS = ['#ff6b6b', '#ffa07a', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

// Custom active shape with smooth expansion
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 4}
      outerRadius={outerRadius + 10}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: 'brightness(1.15)' }}
    />
  );
};

export const SpendingPieChart = ({ data, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleClick = (_, index) => {
    if (onCategoryClick && data[index]) {
      onCategoryClick(data[index].name);
    }
  };

  // Active item info for center display
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={80}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            onClick={handleClick}
            animationBegin={200}
            animationDuration={1500}
            animationEasing="ease-in-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none', cursor: 'pointer' }} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Info display below chart - fixed height to prevent layout shift */}
      <div style={{ 
        textAlign: 'center', 
        height: '48px',
        transition: 'opacity 0.3s ease',
        opacity: activeItem ? 1 : 0.5
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {activeItem ? activeItem.name : 'Hover to explore'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {activeItem ? formatCurrency(activeItem.value) : ''}
        </div>
      </div>
    </div>
  );
};

// Custom compact tooltip for the bar chart
const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--surface-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--text-primary)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {formatCurrency(payload[0].value)}
    </div>
  );
};

// Custom Bar with "pinch and stretch" effect on hover
const CustomBar = (props) => {
  const { x, y, width, height, fill } = props;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <g 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={isHovered ? x + width * 0.05 : x}
        y={isHovered ? y - 10 : y}
        width={isHovered ? width * 0.9 : width}
        height={isHovered ? height + 10 : height}
        fill={fill}
        rx={4}
        style={{ transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
      />
    </g>
  );
};

export const SpendingBarChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
        <YAxis hide={true} />
        <Tooltip 
          cursor={{fill: 'transparent'}}
          content={<CustomBarTooltip />}
        />
        <Bar 
          dataKey="amount" 
          fill="var(--accent-primary)" 
          radius={[4, 4, 4, 4]} 
          shape={<CustomBar />}
          animationBegin={400}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
