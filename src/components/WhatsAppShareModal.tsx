import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import type { BillPrintData } from './BillPrintTemplate';
import {
  formatWhatsAppPhone,
  downloadBillPdf,
  shareBillOnWhatsApp,
  canSharePdfFile,
  type ShareBillWhatsAppResult,
} from '../utils/pdfUtils';

interface WhatsAppShareModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillPrintData | null;
  targetElement?: HTMLElement | null;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  open,
  onClose,
  bill,
  targetElement,
}) => {
  if (!bill) return null;

  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [shareResult, setShareResult] = useState<ShareBillWhatsAppResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      setPhone(bill.customerPhone || '');
      setShareResult(null);
      setErrorMessage(null);
    }
  }, [bill, open]);

  const rawTotal = parseFloat(String(bill.total ?? bill.amount ?? '0').replace(/,/g, '')) || 0;
  const formattedTotal = '₹' + rawTotal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const hasMobileShare = canSharePdfFile();

  // Trigger WhatsApp share with PDF
  const handleShare = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await shareBillOnWhatsApp(bill, phone, targetElement);
      setShareResult(result);
    } catch (err: any) {
      console.error('Failed to share bill on WhatsApp:', err);
      setErrorMessage(err.message || 'Failed to generate PDF for WhatsApp sharing');
    } finally {
      setLoading(false);
    }
  };

  // Direct download PDF
  const handleDownload = async () => {
    setDownloading(true);
    setErrorMessage(null);
    try {
      const res = await downloadBillPdf(bill, targetElement);
      setShareResult((prev) => prev || { method: 'whatsapp_web', filename: res.filename, note: 'PDF downloaded successfully' });
    } catch (err: any) {
      console.error('Failed to download PDF:', err);
      setErrorMessage(err.message || 'Error generating PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Direct link to reopen WhatsApp
  const handleDirectOpenWhatsApp = () => {
    const cleanPhone = formatWhatsAppPhone(phone);
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
      : `https://api.whatsapp.com/send`;
    window.open(waUrl, '_blank');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #BBF7D0',
          boxShadow: '0 25px 50px -12px rgba(22, 163, 74, 0.25)',
        },
      }}
    >
      {/* Top Header with WhatsApp Styling */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          background: 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)',
          color: '#FFFFFF',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              backgroundColor: '#25D366',
              borderRadius: '50%',
              p: 0.8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <WhatsAppIcon sx={{ fontSize: 24, color: '#FFFFFF' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Share Bill #{bill.billNo || 'Invoice'} on WhatsApp
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#DCFCE7', fontWeight: 500 }}>
              Send PDF Bill & Invoice Details Directly
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#FFFFFF', p: 0.8, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
          <CloseRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Dialog Body */}
      <DialogContent sx={{ p: { xs: 2.5, sm: 3 }, backgroundColor: '#F8FAFC' }}>
        {/* Bill Summary Banner */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            mb: 2.5,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Name
            </Typography>
            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', mt: 0.2 }}>
              {bill.customerName || 'General Customer'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.3 }}>
              Date: <b>{bill.date || '-'}</b> | Items: <b>{(bill.products || []).length} items</b>
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Amount
            </Typography>
            <Typography sx={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', mt: 0.2 }}>
              {formattedTotal}
            </Typography>
          </Box>
        </Box>

        {/* Customer Phone Number Input */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', mb: 0.8 }}>
            Customer WhatsApp Number:
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. 9876543210 (10-digit mobile number)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#16A34A', fontWeight: 700, fontSize: '13px' }}>
                      <PhoneAndroidRoundedIcon sx={{ fontSize: 18 }} />
                      +91
                    </Box>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& fieldset': { borderColor: '#CBD5E1' },
                '&:hover fieldset': { borderColor: '#16A34A' },
                '&.Mui-focused fieldset': { borderColor: '#16A34A', borderWidth: '2px' },
              },
              '& .MuiInputBase-input': {
                fontSize: '14px',
                fontWeight: 600,
                color: '#0F172A',
              },
            }}
          />
          <Typography sx={{ fontSize: '11.5px', color: '#64748B', mt: 0.6 }}>
            {phone.trim()
              ? `Will open chat with +91 ${phone.replace(/[^0-9]/g, '')}`
              : 'Leave blank to choose any contact in WhatsApp when sharing'}
          </Typography>
        </Box>

        {/* PDF File Indicator Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            mb: 2.5,
            backgroundColor: '#F0FDF4',
            borderRadius: '10px',
            border: '1px solid #BBF7D0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <PictureAsPdfRoundedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Bill_{bill.billNo || 'Invoice'}_{(bill.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf
              </Typography>
              <Typography sx={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                High-Quality A4 Print Ready PDF
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={handleDownload}
            disabled={downloading || loading}
            startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadRoundedIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: '#86EFAC',
              color: '#15803D',
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '6px',
              px: 1.2,
              py: 0.4,
              backgroundColor: '#FFFFFF',
              '&:hover': { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
            }}
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </Box>


        {/* Instructions / Feedback alert */}
        {shareResult && (
          <Alert
            severity="success"
            icon={<CheckCircleRoundedIcon sx={{ color: '#16A34A' }} />}
            sx={{
              borderRadius: '10px',
              border: '1px solid #BBF7D0',
              backgroundColor: '#F0FDF4',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#166534',
              mb: 2,
            }}
          >
            {shareResult.method === 'native' ? (
              'PDF shared successfully via WhatsApp!'
            ) : (
              <Box>
                <div>
                  <b>PDF Downloaded ({shareResult.filename})!</b> WhatsApp is opening in a new tab.
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '4px', color: '#15803D' }}>
                  Simply attach or drag the downloaded PDF into your WhatsApp chat!
                </div>
                <Button
                  size="small"
                  onClick={handleDirectOpenWhatsApp}
                  endIcon={<LaunchRoundedIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    mt: 1,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    color: '#047857',
                    p: 0,
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Open WhatsApp Chat Again
                </Button>
              </Box>
            )}
          </Alert>
        )}

        {errorMessage && (
          <Alert
            severity="error"
            onClose={() => setErrorMessage(null)}
            sx={{ borderRadius: '10px', mb: 2, fontSize: '12px' }}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Helper Note based on device capabilities */}
        {!shareResult && (
          <Box sx={{ p: 1.2, backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
            <Typography sx={{ fontSize: '11px', color: '#92400E', fontWeight: 600, textAlign: 'center' }}>
              {hasMobileShare
                ? '📱 Mobile Device Detected: Clicking the button will open WhatsApp with the PDF file directly attached!'
                : '💻 PC / Desktop: PDF will download automatically and WhatsApp Web will open with customer details pre-filled. Simply attach the PDF in the chat!'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#F1F5F9' },
          }}
        >
          Close
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Download PDF to your computer" arrow>
            <Button
              variant="outlined"
              onClick={handleDownload}
              disabled={downloading || loading}
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon />}
              sx={{
                borderColor: '#CBD5E1',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.8,
                borderRadius: '8px',
                '&:hover': { backgroundColor: '#F8FAFC', borderColor: '#94A3B8' },
              }}
            >
              Download PDF
            </Button>
          </Tooltip>

          <Button
            variant="contained"
            disableElevation
            onClick={handleShare}
            disabled={loading || downloading}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <WhatsAppIcon sx={{ fontSize: '20px !important' }} />
              )
            }
            sx={{
              backgroundColor: '#25D366',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              textTransform: 'none',
              px: 3,
              py: 0.9,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
              '&:hover': {
                backgroundColor: '#1EBE5D',
              },
            }}
          >
            {loading ? 'Generating PDF...' : 'Share on WhatsApp'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
