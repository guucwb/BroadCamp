import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Paper,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Send as SendIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as TemplateIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

export default function CampaignPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Erro ao carregar templates');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Erro ao buscar templates', err);
      enqueueSnackbar('Erro ao carregar templates', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    if (!selectedTemplate) {
      enqueueSnackbar('Selecione um template', { variant: 'warning' });
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSid: selectedTemplate,
          channel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao disparar campanha');
      }

      enqueueSnackbar(data.message || 'Campanha iniciada com sucesso!', { variant: 'success' });

      // Simular progresso (em produção viria de websocket ou polling)
      setProgress({ sent: 0, failed: 0 });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Erro ao disparar campanha', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const selectedTemplateData = templates.find(t => t.sid === selectedTemplate);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CampaignIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>
            Disparar Campanha
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Envie mensagens em massa para sua base de contatos usando templates aprovados
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Configuração */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Seleção de Template */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <TemplateIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Selecione o Template
                  </Typography>
                </Box>

                {loading ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Carregando templates...
                    </Typography>
                    <LinearProgress />
                  </Box>
                ) : (
                  <FormControl fullWidth>
                    <InputLabel>Template</InputLabel>
                    <Select
                      value={selectedTemplate}
                      label="Template"
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Selecione um template</em>
                      </MenuItem>
                      {templates.map((t) => (
                        <MenuItem key={t.sid} value={t.sid}>
                          {t.friendly_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {templates.length === 0 && !loading && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Nenhum template encontrado. Crie um template primeiro.
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Seleção de Canal */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Canal de Envio
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Escolha o canal para enviar as mensagens
                </Typography>

                <ToggleButtonGroup
                  value={channel}
                  exclusive
                  onChange={(e, val) => val && setChannel(val)}
                  fullWidth
                  sx={{ '& .MuiToggleButton-root': { py: 2 } }}
                >
                  <ToggleButton value="whatsapp">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsAppIcon />
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body1" fontWeight={600}>
                          WhatsApp
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Business API
                        </Typography>
                      </Box>
                    </Box>
                  </ToggleButton>
                  <ToggleButton value="sms">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmsIcon />
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body1" fontWeight={600}>
                          SMS
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mensagem de texto
                        </Typography>
                      </Box>
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              </CardContent>
            </Card>

            {/* Botão de Iniciar */}
            <Card>
              <CardContent>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={sending ? null : <SendIcon />}
                  onClick={handleStartCampaign}
                  disabled={sending || !selectedTemplate || loading}
                  sx={{ py: 2 }}
                >
                  {sending ? 'Enviando Campanha...' : 'Iniciar Campanha'}
                </Button>

                {sending && <LinearProgress sx={{ mt: 2 }} />}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Preview e Status */}
        <Grid item xs={12} md={5}>
          <Stack spacing={3}>
            {/* Preview do Template */}
            {selectedTemplateData && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Preview
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Chip
                        label={selectedTemplateData.language || 'pt_BR'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        size="small"
                        icon={channel === 'whatsapp' ? <WhatsAppIcon /> : <SmsIcon />}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      {selectedTemplateData.friendly_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      SID: {selectedTemplateData.sid}
                    </Typography>
                  </Paper>
                </CardContent>
              </Card>
            )}

            {/* Progresso */}
            {progress && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Progresso da Campanha
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SuccessIcon sx={{ color: 'success.main', fontSize: 32 }} />
                        <Box>
                          <Typography variant="h4" fontWeight={700} color="success.main">
                            {progress.sent}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Enviadas com sucesso
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ErrorIcon sx={{ color: 'error.main', fontSize: 32 }} />
                        <Box>
                          <Typography variant="h4" fontWeight={700} color="error.main">
                            {progress.failed}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Falhas no envio
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Informações */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Informações
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Alert severity="info">
                    A campanha será enviada para todos os contatos da sua base de dados.
                  </Alert>
                  <Alert severity="warning">
                    Certifique-se de que o template está aprovado pela Meta antes de iniciar.
                  </Alert>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      <strong>Dica:</strong> Você pode acompanhar o status da campanha em tempo real.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      <strong>Importante:</strong> Respeite as políticas de privacidade e opt-out dos contatos.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

