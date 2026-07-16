'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function buildCreatorData(videos, metric) {
  const byCreator = {};

  for (const v of videos) {
    const name = v.username || 'Tanpa nama';
    if (!byCreator[name]) byCreator[name] = { username: name, views: 0, er: [], count: 0 };
    byCreator[name].views += v.views || 0;
    byCreator[name].er.push(Number(v.er) || 0);
    byCreator[name].count += 1;
  }

  const data = Object.values(byCreator).map((c) => ({
    username: c.username,
    views: c.views,
    er: c.er.length ? c.er.reduce((a, b) => a + b, 0) / c.er.length : 0,
  }));

  return data.sort((a, b) => b[metric === 'er' ? 'er' : 'views'] - a[metric === 'er' ? 'er' : 'views']);
}

export default function TrendChart({ videos, metric }) {
  const data = buildCreatorData(videos, metric);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  const dataKey = metric === 'er' ? 'er' : 'views';
  const label = metric === 'er' ? 'ER (%)' : 'Views';
  const isCrowded = data.length > 10;

  return (
    <ResponsiveContainer width="100%" height={isCrowded ? 320 : 260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: isCrowded ? 60 : 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DD" vertical={false} />
        <XAxis
          dataKey="username"
          tick={{ fontSize: 11, fill: '#6B6B66' }}
          axisLine={{ stroke: '#E4E2DD' }}
          tickLine={false}
          interval={0}
          angle={isCrowded ? -45 : 0}
          textAnchor={isCrowded ? 'end' : 'middle'}
          height={isCrowded ? 70 : 30}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B6B66' }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
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
        <Bar dataKey={dataKey} fill="#0F6E5C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
