import { Outlet } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";
import type { Role } from "../types/api";
import { ForbiddenPage } from "../pages/public/ForbiddenPage";

/** Place inside ProtectedRoute. Shows a "no access" page when the user has a different role. UX only: the API enforces roles too. */
export function RoleRoute({ role }: { role: Role }) {
  const { user } = useCurrentUser();
  if (!user) return null; // ProtectedRoute handles guests
  if (user.role !== role) return <ForbiddenPage />;
  return <Outlet />;
}
