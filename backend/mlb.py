#pip install pandas bs4 tqdm math matplotlib
import pandas as pd
import requests
from bs4 import BeautifulSoup
import concurrent.futures
from tqdm import tqdm
import math
import matplotlib.pyplot as plt
import os
# Step 1: Scrape the data from the website
url = "https://www.rotowire.com/baseball/daily-lineups.php"
soup = BeautifulSoup(requests.get(url).content, "html.parser")

data_pitiching = []
data_batter = []
team_type = ''

for e in soup.select('.lineup__box ul li'):
    if team_type != e.parent.get('class')[-1]:
        order_count = 1
        team_type = e.parent.get('class')[-1]

    if e.get('class') and 'lineup__player-highlight' in e.get('class'):
        data_pitiching.append({
            'date': e.find_previous('main').get('data-gamedate'),
            'game_time': e.find_previous('div', attrs={'class': 'lineup__time'}).get_text(strip=True),
            'pitcher_name': e.a.get_text(strip=True),
            'team': e.find_previous('div', attrs={'class': team_type}).next.strip(),
            'lineup_throws': e.span.get_text(strip=True)
        })
    elif e.get('class') and 'lineup__player' in e.get('class'):
        data_batter.append({
            'date': e.find_previous('main').get('data-gamedate'),
            'game_time': e.find_previous('div', attrs={'class': 'lineup__time'}).get_text(strip=True),
            'pitcher_name': e.a.get_text(strip=True),
            'team': e.find_previous('div', attrs={'class': team_type}).next.strip(),
            'pos': e.div.get_text(strip=True),
            'batting_order': order_count,
            'lineup_bats': e.span.get_text(strip=True)
        })
        order_count += 1

df_pitching = pd.DataFrame(data_pitiching)
df_batter = pd.DataFrame(data_batter)

# Initialize lists to collect matchup data
matchups = []

# Index to keep track of which team (index) we are processing
pitcher_index = 0  # This will ensure we are accessing pitchers correctly

# Iterate through each team's batters, pairing them with the correct pitcher
while pitcher_index < len(df_pitching):
    current_pitcher = df_pitching.iloc[pitcher_index]
    current_pitcher_team = current_pitcher['team']
    opponent_pitcher = df_pitching.iloc[pitcher_index + 1]
    opponent_pitcher_team = opponent_pitcher['team']
    
    team_batters = df_batter[df_batter['team'] == current_pitcher_team]
    opponent_batters = df_batter[df_batter['team'] == opponent_pitcher_team]

    for _, batter in team_batters.iterrows():
        matchups.append({
            'date': batter['date'],
            'game_time': batter['game_time'],
            'pitcher_name': opponent_pitcher['pitcher_name'],
            'pitcher_team': opponent_pitcher['team'],
            'pitcher_throws': opponent_pitcher['lineup_throws'],
            'batter_name': batter['pitcher_name'],
            'batter_team': batter['team'],
            'batter_position': batter['pos'],
            'batting_order': batter['batting_order'],
            'batter_bats': batter['lineup_bats']
        })

    for _, batter in opponent_batters.iterrows():
        matchups.append({
            'date': batter['date'],
            'game_time': batter['game_time'],
            'pitcher_name': current_pitcher['pitcher_name'],
            'pitcher_team': current_pitcher['team'],
            'pitcher_throws': current_pitcher['lineup_throws'],
            'batter_name': batter['pitcher_name'],
            'batter_team': batter['team'],
            'batter_position': batter['pos'],
            'batting_order': batter['batting_order'],
            'batter_bats': batter['lineup_bats']
        })

    pitcher_index += 2

# Convert the matchups list to a DataFrame
df_final = pd.DataFrame(matchups)

# Save the DataFrame to a CSV file
df_final.to_csv('pitcher_batter_matchups.csv', index=False)

# Function to format the StatMuse URL
def format_statmuse_url(batter, pitcher):
    batter_formatted = "-".join(batter.lower().split())
    pitcher_formatted = "-".join(pitcher.lower().split())
    return f"https://www.statmuse.com/mlb/ask/{batter_formatted}-career-stats-vs-{pitcher_formatted}-including-playoffs"

# Function to scrape stats from the page and clean up the dictionary
def scrape_player_stats(row):
    url = format_statmuse_url(row['batter_name'], row['pitcher_name'])
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    stats = {}
    table = soup.find('table')
    if table:
        headers = [th.get_text().strip() for th in table.find_all('th')]
        values = [td.get_text().strip() for td in table.find_all('td')]
        stats = dict(zip(headers, values))
    for stat in ['PA', 'AB', 'H', 'HR', 'SO', 'AVG', 'OBP', 'SLG', 'OPS']:
        try:
            row[stat] = float(stats.get(stat, 0))
        except:
            continue
    return row

# Parallelize the StatMuse data retrieval with tqdm
# with concurrent.futures.ThreadPoolExecutor() as executor:
#     df_final = list(tqdm(executor.map(scrape_player_stats, [row for _, row in df_final.iterrows()]), total=len(df_final), desc="Retrieving StatMuse Data"))
#     df_final = pd.DataFrame(df_final)

'''
ESPN
'''

# Step 1: Load the player information CSV to get ESPN IDs
player_info = pd.read_csv("player_info.csv")

# Helper function to get ESPN ID from player name
def get_espn_id(first_name, last_name):
    player_row = player_info[(player_info['FIRSTNAME'].str.lower() == first_name.lower()) & 
                             (player_info['LASTNAME'].str.lower() == last_name.lower())]
    if not player_row.empty:
        return player_row.iloc[0]['ESPNID']
    return None

# Function to scrape pitcher or batter splits from ESPN
def scrape_espn_splits(espn_id):
    url = f"https://www.espn.com/mlb/player/splits/_/id/{espn_id}"
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    tables = soup.find_all('table')
    print(tables)
    # # Locate both tables
    # left_table = soup.find('table', class_='Table Table--align-right Table--fixed Table--fixed-left')
    # right_table = soup.find('table', class_='Table Table--align-right')

    # # Extract row labels from the left table
    # row_labels = [row.get_text(strip=True) for row in left_table.find('tbody').find_all('tr')]

    # # Extract corresponding data from the right table
    # right_table_data = []
    # for row in right_table.find('tbody').find_all('tr'):
    #     cols = [col.get_text(strip=True) for col in row.find_all('td')]
    #     right_table_data.append(cols)

    # # Combine row labels and right table data into a DataFrame
    # data = pd.DataFrame(right_table_data, index=row_labels, columns=[
    #     'AB', 'AVG', 'OBP', 'SLG', 'OPS'
    # ])

    # return data

# Test
splits = scrape_espn_splits(39832)
print(splits)

# Step 2: Scrape pitcher splits and add to df_final
def add_pitcher_splits_to_df(df):
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Scraping pitcher splits"):
        first_name, last_name = row['pitcher_name'].split()[:2]
        espn_id = get_espn_id(first_name, last_name)
        
        if espn_id:
            splits = scrape_espn_splits(espn_id)
            # Add relevant splits to the dataframe row (e.g., Home vs Away, Day vs Night, etc.)
            for split_category, split_data in splits.items():
                for stat, value in split_data.items():
                    df.at[idx, f'{split_category}_{stat}'] = value
    return df

# Step 3: Scrape batter splits and add to df_final
def add_batter_splits_to_df(df):
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Scraping batter splits"):
        first_name, last_name = row['batter_name'].split()[:2]
        espn_id = get_espn_id(first_name, last_name)
        
        if espn_id:
            splits = scrape_espn_splits(espn_id)
            # Add relevant splits to the dataframe row (e.g., Home vs Away, Day vs Night, etc.)
            for split_category, split_data in splits.items():
                for stat, value in split_data.items():
                    df.at[idx, f'{split_category}_{stat}'] = value
    return df

# Step 4: Apply the functions to add splits data
# df_final = add_pitcher_splits_to_df(df_final)
# df_final = add_batter_splits_to_df(df_final)

# Save the updated DataFrame with retrieved stats
# df_final.to_csv('today_matchups.csv', index=False)

'''
Graphing
'''

# # Define the logarithmic increase function
# def logarithmic_increase(x, max_value=20):
#     if x < max_value:
#         return math.log(x + 1, 5) * max_value / math.log(max_value + 1, 5)
#     else:
#         return max_value

# # Subset the DataFrame to include only relevant columns
# df_subset = df_final[['pitcher_name', 'batter_name', 'PA', 'OPS']]

# # Calculate the color factor
# df_subset['color_value'] = df_subset.apply(lambda row: 2 * logarithmic_increase(row['PA']) * (row['OPS'] - 0.75), axis=1)

# # Define determine_color function
# def determine_color(value):
#     if value > 0:
#         norm_value = value / 100
#         red_intensity = min(1, norm_value)
#         return (1, 1 - red_intensity, 1 - red_intensity)
#     else:
#         norm_value = abs(value) / 100
#         blue_intensity = min(1, norm_value)
#         return (1 - blue_intensity, 1 - blue_intensity, 1)

# # Apply color to the rows
# df_subset['color'] = df_subset['color_value'].apply(determine_color)

# # Sort and plot the top 50 favorable and unfavorable matchups
# top_50_favorable = df_subset[df_subset['color_value'] > 0].sort_values('color_value', ascending=False).head(50)
# top_50_unfavorable = df_subset[df_subset['color_value'] < 0].sort_values('color_value', ascending=True).head(50)

# def plot_colored_df(df, title, filename):
#     fig, ax = plt.subplots(figsize=(10, len(df) / 2))
#     ax.axis('tight')
#     ax.axis('off')

#     table = ax.table(cellText=df[['pitcher_name', 'batter_name', 'PA', 'OPS']].values,
#                      colLabels=df.columns[:-2],
#                      cellColours=[[determine_color(val)] * 4 for val in df['color_value']],
#                      loc='center')

#     table.scale(1, 1.5)
#     table.auto_set_font_size(False)
#     table.set_fontsize(10)
#     ax.set_title(title, fontsize=14)

#     plt.savefig(filename, bbox_inches='tight', dpi=300)
#     plt.close()

# plot_colored_df(top_50_favorable, 'Top 50 Most Favorable (Red)', 'top_50_favorable_plot.png')
# plot_colored_df(top_50_unfavorable, 'Top 50 Least Favorable (Blue)', 'top_50_unfavorable_plot.png')
# # Ensure the color rules are applied to the full df_final DataFrame
# # Define determine_color function
# def determine_color(value):
#     if value > 0:
#         norm_value = value / 100
#         red_intensity = min(1, norm_value)
#         return (1, 1 - red_intensity, 1 - red_intensity)
#     else:
#         norm_value = abs(value) / 100
#         blue_intensity = min(1, norm_value)
#         return (1 - blue_intensity, 1 - blue_intensity, 1)

# # Ensure the color rules are applied to the full df_final DataFrame
# df_final['color_value'] = df_final.apply(lambda row: 2 * logarithmic_increase(row['PA']) * (row['OPS'] - 0.75), axis=1)
# df_final['color'] = df_final['color_value'].apply(determine_color)

# # Create a new folder named "today" if it doesn't exist
# output_folder = 'today'
# if not os.path.exists(output_folder):
#     os.makedirs(output_folder)

# # Get the list of unique games (pairings of teams)
# unique_games = df_final.groupby(['pitcher_team', 'batter_team']).size().reset_index().drop(0, axis=1)
# game_pairs = [(unique_games.iloc[i, 0], unique_games.iloc[i, 1]) for i in range(0, len(unique_games), 2)]

# # Plot each game as a pair of subplots
# for team1, team2 in game_pairs:
#     fig, axes = plt.subplots(nrows=1, ncols=2, figsize=(20, 10), constrained_layout=True)
    
#     # Plot the first team's batting order
#     team1_data = df_final[df_final['batter_team'] == team1].sort_values(by='batting_order')
#     colors1 = team1_data['color'].tolist()
#     axes[0].barh(team1_data['batter_name'], team1_data['PA'], color=colors1)
#     axes[0].set_title(f'{team1} Batting Order', fontsize=14)
#     axes[0].set_xlabel('Plate Appearances')
#     axes[0].set_ylabel('Batter')
#     axes[0].invert_yaxis()  # Invert y-axis to match the batting order (top to bottom)
    
#     # Plot the second team's batting order
#     team2_data = df_final[df_final['batter_team'] == team2].sort_values(by= 'batting_order')
#     colors2 = team2_data['color'].tolist()
#     axes[1].barh(team2_data['batter_name'], team2_data['PA'], color=colors2)
#     axes[1].set_title(f'{team2} Batting Order', fontsize=14)
#     axes[1].set_xlabel('Plate Appearances')
#     axes[1].invert_yaxis()  # Invert y-axis to match the batting order (top to bottom)
    
#     # Save the plot with the team names as the filename
#     filename = f'{output_folder}/{team1}_vs_{team2}_lineup.png'
#     plt.savefig(filename, bbox_inches='tight', dpi=300)
#     plt.close()

# print(f"Plots saved in the {output_folder} folder.")