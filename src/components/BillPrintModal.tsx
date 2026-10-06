import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { BillPrintTemplate, type BillPrintData } from './BillPrintTemplate';
import { printBillDirectly } from '../utils/printUtils';
import { downloadBillPdf } from '../utils/pdfUtils';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface BillPrintModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillPrintData | null;
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({ open, onClose, bill }) => {
  if (!bill) return null;

  const [whatsappModalOpen, setWhatsappModalOpen] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const billContainerRef = useRef<HTMLDivElement>(null);

  const handleTriggerPrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    printBillDirectly(bill);
    setTimeout(() => {
      setIsPrinting(false);
    }, 1500);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadBillPdf(bill, billContainerRef.current);
    } catch (err) {
      console.error('Failed to download bill PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Hidden print styling that guarantees ONLY the bill template is printed */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .varun-printable-section,
            .varun-printable-section *,
            .dheeksha-printable-section,
            .dheeksha-printable-section * {
              visibility: visible !important;
            }
            .varun-printable-section,
            .dheeksha-printable-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #FFFFFF !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .varun-no-print,
            .dheeksha-no-print {
              display: none !important;
            }
            .varun-bill-page {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 0 !important;
            }
            .varun-bill-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
          }
        `}
      </style>

      {/* Screen Dialog for Previewing */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: '#FEFDF9',
            border: '1px solid #FDE68A',
            boxShadow: '0 20px 40px -15px rgba(217, 119, 6, 0.25)',
          },
        }}
      >
        {/* Modal Top Bar */}
        <Box
          className="varun-no-print dheeksha-no-print"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 1.5, sm: 3 },
            py: 1.6,
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            borderBottom: '2px solid #F59E0B',
            color: '#FFFFFF',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
            <Typography noWrap sx={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Bill Preview - #{bill.billNo || 'New'}
            </Typography>
            <Typography noWrap sx={{ fontSize: '12px', color: '#FEF3C7', fontWeight: 500 }}>
              {bill.customerName} | {bill.companyName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {/* Share on WhatsApp Button */}
            <Tooltip title="Share Bill PDF via WhatsApp" arrow>
              <Button
                variant="contained"
                disableElevation
                onClick={() => setWhatsappModalOpen(true)}
                startIcon={<WhatsAppIcon sx={{ fontSize: '18px !important', color: '#FFFFFF' }} />}
                sx={{
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  textTransform: 'none',
                  px: 1.8,
                  py: 0.6,
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  '&:hover': {
                    backgroundColor: '#1EBE5D',
                  },
                }}
              >
                WhatsApp (PDF)
              </Button>
            </Tooltip>

            {/* Download PDF Button */}
            <Tooltip title="Download PDF Document" arrow>
              <Button
                variant="contained"
                disableElevation
                onClick={handleDownloadPdf}
                disabled={downloading}
                startIcon={
                  downloading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DownloadRoundedIcon sx={{ fontSize: '18px !important', color: '#7C2D12' }} />
                  )
                }
                sx={{
                  backgroundColor: '#FEF3C7',
                  color: '#7C2D12',
                  border: '1px solid #FDE68A',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 1.6,
                  py: 0.6,
                  borderRadius: '6px',
                  '&:hover': {
                    backgroundColor: '#FDE68A',
                  },
                }}
              >
                {downloading ? 'Saving...' : 'PDF'}
              </Button>
            </Tooltip>

            {/* Print Button */}
            <Button
              variant="contained"
              disableElevation
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important', color: '#FFFFFF' }} />}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.4)',
                fontSize: '12.5px',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.6,
                py: 0.6,
                borderRadius: '6px',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              Print
            </Button>

            <IconButton onClick={onClose} sx={{ color: '#FFFFFF', p: 0.8 }}>
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Modal Body with Bill Document */}
        <DialogContent
          sx={{
            p: { xs: 1.5, sm: 3 },
            backgroundColor: '#FFFDF7',
            display: 'flex',
            justifyContent: 'center',
            overflowY: 'auto',
          }}
        >
          <Box
            ref={billContainerRef}
            id="bill-print-modal-content"
            className="varun-printable-section dheeksha-printable-section"
            sx={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
              borderRadius: '0px',
              border: 'none',
              width: '100%',
              maxWidth: '820px',
            }}
          >
            <BillPrintTemplate bill={bill} />
          </Box>
        </DialogContent>

        {/* Modal Bottom Actions */}
        <DialogActions
          className="varun-no-print dheeksha-no-print"
          sx={{
            px: 3,
            py: 1.5,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #FEF3C7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: 1,
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              color: '#78350F',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#FFFBEB' },
            }}
          >
            Close
          </Button>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleDownloadPdf}
              disabled={downloading}
              startIcon={
                downloading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DownloadRoundedIcon sx={{ fontSize: 18 }} />
                )
              }
              sx={{
                borderColor: '#FDE68A',
                color: '#92400E',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.8,
                borderRadius: '6px',
                backgroundColor: '#FFFBEB',
                '&:hover': {
                  borderColor: '#F59E0B',
                  backgroundColor: '#FEF3C7',
                },
              }}
            >
              {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>

            <Button
              variant="contained"
              disableElevation
              onClick={() => setWhatsappModalOpen(true)}
              startIcon={<WhatsAppIcon sx={{ fontSize: '19px !important' }} />}
              sx={{
                backgroundColor: '#25D366',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.5,
                py: 0.8,
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                '&:hover': {
                  backgroundColor: '#1EBE5D',
                },
              }}
            >
              Share on WhatsApp
            </Button>

            <Button
              variant="contained"
              disableElevation
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              startIcon={<PrintOutlinedIcon sx={{ fontSize: '18px !important' }} />}
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'none',
                px: 2.5,
                py: 0.8,
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
                },
              }}
            >
              Print
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* WhatsApp Share PDF Modal */}
      {whatsappModalOpen && (
        <WhatsAppShareModal
          open={whatsappModalOpen}
          onClose={() => setWhatsappModalOpen(false)}
          bill={bill}
          targetElement={billContainerRef.current}
        />
      )}
    </>
  );
};

