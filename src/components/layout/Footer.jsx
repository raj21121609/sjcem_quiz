import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#00386B] text-white/80 text-sm mt-auto border-t-4 border-[#005599] no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-white text-[#00386B] flex items-center justify-center font-black text-sm">
                SJ
              </div>
              <span className="text-white font-extrabold text-base tracking-tight font-heading">
                St. John College of Engineering and Management
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed max-w-md">
              Training & Placement Cell • St. John Technical and Educational Campus, Vevoor, Manor Road, Palghar (E), Dist. Palghar - 401404, Maharashtra. Approved by AICTE & DTE, Affiliated to University of Mumbai.
            </p>
            <div className="flex items-center gap-3 text-xs text-white/60 pt-1 font-medium">
              <span>© {new Date().getFullYear()} SJCEM T&P Cell</span>
              <span>•</span>
              <span>Placement Aptitude Portal</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Current Weekly Challenge</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-white transition-colors">Weekly Hall of Fame</Link>
              </li>
              <li>
                <Link to="/overall-leaderboard" className="hover:text-white transition-colors">Overall Campus Standings</Link>
              </li>
              <li>
                <span className="text-white/60">TCS / Infosys Placement Aligned</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Contest Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#449284]" />
                <span>30-second speed test per question</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#449284]" />
                <span>Zero backward question tampering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#449284]" />
                <span>Instant verified solution keys</span>
              </li>
              <li className="pt-1">
                <Link to="/admin" className="text-white hover:text-white/80 font-bold underline">
                  T&P Faculty Console →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
