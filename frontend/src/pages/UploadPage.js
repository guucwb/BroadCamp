import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  TableChart as TableIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    // Validar tipo de arquivo
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/csv'];
    const fileName = selectedFile.name.toLowerCase();

    if (!validTypes.includes(selectedFile.type) && !fileName.endsWith('.csv')) {
      enqueueSnackbar('Por favor, selecione um arquivo CSV', { variant: 'error' });
      return;
    }

    setFile(selectedFile);
    setUploadedData(null);
    enqueueSnackbar(`Arquivo "${selectedFile.name}" selecionado`, { variant: 'info' });
  };

  const handleUpload = async () => {
    if (!file) {
      enqueueSnackbar('Selecione um arquivo para upload', { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await fetch('/api/campaign/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      enqueueSnackbar('Upload realizado com sucesso!', { variant: 'success' });
      setUploadedData(data.data);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Erro ao fazer upload', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>
            Upload de Contatos
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Importe sua base de contatos através de um arquivo CSV
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Area */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Drag & Drop Zone */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Selecione o Arquivo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Arraste e solte ou clique para selecionar um arquivo CSV
                </Typography>

                <Paper
                  variant="outlined"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: dragActive ? 'action.hover' : 'background.default',
                    border: dragActive ? '2px dashed' : '2px dashed',
                    borderColor: dragActive ? 'primary.main' : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    },
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {dragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Formatos aceitos: CSV
                  </Typography>
                </Paper>

                {/* Arquivo Selecionado */}
                {file && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'success.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FileIcon sx={{ fontSize: 40, color: 'success.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)} • {file.type || 'text/csv'}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<SuccessIcon />}
                        label="Pronto"
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Paper>
                )}
              </CardContent>
            </Card>

            {/* Botão de Upload */}
            <Card>
              <CardContent>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={uploading ? null : <UploadIcon />}
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  sx={{ py: 2 }}
                >
                  {uploading ? 'Fazendo Upload...' : 'Fazer Upload'}
                </Button>

                {uploading && <LinearProgress sx={{ mt: 2 }} />}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Instruções */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <InfoIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Instruções
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Alert severity="info">
                  O arquivo CSV deve conter as seguintes colunas:
                </Alert>
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Formato esperado:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                      nome,telefone,email
                      {'\n'}João Silva,+5511999999999,joao@example.com
                      {'\n'}Maria Santos,+5511888888888,maria@example.com
                    </Typography>
                  </Paper>
                </Box>
                <Alert severity="warning">
                  <strong>Importante:</strong> Os números de telefone devem estar no formato E.164 (ex: +5511999999999)
                </Alert>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Dicas:</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                    • Certifique-se de que o arquivo está codificado em UTF-8
                    <br />
                    • Remova linhas vazias antes de fazer o upload
                    <br />
                    • Verifique se todos os números têm o código do país
                    <br />
                    • Máximo recomendado: 10.000 contatos por arquivo
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview dos Dados */}
      {uploadedData && uploadedData.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <TableIcon sx={{ color: 'success.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Prévia da Base
              </Typography>
              <Chip label={`${uploadedData.length} registros`} color="success" size="small" />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mostrando os primeiros 5 registros:
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    {Object.keys(uploadedData[0] || {}).map((key) => (
                      <TableCell key={key}>
                        <Typography variant="body2" fontWeight={600}>
                          {key}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uploadedData.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx} hover>
                      {Object.values(row).map((value, i) => (
                        <TableCell key={i}>
                          <Typography variant="body2">{value}</Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {uploadedData.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                ... e mais {uploadedData.length - 5} registros
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

