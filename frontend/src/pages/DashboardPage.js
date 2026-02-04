import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  People as PeopleIcon,
  Description as TemplateIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';

// Mock data - na produção, buscar da API
const stats = {
  totalSent: 12847,
  successRate: 94.5,
  activeTemplates: 8,
  totalContacts: 3240,
  whatsappSent: 8920,
  smsSent: 3927,
  todaySent: 342,
  weekGrowth: 12.5,
};

const recentCampaigns = [
  { id: 1, name: 'Promoção Black Friday', sent: 2340, success: 2210, channel: 'whatsapp', date: '2 horas atrás' },
  { id: 2, name: 'Lembrete Pagamento', sent: 856, success: 812, channel: 'sms', date: '5 horas atrás' },
  { id: 3, name: 'Novidades Dezembro', sent: 1240, success: 1189, channel: 'whatsapp', date: 'Ontem' },
  { id: 4, name: 'Confirmação Pedido', sent: 445, success: 445, channel: 'sms', date: 'Ontem' },
];

const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="success.main" fontWeight={600}>
              +{trend}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              vs última semana
            </Typography>
          </Box>
        )}
      </Stack>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula carregamento
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visão geral das suas campanhas e mensagens
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Mensagens Enviadas"
            value={stats.totalSent.toLocaleString()}
            subtitle="Total histórico"
            icon={<SendIcon />}
            color="primary"
            trend={stats.weekGrowth}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taxa de Sucesso"
            value={`${stats.successRate}%`}
            subtitle={`${Math.round(stats.totalSent * (stats.successRate / 100))} entregues`}
            icon={<SuccessIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Templates Ativos"
            value={stats.activeTemplates}
            subtitle="Aprovados e prontos"
            icon={<TemplateIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Contatos"
            value={stats.totalContacts.toLocaleString()}
            subtitle="Base total"
            icon={<PeopleIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Channel Distribution */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Distribuição por Canal
              </Typography>
              <Stack spacing={3} sx={{ mt: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsAppIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" fontWeight={500}>
                        WhatsApp
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.whatsappSent.toLocaleString()} ({Math.round((stats.whatsappSent / stats.totalSent) * 100)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.whatsappSent / stats.totalSent) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmsIcon sx={{ color: 'secondary.main' }} />
                      <Typography variant="body2" fontWeight={500}>
                        SMS
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {stats.smsSent.toLocaleString()} ({Math.round((stats.smsSent / stats.totalSent) * 100)}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(stats.smsSent / stats.totalSent) * 100}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Atividade Hoje
              </Typography>
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <SendIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          {stats.todaySent}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mensagens enviadas hoje
                        </Typography>
                      </Box>
                    </Box>
                    <Chip label="Ativo" color="success" size="small" />
                  </Box>
                </Paper>

                <Stack direction="row" spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sucesso
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {Math.round(stats.todaySent * 0.96)}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Falhas
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      {Math.round(stats.todaySent * 0.04)}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Pendentes
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      0
                    </Typography>
                  </Paper>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Campaigns */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Campanhas Recentes
            </Typography>
            <Chip label="Últimas 24h" size="small" />
          </Box>
          <List>
            {recentCampaigns.map((campaign, index) => (
              <React.Fragment key={campaign.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <IconButton edge="end">
                      <MoreIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: campaign.channel === 'whatsapp' ? 'primary.main' : 'secondary.main' }}>
                      {campaign.channel === 'whatsapp' ? <WhatsAppIcon /> : <SmsIcon />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {campaign.name}
                        </Typography>
                        <Chip
                          label={campaign.channel.toUpperCase()}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {campaign.sent} enviados
                        </Typography>
                        <Typography variant="caption" color="success.main">
                          {campaign.success} sucesso ({Math.round((campaign.success / campaign.sent) * 100)}%)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          • {campaign.date}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
