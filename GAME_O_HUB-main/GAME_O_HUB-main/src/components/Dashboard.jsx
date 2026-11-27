import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/SoundManager';

const gamesList = [
  {
    id: 'gesture',
    name: '🤖 Hand Gesture Game',
    description: 'Use your webcam and hand motions to control a ship dodging meteorites!',
    difficulty: 'Hard',
    rating: 4.8,
    badge: 'AI Powered',
    color: 'cyan'
  },
  {
    id: 'tictactoe',
    name: '❌⭕ Neon Tic-Tac-Toe',
    description: 'Play the classic Xs and Os against a smart Minimax AI or local friend.',
    difficulty: 'Easy',
    rating: 4.5,
    badge: 'VS AI',
    color: 'magenta'
  },
  {
    id: 'typing',
    name: '⌨️ Typing Speed Test',
    description: 'Test your words-per-minute (WPM) speed and typing accuracy.',
    difficulty: 'Medium',
    rating: 4.2,
    badge: 'Challenger',
    color: 'orange'
  },
  {
    id: 'swipe',
    name: '🟦 Swipe the Plate',
    description: 'Click and clear the plates before they disappear. Don\'t let them miss!',
    difficulty: 'Medium',
    rating: 4.6,
    badge: 'Reflex',
    color: 'cyan'
  },
  {
    id: 'sliding',
    name: '🧩 Sliding Puzzle',
    description: 'Arrange the tiles in ascending order from 1 to 15 in minimal moves.',
    difficulty: 'Hard',
    rating: 4.4,
    badge: 'Puzzle',
    color: 'magenta'
  },
  {
    id: 'dino',
    name: '🦖 Dino Runner',
    description: 'Dodge obstacles in a neon-retrofitted infinite arcade runner.',
    difficulty: 'Easy',
    rating: 4.3,
    badge: 'Arcade',
    color: 'orange'
  },
  {
    id: 'menja',
    name: '🎲 Menja (Slasher)',
    description: 'Slash floating blocks with your mouse cursor like a ninja! Watch your lives!',
    difficulty: 'Hard',
    rating: 4.9,
    badge: 'Action',
    color: 'cyan'
  }
];

export default function Dashboard({ onSelectGame, stats, soundEnabled, onToggleSound, currentUser, onLogout }) {
  const [leaderboards, setLeaderboards] = useState({});
  const [loading, setLoading] = useState(true);

  const getHighScore = (gameId) => {
    return localStorage.getItem(`high_score_${gameId}`) || 0;
  };

  const getPlayCount = (gameId) => {
    return localStorage.getItem(`play_count_${gameId}`) || 0;
  };

  // Fetch all leaderboard summary on mount
  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leaderboard/all/summary');
        const data = await response.json();
        if (active && data.summary) {
          setLeaderboards(data.summary);
        }
      } catch (err) {
        console.error('Failed to load leaderboards summary:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSummary();
    return () => { active = false; };
  }, []);

  return (
    <div style={styles.container}>
      {/* Top Bar with user profile info */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title} className="flicker">GAME-O-<span style={{ color: 'var(--neon-magenta)' }}>HUB</span></h1>
          <p style={styles.subtitle}>THE CYBERPUNK ARCADE TERMINAL</p>
          <p style={styles.developer}>DEVELOPED BY PRAVEE9A</p>
        </div>
        
        <div style={styles.headerControls}>
          {currentUser ? (
            <div style={styles.profileBox} className="glass-card">
              <span style={styles.usernameText}>👤 {currentUser.username}</span>
              <button 
                onClick={() => {
                  soundManager.playBlip();
                  onLogout();
                }} 
                style={styles.logoutBtn}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div style={styles.profileBox} className="glass-card">
              <span style={{ color: 'var(--neon-orange)' }}>🎮 GUEST SESSION</span>
            </div>
          )}

          <button 
            onClick={() => {
              onToggleSound();
              soundManager.playBlip();
            }} 
            style={styles.soundButton}
            className="glass-card"
          >
            {soundEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>
        </div>
      </header>

      {/* Global Stats bar */}
      <section style={styles.statsBar} className="glass-card">
        <div style={styles.statBox}>
          <div style={styles.statValue} className="neon-text-cyan">{stats.totalGamesPlayed}</div>
          <div style={styles.statLabel}>GAMES PLAYED</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue} className="neon-text-magenta">{stats.totalWins}</div>
          <div style={styles.statLabel}>TOTAL WINS</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue} className="neon-text-green">{stats.totalPoints}</div>
          <div style={styles.statLabel}>POINTS EARNED</div>
        </div>
      </section>

      {/* Games Grid */}
      <main style={styles.grid}>
        {gamesList.map((game) => {
          const badgeColor = game.color === 'cyan' ? 'var(--neon-cyan)' : game.color === 'magenta' ? 'var(--neon-magenta)' : 'var(--neon-orange)';
          return (
            <div 
              key={game.id} 
              style={styles.card} 
              className="glass-card"
              onClick={() => {
                soundManager.playBlip();
                onSelectGame(game.id);
              }}
            >
              <div style={styles.cardHeader}>
                <span style={{ ...styles.badge, backgroundColor: `rgba(${game.color === 'cyan' ? '0, 240, 255' : game.color === 'magenta' ? '255, 0, 127' : '255, 170, 0'}, 0.1)`, color: badgeColor, borderColor: badgeColor }}>
                  {game.badge}
                </span>
                <span style={styles.difficulty}>{game.difficulty}</span>
              </div>
              <h3 style={styles.gameName}>{game.name}</h3>
              <p style={styles.gameDesc}>{game.description}</p>
              
              <div style={styles.cardFooter}>
                <div style={styles.footerCol}>
                  <span style={styles.metricLabel}>HIGH SCORE</span>
                  <span style={styles.metricVal}>{getHighScore(game.id)}</span>
                </div>
                <div style={styles.footerCol}>
                  <span style={styles.metricLabel}>PLAY COUNT</span>
                  <span style={styles.metricVal}>{getPlayCount(game.id)}</span>
                </div>
                <div style={styles.footerCol}>
                  <span style={styles.metricLabel}>RATING</span>
                  <span style={styles.metricVal} className="neon-text-orange">★ {game.rating}</span>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Leaderboards Summary Section */}
      <section style={styles.leaderboardSection} className="glass-card">
        <h2 style={styles.leaderboardTitle}>🏆 PLATFORM LEADERBOARDS</h2>
        {loading ? (
          <div style={styles.loader}>LOADING GLOBAL HIGHSCORES...</div>
        ) : (
          <div style={styles.leaderboardGrid}>
            {gamesList.map(game => {
              const entries = leaderboards[game.id] || [];
              return (
                <div key={game.id} style={styles.boardCard}>
                  <h4 style={styles.boardName}>{game.name}</h4>
                  <div style={styles.entriesList}>
                    {entries.length > 0 ? (
                      entries.map((entry, idx) => {
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                        return (
                          <div key={idx} style={styles.entryRow}>
                            <span style={styles.entryRank}>{medal || `${idx + 1}`}</span>
                            <span style={styles.entryUser}>{entry.username}</span>
                            <span style={styles.entryScore} className="neon-text-cyan">{entry.bestScore}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={styles.noScores}>No scores registered yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    width: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontSize: '3.5rem',
    color: 'var(--neon-cyan)',
    textShadow: 'var(--glow-cyan)',
    lineHeight: '1.1',
    fontWeight: '900',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#8a85a5',
    letterSpacing: '5px',
    marginTop: '5px',
    fontWeight: 'bold',
  },
  developer: {
    fontSize: '0.75rem',
    color: 'var(--neon-orange)',
    marginTop: '8px',
    fontFamily: 'Orbitron, monospace',
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    textShadow: '0 0 5px rgba(255, 170, 0, 0.4)'
  },
  headerControls: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    fontSize: '0.85rem',
    fontFamily: 'Orbitron, monospace',
    fontWeight: 'bold',
  },
  usernameText: {
    color: 'var(--neon-cyan)',
    textShadow: 'var(--glow-cyan)'
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--neon-magenta)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontFamily: 'Orbitron, monospace',
    fontWeight: 'bold',
    letterSpacing: '1px',
    padding: '2px 6px',
    borderBottom: '1px solid transparent',
    transition: 'border 0.2s',
  },
  soundButton: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 20px',
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    padding: '25px',
    gap: '20px',
    marginBottom: '40px',
    textAlign: 'center',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '2.5rem',
    fontWeight: '900',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '0.75rem',
    letterSpacing: '2px',
    color: '#8a85a5',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '30px',
    marginBottom: '50px'
  },
  card: {
    padding: '25px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '260px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid transparent',
  },
  difficulty: {
    fontSize: '0.75rem',
    color: '#8a85a5',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  gameName: {
    fontSize: '1.4rem',
    marginBottom: '10px',
    color: '#fff',
  },
  gameDesc: {
    fontSize: '0.9rem',
    color: '#a09bbd',
    lineHeight: '1.5',
    marginBottom: '20px',
    flexGrow: '1',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '15px',
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: '0.65rem',
    color: '#716c90',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '2px',
  },
  metricVal: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.95rem',
    fontWeight: '700',
  },
  leaderboardSection: {
    padding: '40px 30px',
    marginTop: '30px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(12, 8, 30, 0.65)',
  },
  leaderboardTitle: {
    fontSize: '1.8rem',
    textAlign: 'center',
    marginBottom: '40px',
    color: '#fff',
    letterSpacing: '2px',
  },
  loader: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '1rem',
    color: '#8a85a5',
    textAlign: 'center',
    letterSpacing: '2px'
  },
  leaderboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '30px',
  },
  boardCard: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px',
    padding: '20px',
  },
  boardName: {
    fontSize: '1rem',
    marginBottom: '15px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '8px',
    color: 'var(--neon-cyan)',
    textShadow: 'var(--glow-cyan)'
  },
  entriesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.02)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
  },
  entryRank: {
    fontSize: '1.1rem',
    width: '30px',
    display: 'flex',
    alignItems: 'center',
  },
  entryUser: {
    flexGrow: '1',
    fontWeight: 'bold',
    color: '#d0cced'
  },
  entryScore: {
    fontFamily: 'Orbitron, monospace',
    fontWeight: 'bold',
  },
  noScores: {
    fontSize: '0.8rem',
    color: '#555175',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '10px 0'
  }
};
