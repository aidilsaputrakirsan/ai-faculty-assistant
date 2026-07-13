import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './RouteGuards';

// Mock the auth hook so we can drive different session/role states.
const mockAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

function renderAt(path: string, element: JSX.Element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={element}>
          <Route path="/app/guarded" element={<div>App Area</div>} />
          <Route path="/admin/guarded" element={<div>Admin Area</div>} />
        </Route>
        {/* Redirect targets must resolve to their own routes. */}
        <Route path="/app" element={<div>App Area</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => mockAuth.mockReset());

  it('redirects unauthenticated users to login', () => {
    mockAuth.mockReturnValue({ session: null, profile: null, loading: false });
    renderAt('/app/guarded', <ProtectedRoute />);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('allows authenticated users', () => {
    mockAuth.mockReturnValue({ session: { user: {} }, profile: { role: 'user' }, loading: false });
    renderAt('/app/guarded', <ProtectedRoute />);
    expect(screen.getByText('App Area')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  beforeEach(() => mockAuth.mockReset());

  it('blocks non-admins from admin area', () => {
    mockAuth.mockReturnValue({ session: { user: {} }, profile: { role: 'user' }, loading: false });
    renderAt('/admin/guarded', <AdminRoute />);
    expect(screen.getByText('App Area')).toBeInTheDocument();
    expect(screen.queryByText('Admin Area')).not.toBeInTheDocument();
  });

  it('allows admins into admin area', () => {
    mockAuth.mockReturnValue({ session: { user: {} }, profile: { role: 'admin' }, loading: false });
    renderAt('/admin/guarded', <AdminRoute />);
    expect(screen.getByText('Admin Area')).toBeInTheDocument();
  });
});
