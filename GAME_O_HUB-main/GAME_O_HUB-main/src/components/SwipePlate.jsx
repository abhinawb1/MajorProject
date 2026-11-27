import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function SwipePlate({ onBack, onSaveScore }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const timeRef = useRef(0);
  const gameLoopRef = useRef(null);
  const platesRef = useRef([]);
  const spawnTimerRef = useRef(null);
  const timeIntervalRef = useRef(null);

  const MISS_LIMIT = 5;

  const initGame = () => {
    soundManager.playBlip();
    scoreRef.current = 0;
    missesRef.current = 0;
    timeRef.current = 0;
    platesRef.current = [];
    setScore(0);
    setMisses(0);
    setTime(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Timer interval
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      timeIntervalRef.current = setInterval(() => {
        timeRef.current += 1;
        setTime(timeRef.current);
      }, 1000);
    } else {
      clearInterval(timeIntervalRef.current);
    }
    return () => clearInterval(timeIntervalRef.current);
  }, [isPlaying, isGameOver]);

  // Game spawner and drawer
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 400;

    // Spawning plates loop
    const spawnPlate = () => {
      const radius = Math.random() * 20 + 30; // radius between 30 and 50
      const x = Math.random() * (canvas.width - radius * 2) + radius;
      const y = Math.random() * (canvas.height - radius * 2) + radius;
      
      // Speed increases as score increases
      const baseLifespan = 2000; // 2 seconds
      const speedFactor = Math.max(0.4, 1 - (scoreRef.current / 150));
      const lifespan = baseLifespan * speedFactor;

      const colors = ['#00f0ff', '#ff007f', '#39ff14', '#ffaa00'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      platesRef.current.push({
        x,
        y,
        radius,
        color,
        spawnTime: performance.now(),
        lifespan,
        scale: 0.1,
        clicked: false
      });

      // Next spawn rate increases as score increases
      const baseSpawnRate = 1200;
      const spawnFactor = Math.max(0.35, 1 - (scoreRef.current / 200));
      spawnTimerRef.current = setTimeout(spawnPlate, baseSpawnRate * spawnFactor);
    };

    spawnPlate();

    // Main animation loop
    const updateAndDraw = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid lines (cyberpunk feel)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const activePlates = [];

      for (let i = 0; i < platesRef.current.length; i++) {
        const plate = platesRef.current[i];
        const elapsed = timestamp - plate.spawnTime;

        if (elapsed >= plate.lifespan) {
          if (!plate.clicked) {
            // Missed!
            soundManager.playTick(); // subtle buzz/tick for miss
            missesRef.current += 1;
            setMisses(missesRef.current);
            if (missesRef.current >= MISS_LIMIT) {
              handleGameOver();
              return;
            }
          }
          continue; // Remove plate
        }

        // Calculate size: expand then shrink
        const progress = elapsed / plate.lifespan;
        if (progress < 0.2) {
          plate.scale = progress / 0.2; // Expand in first 20%
        } else if (progress > 0.8) {
          plate.scale = (1 - progress) / 0.2; // Shrink in last 20%
        } else {
          plate.scale = 1.0;
        }

        // Draw plate with outer neon rings
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = plate.color;

        // Draw outer ring
        ctx.strokeStyle = plate.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(plate.x, plate.y, plate.radius * plate.scale, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner glow fill
        ctx.fillStyle = plate.color + '22'; // 13% opacity fill
        ctx.beginPath();
        ctx.arc(plate.x, plate.y, plate.radius * plate.scale - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw center dot
        ctx.fillStyle = plate.color;
        ctx.beginPath();
        ctx.arc(plate.x, plate.y, 5 * plate.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        activePlates.push(plate);
      }

      platesRef.current = activePlates;
      gameLoopRef.current = requestAnimationFrame(updateAndDraw);
    };

    gameLoopRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      clearTimeout(spawnTimerRef.current);
    };
  }, [isPlaying, isGameOver]);

  const handleCanvasClick = (e) => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;

    // Check hit in reverse order (topmost first)
    for (let i = platesRef.current.length - 1; i >= 0; i--) {
      const plate = platesRef.current[i];
      const dist = Math.hypot(clickX - plate.x, clickY - plate.y);

      if (dist <= plate.radius * plate.scale && !plate.clicked) {
        plate.clicked = true;
        hit = true;
        soundManager.playSuccess(); // success sound
        scoreRef.current += 10;
        setScore(scoreRef.current);
        break;
      }
    }

    if (!hit) {
      // Clicked empty space counts as a minor miss sound
      soundManager.playTick();
    }
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    cancelAnimationFrame(gameLoopRef.current);
    clearTimeout(spawnTimerRef.current);
    clearInterval(timeIntervalRef.current);
    soundManager.playFail();

    onSaveScore('swipe', scoreRef.current, false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">SWIPE THE PLATE</h2>
      <p style={styles.subtitle}>CLICK PLATES BEFORE THEY DISAPPEAR</p>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>SCORE</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-green)' }}>{score}</span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>MISSES</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-magenta)' }}>
            {misses}/{MISS_LIMIT}
          </span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>TIME</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{time}s</span>
        </div>
      </div>

      {/* Play Area */}
      <div style={styles.playArea} className="glass-card">
        {!isPlaying && (
          <div style={styles.overlay}>
            <button onClick={initGame} style={styles.startBtn} className="neon-button">
              START GAME
            </button>
          </div>
        )}

        {isGameOver && (
          <div style={styles.overlay}>
            <h3 style={styles.gameOverTitle} className="neon-text-magenta">GAME OVER!</h3>
            <div style={styles.gameOverScore} className="flicker">{score}</div>
            <p style={styles.gameOverSub}>POINTS</p>
            <button onClick={initGame} style={styles.restartBtn} className="neon-button">
              PLAY AGAIN
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={styles.canvas}
        />
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
    maxWidth: '600px',
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
    maxWidth: '120px',
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
  playArea: {
    width: '100%',
    height: '400px',
    background: 'rgba(10, 8, 25, 0.6)',
    borderRadius: '16px',
    marginBottom: '30px',
    position: 'relative',
    overflow: 'hidden'
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
    cursor: 'crosshair'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(6, 4, 10, 0.85)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  startBtn: {
    background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(255, 0, 127, 0.3)',
  },
  gameOverTitle: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  gameOverScore: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '4.5rem',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1',
    margin: '10px 0'
  },
  gameOverSub: {
    color: '#8a85a5',
    fontSize: '0.8rem',
    letterSpacing: '2px',
    fontWeight: 'bold',
    marginBottom: '30px'
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
