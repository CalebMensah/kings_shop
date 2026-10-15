"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <div className="bg-white border border-navy-100 rounded p-4 md:p-5">
      <h3 className="text-sm font-medium text-navy-900 mb-4">Revenue — last 30 days</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8202A" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#C8202A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: "#E5E5E5" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#7A7A7A" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₵${v}`}
            width={50}
          />
          <Tooltip
            formatter={(value: number) => [`GH₵${value.toFixed(2)}`, "Revenue"]}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E5E5E5" }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#B01B24" strokeWidth={2} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
