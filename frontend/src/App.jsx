import { Outlet, ScrollRestoration } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="min-h-screen flex flex-col bg-offwhite-50">
          <Navbar />
          <div className="flex-1">
            <Outlet />
          </div>
          <Footer />
        </div>
        <ScrollRestoration />
      </LanguageProvider>
    </AuthProvider>
  );
}
