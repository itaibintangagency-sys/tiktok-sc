'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function buildTrendData(videos, metric) {
  const byDate = {};

  for (const v of videos) {
    if (!v.post_date) continue;
    const day = v.post_date.slice(0, 10); // YYYY-MM-DD
    if (!byDate[day]) byDate[day] = { date: day, views: 0, er: [], count: 0 };
    byDate[day].views += v.views || 0;
    byDate[day].er.push(Number(v.er) || 0);
    byDate[day].count += 1;
  }

  return Object.values(byDate)
    .map((d) => ({
      date: d.date,
      views: d.views,
      er: d.er.length ? d.er.reduce((a, b) => a + b, 0) / d.er.length : 0,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export default function TrendChart({ videos, metric }) {
  const data = buildTrendData(videos, metric);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  const dataKey = metric === 'er' ? 'er' : 'views';
  const label = metric === 'er' ? 'ER (%)' : 'Views';

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DD" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6B6B66' }}
          tickFormatter={(d) =>
            new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
          }
          axisLine={{ stroke: '#E4E2DD' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B6B66' }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          labelFormatter={(d) =>
            new Date(d).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          }
          formatter={(value) => [
            metric === 'er' ? `${value.toFixed(2)}%` : value.toLocaleString('id-ID'),
            label,
          ]}
          contentStyle={{
            fontSize: 12,
            border: '1px solid #E4E2DD',
            borderRadius: 8,
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#0F6E5C"
          strokeWidth={2}
          dot={{ r: 3, fill: '#0F6E5C' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
