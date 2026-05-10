import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Sector, Rectangle } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#ff6b6b', '#ffa07a', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

// Custom active shape for the Pie Chart to give a premium expand/brighten effect
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#334155" fontSize={16} fontWeight={600}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#64748b" fontSize={14}>
        ${value.toFixed(2)}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'brightness(1.15)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </g>
  );
};

export const SpendingPieChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
          animationBegin={200}
          animationDuration={1000}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} />
          ))}
        </Pie>
        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
      </PieChart>
    </ResponsiveContainer>
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
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip 
          cursor={{fill: 'transparent'}}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
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
