import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from '../pages/Authentication/SignIn';
import CompanyLanding from '../pages/Landing/CompanyLanding';
import DeveloperDashboard from '../pages/Developer/DeveloperDashboard';
import DefaultLayout from '../layout/DefaultLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import NotFound from '../pages/Error/NotFound';
import SettingsPage from '../pages/Settings/SettingsPage';
import { useAuth } from '../Context/Auth';

/**
 * Enterprise Route Guard
 * Enforces unified authentication across all routes.
 */
const AppRouteGuard = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-boxdark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

function Navigation() {
  const { getRoleBasedRoutes, isAuthenticated } = useAuth();
  const roleRoutes = getRoleBasedRoutes();

  // Recursively renders dynamic routes matching the multi-level Sidebar structure
  const renderRoutes = (routes: any[]) => {
    return routes.flatMap((item: any, idx: number) => {
      const routeElements: any[] = [];

      if (item.path && item.component) {
        routeElements.push(
          <Route
            key={`${item.path}-${idx}`}
            path={item.path}
            element={
              <AppRouteGuard>
                <DefaultLayout>{item.component}</DefaultLayout>
              </AppRouteGuard>
            }
          />
        );
        routeElements.push(
          <Route
            key={`${item.path}-tenant-${idx}`}
            path={`/:tenantPath${item.path.startsWith('/') ? item.path : `/${item.path}`}`}
            element={
              <AppRouteGuard>
                <DefaultLayout>{item.component}</DefaultLayout>
              </AppRouteGuard>
            }
          />
        );
      }

      if (item.children && Array.isArray(item.children)) {
        routeElements.push(...renderRoutes(item.children));
      }

      return routeElements;
    });
  };

  return (
    <Routes>
      {/* 1. PUBLIC ENTERPRISE LANDING */}
      <Route path="/" element={<CompanyLanding />} />

      {/* 2. AUTHENTICATION (Unifies all portal logins) */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/login" element={<SignIn />} />

      {/* 3. ROOT DASHBOARD ENTRY */}
      <Route
        path="/dashboard"
        element={
          <AppRouteGuard>
            <DefaultLayout>
              <Dashboard />
            </DefaultLayout>
          </AppRouteGuard>
        }
      />
      <Route
        path="/:tenantPath/dashboard"
        element={
          <AppRouteGuard>
            <DefaultLayout>
              <Dashboard />
            </DefaultLayout>
          </AppRouteGuard>
        }
      />

      {/* 3.5. DEVELOPER PORTAL */}
      <Route path="/dev/master" element={<DeveloperDashboard />} />
      <Route path="/Administration/Roles" element={<DeveloperDashboard />} />
      <Route path="/Administration/Users" element={<DeveloperDashboard />} />

      {/* 4. SETTINGS & PREFERENCES */}
      <Route
        path="/settings"
        element={
          <AppRouteGuard>
            <DefaultLayout>
              <SettingsPage />
            </DefaultLayout>
          </AppRouteGuard>
        }
      />
      <Route
        path="/:tenantPath/settings"
        element={
          <AppRouteGuard>
            <DefaultLayout>
              <SettingsPage />
            </DefaultLayout>
          </AppRouteGuard>
        }
      />

      {/* 4. ALL DYNAMIC ROLE-BASED ERP MODULE ROUTES */}
      {renderRoutes(roleRoutes)}

      {/* 4.5. SALES INVOICE UNIVERSAL SHORTCUTS & ALIASES */}
      <Route path="/sales/invoice/new" element={<Navigate to="/sales/invoice/add" replace />} />
      <Route path="/Sales/Invoice/New" element={<Navigate to="/sales/invoice/add" replace />} />
      <Route path="/sales/invoice" element={<Navigate to="/Sales/Invoice/List" replace />} />
      <Route path="/Sales/Invoice" element={<Navigate to="/Sales/Invoice/List" replace />} />
      <Route path="/sales/invoices" element={<Navigate to="/Sales/Invoice/List" replace />} />

      {/* 5. LEGACY TENANT GATE REDIRECTS (Gracefully redirects any old links) */}
      <Route path="/:tenantPath/signin" element={<Navigate to="/signin" replace />} />
      <Route path="/:tenantPath/login" element={<Navigate to="/signin" replace />} />

      {/* 6. TENANT ROOT REDIRECT */}
      <Route
        path="/:tenantPath"
        element={
          <AppRouteGuard>
            <DefaultLayout>
              <Dashboard />
            </DefaultLayout>
          </AppRouteGuard>
        }
      />

      {/* 7. CATCH-ALL (404) */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <DefaultLayout>
              <NotFound
                title="404 - Page Not Found"
                message="The requested page could not be found."
              />
            </DefaultLayout>
          ) : (
            <NotFound
              title="404 - Page Not Found"
              message="The requested page could not be found."
            />
          )
        }
      />
    </Routes>
  );
}

export default Navigation;
