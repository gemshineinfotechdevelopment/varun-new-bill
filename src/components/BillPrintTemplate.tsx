import React from 'react';
import { getStoredSettings } from './SettingsPage';
import { numberToWords } from '../utils/numberToWords';
import { isGstBillRecord } from '../utils/printUtils';
import { VINAYAGAR_IMAGE_BASE64, FLOWERPOT_IMAGE_BASE64 } from '../assets/billImages';

export interface BillPrintProduct {
  particular: string;
  quantity: string | number;
  rate: string | number;
  pktUnit?: string | number;
  amount: string | number;
  hsn?: string;
}

export interface BillPrintData {
  billNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerState?: string;
  stateCode?: string;
  companyName?: string;
  preparedBy?: string;
  phone?: string;
  email?: string;
  website?: string;
  transport?: string;
  caseCount?: string | number;
  products: BillPrintProduct[];
  amount?: string | number;
  discount?: string | number;
  packing?: string | number;
  tax?: string | number;
  cgst?: string | number;
  sgst?: string | number;
  igst?: string | number;
  total?: string | number;
  paymentStatus?: string;
  paymentMode?: string;
  paidAmount?: string | number;
  notes?: string;
  pdfData?: string;
  pdfUrl?: string;
  pdfName?: string;
  billType?: 'REGULAR' | 'GST';
  roundOff?: string | number;
  vehicleNo?: string;
}

interface BillPrintTemplateProps {
  bill: BillPrintData;
}

export const BillPrintTemplate: React.FC<BillPrintTemplateProps> = ({ bill }) => {
  const [storeSettings, setStoreSettings] = React.useState(() => getStoredSettings());

  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoredSettings());
    };
    window.addEventListener('varun_settings_updated', handleSettingsUpdate);
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('varun_settings_updated', handleSettingsUpdate);
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const isGstBill = isGstBillRecord(bill);

  // Header Details (Defaults from official bill scan)
  const displayCompanyName =
    bill.companyName && bill.companyName.trim() !== '' && bill.companyName !== 'General'
      ? bill.companyName
      : storeSettings.companyName || 'VARUN TRADERS';

  const gstinDisplay = storeSettings.gstin || '33AFPPA3625M1ZF';
  const stateCodeDisplay = '33';
  const phone1 = storeSettings.phone || '94443 56298';
  const phone2 = storeSettings.whatsapp && storeSettings.whatsapp !== phone1 ? storeSettings.whatsapp : '90802 25281';

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
  const transportAmt = (!isNaN(Number(rawTransportStr)) && parseFloat(cleanTrans) > 0) ? parseFloat(cleanTrans) : 0;

  // Packing
  const rawPackStr = String(bill.packing ?? '').trim();
  const cleanPack = rawPackStr.replace(/[^0-9.]/g, '');
  const packNum = parseFloat(cleanPack) || 0;

  // Tax calculation rates (CGST, SGST, IGST as optional inputs)
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

  // Exact 15 products per single page as requested by user
  const ROWS_PER_PAGE = 15;
  const allProducts = bill.products || [];
  const pages: BillPrintProduct[][] = [];

  if (allProducts.length <= ROWS_PER_PAGE) {
    pages.push(allProducts);
  } else {
    for (let i = 0; i < allProducts.length; i += ROWS_PER_PAGE) {
      pages.push(allProducts.slice(i, i + ROWS_PER_PAGE));
    }
  }
  const totalPages = pages.length;

  return (
    <div className="varun-bill-pages-wrapper" style={{ width: '100%' }}>
      {pages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const isMultiPage = totalPages > 1;

        // Continuous S.No across pages
        const startIndex = pageIndex * ROWS_PER_PAGE;
        // Exactly 15 product rows on every page (padded with empty lines)
        const emptyRowCount = Math.max(0, ROWS_PER_PAGE - pageProducts.length);
        const emptyRows = Array.from({ length: emptyRowCount });

        const getItemAmount = (p: BillPrintProduct): number => {
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

        // Sum of products on THIS page only
        const pageThisProdSum = pageProducts.reduce((acc, p) => acc + getItemAmount(p), 0);

        // Previous pages cumulative subtotal (for breakdown note on Page 2+)
        const prevCumulativeSubtotal = pageIndex > 0
          ? allProducts.slice(0, startIndex).reduce((acc, p) => acc + getItemAmount(p), 0)
          : 0;

        // Cumulative subtotal up to this page:
        // Page 1 has ONLY Page 1 total; Page 2 adds Page 1 total + Page 2 products!
        const cumulativeProducts = allProducts.slice(0, startIndex + pageProducts.length);
        const prodSubtotal = cumulativeProducts.reduce((acc, p) => acc + getItemAmount(p), 0);
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

        return (
          <div
            key={pageIndex}
            className="varun-bill-container varun-bill-page"
            style={{
              width: '100%',
              maxWidth: '820px',
              margin: '0 auto',
              marginBottom: isLastPage ? '0px' : '24px',
              backgroundColor: '#FFFFFF',
              color: '#801414',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              border: '2px solid #801414',
              borderRadius: '10px',
              padding: '10px 14px 12px 14px',
              boxSizing: 'border-box',
              position: 'relative',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            {/* ======================================================================= */}
            {/* 1. HEADER SECTION (First Page has full shop details; Next Pages have compact bill bar) */}
            {/* ======================================================================= */}
            {isFirstPage ? (
              // FIRST PAGE FULL SHOP HEADER
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: '2px',
                  }}
                >
                  {/* Left: GSTIN & State Code (Only on GST Bill) */}
                  {isGstBill ? (
                    <div style={{ flex: '0 0 24%', textAlign: 'left', lineHeight: 1.3 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#801414', letterSpacing: '0.2px' }}>
                        GSTIN : {gstinDisplay}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#801414', marginTop: '1px' }}>
                        STATE CODE : {stateCodeDisplay}
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: '0 0 24%' }} />
                  )}

                  {/* Center: Om + Badge (ESTIMATE on normal bill, TAX INVOICE on GST bill) */}
                  <div style={{ flex: '1 1 auto', textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 900,
                        lineHeight: 1,
                        color: '#801414',
                        marginBottom: '2px',
                        fontFamily: 'serif',
                      }}
                    >
                      ॐ
                    </div>
                    {isGstBill ? (
                      <>
                        <div
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#801414',
                            color: '#FFFFFF',
                            fontWeight: 900,
                            fontSize: '13px',
                            letterSpacing: '1px',
                            padding: '2px 14px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          TAX INVOICE
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                            marginTop: '2px',
                            color: '#801414',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isMultiPage ? `CASH/CREDIT BILL (PAGE 1 OF ${totalPages})` : 'CASH/CREDIT BILL'}
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#801414',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: '13.5px',
                          letterSpacing: '2px',
                          padding: '2px 18px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                          marginBottom: '2px',
                        }}
                      >
                        ESTIMATE
                      </div>
                    )}
                  </div>

                  {/* Right: Phone Numbers with Icon */}
                  <div style={{ flex: '0 0 24%', textAlign: 'right', lineHeight: 1.3 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#801414', lineHeight: 1 }}>📞</span>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#801414' }}>{phone1}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#801414', marginTop: '1px' }}>
                      {phone2}
                    </div>
                  </div>
                </div>

                {/* Flanked Company Title Row: Left Vinayagar + Brand Title + Right Flowerpot */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '1px 0 3px 0',
                  }}
                >
                  {/* Left: Vinayagar Photo */}
                  <div style={{ flex: '0 0 72px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={VINAYAGAR_IMAGE_BASE64}
                      alt="Lord Vinayagar"
                      style={{
                        width: '70px',
                        height: '86px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>

                  {/* Center: Brand Name & Address */}
                  <div style={{ flex: '1 1 auto', textAlign: 'center', padding: '0 8px' }}>
                    <h1
                      style={{
                        margin: '0',
                        fontFamily: '"Times New Roman", Georgia, serif',
                        fontSize: '36px',
                        fontWeight: 900,
                        letterSpacing: '2px',
                        color: '#801414',
                        textTransform: 'uppercase',
                        lineHeight: 1.05,
                        textShadow: '0.5px 0.5px 0px rgba(128,20,20,0.2)',
                      }}
                    >
                      {displayCompanyName}
                    </h1>

                    <div
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontStyle: 'italic',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#801414',
                        marginTop: '1px',
                      }}
                    >
                      {tagline}
                    </div>

                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#801414',
                        marginTop: '2px',
                        letterSpacing: '0.2px',
                      }}
                    >
                      {fullAddress}
                    </div>
                  </div>

                  {/* Right: Flower Pot Cracker Image */}
                  <div style={{ flex: '0 0 72px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={FLOWERPOT_IMAGE_BASE64}
                      alt="Fireworks Flower Pot"
                      style={{
                        width: '70px',
                        height: '86px',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>

                {/* Horizontal Divider */}
                <div style={{ borderTop: '1.5px solid #801414', margin: '3px 0 5px 0' }} />

                {/* Bill Info & Customer (M/s) Section */}
                <div style={{ padding: '0 2px' }}>
                  {/* Row 1: Bill No. (Left) & Date (Right) */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: '0 0 45%' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                        Bill No.
                      </span>
                      <div
                        style={{
                          flex: 1,
                          borderBottom: '1.5px dotted #801414',
                          minHeight: '19px',
                          paddingLeft: '6px',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: '#000000',
                        }}
                      >
                        {bill.billNo || ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: '0 0 38%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                        Date :
                      </span>
                      <div
                        style={{
                          flex: 1,
                          borderBottom: '1.5px dotted #801414',
                          minHeight: '19px',
                          paddingLeft: '6px',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: '#000000',
                        }}
                      >
                        {bill.date || ''}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: M/s Customer Name (Line 1) */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                      M/s.
                    </span>
                    <div
                      style={{
                        flex: 1,
                        borderBottom: '1.5px dotted #801414',
                        minHeight: '19px',
                        paddingLeft: '8px',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#000000',
                      }}
                    >
                      {bill.customerName || ''}
                    </div>
                  </div>

                  {/* Row 3: Customer Address Line 2 */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <div
                      style={{
                        flex: 1,
                        borderBottom: '1.5px dotted #801414',
                        minHeight: '19px',
                        paddingLeft: '32px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#1e293b',
                      }}
                    >
                      {[bill.customerAddress, bill.customerPhone ? `Ph: ${bill.customerPhone}` : ''].filter(Boolean).join(' | ')}
                    </div>
                  </div>

                  {/* Row 4: Blank dotted guide line 3 */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '5px' }}>
                    <div
                      style={{
                        flex: 1,
                        borderBottom: '1.5px dotted #801414',
                        minHeight: '15px',
                        paddingLeft: '32px',
                      }}
                    />
                  </div>
                </div>

                {/* Horizontal Divider Line */}
                <div style={{ borderTop: '1px solid #801414', margin: '3px 0 5px 0' }} />

                {/* Row 5: Party's GSTIN (Left) & State (Right) - ONLY ON GST BILL */}
                {isGstBill && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 2px 3px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: '0 0 52%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                        Party's GSTIN :
                      </span>
                      <div
                        style={{
                          flex: 1,
                          borderBottom: '1.5px dotted #801414',
                          minHeight: '18px',
                          paddingLeft: '6px',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#000000',
                        }}
                      >
                        {bill.customerGst || ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', flex: '0 0 38%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                        State :
                      </span>
                      <div
                        style={{
                          flex: 1,
                          borderBottom: '1.5px dotted #801414',
                          minHeight: '18px',
                          paddingLeft: '6px',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#000000',
                        }}
                      >
                        {bill.customerState || 'Tamil Nadu'}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // NEXT PAGE COMPACT CONTINUATION HEADER (NO SHOP NAME DETAILS)
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 4px 6px 4px',
                  borderBottom: '1.5px solid #801414',
                  marginBottom: '6px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#801414' }}>
                  Bill No. : <span style={{ color: '#000000' }}>{bill.billNo || ''}</span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  Date : <span style={{ color: '#000000' }}>{bill.date || ''}</span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    color: '#801414',
                    textTransform: 'uppercase',
                  }}
                >
                  {isGstBill
                    ? `CASH/CREDIT BILL (PAGE ${pageIndex + 1} OF ${totalPages})`
                    : `ESTIMATE (PAGE ${pageIndex + 1} OF ${totalPages})`}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#801414' }}>
                  M/s. <span style={{ color: '#000000' }}>{bill.customerName || ''}</span>
                  {bill.customerGst ? (
                    <span style={{ fontSize: '12px', color: '#801414', marginLeft: '6px' }}>
                      (GST: <span style={{ color: '#000000' }}>{bill.customerGst}</span>)
                    </span>
                  ) : null}
                </div>
              </div>
            )}

            {/* ======================================================================= */}
            {/* 2. PARTICULARS ITEMS TABLE (EXACTLY 15 ROWS PER PAGE) */}
            {/* ======================================================================= */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #801414',
                marginTop: '4px',
                fontSize: '12.5px',
                position: 'relative',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#FFFFFF', color: '#801414' }}>
                  <th
                    rowSpan={2}
                    style={{
                      width: '7%',
                      border: '1px solid #801414',
                      padding: '5px 4px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    S.No
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      width: '47%',
                      border: '1px solid #801414',
                      padding: '5px 8px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    Particulars
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      width: '12%',
                      border: '1px solid #801414',
                      padding: '5px 4px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    Quantity
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      width: '14%',
                      border: '1px solid #801414',
                      padding: '5px 4px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    Rate
                  </th>
                  <th
                    colSpan={2}
                    style={{
                      width: '20%',
                      border: '1px solid #801414',
                      padding: '4px 2px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '14px',
                    }}
                  >
                    Amount
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#FFFFFF', color: '#801414' }}>
                  <th
                    style={{
                      width: '14%',
                      border: '1px solid #801414',
                      padding: '3px 2px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '12.5px',
                    }}
                  >
                    Rs.
                  </th>
                  <th
                    style={{
                      width: '6%',
                      border: '1px solid #801414',
                      padding: '3px 2px',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '12.5px',
                    }}
                  >
                    Ps.
                  </th>
                </tr>
              </thead>

              <tbody>
                {/* 15 Product Rows for This Page */}
                {pageProducts.map((item, idx) => {
                  const serialNumber = startIndex + idx + 1;
                  const numQty = parseFloat(String(item.quantity).replace(/,/g, '')) || 0;
                  const numRate = parseFloat(String(item.rate).replace(/,/g, '')) || 0;
                  const numAmt = (numRate > 0 && numQty > 0)
                    ? numRate * numQty
                    : (parseFloat(String(item.amount).replace(/,/g, '')) || 0);
                  const amtSplit = splitRsPs(numAmt);
                  return (
                    <tr key={idx} style={{ height: '24px' }}>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          padding: '3px 6px',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          color: '#000000',
                        }}
                      >
                        {serialNumber}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'left',
                          padding: '3px 10px',
                          fontWeight: 700,
                          color: '#000000',
                        }}
                      >
                        {item.particular || '-'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          padding: '3px 4px',
                          fontWeight: 700,
                          color: '#000000',
                        }}
                      >
                        {item.quantity || ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          padding: '3px 6px',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          color: '#000000',
                        }}
                      >
                        {numRate > 0 ? numRate.toFixed(2) : ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          padding: '3px 6px',
                          fontWeight: 700,
                          color: '#000000',
                        }}
                      >
                        {amtSplit.rs}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          padding: '3px 2px',
                          fontWeight: 600,
                          color: '#000000',
                        }}
                      >
                        {amtSplit.ps}
                      </td>
                    </tr>
                  );
                })}

                {/* Empty Ruled Rows to pad up to standard 15 rows on every page */}
                {emptyRows.map((_, idx) => (
                  <tr key={`empty-${idx}`} style={{ height: '24px' }}>
                    <td style={{ border: '1px solid #801414', padding: '3px 8px' }} />
                    <td style={{ border: '1px solid #801414', padding: '2px 8px' }} />
                    <td style={{ border: '1px solid #801414', padding: '3px' }} />
                    <td style={{ border: '1px solid #801414', padding: '3px' }} />
                    <td style={{ border: '1px solid #801414', padding: '3px' }} />
                    <td style={{ border: '1px solid #801414', padding: '3px' }} />
                  </tr>
                ))}

                {/* =================================================================== */}
                {/* 3. TABLE BOTTOM / SUMMARY ROWS (FIXED ON ALL PAGES) */}
                {/* =================================================================== */}
                {/* Row 1: TOTAL */}
                <tr>
                  <td
                    colSpan={3}
                    rowSpan={isGstBill ? 5 : 2}
                    style={{
                      border: '1px solid #801414',
                      verticalAlign: 'bottom',
                      padding: '5px 10px',
                      textAlign: 'left',
                    }}
                  >
                    {isGstBill && (
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#801414' }}>
                        E & O.E
                      </div>
                    )}
                    {pageIndex > 0 ? (
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#801414', marginTop: '3px', lineHeight: 1.35 }}>
                        <div>{pageIndex === 1 ? 'Page 1 Total B/F' : `Pages 1-${pageIndex} Total B/F`} : ₹{splitRsPs(prevCumulativeSubtotal).rs}.{splitRsPs(prevCumulativeSubtotal).ps}</div>
                        <div>This Page Products &nbsp;&nbsp;&nbsp;: ₹{splitRsPs(pageThisProdSum).rs}.{splitRsPs(pageThisProdSum).ps}</div>
                        <div style={{ fontWeight: 900 }}>
                          (Total = ₹{splitRsPs(pageSubtotal).rs}.{splitRsPs(pageSubtotal).ps}{!isLastPage ? ` — c/f to Page ${pageIndex + 2}` : ''})
                        </div>
                      </div>
                    ) : isMultiPage ? (
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#801414', marginTop: '3px' }}>
                        (Page 1 Total : ₹{splitRsPs(pageSubtotal).rs}.{splitRsPs(pageSubtotal).ps} — c/f to Page 2)
                      </div>
                    ) : null}
                    {isGstBill && (() => {
                      const settingsTerms =
                        (storeSettings.billTerms && storeSettings.billTerms.trim()) ||
                        (typeof window !== 'undefined' ? (localStorage.getItem('varun_gst_bill_terms') || '').trim() : '');
                      const billNotesClean = (bill.notes || '').replace(/^\[GST_BILL\]\s*/, '').trim();
                      const displayNotes = settingsTerms || billNotesClean || '';
                      if (!displayNotes) return null;
                      return (
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: '#801414',
                            marginTop: '5px',
                            lineHeight: 1.35,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {displayNotes}
                        </div>
                      );
                    })()}
                  </td>
                  <td
                    style={{
                      border: '1px solid #801414',
                      textAlign: 'right',
                      fontWeight: 900,
                      fontSize: '12.5px',
                      color: '#801414',
                      padding: '4px 8px',
                    }}
                  >
                    TOTAL
                  </td>
                  <td
                    style={{
                      border: '1px solid #801414',
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      color: '#000000',
                      padding: '4px 6px',
                    }}
                  >
                    {splitRsPs(pageSubtotal).rs}
                  </td>
                  <td
                    style={{
                      border: '1px solid #801414',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: '#000000',
                      padding: '4px 2px',
                    }}
                  >
                    {splitRsPs(pageSubtotal).ps}
                  </td>
                </tr>

                {/* CGST, SGST, IGST Rows - ONLY ON GST BILL */}
                {isGstBill && (
                  <>
                    {/* Row 2: CGST % */}
                    <tr>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '12px',
                          color: '#801414',
                          padding: '3px 8px',
                        }}
                      >
                        CGST {cgstPercent > 0 ? `${cgstPercent}%` : '%'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#000000',
                          padding: '3px 6px',
                        }}
                      >
                        {pageCgstAmt > 0 ? splitRsPs(pageCgstAmt).rs : ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '11.5px',
                          color: '#000000',
                          padding: '3px 2px',
                        }}
                      >
                        {pageCgstAmt > 0 ? splitRsPs(pageCgstAmt).ps : ''}
                      </td>
                    </tr>

                    {/* Row 3: SGST % */}
                    <tr>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '12px',
                          color: '#801414',
                          padding: '3px 8px',
                        }}
                      >
                        SGST {sgstPercent > 0 ? `${sgstPercent}%` : '%'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#000000',
                          padding: '3px 6px',
                        }}
                      >
                        {pageSgstAmt > 0 ? splitRsPs(pageSgstAmt).rs : ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '11.5px',
                          color: '#000000',
                          padding: '3px 2px',
                        }}
                      >
                        {pageSgstAmt > 0 ? splitRsPs(pageSgstAmt).ps : ''}
                      </td>
                    </tr>

                    {/* Row 4: IGST % */}
                    <tr>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 800,
                          fontSize: '12px',
                          color: '#801414',
                          padding: '3px 8px',
                        }}
                      >
                        IGST {igstPercent > 0 ? `${igstPercent}%` : '%'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#000000',
                          padding: '3px 6px',
                        }}
                      >
                        {pageIgstAmt > 0 ? splitRsPs(pageIgstAmt).rs : ''}
                      </td>
                      <td
                        style={{
                          border: '1px solid #801414',
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '11.5px',
                          color: '#000000',
                          padding: '3px 2px',
                        }}
                      >
                        {pageIgstAmt > 0 ? splitRsPs(pageIgstAmt).ps : ''}
                      </td>
                    </tr>
                  </>
                )}

                {/* Row 5: GRANT TOTAL Rs. */}
                <tr style={{ backgroundColor: 'rgba(128, 20, 20, 0.04)' }}>
                  <td
                    style={{
                      border: '1.5px solid #801414',
                      textAlign: 'right',
                      fontWeight: 900,
                      fontSize: '13px',
                      color: '#801414',
                      padding: '5px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    GRANT TOTAL Rs.
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #801414',
                      textAlign: 'right',
                      fontWeight: 900,
                      fontSize: '14px',
                      color: '#000000',
                      padding: '5px 6px',
                    }}
                  >
                    {splitRsPs(pageFinalTotalNum).rs}
                  </td>
                  <td
                    style={{
                      border: '1.5px solid #801414',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: '12.5px',
                      color: '#000000',
                      padding: '5px 2px',
                    }}
                  >
                    {splitRsPs(pageFinalTotalNum).ps}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ======================================================================= */}
            {/* 4. FOOTER (FIXED ON ALL PAGES: RUPEES IN WORDS & SIGNATURE) */}
            {/* ======================================================================= */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginTop: '8px',
                padding: '0 2px',
              }}
            >
              {/* Left: Rupees in Words */}
              <div style={{ flex: '1 1 auto', maxWidth: '62%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#801414', marginRight: '6px', whiteSpace: 'nowrap' }}>
                    Rupees :
                  </span>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.5px dotted #801414',
                      minHeight: '19px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: '#000000',
                      paddingLeft: '4px',
                    }}
                  >
                    {wordsLine1}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: '1.5px dotted #801414',
                      minHeight: '19px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: '#000000',
                      paddingLeft: '4px',
                      textAlign: wordsLine2 ? 'left' : 'right',
                    }}
                  >
                    {wordsLine2 || ''}
                  </div>
                  {!wordsLine2 && (
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#801414', marginLeft: '6px' }}>
                      Only.
                    </span>
                  )}
                </div>
              </div>

              {/* Right: For VARUN TRADERS & Signature */}
              <div style={{ flex: '0 0 34%', textAlign: 'right', paddingRight: '4px' }}>
                <div
                  style={{
                    fontFamily: '"Times New Roman", Georgia, serif',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#801414',
                    letterSpacing: '0.5px',
                  }}
                >
                  For {displayCompanyName}
                </div>
                {/* Space for physical signature */}
                <div style={{ height: '44px' }} />
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#801414' }}>
                  {storeSettings.ownerName ? `(${storeSettings.ownerName}) ` : ''}Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
