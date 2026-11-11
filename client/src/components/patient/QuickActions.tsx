import { CalendarPlus, ClipboardList, CreditCard, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { to: "/book", icon: CalendarPlus, title: "Book new appointment" },
  { to: "/patient/records", icon: ClipboardList, title: "View treatment records" },
  { to: "/patient/payments", icon: CreditCard, title: "Payments and invoices" },
  { to: "/contact", icon: MessageCircle, title: "Contact the clinic" },
];

export function QuickActions() {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map(({ to, icon: Icon, title }) => (
        <li key={to}>
          <Link
            to={to}
            className="flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-4 text-center text-sm font-semibold text-brand-deep shadow-sm hover:border-brand focus-visible:outline-2 focus-visible:outline-brand-deep"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
