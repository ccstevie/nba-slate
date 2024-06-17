from flask import Flask, jsonify
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow CORS for all routes

def get_todays_mlb_games():
    url = "http://statsapi.mlb.com/api/v1/schedule/games"
    today = datetime.now().strftime("%Y-%m-%d")
    params = {"sportId": 1, "date": today}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        games = []
        for date_info in data.get("dates", []):
            for game in date_info.get("games", []):
                game_info = {
                    "gameId": game.get("gamePk"),
                    "home_team": game["teams"]["home"]["team"]["name"],
                    "away_team": game["teams"]["away"]["team"]["name"],
                    "date": game.get("officialDate"),
                    "time": game.get("gameDate")
                }
                games.append(game_info)
        return games

    except requests.exceptions.RequestException as e:
        print(f"Error fetching MLB games: {e}")
        return []

@app.route('/api/mlb_games', methods=['GET'])
def mlb_games():
    games = get_todays_mlb_games()
    return jsonify(games)

if __name__ == '__main__':
    app.run(debug=True)
