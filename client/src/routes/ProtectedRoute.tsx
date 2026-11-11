import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PageSpinner } from "../components/ui/PageSpinner";
import { useCurrentUser } from "../hooks/useAuth";

/** Needs a logged-in user. Guests are sent to /login and returned here afterwards. This is UX only: the API enforces access too. */
export function ProtectedRoute() {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return <PageSpinner label="Checking your session…" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: { pathname: location.pathname + location.search } }} />;
  }
  return <Outlet />;
}
