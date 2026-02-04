import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

// Mock data - em produção viria da API
const generateMockData = (period) => {
  const labels = period === '7d'
    ? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    : period === '30d'
    ? Array.from({ length: 30 }, (_, i) => `${i + 1}`)
    : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return {
    labels,
    sent: labels.map(() => Math.floor(Math.random() * 500) + 100),
    delivered: labels.map(() => Math.floor(Math.random() * 400) + 80),
    failed: labels.map(() => Math.floor(Math.random() * 50) + 5),
  };
};

const topCampaigns = [
  { name: 'Black Friday 2024', sent: 12450, delivered: 11823, rate: 94.9, channel: 'whatsapp', date: '15/11/2024' },
  { name: 'Lembrete Pagamento', sent: 8920, delivered: 8654, rate: 97.0, channel: 'sms', date: '10/11/2024' },
  { name: 'Novidades Dezembro', sent: 7840, delivered: 7156, rate: 91.3, channel: 'whatsapp', date: '01/12/2024' },
  { name: 'Promoção Natal', sent: 6230, delivered: 5894, rate: 94.6, channel: 'whatsapp', date: '20/12/2024' },
  { name: 'Confirmação Pedido', sent: 4560, delivered: 4502, rate: 98.7, channel: 'sms', date: '18/11/2024' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');
  const [channel, setChannel] = useState('all');

  const data = generateMockData(period);
  const maxValue = Math.max(...data.sent, ...data.delivered, ...data.failed);

  // Estatísticas gerais
  const totalSent = data.sent.reduce((a, b) => a + b, 0);
  const totalDelivered = data.delivered.reduce((a, b) => a + b, 0);
  const totalFailed = data.failed.reduce((a, b) => a + b, 0);
  const deliveryRate = ((totalDelivered / totalSent) * 100).toFixed(1);

  // Comparação com período anterior (mock)
  const previousTotal = totalSent * 0.85;
  const growth = (((totalSent - previousTotal) / previousTotal) * 100).toFixed(1);
  const isPositive = growth > 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <BarChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>
                Analytics
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Análise detalhada de performance das suas campanhas
            </Typography>
          </Box>

          {/* Filtros */}
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={period}
                label="Período"
                onChange={(e) => setPeriod(e.target.value)}
              >
                <MenuItem value="7d">Últimos 7 dias</MenuItem>
                <MenuItem value="30d">Últimos 30 dias</MenuItem>
                <MenuItem value="12m">Últimos 12 meses</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Canal</InputLabel>
              <Select
                value={channel}
                label="Canal"
                onChange={(e) => setChannel(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Enviadas
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {totalSent.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                {isPositive ? (
                  <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                )}
                <Typography
                  variant="caption"
                  color={isPositive ? 'success.main' : 'error.main'}
                  fontWeight={600}
                >
                  {isPositive ? '+' : ''}{growth}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vs período anterior
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Entregues
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {totalDelivered.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Taxa de entrega: {deliveryRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Falhas
              </Typography>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {totalFailed.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {((totalFailed / totalSent) * 100).toFixed(1)}% do total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Média por Dia
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {Math.round(totalSent / data.labels.length).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Mensagens/dia
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico de Barras */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Volume de Mensagens
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Comparativo de envios, entregas e falhas
          </Typography>

          <Box sx={{ position: 'relative', height: 300 }}>
            {data.labels.map((label, index) => {
              const sentHeight = (data.sent[index] / maxValue) * 100;
              const deliveredHeight = (data.delivered[index] / maxValue) * 100;
              const failedHeight = (data.failed[index] / maxValue) * 100;

              return (
                <Box
                  key={label}
                  sx={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: `${100 / data.labels.length}%`,
                    height: '100%',
                    position: 'relative',
                  }}
                >
                  {/* Barras */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      alignItems: 'flex-end',
                      height: 'calc(100% - 30px)',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Enviadas */}
                    <Box
                      sx={{
                        width: 12,
                        height: `${sentHeight}%`,
                        bgcolor: 'primary.main',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      title={`Enviadas: ${data.sent[index]}`}
                    />
                    {/* Entregues */}
                    <Box
                      sx={{
                        width: 12,
                        height: `${deliveredHeight}%`,
                        bgcolor: 'success.main',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      title={`Entregues: ${data.delivered[index]}`}
                    />
                    {/* Falhas */}
                    <Box
                      sx={{
                        width: 12,
                        height: `${failedHeight}%`,
                        bgcolor: 'error.main',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all 0.3s',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      title={`Falhas: ${data.failed[index]}`}
                    />
                  </Box>

                  {/* Label */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, fontSize: '0.7rem' }}
                  >
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Legenda */}
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="caption">Enviadas</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 1 }} />
              <Typography variant="caption">Entregues</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: 1 }} />
              <Typography variant="caption">Falhas</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Top Campanhas */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Top 5 Campanhas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Campanhas com melhor performance no período
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Campanha
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Canal
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      Enviadas
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      Entregues
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      Taxa
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      Data
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topCampaigns.map((campaign, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {campaign.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={campaign.channel === 'whatsapp' ? <WhatsAppIcon /> : <SmsIcon />}
                        label={campaign.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        size="small"
                        color={campaign.channel === 'whatsapp' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {campaign.sent.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {campaign.delivered.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${campaign.rate}%`}
                        size="small"
                        color={campaign.rate >= 95 ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {campaign.date}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
