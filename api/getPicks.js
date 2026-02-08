const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI;

const FinalTable = mongoose.model("FinalTable", new mongoose.Schema({}, { strict: false }), "final_table");

export default async function getPicks(req, res) {
    if (req.method === "GET") {
        try {
            await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            const players = await FinalTable.find().lean();

            const minGames = 5; // Minimum games played

            // Filter players with sufficient games
            const validPlayers = players.filter(player => player.games_played > minGames);

            // Rank best matchups: Sort by highest PTS_Diff and worst defense (highest PTS_rank)
            const bestMatchups = [...validPlayers]
                .sort((a, b) => b.PTS_Diff - a.PTS_Diff || b.PTS_rank - a.PTS_rank)
                .slice(0, 3); // Take top 3 best matchups

            // Rank worst matchups: Sort by lowest PTS_Diff and strongest defense (lowest PTS_rank)
            const worstMatchups = [...validPlayers]
                .sort((a, b) => a.PTS_Diff - b.PTS_Diff || a.PTS_rank - b.PTS_rank)
                .slice(0, 3); // Take top 3 worst matchups

            res.status(200).json({ bestMatchups, worstMatchups });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: err.message });
        } finally {
            await mongoose.connection.close();
        }
    }
}
