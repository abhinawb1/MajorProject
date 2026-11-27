import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function GestureGame({ onBack, onSaveScore }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [useCamera, setUseCamera] = useState(true); // default to camera mode
  const [cameraActive, setCameraActive] = useState(false);
  const [activeGesture, setActiveGesture] = useState('Idle / Loading AI');

  // TensorFlow / HandPose loading states
  const [model, setModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);

  const scoreRef = useRef(0);
  const gameLoopRef = useRef(null);
  const shipRef = useRef({
    y: 150,
    targetY: 150,
    width: 35,
    height: 25,
    speed: 8
  });
  const obstaclesRef = useRef([]);
  const itemsRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const streamRef = useRef(null);

  // 1. Dynamic TensorFlow & HandPose Script Loader
  useEffect(() => {
    let active = true;

    const loadScripts = async () => {
      // Load tfjs script
      if (!window.tf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      // Load handpose script
      if (!window.handpose) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
    };

    if (useCamera && !model && !loadingModel) {
      setLoadingModel(true);
      setActiveGesture('Loading AI Model...');
      loadScripts()
        .then(async () => {
          if (!active) return;
          const loadedModel = await window.handpose.load();
          if (!active) return;
          setModel(loadedModel);
          setLoadingModel(false);
          setActiveGesture('AI Model Ready ✓');
        })
        .catch(err => {
          console.error('Failed to load TensorFlow/Handpose CDN:', err);
          if (!active) return;
          setLoadingModel(false);
          setUseCamera(false);
          setActiveGesture('AI Load Error');
        });
    }

    return () => {
      active = false;
    };
  }, [useCamera, model, loadingModel]);

  const initGame = async () => {
    soundManager.playBlip();
    scoreRef.current = 0;
    obstaclesRef.current = [];
    itemsRef.current = [];
    lastSpawnRef.current = performance.now();
    
    const canvas = canvasRef.current;
    if (canvas) {
      shipRef.current.y = canvas.height / 2;
      shipRef.current.targetY = canvas.height / 2;
    }

    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);

    if (useCamera) {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setUseCamera(false);
      setCameraActive(false);
      alert('Could not access camera. Falling back to Keyboard controls (Up/Down arrow keys).');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Keyboard controls listener (always enabled as backup)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || isGameOver) return;
      const s = shipRef.current;
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        s.targetY = Math.max(30, s.targetY - 35);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (canvas) {
          s.targetY = Math.min(canvas.height - 40, s.targetY + 35);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopCamera();
    };
  }, [isPlaying, isGameOver]);

  // Hand skeleton drawing
  const drawSkeleton = (ctx, landmarks) => {
    ctx.fillStyle = '#39ff14';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 3;

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = landmarks[i];
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connect fingers
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],     // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
    ];

    connections.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[start][0], landmarks[start][1]);
      ctx.lineTo(landmarks[end][0], landmarks[end][1]);
      ctx.stroke();
    });
  };

  // Analyze finger gestures & position mapping
  const analyzeGesture = (landmarks, videoHeight) => {
    // 0 is wrist. 4 is thumb tip, 8 is index tip, 12 is middle tip, 16 is ring tip, 20 is pinky tip
    const fingers = {
      thumb: landmarks[4][1] < landmarks[3][1],
      index: landmarks[8][1] < landmarks[6][1],
      middle: landmarks[12][1] < landmarks[10][1],
      ring: landmarks[16][1] < landmarks[14][1],
      pinky: landmarks[20][1] < landmarks[18][1]
    };

    const extendedCount = Object.values(fingers).filter(Boolean).length;
    
    let gestureName = 'unknown';
    if (extendedCount === 2 && fingers.index && fingers.middle) {
      gestureName = 'peace';
      setActiveGesture('✌️ Peace - Move Up');
    } else if (extendedCount >= 4) {
      gestureName = 'open';
      setActiveGesture('🤚 Open Hand - Move Down');
    } else if (extendedCount === 0) {
      gestureName = 'fist';
      setActiveGesture('👊 Fist - Stop');
    } else if (fingers.thumb && extendedCount === 1) {
      gestureName = 'thumbsup';
      setActiveGesture('👍 Thumbs Up - Speed Boost');
    } else {
      setActiveGesture('Analyzing Hand...');
    }

    // Y coordinate mapping (based on wrist index 0)
    const wristY = landmarks[0][1];
    const normalizedY = wristY / videoHeight;
    const canvas = canvasRef.current;
    
    if (canvas) {
      // Ship vertical center targets normalized coordinate
      const targetY = normalizedY * canvas.height;
      shipRef.current.targetY = Math.max(30, Math.min(canvas.height - 40, targetY));
    }
  };

  // Real-time HandPose loop
  useEffect(() => {
    if (!cameraActive || !model || !isPlaying || isGameOver) return;

    const video = videoRef.current;
    const detCanvas = detectionCanvasRef.current;
    if (!video || !detCanvas) return;

    let active = true;

    const setSizes = () => {
      if (video.videoWidth) {
        detCanvas.width = video.videoWidth;
        detCanvas.height = video.videoHeight;
      }
    };
    video.addEventListener('loadedmetadata', setSizes);
    setSizes();

    const detectLoop = async () => {
      if (!active || !video || !detCanvas || !model) return;

      try {
        const predictions = await model.estimateHands(video);
        if (!active) return;

        const ctx = detCanvas.getContext('2d');
        ctx.clearRect(0, 0, detCanvas.width, detCanvas.height);

        if (predictions.length > 0) {
          const hand = predictions[0];
          drawSkeleton(ctx, hand.landmarks);
          analyzeGesture(hand.landmarks, video.videoHeight);
        } else {
          setActiveGesture('No Hand Detected');
        }
      } catch (err) {
        console.error('Hand estimation frame error:', err);
      }

      if (active) {
        requestAnimationFrame(detectLoop);
      }
    };

    requestAnimationFrame(detectLoop);

    return () => {
      active = false;
      video.removeEventListener('loadedmetadata', setSizes);
    };
  }, [cameraActive, model, isPlaying, isGameOver]);

  // Main Canvas space-shooter renderer loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 360;

    const updateAndDraw = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background space stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 20; i++) {
        const starX = (performance.now() / 15 + i * 50) % canvas.width;
        const starY = (i * 37) % canvas.height;
        ctx.fillRect(starX, starY, 1.5, 1.5);
      }

      // Smooth vertical ship interpolation
      const s = shipRef.current;
      const dy = s.targetY - s.y;
      s.y += dy * 0.15; // smooth damping slide

      // Draw Spaceship
      ctx.save();
      ctx.strokeStyle = 'var(--neon-cyan)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'var(--neon-cyan)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(35, s.y);
      ctx.lineTo(10, s.y - s.height/2);
      ctx.lineTo(15, s.y);
      ctx.lineTo(10, s.y + s.height/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exhaust fire
      if (Math.random() > 0.3) {
        ctx.strokeStyle = 'var(--neon-orange)';
        ctx.shadowColor = 'var(--neon-orange)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, s.y - 4);
        ctx.lineTo(1, s.y);
        ctx.lineTo(8, s.y + 4);
        ctx.stroke();
      }
      ctx.restore();

      // Spawn obstacles (meteorites) and energy canisters
      const elapsedSinceSpawn = timestamp - lastSpawnRef.current;
      const spawnInterval = 1300 - Math.min(600, scoreRef.current * 1.5);

      if (elapsedSinceSpawn > spawnInterval) {
        if (Math.random() < 0.7) {
          obstaclesRef.current.push({
            x: canvas.width + 10,
            y: Math.random() * (canvas.height - 50) + 25,
            radius: Math.random() * 8 + 12,
            speed: Math.random() * 2 + 4,
            angle: 0,
            rotSpeed: (Math.random() - 0.5) * 0.05
          });
        } else {
          itemsRef.current.push({
            x: canvas.width + 10,
            y: Math.random() * (canvas.height - 40) + 20,
            size: 10,
            speed: 3
          });
        }
        lastSpawnRef.current = timestamp;
      }

      // Update & Draw Meteorites
      const activeObstacles = [];
      ctx.save();
      ctx.strokeStyle = 'var(--neon-magenta)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'var(--neon-magenta)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';

      for (let i = 0; i < obstaclesRef.current.length; i++) {
        const obs = obstaclesRef.current[i];
        obs.x -= obs.speed;
        obs.angle += obs.rotSpeed;

        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle);
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const a = (j * Math.PI) / 4;
          const r = obs.radius * (0.85 + Math.sin(a * 3) * 0.15);
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Check collision
        const shipBox = { x1: 15, y1: s.y - s.height/2, x2: 35, y2: s.y + s.height/2 };
        const closestX = Math.max(shipBox.x1, Math.min(obs.x, shipBox.x2));
        const closestY = Math.max(shipBox.y1, Math.min(obs.y, shipBox.y2));
        const dist = Math.hypot(obs.x - closestX, obs.y - closestY);

        if (dist < obs.radius - 2) {
          handleGameOver();
          return;
        }

        if (obs.x + obs.radius > 0) {
          activeObstacles.push(obs);
        }
      }
      obstaclesRef.current = activeObstacles;
      ctx.restore();

      // Update & Draw Energy Canisters
      const activeItems = [];
      ctx.save();
      ctx.strokeStyle = 'var(--neon-green)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'var(--neon-green)';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';

      for (let i = 0; i < itemsRef.current.length; i++) {
        const item = itemsRef.current[i];
        item.x -= item.speed;

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(performance.now() / 200);
        ctx.beginPath();
        ctx.rect(-item.size/2, -item.size/2, item.size, item.size);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const dist = Math.hypot(item.x - 25, item.y - s.y);
        if (dist < item.size + 15) {
          soundManager.playSuccess();
          scoreRef.current += 30;
          setScore(scoreRef.current);
          continue;
        }

        if (item.x + item.size > 0) {
          activeItems.push(item);
        }
      }
      itemsRef.current = activeItems;
      ctx.restore();

      scoreRef.current += 1;
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
    stopCamera();
    soundManager.playFail();
    onSaveScore('gesture', scoreRef.current, false);
  };

  const toggleCameraOption = () => {
    soundManager.playBlip();
    if (!useCamera) {
      setUseCamera(true);
    } else {
      setUseCamera(false);
      stopCamera();
      setActiveGesture('Keys Only');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title} className="flicker">GALAXY GESTURE</h2>
      <p style={styles.subtitle}>CONTROL SPACESHIP VIA WEBCAM OR ARROW KEYS</p>

      {/* Camera Panel Controls */}
      <div style={styles.cameraRow}>
        <button 
          onClick={toggleCameraOption} 
          style={{
            ...styles.cameraBtn,
            backgroundColor: useCamera ? 'var(--neon-green)' : 'transparent',
            color: useCamera ? 'var(--bg-darker)' : '#fff',
            borderColor: useCamera ? 'var(--neon-green)' : 'rgba(255,255,255,0.2)'
          }}
          className="glass-card"
        >
          {useCamera ? '📷 Camera Mode: ACTIVE' : '⌨️ Keyboard Mode: ACTIVE'}
        </button>
        <span style={styles.gestureIndicator}>
          STATUS: <strong style={{ color: 'var(--neon-cyan)' }}>{activeGesture}</strong>
        </span>
      </div>

      {/* Stats Display */}
      <div style={styles.statsContainer}>
        <div style={styles.statBox} className="glass-card">
          <span style={styles.statLabel}>SCORE</span>
          <span style={{ ...styles.statValue, color: 'var(--neon-cyan)' }}>{score}</span>
        </div>
      </div>

      {/* Split screen display (left is game, right is camera feed) */}
      <div style={styles.gameView}>
        <div style={styles.playArea} className="glass-card">
          {!isPlaying && (
            <div style={styles.overlay}>
              <button onClick={initGame} style={styles.startBtn} className="neon-button">
                LAUNCH SPACESHIP
              </button>
            </div>
          )}

          {isGameOver && (
            <div style={styles.overlay}>
              <h3 style={styles.gameOverTitle} className="neon-text-magenta">MISSION FAILED!</h3>
              <div style={styles.gameOverScore} className="flicker">{score}</div>
              <p style={styles.gameOverSub}>POINTS</p>
              <button onClick={initGame} style={styles.restartBtn} className="neon-button">
                LAUNCH AGAIN
              </button>
            </div>
          )}

          <canvas ref={canvasRef} style={styles.canvas} />
        </div>

        {useCamera && isPlaying && !isGameOver && (
          <div style={styles.videoBox} className="glass-card">
            <video
              ref={videoRef}
              style={styles.video}
              muted
              playsInline
            />
            <canvas
              ref={detectionCanvasRef}
              style={styles.detectionCanvas}
            />
            {loadingModel && (
              <div style={styles.videoOverlayText}>
                Loading AI Model...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button 
          onClick={() => {
            setIsPlaying(false);
            stopCamera();
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
    maxWidth: '850px',
    margin: '0 auto',
    padding: '30px 20px',
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
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  cameraRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  cameraBtn: {
    padding: '8px 16px',
    border: '1px solid',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontFamily: 'Orbitron, monospace',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#fff',
    background: 'transparent',
    transition: 'all 0.2s'
  },
  gestureIndicator: {
    fontSize: '0.8rem',
    fontFamily: 'Orbitron, monospace',
    color: '#8a85a5',
    letterSpacing: '1px'
  },
  statsContainer: {
    width: '100%',
    maxWidth: '140px',
    marginBottom: '20px'
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
    background: 'rgba(255, 255, 255, 0.02)'
  },
  statLabel: {
    fontSize: '0.6rem',
    color: '#8a85a5',
    letterSpacing: '1px',
    fontWeight: 'bold',
    marginBottom: '3px'
  },
  statValue: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '1.25rem',
    fontWeight: '900'
  },
  gameView: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    marginBottom: '25px',
    flexWrap: 'wrap',
  },
  playArea: {
    flex: 2,
    minWidth: '320px',
    height: '360px',
    background: 'rgba(10, 8, 25, 0.65)',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden'
  },
  videoBox: {
    flex: 1,
    minWidth: '160px',
    maxWidth: '220px',
    height: '360px',
    background: '#000',
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)' // Mirror video
  },
  detectionCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror skeleton drawing
    zIndex: 5,
    pointerEvents: 'none'
  },
  videoOverlayText: {
    position: 'absolute',
    color: '#39ff14',
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.8rem',
    textShadow: 'var(--glow-green)',
    zIndex: 10
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
    fontSize: '2.2rem',
    marginBottom: '10px',
  },
  gameOverScore: {
    fontFamily: 'Orbitron, monospace',
    fontSize: '4rem',
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
