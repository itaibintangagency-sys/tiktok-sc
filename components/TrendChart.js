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

  const key = metric === 'er' ? 'er' : 'views';

  // Urutkan dari tertinggi sesuai metrik aktif, ambil Top 10 saja
  return data.sort((a, b) => b[key] - a[key]).slice(0, 10);
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

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DD" vertical={false} />
        <XAxis
          dataKey="username"
          tick={{ fontSize: 11, fill: '#6B6B66' }}
          axisLine={{ stroke: '#E4E2DD' }}
          tickLine={false}
          interval={0}
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
