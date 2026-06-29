import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
const SafeChessboard = Chessboard as any;
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Play, Pause, 
  Award, AlertTriangle, Zap, CheckCircle, ShieldAlert, Sparkles, User, RefreshCw
} from 'lucide-react';
import { GameMeta, GameReviewResponse, MoveAnalysis } from '../types';

interface GameReviewProps {
  game: GameMeta;
  onBackToGames: () => void;
}

export default function GameReview({ game, onBackToGames }: GameReviewProps) {
  const [chess] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSpeed, setIsPlayingSpeed] = useState(1500); // ms per move
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analysis, setAnalysis] = useState<GameReviewResponse | null>(null);

  // Live Stockfish states
  const [stockfishEval, setStockfishEval] = useState<string>('0.30');
  const [stockfishLines, setStockfishLines] = useState<string[]>([]);
  const [isStockfishLoading, setIsStockfishLoading] = useState(false);

  const stockfishRef = useRef<Worker | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch detailed review from server
  useEffect(() => {
    async function fetchReview() {
      setLoadingAnalysis(true);
      try {
        const response = await fetch('/api/game/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.game_id, username: game.username })
        });
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data);
          // Initialize chess board with game's PGN
          chess.loadPgn(data.pgn);
          setCurrentMoveIndex(-1); // start at beginning
        }
      } catch (err) {
        console.error('Error fetching game analysis:', err);
      } finally {
        setLoadingAnalysis(false);
      }
    }
    fetchReview();
  }, [game.game_id]);

  // Load and setup client-side Stockfish Worker from CDN
  useEffect(() => {
    setIsStockfishLoading(true);
    let active = true;

    async function initStockfish() {
      try {
        // Fetch and load from CDN, converting to Blob URL to bypass same-origin policy
        const cdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
        const res = await fetch(cdnUrl);
        if (!res.ok) throw new Error('CDN unreachable');
        const code = await res.text();
        const blob = new Blob([code], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        if (!active) return;
        const worker = new Worker(blobUrl);
        stockfishRef.current = worker;

        // Initialize UCI
        worker.postMessage('uci');
        worker.postMessage('isready');

        worker.onmessage = (e) => {
          const line = e.data;
          // Parse score and moves from stdout
          // example: info depth 10 score cp 45 nodes 1234 pv e2e4 e7e5...
          if (line.startsWith('info') && line.includes('score')) {
            const scoreMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            const pvMatch = line.match(/pv (.+)/);

            if (scoreMatch) {
              const cpValue = parseInt(scoreMatch[1]) / 100;
              // Flip score if playing as Black
              const normalizedScore = chess.turn() === 'b' ? -cpValue : cpValue;
              setStockfishEval(normalizedScore > 0 ? `+${normalizedScore.toFixed(2)}` : normalizedScore.toFixed(2));
            } else if (mateMatch) {
              setStockfishEval(`M${mateMatch[1]}`);
            }

            if (pvMatch) {
              const pvMoves = pvMatch[1].split(' ').slice(0, 3);
              setStockfishLines(pvMoves);
            }
          }
        };

        setIsStockfishLoading(false);
      } catch (err) {
        console.warn('Failed to load local Stockfish engine:', err);
        setIsStockfishLoading(false);
      }
    }

    initStockfish();

    return () => {
      active = false;
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  // Update Stockfish analysis whenever move or FEN changes
  useEffect(() => {
    if (stockfishRef.current && !isStockfishLoading) {
      const currentFen = getFenAtMove(currentMoveIndex);
      stockfishRef.current.postMessage(`position fen ${currentFen}`);
      stockfishRef.current.postMessage('go depth 10');
    }
  }, [currentMoveIndex, isStockfishLoading]);

  // Handle Autoplay Loop
  useEffect(() => {
    if (isPlaying && analysis) {
      playIntervalRef.current = setInterval(() => {
        setCurrentMoveIndex((prev) => {
          if (prev >= analysis.moves.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, isPlayingSpeed);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, analysis, isPlayingSpeed]);

  // Support left/right arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!analysis) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentMoveIndex((prev) => Math.min(analysis.moves.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [analysis]);

  // Helper to construct FEN state at any index in move history
  function getFenAtMove(moveIndex: number): string {
    const tempChess = new Chess();
    if (!analysis) return tempChess.fen();
    tempChess.loadPgn(analysis.pgn);
    
    const history = tempChess.history();
    const subChess = new Chess();
    for (let i = 0; i <= moveIndex; i++) {
      if (history[i]) subChess.move(history[i]);
    }
    return subChess.fen();
  }

  const currentFen = getFenAtMove(currentMoveIndex);

  // Move navigation callbacks
  const handleNext = () => {
    if (analysis && currentMoveIndex < analysis.moves.length - 1) {
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentMoveIndex >= -1) {
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const handleFirst = () => {
    setCurrentMoveIndex(-1);
  };

  const handleLast = () => {
    if (analysis) {
      setCurrentMoveIndex(analysis.moves.length - 1);
    }
  };

  // Helper to map move classifications to custom styles & icons
  function getClassificationBadge(cls: string) {
    switch (cls) {
      case 'Brilliant':
        return { bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30', icon: <Zap className="w-4 h-4" />, label: 'Brilliant' };
      case 'Great':
        return { bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: <Award className="w-4 h-4" />, label: 'Great Move' };
      case 'Excellent':
        return { bg: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: <CheckCircle className="w-4 h-4" />, label: 'Excellent' };
      case 'Best':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="w-4 h-4" />, label: 'Best Move' };
      case 'Good':
        return { bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: <CheckCircle className="w-4 h-4" />, label: 'Good' };
      case 'Book':
        return { bg: 'bg-yellow-600/20 text-yellow-500 border-yellow-600/30', icon: <Sparkles className="w-4 h-4" />, label: 'Book Move' };
      case 'Inaccuracy':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: <AlertTriangle className="w-4 h-4" />, label: 'Inaccuracy' };
      case 'Mistake':
        return { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertTriangle className="w-4 h-4" />, label: 'Mistake' };
      case 'Blunder':
        return { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30', icon: <ShieldAlert className="w-4 h-4" />, label: 'Blunder' };
      default:
        return { bg: 'bg-slate-800 text-slate-400 border-slate-700', icon: null, label: 'Standard' };
    }
  }

  // Calculate position value for vertical eval bar
  const isScoreMate = stockfishEval.startsWith('M');
  const numericScore = parseFloat(stockfishEval) || 0;
  // Map evaluation to a percentage between 0% and 100% where 0 is white losing, 100 is white winning
  let whiteEvalPercent = 50;
  if (isScoreMate) {
    whiteEvalPercent = stockfishEval.includes('-') ? 5 : 95;
  } else {
    // Map -5 to +5 centipawns range to 10% to 90%
    whiteEvalPercent = 50 + (numericScore / 10) * 100;
    whiteEvalPercent = Math.max(5, Math.min(95, whiteEvalPercent));
  }

  return (
    <div className="space-y-6 animate-fade-in" id="game-review-tab">
      
      {/* Header and Back navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <button 
            onClick={onBackToGames}
            className="text-xs font-mono font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/5 px-3 py-1.5 rounded-lg border border-sky-500/15"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Games list
          </button>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-mono tracking-wider uppercase">Opening Played</span>
          <p className="text-sm font-semibold text-slate-200 mt-0.5">{game.opening}</p>
        </div>
      </div>

      {loadingAnalysis ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" id="analysis-loader">
          <RefreshCw className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-sm font-mono text-slate-400 animate-pulse">Running advanced engine evaluation and calling AI Coach...</p>
        </div>
      ) : !analysis ? (
        <div className="text-center py-20 border border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400">Failed to load detailed analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Chessboard, Evaluation Bar and Player Cards (8 columns on lg) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Top Opponent Card */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl px-4 py-2.5 flex justify-between items-center text-xs font-mono">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-300">{game.color === 'white' ? game.black_username : game.white_username}</span>
                <span className="text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">{game.color === 'white' ? game.black_rating : game.white_rating} ELO</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Accuracy:</span>
                <strong className={game.color === 'white' ? 'text-rose-400' : 'text-emerald-400'}>
                  {game.color === 'white' ? game.black_accuracy : game.white_accuracy}%
                </strong>
              </div>
            </div>

            {/* Chessboard Area (Flex Row with Eval Bar) */}
            <div className="flex gap-4 items-stretch" id="chessboard-container">
              
              {/* Vertical Evaluation Bar */}
              <div className="w-6 bg-slate-950 rounded-lg flex flex-col overflow-hidden border border-slate-800 relative select-none">
                {/* Black part (top) */}
                <div 
                  className="bg-slate-900 w-full transition-all duration-300 flex items-start justify-center pt-2"
                  style={{ height: `${100 - whiteEvalPercent}%` }}
                >
                  <span className="text-[10px] font-bold text-slate-500 font-mono rotate-180">
                    {numericScore <= 0 ? stockfishEval : ''}
                  </span>
                </div>
                {/* Divide line */}
                <div className="h-[2px] bg-sky-500 w-full z-10"></div>
                {/* White part (bottom) */}
                <div 
                  className="bg-slate-100 w-full transition-all duration-300 flex items-end justify-center pb-2 mt-auto"
                  style={{ height: `${whiteEvalPercent}%` }}
                >
                  <span className="text-[10px] font-bold text-slate-700 font-mono">
                    {numericScore > 0 ? stockfishEval : ''}
                  </span>
                </div>
              </div>

              {/* Main Board View */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl overflow-hidden aspect-square">
                <SafeChessboard 
                  position={currentFen} 
                  boardWidth={undefined} // responsive fluid width
                  boardOrientation={game.color}
                  arePiecesDraggable={false} // Analysis board is viewer-only
                  customBoardStyle={{
                    borderRadius: '12px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
                  }}
                  customDarkSquareStyle={{ backgroundColor: '#475569' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>

            </div>

            {/* Bottom Player Card */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl px-4 py-2.5 flex justify-between items-center text-xs font-mono">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-500" />
                <span className="font-semibold text-slate-300">{game.username}</span>
                <span className="text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">{game.color === 'white' ? game.white_rating : game.black_rating} ELO</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span>Accuracy:</span>
                <strong className={game.color === 'white' ? 'text-emerald-400' : 'text-rose-400'}>
                  {game.color === 'white' ? game.white_accuracy : game.black_accuracy}%
                </strong>
              </div>
            </div>

            {/* Chessboard Navigation and Speeds Controllers */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleFirst}
                  disabled={currentMoveIndex === -1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950"
                  title="First move"
                >
                  <ChevronsLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handlePrev}
                  disabled={currentMoveIndex === -1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950"
                  title="Previous move"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-xl flex items-center gap-1.5 transition"
                  title={isPlaying ? 'Pause' : 'Autoplay'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button 
                  onClick={handleNext}
                  disabled={currentMoveIndex === analysis.moves.length - 1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950"
                  title="Next move"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleLast}
                  disabled={currentMoveIndex === analysis.moves.length - 1}
                  className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950"
                  title="Last move"
                >
                  <ChevronsRight className="w-5 h-5" />
                </button>
              </div>

              {/* Speeds */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Auto-Speed:</span>
                <select 
                  value={isPlayingSpeed}
                  onChange={(e) => setIsPlayingSpeed(parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value={2000}>Slow (2s)</option>
                  <option value={1500}>Medium (1.5s)</option>
                  <option value={1000}>Fast (1s)</option>
                  <option value={500}>Superfast (0.5s)</option>
                </select>
              </div>
            </div>

            {/* Live Engine Suggestions Box */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex justify-between items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Stockfish Live Eval</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold font-mono ${stockfishEval.includes('+') ? 'text-emerald-400' : 'text-slate-300'}`}>{stockfishEval}</span>
                  <span className="text-xs text-slate-500 font-mono">(depth 10)</span>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Candidate Lines</span>
                <p className="text-xs font-semibold text-slate-300 font-mono mt-0.5">
                  {stockfishLines.length > 0 ? stockfishLines.join(' ➔ ') : 'Analyzing...'}
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT: Move List, Game Accuracies, Coach Summaries (4 columns on lg) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Game Review Accuracies Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Game Overview</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-mono text-slate-500">Accuracy Score</span>
                  <p className="text-2xl font-black text-slate-100 font-mono mt-1">
                    {game.color === 'white' ? game.white_accuracy : game.black_accuracy}%
                  </p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-mono text-slate-500">Perf. Rating</span>
                  <p className="text-2xl font-black text-amber-500 font-mono mt-1">
                    {analysis.perfRating} <span className="text-xs text-slate-500">ELO</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Best Move:</span>
                  <strong className="text-emerald-400">{analysis.bestMove}</strong>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Brilliant Move:</span>
                  <strong className="text-teal-400">{analysis.brilliantMove}</strong>
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Biggest Error:</span>
                  <strong className="text-rose-400">{analysis.biggestMistake}</strong>
                </div>
              </div>
            </div>

            {/* 2. Coach Summary (Gemini AI Summary) */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden" id="coach-review">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles className="w-24 h-24 text-indigo-400" />
              </div>
              <h4 className="text-xs font-semibold uppercase text-indigo-400 flex items-center gap-1.5 mb-3 font-sans tracking-wide">
                <Sparkles className="w-4 h-4" /> AI Coach Review
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium italic">
                "{analysis.aiSummary}"
              </p>
            </div>

            {/* 3. Move List (Scrollable Interactive List) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4" id="moves-history-box">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">Moves List</h4>
              
              <div className="max-h-60 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {/* Render moves as pairs (White/Black) */}
                {Array.from({ length: Math.ceil(analysis.moves.length / 2) }).map((_, rIdx) => {
                  const wMove = analysis.moves[rIdx * 2];
                  const bMove = analysis.moves[rIdx * 2 + 1];

                  const wClass = wMove ? getClassificationBadge(wMove.classification) : null;
                  const bClass = bMove ? getClassificationBadge(bMove.classification) : null;

                  return (
                    <div key={rIdx} className="grid grid-cols-12 gap-1 py-1.5 border-b border-slate-850 text-xs font-mono items-center">
                      <span className="col-span-2 text-slate-500 font-semibold">{rIdx + 1}.</span>
                      
                      {/* White Move */}
                      {wMove ? (
                        <button 
                          onClick={() => setCurrentMoveIndex(rIdx * 2)}
                          className={`col-span-5 text-left px-2 py-1 rounded hover:bg-slate-800/80 flex items-center justify-between text-slate-300 font-semibold ${currentMoveIndex === rIdx * 2 ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400' : 'border border-transparent'}`}
                        >
                          <span>{wMove.san}</span>
                          {wClass && wClass.icon && (
                            <span className={`text-[10px] p-0.5 rounded ${wClass.bg}`} title={wClass.label}>
                              {wClass.icon}
                            </span>
                          )}
                        </button>
                      ) : <span className="col-span-5"></span>}

                      {/* Black Move */}
                      {bMove ? (
                        <button 
                          onClick={() => setCurrentMoveIndex(rIdx * 2 + 1)}
                          className={`col-span-5 text-left px-2 py-1 rounded hover:bg-slate-800/80 flex items-center justify-between text-slate-300 font-semibold ${currentMoveIndex === rIdx * 2 + 1 ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400' : 'border border-transparent'}`}
                        >
                          <span>{bMove.san}</span>
                          {bClass && bClass.icon && (
                            <span className={`text-[10px] p-0.5 rounded ${bClass.bg}`} title={bClass.label}>
                              {bClass.icon}
                            </span>
                          )}
                        </button>
                      ) : <span className="col-span-5"></span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Critical Moments & Turning Points */}
            {analysis.criticalMoments && analysis.criticalMoments.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Critical Game Moments
                </h4>
                <div className="space-y-3">
                  {analysis.criticalMoments.map((moment, mIdx) => (
                    <div key={mIdx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300 font-mono">Move {Math.ceil(moment.ply / 2)} ({moment.san})</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${moment.type === 'Brilliant' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-rose-500/20 text-rose-450 border-rose-500/30'}`}>
                          {moment.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {moment.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
