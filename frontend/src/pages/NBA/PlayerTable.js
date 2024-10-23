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
} from '@mui/material';

const PlayerTable = () => {
    const [data, setData] = useState([]);
    const [sortDirection, setSortDirection] = useState('asc');
    const [sortColumn, setSortColumn] = useState('PTS');

    useEffect(() => {
        fetch('/nba_slate.csv')
            .then(response => response.text())
            .then(text => {
                const rows = text.split('\n').slice(1);
                const parsedData = rows.map(row => {
                    const columns = row.split(',');
                    return {
                        player: columns[0],
                        opposing_team: columns[1],
                        games_played: parseInt(columns[2]) || 0,
                        injury_note: columns[3] || '',
                        PTS: parseFloat(columns[4]) || 0,
                        PTS_rank: parseInt(columns[5]) || 0,
                        REB: parseFloat(columns[6]) || 0,
                        REB_rank: parseInt(columns[7]) || 0,
                        AST: parseFloat(columns[8]) || 0,
                        AST_rank: parseInt(columns[9]) || 0,
                        '3PM': parseFloat(columns[10]) || 0,
                        '3PM_rank': parseInt(columns[11]) || 0,
                        STL: parseFloat(columns[12]) || 0,
                        STL_rank: parseInt(columns[13]) || 0,
                        BLK: parseFloat(columns[14]) || 0,
                        BLK_rank: parseInt(columns[15]) || 0,
                    };
                });
                setData(parsedData);
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

    // Sort the data
    const sortedData = data.sort((a, b) => {
        if (sortDirection === 'asc') {
            return a[sortColumn] - b[sortColumn];
        }
        return b[sortColumn] - a[sortColumn];
    });

    return (
        <Container>
            <h1>NBA Player Stats</h1>

            <Typography variant="body1" paragraph>
                This table presents the performance statistics of NBA players against their upcoming opponents based on their previous matchups. Each statistic represents the average performance of a player in various categories—such as points, rebounds, assists, and more—when facing that particular team. For example, the "PTS" column reflects the number of points that a player has averaged against the opposing team historically compared to their season average.
            </Typography>

            <Typography variant="body1" paragraph>
                Note: For defensive rankings (1-30), 1 means that the opposing defence is the best in the league in that category, and 30 means they are worst.
            </Typography>

            <TableContainer component={Paper}>
                <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead sx={{ backgroundColor: '#f0ffff' }}>
                        <TableRow>
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
                                <Typography variant="body2" fontWeight="bold">Injury Note</Typography>
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
                            <TableCell align="center" style={{ minWidth: 100 }}>
                                <Typography variant="body2" fontWeight="bold">Defence Rank (BLK)</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.player}</TableCell>
                                <TableCell>{row.opposing_team}</TableCell>
                                <TableCell>{row.games_played}</TableCell>
                                <TableCell>{row.injury_note}</TableCell>
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
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default PlayerTable;
