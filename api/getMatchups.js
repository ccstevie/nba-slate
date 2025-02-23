const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI;

// Define schema inside the API file
const MatchupSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // Format: YYYY-MM-DD
    matchups: [
      {
        away: { type: String, required: true },
        home: { type: String, required: true },
      },
    ],
  },
  { strict: false }
);

const Matchup = mongoose.model('Matchup', MatchupSchema, 'matchups');

export default async function getMatchups(req, res) {
  if (req.method === "GET") {
    try {
      await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

      const today = new Date().toISOString().split("T")[0];
      const data = await Matchup.findOne({ date: today }).lean();

      if (!data) {
        return res.status(404).json({ message: "No matchups found for today" });
      }

      res.status(200).json(data.matchups);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    } finally {
      mongoose.connection.close();
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// module.exports = getMatchups;