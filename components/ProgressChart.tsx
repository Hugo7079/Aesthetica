
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { UserStats } from '../types';

interface Props {
  stats: UserStats;
}

const ProgressChart: React.FC<Props> = ({ stats }) => {
  // Aggregate scores by date to show daily average
  const data = React.useMemo(() => {
    if (!stats.scoresHistory || stats.scoresHistory.length === 0) return [];

    const grouped = stats.scoresHistory.reduce<Record<string, { total: number, count: number }>>((acc, curr) => {
        const dateKey = curr.date.split('T')[0];
        if (!acc[dateKey]) {
            acc[dateKey] = { total: 0, count: 0 };
        }
        acc[dateKey].total += curr.score;
        acc[dateKey].count += 1;
        return acc;
    }, {});

    return Object.entries(grouped)
        .map(([date, val]) => ({
            date,
            score: Math.round(val.total / val.count)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7); // Keep last 7 days
  }, [stats.scoresHistory]);

  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm italic border border-gray-800 rounded-lg bg-white/5">
        持續訓練累積數據，以解鎖成長曲線...
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-aesthetic-dark/50 p-4 rounded-xl border border-white/10">
      <h3 className="text-white font-serif mb-4 flex justify-between">
          <span>美感成長曲線 (每日平均)</span>
          <span className="text-xs text-aesthetic-gold border border-aesthetic-gold/20 px-2 rounded-full flex items-center">近 7 日</span>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            tick={{fontSize: 10}}
            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'numeric', day:'numeric'})}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="#666" 
            domain={[0, 100]} 
            tick={{fontSize: 10}} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#d4af37', color: '#fff', fontSize: '12px' }}
            itemStyle={{ color: '#d4af37' }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#d4af37" 
            strokeWidth={3} 
            dot={{ fill: '#1a1a1a', stroke: '#d4af37', strokeWidth: 2, r: 4 }} 
            activeDot={{ r: 6, fill: '#d4af37' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
