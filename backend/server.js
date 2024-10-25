const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// MongoDB Schemas
const FinalTable = mongoose.model('FinalTable', new mongoose.Schema({}, { strict: false }), 'final_table');
const PlayerStatlines = mongoose.model('PlayerStatlines', new mongoose.Schema({}, { strict: false }), 'player_statlines');

// Get all player data (final_table)
app.get('/api/players', async (req, res) => {
    try {
        console.log("API CALLED")
        const players = await FinalTable.find().lean();
        console.log(players)
        res.json(players);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get player game logs
app.get('/api/players/:player/statlines', async (req, res) => {
    const player = req.params.player.replace('_', ' ');
    try {
        const gameLog = await PlayerStatlines.findOne({ player }).lean();
        res.json(gameLog ? gameLog.game_log : []);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
