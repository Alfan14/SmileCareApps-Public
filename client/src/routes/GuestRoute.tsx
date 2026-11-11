import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageSpinner } from "../components/ui/PageSpinner";
import { useCurrentUser } from "../hooks/useAuth";
import { homeFor, safeRedirect } from "../lib/roles";

/** For /login and /register. Logged-in users are sent on to the page they wanted, or to their dashboard. */
export function GuestRoute() {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return <PageSpinner />;
  if (user) return <Navigate to={safeRedirect(location.state) ?? homeFor(user.role)} replace />;
  return <Outlet />;
}
