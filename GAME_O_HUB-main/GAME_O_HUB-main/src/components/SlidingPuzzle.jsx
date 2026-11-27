import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function SlidingPuzzle({ onBack, onSaveScore }) {
  const [board, setBoard] = useState(Array.from({ length: 16 }, (_, i) => (i === 15 ? null : i + 1)));
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const timerRef = useRef(null);

  // Generate a solvable board via random walk from solved state
  const shuffleBoard = () => {
    soundManager.playBlip();
    let currentBoard = Array.from({ length: 16 }, (_, i) => (i === 15 ? null : i + 1));
    let emptyIndex = 15;
    
    // Perform 150 random valid moves
    for (let i = 0; i < 150; i++) {
      const row = Math.floor(emptyIndex / 4);
      const col = emptyIndex % 4;
      const validMoves = [];

      if (row > 0) validMoves.push(emptyIndex - 4); // Up
      if (row < 3) validMoves.push(emptyIndex + 4); // Down
      if (col > 0) validMoves.push(emptyIndex - 1); // Left
      if (col < 3) validMoves.push(emptyIndex + 1); // Right

      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      // Swap empty cell and random neighbor
      currentBoard[emptyIndex] = currentBoard[randomMove];
      currentBoard[randomMove] = null;
      emptyIndex = randomMove;
    }

    setBoard(currentBoard);
    setMoves(0);
    setTime(0);
    setHasWon(false);
    setIsPlaying(true);
  };

  // Timer effect
  useEffect(() => {
    if (isPlaying && !hasWon) {
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, hasWon]);

  // Start with shuffled board on mount
  useEffect(() => {
    shuffleBoard();
    return () => clearInterval(timerRef.current);
  }, []);

  // Check if board is solved
  const checkWin = (currentBoard) => {
    for (let i = 0; i < 15; i++) {
      if (currentBoard[i] !== i + 1) return false;
    }
    return currentBoard[15] === null;
  };

  // Handle tile click
  const handleTileClick = (index) => {
    if (hasWon) return;

    const row = Math.floor(index / 4);
    const col = index % 4;
    const emptyIndex = board.indexOf(null);
    const emptyRow = Math.floor(emptyIndex / 4);
    const emptyCol = emptyIndex % 4;

    // A tile is adjacent if it shares the same row or col and is 1 unit away
    const isAdjacent = (Math.abs(row - emptyRow) + Math.abs(col - emptyCol)) === 1;

    if (isAdjacent) {
      soundManager.playTick();
      const newBoard = [...board];
      newBoard[emptyIndex] = board[index];
      newBoard[index] = null;
      setBoard(newBoard);
      setMoves(prev => prev + 1);

      if (checkWin(newBoard)) {
        setHasWon(true);
        setIsPlaying(false);
        soundManager.playVictory();
        
        // Points calculation: higher score for fewer moves & less time
        const basePoints = 500;
        const movePenalty = moves * 2;
        const timePenalty = time;
        const finalScore = Math.max(50, basePoints - movePenalty - timePenalty);
        onSaveScore('sliding', finalScore, true);
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">SLIDING PUZZLE</h2>
      <p style={styles.subtitle}>SLIDE TILES TO ORDER THEM 1-15</p>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>MOVES</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{moves}</span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>TIME</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-magenta)' }}>{time}s</span>
        </div>
      </div>

      {/* Grid Container */}
      <div style={styles.gridContainer} className="glass-card">
        {hasWon && (
          <div style={styles.victoryOverlay}>
            <h3 style={styles.victoryTitle} className="neon-text-green">PUZZLE SOLVED!</h3>
            <p style={styles.victorySub}>You solved it in {moves} moves!</p>
          </div>
        )}
        
        <div style={styles.grid}>
          {board.map((val, idx) => {
            const isEmpty = val === null;
            return (
              <button
                key={idx}
                onClick={() => handleTileClick(idx)}
                style={{
                  ...styles.tile,
                  opacity: isEmpty ? 0 : 1,
                  pointerEvents: isEmpty ? 'none' : 'auto',
                  border: isEmpty ? '1px dashed rgba(255, 255, 255, 0.15)' : '1px solid var(--glass-border)'
                }}
                className={isEmpty ? '' : 'glass-card'}
                disabled={hasWon}
              >
                {!isEmpty && val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={shuffleBoard} style={styles.shuffleBtn} className="neon-button">
          SHUFFLE AGAIN
        </button>
        <button onClick={onBack} style={styles.backBtn}>
          ← BACK
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  title: {
    fontSize: '2.5rem',
    color: 'var(--neon-cyan)',
    textShadow: 'var(--glow-cyan)',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '0.8rem',
    letterSpacing: '2px',
    color: '#8a85a5',
    marginBottom: '30px',
    fontWeight: 'bold'
  },
  statsContainer: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    marginBottom: '25px',
    justifyContent: 'center'
  },
  statBox: {
    flex: 1,
    maxWidth: '150px',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 10px',
    background: 'rgba(255, 255, 255, 0.02)'
  },
  statLabel: {
    fontSize: '0.65rem',
    color: '#8a85a5',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  statValue: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '1.4rem',
    fontWeight: '900'
  },
  gridContainer: {
    width: '100%',
    aspectRatio: '1',
    background: 'rgba(10, 8, 25, 0.6)',
    padding: '15px',
    borderRadius: '16px',
    marginBottom: '30px',
    position: 'relative'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    width: '100%',
    height: '100%'
  },
  tile: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Orbitron, monospace',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#fff',
    background: 'rgba(30, 24, 60, 0.7)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, background-color 0.2s',
  },
  victoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(10, 8, 25, 0.95)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '16px',
  },
  victoryTitle: {
    fontSize: '2rem',
    marginBottom: '10px',
  },
  victorySub: {
    color: '#a09bbd',
    fontSize: '1rem',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%'
  },
  shuffleBtn: {
    width: '100%',
    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(255, 0, 127, 0.3)',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#8a85a5',
    fontSize: '0.85rem',
    fontFamily: 'Orbitron, monospace',
    cursor: 'pointer',
    letterSpacing: '1px',
    padding: '8px',
    transition: 'color 0.2s'
  }
};
