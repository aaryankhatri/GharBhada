import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', label: 'खोज्नुहोस्', show: true },
    { to: '/tax-calculator', label: 'कर क्याल्कुलेटर', show: true },
    { to: '/tenant', label: 'मेरो बुकिङ', show: user?.role === 'tenant' },
    { to: '/landlord', label: 'मेरो Dashboard', show: user?.role === 'landlord' },
    { to: '/admin', label: 'Admin', show: user?.role === 'admin' },
  ].filter(i => i.show);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-gradient shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white">
            घर<span className="text-amber-300">भाडा</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(i => (
              <NavLink
                key={i.to}
                to={i.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`
                }
              >
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-blue-100">{user.fullName}</span>
                <button
                  className="btn text-sm py-1.5 bg-white/10 text-white border border-white/30 hover:bg-white/20"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/welcome" className="btn text-sm py-1.5 bg-white/10 text-white border border-white/30 hover:bg-white/20">लगइन</Link>
                <Link to="/register" className="btn-accent text-sm py-1.5">दर्ता</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-40">
        {navItems.map(i => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`
            }
          >
            {i.label}
          </NavLink>
        ))}
      </nav>

      <footer className="hidden md:block bg-gray-900 text-center text-xs text-gray-400 py-4">
        <span className="text-amber-400 font-semibold">घरभाडा</span> — काठमाडौंको डिजिटल घरभाडा प्लेटफर्म | Muluki Civil Code 2074 अनुसार | KMC घरबहाल कर: १०%
      </footer>
    </div>
  );
}
