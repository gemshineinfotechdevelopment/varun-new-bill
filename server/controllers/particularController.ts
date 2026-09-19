import type { Request, Response, NextFunction } from 'express';
import { Particular } from '../models/Particular';
import { AccountLedger } from '../models/AccountLedger';
import { Customer } from '../models/Customer';
import PriceList from '../models/PriceList';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { escapeRegex, recalculateCustomerBalance } from '../utils/ledgerUtils';
import { isCloudinaryConfigured, uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

// Helper to decrement (multiplier: -1) or increment/restore (multiplier: +1) shopStock and total stock in Inventory, PriceList, and Product collections
const adjustStock = async (products: any[], multiplier: number): Promise<void> => {
  if (!Array.isArray(products) || products.length === 0) return;

  for (const item of products) {
    const rawName = item.particular || item.name || item.itemName;
    const cleanName = typeof rawName === 'string' ? rawName.trim() : '';
    const rawQty = parseFloat(String(item.quantity || item.qty || '0').replace(/,/g, ''));
    const qty = isNaN(rawQty) ? 0 : rawQty;

    if (cleanName && qty !== 0) {
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedName}$`, 'i');

      try {
        // 1. Adjust in Inventory collection (Live multi-project stock)
        const inventoryItems = await Inventory.find({
          $or: [
            { productName: { $regex: nameRegex } },
            ...(item.sku ? [{ sku: item.sku }] : [])
          ]
        });

        for (const invItem of inventoryItems) {
          const currentShop = Number(invItem.shopStock ?? (invItem as any).shop_stock ?? 0);
          const currentGodown = Number(invItem.godownStock ?? (invItem as any).godown_stock ?? 0);
          let newShop = currentShop;
          let newGodown = currentGodown;

          if (multiplier < 0) {
            // Deducting stock on sale
            if (currentShop >= qty) {
              newShop = currentShop - qty;
            } else if (currentShop > 0) {
              const remaining = qty - currentShop;
              newShop = 0;
              newGodown = Math.max(0, currentGodown - remaining);
            } else if (currentGodown > 0) {
              newGodown = Math.max(0, currentGodown - qty);
            } else {
              newShop = currentShop - qty;
            }
          } else {
            // Restoring stock on delete/edit
            newShop = currentShop + qty;
          }

          const newTotal = newShop + newGodown;
          await Inventory.findByIdAndUpdate(invItem._id, {
            shopStock: newShop,
            godownStock: newGodown,
            totalStock: newTotal,
            stock: newTotal,
          });
        }

        // 2. Adjust in PriceList collection
        const priceItems = await PriceList.find({ itemName: { $regex: nameRegex } });
        for (const pItem of priceItems) {
          const currentShop = Number(pItem.shopStock ?? (pItem as any).shop_stock ?? 0);
          const currentGodown = Number(pItem.godownStock ?? (pItem as any).godown_stock ?? 0);
          let newShop = currentShop;
          let newGodown = currentGodown;

          if (multiplier < 0) {
            // Deducting stock on sale
            if (currentShop >= qty) {
              newShop = currentShop - qty;
            } else if (currentShop > 0) {
              const remaining = qty - currentShop;
              newShop = 0;
              newGodown = Math.max(0, currentGodown - remaining);
            } else if (currentGodown > 0) {
              newGodown = Math.max(0, currentGodown - qty);
            } else {
              newShop = currentShop - qty;
            }
          } else {
            // Restoring stock on delete/edit
            newShop = currentShop + qty;
          }

          const newTotal = newShop + newGodown;
          await PriceList.findByIdAndUpdate(pItem._id, {
            shopStock: newShop,
            godownStock: newGodown,
            stock: newTotal,
          });
        }

        // 3. Adjust in Product collection
        const productItems = await Product.find({ name: { $regex: nameRegex } });
        for (const pItem of productItems) {
          const currentShop = Number(pItem.shopStock ?? (pItem as any).shop_stock ?? 0);
          const currentGodown = Number(pItem.godownStock ?? (pItem as any).godown_stock ?? 0);
          let newShop = currentShop;
          let newGodown = currentGodown;

          if (multiplier < 0) {
            // Deducting stock on sale
            if (currentShop >= qty) {
              newShop = currentShop - qty;
            } else if (currentShop > 0) {
              const remaining = qty - currentShop;
              newShop = 0;
              newGodown = Math.max(0, currentGodown - remaining);
            } else if (currentGodown > 0) {
              newGodown = Math.max(0, currentGodown - qty);
            } else {
              newShop = currentShop - qty;
            }
          } else {
            // Restoring stock on delete/edit
            newShop = currentShop + qty;
          }

          const newTotal = newShop + newGodown;
          await Product.findByIdAndUpdate(pItem._id, {
            shopStock: newShop,
            godownStock: newGodown,
            stock: newTotal,
          });
        }
      } catch (err) {
        console.warn(`[Stock Adjustment Error] Could not update stock for "${cleanName}":`, err);
      }
    }
  }
};



export const getParticulars = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerName } = req.query;
    const filter: any = {};
    if (customerName && typeof customerName === 'string' && customerName.trim() !== '' && customerName.toLowerCase() !== 'all') {
      filter.customerName = { $regex: new RegExp(`^${escapeRegex(customerName.trim())}$`, 'i') };
    }

    const particulars = await Particular.find(filter).sort({ createdAt: -1, _id: -1 });
    res.status(200).json({ success: true, count: particulars.length, data: particulars });
  } catch (error) {
    next(error);
  }
};

export const getParticularById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const particular = await Particular.findById(req.params.id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }
    res.status(200).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const getNextBillNo = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const allParticulars = await Particular.find({}, 'billNo');
    let maxNum = 0;
    for (const p of allParticulars) {
      if (p.billNo) {
        const match = p.billNo.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    const nextBillNo = (maxNum + 1).toString().padStart(4, '0');
    res.status(200).json({ success: true, data: { nextBillNo } });
  } catch (error) {
    next(error);
  }
};

export const createParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      caseCount,
      companyName,
      discount,
      transport,
      packing,
      billNo,
      tax,
      amount,
      total,
      paymentStatus,
      paymentMode,
      paidAmount,
      notes,
      date,
      products,
    } = req.body;

    let finalBillNo = billNo ? String(billNo).trim() : '';
    if (!finalBillNo) {
      const allParticulars = await Particular.find({}, 'billNo');
      let maxNum = 0;
      for (const p of allParticulars) {
        if (p.billNo) {
          const match = p.billNo.match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      finalBillNo = (maxNum + 1).toString().padStart(4, '0');
    }

    const trimmedCustName = (customerName || 'General').trim();

    // Auto-create / update Customer in database if needed
    if (trimmedCustName) {
      try {
        const existingCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(trimmedCustName)}$`, 'i') },
        });

        if (!existingCustomer) {
          const allCusts = await Customer.find().sort({ createdAt: 1 });
          let maxId = 0;
          allCusts.forEach((c) => {
            if (c.idCode) {
              const m = c.idCode.match(/\d+/);
              if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxId) maxId = n;
              }
            }
          });

          const letter = trimmedCustName.charAt(0).toUpperCase() || 'C';
          const avatarColors = [
            { bg: '#EFF6FF', color: '#1D4ED8' },
            { bg: '#ECFDF5', color: '#047857' },
            { bg: '#FEF3C7', color: '#B45309' },
            { bg: '#FDF2F8', color: '#BE185D' },
            { bg: '#F5F3FF', color: '#6D28D9' },
            { bg: '#FFF1F2', color: '#BE123C' },
          ];
          const colorPair = avatarColors[trimmedCustName.length % avatarColors.length];

          await Customer.create({
            name: trimmedCustName,
            mobile: customerPhone || '-',
            address: customerAddress || '-',
            gst: customerGst || 'N/A',
            avatarLetter: letter,
            avatarBg: colorPair.bg,
            avatarColor: colorPair.color,
            idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
          });
          console.log(`[Auto Customer Created]: ${trimmedCustName}`);
        } else if (customerPhone || customerAddress || customerGst) {
          if ((!existingCustomer.mobile || existingCustomer.mobile === '-') && customerPhone) {
            existingCustomer.mobile = customerPhone;
          }
          if ((!existingCustomer.address || existingCustomer.address === '-') && customerAddress) {
            existingCustomer.address = customerAddress;
          }
          if ((!existingCustomer.gst || existingCustomer.gst === 'N/A') && customerGst) {
            existingCustomer.gst = customerGst;
          }
          await existingCustomer.save();
        }
      } catch (custSyncErr) {
        console.warn('[Customer Sync Error]:', custSyncErr);
      }
    }

    const billTotalNum = parseFloat(String(total || amount || '0').replace(/,/g, '')) || 0;
    const paidNum = parseFloat(String(paidAmount || (paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    let computedStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
    if (paymentStatus === 'PAID' || (paidNum >= billTotalNum && billTotalNum > 0)) {
      computedStatus = 'PAID';
    } else if (paidNum > 0 && paidNum < billTotalNum) {
      computedStatus = 'PARTIAL';
    }

    const particular = await Particular.create({
      customerName: trimmedCustName,
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      customerGst: customerGst || '',
      caseCount: caseCount || '0',
      companyName: companyName || 'General',
      discount: discount || '0',
      transport: transport || '-',
      packing: packing || '0',
      billNo: finalBillNo,
      tax: tax || '0',
      amount: amount || total || '0.00',
      total: total || amount || '0.00',
      paymentStatus: computedStatus,
      paymentMode: paymentMode || (computedStatus === 'PAID' ? 'CASH' : 'CREDIT'),
      paidAmount: paidNum > 0 ? paidNum.toFixed(2) : '0.00',
      notes: notes || '',
      date: date || new Date().toISOString().split('T')[0],
      products: products || [],
    });

    // 1. Automatically log Bill DEBIT to Account Ledger
    if (billTotalNum > 0) {
      await AccountLedger.create({
        particularId: String(particular._id),
        billNo: particular.billNo,
        customerName: particular.customerName,
        date: particular.date,
        companyName: particular.companyName,
        debit: billTotalNum.toFixed(2),
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      });
    }

    // 2. If bill is Paid or Partial Paid, log Payment CREDIT to Account Ledger
    if (paidNum > 0) {
      await AccountLedger.create({
        particularId: String(particular._id),
        billNo: particular.billNo,
        customerName: particular.customerName,
        date: particular.date,
        companyName: particular.companyName,
        debit: '0.00',
        credit: paidNum.toFixed(2),
        balance: '0.00',
        type: 'PAYMENT',
      });
    }

    if (billTotalNum > 0 || paidNum > 0) {
      await recalculateCustomerBalance(particular.customerName);
    }

    // 3. Automatically Deduct Sold Quantities from Stock (PriceList & Product collections)
    if (products && Array.isArray(products) && products.length > 0) {
      await adjustStock(products, -1);
    }

    res.status(201).json({ success: true, data: particular });
  } catch (error) {
    next(error);
  }
};

export const updateParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await Particular.findById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    const oldCustomerName = existing.customerName;

    const {
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      caseCount,
      companyName,
      discount,
      transport,
      packing,
      billNo,
      tax,
      amount,
      total,
      paymentStatus,
      paymentMode,
      paidAmount,
      notes,
      date,
      products,
    } = req.body;

    const updatedParticular = await Particular.findByIdAndUpdate(
      id,
      {
        ...(customerName !== undefined && { customerName: String(customerName).trim() }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(customerAddress !== undefined && { customerAddress }),
        ...(customerGst !== undefined && { customerGst }),
        ...(caseCount !== undefined && { caseCount }),
        ...(companyName !== undefined && { companyName }),
        ...(discount !== undefined && { discount }),
        ...(transport !== undefined && { transport }),
        ...(packing !== undefined && { packing }),
        ...(billNo !== undefined && { billNo: String(billNo).trim() }),
        ...(tax !== undefined && { tax }),
        ...(amount !== undefined && { amount }),
        ...(total !== undefined && { total }),
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(paymentMode !== undefined && { paymentMode }),
        ...(paidAmount !== undefined && { paidAmount }),
        ...(notes !== undefined && { notes }),
        ...(date !== undefined && { date }),
        ...(products !== undefined && { products }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedParticular) {
      res.status(404).json({ success: false, error: 'Failed to update particular bill' });
      return;
    }

    // Auto-create / update Customer record if needed
    const updatedCustName = (updatedParticular.customerName || '').trim();
    if (updatedCustName) {
      try {
        const existingCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(updatedCustName)}$`, 'i') },
        });
        if (!existingCustomer) {
          const allCusts = await Customer.find().sort({ createdAt: 1 });
          let maxId = 0;
          allCusts.forEach((c) => {
            if (c.idCode) {
              const m = c.idCode.match(/\d+/);
              if (m) {
                const n = parseInt(m[0], 10);
                if (n > maxId) maxId = n;
              }
            }
          });

          const letter = updatedCustName.charAt(0).toUpperCase() || 'C';
          const avatarColors = [
            { bg: '#EFF6FF', color: '#1D4ED8' },
            { bg: '#ECFDF5', color: '#047857' },
            { bg: '#FEF3C7', color: '#B45309' },
            { bg: '#FDF2F8', color: '#BE185D' },
            { bg: '#F5F3FF', color: '#6D28D9' },
            { bg: '#FFF1F2', color: '#BE123C' },
          ];
          const colorPair = avatarColors[updatedCustName.length % avatarColors.length];

          await Customer.create({
            name: updatedCustName,
            mobile: updatedParticular.customerPhone || '-',
            address: updatedParticular.customerAddress || '-',
            gst: updatedParticular.customerGst || 'N/A',
            avatarLetter: letter,
            avatarBg: colorPair.bg,
            avatarColor: colorPair.color,
            idCode: `#${(maxId + 1).toString().padStart(4, '0')}`,
          });
        }
      } catch (custSyncErr) {
        console.warn('[Customer Update Sync Error]:', custSyncErr);
      }
    }

    // Update or re-sync AccountLedger entries (BILL and PAYMENT)
    const billTotalNum = parseFloat(String(updatedParticular.total || updatedParticular.amount || '0').replace(/,/g, '')) || 0;
    const paidNum = parseFloat(String(updatedParticular.paidAmount || (updatedParticular.paymentStatus === 'PAID' ? billTotalNum : '0')).replace(/,/g, '')) || 0;

    // 1. BILL Ledger entry
    const billLedgerEntry = await AccountLedger.findOne({
      particularId: String(id),
      type: 'BILL',
    });

    if (billLedgerEntry) {
      billLedgerEntry.customerName = updatedParticular.customerName;
      billLedgerEntry.companyName = updatedParticular.companyName;
      billLedgerEntry.date = updatedParticular.date;
      billLedgerEntry.billNo = updatedParticular.billNo;
      billLedgerEntry.debit = billTotalNum.toFixed(2);
      await billLedgerEntry.save();
    } else if (billTotalNum > 0) {
      await AccountLedger.create({
        particularId: String(updatedParticular._id),
        billNo: updatedParticular.billNo,
        customerName: updatedParticular.customerName,
        date: updatedParticular.date,
        companyName: updatedParticular.companyName,
        debit: billTotalNum.toFixed(2),
        credit: '0.00',
        balance: '0.00',
        type: 'BILL',
      });
    }

    // 2. PAYMENT Ledger entry
    const paymentLedgerEntry = await AccountLedger.findOne({
      particularId: String(id),
      type: 'PAYMENT',
    });

    if (paymentLedgerEntry) {
      if (paidNum > 0) {
        paymentLedgerEntry.customerName = updatedParticular.customerName;
        paymentLedgerEntry.companyName = updatedParticular.companyName;
        paymentLedgerEntry.date = updatedParticular.date;
        paymentLedgerEntry.billNo = updatedParticular.billNo;
        paymentLedgerEntry.credit = paidNum.toFixed(2);
        await paymentLedgerEntry.save();
      } else {
        await AccountLedger.findByIdAndDelete(paymentLedgerEntry._id);
      }
    } else if (paidNum > 0) {
      await AccountLedger.create({
        particularId: String(updatedParticular._id),
        billNo: updatedParticular.billNo,
        customerName: updatedParticular.customerName,
        date: updatedParticular.date,
        companyName: updatedParticular.companyName,
        debit: '0.00',
        credit: paidNum.toFixed(2),
        balance: '0.00',
        type: 'PAYMENT',
      });
    }

    // 3. Adjust Stock if products in bill were updated
    if (products !== undefined) {
      if (existing.products && Array.isArray(existing.products)) {
        await adjustStock(existing.products, 1); // Restore old quantities
      }
      if (Array.isArray(products)) {
        await adjustStock(products, -1); // Deduct new quantities
      }
    }

    // Recalculate balances
    if (oldCustomerName && oldCustomerName !== updatedParticular.customerName) {
      await recalculateCustomerBalance(oldCustomerName);
    }
    await recalculateCustomerBalance(updatedParticular.customerName);

    res.status(200).json({ success: true, data: updatedParticular });
  } catch (error) {
    next(error);
  }
};

export const deleteParticular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const particular = await Particular.findById(req.params.id);
    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    const customerName = particular.customerName;

    // 1. Delete associated Cloudinary asset if present
    if (particular.pdfPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(particular.pdfPublicId);
    }

    // 2. Restore Stock for items in the deleted bill
    if (particular.products && Array.isArray(particular.products) && particular.products.length > 0) {
      await adjustStock(particular.products, 1);
    }

    // 3. Delete Particular Document
    await Particular.findByIdAndDelete(req.params.id);

    // 4. Cascade Delete: Delete matching AccountLedger entries (BILL and PAYMENT)
    await AccountLedger.deleteMany({
      $or: [
        { particularId: String(req.params.id) },
        { particularId: String(particular._id) },
      ],
    });

    // 5. Recalculate balance for this customer
    await recalculateCustomerBalance(customerName);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

export const uploadParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { pdfData, pdfName } = req.body;

    if (!pdfData) {
      res.status(400).json({ success: false, error: 'Document data is required' });
      return;
    }

    const existingParticular = await Particular.findById(id);
    if (!existingParticular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    let savedUrl = pdfData;
    let publicId = '';

    if (isCloudinaryConfigured()) {
      try {
        if (existingParticular.pdfPublicId) {
          await deleteFromCloudinary(existingParticular.pdfPublicId);
        }

        const cloudRes = await uploadToCloudinary(
          pdfData,
          'varun_trade/bills',
          pdfName || `Bill-${existingParticular.billNo || 'receipt'}`
        );

        savedUrl = cloudRes.secure_url;
        publicId = cloudRes.public_id;
        console.log(`[Cloudinary Success] Uploaded: ${savedUrl}`);
      } catch (cloudErr) {
        console.warn('[Cloudinary Warning] Falling back to direct database storage:', cloudErr);
        savedUrl = pdfData;
      }
    } else {
      console.log('[Storage] Storing document directly in database (Cloudinary not configured)');
    }

    existingParticular.pdfData = savedUrl;
    existingParticular.pdfName = pdfName || 'transport-receipt';
    existingParticular.pdfPublicId = publicId;
    await existingParticular.save();

    res.status(200).json({
      success: true,
      message: 'Transport receipt uploaded successfully',
      data: existingParticular,
    });
  } catch (error: any) {
    console.error('[Upload Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to upload document',
    });
  }
};

export const deleteParticularPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const particular = await Particular.findById(id);

    if (!particular) {
      res.status(404).json({ success: false, error: 'Particular bill not found' });
      return;
    }

    // Delete from Cloudinary if public_id exists
    if (particular.pdfPublicId && isCloudinaryConfigured()) {
      await deleteFromCloudinary(particular.pdfPublicId);
      console.log(`[Cloudinary Delete] Removed asset: ${particular.pdfPublicId}`);
    }

    particular.pdfData = '';
    particular.pdfName = '';
    particular.pdfPublicId = '';
    await particular.save();

    res.status(200).json({ success: true, message: 'PDF deleted successfully', data: particular });
  } catch (error) {
    next(error);
  }
};
