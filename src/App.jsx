import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QuizProvider } from './context/QuizContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';
import OverallLeaderboard from './pages/OverallLeaderboard';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

function AppLayout() {
  const location = useLocation();
  // Don't show standard student navbar and footer on Quiz and Admin to maximize distraction-free focus
  const isQuiz = location.pathname === '/quiz';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {!isQuiz && !isAdmin && <Navbar />}
      
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/result" element={<Result />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/overall-leaderboard" element={<OverallLeaderboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<Admin />} />
          {/* Fallback route */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {!isQuiz && !isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <QuizProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QuizProvider>
  );
}
