import React, { useState, useEffect, useCallback } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function TicTacToe({ onBack, onSaveScore }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isVsAi, setIsVsAi] = useState(true);
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ x: 0, draws: 0, o: 0 });
  const [winner, setWinner] = useState(null); // 'X', 'O', 'Draw', or null
  const [winningLine, setWinningLine] = useState([]);

  // Calculate winner
  const checkWinner = useCallback((squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    if (squares.every(sq => sq !== null)) {
      return { winner: 'Draw', line: [] };
    }
    return { winner: null, line: [] };
  }, []);

  // Minimax AI logic
  const minimax = useCallback((squares, depth, isMaximizing) => {
    const { winner: currentWinner } = checkWinner(squares);
    if (currentWinner === 'O') return 10 - depth;
    if (currentWinner === 'X') return depth - 10;
    if (currentWinner === 'Draw') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          const score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          const score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  }, [checkWinner]);

  const getBestMove = useCallback((squares) => {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        const score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }, [minimax]);

  // Handle player click
  const handleClick = (index) => {
    if (board[index] || winner) return;

    soundManager.playTick();
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const { winner: winResult, line } = checkWinner(newBoard);
    if (winResult) {
      handleGameOver(winResult, line);
      return;
    }

    if (isVsAi) {
      setIsXNext(false);
    } else {
      setIsXNext(!isXNext);
    }
  };

  // AI turn
  useEffect(() => {
    if (isVsAi && !isXNext && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove(board);
        if (aiMove !== -1) {
          const newBoard = [...board];
          newBoard[aiMove] = 'O';
          setBoard(newBoard);

          const { winner: winResult, line } = checkWinner(newBoard);
          if (winResult) {
            handleGameOver(winResult, line);
          } else {
            setIsXNext(true);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVsAi, isXNext, board, winner, getBestMove, checkWinner]);

  const handleGameOver = (winResult, line) => {
    setWinner(winResult);
    setWinningLine(line);

    if (winResult === 'X') {
      soundManager.playVictory();
      setScores(prev => ({ ...prev, x: prev.x + 1 }));
      onSaveScore('tictactoe', 10, true); // Save points
    } else if (winResult === 'O') {
      soundManager.playFail();
      setScores(prev => ({ ...prev, o: prev.o + 1 }));
    } else {
      soundManager.playSuccess(); // Friendly arpeggio for draw
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
    }
  };

  const handleReset = () => {
    soundManager.playBlip();
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);
    setIsXNext(true);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">TIC TAC TOE</h2>
      <p style={styles.subtitle}>GAME-O-HUB CLASSIC</p>

      {/* Mode Select */}
      <div style={styles.modeContainer} className="glass-card">
        <button
          onClick={() => {
            soundManager.playBlip();
            setIsVsAi(true);
            handleReset();
            setScores({ x: 0, draws: 0, o: 0 });
          }}
          style={{
            ...styles.modeButton,
            backgroundColor: isVsAi ? 'var(--neon-cyan)' : 'transparent',
            color: isVsAi ? 'var(--bg-darker)' : '#fff',
            boxShadow: isVsAi ? 'var(--glow-cyan)' : 'none'
          }}
        >
          VS AI
        </button>
        <button
          onClick={() => {
            soundManager.playBlip();
            setIsVsAi(false);
            handleReset();
            setScores({ x: 0, draws: 0, o: 0 });
          }}
          style={{
            ...styles.modeButton,
            backgroundColor: !isVsAi ? 'var(--neon-cyan)' : 'transparent',
            color: !isVsAi ? 'var(--bg-darker)' : '#fff',
            boxShadow: !isVsAi ? 'var(--glow-cyan)' : 'none'
          }}
        >
          VS PLAYER
        </button>
      </div>

      {/* Scoreboard */}
      <div style={styles.scoreboard}>
        <div style={styles.scoreBox} className="glass-card">
          <span style={styles.scoreLabel}>YOU (X)</span>
          <span style={{ ...styles.scoreValue, color: 'var(--neon-cyan)' }}>{scores.x}</span>
        </div>
        <div style={styles.scoreBox} className="glass-card">
          <span style={styles.scoreLabel}>DRAWS</span>
          <span style={{ ...styles.scoreValue, color: '#fff' }}>{scores.draws}</span>
        </div>
        <div style={styles.scoreBox} className="glass-card">
          <span style={styles.scoreLabel}>{isVsAi ? 'AI (O)' : 'PLAYER 2 (O)'}</span>
          <span style={{ ...styles.scoreValue, color: 'var(--neon-magenta)' }}>{scores.o}</span>
        </div>
      </div>

      {/* Game Over Message / Status */}
      <div style={styles.statusText}>
        {winner === 'Draw' && <span className="neon-text-orange">IT'S A DRAW!</span>}
        {winner === 'X' && <span className="neon-text-cyan">YOU WIN! +10 PTS</span>}
        {winner === 'O' && <span className="neon-text-magenta">{isVsAi ? 'AI WINS!' : 'PLAYER 2 WINS!'}</span>}
        {!winner && (
          <span>
            TURN: <strong style={{ color: isXNext ? 'var(--neon-cyan)' : 'var(--neon-magenta)' }}>{isXNext ? 'X' : 'O'}</strong>
          </span>
        )}
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {board.map((value, idx) => {
          const isWinningCell = winningLine.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              style={{
                ...styles.cell,
                borderColor: isWinningCell 
                  ? (value === 'X' ? 'var(--neon-cyan)' : 'var(--neon-magenta)')
                  : 'var(--glass-border)',
                boxShadow: isWinningCell
                  ? (value === 'X' ? 'var(--glow-cyan)' : 'var(--glow-magenta)')
                  : 'none'
              }}
              className="glass-card"
              disabled={!!value || !!winner || (isVsAi && !isXNext)}
            >
              {value === 'X' && <span style={{ ...styles.token, color: 'var(--neon-cyan)', textShadow: 'var(--glow-cyan)' }}>X</span>}
              {value === 'O' && <span style={{ ...styles.token, color: 'var(--neon-magenta)', textShadow: 'var(--glow-magenta)' }}>O</span>}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={handleReset} style={styles.playAgainBtn} className="neon-button">
          PLAY AGAIN
        </button>
        <button onClick={onBack} style={styles.backBtn}>
          ← BACK TO HUB
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
    letterSpacing: '3px',
    color: '#8a85a5',
    marginBottom: '30px',
    fontWeight: 'bold'
  },
  modeContainer: {
    display: 'flex',
    padding: '4px',
    borderRadius: '12px',
    width: '100%',
    marginBottom: '25px',
    background: 'rgba(255,255,255,0.02)'
  },
  modeButton: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  scoreboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    width: '100%',
    marginBottom: '25px'
  },
  scoreBox: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 10px',
    background: 'rgba(255, 255, 255, 0.02)'
  },
  scoreLabel: {
    fontSize: '0.65rem',
    color: '#8a85a5',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  scoreValue: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '1.5rem',
    fontWeight: '900'
  },
  statusText: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '25px',
    height: '24px',
    letterSpacing: '1px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    width: '100%',
    aspectRatio: '1',
    marginBottom: '35px'
  },
  cell: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'rgba(25, 20, 48, 0.5)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  token: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '2.5rem',
    fontWeight: '900'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%'
  },
  playAgainBtn: {
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
