import type { Application } from '../models/application.model';
import moment from 'moment';
import { formatCurrency } from '../utils/formatters';
import { devLogger } from '../utils/logger.util';

// Dynamic import for jsPDF
// Note: jsPDF types are complex and vary by version, so we use unknown and type guards
let jsPDFModule: Promise<any> | null = null;

const getJsPDF = async (): Promise<any> => {
  try {
    if (!jsPDFModule) {
      jsPDFModule = import('jspdf');
    }
    const module = await jsPDFModule;
    // jsPDF v3.x can export as default or named
    // Try multiple possible export patterns
    if (typeof module?.jsPDF !== 'undefined') {
      return module.jsPDF;
    }
    if (module?.default) {
      // Check if default has jsPDF
      if (typeof module.default?.jsPDF !== 'undefined') {
        return module.default.jsPDF;
      }
      // Default might be the class itself
      return module.default;
    }
    // Fallback to the module itself
    return module;
  } catch (error: unknown) {
    devLogger.error('Failed to import jsPDF:', error);
    throw new Error('Failed to load PDF library. Please ensure jspdf is installed.');
  }
};

// Contract Form Data Interface
export interface ContractFormData {
  // Company Information
  crNo: string;
  nationality: string;
  address: string;

  // Vehicle Information
  countryOfOrigin: string;
  cylinderNo: string;
  chassisNo: string;
  internalColor: string;

  // Service Contract
  hasServiceContract: 'yes' | 'no';
  warrantyStartDate: string | null; // ISO date string
  warrantyEndDate: string | null; // ISO date string

  // Pricing
  vehiclePrice: number;
  registrationFee: number;
  insuranceFees: number;
  extraFees: number;
  totalPrice: number;
  paymentDueBeforeRegistration: number;

  // Vehicle Registration
  registrationOtherPartyName: string;
  registrationContactDetails: string;

  // Vehicle Delivery
  deliveryOtherPartyName: string;
  deliveryContactDetails: string;

  // Representatives
  firstPartyRepresentative: string;
  secondPartyRepresentative: string;
}

interface ContractData {
  application: Application;
  contractFormData: ContractFormData;
}

export class ContractPdfService {
  private doc: any = null;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;
  private lineHeight: number;
  private primaryColor: string;
  private secondaryColor: string;
  private textColor: string;
  private lightGray: string;

  constructor() {
    this.pageWidth = 210;
    this.pageHeight = 297;
    this.margin = 25;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
    this.lineHeight = 6;
    this.primaryColor = '#00CFA2';
    this.secondaryColor = '#16535B';
    this.textColor = '#1a1a1a';
    this.lightGray = '#666666';
  }

  async generateContract(data: ContractData): Promise<void> {
    // Initialize new PDF document with dynamic import
    const JsPDF = await getJsPDF();
    this.doc = new JsPDF('p', 'mm', 'a4');
    this.currentY = this.margin;
    const { application, contractFormData } = data;

    // Header with logo and company info
    await this.addHeader();

    // Title
    this.addTitle('VEHICLE FINANCING AGREEMENT');

    // Contract Information
    this.addSectionTitle('Contract Information');
    this.addKeyValue('Contract Number', application.id);
    this.addKeyValue('Date', moment().format('DD MMMM YYYY'));
    this.addSpacing(5);

    // Parties Information
    this.addSectionTitle('Parties to the Agreement');
    this.addSubsectionTitle('First Party (BLOX)');
    this.addKeyValue('Company Registration No.', contractFormData.crNo || 'N/A');
    this.addKeyValue('Represented By', contractFormData.firstPartyRepresentative || 'N/A');
    this.addSpacing(3);

    this.addSubsectionTitle('Second Party (Customer)');
    this.addKeyValue('Name', `${application.customerName || 'N/A'}`);
    this.addKeyValue('Email', application.customerEmail || 'N/A');
    this.addKeyValue('Phone', application.customerPhone || 'N/A');
    this.addKeyValue('Nationality', contractFormData.nationality || 'N/A');
    this.addKeyValue('Address', contractFormData.address || 'N/A');
    this.addKeyValue('Represented By', contractFormData.secondPartyRepresentative || 'N/A');
    this.addSpacing(5);

    // Vehicle Information
    this.checkNewPage();
    this.addSectionTitle('Vehicle Information');
    if (application.vehicle) {
      this.addKeyValue('Make & Model', `${application.vehicle.make} ${application.vehicle.model}`);
      this.addKeyValue('Trim', application.vehicle.trim || 'N/A');
      this.addKeyValue('Model Year', application.vehicle.modelYear?.toString() || 'N/A');
      this.addKeyValue('Engine', application.vehicle.engine || 'N/A');
      this.addKeyValue('Color', application.vehicle.color || 'N/A');
    }
    this.addKeyValue('Country of Origin', contractFormData.countryOfOrigin || 'N/A');
    this.addKeyValue('Cylinder Number', contractFormData.cylinderNo || 'N/A');
    this.addKeyValue('Chassis Number', contractFormData.chassisNo || 'N/A');
    this.addKeyValue('Internal Color', contractFormData.internalColor || 'N/A');
    this.addSpacing(5);

    // Service Contract
    if (contractFormData.hasServiceContract === 'yes') {
      this.addSectionTitle('Service Contract & Warranty');
      if (contractFormData.warrantyStartDate && contractFormData.warrantyEndDate) {
        this.addKeyValue('Warranty Start Date', moment(contractFormData.warrantyStartDate).format('DD MMMM YYYY'));
        this.addKeyValue('Warranty End Date', moment(contractFormData.warrantyEndDate).format('DD MMMM YYYY'));
      }
      this.addSpacing(5);
    }

    // Financial Details
    this.checkNewPage();
    this.addSectionTitle('Financial Details');
    this.addKeyValue('Vehicle Price', formatCurrency(contractFormData.vehiclePrice || 0));
    this.addKeyValue('Registration Fee', formatCurrency(contractFormData.registrationFee || 0));
    this.addKeyValue('Insurance Fees', formatCurrency(contractFormData.insuranceFees || 0));
    if (contractFormData.extraFees && contractFormData.extraFees > 0) {
      this.addKeyValue('Extra Fees', formatCurrency(contractFormData.extraFees));
    }
    this.addDivider();
    this.addKeyValue('Total Price', formatCurrency(contractFormData.totalPrice || 0), true);
    this.addKeyValue('Down Payment', formatCurrency(application.downPayment || 0));
    this.addKeyValue('Loan Amount', formatCurrency(application.loanAmount || 0));
    this.addKeyValue('Payment Due Before Registration & Delivery', formatCurrency(contractFormData.paymentDueBeforeRegistration || 0));
    
    if (application.installmentPlan) {
      this.addSpacing(3);
      this.addSubsectionTitle('Installment Plan');
      this.addKeyValue('Tenure', application.installmentPlan.tenure || 'N/A');
      this.addKeyValue('Payment Interval', application.installmentPlan.interval || 'N/A');
      this.addKeyValue('First Month Payment', formatCurrency(application.installmentPlan.monthlyAmount || 0));
      this.addKeyValue('Total Amount', formatCurrency(application.installmentPlan.totalAmount || 0));
    }
    this.addSpacing(5);

    // Vehicle Registration
    this.checkNewPage();
    this.addSectionTitle('Vehicle Registration');
    this.addKeyValue('Other Party Name', contractFormData.registrationOtherPartyName || 'N/A');
    this.addKeyValue('Contact Details', contractFormData.registrationContactDetails || 'N/A');
    this.addSpacing(5);

    // Vehicle Delivery
    this.addSectionTitle('Vehicle Delivery');
    this.addKeyValue('Other Party Name', contractFormData.deliveryOtherPartyName || 'N/A');
    this.addKeyValue('Contact Details', contractFormData.deliveryContactDetails || 'N/A');
    this.addSpacing(5);

    // Terms and Conditions
    this.checkNewPage();
    this.addSectionTitle('Terms and Conditions');
    this.addParagraph('1. The Customer agrees to make monthly payments as specified in the Installment Plan section.');
    this.addParagraph('2. Failure to make timely payments may result in penalties as per company policy.');
    this.addParagraph('3. The vehicle remains the property of BLOX until all payments are completed.');
    this.addParagraph('4. The Customer is responsible for maintaining proper insurance coverage throughout the contract period.');
    this.addParagraph('5. Early termination of the contract may incur additional fees.');
    this.addParagraph('6. All disputes shall be resolved according to the laws of Qatar.');
    this.addSpacing(5);

    // Signatures
    this.checkNewPage();
    this.addSectionTitle('Signatures');
    this.currentY += 10;
    
    if (!this.doc) return;
    
    // Signature section with better layout
    const signatureBoxWidth = 75;
    const signatureY = this.currentY;
    const textRgb = this.hexToRgb(this.textColor);
    const primaryRgb = this.hexToRgb(this.primaryColor);
    const lightGrayRgb = this.hexToRgb(this.lightGray);
    
    // First Party Signature (Left)
    this.doc.setFontSize(10);
    this.doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('First Party (BLOX)', this.margin, this.currentY);
    this.currentY += 18;
    
    // Signature line with accent
    this.doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.margin + signatureBoxWidth, this.currentY);
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(lightGrayRgb[0], lightGrayRgb[1], lightGrayRgb[2]);
    this.doc.text(contractFormData.firstPartyRepresentative || 'Authorized Representative', this.margin, this.currentY);

    // Second Party Signature (Right)
    this.currentY = signatureY;
    this.doc.setFontSize(10);
    this.doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    this.doc.setFont('helvetica', 'bold');
    const secondPartyX = this.pageWidth - this.margin - signatureBoxWidth;
    this.doc.text('Second Party (Customer)', secondPartyX, this.currentY);
    this.currentY += 18;
    
    // Signature line
    this.doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(secondPartyX, this.currentY, secondPartyX + signatureBoxWidth, this.currentY);
    this.currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(lightGrayRgb[0], lightGrayRgb[1], lightGrayRgb[2]);
    this.doc.text(contractFormData.secondPartyRepresentative || application.customerName || 'Customer', secondPartyX, this.currentY);
    
    // Reset currentY to the bottom signature area
    this.currentY = signatureY + 35;
    
    if (application.contractSigned) {
      this.currentY += 8;
      this.doc.setFontSize(8);
      this.doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('âœ“ Signed: ' + moment().format('DD MMM YYYY'), this.margin, this.currentY);
    }

    // Footer on all pages
    this.addFooter();
  }

  private async addHeader(): Promise<void> {
    if (!this.doc) return;
    
    try {
      // Try to add logo from public folder
      const logoUrl = '/BloxLogoNav.png';
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      // Try to load logo, if it fails, use text fallback
      try {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
          // Timeout after 1 second
          setTimeout(() => reject(new Error('Timeout')), 1000);
        });
        
        // Logo loaded successfully, add it
        const logoHeight = 15;
        const logoWidth = (img.width / img.height) * logoHeight;
        this.doc.addImage(img, 'PNG', this.margin, 15, logoWidth, logoHeight);
      } catch (error) {
        // Fallback to text logo if image fails to load
        this.doc.setFontSize(20);
        const secondaryRgb = this.hexToRgb(this.secondaryColor);
        this.doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('BLOX', this.margin, 23);
      }
    } catch (error) {
      // Final fallback
      this.doc.setFontSize(20);
      const secondaryRgb = this.hexToRgb(this.secondaryColor);
      this.doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('BLOX', this.margin, 23);
    }

    // Subtle header line
    const primaryRgb = this.hexToRgb(this.primaryColor);
    this.doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, 35, this.pageWidth - this.margin, 35);

    this.currentY = 45;
  }

  private addTitle(text: string): void {
    this.currentY += 8;
    this.doc.setFontSize(22);
    const secondaryRgb = this.hexToRgb(this.secondaryColor);
    this.doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
    this.doc.setFont('helvetica', 'bold');
    const textWidth = this.doc.getTextWidth(text);
    const x = (this.pageWidth - textWidth) / 2;
    this.doc.text(text, x, this.currentY);
    this.currentY += 12;

    // Subtle underline with accent color
    const primaryRgb = this.hexToRgb(this.primaryColor);
    this.doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    this.doc.setLineWidth(1);
    const lineWidth = 60;
    const lineX = (this.pageWidth - lineWidth) / 2;
    this.doc.line(lineX, this.currentY, lineX + lineWidth, this.currentY);
    this.currentY += 15;
  }

  private addSectionTitle(text: string): void {
    this.checkNewPage();
    if (!this.doc) return;
    this.currentY += 5;
    this.doc.setFontSize(14);
    const secondaryRgb = this.hexToRgb(this.secondaryColor);
    this.doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text.toUpperCase(), this.margin, this.currentY);
    this.currentY += 2;
    
    // Thin accent line
    const primaryRgb = this.hexToRgb(this.primaryColor);
    this.doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.margin + 40, this.currentY);
    this.currentY += 10;
  }

  private addSubsectionTitle(text: string): void {
    if (!this.doc) return;
    this.currentY += 4;
    this.doc.setFontSize(11);
    const secondaryRgb = this.hexToRgb(this.secondaryColor);
    this.doc.setTextColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += 7;
  }

  private addKeyValue(key: string, value: string, bold: boolean = false): void {
    this.checkNewPage();
    if (!this.doc) return;
    
    // Key styling - lighter gray
    this.doc.setFontSize(9);
    const lightGrayRgb = this.hexToRgb(this.lightGray);
    this.doc.setTextColor(lightGrayRgb[0], lightGrayRgb[1], lightGrayRgb[2]);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(key + ':', this.margin, this.currentY);
    
    // Value styling
    const keyWidth = this.doc.getTextWidth(key + ': ');
    const maxValueWidth = this.contentWidth - keyWidth - 5;
    const lines = this.doc.splitTextToSize(value || 'N/A', maxValueWidth);
    
    const textRgb = this.hexToRgb(this.textColor);
    this.doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    
    if (lines.length === 1) {
      this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
      this.doc.text(value || 'N/A', this.margin + keyWidth, this.currentY);
      this.currentY += this.lineHeight + 1;
    } else {
      // Multi-line value
      lines.forEach((line: string) => {
        this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
        this.doc.text(line, this.margin + keyWidth, this.currentY);
        this.currentY += this.lineHeight;
      });
      this.currentY += 1;
    }
  }

  private addParagraph(text: string): void {
    this.checkNewPage();
    if (!this.doc) return;
    this.doc.setFontSize(9);
    const textRgb = this.hexToRgb(this.textColor);
    this.doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    this.doc.setFont('helvetica', 'normal');
    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    lines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += this.lineHeight + 1;
    });
    this.currentY += 3;
  }

  private addDivider(): void {
    if (!this.doc) return;
    this.currentY += 3;
    this.doc.setDrawColor(230, 230, 230);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
  }

  private addSpacing(space: number): void {
    this.currentY += space;
  }

  private addFooter(): void {
    if (!this.doc) return;
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(this.lightGray);
      this.doc.setFont('helvetica', 'normal');
      
      // Footer line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
      
      // Footer text
      const footerText = `Page ${i} of ${pageCount} | BLOX Vehicle Financing - Confidential Document`;
      const textWidth = this.doc.getTextWidth(footerText);
      const x = (this.pageWidth - textWidth) / 2;
      this.doc.text(footerText, x, this.pageHeight - 10);
      
      // Company info
      this.doc.text('Â© BLOX. All rights reserved.', this.margin, this.pageHeight - 10);
      this.doc.text('Generated on ' + moment().format('DD MMMM YYYY HH:mm'), this.pageWidth - this.margin - 40, this.pageHeight - 10);
    }
  }

  private checkNewPage(): void {
    if (!this.doc) return;
    if (this.currentY > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  save(filename?: string): void {
    if (!this.doc) {
      throw new Error('No PDF document generated. Call generateContract first.');
    }
    const contractFilename = filename || `Contract-${moment().format('YYYY-MM-DD')}.pdf`;
    this.doc.save(contractFilename);
  }

  getBlob(): Blob {
    if (!this.doc) {
      throw new Error('No PDF document generated. Call generateContract first.');
    }
    return this.doc.output('blob');
  }

  getDataUrl(): string {
    if (!this.doc) {
      throw new Error('No PDF document generated. Call generateContract first.');
    }
    return this.doc.output('dataurlstring');
  }

  // Static method to generate and save in one call
  static async generateAndSave(data: ContractData, filename?: string): Promise<void> {
    const service = new ContractPdfService();
    await service.generateContract(data);
    service.save(filename);
  }
}

export const contractPdfService = new ContractPdfService();

