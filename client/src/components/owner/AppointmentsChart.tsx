import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { shortDay } from "../../lib/chartFormat";
import type { OwnerBookingDay } from "../../types/api";
import { ChartCard, NoChartData } from "./ChartCard";

export function AppointmentsChart({ data }: { data: OwnerBookingDay[] }) {
  if (data.length === 0) {
    return <NoChartData title="Appointments" />;
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartCard
      title="Bookings"
      summary={`Bookings over ${data.length} days: ${total} in total`}
      table={
        <table className="w-full text-left">
          <caption className="sr-only">Bookings per day</caption>
          <thead>
            <tr className="text-xs uppercase text-slate-500">
              <th scope="col" className="py-1 pr-3">Date</th>
              <th scope="col" className="py-1 text-right">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.date} className="border-t border-slate-100">
                <th scope="row" className="py-1 pr-3 font-medium">
                  {shortDay(item.date)}
                </th>
                <td className="py-1 text-right">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(label) => shortDay(String(label))} />
          <Bar dataKey="count" name="Bookings" fill="#0B7C8C" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}