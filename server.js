const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uhv_premium';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// 1. DATABASE MODELS
// ==========================================

const QuestionSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    unit: String,
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    answer: { type: Number, required: true }
});

const Question = mongoose.model('Question', QuestionSchema);

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    currentSetIndex: { type: Number, default: 0 },
    history: { type: Array, default: [] }
});

const User = mongoose.model('User', UserSchema);

// ==========================================
// 2. DATABASE SEEDER (questions.json)
// ==========================================

async function seedDatabase() {
    try {
        const count = await Question.countDocuments();
        if (count === 0) {
            console.log('MongoDB: Questions collection is empty. Starting seeding from questions.json...');
            const jsonPath = path.join(__dirname, 'questions.json');
            
            if (fs.existsSync(jsonPath)) {
                const data = fs.readFileSync(jsonPath, 'utf8');
                const parsedQuestions = JSON.parse(data);
                
                await Question.insertMany(parsedQuestions);
                console.log(`MongoDB: Seeded ${parsedQuestions.length} questions successfully.`);
            } else {
                console.warn('MongoDB: Seeding skipped. questions.json file was not found.');
            }
        } else {
            console.log(`MongoDB: Database already contains ${count} questions. Seeding skipped.`);
        }
    } catch (err) {
        console.error('MongoDB Error: Seeding failed:', err);
    }
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('MongoDB: Successfully connected to MongoDB database.');
        await seedDatabase();
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
    });

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// GET all questions
app.get('/api/questions', async (req, res) => {
    try {
        const questionsList = await Question.find().sort({ id: 1 });
        res.json(questionsList);
    } catch (err) {
        console.error('API Error: Fetching questions failed:', err);
        res.status(500).json({ error: 'Internal Server Error fetching questions' });
    }
});

// POST signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const newUser = new User({
            email: normalizedEmail,
            password: password, // Note: In production, hash passwords using bcrypt
            name: name.trim(),
            currentSetIndex: 0,
            history: []
        });

        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        console.error('API Error: Registration failed:', err);
        res.status(500).json({ error: 'Internal Server Error during registration' });
    }
});

// POST login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail, password: password });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        res.json(user);
    } catch (err) {
        console.error('API Error: Login failed:', err);
        res.status(500).json({ error: 'Internal Server Error during login' });
    }
});

// POST append attempt history
app.post('/api/users/history', async (req, res) => {
    try {
        const { email, attempt, activeSetIndex } = req.body;
        if (!email || !attempt) {
            return res.status(400).json({ error: 'Email and attempt payload are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        user.history.push(attempt);

        // Advance set index modulo 5 if they finished the expected next set index
        if (activeSetIndex === user.currentSetIndex) {
            user.currentSetIndex = (user.currentSetIndex + 1) % 5;
        }

        await user.save();
        res.json(user);
    } catch (err) {
        console.error('API Error: Recording attempt history failed:', err);
        res.status(500).json({ error: 'Internal Server Error updating history' });
    }
});

// Serve index.html catch-all for routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server: Premium UHV MCQ Server is running on port ${PORT}.`);
    });
}

module.exports = app;
