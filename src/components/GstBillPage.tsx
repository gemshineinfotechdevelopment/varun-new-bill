import { useState, useEffect, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import RotateLeftRoundedIcon from '@mui/icons-material/RotateLeftRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import {
  CustomersApi,
  CompaniesApi,
  ProductsApi,
  PriceListsApi,
  ParticularsApi,
} from '../services/api';
import { getStoredSettings } from './SettingsPage';
import { BillPrintModal } from './BillPrintModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import type { BillPrintData } from './BillPrintTemplate';
import { isGstBillRecord, registerGstBillRecord } from '../utils/printUtils';

export interface IndianGstState {
  code: string;
  name: string;
}

export const INDIAN_GST_STATES: IndianGstState[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

interface GstProductRowItem {
  id: string;
  particular: string;
  hsn?: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
}

interface CustomerOptionItem {
  id: string;
  name: string;
  mobile?: string;
  address?: string;
  gst?: string;
}

interface ProductCatalogOption {
  id: string;
  name: string;
  category?: string;
  rate?: number;
  mrp?: number;
  unit?: string;
}

interface GstBillPageProps {
  initialCustomerName?: string;
}

const DRAFT_GST_BILL_STORAGE_KEY = 'varun_draft_gst_bill';

interface DraftGstBillState {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerState?: string;
  stateCode?: string;
  billNo?: string;
  billDate?: string;
  discount?: string;
  transport?: string;
  packing?: string;
  taxRate?: string;
  supplyType?: 'INTRA' | 'INTER';
  vehicleNo?: string;
  productRows?: GstProductRowItem[];
}

const getSavedGstDraft = (): DraftGstBillState => {
  try {
    const raw = localStorage.getItem(DRAFT_GST_BILL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load draft GST bill from localStorage', e);
  }
  return {};
};

export const GstBillPage: FC<GstBillPageProps> = ({ initialCustomerName }) => {
  const [activeSubView, setActiveSubView] = useState<'create' | 'history'>('create');
  const [storeSettings, setStoreSettings] = useState(() => getStoredSettings());
  const draft = useMemo(() => getSavedGstDraft(), []);

  // Dropdown options
  const [customerOptions, setCustomerOptions] = useState<CustomerOptionItem[]>([]);
  const [, setCompanyOptions] = useState<{ id: string; name: string }[]>([]);
  const [productOptions, setProductOptions] = useState<ProductCatalogOption[]>([]);

  // Bill Form State (Restores from Draft if page refreshed)
  const [customerName, setCustomerName] = useState<string>(() => {
    return initialCustomerName || draft.customerName || '';
  });
  const [customerPhone, setCustomerPhone] = useState<string>(() => draft.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState<string>(() => draft.customerAddress || '');
  const [customerGst, setCustomerGst] = useState<string>(() => draft.customerGst || '');
  const [customerState, setCustomerState] = useState<string>(() => draft.customerState || 'Tamil Nadu');
  const [stateCode, setStateCode] = useState<string>(() => draft.stateCode || '33');
  const [supplyType, setSupplyType] = useState<'INTRA' | 'INTER'>(() => draft.supplyType || 'INTRA');
  const [totalGstRate, setTotalGstRate] = useState<string>(() => draft.taxRate || storeSettings.defaultTaxRate || '18');
  const [vehicleNo, setVehicleNo] = useState<string>(() => draft.vehicleNo || '');

  const [company, setCompany] = useState<string>(() => {
    return storeSettings.companyName || 'VARUN TRADERS';
  });
  const [billNo, setBillNo] = useState<string>(() => draft.billNo || '');
  const [billDate, setBillDate] = useState<string>(() => {
    if (draft.billDate) return draft.billDate;
    const today = new Date();
    return today.toLocaleDateString('en-GB').replace(/\//g, '-');
  });
  const [discount, setDiscount] = useState<string>(() => draft.discount ?? '0');
  const [transport, setTransport] = useState<string>(() => draft.transport ?? '0');
  const [packing, setPacking] = useState<string>(() => draft.packing ?? '0');

  // Product Entry Form State
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('0');
  const [unit, setUnit] = useState<string>('Box');
  const [productRows, setProductRows] = useState<GstProductRowItem[]>(() => draft.productRows || []);
  const [savingBill, setSavingBill] = useState<boolean>(false);

  // History State
  const [recentGstBills, setRecentGstBills] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  // Print Preview & WhatsApp Modal State
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<BillPrintData | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [selectedBillForWhatsApp, setSelectedBillForWhatsApp] = useState<BillPrintData | null>(null);

  // Auto-persist draft GST bill
  useEffect(() => {
    const draftPayload: DraftGstBillState = {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      customerState,
      stateCode,
      billNo,
      billDate,
      discount,
      transport,
      packing,
      taxRate: totalGstRate,
      supplyType,
      vehicleNo,
      productRows,
    };
    try {
      localStorage.setItem(DRAFT_GST_BILL_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {
      console.warn('Failed to auto-save draft GST bill to localStorage', e);
    }
  }, [customerName, customerPhone, customerAddress, customerGst, customerState, stateCode, billNo, billDate, discount, transport, packing, totalGstRate, supplyType, vehicleNo, productRows]);

  // Listen for settings update
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const updated = getStoredSettings();
      setStoreSettings(updated);
      setCompany(updated.companyName || 'VARUN TRADERS');
    };
    window.addEventListener('varun_settings_updated', handleSettingsUpdate);
    window.addEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('varun_settings_updated', handleSettingsUpdate);
      window.removeEventListener('dheeksha_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Helper: Detect state and code from GSTIN
  const handleGstNumberChange = (rawGst: string) => {
    const clean = rawGst.toUpperCase().replace(/\s+/g, '');
    setCustomerGst(clean);

    if (clean.length >= 2) {
      const codeDigits = clean.substring(0, 2);
      const matched = INDIAN_GST_STATES.find((s) => s.code === codeDigits);
      if (matched) {
        setCustomerState(matched.name);
        setStateCode(matched.code);
        if (matched.code === '33' || matched.name.toLowerCase().includes('tamil')) {
          setSupplyType('INTRA');
        } else {
          setSupplyType('INTER');
        }
      }
    }
  };

  // Helper: When state changes from dropdown
  const handleStateSelect = (selected: IndianGstState | null) => {
    if (selected) {
      setCustomerState(selected.name);
      setStateCode(selected.code);
      if (selected.code === '33' || selected.name.toLowerCase().includes('tamil')) {
        setSupplyType('INTRA');
      } else {
        setSupplyType('INTER');
      }
    } else {
      setCustomerState('Tamil Nadu');
      setStateCode('33');
      setSupplyType('INTRA');
    }
  };

  // Load Dropdown Options
  const loadOptions = async () => {
    try {
      const [custRes, compRes, prodRes, priceRes] = await Promise.all([
        CustomersApi.getAll().catch(() => []),
        CompaniesApi.getAll().catch(() => []),
        ProductsApi.getAll().catch(() => []),
        PriceListsApi.getAll().catch(() => []),
      ]);

      if (Array.isArray(custRes) && custRes.length > 0) {
        const mapped: CustomerOptionItem[] = custRes.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          mobile: c.mobile && c.mobile !== 'N/A' && c.mobile !== '-' ? c.mobile : '',
          address: c.address && c.address !== 'N/A' && c.address !== '-' ? c.address : '',
          gst: c.gst && c.gst !== 'N/A' && c.gst !== '-' ? c.gst : '',
        }));
        setCustomerOptions(mapped);
      }

      if (Array.isArray(compRes) && compRes.length > 0) {
        const mapped = compRes.map((c: any) => ({ id: c._id || c.id, name: c.name }));
        setCompanyOptions(mapped);
        if (mapped.length > 0 && (!company || company === 'General')) {
          setCompany(storeSettings.companyName || mapped[0].name);
        }
      }

      const prodMap = new Map<string, ProductCatalogOption>();

      if (Array.isArray(prodRes)) {
        prodRes.forEach((p: any) => {
          const key = (p.name || '').trim();
          if (key) {
            prodMap.set(key.toLowerCase(), {
              id: p._id || p.id,
              name: key,
              category: p.category || 'General',
              rate: p.rate || 0,
              mrp: p.mrp || 0,
              unit: p.unit || 'Box',
            });
          }
        });
      }

      if (Array.isArray(priceRes)) {
        priceRes.forEach((item: any) => {
          const key = (item.itemName || '').trim();
          if (key) {
            const existing = prodMap.get(key.toLowerCase());
            prodMap.set(key.toLowerCase(), {
              id: item._id || item.id || existing?.id || key,
              name: key,
              category: item.category || existing?.category || 'General',
              rate: item.rate !== undefined && item.rate > 0 ? item.rate : (existing?.rate || 0),
              mrp: item.mrp !== undefined && item.mrp > 0 ? item.mrp : (existing?.mrp || 0),
              unit: item.unit || existing?.unit || 'Box',
            });
          }
        });
      }

      setProductOptions(Array.from(prodMap.values()));
    } catch (err) {
      console.error('Failed to load billing options:', err);
    }
  };

  // Fetch Next GST Bill Number
  const fetchNextGstBillNo = async () => {
    try {
      const res = await ParticularsApi.getNextBillNo('GST');
      const raw = res?.nextBillNo ? String(res.nextBillNo).trim() : '';
      if (raw) {
        if (raw.toUpperCase().startsWith('GST-')) {
          setBillNo(raw);
        } else if (raw.toUpperCase().startsWith('GST')) {
          setBillNo(`GST-${raw.slice(3).replace(/^-+/, '')}`);
        } else {
          setBillNo(`GST-${raw}`);
        }
      } else {
        setBillNo(`GST-${Date.now().toString().slice(-4)}`);
      }
    } catch {
      setBillNo(`GST-${Date.now().toString().slice(-4)}`);
    }
  };

  // Refresh Today's Date
  const refreshDate = () => {
    const today = new Date();
    setBillDate(today.toLocaleDateString('en-GB').replace(/\//g, '-'));
  };

  // Fetch Recent GST Bills
  const fetchRecentGstBills = async () => {
    try {
      setLoadingHistory(true);
      const bills = await ParticularsApi.getAll(undefined, 'GST');
      if (Array.isArray(bills)) {
        const filtered = bills.filter((b) => isGstBillRecord(b));
        setRecentGstBills(filtered);
      } else {
        setRecentGstBills([]);
      }
    } catch (err) {
      console.error('Failed to fetch recent GST bills:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadOptions();
    fetchNextGstBillNo();
    refreshDate();
    fetchRecentGstBills();
  }, []);

  // Update customer when initialCustomerName changes
  useEffect(() => {
    if (initialCustomerName) {
      setCustomerName(initialCustomerName);
      const matched = customerOptions.find(
        (c) => c.name.toLowerCase() === initialCustomerName.toLowerCase().trim()
      );
      if (matched) {
        if (matched.mobile) setCustomerPhone(matched.mobile);
        if (matched.address) setCustomerAddress(matched.address);
        if (matched.gst) handleGstNumberChange(matched.gst);
      }
    }
  }, [initialCustomerName, customerOptions]);

  // Add Product Item to Bill Row
  const handleAddProductItem = () => {
    if (!selectedProduct.trim()) {
      alert('Please select or enter a product name');
      return;
    }
    const qNum = parseFloat(quantity) || 1;
    const rNum = parseFloat(rate) || 0;
    const amt = (qNum * rNum).toFixed(2);

    const newRow: GstProductRowItem = {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      particular: selectedProduct.trim(),
      quantity: String(qNum),
      rate: String(rNum),
      pktUnit: unit || 'Box',
      amount: amt,
    };

    setProductRows((prev) => [...prev, newRow]);
    setSelectedProduct('');
    setRate('0');
    setQuantity('1');
    setUnit('Box');
  };

  const handleDeleteRow = (id: string) => {
    setProductRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Step quantity by +1 / -1
  const handleQuantityStep = (id: string, delta: number) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const currentQty = parseFloat(r.quantity) || 1;
        const nextQty = Math.max(1, currentQty + delta);
        const rNum = parseFloat(r.rate) || 0;
        const amt = (nextQty * rNum).toFixed(2);
        return {
          ...r,
          quantity: String(nextQty),
          amount: amt,
        };
      })
    );
  };

  // Direct quantity text typing
  const handleQuantityInputChange = (id: string, rawVal: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const cleanVal = rawVal.replace(/[^0-9.]/g, '');
        const qNum = parseFloat(cleanVal) || 0;
        const rNum = parseFloat(r.rate) || 0;
        const amt = (qNum * rNum).toFixed(2);
        return {
          ...r,
          quantity: cleanVal,
          amount: amt,
        };
      })
    );
  };

  // On blur, ensure quantity is at least 1
  const handleQuantityBlur = (id: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const qNum = parseFloat(r.quantity);
        if (isNaN(qNum) || qNum <= 0) {
          const rNum = parseFloat(r.rate) || 0;
          return { ...r, quantity: '1', amount: (1 * rNum).toFixed(2) };
        }
        return r;
      })
    );
  };

  // Direct rate text typing
  const handleRateInputChange = (id: string, rawVal: string) => {
    setProductRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const cleanVal = rawVal.replace(/[^0-9.]/g, '');
        const qNum = parseFloat(r.quantity) || 0;
        const rNum = parseFloat(cleanVal) || 0;
        const amt = (qNum * rNum).toFixed(2);
        return {
          ...r,
          rate: cleanVal,
          amount: amt,
        };
      })
    );
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
  }, [productRows]);

  const discountAmount = useMemo(() => {
    const rawDisc = parseFloat(discount) || 0;
    if (rawDisc <= 0) return 0;
    return (subtotal * rawDisc) / 100;
  }, [subtotal, discount]);

  const totalCases = useMemo(() => {
    return productRows.reduce((acc, row) => acc + (parseFloat(row.quantity) || 0), 0);
  }, [productRows]);

  const taxableBase = useMemo(() => {
    const transportAmt = parseFloat(transport) || 0;
    const packingAmt = parseFloat(packing) || 0;
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    return afterDiscount + transportAmt + packingAmt;
  }, [subtotal, discountAmount, transport, packing]);

  // GST Split
  const gstRateNum = parseFloat(totalGstRate) || 0;
  const isIntraState = supplyType === 'INTRA';

  const cgstRate = isIntraState ? gstRateNum / 2 : 0;
  const sgstRate = isIntraState ? gstRateNum / 2 : 0;
  const igstRate = isIntraState ? 0 : gstRateNum;

  const cgstAmount = useMemo(() => {
    return (taxableBase * cgstRate) / 100;
  }, [taxableBase, cgstRate]);

  const sgstAmount = useMemo(() => {
    return (taxableBase * sgstRate) / 100;
  }, [taxableBase, sgstRate]);

  const igstAmount = useMemo(() => {
    return (taxableBase * igstRate) / 100;
  }, [taxableBase, igstRate]);

  const totalGstAmount = useMemo(() => {
    return cgstAmount + sgstAmount + igstAmount;
  }, [cgstAmount, sgstAmount, igstAmount]);

  const grossTotal = useMemo(() => {
    return taxableBase + totalGstAmount;
  }, [taxableBase, totalGstAmount]);

  const netGrandTotal = useMemo(() => {
    return Math.round(grossTotal);
  }, [grossTotal]);

  const roundOff = useMemo(() => {
    return netGrandTotal - grossTotal;
  }, [netGrandTotal, grossTotal]);

  // Save GST Bill to Database
  const handleSaveGstBill = async (action: 'save' | 'print' | 'whatsapp' = 'save') => {
    if (!customerName.trim()) {
      alert('Please select or enter Customer Name');
      return;
    }
    if (productRows.length === 0) {
      alert('Please add at least one product item to the invoice');
      return;
    }

    try {
      setSavingBill(true);
      let finalBillNo = billNo.trim();
      if (!finalBillNo) {
        finalBillNo = `GST-${Date.now().toString().slice(-4)}`;
      } else if (!finalBillNo.toUpperCase().startsWith('GST')) {
        finalBillNo = `GST-${finalBillNo}`;
      }

      const freshSettings = getStoredSettings();
      const configuredTerms =
        (freshSettings.billTerms && freshSettings.billTerms.trim()) ||
        (typeof window !== 'undefined' ? (localStorage.getItem('varun_gst_bill_terms') || '').trim() : '');
      const notesWithTag = configuredTerms ? `[GST_BILL] ${configuredTerms}` : '[GST_BILL]';

      const payload = {
        billNo: finalBillNo,
        date: billDate,
        billType: 'GST',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        customerGst: customerGst.trim().toUpperCase() || undefined,
        customerState: customerState.trim() || 'Tamil Nadu',
        stateCode: stateCode.trim() || '33',
        companyName: company || freshSettings.companyName || 'VARUN TRADERS',
        transport: transport || '0',
        caseCount: String(totalCases),
        discount: discount || '0',
        packing: packing || '0',
        tax: String(parseFloat(totalGstRate) || 0),
        cgst: cgstRate > 0 ? String(cgstRate) : '0',
        sgst: sgstRate > 0 ? String(sgstRate) : '0',
        igst: igstRate > 0 ? String(igstRate) : '0',
        roundOff: roundOff.toFixed(2),
        vehicleNo: vehicleNo.trim() || undefined,
        notes: notesWithTag,
        amount: String(taxableBase.toFixed(2)),
        total: String(netGrandTotal.toFixed(2)),
        products: productRows.map((r) => ({
          particular: r.particular,
          quantity: r.quantity,
          rate: r.rate,
          pktUnit: r.pktUnit,
          amount: r.amount,
        })),
      };

      const savedRes: any = await ParticularsApi.create(payload);
      const savedId = (savedRes && typeof savedRes === 'object') ? (savedRes._id || savedRes.id || savedRes.data?._id || savedRes.data?.id) : '';

      registerGstBillRecord(finalBillNo);
      if (savedId) {
        registerGstBillRecord(String(savedId));
      }

      const printData: BillPrintData = {
        billNo: payload.billNo,
        date: payload.date,
        billType: 'GST',
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerAddress: payload.customerAddress,
        customerGst: payload.customerGst,
        customerState: payload.customerState,
        stateCode: payload.stateCode,
        companyName: payload.companyName,
        transport: payload.transport,
        caseCount: payload.caseCount,
        discount: payload.discount,
        packing: payload.packing,
        tax: payload.tax,
        cgst: payload.cgst,
        sgst: payload.sgst,
        igst: payload.igst,
        roundOff: payload.roundOff,
        vehicleNo: payload.vehicleNo,
        notes: configuredTerms || undefined,
        amount: payload.amount,
        total: payload.total,
        products: payload.products,
      };

      if (action === 'print') {
        setSelectedBillForPrint(printData);
        setPrintModalOpen(true);
      } else if (action === 'whatsapp') {
        setSelectedBillForWhatsApp(printData);
        setWhatsAppModalOpen(true);
      }

      // Reset Bill Form & Reload Recent
      setProductRows([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setCustomerState('Tamil Nadu');
      setStateCode('33');
      setSupplyType('INTRA');
      setVehicleNo('');
      setDiscount('0');
      setTransport('0');
      setPacking('0');
      localStorage.removeItem(DRAFT_GST_BILL_STORAGE_KEY);

      fetchNextGstBillNo();
      refreshDate();
      loadOptions();
      fetchRecentGstBills();

      if (action === 'save') {
        alert(`GST Tax Invoice #${payload.billNo} saved successfully!`);
      }
    } catch (err: any) {
      console.error('Failed to save GST bill:', err);
      alert(err.message || 'Error saving GST invoice');
    } finally {
      setSavingBill(false);
    }
  };

  // Clear Draft Bill Form
  const handleClearDraft = () => {
    if (productRows.length > 0 || customerName.trim() !== '') {
      if (!window.confirm('Are you sure you want to clear this draft GST invoice?')) return;
    }
    setProductRows([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGst('');
    setCustomerState('Tamil Nadu');
    setStateCode('33');
    setSupplyType('INTRA');
    setVehicleNo('');
    setDiscount('0');
    setTransport('0');
    setPacking('0');
    localStorage.removeItem(DRAFT_GST_BILL_STORAGE_KEY);
    fetchNextGstBillNo();
    refreshDate();
  };

  // Delete GST Bill from History
  const handleDeleteBill = async (id: string, bNo: string) => {
    if (!window.confirm(`Are you sure you want to delete GST Invoice #${bNo}?`)) return;
    try {
      await ParticularsApi.delete(id);
      fetchRecentGstBills();
    } catch (err: any) {
      alert(err.message || 'Failed to delete bill');
    }
  };

  // Filtered History
  const filteredHistoryBills = useMemo(() => {
    if (!historySearchTerm.trim()) return recentGstBills;
    const term = historySearchTerm.toLowerCase().trim();
    return recentGstBills.filter(
      (b) =>
        (b.billNo && b.billNo.toLowerCase().includes(term)) ||
        (b.customerName && b.customerName.toLowerCase().includes(term)) ||
        (b.customerGst && b.customerGst.toLowerCase().includes(term)) ||
        (b.date && b.date.toLowerCase().includes(term))
    );
  }, [recentGstBills, historySearchTerm]);

  return (
    <Box
      sx={{
        width: '100%',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 2.5 },
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header & View Switcher */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                px: 1.2,
                py: 0.4,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <AccountBalanceRoundedIcon sx={{ fontSize: 14 }} />
              GST Tax Invoice
            </Box>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '22px', sm: '26px', md: '28px' },
                fontWeight: 800,
                color: '#B91C1C',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              GST Bill & Tax Invoicing
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '13px', color: '#786C58', fontWeight: 600 }}>
            Create GST compliant tax invoices with CGST, SGST, IGST calculations, state detection, and instant print/PDF.
          </Typography>
        </Box>

        {/* View Segmented Switcher & Quick Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFBEB',
              p: '4px',
              borderRadius: '10px',
              border: '1.5px solid #FDE68A',
            }}
          >
            <Button
              size="small"
              onClick={() => setActiveSubView('create')}
              startIcon={<ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: '8px',
                px: 1.8,
                py: 0.6,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '13px',
                backgroundColor: activeSubView === 'create' ? '#DC2626' : 'transparent',
                color: activeSubView === 'create' ? '#FFFFFF' : '#78350F',
                boxShadow: activeSubView === 'create' ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
                '&:hover': {
                  backgroundColor: activeSubView === 'create' ? '#B91C1C' : '#FEF3C7',
                },
              }}
            >
              Create GST Bill
            </Button>
            <Button
              size="small"
              onClick={() => setActiveSubView('history')}
              startIcon={<HistoryRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: '8px',
                px: 1.8,
                py: 0.6,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '13px',
                backgroundColor: activeSubView === 'history' ? '#DC2626' : 'transparent',
                color: activeSubView === 'history' ? '#FFFFFF' : '#78350F',
                boxShadow: activeSubView === 'history' ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
                '&:hover': {
                  backgroundColor: activeSubView === 'history' ? '#B91C1C' : '#FEF3C7',
                },
              }}
            >
              Recent GST Invoices ({recentGstBills.length})
            </Button>
          </Box>

          {activeSubView === 'create' && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearDraft}
              startIcon={<RotateLeftRoundedIcon sx={{ fontSize: 17 }} />}
              sx={{
                color: '#786C58',
                borderColor: '#E2E8F0',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                borderRadius: '8px',
                px: 1.8,
                height: '36px',
                '&:hover': {
                  borderColor: '#DC2626',
                  color: '#DC2626',
                  backgroundColor: '#FEF2F2',
                },
              }}
            >
              Clear Draft
            </Button>
          )}
        </Box>
      </Box>

      {/* VIEW 1: CREATE GST BILL */}
      {activeSubView === 'create' && (
        <Grid container spacing={2.5}>
          {/* Left Column: 1. GST Invoice & Party Information */}
          <Grid size={{ xs: 12, lg: 4.2 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: '14px',
                border: '1.5px solid #FDE68A',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
                boxSizing: 'border-box',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: '15.5px', fontWeight: 800, color: '#B91C1C' }}>
                  1. GST Invoice & Buyer Information
                </Typography>
                <Chip
                  label="Tax Invoice"
                  size="small"
                  sx={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    fontWeight: 800,
                    fontSize: '11px',
                    border: '1px solid #FDE68A',
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                {/* Customer Selector */}
                <Box>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                    Customer / Buyer Name *
                  </Typography>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={customerOptions.map((c) => c.name)}
                    value={customerName || ''}
                    onChange={(_, val) => {
                      const newName = val || '';
                      setCustomerName(newName);
                      const matched = customerOptions.find(
                        (c) => c.name.toLowerCase() === newName.trim().toLowerCase()
                      );
                      if (matched) {
                        setCustomerPhone(matched.mobile || '');
                        setCustomerAddress(matched.address || '');
                        if (matched.gst) handleGstNumberChange(matched.gst);
                      }
                      setTimeout(() => {
                        document.getElementById('gst-customer-phone-input')?.focus();
                      }, 50);
                    }}
                    onInputChange={(_, val, reason) => {
                      if (reason === 'input') {
                        setCustomerName(val);
                        const matched = customerOptions.find(
                          (c) => c.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (matched) {
                          setCustomerPhone(matched.mobile || '');
                          setCustomerAddress(matched.address || '');
                          if (matched.gst) handleGstNumberChange(matched.gst);
                        }
                      } else if (reason === 'clear') {
                        setCustomerName('');
                        setCustomerPhone('');
                        setCustomerAddress('');
                        setCustomerGst('');
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Search registered party or type new name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.getElementById('gst-customer-phone-input')?.focus();
                          }
                        }}
                        sx={{
                          '& .MuiInputBase-input': { fontSize: '13.5px', fontWeight: 600 },
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Phone Number (Immediately after Customer Name) */}
                <Box>
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58', mb: 0.5 }}>
                    Phone Number (Mobile)
                  </Typography>
                  <TextField
                    id="gst-customer-phone-input"
                    fullWidth
                    size="small"
                    placeholder="Enter customer mobile number..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('gst-party-gstin-input')?.focus();
                      }
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 } }}
                  />
                </Box>

                {/* Party GSTIN (Prominent with Auto-State Detection) */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58' }}>
                      Party GSTIN (15 Digits)
                    </Typography>
                    {customerGst && customerGst.length >= 2 && (
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                        ({customerState})
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    id="gst-party-gstin-input"
                    fullWidth
                    size="small"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={customerGst}
                    onChange={(e) => handleGstNumberChange(e.target.value)}
                    slotProps={{
                      input: {
                        endAdornment: customerGst.length === 15 ? (
                          <InputAdornment position="end">
                            <CheckCircleRoundedIcon sx={{ color: '#059669', fontSize: 18 }} />
                          </InputAdornment>
                        ) : null,
                      },
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '13px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: '#1F1714',
                      },
                    }}
                  />
                </Box>

                {/* Place of Supply / State */}
                <Box>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Place of Supply / State
                  </Typography>
                  <Autocomplete
                    size="small"
                    options={INDIAN_GST_STATES}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, val) => option.code === val.code || option.name === val.name}
                    value={INDIAN_GST_STATES.find((s) => s.code === stateCode) || INDIAN_GST_STATES.find((s) => s.name === customerState) || null}
                    onChange={(_, val) => handleStateSelect(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Select State..."
                        sx={{ '& .MuiInputBase-input': { fontSize: '12.5px', fontWeight: 600 } }}
                      />
                    )}
                  />
                </Box>

                {/* Customer Address */}
                <Box>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                    Customer Address
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Town / City / Street Address..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 } }}
                  />
                </Box>

                {/* GST Tax Slab Rate (Manual Entry Text Box) */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58' }}>
                      GST Tax Slab Rate (%)
                    </Typography>
                    <Typography sx={{ fontSize: '11px', fontWeight: 800, color: '#B91C1C' }}>
                      {isIntraState
                        ? `CGST: ${cgstRate}% + SGST: ${sgstRate}%`
                        : `IGST: ${igstRate}%`}
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter GST rate e.g. 18 or 0"
                    value={totalGstRate}
                    onChange={(e) => setTotalGstRate(e.target.value.replace(/[^0-9.]/g, ''))}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>%</Typography>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      '& .MuiInputBase-input': { fontSize: '13.5px', fontWeight: 700, color: '#B91C1C' },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                    {['18', '28', '12', '5', '0'].map((rateOption) => {
                      const isSelected = totalGstRate === rateOption;
                      return (
                        <Chip
                          key={rateOption}
                          label={rateOption === '18' ? '18% (Std)' : `${rateOption}%`}
                          size="small"
                          onClick={() => setTotalGstRate(rateOption)}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{
                            fontWeight: 800,
                            fontSize: '11px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#DC2626' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#78350F',
                            borderColor: isSelected ? '#DC2626' : '#FDE68A',
                            '&:hover': {
                              backgroundColor: isSelected ? '#B91C1C' : '#FEF3C7',
                            },
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Bill No, Date & Vehicle / Transport Details */}
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                      GST Invoice No. *
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="e.g. GST-0001"
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        '& .MuiInputBase-input': {
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#B91C1C',
                        },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                      Invoice Date
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={billDate}
                      disabled
                      sx={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: '6px',
                        '& .MuiInputBase-input': {
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#475569 !important',
                          WebkitTextFillColor: '#475569 !important',
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                {/* Transport / Vehicle No (Optional standard GST invoice field) */}
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#786C58', mb: 0.4 }}>
                      Transport / Vehicle No / LR (Optional)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="e.g. TN 67 AB 1234 / Lorry Service"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocalShippingOutlinedIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiInputBase-input': { fontSize: '12.5px', fontWeight: 600 } }}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 0.5, borderColor: '#FEF3C7' }} />

                {/* Adjustments: Discount, Transport, Packing */}
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#78350F' }}>
                  Adjustments & Extra Charges
                </Typography>

                <Grid container spacing={1.2}>
                  <Grid size={{ xs: 4 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#786C58', mb: 0.3 }}>
                      Discount (%)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: '12.5px', fontWeight: 600 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#786C58', mb: 0.3 }}>
                      Transport (₹)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={transport}
                      onChange={(e) => setTransport(e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: '12.5px', fontWeight: 600 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#786C58', mb: 0.3 }}>
                      Packing (₹)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={packing}
                      onChange={(e) => setPacking(e.target.value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: '12.5px', fontWeight: 600 } }}
                    />
                  </Grid>
                </Grid>

                {/* Comprehensive GST Summary Card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    backgroundColor: '#FFFBEB',
                    border: '1.5px solid #FDE68A',
                    mt: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#786C58', fontWeight: 600 }}>
                      Subtotal (Taxable Goods):
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#1F1714', fontWeight: 700 }}>
                      ₹{subtotal.toFixed(2)}
                    </Typography>
                  </Box>

                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
                        Discount ({discount}%):
                      </Typography>
                      <Typography sx={{ fontSize: '12.5px', color: '#059669', fontWeight: 700 }}>
                        -₹{discountAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  )}

                  {(parseFloat(transport) > 0 || parseFloat(packing) > 0) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                        Freight / Packing:
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#1F1714', fontWeight: 700 }}>
                        +₹{((parseFloat(transport) || 0) + (parseFloat(packing) || 0)).toFixed(2)}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12.5px', color: '#78350F', fontWeight: 700 }}>
                      Taxable Value:
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#78350F', fontWeight: 800 }}>
                      ₹{taxableBase.toFixed(2)}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 0.6, borderColor: '#FDE68A' }} />

                  {/* GST Tax Breakdown */}
                  {supplyType === 'INTRA' ? (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                          CGST ({cgstRate}%):
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 700 }}>
                          +₹{cgstAmount.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                        <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                          SGST ({sgstRate}%):
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 700 }}>
                          +₹{sgstAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                      <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                        IGST ({igstRate}%):
                      </Typography>
                      <Typography sx={{ fontSize: '12px', color: '#92400E', fontWeight: 700 }}>
                        +₹{igstAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 600 }}>
                      Round Off:
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#786C58', fontWeight: 700 }}>
                      {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 0.8, borderColor: '#FDE68A' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '14.5px', fontWeight: 800, color: '#991B1B' }}>
                      Net Payable Total:
                    </Typography>
                    <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#B91C1C' }}>
                      ₹{netGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>

                {/* Save & Action Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', gap: 1.2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleSaveGstBill('save')}
                      disabled={savingBill || productRows.length === 0}
                      sx={{
                        borderColor: '#F59E0B',
                        color: '#92400E',
                        fontWeight: 700,
                        textTransform: 'none',
                        py: 0.9,
                        borderRadius: '8px',
                        '&:hover': { borderColor: '#B45309', backgroundColor: '#FFFBEB' },
                      }}
                    >
                      Save Invoice
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      disableElevation
                      onClick={() => handleSaveGstBill('print')}
                      disabled={savingBill || productRows.length === 0}
                      startIcon={savingBill ? <CircularProgress size={16} color="inherit" /> : <PrintOutlinedIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        textTransform: 'none',
                        py: 0.9,
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                        '&:hover': { background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)' },
                      }}
                    >
                      Save & Print
                    </Button>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    disableElevation
                    onClick={() => handleSaveGstBill('whatsapp')}
                    disabled={savingBill || productRows.length === 0}
                    startIcon={savingBill ? <CircularProgress size={16} color="inherit" /> : <WhatsAppIcon sx={{ fontSize: '19px !important' }} />}
                    sx={{
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      textTransform: 'none',
                      py: 1,
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)',
                      '&:hover': { backgroundColor: '#1EBE5D' },
                    }}
                  >
                    Save & Share on WhatsApp (PDF)
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column: 2. Add Products & GST Bill Items Table */}
          <Grid size={{ xs: 12, lg: 7.8 }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '14px',
                border: '1.5px solid #FDE68A',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
                overflow: 'hidden',
                mb: 3,
              }}
            >
              {/* Top Product Entry Bar */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                  borderBottom: '2px solid #F59E0B',
                  p: 2,
                  px: { xs: 2, sm: 2.5 },
                  color: '#FFFFFF',
                }}
              >
                <Typography sx={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', mb: 1.5 }}>
                  2. Add Items to Tax Invoice
                </Typography>

                <Grid container spacing={1.2} sx={{ alignItems: 'center' }}>
                  {/* Product Search */}
                  <Grid size={{ xs: 12, sm: 6.5 }}>
                    <Autocomplete
                      size="small"
                      autoHighlight
                      freeSolo
                      options={productOptions}
                      getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                      isOptionEqualToValue={(option, val) => {
                        const optName = typeof option === 'string' ? option : option?.name;
                        const valName = typeof val === 'string' ? val : val?.name;
                        return optName === valName;
                      }}
                      value={productOptions.find((p) => p.name === selectedProduct) || (selectedProduct ? selectedProduct : null)}
                      onChange={(_, val) => {
                        if (val) {
                          if (typeof val === 'string') {
                            setSelectedProduct(val);
                            const matched = productOptions.find((p) => p.name.toLowerCase() === val.toLowerCase());
                            if (matched) {
                              setRate(String(matched.rate || 0));
                              setUnit(matched.unit || 'Box');
                            }
                          } else {
                            setSelectedProduct(val.name);
                            if (val.rate !== undefined && val.rate > 0) {
                              setRate(String(val.rate));
                            } else {
                              setRate('0');
                            }
                            if (val.unit) {
                              setUnit(val.unit);
                            }
                          }
                        } else {
                          setSelectedProduct('');
                          setRate('0');
                        }
                      }}
                      onInputChange={(_, newInputValue, reason) => {
                        if (reason === 'input') {
                          setSelectedProduct(newInputValue);
                          const matched = productOptions.find((p) => p.name.toLowerCase() === newInputValue.trim().toLowerCase());
                          if (matched) {
                            setRate(String(matched.rate || 0));
                            setUnit(matched.unit || 'Box');
                          }
                        } else if (reason === 'clear') {
                          setSelectedProduct('');
                          setRate('0');
                        }
                      }}
                      renderOption={(props, option) => {
                        const { key, ...otherProps } = props;
                        const optName = typeof option === 'string' ? option : option.name;
                        const optCategory = typeof option === 'string' ? undefined : option.category;
                        const optRate = typeof option === 'string' ? undefined : option.rate;
                        const optUnit = typeof option === 'string' ? undefined : option.unit;
                        const optKey = key || (typeof option === 'string' ? option : option.id || option.name);

                        return (
                          <Box
                            component="li"
                            key={optKey}
                            {...otherProps}
                            sx={{
                              display: 'flex !important',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              width: '100%',
                              py: 0.8,
                              px: 1.5,
                              gap: 1,
                              borderBottom: '1px solid #FEF3C7',
                              '&:last-child': { borderBottom: 'none' },
                            }}
                          >
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                                {optName}
                              </Typography>
                              {optCategory && (
                                <Typography sx={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
                                  {optCategory}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              {optRate !== undefined && optRate > 0 && (
                                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C' }}>
                                  ₹{Number(optRate).toLocaleString('en-IN')}
                                </Typography>
                              )}
                              {optUnit && (
                                <Typography sx={{ fontSize: '10.5px', color: '#6B7280' }}>
                                  / {optUnit}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search product from price list..."
                          sx={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                          }}
                        />
                      )}
                    />
                  </Grid>

                  {/* Quantity */}
                  <Grid size={{ xs: 6, sm: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Qty"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProductItem();
                        }
                      }}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600, textAlign: 'center' },
                      }}
                    />
                  </Grid>

                  {/* Rate */}
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Rate (₹)"
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddProductItem();
                        }
                      }}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 800, color: '#B91C1C' },
                      }}
                    />
                  </Grid>

                  {/* Add Item Button */}
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      disableElevation
                      onClick={handleAddProductItem}
                      startIcon={<AddRoundedIcon sx={{ fontSize: 18 }} />}
                      sx={{
                        backgroundColor: '#FFFFFF',
                        color: '#B91C1C',
                        border: '1.5px solid #FDE68A',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        textTransform: 'none',
                        height: '38px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        '&:hover': { backgroundColor: '#FFFBEB' },
                      }}
                    >
                      Add Item
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* GST Invoice Items Table */}
              <TableContainer sx={{ minHeight: '260px', maxHeight: '460px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table stickyHeader size="small" aria-label="gst bill items table" sx={{ minWidth: { xs: '600px', sm: '100%' } }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '45px', backgroundColor: '#FFFBEB' }}>
                        #
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                        ITEM DESCRIPTION
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '75px', backgroundColor: '#FFFBEB' }}>
                        UNIT
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '135px', backgroundColor: '#FFFBEB' }}>
                        QTY
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '110px', backgroundColor: '#FFFBEB' }}>
                        RATE (₹)
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '100px', backgroundColor: '#FFFBEB' }}>
                        AMOUNT (₹)
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11px', color: '#7C2D12', width: '55px', backgroundColor: '#FFFBEB' }}>
                        ACTION
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                          <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#786C58' }}>
                            No items added to this GST invoice yet.
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#A8998A', mt: 0.5 }}>
                            Select fireworks / products from the top bar and click "Add Item".
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      productRows.map((row, idx) => (
                        <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                          <TableCell sx={{ fontSize: '12.5px', fontWeight: 700, color: '#786C58' }}>
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13px', fontWeight: 700, color: '#1F1714' }}>
                            {row.particular}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '12px', color: '#57463A' }}>
                            {row.pktUnit}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.8, px: 0.5, width: '135px' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleQuantityStep(row.id, -1)}
                                style={{
                                  width: '24px',
                                  height: '26px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '15px',
                                  fontWeight: 700,
                                  color: '#64748B',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                }}
                              >
                                –
                              </button>
                              <input
                                type="text"
                                value={row.quantity}
                                onChange={(e) => handleQuantityInputChange(row.id, e.target.value)}
                                onBlur={() => handleQuantityBlur(row.id)}
                                style={{
                                  width: '42px',
                                  height: '26px',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#1E293B',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '5px',
                                  backgroundColor: '#FFFFFF',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  padding: '0 2px',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityStep(row.id, 1)}
                                style={{
                                  width: '24px',
                                  height: '26px',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '15px',
                                  fontWeight: 700,
                                  color: '#64748B',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                }}
                              >
                                +
                              </button>
                            </Box>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.8, px: 0.5, width: '110px' }}>
                            <input
                              type="text"
                              value={row.rate}
                              onChange={(e) => handleRateInputChange(row.id, e.target.value)}
                              style={{
                                width: '74px',
                                height: '26px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#1E293B',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                outline: 'none',
                                boxSizing: 'border-box',
                                padding: '0 6px',
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '13.5px', fontWeight: 800, color: '#B91C1C' }}>
                            ₹{Number(row.amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRow(row.id)}
                              sx={{ color: '#DC2626', p: 0.5, '&:hover': { backgroundColor: '#FEF2F2' } }}
                            >
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* VIEW 2: RECENT GST INVOICES */}
      {activeSubView === 'history' && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '14px',
            border: '1.5px solid #FDE68A',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 20px -2px rgba(217, 119, 6, 0.08)',
          }}
        >
          {/* Top Filter and Search Bar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#B91C1C' }}>
              Past GST Tax Invoices
            </Typography>

            <Box sx={{ width: { xs: '100%', sm: '320px' } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by Invoice #, Customer or GSTIN..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                      </InputAdornment>
                    ),
                    endAdornment: historySearchTerm ? (
                      <IconButton size="small" onClick={() => setHistorySearchTerm('')}>
                        <ClearRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    ) : null,
                  },
                }}
                sx={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: '8px',
                  '& .MuiInputBase-input': { fontSize: '13px', fontWeight: 600 },
                }}
              />
            </Box>
          </Box>

          {/* Table */}
          {loadingHistory ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} sx={{ color: '#DC2626' }} />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '600px', overflowX: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#FFFBEB' }}>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      INVOICE #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      DATE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      CUSTOMER / BUYER
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      GSTIN
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      STATE
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      TAXABLE (₹)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB' }}>
                      TOTAL (₹)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11.5px', color: '#7C2D12', backgroundColor: '#FFFBEB', width: '130px' }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistoryBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9CA3AF' }}>
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#786C58' }}>
                          No GST tax invoices found.
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#A8998A', mt: 0.5 }}>
                          Invoices created in the GST Bill section will be listed here.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistoryBills.map((bill) => {
                      const totalNum = parseFloat(String(bill.total || bill.amount || '0').replace(/,/g, '')) || 0;
                      const taxableNum = parseFloat(String(bill.amount || '0').replace(/,/g, '')) || 0;

                      const printData: BillPrintData = {
                        billNo: bill.billNo,
                        date: bill.date,
                        billType: 'GST',
                        customerName: bill.customerName,
                        customerPhone: bill.customerPhone,
                        customerAddress: bill.customerAddress,
                        customerGst: bill.customerGst,
                        customerState: bill.customerState || 'Tamil Nadu',
                        stateCode: bill.stateCode || '33',
                        companyName: bill.companyName || storeSettings.companyName || 'VARUN TRADERS',
                        transport: bill.transport,
                        caseCount: bill.caseCount,
                        discount: bill.discount,
                        packing: bill.packing,
                        tax: bill.tax,
                        cgst: bill.cgst,
                        sgst: bill.sgst,
                        igst: bill.igst,
                        roundOff: bill.roundOff,
                        notes:
                          (storeSettings.billTerms && storeSettings.billTerms.trim()) ||
                          (typeof window !== 'undefined' ? (localStorage.getItem('varun_gst_bill_terms') || '').trim() : '') ||
                          (bill.notes ? String(bill.notes).replace(/^\[GST_BILL\]\s*/, '') : undefined),
                        amount: bill.amount,
                        total: bill.total,
                        products: bill.products || [],
                      };

                      return (
                        <TableRow key={bill._id || bill.id} sx={{ '&:hover': { backgroundColor: '#FEFDF5' } }}>
                          <TableCell sx={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C' }}>
                            {bill.billNo}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12.5px', color: '#57463A' }}>
                            {bill.date}
                          </TableCell>
                          <TableCell sx={{ fontSize: '13.5px', fontWeight: 700, color: '#1F1714' }}>
                            {bill.customerName}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#78350F' }}>
                            {bill.customerGst || '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '12px', color: '#57463A' }}>
                            {bill.customerState || 'Tamil Nadu'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '13px', fontWeight: 700, color: '#78350F' }}>
                            ₹{taxableNum.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '13.5px', fontWeight: 900, color: '#B91C1C' }}>
                            ₹{totalNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title="Print GST Invoice" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBillForPrint(printData);
                                    setPrintModalOpen(true);
                                  }}
                                  sx={{ color: '#B91C1C', p: 0.6, '&:hover': { backgroundColor: '#FEF2F2' } }}
                                >
                                  <PrintOutlinedIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Share on WhatsApp (PDF)" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBillForWhatsApp(printData);
                                    setWhatsAppModalOpen(true);
                                  }}
                                  sx={{ color: '#25D366', p: 0.6, '&:hover': { backgroundColor: '#ECFDF5' } }}
                                >
                                  <WhatsAppIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Delete Invoice" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteBill(bill._id || bill.id, bill.billNo)}
                                  sx={{ color: '#DC2626', p: 0.6, '&:hover': { backgroundColor: '#FEF2F2' } }}
                                >
                                  <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Print Bill Modal */}
      {printModalOpen && selectedBillForPrint && (
        <BillPrintModal
          open={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setSelectedBillForPrint(null);
          }}
          bill={selectedBillForPrint}
        />
      )}

      {/* WhatsApp Share PDF Modal */}
      {whatsAppModalOpen && selectedBillForWhatsApp && (
        <WhatsAppShareModal
          open={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setSelectedBillForWhatsApp(null);
          }}
          bill={selectedBillForWhatsApp}
        />
      )}
    </Box>
  );
};
