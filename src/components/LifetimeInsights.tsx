import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
const SafeChessboard = Chessboard as any;
import { 
  Sparkles, Zap, Award, Target, HelpCircle, ExternalLink, ShieldCheck, 
  BookOpen, ChevronRight, RefreshCw, BarChart, TrendingUp, AlertOctagon
} from 'lucide-react';
import { PlayerStatsResponse, DnaReport, AiInsights, BrilliantMoveDetail } from '../types';

interface LifetimeInsightsProps {
  stats: PlayerStatsResponse;
}

export default function LifetimeInsights({ stats }: LifetimeInsightsProps) {
  const { profile } = stats;
  const [loadingAi, setLoadingAi] = useState(true);
  const [dnaReport, setDnaReport] = useState<DnaReport | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [brilliantMoves, setBrilliantMoves] = useState<BrilliantMoveDetail[]>([]);
  const [activeTab, setActiveTab] = useState<'dna' | 'openings' | 'brilliant'>('dna');

  // Fetch AI Insights and Brilliant Moves from secure server-side proxy
  useEffect(() => {
    async function fetchAiData() {
      setLoadingAi(true);
      try {
        const [insightsRes, brilliantRes] = await Promise.all([
          fetch(`/api/player/ai-insights?username=${profile.username}`),
          fetch(`/api/player/brilliant-moves?username=${profile.username}`)
        ]);

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setDnaReport(insightsData.dnaReport);
          setAiInsights(insightsData.aiInsights);
        }
        if (brilliantRes.ok) {
          const brilliantData = await brilliantRes.json();
          setBrilliantMoves(brilliantData.brilliantMoves);
        }
      } catch (err) {
        console.error('Error fetching lifetime AI insights:', err);
      } finally {
        setLoadingAi(false);
      }
    }
    fetchAiData();
  }, [profile.username]);

  return (
    <div className="space-y-8 animate-fade-in" id="lifetime-insights-tab">
      
      {/* 1. Insights Navigation Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dna')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'dna' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
          >
            🧬 Chess DNA Report & Insights
          </button>
          <button
            onClick={() => setActiveTab('openings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'openings' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'}`}
          >
            ♟️ Opening Intelligence
          </button>
          <button
            onClick={() => setActiveTab('brilliant')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition relative ${activeTab === 'brilliant' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-teal-400 hover:text-teal-300 hover:bg-slate-900/60'}`}
          >
            ⚡ Lifetime Brilliant Moves
            <span className="absolute -top-1.5 -right-1.5 bg-teal-500/20 text-teal-400 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-teal-500/30">
              {profile.brilliantCount}
            </span>
          </button>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Career Profile: <strong className="text-slate-300 font-semibold">{profile.username}</strong>
        </div>
      </div>

      {loadingAi ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4" id="insights-loader">
          <RefreshCw className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-sm font-mono text-slate-400 animate-pulse">Assembling Chess DNA Report and compiling brilliant moves history using Gemini...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: Chess DNA & AI Insights */}
          {activeTab === 'dna' && dnaReport && aiInsights && (
            <div className="space-y-6 animate-fade-in" id="dna-report-pane">
              
              {/* Top Summary Block */}
              <div className="bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-900/60 border border-sky-500/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Sparkles className="w-32 h-32 text-sky-400" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">A.I. Style Classification</span>
                    <h3 className="text-3xl font-extrabold text-slate-100 font-sans tracking-tight mt-1">{dnaReport.classification}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mt-2">
                      {aiInsights.playingStyle}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 min-w-xs text-center">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Real Playing Strength</span>
                    <p className="text-xs text-slate-300 font-semibold leading-relaxed mt-2">{dnaReport.estimatedStrength}</p>
                  </div>
                </div>
              </div>

              {/* Strengths / Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Key Tactical Strengths
                  </h4>
                  <ul className="space-y-3">
                    {dnaReport.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 font-medium">
                        <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Tactical Assessment</span>
                    <p className="text-xs text-slate-400 mt-1">{aiInsights.tacticalStrength}</p>
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                  <h4 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-400" /> Development Gaps
                  </h4>
                  <ul className="space-y-3">
                    {dnaReport.weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 font-medium">
                        <ChevronRight className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Common Mistakes Log</span>
                    <p className="text-xs text-slate-400 mt-1">{aiInsights.mostCommonMistakes}</p>
                  </div>
                </div>

              </div>

              {/* Stylistic GM Comparison */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" /> Style Comparison & Archetype
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {dnaReport.comparison}
                </p>
              </div>

              {/* Comprehensive Phase-by-Phase Game Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Middlegame Performance */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Middlegame IQ</span>
                  <h5 className="text-sm font-bold text-slate-200">Middlegame Performance</h5>
                  <p className="text-xs text-slate-450 leading-relaxed">{aiInsights.middlegamePerformance}</p>
                </div>

                {/* Endgame Performance */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Endgame Technique</span>
                  <h5 className="text-sm font-bold text-slate-200">Endgame Quality</h5>
                  <p className="text-xs text-slate-450 leading-relaxed">{aiInsights.endgamePerformance}</p>
                </div>

                {/* Time Management */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Time Management</span>
                  <h5 className="text-sm font-bold text-slate-200">Clock & Speeds Habits</h5>
                  <p className="text-xs text-slate-450 leading-relaxed">{aiInsights.timeManagement}</p>
                </div>

              </div>

              {/* Actionable Improvement Roadmap */}
              <div className="bg-gradient-to-br from-teal-950/40 to-slate-900/60 border border-teal-500/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Target className="w-24 h-24 text-teal-400" />
                </div>
                <h4 className="text-base font-bold text-teal-400 flex items-center gap-1.5 mb-3 font-sans">
                  <Target className="w-5 h-5" /> Personalized Improvement Roadmap
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium">
                  {aiInsights.improvementTrend}
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: Opening Intelligence */}
          {activeTab === 'openings' && (
            <div className="space-y-6 animate-fade-in" id="opening-intelligence-pane">
              
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h4 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-indigo-400" /> Full Opening Repertoire Performance Breakdowns
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-850">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                        <th className="p-4 font-semibold uppercase tracking-wider">Chess Opening Name</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-center">Games Count</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-center">Win Rate</th>
                        <th className="p-4 font-semibold uppercase tracking-wider text-center">Average Accuracy</th>
                        <th className="p-4 font-semibold uppercase tracking-wider">Scoring Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {profile.openingIntel.map((intel, idx) => {
                        let tier = 'Stable';
                        let tierColor = 'text-slate-400 bg-slate-950';
                        if (intel.winRate >= 60 && intel.count >= 3) {
                          tier = 'Elite';
                          tierColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        } else if (intel.winRate <= 40 && intel.count >= 3) {
                          tier = 'Sub-optimal';
                          tierColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-900/40 text-slate-300 font-medium">
                            <td className="p-4 font-semibold font-sans text-sm text-slate-100">{intel.opening}</td>
                            <td className="p-4 text-center text-slate-200">{intel.count}</td>
                            <td className="p-4 text-center font-bold text-emerald-400">{intel.winRate}%</td>
                            <td className="p-4 text-center text-sky-400 font-bold">{intel.avgAccuracy}%</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${tierColor}`}>
                                {tier}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <h5 className="text-sm font-bold text-emerald-400">Opening Quality Insight</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {aiInsights ? aiInsights.openingQuality : "Studying openings based on rating..."}
                  </p>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <h5 className="text-sm font-bold text-indigo-400">Repertoire Expansion Recommendation</h5>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Based on your preference for <strong className="text-slate-200">{profile.favoriteOpening}</strong>, you score significantly higher with active center-controlling structures. Study pawn breaks in the middlegame to lift your conversion accuracy.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Lifetime Brilliant Moves */}
          {activeTab === 'brilliant' && (
            <div className="space-y-6 animate-fade-in" id="lifetime-brilliant-pane">
              
              <div className="bg-gradient-to-r from-teal-950/20 via-slate-900/40 to-slate-900/60 border border-teal-500/15 rounded-2xl p-6">
                <h4 className="text-base font-bold text-teal-400 mb-2 flex items-center gap-1.5 font-sans">
                  <Zap className="w-5 h-5" /> Lifetime Brilliant Moves Ledger
                </h4>
                <p className="text-sm text-slate-350 leading-relaxed">
                  Browse the actual game positions where your chess instincts peaked! For every brilliant move played across your career, we have reconstructed the board state before and after the move.
                </p>
              </div>

              {brilliantMoves.length === 0 ? (
                <div className="text-center py-20 border border-slate-800 rounded-2xl bg-slate-900/40">
                  <p className="text-slate-450 font-mono">No brilliant moves found in the cached archives yet. Play highly precise games to spark brilliant move tags!</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {brilliantMoves.map((brilliant, bIdx) => (
                    <div key={bIdx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                      
                      {/* Top metadata */}
                      <div className="flex flex-wrap justify-between items-center border-b border-slate-800/85 pb-4 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">Brilliant Move</span>
                            <span className="text-xs font-semibold text-slate-300 font-mono">vs {brilliant.opponent}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-200 mt-1">{brilliant.opening}</p>
                        </div>
                        <div className="text-right text-xs font-mono text-slate-400">
                          <p>{brilliant.date}</p>
                          <a 
                            href={brilliant.gameId} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-1 justify-end"
                          >
                            Game original Link <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Side-by-side Chessboards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        
                        {/* Before position */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-amber-400 font-semibold">Position BEFORE Move</span>
                            <span className="text-slate-500">Eval: {brilliant.position.evalBefore.toFixed(1)}</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-850 p-2 rounded-xl aspect-square overflow-hidden">
                            <SafeChessboard 
                              position={brilliant.position.fenBefore} 
                              arePiecesDraggable={false}
                              customDarkSquareStyle={{ backgroundColor: '#475569' }}
                              customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                            />
                          </div>
                        </div>

                        {/* After position */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-teal-400 font-semibold">Played: {brilliant.position.sanMove} (AFTER)</span>
                            <span className="text-teal-400">Eval: +{brilliant.position.evalAfter.toFixed(1)}</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-850 p-2 rounded-xl aspect-square overflow-hidden">
                            <SafeChessboard 
                              position={brilliant.position.fenAfter} 
                              arePiecesDraggable={false}
                              customDarkSquareStyle={{ backgroundColor: '#475569' }}
                              customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                            />
                          </div>
                        </div>

                      </div>

                      {/* Tactical Explanation Box */}
                      <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                        <span className="text-[10px] font-mono uppercase text-teal-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> AI Coach Explanation
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium italic">
                          "{brilliant.position.explanation}"
                        </p>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
