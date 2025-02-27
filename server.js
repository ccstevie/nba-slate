require('dotenv').config();
const express = require('express');
const cors = require('cors');
const getMatchups = require("./api/getMatchups");
const getPlayers = require("./api/getPlayers");
const getPlayerStatlines = require("./api/getPlayerStatlines");
const getPicks = require("./api/getPicks");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/getMatchups", getMatchups);

app.get("/api/getPlayers", getPlayers);

app.get("/api/getPlayerStatlines", getPlayerStatlines);

app.get("/api/getPicks", getPicks);


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
