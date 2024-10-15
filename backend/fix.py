import pandas as pd

# Step 1: Load the Excel file
file_path = 'SFBB-Player-ID-Map.xlsx'  # Replace with your actual file path
df = pd.read_excel(file_path)

# Step 2: Filter the relevant columns (assuming the columns are named 'PlayerName' and 'MLBID')
df_filtered = df[['FIRSTNAME', 'LASTNAME', 'MLBID', 'ESPNID']]  # Replace with actual column names if different

df_filtered['MLBID'] = df_filtered['MLBID'].astype('Int64')
df_filtered['ESPNID'] = df_filtered['ESPNID'].astype('Int64')

# Step 3: Save the filtered DataFrame to a CSV file
output_path = 'player_to_id.csv'  # Change to your desired output path
df_filtered.to_csv(output_path, index=False)

print(f"Filtered CSV saved to {output_path}")