import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

const paragraphs = [
  "the digital future belongs to those who learn to write the code that shapes it. robots, algorithms, and cybernets are expanding across the globe.",
  "glowing neon signs flickered in the dark rain of the cyberpunk metropolis. a hacker logged into the mainframe using a decrypted access key.",
  "artificial intelligence is a tool for the mind. our computers process millions of parameters to predict the next steps in human evolution.",
  "in the heart of the virtual reality grid, data packets travel along optical paths at the speed of light. a new simulation is beginning.",
  "the sound of mechanical keyboards echoed through the server room. cold air blew from the cooling systems as the backup systems booted."
];

export default function TypingGame({ onBack, onSaveScore }) {
  const [text, setText] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [time, setTime] = useState(30); // 30 seconds limit
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const inputRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timeRef = useRef(30);

  const initGame = () => {
    soundManager.playBlip();
    const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
    setText(randomParagraph);
    setInputVal('');
    setTime(30);
    timeRef.current = 30;
    setWpm(0);
    setAccuracy(100);
    setIsGameOver(false);
    setIsPlaying(true);

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // Timer interval
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      timerIntervalRef.current = setInterval(() => {
        timeRef.current -= 1;
        setTime(timeRef.current);
        
        if (timeRef.current <= 0) {
          handleGameOver();
        }
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isPlaying, isGameOver]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputVal(value);
    soundManager.playTick(); // click sound on typing

    // Metrics calculations
    const typedChars = value.length;
    if (typedChars === 0) {
      setAccuracy(100);
      return;
    }

    // Check correct chars
    let correctCount = 0;
    for (let i = 0; i < typedChars; i++) {
      if (value[i] === text[i]) {
        correctCount++;
      }
    }

    // Accuracy
    const computedAccuracy = Math.round((correctCount / typedChars) * 100);
    setAccuracy(computedAccuracy);

    // Live WPM: (correct chars / 5) / (elapsed time in minutes)
    const timeElapsed = (30 - timeRef.current) / 60; // in minutes
    if (timeElapsed > 0) {
      const computedWpm = Math.round((correctCount / 5) / timeElapsed);
      setWpm(computedWpm);
    }

    // If fully typed
    if (value.length >= text.length) {
      handleGameOver();
    }
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    clearInterval(timerIntervalRef.current);
    
    // Play sound based on WPM
    if (wpm > 40 && accuracy > 90) {
      soundManager.playVictory();
    } else {
      soundManager.playSuccess();
    }

    // Score is proportional to WPM * accuracy
    const finalScore = Math.round(wpm * (accuracy / 100));
    onSaveScore('typing', finalScore, false);
  };

  // Render text with highlighting
  const renderText = () => {
    return text.split('').map((char, idx) => {
      let color = '#a09bbd';
      let bgColor = 'transparent';

      if (idx < inputVal.length) {
        if (inputVal[idx] === char) {
          color = 'var(--neon-green)';
          // Glow effect on matched space
        } else {
          color = 'var(--neon-magenta)';
          bgColor = 'rgba(255, 0, 127, 0.15)';
        }
      }

      // Cursor position
      const isCursor = idx === inputVal.length;

      return (
        <span 
          key={idx} 
          style={{ 
            color, 
            backgroundColor: bgColor,
            borderBottom: isCursor && isPlaying ? '2px solid var(--neon-cyan)' : 'none',
            fontSize: '1.25rem',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            lineHeight: '1.8'
          }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">TYPING CHALLENGE</h2>
      <p style={styles.subtitle}>TEST YOUR WORDS PER MINUTE</p>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>WPM</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-green)' }}>{wpm}</span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>ACCURACY</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{accuracy}%</span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>TIME</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-magenta)' }}>{time}s</span>
        </div>
      </div>

      {/* Typing box */}
      <div style={styles.arena} className="glass-card">
        {!isPlaying && (
          <div style={styles.overlay}>
            <button onClick={initGame} style={styles.startBtn} className="neon-button">
              START SPEED TEST
            </button>
          </div>
        )}

        {isGameOver && (
          <div style={styles.overlay}>
            <h3 style={styles.gameOverTitle} className="neon-text-green">TEST COMPLETE!</h3>
            <div style={styles.gameOverScore} className="flicker">{wpm} <span style={{ fontSize: '1.5rem', verticalAlign: 'middle' }}>WPM</span></div>
            <p style={styles.gameOverSub}>ACCURACY: {accuracy}%</p>
            <button onClick={initGame} style={styles.restartBtn} className="neon-button">
              TEST AGAIN
            </button>
          </div>
        )}

        <div style={styles.textDisplay}>
          {renderText()}
        </div>

        {isPlaying && !isGameOver && (
          <textarea
            ref={inputRef}
            value={inputVal}
            onChange={handleInputChange}
            style={styles.textInput}
            placeholder="Type the text shown above..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button 
          onClick={() => {
            setIsPlaying(false);
            onBack();
          }} 
          style={styles.backBtn}
        >
          ← BACK TO HUB
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '700px',
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
    gap: '15px',
    width: '100%',
    marginBottom: '25px',
    justifyContent: 'center'
  },
  statBox: {
    flex: 1,
    maxWidth: '130px',
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
  arena: {
    width: '100%',
    padding: '30px',
    background: 'rgba(10, 8, 25, 0.65)',
    borderRadius: '16px',
    marginBottom: '30px',
    position: 'relative',
    minHeight: '260px',
    textAlign: 'left'
  },
  textDisplay: {
    userSelect: 'none',
    marginBottom: '25px',
    minHeight: '100px'
  },
  textInput: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#fff',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '12px 15px',
    fontSize: '1rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    resize: 'none',
    height: '60px',
    transition: 'border-color 0.2s',
    borderColor: 'rgba(0, 240, 255, 0.3)'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(6, 4, 10, 0.9)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '16px',
    textAlign: 'center'
  },
  startBtn: {
    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(255, 0, 127, 0.3)',
  },
  gameOverTitle: {
    fontSize: '2.2rem',
    marginBottom: '10px',
  },
  gameOverScore: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '3.8rem',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1.2',
    margin: '10px 0'
  },
  gameOverSub: {
    color: '#8a85a5',
    fontSize: '0.9rem',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '25px'
  },
  restartBtn: {
    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(255, 0, 127, 0.3)',
  },
  actions: {
    width: '100%'
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
