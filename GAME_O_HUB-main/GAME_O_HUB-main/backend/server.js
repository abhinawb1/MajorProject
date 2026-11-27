const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Database Fallback State
let useMemoryDb = false;
const memoryUsers = [];
const memoryScores = [];

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/game-o-hub';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected Successfully');
}).catch(err => {
    console.log('MongoDB Connection Failed. Falling back to IN-MEMORY DATABASE mode.');
    useMemoryDb = true;
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Score Schema
const scoreSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    game: { 
        type: String, 
        required: true,
        enum: ['tictactoe', 'tetris', 'typing', 'dino', 'puzzle', 'menja', 'gesture', 'swipe', 'sliding']
    },
    score: { type: Number, required: true },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now }
});

scoreSchema.index({ game: 1, score: -1 });
const Score = mongoose.model('Score', scoreSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============ AUTHENTICATION ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        if (useMemoryDb) {
            const existingUser = memoryUsers.find(u => u.email === email || u.username === username);
            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = {
                _id: new mongoose.Types.ObjectId().toString(),
                username,
                email,
                password: hashedPassword,
                createdAt: new Date()
            };
            memoryUsers.push(user);

            const token = jwt.sign(
                { userId: user._id, username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(201).json({
                message: 'User registered successfully (In-Memory)',
                token,
                user: { id: user._id, username: user.username, email: user.email }
            });
        }

        // Standard Mongoose registration
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (useMemoryDb) {
            const user = memoryUsers.find(u => u.username === username || u.email === username);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { userId: user._id, username: user.username },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                message: 'Login successful (In-Memory)',
                token,
                user: { id: user._id, username: user.username, email: user.email }
            });
        }

        // Standard Mongoose login
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        if (useMemoryDb) {
            const user = memoryUsers.find(u => u._id === req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({ user: { id: user._id, username: user.username, email: user.email } });
        }

        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ============ SCORE ROUTES ============

// Submit score
app.post('/api/scores', authenticateToken, async (req, res) => {
    try {
        const { game, score, metadata } = req.body;

        if (!game || score === undefined) {
            return res.status(400).json({ message: 'Game and score are required' });
        }

        if (useMemoryDb) {
            const newScore = {
                _id: new mongoose.Types.ObjectId().toString(),
                userId: req.user.userId,
                username: req.user.username,
                game,
                score,
                metadata: metadata || {},
                createdAt: new Date()
            };
            memoryScores.push(newScore);

            return res.status(201).json({
                message: 'Score submitted successfully (In-Memory)',
                score: newScore
            });
        }

        const newScore = new Score({
            userId: req.user.userId,
            username: req.user.username,
            game,
            score,
            metadata: metadata || {}
        });

        await newScore.save();

        res.status(201).json({
            message: 'Score submitted successfully',
            score: newScore
        });
    } catch (error) {
        console.error('Score submission error:', error);
        res.status(500).json({ message: 'Server error during score submission' });
    }
});

// Get leaderboard for a specific game
app.get('/api/leaderboard/:game', async (req, res) => {
    try {
        const { game } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        if (useMemoryDb) {
            const gameScores = memoryScores.filter(s => s.game === game);
            const grouped = {};
            
            gameScores.forEach(s => {
                if (!grouped[s.userId] || s.score > grouped[s.userId].bestScore) {
                    grouped[s.userId] = {
                        _id: s.userId,
                        username: s.username,
                        bestScore: s.score,
                        playCount: (grouped[s.userId]?.playCount || 0) + 1,
                        lastPlayed: s.createdAt
                    };
                } else {
                    grouped[s.userId].playCount += 1;
                }
            });

            const leaderboard = Object.values(grouped)
                .sort((a, b) => b.bestScore - a.bestScore)
                .slice(0, limit);

            return res.json({ leaderboard });
        }

        const leaderboard = await Score.aggregate([
            { $match: { game } },
            { $sort: { score: -1, createdAt: 1 } },
            {
                $group: {
                    _id: '$userId',
                    username: { $first: '$username' },
                    bestScore: { $first: '$score' },
                    playCount: { $sum: 1 },
                    lastPlayed: { $first: '$createdAt' }
                }
            },
            { $sort: { bestScore: -1 } },
            { $limit: limit }
        ]);

        res.json({ leaderboard });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Server error fetching leaderboard' });
    }
});

// Get user's scores for a specific game
app.get('/api/scores/:game/user', authenticateToken, async (req, res) => {
    try {
        const { game } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        if (useMemoryDb) {
            const scores = memoryScores
                .filter(s => s.userId === req.user.userId && s.game === game)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
            return res.json({ scores });
        }

        const scores = await Score.find({
            userId: req.user.userId,
            game
        })
        .sort({ score: -1, createdAt: -1 })
        .limit(limit);

        res.json({ scores });
    } catch (error) {
        console.error('User scores error:', error);
        res.status(500).json({ message: 'Server error fetching user scores' });
    }
});

// Get user's rank in a game
app.get('/api/rank/:game', authenticateToken, async (req, res) => {
    try {
        const { game } = req.params;

        if (useMemoryDb) {
            const userScores = memoryScores.filter(s => s.userId === req.user.userId && s.game === game);
            if (userScores.length === 0) {
                return res.json({ rank: null, totalPlayers: 0 });
            }

            const bestScore = Math.max(...userScores.map(s => s.score));

            // Group best score of all players
            const playerBests = {};
            memoryScores.filter(s => s.game === game).forEach(s => {
                playerBests[s.userId] = Math.max(playerBests[s.userId] || 0, s.score);
            });

            const betterPlayers = Object.values(playerBests).filter(score => score > bestScore).length;
            const rank = betterPlayers + 1;
            const totalPlayers = Object.keys(playerBests).length;

            return res.json({ rank, totalPlayers, bestScore });
        }

        const userBestScore = await Score.findOne({
            userId: req.user.userId,
            game
        }).sort({ score: -1 });

        if (!userBestScore) {
            return res.json({ rank: null, totalPlayers: 0 });
        }

        const betterScores = await Score.aggregate([
            { $match: { game } },
            { $group: { _id: '$userId', bestScore: { $max: '$score' } } },
            { $match: { bestScore: { $gt: userBestScore.score } } },
            { $count: 'count' }
        ]);

        const rank = betterScores.length > 0 ? betterScores[0].count + 1 : 1;
        const totalPlayers = await Score.distinct('userId', { game });

        res.json({
            rank,
            totalPlayers: totalPlayers.length,
            bestScore: userBestScore.score
        });
    } catch (error) {
        console.error('Rank error:', error);
        res.status(500).json({ message: 'Server error fetching rank' });
    }
});

// Get all games leaderboard summary
app.get('/api/leaderboard/all/summary', async (req, res) => {
    try {
        const games = ['tictactoe', 'tetris', 'typing', 'dino', 'puzzle', 'menja', 'gesture', 'swipe', 'sliding'];
        const summary = {};

        if (useMemoryDb) {
            games.forEach(game => {
                const gameScores = memoryScores.filter(s => s.game === game);
                const grouped = {};
                
                gameScores.forEach(s => {
                    if (!grouped[s.userId] || s.score > grouped[s.userId].bestScore) {
                        grouped[s.userId] = {
                            _id: s.userId,
                            username: s.username,
                            bestScore: s.score
                        };
                    }
                });

                summary[game] = Object.values(grouped)
                    .sort((a, b) => b.bestScore - a.bestScore)
                    .slice(0, 3);
            });

            return res.json({ summary });
        }

        for (const game of games) {
            const topPlayers = await Score.aggregate([
                { $match: { game } },
                { $sort: { score: -1 } },
                {
                    $group: {
                        _id: '$userId',
                        username: { $first: '$username' },
                        bestScore: { $first: '$score' }
                    }
                },
                { $sort: { bestScore: -1 } },
                { $limit: 3 }
            ]);

            summary[game] = topPlayers;
        }

        res.json({ summary });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ message: 'Server error fetching summary' });
    }
});

// ============ STATISTICS ROUTES ============

app.get('/api/stats/user', authenticateToken, async (req, res) => {
    try {
        if (useMemoryDb) {
            const userScores = memoryScores.filter(s => s.userId === req.user.userId);
            const gameMap = {};

            userScores.forEach(s => {
                if (!gameMap[s.game]) {
                    gameMap[s.game] = {
                        _id: s.game,
                        totalPlays: 0,
                        bestScore: 0,
                        totalScore: 0,
                        lastPlayed: s.createdAt
                    };
                }
                const stat = gameMap[s.game];
                stat.totalPlays += 1;
                stat.bestScore = Math.max(stat.bestScore, s.score);
                stat.totalScore += s.score;
                if (new Date(s.createdAt) > new Date(stat.lastPlayed)) {
                    stat.lastPlayed = s.createdAt;
                }
            });

            const stats = Object.values(gameMap).map(g => ({
                _id: g._id,
                totalPlays: g.totalPlays,
                bestScore: g.bestScore,
                averageScore: Math.round(g.totalScore / g.totalPlays),
                lastPlayed: g.lastPlayed
            }));

            return res.json({ stats, totalGamesPlayed: userScores.length });
        }

        const stats = await Score.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(req.user.userId) } },
            {
                $group: {
                    _id: '$game',
                    totalPlays: { $sum: 1 },
                    bestScore: { $max: '$score' },
                    averageScore: { $avg: '$score' },
                    lastPlayed: { $max: '$createdAt' }
                }
            }
        ]);

        const totalGamesPlayed = await Score.countDocuments({
            userId: req.user.userId
        });

        res.json({
            stats,
            totalGamesPlayed
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Server error fetching statistics' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Game-O-HUB API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
