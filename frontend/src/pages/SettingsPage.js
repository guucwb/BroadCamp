import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Stack,
  Divider,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  Check as CheckIcon,
  VpnKey as KeyIcon,
  Phone as PhoneIcon,
  Sms as SmsIcon,
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const [config, setConfig] = useState({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioWhatsAppSender: '',
    twilioSmsSender: '',
    openaiApiKey: '',
  });

  const [originalConfig, setOriginalConfig] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    // Detectar mudanças
    const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setHasChanges(changed);
  }, [config, originalConfig]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Erro ao carregar configurações');
      const data = await res.json();

      // Mascarar tokens (backend deve enviar mascarado)
      const masked = {
        twilioAccountSid: data.twilioAccountSid || '',
        twilioAuthToken: data.twilioAuthToken || '',
        twilioWhatsAppSender: data.twilioWhatsAppSender || '',
        twilioSmsSender: data.twilioSmsSender || '',
        openaiApiKey: data.openaiApiKey || '',
      };

      setConfig(masked);
      setOriginalConfig(masked);
    } catch (err) {
      console.error('Erro ao buscar configurações', err);
      enqueueSnackbar('Erro ao carregar configurações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validação básica
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      enqueueSnackbar('Account SID e Auth Token são obrigatórios', { variant: 'warning' });
      return;
    }

    if (!config.twilioWhatsAppSender && !config.twilioSmsSender) {
      enqueueSnackbar('Configure pelo menos um sender (WhatsApp ou SMS)', { variant: 'warning' });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações');
      }

      enqueueSnackbar('Configurações salvas com sucesso!', { variant: 'success' });
      setOriginalConfig(config);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Erro ao salvar configurações', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    enqueueSnackbar('Alterações descartadas', { variant: 'info' });
  };

  const handleChange = (field) => (e) => {
    setConfig({ ...config, [field]: e.target.value });
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Configurações
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>
            Configurações
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure suas credenciais da Twilio e outras integrações
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Formulário */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Twilio Credentials */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <KeyIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Credenciais Twilio
                  </Typography>
                  <Chip label="Obrigatório" color="error" size="small" />
                </Box>

                <Stack spacing={3}>
                  <TextField
                    label="Account SID"
                    value={config.twilioAccountSid}
                    onChange={handleChange('twilioAccountSid')}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    fullWidth
                    required
                    helperText="Encontre em console.twilio.com"
                  />

                  <TextField
                    label="Auth Token"
                    type={showAuthToken ? 'text' : 'password'}
                    value={config.twilioAuthToken}
                    onChange={handleChange('twilioAuthToken')}
                    placeholder="••••••••••••••••••••••••••••••••"
                    fullWidth
                    required
                    helperText="Token de autenticação da sua conta Twilio"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowAuthToken(!showAuthToken)}
                            edge="end"
                          >
                            {showAuthToken ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Senders */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <PhoneIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    Números de Envio (Senders)
                  </Typography>
                </Box>

                <Stack spacing={3}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <WhatsAppIcon sx={{ color: 'success.main' }} />
                      <Typography variant="body1" fontWeight={600}>
                        WhatsApp Sender
                      </Typography>
                    </Box>
                    <TextField
                      label="Número WhatsApp"
                      value={config.twilioWhatsAppSender}
                      onChange={handleChange('twilioWhatsAppSender')}
                      placeholder="+5541999999999"
                      fullWidth
                      helperText="Número aprovado para WhatsApp Business API (formato E.164)"
                    />
                  </Box>

                  <Divider />

                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <SmsIcon sx={{ color: 'secondary.main' }} />
                      <Typography variant="body1" fontWeight={600}>
                        SMS Sender
                      </Typography>
                    </Box>
                    <TextField
                      label="Número SMS"
                      value={config.twilioSmsSender}
                      onChange={handleChange('twilioSmsSender')}
                      placeholder="+14253294891"
                      fullWidth
                      helperText="Número Twilio para envio de SMS (formato E.164)"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* OpenAI */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <KeyIcon sx={{ color: 'secondary.main' }} />
                  <Typography variant="h6" fontWeight={600}>
                    OpenAI API
                  </Typography>
                  <Chip label="Opcional" color="default" size="small" variant="outlined" />
                </Box>

                <TextField
                  label="API Key"
                  type={showOpenAI ? 'text' : 'password'}
                  value={config.openaiApiKey}
                  onChange={handleChange('openaiApiKey')}
                  placeholder="sk-••••••••••••••••••••••••••••••••"
                  fullWidth
                  helperText="Necessário para geração automática de copy com IA"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowOpenAI(!showOpenAI)}
                          edge="end"
                        >
                          {showOpenAI ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <Card>
              <CardContent>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={saving ? null : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    fullWidth
                  >
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<RefreshIcon />}
                    onClick={handleReset}
                    disabled={saving || !hasChanges}
                  >
                    Descartar
                  </Button>
                </Stack>
                {saving && <LinearProgress sx={{ mt: 2 }} />}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Informações e Ajuda */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Status */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Status
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckIcon sx={{ color: config.twilioAccountSid ? 'success.main' : 'text.disabled' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Twilio
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.twilioAccountSid ? 'Configurado' : 'Não configurado'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckIcon sx={{ color: config.twilioWhatsAppSender ? 'success.main' : 'text.disabled' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          WhatsApp
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.twilioWhatsAppSender ? 'Configurado' : 'Não configurado'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckIcon sx={{ color: config.twilioSmsSender ? 'success.main' : 'text.disabled' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          SMS
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.twilioSmsSender ? 'Configurado' : 'Não configurado'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckIcon sx={{ color: config.openaiApiKey ? 'success.main' : 'text.disabled' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          OpenAI
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.openaiApiKey ? 'Configurado' : 'Não configurado'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Stack>
              </CardContent>
            </Card>

            {/* Ajuda */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Ajuda
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={2}>
                  <Alert severity="info">
                    Suas credenciais são armazenadas de forma segura e encriptadas.
                  </Alert>

                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Como obter credenciais:
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      1. Acesse <strong>console.twilio.com</strong>
                      <br />
                      2. Copie seu Account SID e Auth Token
                      <br />
                      3. Configure seus números em Phone Numbers
                      <br />
                      4. Para WhatsApp, configure em Messaging → WhatsApp Senders
                    </Typography>
                  </Box>

                  <Alert severity="warning">
                    <strong>Importante:</strong> Nunca compartilhe seu Auth Token. Ele dá acesso total à sua conta Twilio.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
