# app.py

from flask import Flask, jsonify
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

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

@app.route('/api/starting_lineups/<int:game_id>', methods=['GET'])
def get_starting_lineups(game_id):
    try:
        # Fetch probable pitchers
        pitchers_response = requests.get(
            f'https://statsapi.mlb.com/api/v1/schedule?sportId=1&gamePk={game_id}&hydrate=probablePitcher(note)'
        )
        pitchers_data = pitchers_response.json()

        # Fetch lineups
        lineups_response = requests.get(
            f'https://statsapi.mlb.com/api/v1.1/game/{game_id}/feed/live'
        )
        lineups_data = lineups_response.json()

        # Extract probable pitchers
        game_details = pitchers_data.get('dates', [])[0].get('games', [])[0]
        probable_pitchers = {
            'home': game_details['teams']['home'].get('probablePitcher', {}),
            'away': game_details['teams']['away'].get('probablePitcher', {})
        }

        # Extract lineups
        lineups = {
            'home': [],
            'away': []
        }
        teams = lineups_data.get('liveData', {}).get('boxscore', {}).get('teams', {})
        
        for team, lineup in teams.items():
            batters = lineup.get('batters', [])
            batter_info = []
            for batter_id in batters:
                batter_data = lineups_data.get('liveData', {}).get('players', {}).get(f'ID{batter_id}', {})
                batter_info.append({
                    'id': batter_id,
                    'name': batter_data.get('fullName', ''),
                    'position': batter_data.get('position', {}).get('abbreviation', ''),
                    'batting_order': batter_data.get('battingOrder', '')
                })
            lineups[team] = batter_info

        result = {
            'probable_pitchers': probable_pitchers,
            'lineups': lineups
        }

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# @app.route('/api/team_vs_pitcher/<team_id>/<pitcher_hand>', methods=['GET'])
# def get_team_vs_pitcher(team_id, pitcher_hand):
#     try:
#         # Use a scraping tool or API service for detailed stats
#         data = {
#             'wRC+': 120,  # Example data
#             'K%': 22.5    # Example data
#         }
#         return jsonify(data), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
    
# @app.route('/api/pitcher_statcast/<pitcher_id>', methods=['GET'])
# def get_pitcher_statcast(pitcher_id):
#     try:
#         # Use a scraping tool or API service for detailed stats
#         data = {
#             'K%': 28.7,     # Example data
#             'Whiff%': 30.2, # Example data
#             'Chase%': 35.1  # Example data
#         }
#         return jsonify(data), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# @app.route('/api/batter_vs_pitcher/<pitcher_id>', methods=['GET'])
# def get_batter_vs_pitcher(pitcher_id):
#     try:
#         # Use a scraping tool or API service for detailed stats
#         data = {
#             'players': [
#                 {'name': 'Player A', 'OPS': .900},
#                 {'name': 'Player B', 'OPS': .850},
#             ]
#         }
#         return jsonify(data), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
    
# @app.route('/api/weather/<location>', methods=['GET'])
# def get_weather(location):
#     try:
#         response = requests.get(f'http://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q={location}')
#         weather_data = response.json()
#         return jsonify(weather_data), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
