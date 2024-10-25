import React, { useState, useEffect } from 'react';
import {
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Paper,
    Typography,
    Tooltip,
    Collapse,
} from '@mui/material';

const PlayerTable = () => {
    const [data, setData] = useState([]);
    const [sortDirection, setSortDirection] = useState('asc');
    const [sortColumn, setSortColumn] = useState('PTS');
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [gameLogs, setGameLogs] = useState({});

    useEffect(() => {
        fetch('http://localhost:5000/api/players')
            .then(response => response.json())
            .then(playersData => {
                setData(playersData.map(row => ({
                    player: row.player,
                    opposing_team: row.opposing_team,
                    games_played: row.games_played || 0,
                    injury_note: row.injury_note || '',
                    PTS: row.PTS || 0,
                    PTS_rank: row.PTS_rank || 0,
                    REB: row.REB || 0,
                    REB_rank: row.REB_rank || 0,
                    AST: row.AST || 0,
                    AST_rank: row.AST_rank || 0,
                    '3PM': row['3PM'] || 0,
                    '3PM_rank': row['3PM_rank'] || 0,
                    STL: row.STL || 0,
                    STL_rank: row.STL_rank || 0,
                    BLK: row.BLK || 0,
                    BLK_rank: row.BLK_rank || 0,
                })));
            });
    }, []);

    const handleSort = (column) => {
        const isAscending = sortColumn === column && sortDirection === 'asc';
        setSortDirection(isAscending ? 'desc' : 'asc');
        setSortColumn(column);
    };

    const getColor = (value) => {
        const maxPositive = 10;
        const maxNegative = -10;

        if (value > 0) {
            const opacity = (value / maxPositive);
            return `rgba(0, 225, 0, ${opacity})`;
        } else if (value < 0) {
            const opacity = (value / maxNegative);
            return `rgba(225, 0, 0, ${opacity})`;
        }

        return 'rgba(255, 255, 255, 0)'; // Fully transparent for zero
    };

    const handleRowClick = (player) => {
        if (expandedPlayer === player) {
            setExpandedPlayer(null);
        } else {
            setExpandedPlayer(player);
    
            if (!gameLogs[player]) {
                fetch(`http://localhost:5000/api/players/${player.replace(/\s+/g, '_')}/statlines`)
                    .then(response => response.json())
                    .then(logs => {
                        setGameLogs((prev) => ({ ...prev, [player]: logs.reverse() }));
                    });
            }
        }
    };    

    const sortedData = data.sort((a, b) => {
        if (sortDirection === 'asc') {
            return a[sortColumn] - b[sortColumn];
        }
        return b[sortColumn] - a[sortColumn];
    });

    return (
        <Container maxWidth="xl">
            <h1>NBA Daily Player Matchups</h1>

            <Typography variant="body1" paragraph>
                This table presents the performance statistics of NBA players against their upcoming opponents based on their previous matchups of 2 years. Each statistic represents the average performance of a player in various categories—such as points, rebounds, assists, and more—when facing that particular team.
            </Typography>

            <Typography variant="body1" paragraph>
                Note: For defensive rankings (1-30), 1 means that the opposing defence is the best in the league in that category, and 30 means they are worst. Data is taken from the last 30 days.
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 600, overflowX: 'auto', borderRadius: 1 }}>
                <Table>
                    <TableHead sx={{ backgroundColor: '#e0f3ff', position: 'sticky', top: 0, zIndex: 1000 }}>
                        <TableRow>
                            {[
                                { label: 'Player', column: 'player', sortable: false },
                                { label: 'Opposing Team', column: 'opposing_team', sortable: false },
                                { label: 'Games Played', column: 'games_played', sortable: false },
                                { label: 'Injury Note', column: 'injury_note', sortable: false },
                                { label: 'PTS', column: 'PTS', sortable: true },
                                { label: 'Def vs PTS', column: 'PTS_rank', sortable: true },
                                { label: 'REB', column: 'REB', sortable: true },
                                { label: 'Def vs REB', column: 'REB_rank', sortable: true },
                                { label: 'AST', column: 'AST', sortable: true },
                                { label: 'Def vs AST', column: 'AST_rank', sortable: true },
                                { label: '3PM', column: '3PM', sortable: true },
                                { label: 'Def vs 3PM', column: '3PM_rank', sortable: true },
                                { label: 'STL', column: 'STL', sortable: true },
                                { label: 'Def vs STL', column: 'STL_rank', sortable: true },
                                { label: 'BLK', column: 'BLK', sortable: true },
                                { label: 'Def vs BLK', column: 'BLK_rank', sortable: true },
                            ].map(({ label, column, sortable }, index) => (
                                <TableCell
                                    key={index}
                                    align="left"
                                    sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}
                                >
                                    {sortable ? (
                                        <TableSortLabel
                                            active={sortColumn === column}
                                            direction={sortColumn === column ? sortDirection : 'asc'}
                                            onClick={() => handleSort(column)}
                                        >
                                            <Typography variant="body2" fontWeight="bold">
                                                {label}
                                            </Typography>
                                        </TableSortLabel>
                                    ) : (
                                        <Typography variant="body2" fontWeight="bold">
                                            {label}
                                        </Typography>
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row) => (
                            <React.Fragment key={row.player}>
                                <TableRow
                                    hover
                                    onClick={() => handleRowClick(row.player)}
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease-in-out',
                                        backgroundColor: expandedPlayer === row.player ? '#f0ffff' : 'white',
                                        boxShadow: expandedPlayer === row.player ? '0px 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                                        borderRadius: '8px',
                                        '&:hover': {
                                            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                                            backgroundColor: '#f1f1f1',
                                        },
                                    }}
                                >
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.player}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.opposing_team}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.games_played}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                                        <Tooltip title={row.injury_note || 'No injury note'}>
                                            <Typography variant="body2" style={{ cursor: 'pointer', color: row.injury_note ? 'red' : 'inherit' }}>
                                                {row.injury_note ? 'Inj' : '-'}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row.PTS), borderRight: '1px solid #e0e0e0' }}>{row.PTS}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.PTS_rank}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row.REB), borderRight: '1px solid #e0e0e0' }}>{row.REB}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.REB_rank}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row.AST), borderRight: '1px solid #e0e0e0' }}>{row.AST}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.PTS_rank}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row['3PM']), borderRight: '1px solid #e0e0e0' }}>{row['3PM']}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.REB_rank}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row.STL), borderRight: '1px solid #e0e0e0' }}>{row.STL}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.PTS_rank}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', backgroundColor: getColor(row.BLK), borderRight: '1px solid #e0e0e0' }}>{row.BLK}</TableCell>
                                    <TableCell align="left" sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>{row.REB_rank}</TableCell>
                                </TableRow>

                                {expandedPlayer === row.player && (
                                <TableRow>
                                        <TableCell colSpan={17}>
                                            <Collapse in={expandedPlayer === row.player}>
                                                <Typography variant="h6">
                                                    Game Logs for {row.player}:
                                                </Typography>
                                                {gameLogs[row.player] ? (
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Date</TableCell>
                                                                <TableCell>Points</TableCell>
                                                                <TableCell>Rebounds</TableCell>
                                                                <TableCell>Assists</TableCell>
                                                                <TableCell>3PM</TableCell>
                                                                <TableCell>Steals</TableCell>
                                                                <TableCell>Blocks</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {gameLogs[row.player].map((log, i) => (
                                                                <TableRow key={i}>
                                                            <TableCell>{log[0]}</TableCell>
                                                                    <TableCell>{log[1]}</TableCell>
                                                                    <TableCell>{log[2]}</TableCell>
                                                                    <TableCell>{log[3]}</TableCell>
                                                                    <TableCell>{log[4]}</TableCell>
                                                                    <TableCell>{log[5]}</TableCell>
                                                                    <TableCell>{log[6]}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <Typography>Loading game logs...</Typography>
                                                )}
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default PlayerTable;
