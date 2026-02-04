import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Paper,
  Chip,
  Stack,
  Divider,
  Alert,
  AlertTitle,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  AutoAwesome as AiIcon,
  CheckCircle as CheckIcon,
  Send as SendIcon,
  Psychology as BrainIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';

export default function TemplatePage() {
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    friendlyName: '',
    language: 'pt_BR',
    contentType: 'twilio/text',
    body: '',
    variables: [],
    submitForWhatsApp: true,
    category: 'UTILITY',
  });

  const [audienceOptions, setAudienceOptions] = useState({
    region: 'br',
    tone: '',
    offerType: '',
    psychologicalTrigger: '',
    ageRange: '',
    marketNiche: '',
    customMarketNiche: '',
  });

  const [preview, setPreview] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [compliance, setCompliance] = useState(null);
  const [validating, setValidating] = useState(false);

  const psychologicalTriggers = ['escassez', 'urgência', 'prova social', 'autoridade', 'reciprocidade'];
  const ageRanges = ['18 a 24 anos', '25 a 40 anos', '41 a 60 anos', '60+'];
  const offerTypes = ['desconto exclusivo', 'frete grátis', 'combo especial', 'brinde na compra', 'cobrança'];
  const marketNiches = ['cosméticos naturais', 'fitness', 'educação online', 'moda sustentável', 'tecnologia', 'outro'];

  const extractVariables = (bodyText) => {
    const regex = /\{\{(\d+)\}\}/g;
    const nums = new Set();
    let m;
    while ((m = regex.exec(String(bodyText))) !== null) nums.add(Number(m[1]));
    const max = nums.size ? Math.max(...nums) : 0;
    return Array.from({ length: max }, (_, i) => formData.variables[i] || '');
  };

  useEffect(() => {
    setFormData((prev) => ({ ...prev, variables: extractVariables(prev.body) }));
  }, [formData.body]); // eslint-disable-line

  useEffect(() => {
    let msg = String(formData.body || '');
    formData.variables.forEach((val, i) => {
      const re = new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g');
      msg = msg.replace(re, val || `{{${i + 1}}}`);
    });
    setPreview(msg);
  }, [formData.body, formData.variables]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompliance(null);
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleVariableChange = (index, value) => {
    const arr = [...formData.variables];
    arr[index] = value;
    setCompliance(null);
    setFormData((prev) => ({ ...prev, variables: arr }));
  };

  const handleAudienceChange = (e) => {
    const { name, value } = e.target;
    setAudienceOptions((prev) => ({ ...prev, [name]: value }));

    if (name === 'region') {
      if (value === 'br') {
        setFormData((prev) => ({ ...prev, language: 'pt_BR' }));
      } else if (['co', 'mx', 'pe', 'ar', 'cl'].includes(value)) {
        setFormData((prev) => ({ ...prev, language: 'es_MX' }));
      } else {
        setFormData((prev) => ({ ...prev, language: 'en_US' }));
      }
    }
  };

  const handleSuggestWithAI = async () => {
    try {
      setIsSuggesting(true);
      setCompliance(null);

      const payload = {
        seedText: formData.body || '',
        region: audienceOptions.region || '',
        tone: audienceOptions.tone || '',
        offerType: audienceOptions.offerType || '',
        psychologicalTrigger: audienceOptions.psychologicalTrigger || '',
        ageRange: audienceOptions.ageRange || '',
        marketNiche:
          audienceOptions.marketNiche === 'outro'
            ? audienceOptions.customMarketNiche || 'outro'
            : audienceOptions.marketNiche || '',
        category: (formData.category || 'UTILITY').toUpperCase(),
        language: formData.language || 'pt_BR',
      };

      const { data } = await axios.post('/api/ai/suggest-copy', payload);
      if (!data?.suggestion) {
        enqueueSnackbar('A IA não retornou sugestão', { variant: 'warning' });
        return;
      }
      setFormData((prev) => ({ ...prev, body: data.suggestion }));
      enqueueSnackbar('Sugestão gerada com sucesso!', { variant: 'success' });
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Erro ao gerar sugestão com IA', { variant: 'error' });
    } finally {
      setIsSuggesting(false);
    }
  };

  const validateCompliance = async () => {
    try {
      setValidating(true);
      setCompliance(null);

      const payload = {
        category: (formData.category || 'UTILITY').toUpperCase(),
        body: preview || '',
      };

      const { data } = await axios.post('/api/template-guard/validate-hybrid', payload);
      setCompliance(data);
      enqueueSnackbar('Validação de compliance concluída', { variant: 'info' });
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Falha ao validar compliance', { variant: 'error' });
    } finally {
      setValidating(false);
    }
  };

  const applyRewriteFromCompliance = () => {
    const rewritten = compliance?.ai_summary?.rewritten;
    if (!rewritten) return;
    setFormData((prev) => ({ ...prev, body: rewritten }));
    enqueueSnackbar('Reescrita aplicada ao Body', { variant: 'success' });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.friendlyName.trim()) {
        enqueueSnackbar('Defina um Friendly Name', { variant: 'warning' });
        return;
      }
      if (!formData.body.trim()) {
        enqueueSnackbar('Escreva o Body da mensagem', { variant: 'warning' });
        return;
      }

      const variableMap = {};
      formData.variables.forEach((val, idx) => {
        variableMap[(idx + 1).toString()] = val || `{{${idx + 1}}}`;
      });

      const payload = {
        name: formData.friendlyName,
        language: formData.language,
        variables: variableMap,
        types: {
          [formData.contentType]: {
            body: formData.body,
          },
        },
        autoSubmit: Boolean(formData.submitForWhatsApp),
        category: (formData.category || 'UTILITY').toUpperCase(),
      };

      setIsCreating(true);
      await axios.post('/api/templates/create', payload);
      enqueueSnackbar('Template criado com sucesso!', { variant: 'success' });

      // Reset form
      setFormData({
        friendlyName: '',
        language: 'pt_BR',
        contentType: 'twilio/text',
        body: '',
        variables: [],
        submitForWhatsApp: true,
        category: 'UTILITY',
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(`Erro ao criar template: ${err.response?.data?.message || err.message}`, { variant: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Criar Template
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Crie templates com IA e validação de compliance automática
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Form */}
        <Grid item xs={12} md={8}>
          {/* Basic Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Informações Básicas
              </Typography>

              <TextField
                fullWidth
                label="Friendly Name"
                name="friendlyName"
                value={formData.friendlyName}
                onChange={handleChange}
                placeholder="ex: lembrete_pagamento_ago24"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoria</InputLabel>
                    <Select name="category" value={formData.category} onChange={handleChange} label="Categoria">
                      <MenuItem value="UTILITY">Utility</MenuItem>
                      <MenuItem value="MARKETING">Marketing</MenuItem>
                      <MenuItem value="AUTH">Auth/Transactional</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Idioma"
                    name="language"
                    value={formData.language}
                    disabled
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Content Type</InputLabel>
                    <Select name="contentType" value={formData.contentType} onChange={handleChange} label="Content Type">
                      <MenuItem value="twilio/text">twilio/text</MenuItem>
                      <MenuItem value="twilio/media">twilio/media</MenuItem>
                      <MenuItem value="twilio/template">twilio/template</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="submitForWhatsApp"
                        checked={formData.submitForWhatsApp}
                        onChange={handleChange}
                      />
                    }
                    label="Submeter para aprovação no WhatsApp"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Message Body */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Mensagem
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={6}
                name="body"
                value={formData.body}
                onChange={handleChange}
                placeholder="Use {{1}}, {{2}}... para variáveis"
                sx={{ mb: 2 }}
              />

              {formData.variables.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Variáveis Detectadas
                  </Typography>
                  <Grid container spacing={2}>
                    {formData.variables.map((val, i) => (
                      <Grid item xs={12} sm={6} key={i}>
                        <TextField
                          fullWidth
                          size="small"
                          label={`Variável {{${i + 1}}}`}
                          value={val}
                          onChange={(e) => handleVariableChange(i, e.target.value)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}
            </CardContent>
          </Card>

          {/* AI Briefing */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BrainIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Briefing para IA
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Região</InputLabel>
                    <Select name="region" value={audienceOptions.region} onChange={handleAudienceChange} label="Região">
                      <MenuItem value="br">Brasil</MenuItem>
                      <MenuItem value="co">Colômbia</MenuItem>
                      <MenuItem value="mx">México</MenuItem>
                      <MenuItem value="pe">Peru</MenuItem>
                      <MenuItem value="ar">Argentina</MenuItem>
                      <MenuItem value="cl">Chile</MenuItem>
                      <MenuItem value="us">Estados Unidos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tom</InputLabel>
                    <Select name="tone" value={audienceOptions.tone} onChange={handleAudienceChange} label="Tom">
                      <MenuItem value="">--</MenuItem>
                      <MenuItem value="informal">Informal</MenuItem>
                      <MenuItem value="urgente">Urgente</MenuItem>
                      <MenuItem value="profissional">Profissional</MenuItem>
                      <MenuItem value="amistoso">Amistoso</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Oferta</InputLabel>
                    <Select name="offerType" value={audienceOptions.offerType} onChange={handleAudienceChange} label="Tipo de Oferta">
                      <MenuItem value="">--</MenuItem>
                      {offerTypes.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gatilho Psicológico</InputLabel>
                    <Select name="psychologicalTrigger" value={audienceOptions.psychologicalTrigger} onChange={handleAudienceChange} label="Gatilho">
                      <MenuItem value="">--</MenuItem>
                      {psychologicalTriggers.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Faixa Etária</InputLabel>
                    <Select name="ageRange" value={audienceOptions.ageRange} onChange={handleAudienceChange} label="Idade">
                      <MenuItem value="">--</MenuItem>
                      {ageRanges.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Nicho de Mercado</InputLabel>
                    <Select name="marketNiche" value={audienceOptions.marketNiche} onChange={handleAudienceChange} label="Nicho">
                      <MenuItem value="">--</MenuItem>
                      {marketNiches.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {audienceOptions.marketNiche === 'outro' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      name="customMarketNiche"
                      placeholder="Descreva seu nicho"
                      value={audienceOptions.customMarketNiche}
                      onChange={handleAudienceChange}
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<AiIcon />}
                  onClick={handleSuggestWithAI}
                  disabled={isSuggesting}
                  fullWidth
                >
                  {isSuggesting ? 'Gerando...' : 'Gerar com IA'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CheckIcon />}
                  onClick={validateCompliance}
                  disabled={validating}
                  fullWidth
                >
                  {validating ? 'Validando...' : 'Validar Compliance'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSubmit}
                  disabled={isCreating}
                  fullWidth
                >
                  {isCreating ? 'Criando...' : 'Criar Template'}
                </Button>
              </Stack>
              {(isSuggesting || validating || isCreating) && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Preview & Compliance */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PreviewIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Preview
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  minHeight: 100,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                }}
              >
                {preview || 'Escreva o body para ver o preview...'}
              </Paper>

              {compliance && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Compliance (Meta)
                  </Typography>

                  <Alert severity={compliance.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>
                    <AlertTitle>
                      {compliance.ok ? 'Template aprovado' : 'Atenção'}
                    </AlertTitle>
                    {compliance.ok
                      ? 'Template está em conformidade com as políticas da Meta'
                      : 'Alguns ajustes podem ser necessários'}
                  </Alert>

                  {Array.isArray(compliance.issues) && compliance.issues.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Issues:
                      </Typography>
                      <Stack spacing={0.5}>
                        {compliance.issues.map((issue, i) => (
                          <Chip key={i} label={issue} size="small" color="error" variant="outlined" />
                        ))}
                      </Stack>
                    </Paper>
                  )}

                  {compliance.ai_summary?.rewritten && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>
                        Reescrita Sugerida:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2, fontSize: '0.875rem' }}>
                        {compliance.ai_summary.rewritten}
                      </Paper>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        onClick={applyRewriteFromCompliance}
                      >
                        Aplicar Reescrita
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
