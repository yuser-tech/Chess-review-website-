import React, { useState, useEffect } from 'react';
import { 
  Search, ShieldCheck, Zap, Sparkles, AlertCircle, History, 
  BarChart2, PlayCircle, Award, User, RefreshCw, Layers, ChevronRight
} from 'lucide-react';
import { GameMeta, PlayerStatsResponse } from './types';
import Dashboard from './components/Dashboard';
import GameReview from './components/GameReview';
import LifetimeInsights from './components/LifetimeInsights';

export default function App() {
  const [username, setUsername] = useState('');
  const [activeUser, setActiveUser] = useState<string | null>(null);
  
  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    status: 'idle',
    totalArchives: 0,
    processedArchives: 0,
    totalGames: 0,
    processedGames: 0,
    percent: 0
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'games' | 'insights'>('dashboard');

  // Stats and game selection
  const [stats, setStats] = useState<PlayerStatsResponse | null>(null);
  const [games, setGames] = useState<GameMeta[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameMeta | null>(null);
  
  // Error feedback
  const [error, setError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Poll progress during active sync
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isSyncing && activeUser) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/player/sync-status?username=${activeUser}`);
          if (res.ok) {
            const data = await res.json();
            setSyncProgress(data);
            
            // If completed, fetch full compiled stats and games list
            if (data.status === 'completed') {
              setIsSyncing(false);
              if (intervalId) clearInterval(intervalId);
              await loadPlayerData(activeUser);
            }
          }
        } catch (err) {
          console.error('Error polling sync status:', err);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSyncing, activeUser]);

  // Load compiled data for a given username
  async function loadPlayerData(user: string) {
    setError(null);
    try {
      const [statsRes, gamesRes] = await Promise.all([
        fetch(`/api/player/stats?username=${user}`),
        fetch(`/api/player/games?username=${user}`)
      ]);

      if (statsRes.ok && gamesRes.ok) {
        const statsData = await statsRes.json();
        const gamesData = await gamesRes.json();
        
        setStats(statsData);
        setGames(gamesData.games);
        setActiveUser(user);
      } else {
        setError('Failed to fetch player stats. Please verify the Chess.com username is correct.');
      }
    } catch (err) {
      setError('A connection error occurred. Please try again.');
    }
  }

  // Handle username submission (starts sync and opens progress screen)
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setError(null);
    setSearchLoading(true);
    const targetUser = username.trim().toLowerCase();

    try {
      // 1. Kickoff sync in background
      const syncRes = await fetch('/api/player/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUser })
      });

      if (!syncRes.ok) {
        throw new Error('Could not initialize sync');
      }

      // 2. Load immediate status
      const statusRes = await fetch(`/api/player/sync-status?username=${targetUser}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSyncProgress(statusData);
        setActiveUser(targetUser);
        
        if (statusData.status === 'processing') {
          setIsSyncing(true);
        } else {
          // Already synchronized previously! Directly load stats
          await loadPlayerData(targetUser);
        }
      }
    } catch (err) {
      setError('Could not connect to Chess.com public profile. Please check your spelling.');
    } finally {
      setSearchLoading(false);
    }
  }

  // Clean exit back to landing page
  function handleReset() {
    setActiveUser(null);
    setUsername('');
    setStats(null);
    setGames([]);
    setSelectedGame(null);
    setIsSyncing(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-300">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-teal-500 rounded-xl text-slate-950 font-bold">
              <Layers className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                Chess Review <span className="text-sky-400">AI</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">No Signup • Instant Insights</p>
            </div>
          </div>

          {activeUser && (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <User className="w-3.5 h-3.5 text-sky-400" />
                {activeUser.toUpperCase()}
              </span>
              <button 
                onClick={handleReset}
                className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 transition"
              >
                Change Player
              </button>
            </div>
          )}

        </div>
      </header>

      {/* 2. MAIN CORE CONTENT VIEWS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW A: Landing Search Screen */}
        {!activeUser && !isSyncing && (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-10 animate-fade-in" id="landing-screen">
            
            <div className="space-y-4">
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-550/10 text-sky-400 border border-sky-500/10 uppercase tracking-widest font-mono">
                ✨ Pro Chess analytics platform
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight leading-tight">
                Get Your Chess.com <span className="text-sky-400">Lifetime Game Review</span> Instantly.
              </h2>
              <p className="text-slate-400 text-base max-w-lg mx-auto">
                No signup, no passwords. Simply search your public Chess.com username and unlock a stunning AI Chess DNA Report, lifetime mistakes trackers, and move-by-move evaluations.
              </p>
            </div>

            {/* Username Search Form */}
            <form onSubmit={handleSearch} className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800 flex items-center gap-2 max-w-lg mx-auto shadow-2xl focus-within:border-sky-500/50 transition">
              <div className="pl-3 text-slate-500">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Chess.com Username..." 
                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none text-sm font-semibold py-2"
                disabled={searchLoading}
              />
              <button 
                type="submit"
                disabled={searchLoading || !username.trim()}
                className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5"
              >
                {searchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>Analyze Career</span>
              </button>
            </form>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/15 p-4 rounded-xl text-xs font-mono max-w-lg mx-auto text-left justify-center">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Platform Core Capabilities Display Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-900">
              <div className="space-y-2 text-left bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl w-fit">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Lifetime Brilliant Moves</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Extracts and charts every brilliant move you've ever achieved with side-by-side boards showing position adjustments.
                </p>
              </div>
              <div className="space-y-2 text-left bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl w-fit">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Chess DNA Profiling</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Generates an AI coach report detailing playing style classifications, tactical benchmarks, and grandmaster comparisons.
                </p>
              </div>
              <div className="space-y-2 text-left bg-slate-900/30 p-5 rounded-2xl border border-slate-850">
                <div className="p-2.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl w-fit">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Interactive Game Reviews</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Navigate recent matches with real-time Stockfish feedback, evaluation bars, and coach commentary.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* VIEW B: Sync Progress Tracker Screen */}
        {isSyncing && (
          <div className="max-w-xl mx-auto text-center py-20 space-y-8 animate-fade-in" id="sync-progress-screen">
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight">Syncing Chess Career Profile</h3>
              <p className="text-sm font-mono text-sky-400">
                "Analyzing {syncProgress.processedGames.toLocaleString()} of {syncProgress.totalGames.toLocaleString()} games ({syncProgress.percent}%)"
              </p>
            </div>

            {/* Real dynamic progress bar */}
            <div className="space-y-2">
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div 
                  className="bg-gradient-to-r from-sky-500 to-teal-400 h-full transition-all duration-300"
                  style={{ width: `${syncProgress.percent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Archives Scanned: {syncProgress.processedArchives}/{syncProgress.totalArchives}</span>
                <span>Resume anytime on refresh</span>
              </div>
            </div>

            <div className="bg-slate-900/30 p-4 border border-slate-850 rounded-xl max-w-sm mx-auto text-xs font-mono text-slate-400">
              <p className="animate-pulse">Analyzing Caro-Kann match histories...</p>
            </div>

            <div>
              <button 
                onClick={() => {
                  // Allow player to skip directly to dashboard since synchronization runs as an incremental process
                  loadPlayerData(activeUser!);
                  setIsSyncing(false);
                }}
                className="text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 underline"
              >
                Skip and view partial results in real-time
              </button>
            </div>

          </div>
        )}

        {/* VIEW C: Primary Active Analytics Dashboard View */}
        {activeUser && !isSyncing && stats && (
          <div className="space-y-8 animate-fade-in" id="dashboard-viewer">
            
            {/* Navigation Tab Bar */}
            {!selectedGame && (
              <div className="flex border-b border-slate-900 gap-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'dashboard' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  📊 Player Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('games')}
                  className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'games' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  ♟️ Recent Games
                </button>
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`pb-4 text-sm font-bold border-b-2 transition ${activeTab === 'insights' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  🧬 Lifetime Insights & Brilliant Moves
                </button>
              </div>
            )}

            {/* View Switching */}
            {selectedGame ? (
              <GameReview 
                game={selectedGame} 
                onBackToGames={() => {
                  setSelectedGame(null);
                  setActiveTab('games');
                }} 
              />
            ) : (
              <>
                {/* 1. Dashboard Tab */}
                {activeTab === 'dashboard' && <Dashboard stats={stats} />}

                {/* 2. Recent Games List Tab */}
                {activeTab === 'games' && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in" id="games-browser">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">Analyzed Matches Browser</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Select any game below to run a complete Stockfish review with AI Coach review</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {games.map((g, idx) => {
                        const isWin = g.result === 'win';
                        const isLoss = g.result === 'loss';
                        const isDraw = g.result === 'draw';
                        
                        let outcomeBg = 'border-slate-850 hover:border-slate-700 bg-slate-950/20';
                        let outcomeLabel = 'Draw';
                        let outcomeBadge = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                        
                        if (isWin) {
                          outcomeBg = 'border-emerald-500/10 hover:border-emerald-500/40 bg-emerald-950/5';
                          outcomeLabel = 'Victory';
                          outcomeBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        } else if (isLoss) {
                          outcomeBg = 'border-rose-500/10 hover:border-rose-500/40 bg-rose-950/5';
                          outcomeLabel = 'Defeat';
                          outcomeBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                        }

                        const rating = g.color === 'white' ? g.white_rating : g.black_rating;
                        const opponent = g.color === 'white' ? g.black_username : g.white_username;
                        const opponentRating = g.color === 'white' ? g.black_rating : g.white_rating;

                        return (
                          <div 
                            key={g.game_id}
                            onClick={() => setSelectedGame(g)}
                            className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition ${outcomeBg}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${outcomeBadge} uppercase font-mono`}>
                                {outcomeLabel}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">Opponent:</span>
                                  <span className="text-sm font-semibold text-slate-100">{opponent}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">({opponentRating} ELO)</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                  <span>{g.date}</span>
                                  <span>•</span>
                                  <span className="capitalize">{g.time_class} ({g.time_control}s)</span>
                                  <span>•</span>
                                  <span className="text-slate-400">{g.opening}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                              <div className="text-right text-xs font-mono">
                                <span className="text-slate-500">My Accuracy:</span>
                                <p className="text-sm font-bold text-slate-200">
                                  {g.color === 'white' ? g.white_accuracy : g.black_accuracy}%
                                </p>
                              </div>
                              <div className="p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-400 hover:text-sky-400 transition">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Lifetime Chess Insights Tab */}
                {activeTab === 'insights' && <LifetimeInsights stats={stats} />}
              </>
            )}

          </div>
        )}

      </main>

      {/* 3. PLATFORM FOOTER */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/40 text-center text-xs font-mono text-slate-500 mt-auto">
        <p>© 2026 Chess Review AI. Powered securely by Gemini 3.5 & Stockfish WASM. Unauthorized use prohibited.</p>
      </footer>

    </div>
  );
}
