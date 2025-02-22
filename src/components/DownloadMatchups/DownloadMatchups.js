import { Box, Button } from '@mui/material';

const DownloadMatchups = () => {
  const handleDownload = async () => {
    try {
      const response = await fetch("/api/getMatchups");
      const matchups = await response.json();

      if (!Array.isArray(matchups) || matchups.length === 0) {
        alert("No matchups available for today.");
        return;
      }

      // Format the text file content
      const today = new Date().toISOString().split("T")[0];
      let textContent = `Slate ${today}\n\n`; // Starting slate title
      textContent += matchups
        .map(m => `${m.away_team} @ ${m.home_team} ${m.time}`) // Add time to the matchups
        .join("\n\n"); // Add a blank line between each matchup

      // Create and trigger the download
      const blob = new Blob([textContent], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `NBA_Matchups_${today}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error fetching matchups:", error);
      alert("Failed to fetch matchups.");
    }
  };
  
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ 
              fontWeight: 'bold', 
              backgroundColor: '#3f51b5',
              '&:hover': {
                backgroundColor: '#303f9f'
              }
            }}
            onClick={handleDownload}
          >
            Download Slate
          </Button>
        </Box>
      );
  };
  
  export default DownloadMatchups;