from flask import Flask, jsonify
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

MLB_API_BASE_URL = "https://statsapi.mlb.com/api/v1"

def get_todays_mlb_games():
    url = f"{MLB_API_BASE_URL}/schedule/games"
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
            f'{MLB_API_BASE_URL}/schedule?sportId=1&gamePk={game_id}&hydrate=probablePitcher(note)'
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

        def get_player_name(player_id):
            url = f"{MLB_API_BASE_URL}/people/{player_id}"
            
            response = requests.get(url)
            
            if response.status_code == 200:
                player_data = response.json()
                player_name = player_data['people'][0]['fullName']
                return player_name
            else:
                return f"Error: Unable to fetch data (Status Code: {response.status_code})"
            
        # Extract teams from boxscore
        teams = lineups_data.get('liveData', {}).get('boxscore', {}).get('teams', {})

        # Extract away team lineup
        away_batters = teams.get('away', {}).get('batters', [])
        for batter_id in away_batters:
            lineups['away'].append(get_player_name(batter_id))

        # Extract home team lineup
        home_batters = teams.get('home', {}).get('batters', [])
        for batter_id in home_batters:
            lineups['home'].append(get_player_name(batter_id))

        result = {
            'probable_pitchers': probable_pitchers,
            'lineups': lineups
        }

        return jsonify(result), 200
    except Exception as e:
        print(f"Error in get_starting_lineups: {e}")
        return jsonify({'error': str(e)}), 500

def get_batter_vs_pitcher_stats(batter_id, pitcher_id):
    try:
        response = requests.get(
            f"{MLB_API_BASE_URL}/people/{batter_id}/stats/game/{pitcher_id}?stats=vsPlayer"
        )
        data = response.json()

        stats = data.get('stats', [])[0].get('splits', [])[0].get('stat', {})
        batting_average = stats.get('avg', 'N/A')
        ops = stats.get('ops', 'N/A')
        home_runs = stats.get('homeRuns', 'N/A')

        return {
            'batting_average': batting_average,
            'ops': ops,
            'home_runs': home_runs
        }
    except Exception as e:
        return {'error': str(e)}

@app.route('/api/batter_vs_pitcher/<int:batter_id>/<int:pitcher_id>', methods=['GET'])
def batter_vs_pitcher(batter_id, pitcher_id):
    stats = get_batter_vs_pitcher_stats(batter_id, pitcher_id)
    return jsonify(stats), 200

if __name__ == '__main__':
    app.run(debug=True)
