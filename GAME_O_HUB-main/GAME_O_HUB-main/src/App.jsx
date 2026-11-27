import React, { useState, useEffect } from 'react';
import './index.css';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import TicTacToe from './components/TicTacToe';
import SlidingPuzzle from './components/SlidingPuzzle';
import SwipePlate from './components/SwipePlate';
import Menja from './components/Menja';
import TypingGame from './components/TypingGame';
import DinoRunner from './components/DinoRunner';
import GestureGame from './components/GestureGame';
import { soundManager } from './utils/SoundManager';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [currentView, setCurrentView] = useState('auth'); // start at auth screen
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [stats, setStats] = useState({
    totalGamesPlayed: 0,
    totalWins: 0,
    totalPoints: 0
  });

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token verification failed');
          return res.json();
        })
        .then(data => {
          if (data.user) {
            setCurrentUser(data.user);
            setCurrentView('dashboard');
          }
        })
        .catch(err => {
          console.log('Session expired, clearing token:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('username');
        });
    }

    // Load local stats
    const totalGames = parseInt(localStorage.getItem('stats_total_games') || '0', 10);
    const totalWins = parseInt(localStorage.getItem('stats_total_wins') || '0', 10);
    const totalPoints = parseInt(localStorage.getItem('stats_total_points') || '0', 10);
    setStats({
      totalGamesPlayed: totalGames,
      totalWins: totalWins,
      totalPoints: totalPoints
    });
  }, []);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setIsGuest(false);
    setCurrentView('dashboard');
  };

  const handleGuestLogin = () => {
    setCurrentUser(null);
    setIsGuest(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setCurrentUser(null);
    setIsGuest(false);
    setCurrentView('auth');
  };

  const handleToggleSound = () => {
    const enabled = soundManager.toggle();
    setSoundEnabled(enabled);
  };

  const handleSaveScore = async (gameId, score, isWin) => {
    // 1. Save locally (always)
    const plays = parseInt(localStorage.getItem(`play_count_${gameId}`) || '0', 10) + 1;
    localStorage.setItem(`play_count_${gameId}`, plays.toString());

    const currentHigh = parseInt(localStorage.getItem(`high_score_${gameId}`) || '0', 10);
    if (score > currentHigh) {
      localStorage.setItem(`high_score_${gameId}`, score.toString());
    }

    const nextGames = stats.totalGamesPlayed + 1;
    const nextWins = stats.totalWins + (isWin ? 1 : 0);
    const nextPoints = stats.totalPoints + score;

    localStorage.setItem('stats_total_games', nextGames.toString());
    localStorage.setItem('stats_total_wins', nextWins.toString());
    localStorage.setItem('stats_total_points', nextPoints.toString());

    setStats({
      totalGamesPlayed: nextGames,
      totalWins: nextWins,
      totalPoints: nextPoints
    });

    // 2. Save to backend if authenticated
    const token = localStorage.getItem('token');
    if (token && currentUser) {
      try {
        await fetch('http://localhost:5000/api/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            game: gameId,
            score: score,
            metadata: { isWin }
          })
        });
        console.log('Score submitted to global leaderboard successfully.');
      } catch (err) {
        console.error('Failed to submit score to global leaderboard:', err);
      }
    }
  };

  const selectGame = (gameId) => {
    setCurrentView(gameId);
  };

  const backToDashboard = () => {
    setCurrentView('dashboard');
  };

  return (
    <div style={styles.appContainer}>
      {currentView === 'auth' && (
        <AuthPage 
          onLoginSuccess={handleLoginSuccess}
          onGuestLogin={handleGuestLogin}
        />
      )}

      {currentView === 'dashboard' && (
        <Dashboard
          onSelectGame={selectGame}
          stats={stats}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'tictactoe' && (
        <TicTacToe onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'sliding' && (
        <SlidingPuzzle onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'swipe' && (
        <SwipePlate onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'menja' && (
        <Menja onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'typing' && (
        <TypingGame onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'dino' && (
        <DinoRunner onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}

      {currentView === 'gesture' && (
        <GestureGame onBack={backToDashboard} onSaveScore={handleSaveScore} />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%'
  }
};
