// src/components/GameDetails/GameDetails.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './GameDetails.css';

const GameDetails = () => {
  const { gameId } = useParams();
  const [gameDetails, setGameDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const cachedGameDetails = localStorage.getItem(`gameDetails-${gameId}`);
        if (cachedGameDetails) {
          setGameDetails(JSON.parse(cachedGameDetails));
          setLoading(false);
        } else {
          const response = await axios.get(`http://localhost:5000/api/starting_lineups/${gameId}`);
          const details = response.data;
          setGameDetails(details);
          localStorage.setItem(`gameDetails-${gameId}`, JSON.stringify(details));
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchGameDetails();
  }, [gameId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="game-details-container">
      <div className="game-header">
        <h1 className="game-title">Game Details</h1>
      </div>
      {gameDetails && (
        <>
          <div className="game-info">
            <div>
              <h2>{gameDetails.away_team} at {gameDetails.home_team}</h2>
              <p>Date: {new Date(gameDetails.date).toLocaleDateString()}</p>
              <p>Time: {new Date(gameDetails.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="lineup">
            <h3 className="lineup-title">Lineups</h3>
            <div className="lineup-details">
              <div>
                <h4>{gameDetails.away_team} Lineup</h4>
                <ul className="lineup-list">
                  {gameDetails.lineups.away.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>{gameDetails.home_team} Lineup</h4>
                <ul className="lineup-list">
                  {gameDetails.lineups.home.map((player, index) => (
                    <li key={index}>{player}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="notes-section">
            <h3 className="notes-title">Notes</h3>
            <div className="notes-content">
              {/* Include a textarea for notes or any other relevant game information */}
              <textarea placeholder="Add your notes here..."></textarea>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GameDetails;
