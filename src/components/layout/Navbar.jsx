import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, Trophy, Users, Shield, Menu, X } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext';

export default function Navbar() {
  const location = useLocation();
  const { isQuizActive } = useQuiz();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCurrentlyInQuiz = location.pathname === '/quiz' && isQuizActive;

  const navLinks = [
    { name: 'Weekly Contest', path: '/', icon: Award },
    { name: 'Weekly Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Overall Standings', path: '/overall-leaderboard', icon: Users },
    { name: 'Admin Portal', path: '/admin', icon: Shield }
  ];

  return (
    <header className="bg-white border-b border-[#D9E1E8] sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo & SJCEM Branding */}
          <Link to="/" className="flex items-center gap-3.5 group focus:outline-none">
            <div className="w-11 h-11 rounded-lg bg-[#00386B] text-white flex flex-col items-center justify-center font-black tracking-tight border border-[#00284D] shadow-xs group-hover:bg-[#005599] transition-colors">
              <span className="text-xs leading-none font-bold">SJ</span>
              <span className="text-[9px] text-white/80 font-mono">CEM</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#1C1C1C] tracking-tight text-base sm:text-lg leading-tight font-heading">
                  SJCEM Aptitude Arena
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#F5F7F9] text-[#00386B] border border-[#D9E1E8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#449284] mr-1.5"></span>
                  Contest #14 Live
                </span>
              </div>
              <p className="text-xs text-[#5F6B76] font-medium">
                Training & Placement Cell • St. John College of Engineering and Management
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          {!isCurrentlyInQuiz ? (
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#00386B] text-white shadow-2xs'
                        : 'text-[#5F6B76] hover:text-[#00386B] hover:bg-[#F5F7F9]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#5F6B76]'}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-[#E31B23] bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
              <span className="w-2 h-2 rounded-full bg-[#E31B23] animate-pulse"></span>
              Speed Contest Active (30s / Question)
            </div>
          )}

          {/* Mobile hamburger menu */}
          {!isCurrentlyInQuiz && (
            <div className="md:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-[#5F6B76] hover:text-[#1C1C1C] hover:bg-[#F5F7F9] focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {!isCurrentlyInQuiz && mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D9E1E8] bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold ${
                  isActive
                    ? 'bg-[#00386B] text-white'
                    : 'text-[#5F6B76] hover:bg-[#F5F7F9] hover:text-[#00386B]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#5F6B76]'}`} />
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
