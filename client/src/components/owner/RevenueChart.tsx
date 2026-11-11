import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { compactRupees, shortDay } from "../../lib/chartFormat";
import { formatPaise } from "../../lib/format";
import type { OwnerRevenueDay } from "../../types/api";
import { ChartCard, NoChartData } from "./ChartCard";

export function RevenueChart({ data }: { data: OwnerRevenueDay[] }) {
  if (data.length === 0) {
    return <NoChartData title="Revenue" />;
  }

  const total = data.reduce(
    (sum, item) => sum + item.revenuePaise,
    0,
  );

  return (
    <ChartCard
      title="Revenue"
      summary={`Daily revenue over ${data.length} days: ${formatPaise(total)} in total`}
      table={
        <table className="w-full text-left">
          <caption className="sr-only">Daily revenue</caption>
          <thead>
            <tr className="text-xs uppercase text-slate-500">
              <th scope="col" className="py-1 pr-3">Date</th>
              <th scope="col" className="py-1 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.date} className="border-t border-slate-100">
                <th scope="row" className="py-1 pr-3 font-medium">
                  {shortDay(item.date)}
                </th>
                <td className="py-1 text-right">
                  {formatPaise(item.revenuePaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} />
          <YAxis tickFormatter={compactRupees} width={56} />
          <Tooltip
            labelFormatter={(label) => shortDay(String(label))}
            formatter={(value) => formatPaise(Number(value))}
          />
          <Area
            type="monotone"
            dataKey="revenuePaise"
            name="Revenue"
            stroke="#0B7C8C"
            fill="#18B7C9"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}