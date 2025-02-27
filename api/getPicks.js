const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI;

const FinalTable = mongoose.model("FinalTable", new mongoose.Schema({}, { strict: false }), "final_table");

export default async function getPicks(req, res) {
    if (req.method === 'GET') {
        try {
            await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            const players = await FinalTable.find().lean();
            
            // Filter criteria
            const threshold = 5;  // Points above average
            const minGames = 5;   // Minimum games played
            
            // Separate best and worst matchups
            const bestMatchups = players.filter(player => 
                player.PTS_Diff >= threshold &&
                player.PTS_rank >= 25 &&
                player.games_played > minGames
            ).sort((a, b) => b.PTS_Diff - a.PTS_Diff);

            const worstMatchups = players.filter(player => 
                player.PTS_Diff <= -threshold &&
                player.PTS_rank <= 5 &&
                player.games_played > minGames
            ).sort((a, b) => a.PTS_Diff - b.PTS_Diff);

            res.status(200).json({ bestMatchups, worstMatchups });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        } finally {
            await mongoose.connection.close();
        }
    }
}
