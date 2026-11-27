import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function Menja({ onBack, onSaveScore }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const gameLoopRef = useRef(null);
  const objectsRef = useRef([]);
  const particlesRef = useRef([]);
  const mouseTrailRef = useRef([]);
  const isSlashedRef = useRef(false);
  const spawnTimerRef = useRef(null);

  const MAX_LIVES = 3;

  const initGame = () => {
    soundManager.playBlip();
    scoreRef.current = 0;
    livesRef.current = 3;
    objectsRef.current = [];
    particlesRef.current = [];
    mouseTrailRef.current = [];
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 450;

    // Object spawner
    const spawnObject = () => {
      const radius = 22;
      const x = Math.random() * (canvas.width - radius * 4) + radius * 2;
      const y = canvas.height + radius;
      
      // Calculate physics values
      const gravity = 0.28;
      // Launch upwards (negative velocity) to reach ~75% height
      const peakHeight = canvas.height * (Math.random() * 0.3 + 0.5); // 50% to 80%
      const vy = -Math.sqrt(2 * gravity * peakHeight);
      const vx = (Math.random() - 0.5) * 4; // slight horizontal speed

      const isBomb = Math.random() < 0.2; // 20% chance of a bomb block
      const color = isBomb ? '#ff0055' : ['#00f0ff', '#39ff14', '#ffaa00'][Math.floor(Math.random() * 3)];

      objectsRef.current.push({
        x,
        y,
        vx,
        vy,
        radius,
        color,
        isBomb,
        sliced: false,
        sliceAngle: 0,
        sliceProgress: 0,
        gravity
      });

      // Spawning frequency increases as score increases
      const baseSpawnRate = 1500;
      const spawnFactor = Math.max(0.4, 1 - (scoreRef.current / 300));
      spawnTimerRef.current = setTimeout(spawnObject, baseSpawnRate * spawnFactor);
    };

    spawnObject();

    // Game loop
    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid lines (cyberpunk style)
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

      // Draw mouse trail
      if (mouseTrailRef.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.moveTo(mouseTrailRef.current[0].x, mouseTrailRef.current[0].y);
        for (let i = 1; i < mouseTrailRef.current.length; i++) {
          ctx.lineTo(mouseTrailRef.current[i].x, mouseTrailRef.current[i].y);
        }
        ctx.stroke();
        
        // Decay trail
        mouseTrailRef.current.shift();
      }

      // Update and draw floating blocks
      const activeObjects = [];
      for (let i = 0; i < objectsRef.current.length; i++) {
        const obj = objectsRef.current[i];
        
        // Apply physics
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.vy += obj.gravity;

        // Check if falls off screen
        if (obj.y > canvas.height + obj.radius * 2 && obj.vy > 0) {
          if (!obj.sliced && !obj.isBomb) {
            // Missed block, lose a life
            soundManager.playTick(); // tick/buzz
            livesRef.current -= 1;
            setLives(livesRef.current);
            if (livesRef.current <= 0) {
              handleGameOver();
              return;
            }
          }
          continue; // remove
        }

        // Draw object
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = obj.color;

        if (!obj.sliced) {
          // Normal floating block (square/diamond shape)
          ctx.translate(obj.x, obj.y);
          ctx.rotate(performance.now() / 400 + i); // rotate slowly
          
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 3;
          ctx.fillStyle = obj.color + '22';
          
          ctx.beginPath();
          if (obj.isBomb) {
            // Draw a circle spiked bomb
            ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
          } else {
            // Draw a diamond
            ctx.rect(-obj.radius/2, -obj.radius/2, obj.radius, obj.radius);
          }
          ctx.fill();
          ctx.stroke();
        } else {
          // Sliced object (two flying halves)
          obj.sliceProgress += 0.05;
          const separation = obj.sliceProgress * 30;

          // Draw left half
          ctx.save();
          ctx.translate(obj.x - separation, obj.y);
          ctx.rotate(obj.sliceAngle);
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -obj.radius/2);
          ctx.lineTo(-obj.radius/2, -obj.radius/2);
          ctx.lineTo(-obj.radius/2, obj.radius/2);
          ctx.lineTo(0, obj.radius/2);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();

          // Draw right half
          ctx.save();
          ctx.translate(obj.x + separation, obj.y);
          ctx.rotate(obj.sliceAngle + 0.2);
          ctx.strokeStyle = obj.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -obj.radius/2);
          ctx.lineTo(obj.radius/2, -obj.radius/2);
          ctx.lineTo(obj.radius/2, obj.radius/2);
          ctx.lineTo(0, obj.radius/2);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        activeObjects.push(obj);
      }
      objectsRef.current = activeObjects;

      // Update and draw particles
      const activeParticles = [];
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;

        if (p.alpha > 0) {
          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          activeParticles.push(p);
        }
      }
      particlesRef.current = activeParticles;

      gameLoopRef.current = requestAnimationFrame(updateAndDraw);
    };

    gameLoopRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
      clearTimeout(spawnTimerRef.current);
    };
  }, [isPlaying, isGameOver]);

  // Handle slashing (mouse movement)
  const handleMouseMove = (e) => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Track mouse coordinates
    mouseTrailRef.current.push({ x: mouseX, y: mouseY });
    if (mouseTrailRef.current.length > 12) {
      mouseTrailRef.current.shift();
    }

    // Swipe collision detection against floating objects
    for (let i = 0; i < objectsRef.current.length; i++) {
      const obj = objectsRef.current[i];
      if (obj.sliced) continue;

      const dist = Math.hypot(mouseX - obj.x, mouseY - obj.y);

      if (dist <= obj.radius * 1.5) {
        // Slashed!
        obj.sliced = true;
        obj.sliceAngle = Math.random() * Math.PI;
        
        if (obj.isBomb) {
          // Slashed a bomb! Lose a life immediately
          soundManager.playFail();
          livesRef.current -= 1;
          setLives(livesRef.current);
          createExplosion(obj.x, obj.y, obj.color, 35);
          if (livesRef.current <= 0) {
            handleGameOver();
          }
        } else {
          // Slashed regular block
          soundManager.playSlash();
          scoreRef.current += 10;
          setScore(scoreRef.current);
          createExplosion(obj.x, obj.y, obj.color, 15);
        }
      }
    }
  };

  const createExplosion = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1,
        alpha: 1.0
      });
    }
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    cancelAnimationFrame(gameLoopRef.current);
    clearTimeout(spawnTimerRef.current);
    soundManager.playFail();

    onSaveScore('menja', scoreRef.current, false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">MENJA</h2>
      <p style={styles.subtitle}>SLASH OBJECTS WITH YOUR MOUSE</p>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>SCORE</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{score}</span>
        </div>
        
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>LIVES</span>
          <div style={styles.livesRow}>
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.heart,
                  color: i < lives ? 'var(--neon-magenta)' : '#443d60',
                  textShadow: i < lives ? 'var(--glow-magenta)' : 'none'
                }}
              >
                ♥
              </span>
            ))}
          </div>
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
          onMouseMove={handleMouseMove}
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
    maxWidth: '650px',
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
    maxWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 10px',
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
  livesRow: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center'
  },
  heart: {
    fontSize: '1.6rem',
    lineHeight: '1.1',
    transition: 'color 0.3s, text-shadow 0.3s'
  },
  playArea: {
    width: '100%',
    height: '420px',
    background: 'rgba(10, 8, 25, 0.6)',
    borderRadius: '16px',
    marginBottom: '30px',
    position: 'relative',
    overflow: 'hidden'
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block'
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
