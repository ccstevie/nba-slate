import requests
from bs4 import BeautifulSoup
import json
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os

def scrape_nba_lineups():
    url = "https://www.rotowire.com/basketball/nba-lineups.php"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    matchups = soup.find_all('div', class_='lineup__matchup')
    games = []

    for matchup in matchups:
        if matchup.find('a', class_='lineup__mteam is-visit white') == None: continue
        # Find away team with the class for visiting team
        away_team = matchup.find('a', class_='lineup__mteam is-visit white')
        # Find home team with the class for home team
        home_team = matchup.find('a', class_='lineup__mteam is-home white')

        # Extract the team name before the record (by splitting on the first occurrence of '(')
        away_team_name = away_team.text.split('(')[0].strip() if away_team else 'Unknown'
        home_team_name = home_team.text.split('(')[0].strip() if home_team else 'Unknown'
        
        # Get player lineups for both teams
        away_lineup = []
        home_lineup = []

        # Get away team players and add team name with each player
        away_lineup_section = matchup.find_next('ul', class_='lineup__list is-visit')
        if away_lineup_section: 
            away_players = away_lineup_section.find_all('li', class_='lineup__player')
            for player in away_players:
                position = player.find('div', class_='lineup__pos').text.strip()
                name = player.find('a').text.strip()
                # Add player's team alongside their name and position
                away_lineup.append((position, name, away_team_name))
        
        # Get home team players and add team name with each player
        home_lineup_section = matchup.find_next('ul', class_='lineup__list is-home')
        if home_lineup_section: 
            home_players = home_lineup_section.find_all('li', class_='lineup__player')
            for player in home_players:
                position = player.find('div', class_='lineup__pos').text.strip()
                name = player.find('a').text.strip()
                # Add player's team alongside their name and position
                home_lineup.append((position, name, home_team_name))
        
        games.append({
            "away_team": away_team_name, 
            "home_team": home_team_name, 
            "away_lineup": away_lineup, 
            "home_lineup": home_lineup
        })
        
    return games

def scrape_fantasypros_defense_vs_position():
    driver = webdriver.Edge()
    url = "https://www.fantasypros.com/nba/defense-vs-position.php?year=2023"
    driver.get(url)
    
    wait = WebDriverWait(driver, 10)
    
    # Select "Last 30 games"
    filter_dropdown = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'game-change')))
    filter_dropdown.click()
    
    last_30_option = wait.until(EC.element_to_be_clickable((By.XPATH, "//option[@value='GC-30']")))
    last_30_option.click()

    # Wait for the table to load
    time.sleep(5)

    # Dictionary to store rankings for each position
    all_position_data = {}

    # List of positions to loop through
    positions = ['PG', 'SG', 'SF', 'PF', 'C']
    
    for position in positions:
        # Click on the position filter
        position_button = wait.until(EC.element_to_be_clickable((By.XPATH, f"//li[@data-pos='{position}']")))
        position_button.click()
        
        # Wait for the table to refresh
        time.sleep(5)

        # Parse the updated table into a DataFrame
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        table = soup.find('table')
        df = pd.read_html(str(table))[0]  # This pulls the table into a DataFrame
        
        # Store the rankings for the current position
        all_position_data[position] = df
    
    driver.quit()
    return all_position_data  # Dictionary with rankings for each position

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

def format_statmuse_url(player, player_team, opp_team):
    player_formatted = "-".join(player.lower().split())
    return f"https://www.statmuse.com/nba/ask/{player_team}+{player_formatted}-vs-{opp_team}-last-2-years-including-playoffs"

def get_statmuse_player_vs_team(player, player_team, opp_team, category):
    url = format_statmuse_url(player, player_team, opp_team)
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

        # Count the number of games (excluding the summary row)
        games_played = len(rows) - 2  # Adjusted for possible summary row

        # Loop through the game rows (excluding the summary)
        for row in rows[:-2]:
            game_statline = []

            date = row[3]
            game_statline.append(date)
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

def format_season_averages_url(player, team):
    player_formatted = "-".join(player.lower().split())
    return f"https://www.statmuse.com/nba/ask?q={team}+{player_formatted}+averages+this+season"

def get_statmuse_season_averages(player, team):
    url = format_season_averages_url(player, team)
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
        player_team = player_info['player_team']
        
        # Get the stats for the player vs the opposing team (historical)
        historical_stats = get_statmuse_player_vs_team(player_name, player_team, opposing_team, player_info['defense_stats'].keys())
        game_log = historical_stats['game_log']
        averages = historical_stats['averages']
        games_played = historical_stats['games_played']
        
        # Get the player's season averages
        fullname, season_averages = get_statmuse_season_averages(player_name, player_team)
        
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
    print("Fetching lineups")
    lineups = scrape_nba_lineups()
    # print(lineups)

    print("Scraping fantasypros")
    df_dvp = scrape_fantasypros_defense_vs_position()
    # print(df_dvp)

    categories = ['PTS', 'REB', 'AST', '3PM', 'STL', 'BLK']
    ranks = get_positional_ranks(df_dvp, lineups, categories)
    filtered_ranks = filter_ranks(ranks)
    # print("Team ranks:", ranks)
    
    print("Mapping player to opposing defence")
    player_defense_map = map_players_to_defense_rankings(lineups, filtered_ranks)
    # print("player_df")
    # print(player_defense_map)
    
    print("Fetching statmuse")
    player_history = get_player_statistics(player_defense_map)
    # print(player_history)

    print("Getting injury report")
    injury_report = get_injury_report()

    public_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'public')

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

        # Save game log (detailed statlines) to a separate JSON file for each player
        game_log = player_data['game_log']  # The game-by-game statlines
        player_filename = f"{public_folder_path}/{player.replace(' ', '_')}_statlines.json"
        with open(player_filename, 'w') as json_file:
            json.dump(game_log, json_file)

        stats_row['statlines_path'] = f'/public/{player.replace(" ", "_")}_statlines.json'

        # Check if the player is on the injury report
        injury_info = injury_report[injury_report['player'] == player]
        if not injury_info.empty:
            injury_note = injury_info.iloc[0]['status_comment']  # Update to use the status_comment column
            stats_row['injury_note'] = injury_note
        else:
            stats_row['injury_note'] = ''

        # Process final stat values and defense rankings
        for category in categories:
            # Get historical average vs the opposing team
            avg = player_data['averages'].get(category, '')

            # Get the player's season average
            season_avg = season_averages.get(category, '')

            # Calculate the difference between the season average and historical average
            if avg and season_avg:
                difference = round(float(avg) - float(season_avg), 1)
            else:
                difference = ''

            # Add stats to the row based on defense rank
            if category in player_data['defense_stats']:
                defense_rank = player_data['defense_stats'][category]

                # Add both the difference and the opposing team rank
                stats_row[category] = difference
                stats_row[category + '_rank'] = defense_rank
            else:
                stats_row[category] = ''
                stats_row[category + '_rank'] = ''

        # Append the processed row to the final table
        final_table.append(stats_row)

    # Create the DataFrame from the final table
    df_final = pd.DataFrame(final_table)
    df_final_filtered = df_final[(df_final[categories] != 0).any(axis=1)]  # Keep rows with non-zero categories

    # Save the final table to CSV
    slate_csv_path = os.path.join(public_folder_path, 'nba_slate.csv')
    df_final_filtered.to_csv(slate_csv_path, index=False)

if __name__ == '__main__':
    create_player_rankings()
