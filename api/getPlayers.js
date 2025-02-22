const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI;

const FinalTable = mongoose.model('FinalTable', new mongoose.Schema({}, { strict: false }), 'final_table');

async function getPlayers(req, res) {
    if (req.method === 'GET') {
        try {
            await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
            const players = await FinalTable.find().lean();
            console.log("DB:", players)
            res.status(200).json(players);
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

module.exports = getPlayers;