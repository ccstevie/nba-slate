const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI;

const PlayerStatlines = mongoose.model('PlayerStatlines', new mongoose.Schema({}, { strict: false }), 'player_statlines');

async function getPlayerStatlines(req, res) {
    if (req.method === 'GET') {
        const player = req.query.player.replace('_', ' '); // Use query parameters for player name

        try {
            await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            const gameLog = await PlayerStatlines.findOne({ player }).lean();
            res.status(200).json(gameLog ? gameLog.game_log : []);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        } finally {
            await mongoose.connection.close();
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

module.exports = getPlayerStatlines;