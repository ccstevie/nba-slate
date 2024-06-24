import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Create.css';

function Create() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameNotes, setGameNotes] = useState({});
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [lineups, setLineups] = useState({});
  const [pitchers, setPitchers] = useState({});
  const [batterStats, setBatterStats] = useState({});

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

  const toggleExpand = async (gameId) => {
    if (expandedGameId === gameId) {
      setExpandedGameId(null);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/starting_lineups/${gameId}`);
      const data = response.data;

      setLineups(prevLineups => ({ ...prevLineups, [gameId]: data.lineups }));
      setPitchers(prevPitchers => ({ ...prevPitchers, [gameId]: data.probable_pitchers }));

      const fetchStats = async (batterId, pitcherId) => {
        try {
          const statsResponse = await axios.get(
            `http://localhost:5000/api/batter_vs_pitcher/${batterId}/${pitcherId}`
          );
          return statsResponse.data;
        } catch (err) {
          return { error: err.message };
        }
      };

      const statsPromises = [];
      for (const team in data.lineups) {
        data.lineups[team].forEach(async batter => {
          const pitcher = team === 'home' ? data.probable_pitchers.away : data.probable_pitchers.home;
          const stats = fetchStats(batter.id, pitcher.id);
          statsPromises.push(stats);
        });
      }

      const statsResults = await Promise.all(statsPromises);
      const batterStatsMap = {};

      statsResults.forEach((stats, index) => {
        const team = index < data.lineups.home.length ? 'home' : 'away';
        const batter = data.lineups[team][index % data.lineups[team].length];
        batterStatsMap[batter.id] = stats;
      });

      setBatterStats(prevStats => ({ ...prevStats, [gameId]: batterStatsMap }));
      setExpandedGameId(gameId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderLineup = (team, players) => (
    <div className="lineup">
      <h3>{team === 'home' ? 'Home Team' : 'Away Team'}</h3>
      <p>Opposing Pitcher: {team === 'home' ? pitchers[expandedGameId]?.away.fullName : pitchers[expandedGameId]?.home.fullName}</p>
      {players.length > 0 ? 
      (<ul>
        {players.map(player => (
          <li key={player.id}>
            {player.name} - {player.position}
            {batterStats[expandedGameId] && batterStats[expandedGameId][player.id] && (
              <span className="batter-stats">
                <strong>BA:</strong> {batterStats[expandedGameId][player.id].batting_average} <strong>OPS:</strong> {batterStats[expandedGameId][player.id].ops} <strong>HR:</strong> {batterStats[expandedGameId][player.id].home_runs}
              </span>
            )}
          </li>
        ))}
      </ul>) :
      <p>Lineups not set</p>
      }
    </div>
  );

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
    <div className="container">
      <h1 className="create-header">MLB Games Scheduled for Today</h1>
      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">Error: {error}</p>}
      {games.length > 0 ? (
        <div>
          {games.map(game => (
            <div key={game.gameId} className="game-card">
              <h2 className="game-title">{game.away_team} at {game.home_team}</h2>
              <p className="game-time"> {new Date(game.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <button onClick={() => toggleExpand(game.gameId)} className="details-link">
                {expandedGameId === game.gameId ? 'Hide Lineups ▲' : 'View Lineups ▼'}
              </button>
              {expandedGameId === game.gameId && (
                <div className="game-details">
                  <div className="lineups-section">
                    {lineups[game.gameId] && renderLineup('home', lineups[game.gameId].home)}
                    {lineups[game.gameId] && renderLineup('away', lineups[game.gameId].away)}
                  </div>
                </div>
              )}
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
