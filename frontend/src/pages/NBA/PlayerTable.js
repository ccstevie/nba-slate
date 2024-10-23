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
    IconButton,
} from '@mui/material';
import Papa from 'papaparse';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

const PlayerTable = () => {
    const [data, setData] = useState([]);
    const [sortDirection, setSortDirection] = useState('asc');
    const [sortColumn, setSortColumn] = useState('PTS');
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [gameLogs, setGameLogs] = useState({});

    useEffect(() => {
        fetch('/nba_slate.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (result) => {
                        const parsedData = result.data.map(row => ({
                            player: row.player,
                            opposing_team: row.opposing_team,
                            games_played: parseInt(row.games_played) || 0,
                            injury_note: row.injury_note || '',
                            PTS: parseFloat(row.PTS) || 0,
                            PTS_rank: parseInt(row.PTS_rank) || 0,
                            REB: parseFloat(row.REB) || 0,
                            REB_rank: parseInt(row.REB_rank) || 0,
                            AST: parseFloat(row.AST) || 0,
                            AST_rank: parseInt(row.AST_rank) || 0,
                            '3PM': parseFloat(row['3PM']) || 0,
                            '3PM_rank': parseInt(row['3PM_rank']) || 0,
                            STL: parseFloat(row.STL) || 0,
                            STL_rank: parseInt(row.STL_rank) || 0,
                            BLK: parseFloat(row.BLK) || 0,
                            BLK_rank: parseInt(row.BLK_rank) || 0,
                        }));
                        setData(parsedData);
                    },
                });
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
                fetch(`/${player.replace(/\s+/g, '_')}_statlines.json`)
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
        <Container>
            <h1>NBA Daily Player Matchups</h1>

            <Typography variant="body1" paragraph>
                This table presents the performance statistics of NBA players against their upcoming opponents based on their previous matchups. Each statistic represents the average performance of a player in various categories—such as points, rebounds, assists, and more—when facing that particular team.
            </Typography>

            <Typography variant="body1" paragraph>
                Note: For defensive rankings (1-30), 1 means that the opposing defence is the best in the league in that category, and 30 means they are worst.
            </Typography>

            <TableContainer component={Paper}>
                <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead sx={{ backgroundColor: '#f0ffff' }}>
                        <TableRow>
                            <TableCell align="center" style={{ minWidth: 50 }}>Show Games</TableCell>
                            <TableCell align="center" style={{ minWidth: 120 }}>
                                <Typography variant="body2" fontWeight="bold">Player</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 150 }}>
                                <Typography variant="body2" fontWeight="bold">Opposing Team</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Total games played vs opposing team">
                                    <TableSortLabel
                                        active={sortColumn === 'games_played'}
                                        direction={sortColumn === 'games_played' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('games_played')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">Games Played</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Player's current injury status">
                                    <Typography variant="body2" fontWeight="bold">Injury Note</Typography>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Points per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === 'PTS'}
                                        direction={sortColumn === 'PTS' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('PTS')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">PTS</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (PTS)</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Rebounds per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === 'REB'}
                                        direction={sortColumn === 'REB' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('REB')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">REB</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (REB)</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Assists per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === 'AST'}
                                        direction={sortColumn === 'AST' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('AST')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">AST</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (AST)</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Three-pointers made per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === '3PM'}
                                        direction={sortColumn === '3PM' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('3PM')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">3PM</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (3PM)</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Steals per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === 'STL'}
                                        direction={sortColumn === 'STL' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('STL')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">STL</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (STL)</Typography>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Tooltip title="Blocks per game above season average">
                                    <TableSortLabel
                                        active={sortColumn === 'BLK'}
                                        direction={sortColumn === 'BLK' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('BLK')}
                                    >
                                        <Typography variant="body2" fontWeight="bold">BLK</Typography>
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 100, pr: 2 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (BLK)</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row, index) => (
                            <React.Fragment key={index}>
                                <TableRow hover onClick={() => handleRowClick(row.player)}>
                                    <TableCell align="center">
                                        <IconButton size="small">
                                            {expandedPlayer === row.player ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{row.player}</TableCell>
                                <TableCell>{row.opposing_team}</TableCell>
                                <TableCell>{row.games_played}</TableCell>
                                <TableCell align="center" style={{ minWidth: 100 }}>
                                    <Tooltip title={row.injury_note || 'No injury note'}>
                                        <Typography variant="body2" style={{ cursor: 'pointer', color: row.injury_note ? 'red' : 'inherit' }}>
                                            {row.injury_note ? 'Inj' : '-'}
                                        </Typography>
                                    </Tooltip>
                                </TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row.PTS) }}>{row.PTS}</TableCell>
                                    <TableCell>{row.PTS_rank}</TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row.REB) }}>{row.REB}</TableCell>
                                    <TableCell>{row.REB_rank}</TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row.AST) }}>{row.AST}</TableCell>
                                    <TableCell>{row.AST_rank}</TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row['3PM']) }}>{row['3PM']}</TableCell>
                                    <TableCell>{row['3PM_rank']}</TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row.STL) }}>{row.STL}</TableCell>
                                    <TableCell>{row.STL_rank}</TableCell>
                                    <TableCell style={{ backgroundColor: getColor(row.BLK) }}>{row.BLK}</TableCell>
                                    <TableCell>{row.BLK_rank}</TableCell>
                                </TableRow>
                                {expandedPlayer === row.player && (
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            <Collapse in={expandedPlayer === row.player}>
                                                <Typography variant="body1">
                                                    <strong>Game Logs:</strong>
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
                                                    <Typography variant="body2">Loading...</Typography>
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
