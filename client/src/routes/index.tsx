import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { HomePage } from "../pages/public/HomePage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

// Home, placeholders and 404 load immediately. The other pages are split into their own files
// and downloaded on first visit, which keeps the first page load small.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    hydrateFallbackElement: <p className="p-8 text-center text-slate-500">Loading…</p>,
    children: [
      { index: true, element: <HomePage /> },
      { path: "treatments", lazy: async () => ({ Component: (await import("../pages/public/TreatmentsPage")).TreatmentsPage }) },
      { path: "treatments/:slug", lazy: async () => ({ Component: (await import("../pages/public/TreatmentDetailPage")).TreatmentDetailPage }) },
      { path: "doctor", lazy: async () => ({ Component: (await import("../pages/public/DoctorPage")).DoctorPage }) },
      { path: "faqs", lazy: async () => ({ Component: (await import("../pages/public/FaqsPage")).FaqsPage }) },
      { path: "contact", lazy: async () => ({ Component: (await import("../pages/public/ContactPage")).ContactPage }) },

      // Only for visitors who are NOT logged in. Logged-in users are redirected to their dashboard.
      {
        element: <GuestRoute />,
        children: [
          { path: "login", lazy: async () => ({ Component: (await import("../pages/auth/LoginPage")).LoginPage }) },
          { path: "register", lazy: async () => ({ Component: (await import("../pages/auth/RegisterPage")).RegisterPage }) },
        ],
      },

      // Needs a login. Each branch also needs the right role. The API enforces both again.
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <RoleRoute role="PATIENT" />,
            children: [
              {
                path: "patient",
                lazy: async () => ({ Component: (await import("../layouts/PatientLayout")).PatientLayout }),
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("../pages/patient/PatientDashboardPage")).PatientDashboardPage }) },
                  { path: "appointments", lazy: async () => ({ Component: (await import("../pages/patient/PatientAppointmentsPage")).PatientAppointmentsPage }) },
                  { path: "records", lazy: async () => ({ Component: (await import("../pages/patient/PatientRecordsPage")).PatientRecordsPage }) },
                  { path: "prescriptions", lazy: async () => ({ Component: (await import("../pages/patient/PatientPrescriptionsPage")).PatientPrescriptionsPage }) },
                  { path: "payments", lazy: async () => ({ Component: (await import("../pages/patient/PatientPaymentsPage")).PatientPaymentsPage }) },
                  { path: "invoices/:id", lazy: async () => ({ Component: (await import("../pages/patient/InvoicePage")).InvoicePage }) },
                  { path: "ai-assistant", lazy: async () => ({ Component: (await import("../pages/patient/patientAiAssistantPage")).PatientAiAssistantPage }) },
                ],
              },
              { path: "book", lazy: async () => ({ Component: (await import("../pages/booking/BookingPage")).BookingPage }) },
              { path: "book/success", lazy: async () => ({ Component: (await import("../pages/booking/PaymentSuccessPage")).PaymentSuccessPage }) },
            ],
          },
          {
            element: <RoleRoute role="OWNER" />,
            children: [
              {
                path: "owner",
                lazy: async () => ({ Component: (await import("../layouts/OwnerLayout")).OwnerLayout }),
                children: [
                  { index: true, lazy: async () => ({ Component: (await import("../pages/owner/OwnerDashboardPage")).OwnerDashboardPage }) },
                  { path: "appointments", lazy: async () => ({ Component: (await import("../pages/owner/OwnerAppointmentsPage")).OwnerAppointmentsPage }) },
                  { path: "patients", lazy: async () => ({ Component: (await import("../pages/owner/OwnerPatientsPage")).OwnerPatientsPage }) },
                  { path: "records", lazy: async () => ({ Component: (await import("../pages/owner/OwnerRecordsPage")).OwnerRecordsPage }) },
                  { path: "settings", lazy: async () => ({ Component: (await import("../pages/owner/OwnerSettingsPage")).OwnerSettingsPage }) },
                  { path: "ai-settings", lazy: async () => ({ Component: (await import("../pages/owner/OwnerAiSettingsPage")).OwnerAiSettingsPage }) },
                ],
              },
            ],
          },
        ],
      },

      // Placeholders until their sprints (see docs/05-project-management/sprint-plan.md)
      { path: "ai-assistant", lazy: async () => ({ Component: ( await import("../pages/public/AiAssistantPage")).AiAssistantPage}),},      
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
