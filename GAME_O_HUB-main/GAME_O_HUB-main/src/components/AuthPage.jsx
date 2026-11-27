import React, { useState } from 'react';
import { soundManager } from '../utils/SoundManager';

export default function AuthPage({ onLoginSuccess, onGuestLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'error' or 'success'

  const handleSubmit = async (e) => {
    e.preventDefault();
    soundManager.playBlip();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const url = `http://localhost:5000/api/auth/${isLogin ? 'login' : 'register'}`;
    const payload = isLogin 
      ? { username, password }
      : { username, email, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      soundManager.playVictory();
      setMessage({ text: data.message || 'Success!', type: 'success' });
      
      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 1000);

    } catch (err) {
      soundManager.playFail();
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    soundManager.playBlip();
    setIsLogin(!isLogin);
    setMessage({ text: '', type: '' });
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title} className="flicker">GAME-O-<span style={{ color: 'var(--neon-magenta)' }}>HUB</span></h1>
        <p style={styles.subtitle}>CYBERPUNK MULTIPLAYER PORTAL</p>
        <p style={styles.developer}>DEVELOPED BY PRAVEE9A</p>
      </header>

      <div style={styles.authBox} className="glass-card">
        {/* Tabs */}
        <div style={styles.tabs}>
          <button 
            onClick={() => { if (!isLogin) handleToggleMode(); }}
            style={{ 
              ...styles.tabButton, 
              borderBottom: isLogin ? '3px solid var(--neon-cyan)' : '3px solid transparent',
              color: isLogin ? 'var(--neon-cyan)' : '#8a85a5'
            }}
          >
            LOGIN
          </button>
          <button 
            onClick={() => { if (isLogin) handleToggleMode(); }}
            style={{ 
              ...styles.tabButton, 
              borderBottom: !isLogin ? '3px solid var(--neon-magenta)' : '3px solid transparent',
              color: !isLogin ? 'var(--neon-magenta)' : '#8a85a5'
            }}
          >
            SIGN UP
          </button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div style={{ 
            ...styles.messageBox, 
            borderColor: message.type === 'error' ? 'var(--neon-magenta)' : 'var(--neon-green)',
            boxShadow: message.type === 'error' ? 'var(--glow-magenta)' : 'var(--glow-green)'
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>USERNAME / EMAIL</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
            />
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>EMAIL ADDRESS</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="Enter your email"
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>PASSWORD</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{
              ...styles.submitBtn,
              background: isLogin 
                ? 'linear-gradient(90deg, var(--neon-cyan), #0077ff)' 
                : 'linear-gradient(90deg, var(--neon-magenta), #aa00ff)',
              boxShadow: isLogin ? 'var(--glow-cyan)' : 'var(--glow-magenta)'
            }}
            className="neon-button"
          >
            {loading ? 'PROCESSING...' : isLogin ? 'ENTER PORTAL' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={styles.separator}>OR</div>

        <button 
          onClick={() => {
            soundManager.playVictory();
            onGuestLogin();
          }}
          style={styles.guestBtn}
        >
          🎮 CONTINUE AS GUEST
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '420px',
    width: '100%',
    padding: '40px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.8rem',
    color: 'var(--neon-cyan)',
    textShadow: 'var(--glow-cyan)',
    lineHeight: '1',
    fontWeight: '900',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#8a85a5',
    letterSpacing: '3px',
    marginTop: '6px',
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
  authBox: {
    width: '100%',
    padding: '35px 25px',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px'
  },
  tabs: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '25px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  tabButton: {
    background: 'transparent',
    border: 'none',
    padding: '10px 15px',
    fontFamily: 'Orbitron, monospace',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '1px',
    transition: 'all 0.2s'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    gap: '6px'
  },
  label: {
    fontSize: '0.65rem',
    color: '#8a85a5',
    letterSpacing: '1px',
    fontWeight: 'bold'
  },
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#fff',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '12px 15px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  messageBox: {
    padding: '12px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#fff',
    background: 'rgba(0, 0, 0, 0.3)',
    marginBottom: '20px',
    animation: 'shake 0.5s'
  },
  submitBtn: {
    width: '100%',
    borderColor: 'transparent',
    color: '#fff',
    marginTop: '10px'
  },
  separator: {
    fontSize: '0.8rem',
    color: '#555175',
    fontFamily: 'Orbitron, monospace',
    margin: '20px 0',
    position: 'relative'
  },
  guestBtn: {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    color: '#ffd700',
    border: '1px dashed rgba(255, 215, 0, 0.4)',
    padding: '14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    fontFamily: 'Orbitron, monospace',
    letterSpacing: '1px',
    transition: 'all 0.2s'
  }
};
