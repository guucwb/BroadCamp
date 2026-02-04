import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useSnackbar } from 'notistack';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Alert,
  AlertTitle,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Send as SendIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';

const steps = ['Upload CSV', 'Selecionar Template', 'Mapear Variáveis', 'Revisar & Enviar'];

export default function DisparoPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [variables, setVariables] = useState([]);
  const [columnMapping, setColumnMapping] = useState([]);
  const [preview, setPreview] = useState('');
  const [invalidNumbers, setInvalidNumbers] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    fetch('/api/templates/list')
      .then(res => res.json())
      .then(data => {
        setTemplates(data.contents || []);
        setLoadingTemplates(false);
      })
      .catch(err => {
        enqueueSnackbar('Erro ao carregar templates', { variant: 'error' });
        setLoadingTemplates(false);
      });
  }, [enqueueSnackbar]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        setInvalidNumbers([]);
        enqueueSnackbar(`${results.data.length} contatos carregados`, { variant: 'success' });
        setActiveStep(1);
      },
      error: () => {
        enqueueSnackbar('Erro ao processar CSV', { variant: 'error' });
      }
    });
  };

  const handleTemplateChange = (sid) => {
    setSelectedTemplate(sid);

    if (!sid) {
      setVariables([]);
      setColumnMapping([]);
      setPreview('');
      return;
    }

    const found = templates.find(t => t.sid === sid);
    const templateBody = Object.values(found.types || {})[0]?.body || '';
    const matches = templateBody.match(/{{(.*?)}}/g) || [];
    const cleaned = matches.map(v => v.replace(/{{|}}/g, '').trim());

    setVariables(cleaned);
    setColumnMapping(Array(cleaned.length).fill(''));
    updatePreview(cleaned, Array(cleaned.length).fill(''), templateBody);

    if (cleaned.length > 0) {
      setActiveStep(2);
    } else {
      setActiveStep(3);
    }
  };

  const handleMappingChange = (index, value) => {
    const updated = [...columnMapping];
    updated[index] = value;
    setColumnMapping(updated);

    const found = templates.find(t => t.sid === selectedTemplate);
    const templateBody = Object.values(found?.types || {})[0]?.body || '';
    updatePreview(variables, updated, templateBody);

    if (updated.every(m => m)) {
      setActiveStep(3);
    }
  };

  const updatePreview = (vars, map, templateBody) => {
    if (!selectedTemplate || csvData.length === 0) {
      setPreview('');
      return;
    }
    let body = templateBody || '';
    vars.forEach((v, i) => {
      const col = map[i];
      const valor = (col ? (csvData[0]?.[col] ?? '') : '');
      const regex = new RegExp(`{{\\s*${escapeRegExp(v)}\\s*}}`, 'g');
      body = body.replace(regex, String(valor));
    });
    setPreview(body);
  };

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isValidE164 = (num) => /^\+\d{10,15}$/.test(String(num || '').trim());

  const buildVariablesObject = (row) => {
    const obj = {};
    variables.forEach((placeholder, i) => {
      const col = columnMapping[i];
      const value = col ? (row[col] ?? '') : '';
      obj[String(placeholder)] = String(value);
    });
    return obj;
  };

  const handleDownloadInvalids = () => {
    const csv = Papa.unparse(invalidNumbers.map(({ row, to }) => ({ ...row, telefone: to })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'numeros_invalidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!file || !selectedTemplate || !channel) {
      enqueueSnackbar('Preencha todos os campos', { variant: 'warning' });
      return;
    }

    if (variables.length > 0 && columnMapping.some(m => !m)) {
      enqueueSnackbar('Mapeie todas as variáveis do template', { variant: 'warning' });
      return;
    }

    const rows = csvData || [];
    const targets = rows.map(row => {
      const to = row.telefone || row.phone || row.numero || row['número'] || row['Número'] || row['Telefone'];
      return { to: String(to || '').trim(), row, vars: buildVariablesObject(row) };
    });

    const invalids = targets.filter(t => !isValidE164(t.to));
    if (invalids.length > 0) {
      setInvalidNumbers(invalids.map(({ row, to }) => ({ row, to })));
      enqueueSnackbar(`${invalids.length} número(s) inválido(s) encontrados`, { variant: 'error' });
      return;
    }

    setSending(true);
    setResults([]);

    try {
      if (channel === 'whatsapp') {
        const contentSid = selectedTemplate;
        const promises = targets.map(async (t) => {
          try {
            const resp = await fetch('/api/send/wa-template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: t.to, contentSid, variables: t.vars })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
            return { to: t.to, ok: true, sid: json.sid || null };
          } catch (e) {
            return { to: t.to, ok: false, error: e.message };
          }
        });

        const settled = await Promise.allSettled(promises);
        const flat = settled.map(s => (s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message }));
        setResults(flat);

        const okCount = flat.filter(x => x?.ok).length;
        const failCount = flat.length - okCount;
        enqueueSnackbar(`WhatsApp: ${okCount} enviados, ${failCount} falharam`, {
          variant: failCount > 0 ? 'warning' : 'success'
        });

      } else if (channel === 'sms') {
        const found = templates.find(t => t.sid === selectedTemplate);
        const templateBody = Object.values(found.types || {})[0]?.body || '';

        const promises = targets.map(async (t) => {
          let body = templateBody;
          Object.entries(t.vars).forEach(([k, v]) => {
            const regex = new RegExp(`{{\\s*${escapeRegExp(k)}\\s*}}`, 'g');
            body = body.replace(regex, String(v));
          });

          try {
            const resp = await fetch('/api/send/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: t.to, body })
            });
            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
            return { to: t.to, ok: true, sid: json.sid || null };
          } catch (e) {
            return { to: t.to, ok: false, error: e.message };
          }
        });

        const settled = await Promise.allSettled(promises);
        const flat = settled.map(s => (s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message }));
        setResults(flat);

        const okCount = flat.filter(x => x?.ok).length;
        const failCount = flat.length - okCount;
        enqueueSnackbar(`SMS: ${okCount} enviados, ${failCount} falharam`, {
          variant: failCount > 0 ? 'warning' : 'success'
        });
      }
    } catch (err) {
      console.error('Erro na campanha:', err);
      enqueueSnackbar('Erro inesperado ao enviar campanha', { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Broadcast Dispatch
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Envie mensagens em massa via WhatsApp ou SMS usando templates
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Step 1: Upload */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                1. Upload CSV
              </Typography>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                }}
                onClick={() => document.getElementById('csv-upload').click()}
              >
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  {file ? file.name : 'Clique ou arraste um arquivo CSV'}
                </Typography>
                {csvData.length > 0 && (
                  <Chip label={`${csvData.length} contatos`} color="primary" sx={{ mt: 1 }} />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Step 2: Template & Channel */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                2. Selecionar Template & Canal
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Canal
                </Typography>
                <ToggleButtonGroup
                  value={channel}
                  exclusive
                  onChange={(e, val) => val && setChannel(val)}
                  fullWidth
                >
                  <ToggleButton value="whatsapp">
                    <WhatsAppIcon sx={{ mr: 1 }} />
                    WhatsApp
                  </ToggleButton>
                  <ToggleButton value="sms">
                    <SmsIcon sx={{ mr: 1 }} />
                    SMS
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  label="Template"
                  disabled={loadingTemplates}
                >
                  <MenuItem value="">Selecione um template</MenuItem>
                  {templates.map(t => (
                    <MenuItem key={t.sid} value={t.sid}>{t.friendly_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {loadingTemplates && <LinearProgress sx={{ mt: 1 }} />}
            </CardContent>
          </Card>

          {/* Step 3: Variable Mapping */}
          {variables.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  3. Mapear Variáveis
                </Typography>
                <Grid container spacing={2}>
                  {variables.map((v, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <FormControl fullWidth size="small">
                        <InputLabel>{v}</InputLabel>
                        <Select
                          value={columnMapping[i]}
                          onChange={(e) => handleMappingChange(i, e.target.value)}
                          label={v}
                        >
                          <MenuItem value="">Selecione uma coluna</MenuItem>
                          {csvData.length > 0 && Object.keys(csvData[0]).map((col, idx) => (
                            <MenuItem key={idx} value={col}>{col}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Submit */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                4. Enviar Campanha
              </Typography>

              {invalidNumbers.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <AlertTitle>Números Inválidos</AlertTitle>
                  {invalidNumbers.length} número(s) inválido(s) encontrados.
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadInvalids}
                    sx={{ ml: 2 }}
                  >
                    Baixar CSV
                  </Button>
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<SendIcon />}
                onClick={handleSubmit}
                disabled={sending || !file || !selectedTemplate}
                sx={{ py: 1.5 }}
              >
                {sending ? 'Enviando...' : 'Iniciar Campanha'}
              </Button>
              {sending && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Resultados
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip
                    icon={<SuccessIcon />}
                    label={`${okCount} Sucesso`}
                    color="success"
                  />
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${failCount} Falhas`}
                    color="error"
                  />
                </Stack>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Número</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>SID / Erro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.slice(0, 100).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.to}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.ok ? 'OK' : 'Erro'}
                              color={r.ok ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            {r.ok ? r.sid : r.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {results.length > 100 && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    Mostrando primeiros 100 de {results.length} resultados
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Column - Preview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PreviewIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Preview
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {preview ? (
                <>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 2,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {preview}
                  </Paper>
                  {channel === 'whatsapp' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No WhatsApp, botões aparecem no dispositivo do destinatário
                    </Alert>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  Selecione um template e faça upload do CSV para ver o preview
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
