import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { BillPrintData } from '../components/BillPrintTemplate';
import { generateBillHtml } from './printUtils';
import { getStoredSettings } from '../components/SettingsPage';

/**
 * Format phone number for WhatsApp (E.164 without +, e.g. 919876543210 for India)
 */
export const formatWhatsAppPhone = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  const clean = String(rawPhone).replace(/[^0-9]/g, '');
  if (!clean) return '';

  // If 10 digits (Standard Indian mobile number), prepend 91
  if (clean.length === 10) {
    return `91${clean}`;
  }
  // If 11 digits starting with 0 (e.g. 09876543210)
  if (clean.length === 11 && clean.startsWith('0')) {
    return `91${clean.slice(1)}`;
  }
  // If already 12 digits starting with 91
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean;
  }
  return clean;
};

/**
 * Formats a clean, professional WhatsApp text invoice summary to accompany the PDF
 */
export const generateWhatsAppMessage = (bill: BillPrintData): string => {
  const storeSettings = getStoredSettings();
  const compName =
    bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
      ? bill.companyName
      : storeSettings.companyName || 'Varun Trade';

  const rawTotal = parseFloat(String(bill.total ?? bill.amount ?? '0').replace(/,/g, '')) || 0;
  const formattedTotal = '₹' + rawTotal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const prodCount = (bill.products || []).length;
  const casesDisplay = bill.caseCount ? `${bill.caseCount}` : '';

  let msg = `*TAX INVOICE / BILL DETAILS*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏢 *Company:* ${compName}\n`;
  if (bill.billNo) msg += `📄 *Bill No:* #${bill.billNo}\n`;
  if (bill.date) msg += `📅 *Date:* ${bill.date}\n`;
  if (bill.customerName) msg += `👤 *Customer:* ${bill.customerName}\n`;
  if (prodCount > 0) {
    msg += `📦 *Items:* ${prodCount} item${prodCount > 1 ? 's' : ''}${casesDisplay ? ` (${casesDisplay} Cases)` : ''}\n`;
  }
  msg += `💰 *Grand Total:* *${formattedTotal}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Please find attached the Bill PDF document.*\n`;
  if (storeSettings.phone) msg += `📞 Contact: ${storeSettings.phone}\n`;
  msg += `\n_Thank you for your business!_ 🙏`;

  return msg;
};

/**
 * Check whether the current browser supports Web Share API with file attachments
 */
export const canSharePdfFile = (): boolean => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const dummyFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [dummyFile] });
  } catch {
    return false;
  }
};

/**
 * Generates high-resolution PDF Blob and File object for the given bill
 */
export const generateBillPdfBlob = async (
  bill: BillPrintData,
  targetElement?: HTMLElement | null
): Promise<{ blob: Blob; file: File; filename: string }> => {
  let elementToCapture: HTMLElement | null = targetElement || null;
  let tempIframe: HTMLIFrameElement | null = null;

  try {
    let pageElements: HTMLElement[] = [];

    // If a visible target element is provided (e.g. from BillPrintModal)
    if (elementToCapture) {
      const foundPages = Array.from(elementToCapture.querySelectorAll<HTMLElement>('.varun-bill-page'));
      if (foundPages.length > 0) {
        pageElements = foundPages;
      } else if (elementToCapture.classList.contains('varun-bill-page') || elementToCapture.classList.contains('varun-bill-container')) {
        pageElements = [elementToCapture];
      } else {
        pageElements = [elementToCapture];
      }
    } else {
      // Create hidden iframe and write generated bill HTML
      tempIframe = document.createElement('iframe');
      tempIframe.style.position = 'fixed';
      tempIframe.style.left = '-9999px';
      tempIframe.style.top = '0';
      tempIframe.style.width = '840px';
      tempIframe.style.height = '3000px';
      tempIframe.style.border = '0';
      tempIframe.style.visibility = 'hidden';
      document.body.appendChild(tempIframe);

      const iframeDoc = tempIframe.contentWindow?.document || tempIframe.contentDocument;
      if (!iframeDoc) throw new Error('Unable to create print document iframe');

      iframeDoc.open();
      iframeDoc.write(generateBillHtml(bill));
      iframeDoc.close();

      // Wait for all images in the document to load
      await Promise.all(
        Array.from(iframeDoc.images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      );

      // Brief delay to ensure layout and fonts are fully settled
      await new Promise((resolve) => setTimeout(resolve, 150));

      const foundPages = Array.from(iframeDoc.querySelectorAll<HTMLElement>('.varun-bill-page'));
      if (foundPages.length > 0) {
        pageElements = foundPages;
      } else {
        const foundContainer = iframeDoc.querySelector('.varun-bill-container') as HTMLElement | null;
        pageElements = [foundContainer || iframeDoc.body];
      }
    }

    if (pageElements.length === 0) {
      throw new Error('No bill elements found to convert to PDF');
    }

    // Standard A4 dimensions in mm
    const pdfPageWidth = 210;
    const pdfPageHeight = 297;
    const marginSide = 6;
    const marginTopBottom = 8;
    const printableWidth = pdfPageWidth - marginSide * 2; // 198mm
    const printableHeight = pdfPageHeight - marginTopBottom * 2; // 281mm

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      const pageEl = pageElements[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const renderedHeightMm = (canvas.height * printableWidth) / canvas.width;
      const finalHeightMm = Math.min(renderedHeightMm, printableHeight);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', marginSide, marginTopBottom, printableWidth, finalHeightMm);
    }

    const blob = pdf.output('blob');
    const safeCust = (bill.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeBillNo = (bill.billNo || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Bill_${safeBillNo}_${safeCust}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    return { blob, file, filename };
  } finally {
    if (tempIframe && tempIframe.parentNode) {
      tempIframe.parentNode.removeChild(tempIframe);
    }
  }
};

export const downloadBillPdf = async (
  bill: BillPrintData,
  targetElement?: HTMLElement | null
): Promise<{ filename: string }> => {
  const { blob, filename } = await generateBillPdfBlob(bill, targetElement);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { filename };
};

export interface ShareBillWhatsAppResult {
  method: 'native' | 'whatsapp_web';
  filename: string;
  phone?: string;
  note?: string;
}

/**
 * Master WhatsApp PDF share handler:
 * - On supported devices (Mobile Android/iOS/Mac Safari): directly shares the PDF file via native share
 * - On desktop or unsupported devices: downloads the PDF file and opens WhatsApp chat with prefilled message
 */
export const shareBillOnWhatsApp = async (
  bill: BillPrintData,
  phoneNumberOverride?: string,
  targetElement?: HTMLElement | null
): Promise<ShareBillWhatsAppResult> => {
  const { file, filename } = await generateBillPdfBlob(bill, targetElement);
  const cleanPhone = formatWhatsAppPhone(phoneNumberOverride || bill.customerPhone);

  const canShare = canSharePdfFile();

  if (canShare) {
    try {
      // Share ONLY the PDF file - no text message attached
      await navigator.share({
        title: `Bill #${bill.billNo || ''} - ${bill.customerName}`,
        files: [file],
      });
      return {
        method: 'native',
        filename,
        phone: cleanPhone,
        note: 'Shared via native WhatsApp / Share Sheet with attached PDF',
      };
    } catch (err: any) {
      // If user aborted or canceled share dialog, don't fail, simply return
      if (err.name === 'AbortError') {
        return { method: 'native', filename, phone: cleanPhone, note: 'Share was canceled' };
      }
      console.warn('Native share failed, falling back to WhatsApp Web:', err);
    }
  }

  // Fallback for Desktop & Browsers without direct file sharing:
  // 1. Download PDF to user's computer
  await downloadBillPdf(bill, targetElement);

  // 2. Open WhatsApp (Web / App) with customer phone (no text param)
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
    : `https://api.whatsapp.com/send`;

  window.open(waUrl, '_blank');

  return {
    method: 'whatsapp_web',
    filename,
    phone: cleanPhone,
    note: `PDF downloaded (${filename}) and WhatsApp opened. Attach the downloaded PDF into WhatsApp chat.`,
  };
};
