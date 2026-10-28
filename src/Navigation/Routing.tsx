import React, { useEffect } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Loader from '../common/Loader';
import SignIn from '../pages/Authentication/SignIn';
import CompanyLanding from '../pages/Landing/CompanyLanding';
import DeveloperDashboard from '../pages/Developer/DeveloperDashboard';
import DefaultLayout from '../layout/DefaultLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import NotFound from '../pages/Error/NotFound';
import SettingsPage from '../pages/Settings/SettingsPage';
import { useAuth } from '../Context/Auth';

/**
 * Universal Route Guard for all ERP Sub-pages (Single Business System)
 */
const AppRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  const segments = pathname.split('/').filter(Boolean);

  // 1. Single-business rule: Strip any legacy tenant prefix (e.g. /uzair/..., /tenant=...)
  if (segments.length > 0) {
    const first = segments[0].toLowerCase();
    const isTenantSegment = first === 'uzair' || first.startsWith('tenant=') || first.startsWith('tenant-');
    if (isTenantSegment) {
      const rest = segments.slice(1).join('/');
      const cleanPath = rest ? `/${rest}` : '/dashboard';
      return <Navigate to={`${cleanPath}${search}${hash}`} replace />;
    }
  }

  // 2. Auto-correct any corrupt nested prefixes (e.g. /purchase/Reports/Reports-Dashboard -> /Reports/Reports-Dashboard)
  const reservedPrefixes = ['purchase', 'sales', 'reports', 'registration', 'administration', 'dashboard', 'human-resources', 'human-resource', 'hr', 'crm'];
  if (segments.length >= 2 && reservedPrefixes.includes(segments[0].toLowerCase()) && reservedPrefixes.includes(segments[1].toLowerCase())) {
    const cleanPath = `/${segments.slice(1).join('/')}`;
    return <Navigate to={`${cleanPath}${search}${hash}`} replace />;
  }

  return <>{children}</>;
};

/**
 * Strips legacy tenant prefixes from URLs and redirects to canonical paths
 */
const LegacyTenantRedirect: React.FC = () => {
  const { pathname, search, hash } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const cleanPath = segments.length > 1 ? `/${segments.slice(1).join('/')}` : '/dashboard';
  return <Navigate to={`${cleanPath}${search}${hash}`} replace />;
};

function Navigation() {
  const { pathname } = useLocation();
  const { isAuthenticated, getRoleBasedRoutes, loading: authLoading } = useAuth();

  const roleRoutes = getRoleBasedRoutes();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (authLoading) {
    return <Loader />;
  }

  const renderRoutes = (routes: any[]): any => {
    return routes.flatMap((route, index) => {
      const flat: any[] = [];

      if (route.path && route.component) {
        flat.push(
          <Route
            key={`direct-${index}-${route.path}`}
            path={route.path}
            element={
              <AppRouteGuard>
                <DefaultLayout>{route.component}</DefaultLayout>
              </AppRouteGuard>
            }
          />
        );
      }

      if (route.children) {
        flat.push(...renderRoutes(route.children));
      }

      return flat;
    });
  };

  return (
    <Routes>
      {/* 1. PUBLIC ENTERPRISE LANDING PAGE */}
      <Route path="/" element={<CompanyLanding />} />
      <Route path="/landing" element={<CompanyLanding />} />

      {/* 1.5. DASHBOARD ROUTE */}
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

      {/* 2. UNIVERSAL SIGN-IN & LOGIN ROUTES */}
      <Route
        path="/signin"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />}
      />

      {/* 3. SUPER ADMIN & EMPLOYEE ROLE MANAGEMENT CONSOLE */}
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

      {/* 4. ALL DYNAMIC ROLE-BASED ERP MODULE ROUTES */}
      {renderRoutes(roleRoutes)}

      {/* 4.5. SALES INVOICE UNIVERSAL SHORTCUTS & ALIASES */}
      <Route path="/sales/invoice/new" element={<Navigate to="/sales/invoice/add" replace />} />
      <Route path="/Sales/Invoice/New" element={<Navigate to="/sales/invoice/add" replace />} />
      <Route path="/sales/invoice" element={<Navigate to="/Sales/Invoice/List" replace />} />
      <Route path="/Sales/Invoice" element={<Navigate to="/Sales/Invoice/List" replace />} />
      <Route path="/sales/invoices" element={<Navigate to="/Sales/Invoice/List" replace />} />

      {/* 5. SINGLE BUSINESS REDIRECTS (Immediately strips /uzair or any tenant prefix) */}
      <Route path="/uzair" element={<Navigate to="/dashboard" replace />} />
      <Route path="/uzair/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/uzair/signin" element={<Navigate to="/signin" replace />} />
      <Route path="/uzair/login" element={<Navigate to="/signin" replace />} />
      <Route path="/uzair/settings" element={<Navigate to="/settings" replace />} />
      <Route path="/uzair/*" element={<LegacyTenantRedirect />} />
      <Route path="/tenant=:slug/*" element={<LegacyTenantRedirect />} />
      <Route path="/tenant=:slug" element={<Navigate to="/dashboard" replace />} />
      <Route path="/tenant-:slug/*" element={<LegacyTenantRedirect />} />
      <Route path="/tenant-:slug" element={<Navigate to="/dashboard" replace />} />

      {/* 6. 404 NOT FOUND */}
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
