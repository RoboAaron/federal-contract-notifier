import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:38888/api';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  agency: string;
  budget: number | null;
  sourceUrl: string;
  sourceType: string;
  postedDate: string;
  dueDate: string | null;
  status: string;
  naicsCodes: string[];
  setAside: string | null;
  pointOfContact: any;
  technologyCategories: TechnologyCategory[];
}

interface TechnologyCategory {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
}

interface Stats {
  opportunities: number;
  salesReps: number;
  technologyCategories: number;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadStats();
    loadOpportunities();
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOpportunities();
  }, [page, rowsPerPage, search]);

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadOpportunities = async () => {
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        search: search,
      });

      const response = await axios.get(`${API_BASE_URL}/opportunities?${params}`);
      setOpportunities(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setError('Failed to load opportunities');
    }
  };

  const handleOpportunityView = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <BusinessIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Federal Contract Notifier
          </Typography>
          <IconButton color="inherit" onClick={loadOpportunities}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {stats && (
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h4">{stats.opportunities}</Typography>
                </Box>
                <Typography color="textSecondary">Opportunities</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <CardContent>
                <Typography variant="h4">{stats.salesReps}</Typography>
                <Typography color="textSecondary">Sales Representatives</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <CardContent>
                <Typography variant="h4">{stats.technologyCategories}</Typography>
                <Typography color="textSecondary">Technology Categories</Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                sx={{ flex: '1 1 400px', minWidth: 0 }}
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                onClick={() => setSearch('')}
              >
                Clear Search
              </Button>
            </Box>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Agency</TableCell>
                <TableCell>Budget</TableCell>
                <TableCell>Posted Date</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Technologies</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell>
                    <Typography variant="subtitle2" noWrap>
                      {opportunity.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{opportunity.agency}</TableCell>
                  <TableCell>{formatCurrency(opportunity.budget)}</TableCell>
                  <TableCell>{formatDate(opportunity.postedDate)}</TableCell>
                  <TableCell>{formatDate(opportunity.dueDate)}</TableCell>
                  <TableCell>
                    <Chip
                      label={opportunity.status}
                      color={opportunity.status === 'open' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {opportunity.technologyCategories.slice(0, 2).map((tech) => (
                        <Chip key={tech.id} label={tech.name} size="small" />
                      ))}
                      {opportunity.technologyCategories.length > 2 && (
                        <Chip
                          label={`+${opportunity.technologyCategories.length - 2}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpportunityView(opportunity)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </TableContainer>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedOpportunity && (
            <>
              <DialogTitle>{selectedOpportunity.title}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Details
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Agency"
                          secondary={selectedOpportunity.agency}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Budget"
                          secondary={formatCurrency(selectedOpportunity.budget)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Status"
                          secondary={selectedOpportunity.status}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Posted Date"
                          secondary={formatDate(selectedOpportunity.postedDate)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Due Date"
                          secondary={formatDate(selectedOpportunity.dueDate)}
                        />
                      </ListItem>
                    </List>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {selectedOpportunity.description}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Technology Categories
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {selectedOpportunity.technologyCategories.map((tech) => (
                        <Chip key={tech.id} label={tech.name} />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
                <Button
                  variant="contained"
                  onClick={() => window.open(selectedOpportunity.sourceUrl, '_blank')}
                >
                  View Source
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
}

export default App;
