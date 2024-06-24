import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Spinner from '../../components/Spinner/Spinner';
import './Create.css';

const Create = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameNotes, setGameNotes] = useState({});
  const [lineups, setLineups] = useState({});
  const [pitchers, setPitchers] = useState({});
  const [batterStats, setBatterStats] = useState({});
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const cachedGames = localStorage.getItem('cachedGames');
        if (cachedGames) {
          const parsedGames = JSON.parse(cachedGames);
          setGames(parsedGames);
          initializeNotes(parsedGames);
          fetchAllLineups(parsedGames);
          setLoading(false);
        } else {
          const response = await axios.get('http://localhost:5000/api/mlb_games');
          const gamesData = response.data;
          setGames(gamesData);
          initializeNotes(gamesData);
          localStorage.setItem('cachedGames', JSON.stringify(gamesData));
          fetchAllLineups(gamesData);
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchAllLineups = async (gamesData) => {
      try {
        const lineupPromises = gamesData.map(async (game) => {
          const response = await axios.get(`http://localhost:5000/api/starting_lineups/${game.gameId}`);
          return { gameId: game.gameId, data: response.data };
        });

        const lineupResults = await Promise.all(lineupPromises);
        const lineupsData = {};
        const pitchersData = {};
        const batterStatsData = {};

        for (const result of lineupResults) {
          const { gameId, data } = result;
          lineupsData[gameId] = data.lineups;
          pitchersData[gameId] = data.probable_pitchers;

          const statsPromises = [];
          for (const team in data.lineups) {
            data.lineups[team].forEach((batter) => {
              const pitcher = team === 'home' ? data.probable_pitchers.away : data.probable_pitchers.home;
              if (batter.id) {
                statsPromises.push(fetchBatterStats(batter.id, pitcher.id, gameId));
              }
            });
          }

          const statsResults = await Promise.all(statsPromises);
          batterStatsData[gameId] = statsResults.reduce((acc, stat) => {
            acc[stat.batterId] = stat.stats;
            return acc;
          }, {});
        }

        setLineups(lineupsData);
        setPitchers(pitchersData);
        setBatterStats(batterStatsData);
      } catch (err) {
        setError(err.message);
      }
    };

    const fetchBatterStats = async (batterId, pitcherId, gameId) => {
      try {
        const statsResponse = await axios.get(`http://localhost:5000/api/batter_vs_pitcher/${batterId}/${pitcherId}`);
        return { batterId, gameId, stats: statsResponse.data };
      } catch (err) {
        return { batterId, gameId, stats: { error: err.message } };
      }
    };

    const initializeNotes = (games) => {
      const initialNotes = {};
      games.forEach((game) => {
        initialNotes[game.gameId] = '';
      });
      setGameNotes(initialNotes);
    };

    fetchGames();
  }, []);

  const toggleExpand = (gameId) => {
    if (expandedGameId === gameId) {
      setExpandedGameId(null);
    } else {
      setLoadingDetails(true);
      setExpandedGameId(gameId);
      setTimeout(() => {
        setLoadingDetails(false);
      }, 5000);
    }
  };

  const handleNoteChange = (gameId, note) => {
    setGameNotes(prevNotes => ({
      ...prevNotes,
      [gameId]: note
    }));
  };

  const downloadPlainText = () => {
    let textContent = 'MLB Betting Slate:\n\n';

    games.forEach((game) => {
      const note = gameNotes[game.gameId] || '';
      textContent += `Game: ${game.away_team} at ${game.home_team}\n`;
      textContent += `Date: ${game.date}\n`;
      textContent += `Time: ${new Date(game.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
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

  const renderLineup = (team, players, gameId) => (
    <div className="lineup">
      <h3>{team === 'home' ? 'Home Team' : 'Away Team'}</h3>
      <p>Opposing Pitcher: {team === 'home' ? pitchers[gameId].away.fullName : pitchers[gameId].home.fullName}</p>
      <ul>
        {players.map((player) => (
          <li key={player.id}>
            {player.name} - {player.position}
            {batterStats[gameId] && batterStats[gameId][player.id] && (
              <span className="batter-stats">
                <strong>BA:</strong> {batterStats[gameId][player.id].batting_average} <strong>OPS:</strong> {batterStats[gameId][player.id].ops} <strong>HR:</strong> {batterStats[gameId][player.id].home_runs}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="container">
      <h1 className="create-header">MLB Games Scheduled for Today</h1>
      {loading && <p className="loading">Loading...</p>}
      {error && <p className="error">Error: {error}</p>}
      {games.length > 0 ? (
        <div>
          {games.map((game) => (
            <div key={game.gameId} className="game-card">
              <h2 className="game-title">{game.away_team} at {game.home_team}</h2>
              <p className="game-time">{new Date(game.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <button onClick={() => toggleExpand(game.gameId)} className="details-button">
                {expandedGameId === game.gameId ? 'Hide Details' : 'View Details'}
              </button>
              {expandedGameId === game.gameId && (
                <div className="details-section">
                  {loadingDetails ? (
                    <Spinner />
                  ) : (
                    lineups[game.gameId] && (
                      <>
                        {renderLineup('home', lineups[game.gameId].home, game.gameId)}
                        {renderLineup('away', lineups[game.gameId].away, game.gameId)}
                      </>
                    )
                  )}
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
};

export default Create;
