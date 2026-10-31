import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { I18nProvider } from './i18n/context';
import { FeaturesDrawerProvider } from './context/FeaturesDrawerContext';
import FeaturesDrawer from './components/FeaturesDrawer';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Schemes from './pages/Schemes';
import Eligibility from './pages/Eligibility';
import Verify from './pages/Verify';
import Dashboard from './pages/Dashboard';
import Apply from './pages/Apply';

// Pages that use the full-app layout (no navbar/footer, custom sidebar)
const APP_PAGES = ['/chat', '/eligibility', '/verify', '/apply'];

function AppLayout() {
  const location = useLocation();
  const isAppPage = APP_PAGES.some(p => location.pathname.startsWith(p));

  return (
    <>
      <FeaturesDrawer />
      {!isAppPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/schemes/:id" element={<Schemes />} />
        <Route path="/eligibility" element={<Eligibility />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/apply/:id" element={<Apply />} />
        <Route path="/apply" element={<Apply />} />
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAppPage && <Footer />}
    </>
  );
}

function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64 }}>🪄</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)' }}>Page not found</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>The page you're looking for doesn't exist.</p>
      <a href="/" style={{
        padding: '12px 24px',
        background: 'var(--navy)',
        color: '#fff',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        fontSize: 14,
        textDecoration: 'none',
      }}>
        Go Home
      </a>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <FeaturesDrawerProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </FeaturesDrawerProvider>
    </I18nProvider>
  );
}

export default App;
