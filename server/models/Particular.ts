import mongoose, { Schema, Document } from 'mongoose';

export interface IParticularProductItem {
  particular: string;
  quantity: string;
  rate: string;
  pktUnit: string;
  amount: string;
  hsn?: string;
}

export interface IParticular extends Document {
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerState?: string;
  stateCode?: string;
  caseCount: string;
  companyName: string;
  discount: string;
  transport: string;
  packing: string;
  billNo: string;
  billType?: 'REGULAR' | 'GST';
  tax: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
  roundOff?: string;
  vehicleNo?: string;
  amount: string;
  total: string;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  paymentMode?: 'CASH' | 'UPI' | 'BANK' | 'CREDIT';
  paidAmount?: string;
  notes?: string;
  date: string;
  pdfData?: string;
  pdfName?: string;
  pdfPublicId?: string;
  products: IParticularProductItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ParticularProductItemSchema: Schema = new Schema({
  particular: { type: String, required: true },
  quantity: { type: String, default: '' },
  rate: { type: String, default: '' },
  pktUnit: { type: String, default: '' },
  amount: { type: String, default: '' },
  hsn: { type: String, default: '3604' },
});

const ParticularSchema: Schema = new Schema(
  {
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '' },
    customerAddress: { type: String, default: '' },
    customerGst: { type: String, default: '' },
    customerState: { type: String, default: 'Tamil Nadu' },
    stateCode: { type: String, default: '33' },
    caseCount: { type: String, default: '0' },
    companyName: { type: String, required: true, trim: true },
    discount: { type: String, default: '' },
    transport: { type: String, default: '' },
    packing: { type: String, default: '' },
    billNo: { type: String, required: true, trim: true },
    billType: { type: String, enum: ['REGULAR', 'GST'], default: 'REGULAR' },
    tax: { type: String, default: '' },
    cgst: { type: String, default: '' },
    sgst: { type: String, default: '' },
    igst: { type: String, default: '' },
    roundOff: { type: String, default: '0.00' },
    vehicleNo: { type: String, default: '' },
    amount: { type: String, default: '0.00' },
    total: { type: String, default: '0.00' },
    paymentStatus: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL'], default: 'UNPAID' },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'BANK', 'CREDIT'], default: 'CREDIT' },
    paidAmount: { type: String, default: '0.00' },
    notes: { type: String, default: '' },
    date: { type: String, required: true },
    pdfData: { type: String, default: '' },
    pdfName: { type: String, default: '' },
    pdfPublicId: { type: String, default: '' },
    products: [ParticularProductItemSchema],
  },
  { timestamps: true }
);

export const Particular = mongoose.model<IParticular>('Particular', ParticularSchema);
