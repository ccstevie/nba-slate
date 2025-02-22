require('dotenv').config();
const express = require('express');
const cors = require('cors');
const getMatchups = require("./api/getMatchups");
const getPlayers = require("./api/getPlayers");
const getPlayerStatlines = require("./api/getPlayerStatlines");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/matchups", getMatchups);

app.get("/api/players", getPlayers);

app.get("/api/statlines", getPlayerStatlines);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
