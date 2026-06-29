import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini client with proper User-Agent header for telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Helper to generate a tailored, professional fallback review when Gemini is unavailable.
 */
function getFallbackGameReviewSummary(params: {
  username: string;
  opponent: string;
  playerColor: string;
  result: string;
  opening: string;
  accuracy: number;
  opponentAccuracy: number;
  movesCount: number;
  moveStats: any;
}): string {
  const colorText = params.playerColor.toLowerCase();
  
  // Sentence 1: Analyze opening
  let sentence1 = "";
  if (params.opening && params.opening !== 'Unknown' && params.opening !== 'N/A' && params.opening !== 'N/A Opening') {
    sentence1 = `You opted for the ${params.opening} as ${params.playerColor}, navigating the opening phase with solid positional awareness to establish early-game stability.`;
  } else {
    sentence1 = `Playing as ${params.playerColor}, you developed your forces actively in the opening phase, aiming to claim central space and establish active piece play early on.`;
  }

  // Sentence 2: Critical turning point / tactics
  let sentence2 = "";
  const accuracyDiff = params.accuracy - params.opponentAccuracy;
  const isHighAccuracy = params.accuracy >= 85;
  const hasBlunders = (params.moveStats?.blunder || 0) > 0;
  const hasBrilliant = (params.moveStats?.brilliant || 0) > 0;

  if (hasBrilliant) {
    sentence2 = `The middlegame was illuminated by your brilliant tactical moves, showing immense calculation depth that completely seized control and pushed your accuracy to a commendable ${params.accuracy}%.`;
  } else if (hasBlunders) {
    sentence2 = `Although you maintained a competitive ${params.accuracy}% accuracy, the game reached a chaotic tactical turning point where critical blunder(s) allowed your opponent to complicate the position.`;
  } else if (isHighAccuracy) {
    sentence2 = `With a brilliant accuracy rating of ${params.accuracy}%, you played an exceptionally precise, clean positional masterclass, leaving very little room for your opponent to generate active counterplay.`;
  } else if (accuracyDiff > 10) {
    sentence2 = `Your superior precision (${params.accuracy}% vs ${params.opponentAccuracy}%) allowed you to exploit tactical opportunities in the middlegame, gradually outplaying your opponent.`;
  } else {
    sentence2 = `Both players battled tenaciously, resulting in a balanced clash where your accuracy of ${params.accuracy}% kept the tension high through various tactical skirmishes.`;
  }

  // Sentence 3: Coaching advice
  let sentence3 = "";
  if ((params.moveStats?.blunder || 0) > 1 || (params.moveStats?.mistake || 0) > 2) {
    sentence3 = `For your next matches, prioritize tactical vision and double-checking king safety before committing to concrete piece trades.`;
  } else if (params.accuracy < 70) {
    sentence3 = `To raise your ELO, focus on expanding your opening repertoire and practicing board-vision puzzles to spot unguarded squares.`;
  } else if (params.result === 'loss') {
    sentence3 = `Refining your endgame technique and converting micro-advantages into winning positions will be your key to turning these close matches around.`;
  } else {
    sentence3 = `Continue building on this active style, and focus on studying master games in the ${params.opening || 'selected opening'} to deepen your structural knowledge.`;
  }

  return `${sentence1} ${sentence2} ${sentence3}`;
}

/**
 * Generate a Game Review summary for a single selected game.
 */
export async function generateGameReviewSummary(params: {
  username: string;
  opponent: string;
  playerColor: string;
  result: string;
  opening: string;
  accuracy: number;
  opponentAccuracy: number;
  movesCount: number;
  moveStats: any;
}): Promise<string> {
  const outcomeText = params.result === 'win' 
    ? 'won the game' 
    : params.result === 'draw' 
    ? 'drew the game' 
    : 'lost the game';

  const prompt = `
    You are an expert chess coach. Write a concise, engaging, and professional 3-sentence game summary for a player named "${params.username}" who played ${params.playerColor} and ${outcomeText} against "${params.opponent}".
    
    Game Details:
    - Opening: ${params.opening}
    - Moves played: ${params.movesCount}
    - ${params.username}'s accuracy: ${params.accuracy}%
    - Opponent's accuracy: ${params.opponentAccuracy}%
    - ${params.username}'s move breakdown: 
      * Brilliant: ${params.moveStats.brilliant}
      * Great: ${params.moveStats.great}
      * Best: ${params.moveStats.best}
      * Excellent: ${params.moveStats.excellent}
      * Good: ${params.moveStats.good}
      * Book: ${params.moveStats.book}
      * Inaccuracy: ${params.moveStats.inaccuracy}
      * Mistake: ${params.moveStats.mistake}
      * Blunder: ${params.moveStats.blunder}

    Instructions:
    1. Sentence 1: Analyze the opening phase (${params.opening}) and how well the player navigated it.
    2. Sentence 2: Mention the critical tactical turning point, referencing the player's accuracy and highlight any Blunders, Mistakes, or Brilliant moves.
    3. Sentence 3: Give direct coaching advice on what they should focus on next (e.g., tactical alertness, endgame precision, or opening study).
    
    Keep the tone encouraging, technical yet readable, and directly addressed to the player.
  `;

  // 1. Try primary model (gemini-3.5-flash)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Grandmaster Chess Coach providing quick, insightful reviews of games."
      }
    });

    if (response.text) {
      return response.text.trim();
    }
  } catch (error) {
    console.warn("Primary model gemini-3.5-flash failed or experienced high demand. Trying backup model...", error);
  }

  // 2. Try backup model (gemini-3.1-flash-lite)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Grandmaster Chess Coach providing quick, insightful reviews of games."
      }
    });

    if (response.text) {
      return response.text.trim();
    }
  } catch (backupError) {
    console.error("Backup model gemini-3.1-flash-lite also failed:", backupError);
  }

  // 3. Fallback to highly polished template-based coach summary
  console.log("Both Gemini model attempts failed. Generating high-quality coaching fallback summary...");
  return getFallbackGameReviewSummary(params);
}

/**
 * Generate Chess DNA Report and Lifetime Insights.
 */
export async function generateChessDnaAndInsights(stats: {
  username: string;
  currentRating: number;
  highestRating: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  totalMoves: number;
  avgAccuracy: number;
  brilliantCount: number;
  greatCount: number;
  bestCount: number;
  excellentCount: number;
  goodCount: number;
  inaccuracyCount: number;
  mistakeCount: number;
  blunderCount: number;
  favoriteOpening: string;
  bestOpening: string;
}): Promise<{
  dnaReport: {
    classification: string;
    strengths: string[];
    weaknesses: string[];
    estimatedStrength: string;
    comparison: string;
  };
  aiInsights: {
    playingStyle: string;
    tacticalStrength: string;
    positionalStrength: string;
    openingQuality: string;
    middlegamePerformance: string;
    endgamePerformance: string;
    timeManagement: string;
    mostCommonMistakes: string;
    improvementTrend: string;
  };
}> {
  const prompt = `
    You are an elite Chess analytics system powered by artificial intelligence. Analyze the following player's complete lifetime chess profile and output a highly detailed report in JSON format.

    Player Stats for "${stats.username}":
    - Current Rating: ${stats.currentRating}
    - Highest Rating Achieved: ${stats.highestRating}
    - Total Games: ${stats.totalGames} (Wins: ${stats.wins}, Losses: ${stats.losses}, Draws: ${stats.draws})
    - Total Moves Analyzed: ${stats.totalMoves}
    - Average Move Accuracy: ${stats.avgAccuracy}%
    - Move Classification Totals:
      * Brilliant Moves: ${stats.brilliantCount}
      * Great Moves: ${stats.greatCount}
      * Best Moves: ${stats.bestCount}
      * Excellent Moves: ${stats.excellentCount}
      * Good Moves: ${stats.goodCount}
      * Inaccuracies: ${stats.inaccuracyCount}
      * Mistakes: ${stats.mistakeCount}
      * Blunders: ${stats.blunderCount}
    - Favorite Opening: ${stats.favoriteOpening}
    - Best Scoring Opening: ${stats.bestOpening}

    Provide two structured items in your response matching this exact schema:
    {
      "dnaReport": {
        "classification": "Classification name (e.g. Tactical Attacker, Positional Player, Endgame Specialist, Aggressive Gambiteer, or Dynamic All-Rounder)",
        "strengths": ["Strength 1", "Strength 2", "Strength 3"],
        "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
        "estimatedStrength": "Detailed description of their real playing strength relative to their ELO",
        "comparison": "A direct comparison with a famous Grandmaster who shares their style, and how they compare with average players of the same rating"
      },
      "aiInsights": {
        "playingStyle": "Detailed analysis of their style, preferences, and tactical vs positional tendencies.",
        "tacticalStrength": "Detailed assessment of tactical patterns, safety, and checkmate/sacrifice execution.",
        "positionalStrength": "Detailed review of pawn structures, piece placement, and planning.",
        "openingQuality": "Analysis of opening repertoire (${stats.favoriteOpening} and ${stats.bestOpening}) and consistency.",
        "middlegamePerformance": "Analysis of how they navigate middlegame complexities, trades, and imbalances.",
        "endgamePerformance": "Assessment of endgame knowledge, king activity, and converting advantages.",
        "timeManagement": "Analysis of time usage habits, playing speed, and composure under pressure.",
        "mostCommonMistakes": "Most frequent errors (Inaccuracies/Mistakes/Blunders) they make and why they happen.",
        "improvementTrend": "Actionable, highly personalized roadmap for continuing their rating progression."
      }
    }

    Ensure all text descriptions are professional, chess-technical, constructive, and highly descriptive. Return ONLY valid JSON matching the schema.
  `;

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      required: ["dnaReport", "aiInsights"],
      properties: {
        dnaReport: {
          type: Type.OBJECT,
          required: ["classification", "strengths", "weaknesses", "estimatedStrength", "comparison"],
          properties: {
            classification: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedStrength: { type: Type.STRING },
            comparison: { type: Type.STRING }
          }
        },
        aiInsights: {
          type: Type.OBJECT,
          required: [
            "playingStyle", "tacticalStrength", "positionalStrength", "openingQuality",
            "middlegamePerformance", "endgamePerformance", "timeManagement",
            "mostCommonMistakes", "improvementTrend"
          ],
          properties: {
            playingStyle: { type: Type.STRING },
            tacticalStrength: { type: Type.STRING },
            positionalStrength: { type: Type.STRING },
            openingQuality: { type: Type.STRING },
            middlegamePerformance: { type: Type.STRING },
            endgamePerformance: { type: Type.STRING },
            timeManagement: { type: Type.STRING },
            mostCommonMistakes: { type: Type.STRING },
            improvementTrend: { type: Type.STRING }
          }
        }
      }
    }
  };

  // 1. Try primary model (gemini-3.5-flash)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (error) {
    console.warn("Primary model failed for Chess DNA analysis. Trying backup model...", error);
  }

  // 2. Try backup model (gemini-3.1-flash-lite)
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
  } catch (backupError) {
    console.error("Backup model failed for Chess DNA analysis:", backupError);
  }

  // 3. Fallback to default high-quality report
  console.log("Both Gemini attempts failed for Chess DNA. Generating high-quality fallback profile...");
  return {
    dnaReport: {
      classification: "Dynamic Universalist",
      strengths: ["Tactical awareness", "Opening consistency", "Resilience in defense"],
      weaknesses: ["Endgame conversion", "Pawn structure weaknesses", "Time pressure management"],
      estimatedStrength: `Estimated strength matches your current rating of ${stats.currentRating} ELO with potential for rapid growth if endgame skills are sharpened.`,
      comparison: "Your style exhibits versatility similar to Garry Kasparov, blending active piece play with dynamic counterattacking options."
    },
    aiInsights: {
      playingStyle: `Dynamic player who shows a strong preference for active piece play. Navigates positions with high confidence, especially when playing ${stats.favoriteOpening}.`,
      tacticalStrength: "Exhibits solid tactical vision. Most tactical errors occur in complex, double-edged positions.",
      positionalStrength: "Understands key positional guidelines. Tends to overextend pawns occasionally, leading to exploitable weaknesses.",
      openingQuality: `Opening preparation is consistent. Your performance in the ${stats.favoriteOpening} and ${stats.bestOpening} is a major source of rating points.`,
      middlegamePerformance: "Maintains active plans in the middlegame. Focus on identifying and targeting opponent's backward pawns and weak squares.",
      endgamePerformance: "Endgame conversion shows room for development. Practice basic rook endings and king activity in minor-piece endings.",
      timeManagement: "Maintains a steady pace but can experience time trouble in highly critical middlegame moments.",
      mostCommonMistakes: `Your mistakes are often caused by tactical oversights or rushed decisions under pressure, resulting in ${stats.blunderCount} blunders over your career.`,
      improvementTrend: "Consistently identifying and reducing blunders in rapid and blitz controls will trigger a substantial rating surge."
    }
  };
}
