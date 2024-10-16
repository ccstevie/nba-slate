import requests
from bs4 import BeautifulSoup
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

        # Get away team players
        away_lineup_section = matchup.find_next('ul', class_='lineup__list is-visit')
        if away_lineup_section: away_players = away_lineup_section.find_all('li', class_='lineup__player')
        for player in away_players:
            position = player.find('div', class_='lineup__pos').text.strip()
            name = player.find('a').text.strip()
            away_lineup.append((position, name))
        
        # Get home team players
        home_lineup_section = matchup.find_next('ul', class_='lineup__list is-home')
        if home_lineup_section: home_players = home_lineup_section.find_all('li', class_='lineup__player')
        for player in home_players:
            position = player.find('div', class_='lineup__pos').text.strip()
            name = player.find('a').text.strip()
            home_lineup.append((position, name))
        
        games.append({"away_team": away_team_name, "home_team": home_team_name, "away_lineup": away_lineup, "home_lineup": home_lineup})
        
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
        teams = [game['home_team'], game['away_team']]
        game_ranks = {}

        for team in teams:
            team_data = {}

            # Iterate over each position (PG, SG, SF, PF, C)
            for position, df in positional_dfs.items():
                # Check if the team name is in the 'Team' column (using contains for partial matches)
                team_row = df[df['Team'].str.contains(team, case=False, na=False)]
                
                if not team_row.empty:
                    pos_ranks = {}
                    
                    for column in rank_columns:
                        # Ensure we're referencing the rank column
                        pos_ranks[column] = int(team_row[column + '_rank'].values[0])

                    team_data[position] = pos_ranks
                else:
                    # If team not found for a specific position, set None for all columns
                    team_data[position] = {column: None for column in rank_columns}

            game_ranks[team] = team_data

        team_ranks.append(game_ranks)

    return team_ranks

def filter_top_bottom_ranks(team_rankings):
    top_bottom_ranks = []

    for game in team_rankings:
        filtered_game = {}
        for team, positions in game.items():
            filtered_positions = {}
            for position, stats in positions.items():
                filtered_stats = {stat: rank for stat, rank in stats.items() if (rank is not None and (1 <= rank <= 5 or 25 <= rank <= 30))}
                if filtered_stats:  # Only add if there's any top/bottom rank
                    filtered_positions[position] = filtered_stats
            if filtered_positions:  # Only add if any positions are filtered
                filtered_game[team] = filtered_positions
        if filtered_game:
            top_bottom_ranks.append(filtered_game)

    return top_bottom_ranks

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

                # Now map the opposing players and their respective position ranks
                for pos, player in opposing_lineup:
                    if pos in position_ranks:
                        defense_stats = position_ranks[pos]
                        player_defense_mapping.append({
                            'player': player,
                            'position': pos,
                            'opposing_team': team,
                            'defense_stats': defense_stats
                        })

    return player_defense_mapping

# Function to format the StatMuse URL
def format_statmuse_url(player, team):
    player_formatted = "-".join(player.lower().split())
    return f"https://www.statmuse.com/nba/ask/{player_formatted}-vs-{team}-last-2-years-including-playoffs"

def get_statmuse_player_vs_team(player, team, category):
    url = format_statmuse_url(player, team)
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    stats = {stat: [] for stat in category}
    games_played = 0  # Initialize games played counter

    table = soup.find('table')
    if table:
        headers = [th.get_text().strip() for th in table.find_all('th')]
        values = [td.get_text().strip() for td in table.find_all('td')]
        
        # Create a list of games as rows
        rows = [values[i:i + len(headers)] for i in range(0, len(values), len(headers))]
        
        # Count the number of rows representing games, excluding the summary row
        games_played = len(rows) - 2

        for stat in category:
            stat_index = headers.index(stat)
            for row in rows[:-1]:  # Loop through game rows (excluding summary)
                if row[stat_index].strip():
                    stats[stat].append(float(row[stat_index]))  # Append the value

    return stats, games_played  # Return stats and the number of games played

# Function to format the StatMuse URL for season averages
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
        
        return filtered_stats
    else:
        return {}

def get_player_statistics(player_map):
    player_stats = []

    for player_info in player_map:
        player_name = player_info['player']
        opposing_team = player_info['opposing_team']
        defense_stats = player_info['defense_stats']
        
        # Get the stats for the player vs the opposing team (historical)
        stats, games_played = get_statmuse_player_vs_team(player_name, opposing_team, player_info['defense_stats'].keys())
        
        # Get the player's season averages
        season_averages = get_statmuse_season_averages(player_name)
        
        player_stats.append({
            'player': player_name,
            'opposing_team': opposing_team,
            'defense_stats': defense_stats,
            'stats': stats,  # Historical stats vs the team
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
    # Get team rankings based on today's lineups
    ranks = get_positional_ranks(df_dvp, lineups, categories)

    filtered_ranks = filter_top_bottom_ranks(ranks)
    
    print("Mapping player to opposing defence")
    player_defense_map = map_players_to_defense_rankings(lineups, filtered_ranks)
    # print("player_df")
    # print(player_defense_map)
    
    print("Fetching statmuse")
    player_history = get_player_statistics(player_defense_map)
    # print(player_history)

    print("Getting injury report")
    injury_report = get_injury_report()
    
    # Initialize lists for good and bad defense tables
    good_defense_table = []
    bad_defense_table = []

    for player_data in player_history:
        player = player_data['player']
        opposing_team = player_data['opposing_team']
        season_averages = player_data['season_averages']
        games_played = player_data['games_played']

        if not opposing_team or not season_averages: continue

        good_stats_row = {'player': player, 'opposing_team': opposing_team, 'games_played': games_played}
        bad_stats_row = {'player': player, 'opposing_team': opposing_team, 'games_played': games_played}

        # Check if the player is on the injury report
        injury_info = injury_report[injury_report['player'] == player]
        if not injury_info.empty:
            injury_note = injury_info.iloc[0]['status_comment']  # Update to use the status_comment column
            good_stats_row['injury_note'] = injury_note
            bad_stats_row['injury_note'] = injury_note
        else:
            good_stats_row['injury_note'] = ''
            bad_stats_row['injury_note'] = ''

        # Process final stat values and defense rankings
        for category in categories:
            if category in player_data['stats'] and player_data['stats'][category]:
                avg = player_data['stats'][category][-1]
            else:
                avg = ''

            if category in season_averages:
                season_avg = season_averages[category]
            else:
                season_avg = ''

            # Calculate difference between season average and historical average
            if avg and season_avg:
                difference = round(float(avg) - float(season_avg))
            else:
                difference = ''

            # Add stats to the row based on defense rank
            if category in player_data['defense_stats']:
                defense_rank = player_data['defense_stats'][category]
                
                # Categorize based on defense ranking
                if defense_rank <= 5:  # Good defense (opponent is strong)
                    good_stats_row[category] = difference
                elif defense_rank >= 25:  # Bad defense (opponent is weak)
                    bad_stats_row[category] = difference
            else:
                good_stats_row[category] = bad_stats_row[category] = ''

        # Append to the corresponding table
        good_defense_table.append(good_stats_row)
        bad_defense_table.append(bad_stats_row)

    df_good_defense = pd.DataFrame(good_defense_table)
    df_bad_defense = pd.DataFrame(bad_defense_table)

    df_good_defense['defense_type'] = 'Good Defense'
    df_bad_defense['defense_type'] = 'Bad Defense'

    combined_df = pd.concat([df_good_defense, df_bad_defense], ignore_index=True)

    public_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'public', 'nba_slate.csv')
    combined_df.to_csv(public_folder_path, index=False)

if __name__ == '__main__':
    create_player_rankings()