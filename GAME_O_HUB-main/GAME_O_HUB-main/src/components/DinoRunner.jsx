import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function DinoRunner({ onBack, onSaveScore }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => localStorage.getItem('high_score_dino') || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const scoreRef = useRef(0);
  const gameLoopRef = useRef(null);
  const dinoRef = useRef({
    y: 0,
    vy: 0,
    width: 25,
    height: 40,
    jumping: false,
    gravity: 0.7,
    jumpForce: -11
  });
  const obstaclesRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const speedRef = useRef(5);

  const initGame = () => {
    soundManager.playBlip();
    scoreRef.current = 0;
    speedRef.current = 5;
    obstaclesRef.current = [];
    lastSpawnRef.current = performance.now();
    
    // Set dino starting y coordinate (on the ground)
    const canvas = canvasRef.current;
    if (canvas) {
      dinoRef.current.y = canvas.height - 70; // 70px above bottom
      dinoRef.current.vy = 0;
      dinoRef.current.jumping = false;
    }
    
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Handle jump keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying && !isGameOver) {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  const triggerJump = () => {
    const d = dinoRef.current;
    if (!d.jumping) {
      soundManager.playTick(); // quick jump beep
      d.vy = d.jumpForce;
      d.jumping = true;
    }
  };

  // Canvas drawing & loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 350;

    const groundY = canvas.height - 50;
    dinoRef.current.y = groundY - dinoRef.current.height;

    const updateAndDraw = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw neon ground line and grid lines
      ctx.strokeStyle = 'var(--neon-cyan)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'var(--neon-cyan)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Perspective lines for ground
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      const step = 45;
      for (let x = -100; x < canvas.width + 100; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        // angled perspective line to bottom
        ctx.lineTo(x * 1.2, canvas.height);
        ctx.stroke();
      }

      // Horizontal ground grids
      ctx.beginPath();
      ctx.moveTo(0, groundY + 15);
      ctx.lineTo(canvas.width, groundY + 15);
      ctx.moveTo(0, groundY + 35);
      ctx.lineTo(canvas.width, groundY + 35);
      ctx.stroke();

      // 2. Update Dino physics
      const d = dinoRef.current;
      d.y += d.vy;
      d.vy += d.gravity;

      // Ground collision
      if (d.y >= groundY - d.height) {
        d.y = groundY - d.height;
        d.vy = 0;
        d.jumping = false;
      }

      // 3. Draw Dino (neon orange boxy dino outline)
      ctx.save();
      ctx.strokeStyle = 'var(--neon-orange)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'var(--neon-orange)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 170, 0, 0.1)';
      ctx.beginPath();
      
      // Boxy futuristic dinosaur coordinates relative to d.x = 80, d.y
      const dx = 80;
      ctx.moveTo(dx, d.y + d.height);
      ctx.lineTo(dx + 5, d.y + d.height - 10);
      ctx.lineTo(dx + 5, d.y + 15);
      ctx.lineTo(dx + 15, d.y + 15);
      ctx.lineTo(dx + 15, d.y);
      ctx.lineTo(dx + 25, d.y); // head top
      ctx.lineTo(dx + 25, d.y + 10); // snout
      ctx.lineTo(dx + 18, d.y + 10);
      ctx.lineTo(dx + 18, d.y + 20); // neck back
      ctx.lineTo(dx + 25, d.y + 20); // body top
      ctx.lineTo(dx + 25, d.y + 30);
      ctx.lineTo(dx + 20, d.y + d.height); // foot 1
      ctx.lineTo(dx + 13, d.y + d.height);
      ctx.lineTo(dx + 13, d.y + d.height - 8);
      ctx.lineTo(dx + 8, d.y + d.height - 8);
      ctx.lineTo(dx + 8, d.y + d.height); // foot 2
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = 'var(--neon-orange)';
      ctx.beginPath();
      ctx.arc(dx + 20, d.y + 4, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // 4. Spawn obstacles (neon magenta outline pyramids/spikes)
      const elapsedSinceSpawn = timestamp - lastSpawnRef.current;
      const minSpawnTime = 1200 - Math.min(600, scoreRef.current * 1.5);
      
      if (elapsedSinceSpawn > minSpawnTime && Math.random() < 0.03) {
        const obsType = Math.random() < 0.4 ? 'double' : 'single';
        const obsWidth = obsType === 'double' ? 32 : 18;
        const obsHeight = Math.random() * 10 + 30; // 30px to 40px height

        obstaclesRef.current.push({
          x: canvas.width + 10,
          y: groundY - obsHeight,
          width: obsWidth,
          height: obsHeight,
          color: 'var(--neon-magenta)'
        });
        lastSpawnRef.current = timestamp;
      }

      // 5. Update and Draw Obstacles
      const activeObstacles = [];
      ctx.save();
      ctx.strokeStyle = 'var(--neon-magenta)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'var(--neon-magenta)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 0, 127, 0.1)';

      for (let i = 0; i < obstaclesRef.current.length; i++) {
        const obs = obstaclesRef.current[i];
        obs.x -= speedRef.current;

        // Draw obstacle (pyramid/spike shapes)
        ctx.beginPath();
        if (obs.width > 20) {
          // Double spikes
          ctx.moveTo(obs.x, groundY);
          ctx.lineTo(obs.x + obs.width / 4, obs.y);
          ctx.lineTo(obs.x + obs.width / 2, groundY);
          ctx.lineTo(obs.x + (3 * obs.width) / 4, obs.y + 5);
          ctx.lineTo(obs.x + obs.width, groundY);
        } else {
          // Single spike
          ctx.moveTo(obs.x, groundY);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, groundY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 6. Collision detection
        // Dino box is roughly [80, dino.y, 25, 40]
        const dLeft = 80;
        const dRight = 80 + d.width - 5; // offset snout a bit
        const dTop = d.y + 5; // offset spikey head
        const dBottom = d.y + d.height;

        const oLeft = obs.x + 3;
        const oRight = obs.x + obs.width - 3;
        const oTop = obs.y + 3;
        const oBottom = groundY;

        const isColliding = (
          dRight >= oLeft &&
          dLeft <= oRight &&
          dBottom >= oTop &&
          dTop <= oBottom
        );

        if (isColliding) {
          handleGameOver();
          return;
        }

        if (obs.x + obs.width > 0) {
          activeObstacles.push(obs);
        }
      }
      obstaclesRef.current = activeObstacles;
      ctx.restore();

      // 7. Increment Score & Speed
      scoreRef.current += 1;
      if (scoreRef.current % 100 === 0) {
        soundManager.playSuccess(); // play ding arpeggio every 100 points
        speedRef.current += 0.5; // speed up
      }
      setScore(scoreRef.current);

      gameLoopRef.current = requestAnimationFrame(updateAndDraw);
    };

    gameLoopRef.current = requestAnimationFrame(updateAndDraw);

    return () => {
      cancelAnimationFrame(gameLoopRef.current);
    };
  }, [isPlaying, isGameOver]);

  const handleGameOver = () => {
    setIsGameOver(true);
    cancelAnimationFrame(gameLoopRef.current);
    soundManager.playFail();

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      localStorage.setItem('high_score_dino', scoreRef.current.toString());
    }

    onSaveScore('dino', scoreRef.current, false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">DINO RUNNER</h2>
      <p style={styles.subtitle}>JUMP OVER NEON SPIKES (SPACE / UP ARROW)</p>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>SCORE</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-orange)' }}>{score}</span>
        </div>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>HIGH SCORE</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{highScore}</span>
        </div>
      </div>

      {/* Play Area */}
      <div style={styles.playArea} className="glass-card" onClick={isPlaying && !isGameOver ? triggerJump : undefined}>
        {!isPlaying && (
          <div style={styles.overlay}>
            <button onClick={initGame} style={styles.startBtn} className="neon-button">
              START RUNNER
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
    maxWidth: '140px',
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
    height: '350px',
    background: 'rgba(10, 8, 25, 0.6)',
    borderRadius: '16px',
    marginBottom: '30px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer' // Tapping canvas triggers jump on mobile/mouse
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
