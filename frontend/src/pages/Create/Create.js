import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Create.css'; // Import the CSS file

function Create() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameNotes, setGameNotes] = useState({});

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const cachedGames = localStorage.getItem('cachedGames');
        if (cachedGames) {
          const parsedGames = JSON.parse(cachedGames);
          setGames(parsedGames);
          initializeNotes(parsedGames);
          setLoading(false);
        } else {
          const response = await axios.get('http://localhost:5000/api/mlb_games');
          const gamesData = response.data;
          setGames(gamesData);
          initializeNotes(gamesData);
          localStorage.setItem('cachedGames', JSON.stringify(gamesData));
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const initializeNotes = (games) => {
    const initialNotes = {};
    games.forEach(game => {
      initialNotes[game.gameId] = '';
    });
    setGameNotes(initialNotes);
  };

  const handleNoteChange = (gameId, note) => {
    setGameNotes(prevNotes => ({
      ...prevNotes,
      [gameId]: note
    }));
  };

  const downloadPlainText = () => {
    let textContent = 'MLB Betting Slate:\n\n';

    games.forEach(game => {
      const note = gameNotes[game.gameId] || '';
      textContent += `Game: ${game.away_team} at ${game.home_team}\n`;
      textContent += `Date: ${game.date}\n`;
      textContent += `Time: ${new Date(game.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
      textContent += `Notes: ${note}\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mlb_betting_slate.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="create-container">
      <h1 className="create-header">MLB Games Scheduled for Today</h1>
      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">Error: {error}</p>}
      {games.length > 0 ? (
        <div>
          {games.map(game => (
            <div key={game.gameId} className="game-card">
              <h2 className="game-title">{game.away_team} at {game.home_team}</h2>
              <p className="game-details"> {new Date(game.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <textarea
                className="game-notes"
                placeholder="Enter your notes..."
                value={gameNotes[game.gameId]}
                onChange={(e) => handleNoteChange(game.gameId, e.target.value)}
              />
            </div>
          ))}
          <button onClick={downloadPlainText} className="save-button">
            Download Slate as Text
          </button>
        </div>
      ) : (
        <p>No games scheduled for today.</p>
      )}
    </div>
  );
}

export default Create;