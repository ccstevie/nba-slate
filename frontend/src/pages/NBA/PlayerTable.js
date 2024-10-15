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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';

const PlayerTable = () => {
    const [data, setData] = useState([]);
    const [sortDirection, setSortDirection] = useState('asc');
    const [sortColumn, setSortColumn] = useState('PTS');
    const [defenseFilter, setDefenseFilter] = useState('all');

    useEffect(() => {
        // Fetch CSV data
        fetch('/nba_slate.csv')
            .then(response => response.text())
            .then(text => {
                const rows = text.split('\n').slice(1);
                const parsedData = rows.map(row => {
                    const columns = row.split(',');
                    return {
                        player: columns[0],
                        opposing_team: columns[1],
                        injury_note: columns[2],
                        AST: parseFloat(columns[3]) || 0,
                        '3PM': parseFloat(columns[4]) || 0,
                        STL: parseFloat(columns[5]) || 0,
                        PTS: parseFloat(columns[6]) || 0,
                        REB: parseFloat(columns[7]) || 0,
                        BLK: parseFloat(columns[8]) || 0,
                        defense_type: columns[9]?.trim().toLowerCase() === 'bad defense' ? 'bad defense' : 'good defense', // Adjusted here
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
        const maxPositive = 5;
        const maxNegative = -5;

        if (value > 0) {
            const opacity = (value / maxPositive);
            return `rgba(0, 225, 0, ${opacity})`;
        } else if (value < 0) {
            const opacity = (value / maxNegative);
            return `rgba(225, 0, 0, ${opacity})`;
        }

        return 'rgba(255, 255, 255, 0)'; // Fully transparent for zero
    };

    // Filter data based on the selected defense type
    const filteredData = data.filter(row => {
        if (defenseFilter === 'bad' && row.defense_type === 'bad defense') return true;
        if (defenseFilter === 'good' && row.defense_type === 'good defense') return true;
        if (defenseFilter === 'all') return true;
        return false;
    });

    // Sort the filtered data
    const sortedData = filteredData.sort((a, b) => {
        if (sortDirection === 'asc') {
            return a[sortColumn] - b[sortColumn];
        }
        return b[sortColumn] - a[sortColumn];
    });

    return (
        <Container>
            <h1>NBA Player Stats</h1>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Player</TableCell>
                            <TableCell>Opposing Team</TableCell>
                            <TableCell>Injury Note</TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'PTS'}
                                    direction={sortColumn === 'PTS' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('PTS')}
                                >
                                    PTS
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'REB'}
                                    direction={sortColumn === 'REB' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('REB')}
                                >
                                    REB
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'AST'}
                                    direction={sortColumn === 'AST' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('AST')}
                                >
                                    AST
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === '3PM'}
                                    direction={sortColumn === '3PM' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('3PM')}
                                >
                                    3PM
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'STL'}
                                    direction={sortColumn === 'STL' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('STL')}
                                >
                                    STL
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'BLK'}
                                    direction={sortColumn === 'BLK' ? sortDirection : 'asc'}
                                    onClick={() => handleSort('BLK')}
                                >
                                    BLK
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <FormControl variant="outlined" style={{ minWidth: '120px' }}>
                                    <InputLabel>Defense Type</InputLabel>
                                    <Select
                                        value={defenseFilter}
                                        onChange={(e) => setDefenseFilter(e.target.value)}
                                        displayEmpty
                                    >
                                        <MenuItem value="all">All</MenuItem>
                                        <MenuItem value="bad">Bad Defense</MenuItem>
                                        <MenuItem value="good">Good Defense</MenuItem>
                                    </Select>
                                </FormControl>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.player}</TableCell>
                                <TableCell>{row.opposing_team}</TableCell>
                                <TableCell>{row.injury_note}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row.PTS) }}>{row.PTS}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row.REB) }}>{row.REB}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row.AST) }}>{row.AST}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row['3PM']) }}>{row['3PM']}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row.STL) }}>{row.STL}</TableCell>
                                <TableCell style={{ backgroundColor: getColor(row.BLK) }}>{row.BLK}</TableCell>
                                <TableCell>{row.defense_type}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default PlayerTable;
