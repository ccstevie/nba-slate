import requests
from bs4 import BeautifulSoup
from datetime import datetime
import pandas as pd
import os
import requests
from pymongo import MongoClient
from pymongo.server_api import ServerApi
# from dotenv import load_dotenv
# load_dotenv()

def scrape_nba_lineups():
    url = "https://www.rotowire.com/basketball/nba-lineups.php"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    matchups = soup.find_all('div', class_='lineup is-nba')
    games = []

    for matchup in matchups:
        if matchup.find('a', class_='lineup__mteam is-visit white') is None:
            continue

        time = matchup.find('div', class_='lineup__time').text
        
        # Find away and home teams
        away_team = matchup.find('a', class_='lineup__mteam is-visit white')
        home_team = matchup.find('a', class_='lineup__mteam is-home white')

        away_team_name = away_team.text.split('(')[0].strip() if away_team else 'Unknown'
        home_team_name = home_team.text.split('(')[0].strip() if home_team else 'Unknown'
        
        away_lineup, home_lineup = [], []

        # Find away team players
        away_lineup_section = matchup.find_next('ul', class_='lineup__list is-visit')
        if away_lineup_section:
            for item in away_lineup_section.find_all('li'):
                if 'is-middle' in item.get('class', []):
                    break
                if 'lineup__player' in item.get('class', []):
                    position = item.find('div', class_='lineup__pos').text.strip()
                    
                    player_tag = item.find('a')
                    name = player_tag.get("title", player_tag.text).strip()

                    away_lineup.append((position, name, away_team_name))

        # Find home team players
        home_lineup_section = matchup.find_next('ul', class_='lineup__list is-home')
        if home_lineup_section:
            for item in home_lineup_section.find_all('li'):
                if 'is-middle' in item.get('class', []):
                    break
                if 'lineup__player' in item.get('class', []):
                    position = item.find('div', class_='lineup__pos').text.strip()

                    player_tag = item.find('a')
                    name = player_tag.get("title", player_tag.text).strip()

                    home_lineup.append((position, name, home_team_name))

        games.append({
            "time": time,
            "away_team": away_team_name, 
            "home_team": home_team_name, 
            "away_lineup": away_lineup, 
            "home_lineup": home_lineup
        })
        
    return games

def scrape_fantasypros_defense_vs_position():
    fp_url = "https://www.fantasypros.com/nba/defense-vs-position.php?range=30"
    positions = ["PG", "SG", "SF", "PF", "C"]

    all_position_data = {}

    for pos in positions:
        url = f"{fp_url}&pos={pos}"
        html = requests.get(url).text
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        df = pd.read_html(str(table))[0]
        all_position_data[pos] = df

    return all_position_data

def create_ranks(df_dvp, rank_columns):    
    for column in rank_columns:
        # Add a new column for each ranking (ascending order)
        df_dvp[column + '_rank'] = df_dvp[column].rank(method='min', ascending=True)
    return df_dvp

def get_positional_ranks(positional_dfs, lineups, rank_columns):
    team_ranks = []

    # First, add ranking columns to each positional DataFrame
    for position, df in positional_dfs.items():
        positional_dfs[position] = create_ranks(df, rank_columns)

    for game in lineups:
        game_ranks = {}

        # Extract both the home and away team lineups
        teams = {
            "home_team": game['home_team'],
            "away_team": game['away_team'],
            "home_lineup": game['home_lineup'],
            "away_lineup": game['away_lineup']
        }

        for team_key in ['home_team', 'away_team']:
            team_name = teams[team_key]
            team_data = {}

            # Iterate over each position (PG, SG, SF, PF, C)
            for position, df in positional_dfs.items():
                # Check if the team name is in the 'Team' column (using contains for partial matches)
                team_row = df[df['Team'].str.contains(team_name, case=False, na=False)]

                if not team_row.empty:
                    pos_ranks = {}
                    
                    for column in rank_columns:
                        # Ensure we're referencing the rank column
                        pos_ranks[column] = int(team_row[column + '_rank'].values[0])

                    team_data[position] = pos_ranks
                else:
                    # If team not found for a specific position, set None for all columns
                    team_data[position] = {column: None for column in rank_columns}

            game_ranks[team_name] = team_data

        team_ranks.append(game_ranks)

    return team_ranks

def filter_ranks(team_rankings):
    all_ranks = []

    for game in team_rankings:
        game_ranks = {}
        for team, positions in game.items():
            position_ranks = {}
            for position, stats in positions.items():
                position_ranks[position] = stats
            if position_ranks:
                game_ranks[team] = position_ranks
        if game_ranks:
            all_ranks.append(game_ranks)

    return all_ranks

def map_players_to_defense_rankings(lineups, filtered_ranks):
    player_defense_mapping = []

    for game_ranking in filtered_ranks:
        for team, position_ranks in game_ranking.items():
            for matchup in lineups:
                # Check if team in the filtered rankings matches with the lineup teams
                if matchup['home_team'] == team:
                    opposing_lineup = matchup['away_lineup']
                elif matchup['away_team'] == team:
                    opposing_lineup = matchup['home_lineup']
                else:
                    continue

                for pos, player, player_team in opposing_lineup:
                    if pos in position_ranks:
                        defense_stats = position_ranks[pos]
                        player_defense_mapping.append({
                            'player': player,
                            'position': pos,
                            'player_team': player_team,
                            'opposing_team': team,
                            'defense_stats': defense_stats
                        })

    return player_defense_mapping

def format_statmuse_url(player, opp_team):
    player_formatted = "-".join(player.lower().split())
    return f"https://www.statmuse.com/nba/ask/{player_formatted}-vs-{opp_team}-last-2-years-including-playoffs"

def get_statmuse_player_vs_team(player, opp_team, category):
    url = format_statmuse_url(player, opp_team)
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    game_log = []  # List of lists to store statlines for each game
    averages = {stat: 0 for stat in category}  # Dictionary to store average values for each stat
    games_played = 0

    table = soup.find('table')
    if table:
        headers = [th.get_text().strip() for th in table.find_all('th')]
        values = [td.get_text().strip() for td in table.find_all('td')]
        
        # Create rows for each game
        rows = [values[i:i + len(headers)] for i in range(0, len(values), len(headers))]

        if len(rows) == 1: 
            games_played = 1

            row = rows[0]
            game_statline = []

            date = row[3]
            player_team = row[4]
            loc = "Home" if row[5] == "vs" else "Away"
            minutes = row[7]
            game_statline.extend([date, player_team, loc, minutes])
            for stat in category:
                stat_index = headers.index(stat)
                stat_value = row[stat_index].strip()
                
                # If stat value is present, append it to the game log and update averages
                if stat_value:
                    stat_float = float(stat_value)
                    game_statline.append(stat_float)
                    averages[stat] += stat_float
                else:
                    game_statline.append(0.0)
            game_log.append(game_statline)
        else:
            # Count the number of games (excluding the summary row)
            games_played = len(rows) - 2  # Adjusted for possible summary row

            # Loop through the game rows (excluding the summary)
            for row in rows[:-2]:
                game_statline = []

                date = row[3]
                player_team = row[4]
                loc = "Home" if row[5] == "vs" else "Away"
                minutes = row[7]
                game_statline.extend([date, player_team, loc, minutes])
                for stat in category:
                    stat_index = headers.index(stat)
                    stat_value = row[stat_index].strip()
                    
                    # If stat value is present, append it to the game log and update averages
                    if stat_value:
                        stat_float = float(stat_value)
                        game_statline.append(stat_float)
                        averages[stat] += stat_float
                    else:
                        game_statline.append(0.0)
                game_log.append(game_statline)

        # Calculate averages by dividing the total for each stat by games played
        for stat in category:
            if games_played > 0:
                averages[stat] = round(averages[stat] / games_played, 1)

    return {
        "game_log": game_log,  # List of lists where each sublist represents a game's stats
        "averages": averages,  # Average stats per category
        "games_played": games_played  # Number of games played
    }

def format_season_averages_url(player):
    player_formatted = "-".join(player.lower().split())
    return f"https://www.statmuse.com/nba/ask?q={player_formatted}+averages+this+season"

def get_statmuse_season_averages(player):
    url = format_season_averages_url(player)
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Stats we want to focus on
    categories_mapping = {
        'PPG': 'PTS',
        'RPG': 'REB',
        'APG': 'AST',
        'SPG': 'STL',
        'BPG': 'BLK',
        '3PM': '3PM'
    }

    table = soup.find('table')  # Find the table in the response HTML
    if table:
        headers = [th.get_text().strip() for th in table.find_all('th')]
        values = [td.get_text().strip() for td in table.find_all('td')]
        
        # Create a dictionary from headers and values
        season_stats = dict(zip(headers, values))
        
        # Filter and rename only the specified categories
        filtered_stats = {categories_mapping[stat]: season_stats.get(stat, 'N/A') 
                          for stat in categories_mapping if stat in season_stats}
        
        player_name = season_stats.get('NAME', 'N/A')
        name_before_abbr = player_name.split('.')[0]
        name_parts = name_before_abbr.split()
        full_name = " ".join(name_parts[:-1])

        return full_name, filtered_stats
    else:
        return '', {}

def get_player_statistics(player_map):
    player_stats = []

    for player_info in player_map:
        player_name = player_info['player']
        opposing_team = player_info['opposing_team']
        defense_stats = player_info['defense_stats']
        
        # Get the stats for the player vs the opposing team (historical)
        historical_stats = get_statmuse_player_vs_team(player_name, opposing_team, player_info['defense_stats'].keys())
        game_log = historical_stats['game_log']
        averages = historical_stats['averages']
        games_played = historical_stats['games_played']
        
        # Get the player's season averages
        fullname, season_averages = get_statmuse_season_averages(player_name)

        player_stats.append({
            'player': fullname,
            'opposing_team': opposing_team,
            'defense_stats': defense_stats,
            'game_log': game_log,  # Detailed game-by-game statlines
            'averages': averages,  # Historical averages vs the team
            'games_played': games_played,
            'season_averages': season_averages  # Season averages
        })

    return player_stats

def get_injury_report():
    url = 'https://www.espn.com/nba/injuries'
    headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')

    injury_report  = []

    teams_sections = soup.find_all('div', class_='ResponsiveTable Table__league-injuries')

    for team_section in teams_sections:
        # Get team name from the section
        team_name = team_section.find('span', class_='injuries__teamName').text.strip()
        
        # Find the table within the team section
        table = team_section.find('table')
        
        if table:
            players = table.find_all('tr')[1:]  # Skip the header row

            for player_row in players:
                # Extract the columns for player name, position, return date, status, and comment
                player_data = player_row.find_all('td')
                if len(player_data) >= 5:  # Ensure there are enough columns
                    player_name = player_data[0].text.strip()
                    position = player_data[1].text.strip()
                    est_return_date = player_data[2].text.strip()
                    status_comment = player_data[4].text.strip()  # Comment is the last column

                    # Add the data to the injury report list
                    injury_report.append({
                        'team': team_name,
                        'player': player_name,
                        'position': position,
                        'est_return_date': est_return_date,
                        'status_comment': status_comment
                    })

    # Convert the list into a DataFrame for easier searching later
    df_injury_report = pd.DataFrame(injury_report)
    return df_injury_report

def create_player_rankings():
    db_uri = os.getenv("MONGODB_URI")
    if not db_uri:
        raise ValueError("MONGODB_URI is not set in environment variables.")

    try:
        client = MongoClient(db_uri, server_api=ServerApi('1'))
        db = client['nba_stats']

        matchups_collection = db['matchups']
        final_table_collection = db['final_table']
        player_statlines_collection = db['player_statlines'] 

        # Clear old data by dropping the collections
        print("Dropping old data...")
        matchups_collection.drop()
        final_table_collection.drop()
        player_statlines_collection.drop() 

        # Recreate collections after dropping
        matchups_collection = db['matchups']
        final_table_collection = db['final_table']
        player_statlines_collection = db['player_statlines']

        print("Fetching lineups")
        lineups = scrape_nba_lineups()

        print("Scraping fantasypros")
        df_dvp = scrape_fantasypros_defense_vs_position()

        categories = ['PTS', 'REB', 'AST', '3PM', 'STL', 'BLK']
        ranks = get_positional_ranks(df_dvp, lineups, categories)
        filtered_ranks = filter_ranks(ranks)

        print("Mapping player to opposing defence")
        player_defense_map = map_players_to_defense_rankings(lineups, filtered_ranks)

        print("Fetching statmuse")
        player_history = get_player_statistics(player_defense_map)

        print("Getting injury report")
        injury_report = get_injury_report()

        print("Finalizing Table")
        final_table = []

        for player_data in player_history:
            player = player_data['player']
            opposing_team = player_data['opposing_team']
            season_averages = player_data['season_averages']
            games_played = player_data['games_played']

            if not opposing_team or not season_averages:
                continue

            # Initialize the row for each player
            stats_row = {
                'player': player,
                'opposing_team': opposing_team,
                'games_played': games_played
            }

            game_log = player_data['game_log']

            # Upload the game log to MongoDB's player_statlines collection
            player_statline_data = {
                "player": player,
                "opposing_team": opposing_team,
                "game_log": game_log
            }
            player_statlines_collection.insert_one(player_statline_data)

            # Check if the player is on the injury report
            injury_info = injury_report[injury_report['player'] == player]
            if not injury_info.empty:
                injury_note = injury_info.iloc[0]['status_comment']
                stats_row['injury_note'] = injury_note
            else:
                stats_row['injury_note'] = ''

            # Process final stat values and defense rankings
            for category in categories:
                avg = player_data['averages'].get(category, '')
                season_avg = season_averages.get(category, '')

                if avg and season_avg:
                    difference = round(float(avg) - float(season_avg), 1)
                else:
                    difference = ''

                if category in player_data['defense_stats']:
                    defense_rank = player_data['defense_stats'][category]
                    stats_row[category] = difference
                    stats_row[category + '_rank'] = defense_rank
                else:
                    stats_row[category] = ''
                    stats_row[category + '_rank'] = ''

            final_table.append(stats_row)

        # Convert final table to DataFrame and filter non-zero rows
        df_final = pd.DataFrame(final_table)
        df_final_filtered = df_final[(df_final[categories] != 0).any(axis=1)]

        # Insert df_final_filtered into MongoDB
        final_table_collection.insert_many(df_final_filtered.to_dict('records'))

        # Extract only the matchups (away/home teams)
        matchups = [{'time': game['time'], 'away_team': game['away_team'], 'home_team': game['home_team']} for game in lineups]

        # Insert today's matchups into MongoDB
        today = datetime.today().strftime('%Y-%m-%d')
        matchup_entry = {'date': today, 'matchups': matchups}

        # Upsert to avoid duplicate entries for the same date
        matchups_collection.update_one({'date': today}, {'$set': matchup_entry}, upsert=True)

        print("Data uploaded to MongoDB successfully")

    except Exception as e:
        print(f"Error occurred: {e}")
    
    finally:
        # Close MongoDB connection
        client.close()
        print("MongoDB connection closed.")

if __name__ == '__main__':
    create_player_rankings()
