import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  HelpCircle, 
  Trophy, 
  Award, 
  LogOut, 
  Menu, 
  X,
  ExternalLink,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { contestService } from '../services/contestService';
import { questionService } from '../services/questionService';
import { leaderboardService } from '../services/leaderboardService';

// Sub-components
import AdminOverview from '../components/admin/AdminOverview';
import ContestManager from '../components/admin/ContestManager';
import QuestionManager from '../components/admin/QuestionManager';
import WeeklyLeaderboardTable from '../components/leaderboard/WeeklyLeaderboardTable';
import OverallLeaderboardTable from '../components/leaderboard/OverallLeaderboardTable';

export default function Admin() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Tab state: 'dashboard' | 'contests' | 'questions' | 'leaderboard' | 'overall'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [contests, setContests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [overallLeaderboard, setOverallLeaderboard] = useState([]);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Authentication Check: require role = 'admin'
  useEffect(() => {
    async function verifyAuth() {
      setAuthChecking(true);
      const admin = await adminService.getCurrentAdmin();

      if (!admin) {
        navigate('/admin/login');
        return;
      }

      setAdminUser(admin);
      setAuthChecking(false);
    }

    verifyAuth();
  }, [navigate]);

  // 2. Load live data from services
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashStats, allContests, allQuestions, weeklyLead, overallLead] = await Promise.all([
        adminService.getDashboardStats(),
        contestService.getAllContests(),
        questionService.getQuestions(),
        leaderboardService.getWeeklyLeaderboard(),
        leaderboardService.getOverallLeaderboard()
      ]);

      setStats(dashStats);
      setContests(allContests);
      setQuestions(allQuestions);
      setWeeklyLeaderboard(weeklyLead);
      setOverallLeaderboard(overallLead);
    } catch (err) {
      console.error('[Admin] Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminUser) {
      refreshData();
    }
  }, [adminUser, refreshData]);

  // Handlers for Question mutations
  const handleAddQuestion = async (qData) => {
    const created = await questionService.createQuestion(qData);
    setQuestions((prev) => [created, ...prev]);
    // Refresh stats
    const updatedStats = await adminService.getDashboardStats();
    setStats(updatedStats);
    return created;
  };

  const handleUpdateQuestion = async (id, qData) => {
    const updated = await questionService.updateQuestion(id, qData);
    setQuestions((prev) => prev.map(q => q.id === id ? updated : q));
    return updated;
  };

  const handleDeleteQuestion = async (id) => {
    await questionService.deleteQuestion(id);
    setQuestions((prev) => prev.filter(q => q.id !== id));
    // Refresh stats
    const updatedStats = await adminService.getDashboardStats();
    setStats(updatedStats);
  };

  // Logout handler
  const handleLogout = async () => {
    await adminService.logout();
    navigate('/admin/login');
  };

  // Auth checking screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F5F7F9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#00386B] animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#1C1C1C]">
            Verifying Administrator Authorization...
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contests', label: 'Contests', icon: Calendar, count: contests.length },
    { id: 'questions', label: 'Questions', icon: HelpCircle, count: questions.length },
    { id: 'leaderboard', label: 'Weekly Leaderboard', icon: Trophy },
    { id: 'overall', label: 'Overall Leaderboard', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F9] flex flex-col">
      {/* Top Admin Sub-bar */}
      <header className="bg-[#00386B] text-white border-b-2 border-[#005599] px-4 sm:px-6 py-3 flex items-center justify-between text-xs sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1 rounded hover:bg-white/10 text-white"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#449284]" />
            <span className="font-black tracking-tight font-heading text-white text-sm">
              SJCEM Placement Administration Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            target="_blank"
            className="text-white/80 hover:text-white flex items-center gap-1 font-bold transition-colors"
          >
            <span>Live Student Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <span className="text-white/40">|</span>

          <span className="text-white/80 font-mono hidden sm:inline">
            {adminUser?.user?.email}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Admin Body: Sidebar + Dynamic Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6 items-start">
        {/* Left Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white md:rounded-xl border border-[#D9E1E8] shadow-xs p-4 flex flex-col justify-between shrink-0 transform transition-transform duration-200 md:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-[#5F6B76] uppercase tracking-wider">
              Management Menu
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#00386B] text-white shadow-2xs'
                      : 'text-[#1C1C1C] hover:bg-[#F5F7F9] hover:text-[#00386B]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F5F7F9] text-[#5F6B76]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer with Logout */}
          <div className="pt-4 border-t border-[#D9E1E8] space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#E31B23] hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
            <div className="px-3 text-[10px] text-[#5F6B76]">
              St. John College of Engineering & Management
            </div>
          </div>
        </aside>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {activeTab === 'dashboard' && (
            <AdminOverview stats={stats} onNavigateTab={setActiveTab} />
          )}

          {activeTab === 'contests' && (
            <ContestManager
              contests={contests}
              onRefreshContests={refreshData}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionManager
              questions={questions}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
            />
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
                    Weekly Contest Leaderboard
                  </h2>
                  <p className="text-xs text-[#5F6B76]">
                    Real-time rankings from public.weekly_leaderboard view.
                  </p>
                </div>
              </div>
              <WeeklyLeaderboardTable entries={weeklyLeaderboard} />
            </div>
          )}

          {activeTab === 'overall' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] font-heading">
                    Overall Hall of Fame
                  </h2>
                  <p className="text-xs text-[#5F6B76]">
                    Cumulative season standings from public.overall_leaderboard view.
                  </p>
                </div>
              </div>
              <OverallLeaderboardTable entries={overallLeaderboard} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
