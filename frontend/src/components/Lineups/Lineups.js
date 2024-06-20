import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Lineups.css';

const Lineups = ({ gameId }) => {
  const [lineups, setLineups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLineups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/starting_lineups/${gameId}`);
        setLineups(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLineups();
  }, [gameId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="lineups-container">
      <h2>Starting Lineups</h2>
      {lineups && (
        <div>
          <h3>Home Team Lineup</h3>
          <ul>
            {lineups.lineups.home.map(player => (
              <li key={player.id}>
                {player.name} - {player.position} (Batting Order: {player.batting_order})
              </li>
            ))}
          </ul>
          <h3>Away Team Lineup</h3>
          <ul>
            {lineups.lineups.away.map(player => (
              <li key={player.id}>
                {player.name} - {player.position} (Batting Order: {player.batting_order})
              </li>
            ))}
          </ul>
          <h3>Probable Pitchers</h3>
          <ul>
            <li>Home: {lineups.probable_pitchers.home.fullName}</li>
            <li>Away: {lineups.probable_pitchers.away.fullName}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Lineups;
