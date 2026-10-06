import type { BillPrintData } from '../components/BillPrintTemplate';
import { getStoredSettings } from '../components/SettingsPage';
import { numberToWords } from './numberToWords';
import { VINAYAGAR_IMAGE_BASE64, FLOWERPOT_IMAGE_BASE64 } from '../assets/billImages';

/**
 * Robust date parser supporting DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, ISO, etc.
 */
export const parseDateToTimestamp = (dateStr: string): number => {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const clean = dateStr.trim();

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day).getTime();
  }

  const parsed = Date.parse(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Checks whether an item's date falls within [fromDate, toDate]
 */
export const isDateInRange = (dateStr: string, fromDateStr: string, toDateStr: string): boolean => {
  if (!fromDateStr && !toDateStr) return true;
  const itemTime = parseDateToTimestamp(dateStr);
  if (!itemTime) return true;

  if (fromDateStr) {
    const fromTime = parseDateToTimestamp(fromDateStr);
    if (fromTime && itemTime < fromTime) return false;
  }

  if (toDateStr) {
    const toTime = parseDateToTimestamp(toDateStr);
    // Include the full day until 23:59:59
    if (toTime && itemTime > toTime + (24 * 60 * 60 * 1000 - 1)) return false;
  }

  return true;
};

/**
 * Unambiguously identifies whether a bill record is a GST invoice.
 * Checked via:
 * 1. billType === 'GST'
 * 2. billNo starting with 'GST'
 * 3. notes containing [GST_BILL] or GST_INVOICE
 * 4. record ID or billNo tracked in local varun_gst_bill_registry
 */
export const isGstBillRecord = (bill: any): boolean => {
  if (!bill) return false;
  if (bill.billType === 'GST') return true;
  if (bill.billNo && String(bill.billNo).toUpperCase().startsWith('GST')) return true;
  if (bill.notes && typeof bill.notes === 'string' && (bill.notes.includes('[GST_BILL]') || bill.notes.includes('GST_INVOICE'))) return true;
  try {
    const rawRegistry = localStorage.getItem('varun_gst_bill_registry');
    if (rawRegistry) {
      const reg = JSON.parse(rawRegistry);
      if (Array.isArray(reg)) {
        const id = bill._id || bill.id;
        if (id && reg.includes(String(id))) return true;
        if (bill.billNo && reg.includes(String(bill.billNo))) return true;
      }
    }
  } catch {}
  return false;
};

export const registerGstBillRecord = (billIdOrNo: string) => {
  if (!billIdOrNo) return;
  try {
    const rawRegistry = localStorage.getItem('varun_gst_bill_registry');
    const reg: string[] = rawRegistry ? JSON.parse(rawRegistry) : [];
    if (!reg.includes(String(billIdOrNo))) {
      reg.push(String(billIdOrNo));
      localStorage.setItem('varun_gst_bill_registry', JSON.stringify(reg));
    }
  } catch {}
};

export const generateBillHtml = (bill: BillPrintData): string => {
  const isGstBill = isGstBillRecord(bill);
  const storeSettings = getStoredSettings();
  const displayCompanyName =
    bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
      ? bill.companyName
      : storeSettings.companyName || 'VARUN TRADERS';

  const gstinDisplay = storeSettings.gstin || '33AFPPA3625M1ZF';
  const stateCodeDisplay = '33';
  const phone1 = storeSettings.phone || '94443 56298';
  const phone2 =
    storeSettings.whatsapp && storeSettings.whatsapp !== phone1 ? storeSettings.whatsapp : '90802 25281';

  // Exact address from the bill scan: 3/1333/8 Sattur Road, SIVAKASI - 626 189.
  const fullAddress = '3/1333/8 Sattur Road, SIVAKASI - 626 189.';

  const rawTagline = (storeSettings.tagline || '').trim();
  const tagline = (!rawTagline || rawTagline.toLowerCase() === 'estimate' || rawTagline.toLowerCase().includes('estimate'))
    ? 'Dealers in Quality Fireworks'
    : (rawTagline || 'Dealers in Quality Fireworks');


  // Discount (% only)
  const rawDiscStr = String(bill.discount ?? '').trim();
  const cleanDisc = rawDiscStr.replace(/[^0-9.]/g, '');
  const discPercent = parseFloat(cleanDisc) || 0;

  // Transport
  const rawTransportStr = String(bill.transport ?? '').trim();
  const cleanTrans = rawTransportStr.replace(/[^0-9.]/g, '');
  const transportAmt =
    !isNaN(Number(rawTransportStr)) && parseFloat(cleanTrans) > 0 ? parseFloat(cleanTrans) : 0;

  // Packing
  const rawPackStr = String(bill.packing ?? '').trim();
  const cleanPack = rawPackStr.replace(/[^0-9.]/g, '');
  const packNum = parseFloat(cleanPack) || 0;

  // Tax calculation (CGST, SGST, IGST as optional inputs)
  const rawCgstStr = String(bill.cgst ?? '').trim().replace(/[^0-9.]/g, '');
  const rawSgstStr = String(bill.sgst ?? '').trim().replace(/[^0-9.]/g, '');
  const rawIgstStr = String(bill.igst ?? '').trim().replace(/[^0-9.]/g, '');

  let cgstPercent = parseFloat(rawCgstStr) || 0;
  let sgstPercent = parseFloat(rawSgstStr) || 0;
  let igstPercent = parseFloat(rawIgstStr) || 0;

  // Fallback to legacy bill.tax if none of cgst/sgst/igst are specified
  if (cgstPercent === 0 && sgstPercent === 0 && igstPercent === 0) {
    const rawTaxStr = String(bill.tax ?? '').trim().replace(/[^0-9.]/g, '');
    const legacyTax = parseFloat(rawTaxStr) || 0;
    if (legacyTax > 0) {
      const isInterState = bill.customerState && !bill.customerState.toLowerCase().includes('tamil');
      if (isInterState) {
        igstPercent = legacyTax;
      } else {
        cgstPercent = legacyTax / 2;
        sgstPercent = legacyTax / 2;
      }
    }
  }

  // Currency Split Helper
  const splitRsPs = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return { rs: '', ps: '' };
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return { rs: '', ps: '' };
    const intPart = Math.floor(Math.abs(num));
    const decPart = Math.round((Math.abs(num) - intPart) * 100);
    return {
      rs: intPart.toLocaleString('en-IN'),
      ps: decPart.toString().padStart(2, '0'),
    };
  };

  const getItemAmount = (p: any): number => {
    const rawRate = p.rate !== undefined && p.rate !== null ? String(p.rate).replace(/,/g, '').trim() : '';
    const numRate = !isNaN(Number(rawRate)) ? parseFloat(rawRate) : 0;
    const rawQty = p.quantity !== undefined && p.quantity !== null ? String(p.quantity).replace(/,/g, '').trim() : '';
    const numQty = !isNaN(Number(rawQty)) ? parseFloat(rawQty) : 0;
    if (numRate > 0 && numQty > 0) {
      return numRate * numQty;
    }
    const rawAmt = p.amount !== undefined && p.amount !== null ? String(p.amount).replace(/,/g, '').trim() : '';
    if (rawAmt !== '' && !isNaN(Number(rawAmt))) {
      return parseFloat(rawAmt);
    }
    return 0;
  };

  // Exact 15 products per page
  const ROWS_PER_PAGE = 15;
  const allProducts = bill.products || [];
  const pages: any[][] = [];

  if (allProducts.length <= ROWS_PER_PAGE) {
    pages.push(allProducts);
  } else {
    for (let i = 0; i < allProducts.length; i += ROWS_PER_PAGE) {
      pages.push(allProducts.slice(i, i + ROWS_PER_PAGE));
    }
  }
  const totalPages = pages.length;

  const customerAddressLine = [
    bill.customerAddress,
    bill.customerPhone ? `Ph: ${bill.customerPhone}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const pagesHtml = pages
    .map((pageProducts, pageIndex) => {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === totalPages - 1;
      const isMultiPage = totalPages > 1;

      const startIndex = pageIndex * ROWS_PER_PAGE;
      const emptyRowCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);

      // Sum of products on THIS page only
      const pageThisProdSum = pageProducts.reduce((acc: number, p: any) => acc + getItemAmount(p), 0);

      // Previous pages cumulative subtotal (for breakdown note on Page 2+)
      const prevCumulativeSubtotal = pageIndex > 0
        ? allProducts.slice(0, startIndex).reduce((acc: number, p: any) => acc + getItemAmount(p), 0)
        : 0;

      // Cumulative subtotal up to this page:
      // Page 1 has ONLY Page 1 total; Page 2 adds Page 1 total + Page 2 products!
      const cumulativeProducts = allProducts.slice(0, startIndex + pageProducts.length);
      const prodSubtotal = cumulativeProducts.reduce((acc: number, p: any) => acc + getItemAmount(p), 0);
      const pageSubtotal = (allProducts.length === 0 && isLastPage)
        ? (parseFloat(String(bill.amount || bill.total || '0').replace(/,/g, '')) || 0)
        : prodSubtotal;

      // Discount for this page's total
      const pageDiscountAmt = discPercent > 0 ? (pageSubtotal * discPercent) / 100 : 0;

      // Packing for this page
      let pagePackingAmt = 0;
      if (packNum > 0) {
        if (rawPackStr.includes('%')) {
          pagePackingAmt = (pageSubtotal * packNum) / 100;
        } else if (isLastPage) {
          pagePackingAmt = packNum;
        }
      }

      // Transport: added on the final page (or single page)
      const pageTransportAmt = isLastPage ? transportAmt : 0;

      // Taxable base for this page
      const pageBaseForTax = Math.max(0, pageSubtotal - pageDiscountAmt + pageTransportAmt + pagePackingAmt);

      // Taxes for this page (Only on GST Bill)
      const pageCgstAmt = isGstBill && cgstPercent > 0 ? (pageBaseForTax * cgstPercent) / 100 : 0;
      const pageSgstAmt = isGstBill && sgstPercent > 0 ? (pageBaseForTax * sgstPercent) / 100 : 0;
      const pageIgstAmt = isGstBill && igstPercent > 0 ? (pageBaseForTax * igstPercent) / 100 : 0;
      const pageTaxAmt = pageCgstAmt + pageSgstAmt + pageIgstAmt;

      // Final Total for this page
      const pageCalculatedTotal = Math.max(0, pageBaseForTax + pageTaxAmt);
      const rawDbTotal = parseFloat(String(bill.total ?? bill.amount ?? '0').replace(/,/g, '')) || 0;
      const pageFinalTotalNum = (isLastPage && rawDbTotal > 0 && Math.abs(rawDbTotal - pageCalculatedTotal) < 1)
        ? rawDbTotal
        : pageCalculatedTotal;

      const pageSubtotalSplit = splitRsPs(pageSubtotal);
      const pageTotalSplit = splitRsPs(pageFinalTotalNum);
      const pageCgstSplit = splitRsPs(pageCgstAmt);
      const pageSgstSplit = splitRsPs(pageSgstAmt);
      const pageIgstSplit = splitRsPs(pageIgstAmt);

      // Words in Rupees for this page
      const pageWords = numberToWords(pageFinalTotalNum);
      let wordsLine1 = pageWords;
      let wordsLine2 = '';
      if (pageWords.length > 52) {
        const splitIndex = pageWords.lastIndexOf(' ', 50);
        if (splitIndex > 20) {
          wordsLine1 = pageWords.slice(0, splitIndex);
          wordsLine2 = pageWords.slice(splitIndex + 1);
        }
      }

      let productRowsHtml = pageProducts
        .map((item, idx) => {
          const serialNumber = startIndex + idx + 1;
          const numQty = parseFloat(String(item.quantity).replace(/,/g, '')) || 0;
          const numRate = parseFloat(String(item.rate).replace(/,/g, '')) || 0;
          const numAmt = (numRate > 0 && numQty > 0)
            ? numRate * numQty
            : (parseFloat(String(item.amount).replace(/,/g, '')) || 0);
          const amtSplit = splitRsPs(numAmt);
          return `
            <tr style="height: 24px;">
              <td style="border: 1px solid #801414; text-align: center; padding: 3px 6px; font-weight: 700; font-size: 12.5px; color: #000000;">
                ${serialNumber}
              </td>
              <td style="border: 1px solid #801414; text-align: left; padding: 3px 10px; font-weight: 700; color: #000000;">
                ${item.particular || '-'}
              </td>
              <td style="border: 1px solid #801414; text-align: center; padding: 3px 4px; font-weight: 700; color: #000000;">
                ${item.quantity || ''}
              </td>
              <td style="border: 1px solid #801414; text-align: right; padding: 3px 6px; font-weight: 700; font-size: 12.5px; color: #000000;">
                ${numRate > 0 ? numRate.toFixed(2) : ''}
              </td>
              <td style="border: 1px solid #801414; text-align: right; padding: 3px 6px; font-weight: 700; color: #000000;">
                ${amtSplit.rs}
              </td>
              <td style="border: 1px solid #801414; text-align: center; padding: 3px 2px; font-weight: 600; color: #000000;">
                ${amtSplit.ps}
              </td>
            </tr>
          `;
        })
        .join('');

      let emptyRowsHtml = '';
      for (let i = 0; i < emptyRowCount; i++) {
        emptyRowsHtml += `
          <tr style="height: 24px;">
            <td style="border: 1px solid #801414; padding: 3px 8px;"></td>
            <td style="border: 1px solid #801414; padding: 2px 8px;"></td>
            <td style="border: 1px solid #801414; padding: 3px;"></td>
            <td style="border: 1px solid #801414; padding: 3px;"></td>
            <td style="border: 1px solid #801414; padding: 3px;"></td>
            <td style="border: 1px solid #801414; padding: 3px;"></td>
          </tr>
        `;
      }

      const summaryRowsHtml = `
        <!-- Row 1: TOTAL -->
        <tr>
          <td colspan="3" rowspan="${isGstBill ? 5 : 2}" style="border: 1px solid #801414; vertical-align: bottom; padding: 5px 10px; text-align: left;">
            ${isGstBill ? `<div style="font-size: 13px; font-weight: 900; color: #801414;">E & O.E</div>` : ''}
            ${pageIndex > 0 ? `
              <div style="font-size: 11px; font-weight: 800; color: #801414; margin-top: 3px; line-height: 1.35;">
                <div>${pageIndex === 1 ? 'Page 1 Total B/F' : `Pages 1-${pageIndex} Total B/F`} : &#8377;${splitRsPs(prevCumulativeSubtotal).rs}.${splitRsPs(prevCumulativeSubtotal).ps}</div>
                <div>This Page Products &nbsp;&nbsp;&nbsp;: &#8377;${splitRsPs(pageThisProdSum).rs}.${splitRsPs(pageThisProdSum).ps}</div>
                <div style="font-weight: 900;">
                  (Total = &#8377;${pageSubtotalSplit.rs}.${pageSubtotalSplit.ps}${!isLastPage ? ` &mdash; c/f to Page ${pageIndex + 2}` : ''})
                </div>
              </div>
            ` : isMultiPage ? `
              <div style="font-size: 11px; font-weight: 800; color: #801414; margin-top: 3px;">
                (Page 1 Total : &#8377;${pageSubtotalSplit.rs}.${pageSubtotalSplit.ps} &mdash; c/f to Page 2)
              </div>
            ` : ''}
            ${isGstBill ? (() => {
              const settingsTerms =
                (storeSettings.billTerms && storeSettings.billTerms.trim()) ||
                (typeof window !== 'undefined' ? (localStorage.getItem('varun_gst_bill_terms') || '').trim() : '');
              const billNotesClean = (bill.notes || '').replace(/^\[GST_BILL\]\s*/, '').trim();
              const displayNotes = settingsTerms || billNotesClean || '';
              return displayNotes ? `
                <div style="font-size: 13px; font-weight: 800; color: #801414; margin-top: 4px; line-height: 1.45; white-space: pre-wrap; word-break: break-word;">
                  ${displayNotes}
                </div>
              ` : '';
            })() : ''}
          </td>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 900; font-size: 12.5px; color: #801414; padding: 4px 8px;">
            TOTAL
          </td>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 800; font-size: 12.5px; color: #000000; padding: 4px 6px;">
            ${pageSubtotalSplit.rs}
          </td>
          <td style="border: 1px solid #801414; text-align: center; font-weight: 700; font-size: 12px; color: #000000; padding: 4px 2px;">
            ${pageSubtotalSplit.ps}
          </td>
        </tr>

        ${isGstBill ? `
        <!-- Row 2: CGST % -->
        <tr>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 800; font-size: 12px; color: #801414; padding: 3px 8px;">
            CGST ${cgstPercent > 0 ? `${cgstPercent}%` : '%'}
          </td>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 700; font-size: 12px; color: #000000; padding: 3px 6px;">
            ${pageCgstAmt > 0 ? pageCgstSplit.rs : ''}
          </td>
          <td style="border: 1px solid #801414; text-align: center; font-weight: 600; font-size: 11.5px; color: #000000; padding: 3px 2px;">
            ${pageCgstAmt > 0 ? pageCgstSplit.ps : ''}
          </td>
        </tr>

        <!-- Row 3: SGST % -->
        <tr>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 800; font-size: 12px; color: #801414; padding: 3px 8px;">
            SGST ${sgstPercent > 0 ? `${sgstPercent}%` : '%'}
          </td>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 700; font-size: 12px; color: #000000; padding: 3px 6px;">
            ${pageSgstAmt > 0 ? pageSgstSplit.rs : ''}
          </td>
          <td style="border: 1px solid #801414; text-align: center; font-weight: 600; font-size: 11.5px; color: #000000; padding: 3px 2px;">
            ${pageSgstAmt > 0 ? pageSgstSplit.ps : ''}
          </td>
        </tr>

        <!-- Row 4: IGST % -->
        <tr>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 800; font-size: 12px; color: #801414; padding: 3px 8px;">
            IGST ${igstPercent > 0 ? `${igstPercent}%` : '%'}
          </td>
          <td style="border: 1px solid #801414; text-align: right; font-weight: 700; font-size: 12px; color: #000000; padding: 3px 6px;">
            ${pageIgstAmt > 0 ? pageIgstSplit.rs : ''}
          </td>
          <td style="border: 1px solid #801414; text-align: center; font-weight: 600; font-size: 11.5px; color: #000000; padding: 3px 2px;">
            ${pageIgstAmt > 0 ? pageIgstSplit.ps : ''}
          </td>
        </tr>
        ` : ''}

        <!-- Row 5: GRANT TOTAL Rs. -->
        <tr style="background-color: rgba(128, 20, 20, 0.04);">
          <td style="border: 1.5px solid #801414; text-align: right; font-weight: 900; font-size: 13px; color: #801414; padding: 5px 8px; white-space: nowrap;">
            GRANT TOTAL Rs.
          </td>
          <td style="border: 1.5px solid #801414; text-align: right; font-weight: 900; font-size: 14px; color: #000000; padding: 5px 6px;">
            ${pageTotalSplit.rs}
          </td>
          <td style="border: 1.5px solid #801414; text-align: center; font-weight: 900; font-size: 12.5px; color: #000000; padding: 5px 2px;">
            ${pageTotalSplit.ps}
          </td>
        </tr>
      `;

      const footerHtml = `
        <!-- Footer: Rupees in Words & For VARUN TRADERS (FIXED ON ALL PAGES) -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; padding: 0 2px;">
          <!-- Left: Rupees in Words -->
          <div style="flex: 1 1 auto; max-width: 62%;">
            <div style="display: flex; align-items: flex-end; margin-bottom: 6px;">
              <span style="font-size: 13px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                Rupees :
              </span>
              <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; font-size: 12.5px; font-weight: 800; color: #000000; padding-left: 4px;">
                ${wordsLine1}
              </div>
            </div>

            <div style="display: flex; align-items: flex-end;">
              <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; font-size: 12.5px; font-weight: 800; color: #000000; padding-left: 4px; text-align: ${wordsLine2 ? 'left' : 'right'};">
                ${wordsLine2 || ''}
              </div>
              ${!wordsLine2 ? '<span style="font-size: 13px; font-weight: 900; color: #801414; margin-left: 6px;">Only.</span>' : ''}
            </div>
          </div>

          <!-- Right: For VARUN TRADERS & Signature -->
          <div style="flex: 0 0 34%; text-align: right; padding-right: 4px;">
            <div style="font-family: 'Times New Roman', Georgia, serif; font-size: 16px; font-weight: 900; color: #801414; letter-spacing: 0.5px;">
              For ${displayCompanyName}
            </div>
            <div style="height: 44px;"></div>
            <div style="font-size: 11.5px; font-weight: 800; color: #801414;">
              ${storeSettings.ownerName ? `(${storeSettings.ownerName}) ` : ''}Authorized Signatory
            </div>
          </div>
        </div>
      `;

      let headerHtml = '';
      if (isFirstPage) {
        headerHtml = `
          <!-- Top Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 2px;">
            <!-- Left: GSTIN & State Code (Only on GST Bill) -->
            ${isGstBill ? `
              <div style="flex: 0 0 24%; text-align: left; line-height: 1.3;">
                <div style="font-size: 13px; font-weight: 800; color: #801414; letter-spacing: 0.2px;">
                  GSTIN : ${gstinDisplay}
                </div>
                <div style="font-size: 12px; font-weight: 800; color: #801414; margin-top: 1px;">
                  STATE CODE : ${stateCodeDisplay}
                </div>
              </div>
            ` : `
              <div style="flex: 0 0 24%;"></div>
            `}

            <!-- Center: Om + Badge (ESTIMATE on normal bill, TAX INVOICE on GST bill) -->
            <div style="flex: 1 1 auto; text-align: center;">
              <div style="font-size: 20px; font-weight: 900; line-height: 1; color: #801414; margin-bottom: 2px; font-family: serif;">
                ॐ
              </div>
              ${isGstBill ? `
                <div style="display: inline-block; background-color: #801414; color: #FFFFFF; font-weight: 900; font-size: 13px; letter-spacing: 1px; padding: 2px 14px; border-radius: 4px; text-transform: uppercase; line-height: 1.2;">
                  TAX INVOICE
                </div>
                <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px; margin-top: 2px; color: #801414; text-transform: uppercase;">
                  ${isMultiPage ? `CASH/CREDIT BILL (PAGE 1 OF ${totalPages})` : 'CASH/CREDIT BILL'}
                </div>
              ` : `
                <div style="display: inline-block; background-color: #801414; color: #FFFFFF; font-weight: 900; font-size: 13.5px; letter-spacing: 2px; padding: 2px 18px; border-radius: 4px; text-transform: uppercase; line-height: 1.2; margin-bottom: 2px;">
                  ESTIMATE
                </div>
              `}
            </div>

            <!-- Right: Phone Numbers with Icon -->
            <div style="flex: 0 0 24%; text-align: right; line-height: 1.3;">
              <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                <span style="font-size: 14px; color: #801414; line-height: 1;">📞</span>
                <div style="font-size: 13px; font-weight: 800; color: #801414;">${phone1}</div>
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #801414; margin-top: 1px;">
                ${phone2}
              </div>
            </div>
          </div>

          <!-- Flanked Company Title Row: Left Vinayagar + Brand Title + Right Flowerpot -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin: 1px 0 3px 0;">
            <!-- Left: Vinayagar Photo -->
            <div style="flex: 0 0 72px; text-align: center; display: flex; align-items: center; justify-content: center;">
              <img src="${VINAYAGAR_IMAGE_BASE64}" alt="Lord Vinayagar" style="width: 70px; height: 86px; object-fit: contain; display: block;" />
            </div>

            <!-- Center: Brand Name & Address -->
            <div style="flex: 1 1 auto; text-align: center; padding: 0 8px;">
              <h1 style="margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 36px; font-weight: 900; letter-spacing: 2px; color: #801414; text-transform: uppercase; line-height: 1.05;">
                ${displayCompanyName}
              </h1>
              <div style="font-family: Georgia, serif; font-style: italic; font-size: 14px; font-weight: 700; color: #801414; margin-top: 1px;">
                ${tagline}
              </div>
              <div style="font-size: 13.5px; font-weight: 800; color: #801414; margin-top: 2px; letter-spacing: 0.2px;">
                ${fullAddress}
              </div>
            </div>

            <!-- Right: Flower Pot Cracker Image -->
            <div style="flex: 0 0 72px; text-align: center; display: flex; align-items: center; justify-content: center;">
              <img src="${FLOWERPOT_IMAGE_BASE64}" alt="Fireworks Flower Pot" style="width: 70px; height: 86px; object-fit: contain; display: block;" />
            </div>
          </div>

          <!-- Horizontal Divider -->
          <div style="border-top: 1.5px solid #801414; margin: 3px 0 5px 0;"></div>

          <!-- Bill Info & Customer (M/s) Section -->
          <div style="padding: 0 2px;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 5px;">
              <div style="display: flex; align-items: flex-end; flex: 0 0 45%;">
                <span style="font-size: 13.5px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                  Bill No.
                </span>
                <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; padding-left: 6px; font-size: 13.5px; font-weight: 800; color: #000000;">
                  ${bill.billNo || ''}
                </div>
              </div>

              <div style="display: flex; align-items: flex-end; flex: 0 0 38%; justify-content: flex-end;">
                <span style="font-size: 13.5px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                  Date :
                </span>
                <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; padding-left: 6px; font-size: 13.5px; font-weight: 800; color: #000000;">
                  ${bill.date || ''}
                </div>
              </div>
            </div>

            <!-- Row 2: M/s Customer Name (Line 1) -->
            <div style="display: flex; align-items: flex-end; margin-bottom: 5px;">
              <span style="font-size: 13.5px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                M/s.
              </span>
              <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; padding-left: 8px; font-size: 14px; font-weight: 800; color: #000000;">
                ${bill.customerName || ''}
              </div>
            </div>

            <!-- Row 3: Customer Address Line 2 -->
            <div style="display: flex; align-items: flex-end; margin-bottom: 5px;">
              <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 19px; padding-left: 32px; font-size: 12.5px; font-weight: 700; color: #1e293b;">
                ${customerAddressLine}
              </div>
            </div>

            <!-- Row 4: Blank dotted guide line 3 -->
            <div style="display: flex; align-items: flex-end; margin-bottom: 5px;">
              <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 15px; padding-left: 32px;"></div>
            </div>
          </div>

          <!-- Horizontal Divider Line -->
          <div style="border-top: 1px solid #801414; margin: 3px 0 5px 0;"></div>

          <!-- Row 5: Party's GSTIN (Left) & State (Right) - ONLY ON GST BILL -->
          ${isGstBill ? `
            <div style="display: flex; align-items: flex-end; justify-content: space-between; padding: 0 2px 3px 2px;">
              <div style="display: flex; align-items: flex-end; flex: 0 0 52%;">
                <span style="font-size: 13px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                  Party's GSTIN :
                </span>
                <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 18px; padding-left: 6px; font-size: 13px; font-weight: 800; color: #000000;">
                  ${bill.customerGst || ''}
                </div>
              </div>

              <div style="display: flex; align-items: flex-end; flex: 0 0 38%; justify-content: flex-end;">
                <span style="font-size: 13px; font-weight: 900; color: #801414; margin-right: 6px; white-space: nowrap;">
                  State :
                </span>
                <div style="flex: 1; border-bottom: 1.5px dotted #801414; min-height: 18px; padding-left: 6px; font-size: 13px; font-weight: 800; color: #000000;">
                  ${bill.customerState || 'Tamil Nadu'}
                </div>
              </div>
            </div>
          ` : ''}
        `;
      } else {
        // NEXT PAGE COMPACT CONTINUATION HEADER (NO SHOP NAME DETAILS)
        headerHtml = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 4px 6px 4px; border-bottom: 1.5px solid #801414; margin-bottom: 6px;">
            <div style="font-size: 13px; font-weight: 800; color: #801414;">
              Bill No. : <span style="color: #000000;">${bill.billNo || ''}</span>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              Date : <span style="color: #000000;">${bill.date || ''}</span>
            </div>
            <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px; color: #801414; text-transform: uppercase;">
              ${isGstBill ? (isMultiPage ? `CASH/CREDIT BILL (PAGE ${pageIndex + 1} OF ${totalPages})` : 'CASH/CREDIT BILL') : `ESTIMATE (PAGE ${pageIndex + 1} OF ${totalPages})`}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #801414;">
              M/s. <span style="color: #000000;">${bill.customerName || ''}</span>
              ${bill.customerGst ? `<span style="font-size: 12px; color: #801414; margin-left: 6px;">(GST: <span style="color: #000000;">${bill.customerGst}</span>)</span>` : ''}
            </div>
          </div>
        `;
      }

      return `
        <div class="varun-bill-container varun-bill-page" style="${!isLastPage ? 'margin-bottom: 24px;' : ''}">
          ${headerHtml}

          <!-- Particulars Items Table (15 rows) -->
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #801414; margin-top: 4px; font-size: 12.5px; position: relative;">
            <thead>
              <tr style="background-color: #FFFFFF; color: #801414;">
                <th rowspan="2" style="width: 7%; border: 1px solid #801414; padding: 5px 4px; text-align: center; font-weight: 900; font-size: 14px;">
                  S.No
                </th>
                <th rowspan="2" style="width: 47%; border: 1px solid #801414; padding: 5px 8px; text-align: center; font-weight: 900; font-size: 14px;">
                  Particulars
                </th>
                <th rowspan="2" style="width: 12%; border: 1px solid #801414; padding: 5px 4px; text-align: center; font-weight: 900; font-size: 14px;">
                  Quantity
                </th>
                <th rowspan="2" style="width: 14%; border: 1px solid #801414; padding: 5px 4px; text-align: center; font-weight: 900; font-size: 14px;">
                  Rate
                </th>
                <th colspan="2" style="width: 20%; border: 1px solid #801414; padding: 4px 2px; text-align: center; font-weight: 900; font-size: 14px;">
                  Amount
                </th>
              </tr>
              <tr style="background-color: #FFFFFF; color: #801414;">
                <th style="width: 14%; border: 1px solid #801414; padding: 3px 2px; text-align: center; font-weight: 900; font-size: 12.5px;">
                  Rs.
                </th>
                <th style="width: 6%; border: 1px solid #801414; padding: 3px 2px; text-align: center; font-weight: 900; font-size: 12.5px;">
                  Ps.
                </th>
              </tr>
            </thead>
            <tbody>
              ${productRowsHtml}
              ${emptyRowsHtml}
              ${summaryRowsHtml}
            </tbody>
          </table>

          ${footerHtml}
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill #${bill.billNo || 'Invoice'} - ${displayCompanyName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #801414;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .varun-bill-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background-color: #FFFFFF;
      color: #801414;
      border: 2px solid #801414;
      border-radius: 10px;
      padding: 10px 14px 12px 14px;
      box-sizing: border-box;
      position: relative;
    }
    .varun-bill-page {
      page-break-after: always !important;
      break-after: page !important;
      box-sizing: border-box;
    }
    .varun-bill-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    @media print {
      .varun-bill-page {
        margin-bottom: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
  `;
};

export const printBillDirectly = (bill: BillPrintData) => {
  const htmlContent = generateBillHtml(bill);
  triggerBrowserPrint(htmlContent);
};

/**
 * =======================================================================
 * MASTER / BULK LIST PRINT GENERATORS (Standard A4 Format)
 * =======================================================================
 */

export const generateCustomerListPrintHtml = (
  customers: any[],
  reportTitle = 'CUSTOMERS MASTER LEDGER & BALANCES REPORT',
  dateRangeText?: string
): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'VARUN TRADE').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;
  const phoneVal = storeSettings.phone || '+91 98765 43210';

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '-');
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let totalDebit = 0;
  let totalCredit = 0;
  let totalPendingDue = 0;
  let totalAdvanceHeld = 0;

  customers.forEach((c) => {
    const deb = c.totalDebit || 0;
    const cred = c.totalCredit || 0;
    const due = c.pendingDue || 0;
    const net = c.netBalance || 0;

    totalDebit += deb;
    totalCredit += cred;
    totalPendingDue += due;
    if (net > 0) totalAdvanceHeld += net;
  });

  const rowsHtml = customers.map((c, idx) => {
    const idDisplay = c.idCode || `#${(idx + 1).toString().padStart(4, '0')}`;
    const deb = (c.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const cred = (c.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    let balanceHtml = '';
    if ((c.pendingDue || 0) > 0) {
      balanceHtml = `<span style="color:#DC2626; font-weight:800;">₹ ${(c.pendingDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Due)</span>`;
    } else if ((c.netBalance || 0) > 0) {
      balanceHtml = `<span style="color:#0284C7; font-weight:800;">+₹ ${(c.netBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Adv)</span>`;
    } else {
      balanceHtml = `<span style="color:#16A34A; font-weight:700;">₹ 0.00 (Settled)</span>`;
    }

    return `
      <tr class="list-row">
        <td class="text-center" style="width: 35px;">${idx + 1}</td>
        <td class="text-center" style="width: 60px; font-weight:700; color:#475569;">${idDisplay}</td>
        <td style="font-weight:800; color:#0F172A;">
          ${c.name}
          ${c.gst && c.gst !== 'N/A' ? `<div style="font-size:9.5px; color:#64748B; font-weight:600;">GSTIN: ${c.gst}</div>` : ''}
        </td>
        <td style="font-size:11px; color:#334155; width:95px;">${c.mobile || '-'}</td>
        <td style="font-size:10.5px; color:#475569; max-width:180px;">${c.address || '-'}</td>
        <td class="text-right" style="font-weight:700; color:#1E293B; width:105px;">₹ ${deb}</td>
        <td class="text-right" style="font-weight:700; color:#16A34A; width:105px;">₹ ${cred}</td>
        <td class="text-right" style="width:130px;">${balanceHtml}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${reportTitle} - ${compName} - ${currentDate}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-container {
      width: 100%;
      padding: 6px;
    }
    .company-banner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .comp-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.01em;
      color: #0B4DB7;
    }
    .comp-sub {
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .report-heading {
      font-size: 14.5px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 3px;
    }
    .date-badge {
      display: inline-block;
      background-color: #EFF6FF;
      color: #0B4DB7;
      border: 1px solid #BFDBFE;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #334155;
      line-height: 1.35;
    }
    .meta-bold {
      font-weight: 700;
      color: #000000;
    }
    .kpi-summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #CBD5E1;
      border-radius: 5px;
      padding: 6px 8px;
      background-color: #F8FAFC;
    }
    .kpi-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 13.5px;
      font-weight: 900;
      color: #0F172A;
      margin-top: 2px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1px solid #000000;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      page-break-inside: avoid;
    }
    .data-table th {
      background-color: #F1F5F9;
      color: #0F172A;
      font-weight: 800;
      font-size: 10.5px;
      padding: 6px 5px;
      border: 1px solid #94A3B8;
      text-align: left;
      letter-spacing: 0.02em;
    }
    .data-table td {
      padding: 5px 5px;
      border: 1px solid #CBD5E1;
      vertical-align: middle;
    }
    .text-center {
      text-align: center !important;
    }
    .text-right {
      text-align: right !important;
    }
    .totals-row td {
      background-color: #F8FAFC;
      border-top: 2px solid #000000 !important;
      border-bottom: 2px solid #000000 !important;
      font-size: 11.5px;
      font-weight: 900;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 22px;
      padding: 0 15px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 160px;
    }
    .sig-line {
      border-top: 1px solid #000000;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header Banner -->
    <div class="company-banner">
      <div>
        <div class="comp-name">${compName}</div>
        <div class="comp-sub">${compSub}</div>
        <div class="report-heading">${reportTitle}</div>
        ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
      </div>
      <div class="meta-box">
        <div>Generated: <span class="meta-bold">${currentDate} ${currentTime}</span></div>
        <div>Total Records: <span class="meta-bold">${customers.length} Customers</span></div>
        <div>Phone: ${phoneVal}</div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="kpi-summary-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Customers</div>
        <div class="kpi-val">${customers.length}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Debit (Purchases)</div>
        <div class="kpi-val">₹ ${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Credit (Paid)</div>
        <div class="kpi-val" style="color:#16A34A;">₹ ${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card" style="background-color:#FEF2F2; border-color:#FECACA;">
        <div class="kpi-title" style="color:#991B1B;">Total Pending Due</div>
        <div class="kpi-val" style="color:#DC2626;">₹ ${totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card" style="background-color:#F0F9FF; border-color:#BAE6FD;">
        <div class="kpi-title" style="color:#0369A1;">Total Advance Balances</div>
        <div class="kpi-val" style="color:#0284C7;">₹ ${totalAdvanceHeld.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>

    <!-- Master Customer Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 35px;">#</th>
          <th class="text-center" style="width: 60px;">ID</th>
          <th>Customer Name</th>
          <th style="width: 95px;">Mobile</th>
          <th>Address</th>
          <th class="text-right" style="width: 105px;">Debit (Dr)</th>
          <th class="text-right" style="width: 105px;">Credit (Cr)</th>
          <th class="text-right" style="width: 130px;">Net Balance / Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="8" class="text-center" style="padding: 20px;">No customer records found for the selected range.</td></tr>'}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="5" class="text-right" style="padding-right: 10px;">GRAND TOTALS (${customers.length} Customers):</td>
          <td class="text-right">₹ ${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right" style="color:#16A34A;">₹ ${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">
            ${
              totalPendingDue > 0
                ? `<span style="color:#DC2626;">Due: ₹ ${totalPendingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>`
                : `<span style="color:#16A34A;">Settled</span>`
            }
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Prepared By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Checked & Verified By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const printCustomerListDirectly = (customers: any[], reportTitle?: string, dateRangeText?: string) => {
  const htmlContent = generateCustomerListPrintHtml(customers, reportTitle, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Customer Account Statement / Ledger History (A4 Standard)
 */
export const generateLedgerStatementHtml = (
  customerName: string,
  ledgerEntries: any[],
  dateRangeText?: string
): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'VARUN TRADE').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;

  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  let totalDeb = 0;
  let totalCred = 0;

  const rowsHtml = ledgerEntries.map((entry, idx) => {
    const deb = parseFloat(String(entry.debit || '0').replace(/,/g, '')) || 0;
    const cred = parseFloat(String(entry.credit || '0').replace(/,/g, '')) || 0;
    totalDeb += deb;
    totalCred += cred;

    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center">${entry.date || '-'}</td>
        <td style="font-weight:700;">${entry.billNo ? `Bill #${entry.billNo}` : entry.type || 'PAYMENT'}</td>
        <td>${entry.companyName || '-'}</td>
        <td class="text-right" style="color:#1E293B; font-weight:700;">${deb > 0 ? `₹ ${deb.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
        <td class="text-right" style="color:#16A34A; font-weight:700;">${cred > 0 ? `₹ ${cred.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
        <td class="text-right" style="font-weight:800;">₹ ${entry.balance || '0.00'}</td>
      </tr>
    `;
  }).join('');

  const netBalance = totalCred - totalDeb;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Account Statement - ${customerName} - ${compName}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 900; color: #0B4DB7; }
    .sub { font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; }
    .date-badge { display: inline-block; background: #EFF6FF; color: #0B4DB7; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #000; margin-top: 8px; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 6px; font-weight: 800; font-size: 11px; }
    .table td { border: 1px solid #CBD5E1; padding: 5px 6px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals td { background: #F8FAFC; border-top: 2px solid #000; font-weight: 800; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${compName}</div>
      <div class="sub">${compSub}</div>
      <h2 style="font-size:15px; margin-top:4px;">ACCOUNT STATEMENT: ${customerName}</h2>
      ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Generated: <b>${currentDate}</b></div>
      <div>Total Entries: <b>${ledgerEntries.length}</b></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="text-center" style="width:35px;">#</th>
        <th class="text-center" style="width:85px;">Date</th>
        <th>Particulars / Bill No</th>
        <th>Company</th>
        <th class="text-right" style="width:110px;">Debit (Dr)</th>
        <th class="text-right" style="width:110px;">Credit (Cr)</th>
        <th class="text-right" style="width:120px;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" class="text-center" style="padding:18px;">No transaction entries found for the selected period.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="4" class="text-right">TOTALS:</td>
        <td class="text-right">₹ ${totalDeb.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="text-right" style="color:#16A34A;">₹ ${totalCred.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td class="text-right" style="color:${netBalance < 0 ? '#DC2626' : '#16A34A'};">
          ₹ ${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${netBalance < 0 ? 'Dr' : 'Cr'}
        </td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
  `;
};

export const printLedgerStatementDirectly = (customerName: string, ledgerEntries: any[], dateRangeText?: string) => {
  const htmlContent = generateLedgerStatementHtml(customerName, ledgerEntries, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Particulars Bills Master List (A4 Standard)
 */
export const generateParticularsListPrintHtml = (particulars: any[], dateRangeText?: string): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'VARUN TRADE').toUpperCase();
  const compSub = storeSettings.tagline || `Wholesale & Retail Trading • ${storeSettings.city || 'Sivakasi'}`;

  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  let totalSum = 0;

  const rowsHtml = particulars.map((p, idx) => {
    const amt = parseFloat(String(p.total || p.amount || '0').replace(/,/g, '')) || 0;
    totalSum += amt;
    const countItems = (p.products || []).length;
    const billCompName = (p.companyName && p.companyName.trim() !== '' && p.companyName !== 'General')
      ? p.companyName
      : storeSettings.companyName || '-';

    return `
      <tr>
        <td class="text-center" style="width:35px;">${idx + 1}</td>
        <td class="text-center" style="font-weight:800; color:#0B4DB7; width:75px;">#${p.billNo || '-'}</td>
        <td class="text-center" style="width:85px;">${p.date || '-'}</td>
        <td style="font-weight:700;">${p.customerName || '-'}</td>
        <td>${billCompName}</td>
        <td class="text-center" style="width:60px;">${p.caseCount || '-'}</td>
        <td class="text-center" style="width:75px;">${countItems} items</td>
        <td class="text-right" style="font-weight:800; width:120px;">₹ ${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Particulars Bills Master Report - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #000; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 900; color: #0B4DB7; }
    .date-badge { display: inline-block; background: #EFF6FF; color: #0B4DB7; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000; margin-top: 8px; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 6px; font-weight: 800; }
    .table td { border: 1px solid #CBD5E1; padding: 5px 6px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals td { background: #F8FAFC; border-top: 2px solid #000; font-weight: 900; font-size: 11.5px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${compName}</div>
      <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">${compSub}</div>
      <h2 style="font-size:15px; margin-top:4px;">PARTICULARS BILLS MASTER REPORT</h2>
      ${dateRangeText ? `<div class="date-badge">${dateRangeText}</div>` : ''}
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Generated: <b>${currentDate}</b></div>
      <div>Total Bills: <b>${particulars.length}</b></div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="text-center" style="width:35px;">#</th>
        <th class="text-center" style="width:75px;">Bill No</th>
        <th class="text-center" style="width:85px;">Date</th>
        <th>Customer Name</th>
        <th>Company</th>
        <th class="text-center" style="width:60px;">Cases</th>
        <th class="text-center" style="width:75px;">Products</th>
        <th class="text-right" style="width:120px;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" class="text-center" style="padding:18px;">No bill records found for the selected period.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="totals">
        <td colspan="7" class="text-right">GRAND TOTAL (${particulars.length} Bills):</td>
        <td class="text-right">₹ ${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>
  `;
};

export const printParticularsListDirectly = (particulars: any[], dateRangeText?: string) => {
  const htmlContent = generateParticularsListPrintHtml(particulars, dateRangeText);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Companies List (A4 Standard)
 */
export const generateCompaniesListPrintHtml = (companies: any[]): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'VARUN TRADE').toUpperCase();
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const rowsHtml = companies.map((c, idx) => `
    <tr>
      <td class="text-center" style="width:40px;">${idx + 1}</td>
      <td style="font-weight:700; color:#0F172A;">${c.name}</td>
      <td style="color:#334155;">${c.gstin || '-'}</td>
      <td style="color:#475569;">${c.address || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Companies List - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #000; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 7px; font-weight: 800; }
    .table td { border: 1px solid #CBD5E1; padding: 6px; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:24px; font-weight:900; color:#0B4DB7;">${compName}</div>
      <h2 style="font-size:15px;">COMPANIES DIRECTORY</h2>
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Date: <b>${currentDate}</b></div>
      <div>Total Companies: <b>${companies.length}</b></div>
    </div>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th class="text-center">#</th>
        <th>Company Name</th>
        <th>GSTIN</th>
        <th>Address</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="4" class="text-center">No companies found.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
  `;
};

export const printCompaniesListDirectly = (companies: any[]) => {
  const htmlContent = generateCompaniesListPrintHtml(companies);
  triggerBrowserPrint(htmlContent);
};

/**
 * Print Products List (A4 Standard)
 */
export const generateProductsListPrintHtml = (products: any[]): string => {
  const storeSettings = getStoredSettings();
  const compName = (storeSettings.companyName || 'VARUN TRADE').toUpperCase();
  const currentDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  const rowsHtml = products.map((p, idx) => `
    <tr>
      <td class="text-center" style="width:40px;">${idx + 1}</td>
      <td style="font-weight:700; color:#0F172A;">${p.name}</td>
      <td class="text-center" style="color:#64748B;">${p.hsnCode || '-'}</td>
      <td style="text-align:right; font-weight:700; color:#0B4DB7;">₹ ${(parseFloat(p.rate) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Products Catalog - ${compName} - ${currentDate}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin:0; padding:10px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #000; }
    .table th { background: #F1F5F9; border: 1px solid #94A3B8; padding: 7px; font-weight: 800; }
    .table td { border: 1px solid #CBD5E1; padding: 6px; }
    .text-center { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:24px; font-weight:900; color:#0B4DB7;">${compName}</div>
      <h2 style="font-size:15px;">PRODUCTS PRICE CATALOG</h2>
    </div>
    <div style="text-align:right; font-size:11.5px;">
      <div>Date: <b>${currentDate}</b></div>
      <div>Total Products: <b>${products.length}</b></div>
    </div>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th class="text-center">#</th>
        <th>Product Name</th>
        <th class="text-center">HSN Code</th>
        <th style="text-align:right;">Default Rate</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="4" class="text-center">No products found.</td></tr>'}
    </tbody>
  </table>
</body>
</html>
  `;
};

export const printProductsListDirectly = (products: any[]) => {
  const htmlContent = generateProductsListPrintHtml(products);
  triggerBrowserPrint(htmlContent);
};

/**
 * Reusable hidden-iframe print helper with image loading support
 */
const triggerBrowserPrint = (htmlContent: string) => {
  // Always remove any previous print iframe to ensure a completely fresh print context
  const existingIframe = document.getElementById('varun-print-iframe') || document.getElementById('dheeksha-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'varun-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();

    let hasPrinted = false;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const doPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;

      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (e) {
          console.error('Error triggering print:', e);
        }
      }, 150);
    };

    // Wait for all images in the print document to load
    const images = Array.from(doc.images);
    if (images.length === 0) {
      doPrint();
    } else {
      let loaded = 0;
      const total = images.length;
      const checkAllLoaded = () => {
        loaded++;
        if (loaded >= total) {
          doPrint();
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.onload = checkAllLoaded;
          img.onerror = checkAllLoaded;
        }
      });

      // Safety fallback only if images take too long to respond
      safetyTimer = setTimeout(doPrint, 1200);
    }
  }
};
