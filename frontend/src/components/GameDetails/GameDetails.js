import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './GameDetails.css';

const GameDetails = () => {
  const { gameId } = useParams();
  const [lineups, setLineups] = useState({ home: [], away: [] });
  const [pitchers, setPitchers] = useState({ home: {}, away: {} });
  const [batterStats, setBatterStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/starting_lineups/${gameId}`);
        const data = response.data;

        setLineups(data.lineups);
        setPitchers(data.probable_pitchers);

        // Fetch batter vs pitcher stats for each batter in the lineups
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

        // Map through lineups and get stats for each batter
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

        setBatterStats(batterStatsMap);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [gameId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  const renderLineup = (team, players) => (
    <div className="lineup">
      <h3>{team === 'home' ? 'Home Team' : 'Away Team'}</h3>
      <ul>
        {players.map(player => (
          <li key={player.id}>
            {player.name} - {player.position}
            {batterStats[player.id] && (
              <div className="batter-stats">
                <p><strong>BA:</strong> {batterStats[player.id].batting_average}</p>
                <p><strong>OPS:</strong> {batterStats[player.id].ops}</p>
                <p><strong>HR:</strong> {batterStats[player.id].home_runs}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="game-details-container">
      <h1>Game Details</h1>
      <div className="lineups-section">
        {renderLineup('home', lineups.home)}
        {renderLineup('away', lineups.away)}
      </div>
    </div>
  );
};

export default GameDetails;
