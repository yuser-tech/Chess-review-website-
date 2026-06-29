import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Legend, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Trophy, TrendingUp, Award, PlayCircle, Percent, AlertTriangle, ShieldCheck, Zap, HelpCircle
} from 'lucide-react';
import { PlayerStatsResponse } from '../types';

interface DashboardProps {
  stats: PlayerStatsResponse;
}

export default function Dashboard({ stats }: DashboardProps) {
  const { profile, trends } = stats;

  const totalGames = profile.totalGames;
  const winRate = totalGames > 0 ? ((profile.wins / totalGames) * 100).toFixed(1) : '0';
  const lossRate = totalGames > 0 ? ((profile.losses / totalGames) * 100).toFixed(1) : '0';
  const drawRate = totalGames > 0 ? ((profile.draws / totalGames) * 100).toFixed(1) : '0';

  // Openings Chart Data
  const openingsData = profile.openingIntel.slice(0, 5).map(o => ({
    name: o.opening.length > 18 ? o.opening.slice(0, 16) + '...' : o.opening,
    Games: o.count,
    'Win Rate %': o.winRate,
    'Accuracy %': o.avgAccuracy
  }));

  // Classification Radar Data
  const classificationData = [
    { name: 'Brilliant', value: Math.min(100, (profile.brilliantCount / totalGames) * 500) },
    { name: 'Great', value: Math.min(100, (profile.greatCount / totalGames) * 150) },
    { name: 'Best', value: Math.min(100, (profile.bestCount / totalGames) * 2.5) },
    { name: 'Excellent', value: Math.min(100, (profile.excellentCount / totalGames) * 3.5) },
    { name: 'Book', value: Math.min(100, (profile.goodCount / totalGames) * 5) }
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-tab">
      
      {/* 1. Career Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Rating Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden" id="card-rating">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-24 h-24 text-amber-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Current Rating</p>
              <h3 className="text-3xl font-bold text-slate-100 font-sans tracking-tight mt-1">{profile.currentRating} <span className="text-xs text-slate-500 font-mono">ELO</span></h3>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Peak Rating achieved: <strong className="text-amber-400 font-mono font-semibold">{profile.highestRating}</strong></span>
          </div>
        </div>

        {/* Win/Loss Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden" id="card-wins">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PlayCircle className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Total Games Played</p>
              <h3 className="text-3xl font-bold text-slate-100 font-sans tracking-tight mt-1">{totalGames.toLocaleString()}</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-emerald-400">{profile.wins}W ({winRate}%)</span>
              <span className="text-slate-400">{profile.draws}D ({drawRate}%)</span>
              <span className="text-rose-400">{profile.losses}L ({lossRate}%)</span>
            </div>
            <div className="h-2 bg-slate-850 rounded-full flex overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${winRate}%` }}></div>
              <div className="bg-slate-500 h-full" style={{ width: `${drawRate}%` }}></div>
              <div className="bg-rose-500 h-full" style={{ width: `${lossRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Career Accuracy Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden" id="card-accuracy">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Percent className="w-24 h-24 text-sky-500" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-500">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Average Accuracy</p>
              <h3 className="text-3xl font-bold text-slate-100 font-sans tracking-tight mt-1">{profile.avgAccuracy}%</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-sky-400">Peak Game: {profile.mostAccurateGame?.accuracy || 0}%</span>
            <span className="text-rose-400">Lowest Game: {profile.leastAccurateGame?.accuracy || 0}%</span>
          </div>
        </div>

        {/* Brilliant Moves Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden" id="card-brilliant">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-24 h-24 text-teal-400" />
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">Total Brilliant Moves</p>
              <h3 className="text-3xl font-bold text-teal-400 font-sans tracking-tight mt-1">{profile.brilliantCount}</h3>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-teal-400" /> {profile.greatCount} Great moves</span>
            <span className="font-mono text-xs">{profile.yearsActive} yr{profile.yearsActive > 1 ? 's' : ''} active</span>
          </div>
        </div>

      </div>

      {/* 2. Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Rating Trend Line Chart */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6" id="chart-rating-trend">
          <h4 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" /> Rating Progression Trend
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.ratingTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 100', 'dataMax + 100']} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 7 }} name="ELO Rating" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accuracy Over Time Area Chart */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6" id="chart-accuracy-trend">
          <h4 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <Percent className="w-5 h-5 text-sky-500" /> Career Accuracy Trend
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.accuracyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[40, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#accuracyGrad)" name="Accuracy %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Opening IQ and Mistake Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mistakes per Game Chart */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 lg:col-span-2" id="chart-mistakes">
          <h4 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> Average Critical Mistakes per Game
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends.mistakesTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                />
                <Bar dataKey="mistakes" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={25} name="Mistakes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Move Classifications Distribution */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col justify-between" id="chart-radar">
          <h4 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" /> Move Quality Distribution
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-400 font-mono">Brilliant/Great</span>
                <p className="text-lg font-bold text-teal-400 mt-1 font-mono">{profile.brilliantCount + profile.greatCount}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-400 font-mono">Best/Excellent</span>
                <p className="text-lg font-bold text-sky-400 mt-1 font-mono">{profile.bestCount + profile.excellentCount}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-400 font-mono">Inaccuracies</span>
                <p className="text-lg font-bold text-amber-500 mt-1 font-mono">{profile.inaccuracyCount}</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                <span className="text-xs text-slate-400 font-mono">Mistakes/Blunders</span>
                <p className="text-lg font-bold text-rose-500 mt-1 font-mono">{profile.mistakeCount + profile.blunderCount}</p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-semibold text-emerald-400">Favorite Opening:</span>
                <span className="font-mono">{profile.favoriteOpening}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-semibold text-sky-400">Highest Scoring Opening:</span>
                <span className="font-mono">{profile.bestOpening}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Openings Played Deep Intelligence */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6" id="chart-openings">
        <h4 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" /> Opening Repertoire Performance
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={openingsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                labelStyle={{ color: '#94a3b8', fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Games" fill="#6366f1" radius={[4, 4, 0, 0]} name="Games Played" />
              <Bar dataKey="Win Rate %" fill="#10b981" radius={[4, 4, 0, 0]} name="Win Rate %" />
              <Bar dataKey="Accuracy %" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Accuracy %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
