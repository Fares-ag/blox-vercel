import type { Application, PaymentSchedule } from '../models/application.model';
import moment from 'moment';
import { formatCurrency } from '../utils/formatters';

// Dynamic import for jsPDF
let jsPDFModule: Promise<any> | null = null;

const getJsPDF = async (): Promise<any> => {
  try {
    if (!jsPDFModule) {
      jsPDFModule = import('jspdf');
    }
    const module = await jsPDFModule;
    if (typeof module.jsPDF !== 'undefined') {
      return module.jsPDF;
    }
    if (module.default) {
      if (typeof module.default.jsPDF !== 'undefined') {
        return module.default.jsPDF;
      }
      return module.default;
    }
    return module;
  } catch (error) {
    console.error('Failed to import jsPDF:', error);
    throw new Error('Failed to load PDF library. Please ensure jspdf is installed.');
  }
};

export interface ReceiptData {
  application: Application;
  payment: PaymentSchedule;
  paidAmount: number;
  transactionId?: string;
  paymentMethod?: string;
  paidDate?: string;
}

export class ReceiptService {
  /**
   * Generate a payment receipt PDF
   */
  async generateReceipt(data: ReceiptData): Promise<string> {
    const JsPDF = await getJsPDF();
    const doc = new JsPDF('p', 'mm', 'a4');
    
    const { application, payment, paidAmount, transactionId, paymentMethod, paidDate } = data;
    const paidAt = paidDate || payment.paidDate || moment().format('YYYY-MM-DD');
    const vehicleName = application.vehicle
      ? `${application.vehicle.make} ${application.vehicle.model}${application.vehicle.trim ? ` ${application.vehicle.trim}` : ''}`.trim()
      : 'N/A';
    const customerName = application.customerName || 'N/A';
    const customerEmail = application.customerEmail || 'N/A';
    
    // Colors
    const primaryColor = [0, 207, 162]; // Blox green
    const darkGray = [26, 26, 26];
    const lightGray = [102, 102, 102];
    
    let yPos = 20;
    
    // Header with logo area (placeholder for logo)
    doc.setFillColor(...primaryColor);
    doc.rect(14, yPos, 182, 30, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOX', 105, yPos + 15, { align: 'center' });
    
    // Receipt title
    doc.setFontSize(16);
    doc.text('PAYMENT RECEIPT', 105, yPos + 25, { align: 'center' });
    
    yPos = 60;
    
    // Receipt details
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Receipt number and date
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt Number:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(transactionId || `REC-${application.id.substring(0, 8).toUpperCase()}-${moment().format('YYYYMMDD')}`, 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(moment(paidAt).format('MMMM D, YYYY'), 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Time:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(moment(paidAt).format('h:mm A'), 60, yPos);
    
    yPos += 15;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    
    // Customer Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Customer Information', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(customerEmail, 60, yPos);
    
    yPos += 15;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    
    // Payment Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Payment Details', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Application ID:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(application.id.substring(0, 8).toUpperCase(), 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(vehicleName, 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(moment(payment.dueDate).format('MMMM D, YYYY'), 60, yPos);
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Original Amount:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(payment.amount), 60, yPos);
    
    if (payment.paidAmount && payment.paidAmount < payment.amount) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Previously Paid:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(payment.paidAmount - paidAmount), 60, yPos);
    }
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Amount Paid:', 14, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text(formatCurrency(paidAmount), 60, yPos);
    
    if (payment.remainingAmount && payment.remainingAmount > 0) {
      yPos += 7;
      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text('Remaining Amount:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(payment.remainingAmount), 60, yPos);
    }
    
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Status:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    const statusText = payment.remainingAmount && payment.remainingAmount > 0 
      ? 'Partially Paid' 
      : 'Fully Paid';
    doc.text(statusText, 60, yPos);
    
    if (paymentMethod) {
      yPos += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' '), 60, yPos);
    }
    
    yPos += 20;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.text('This is an official receipt for your payment.', 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text('Please keep this receipt for your records.', 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text('For inquiries, please contact info@blox-it.com', 105, yPos, { align: 'center' });
    
    // Page number
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...lightGray);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Return as data URL for download or storage
    return doc.output('dataurlstring');
  }
  
  /**
   * Generate and download receipt
   */
  async generateAndDownload(data: ReceiptData, filename?: string): Promise<void> {
    const dataUrl = await this.generateReceipt(data);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || `receipt-${data.transactionId || moment().format('YYYY-MM-DD-HHmmss')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Generate receipt and return as Blob for storage
   */
  async generateAsBlob(data: ReceiptData): Promise<Blob> {
    const dataUrl = await this.generateReceipt(data);
    
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    return await response.blob();
  }
}

export const receiptService = new ReceiptService();

