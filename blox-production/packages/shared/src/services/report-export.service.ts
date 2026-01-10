import { formatCurrency, formatDate } from '../utils/formatters';
import type {
  RevenueForecast,
  ConversionFunnelStage,
  PaymentCollectionRate,
  CustomerLifetimeValue,
  DashboardStats,
} from '../models/dashboard.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export service for generating PDF and Excel reports
 */
class ReportExportService {
  /**
   * Export data to Excel (CSV format)
   */
  exportToExcel(data: Record<string, unknown>[], filename: string): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.map((h) => this.formatHeader(h)).join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, newline, or quote
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Export dashboard report to PDF (using browser print)
   * For a more advanced PDF, consider using libraries like jsPDF or pdfmake
   */
  exportToPDF(title: string, content: HTMLElement, filename: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (import.meta.env.DEV) {
        console.error('Failed to open print window');
      }
      return;
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const safeTitle = escapeHtml(title);
    const safeContent = content.textContent || content.innerText || '';
    const generatedDate = escapeHtml(new Date().toLocaleString());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            body {
              font-family: 'IBM Plex Sans', Arial, sans-serif;
              padding: 20px;
              color: #2E2C34;
            }
            h1 {
              color: #2E2C34;
              border-bottom: 2px solid #00CFA2;
              padding-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #E5E5E5;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #F1F2F4;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E5E5;
              font-size: 12px;
              color: #6B7280;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${safeTitle}</h1>
          <div>${safeContent}</div>
          <div class="footer">
            <p>Generated on ${generatedDate}</p>
            <p>Blox Market - Analytics Report</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  /**
   * Export revenue forecast to Excel
   */
  exportRevenueForecast(data: RevenueForecast[], filename: string = 'revenue_forecast'): void {
    const formattedData = data.map((item) => ({
      Period: item.period,
      'Projected Revenue': formatCurrency(item.projectedRevenue),
      'Actual Revenue': formatCurrency(item.actualRevenue),
      'Forecasted Revenue': formatCurrency(item.forecastedRevenue),
    }));

    this.exportToExcel(formattedData, filename);
  }

  /**
   * Export conversion funnel to Excel
   */
  exportConversionFunnel(data: ConversionFunnelStage[], filename: string = 'conversion_funnel'): void {
    const formattedData = data.map((item) => ({
      Stage: item.stage,
      Count: item.count,
      Percentage: `${item.percentage.toFixed(2)}%`,
      'Drop-off Rate': item.dropOffRate ? `${item.dropOffRate.toFixed(2)}%` : 'N/A',
    }));

    this.exportToExcel(formattedData, filename);
  }

  /**
   * Export payment collection rates to Excel
   */
  exportPaymentCollectionRates(
    data: PaymentCollectionRate[],
    filename: string = 'payment_collection_rates'
  ): void {
    const formattedData = data.map((item) => ({
      Period: item.period,
      'Total Due': formatCurrency(item.totalDue),
      'Total Collected': formatCurrency(item.totalCollected),
      'Collection Rate': `${item.collectionRate.toFixed(2)}%`,
      'Overdue Amount': formatCurrency(item.overdueAmount),
      'Overdue Rate': `${item.overdueRate.toFixed(2)}%`,
    }));

    this.exportToExcel(formattedData, filename);
  }

  /**
   * Export customer lifetime value to Excel
   */
  exportCustomerLifetimeValue(
    data: CustomerLifetimeValue[],
    filename: string = 'customer_lifetime_value'
  ): void {
    const formattedData = data.map((item) => ({
      'Customer Email': item.customerEmail,
      'Customer Name': item.customerName,
      'Total Revenue': formatCurrency(item.totalRevenue),
      'Total Applications': item.totalApplications,
      'Average Application Value': formatCurrency(item.averageApplicationValue),
      'Average Payment Amount': formatCurrency(item.averagePaymentAmount),
      'Total Payments': item.totalPayments,
      'Last Payment Date': item.lastPaymentDate ? formatDate(item.lastPaymentDate) : 'N/A',
      'Customer Since': formatDate(item.customerSince),
      'Customer Lifetime Value (CLV)': formatCurrency(item.clv),
    }));

    this.exportToExcel(formattedData, filename);
  }

  /**
   * Export comprehensive dashboard report
   */
  exportDashboardReport(
    stats: DashboardStats,
    revenueForecast: RevenueForecast[],
    conversionFunnel: ConversionFunnelStage[],
    paymentCollectionRates: PaymentCollectionRate[],
    topCustomers: CustomerLifetimeValue[],
    dateRange: { startDate: string; endDate: string }
  ): void {
    const reportContent = document.createElement('div');
    reportContent.innerHTML = `
      <div>
        <h2>Dashboard Summary</h2>
        <p><strong>Date Range:</strong> ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}</p>
        <table>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Projected Revenue</td>
            <td>${formatCurrency(stats.projectedRevenue)}</td>
          </tr>
          <tr>
            <td>Real Revenue</td>
            <td>${formatCurrency(stats.realRevenue)}</td>
          </tr>
          <tr>
            <td>Active Applications</td>
            <td>${stats.activeApplications}</td>
          </tr>
          <tr>
            <td>Profitability</td>
            <td>${stats.profitability.toFixed(2)}%</td>
          </tr>
        </table>
      </div>
      <div>
        <h2>Top Customers by Lifetime Value</h2>
        <table>
          <tr>
            <th>Customer</th>
            <th>Total Revenue</th>
            <th>CLV</th>
            <th>Applications</th>
          </tr>
          ${topCustomers
            .slice(0, 10)
            .map(
              (customer) => `
            <tr>
              <td>${customer.customerName}</td>
              <td>${formatCurrency(customer.totalRevenue)}</td>
              <td>${formatCurrency(customer.clv)}</td>
              <td>${customer.totalApplications}</td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    `;

    this.exportToPDF(
      'Blox Market Dashboard Report',
      reportContent,
      `dashboard_report_${new Date().toISOString().split('T')[0]}`
    );
  }

  /**
   * Format header for display
   */
  private formatHeader(header: string): string {
    return header
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Load logo as base64 (tries multiple paths)
   */
  private async loadLogo(): Promise<string | null> {
    const logoPaths = [
      '/BloxLogoNav.png',
      '/BloxLogo.png',
      '/admin/BloxLogo.png',
      '/customer/BloxLogo.png',
    ];

    for (const path of logoPaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    if (import.meta.env.DEV) {
      console.warn('Logo not found, using text logo');
    }
    return null;
  }

  /**
   * Add header with logo and title to PDF
   */
  private addPDFHeader(doc: jsPDF, title: string, subtitle?: string, logoBase64?: string | null): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Brand colors
    const primaryColor = '#00CFA2';
    const secondaryColor = '#2E2C34';
    const textColor = '#111827';
    const lightGray = '#F1F2F4';

    // Add top accent bar
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Add logo or text logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, 12, 40, 12);
      } catch (error) {
        // If image fails, use text logo
        this.addTextLogo(doc, margin, 12);
      }
    } else {
      this.addTextLogo(doc, margin, 12);
    }

    // Add title
    doc.setFontSize(24);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, 35);

    // Add subtitle if provided
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, margin, 42);
    }

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Generated on ${dateStr}`, pageWidth - margin, 35, { align: 'right' });

    // Add separator line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, 48, pageWidth - margin, 48);
  }

  /**
   * Add text-based logo
   */
  private addTextLogo(doc: jsPDF, x: number, y: number): void {
    doc.setFontSize(18);
    doc.setTextColor(0, 207, 162); // Primary color
    doc.setFont('helvetica', 'bold');
    doc.text('BLOX', x, y + 8);
  }

  /**
   * Add footer to PDF
   */
  private addPDFFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    
    // Footer text
    const footerText = 'Blox Market - Confidential Report';
    doc.text(footerText, margin, pageHeight - 15);
    
    // Page number
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
  }

  /**
   * Export Executive Dashboard PDF - Quick Overview
   */
  async exportExecutiveDashboardPDF(
    stats: DashboardStats,
    topCustomers: CustomerLifetimeValue[],
    dateRange: { startDate: string; endDate: string }
  ): Promise<void> {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 60;

    // Brand colors
    const primaryColor = '#00CFA2';
    const secondaryColor = '#2E2C34';
    const successColor = '#09C97F';
    const warningColor = '#E2B13C';
    const dangerColor = '#F95668';

    // Load logo
    const logoBase64 = await this.loadLogo();

    // Add header
    this.addPDFHeader(
      doc,
      'Executive Dashboard',
      `Period: ${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`,
      logoBase64
    );

    // Key Metrics Section
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', margin, yPosition);
    yPosition += 10;

    // Create metrics grid (2x2)
    const metrics = [
      { label: 'Projected Revenue', value: stats.projectedRevenue, color: primaryColor },
      { label: 'Real Revenue', value: stats.realRevenue, color: successColor },
      { label: 'Active Applications', value: stats.activeApplications, color: primaryColor },
      { label: 'Profitability', value: `${stats.profitability.toFixed(2)}%`, color: stats.profitability > 0 ? successColor : dangerColor },
    ];

    const boxWidth = (pageWidth - margin * 3) / 2;
    const boxHeight = 25;
    let xPos = margin;
    let row = 0;

    metrics.forEach((metric, index) => {
      if (index > 0 && index % 2 === 0) {
        row++;
        xPos = margin;
        yPosition += boxHeight + 10;
      }

      // Box background
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(xPos, yPosition, boxWidth, boxHeight, 3, 3, 'F');

      // Label
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.label, xPos + 8, yPosition + 8);

      // Value
      doc.setFontSize(18);
      doc.setTextColor(metric.color);
      doc.setFont('helvetica', 'bold');
      const valueText = typeof metric.value === 'number' && metric.label !== 'Profitability' 
        ? formatCurrency(metric.value)
        : String(metric.value);
      doc.text(valueText, xPos + 8, yPosition + 18);

      xPos += boxWidth + margin;
    });

    yPosition += boxHeight + 20;

    // Financial Overview
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Overview', margin, yPosition);
    yPosition += 10;

    const financialData = [
      ['Monthly Payable', formatCurrency(stats.monthlyPayable)],
      ['Monthly Receivable', formatCurrency(stats.monthlyReceivable)],
      ['Paid Installments', formatCurrency(stats.paidInstallments)],
      ['Unpaid Installments', formatCurrency(stats.unpaidInstallments)],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Amount']],
      body: financialData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 207, 162],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [17, 24, 39],
      },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Top Customers Section
    if (topCustomers && topCustomers.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Customers', margin, yPosition);
      yPosition += 10;

      const customerData = topCustomers.slice(0, 5).map((customer) => [
        customer.customerName,
        formatCurrency(customer.totalRevenue),
        formatCurrency(customer.clv),
        customer.totalApplications.toString(),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Customer', 'Total Revenue', 'Lifetime Value', 'Applications']],
        body: customerData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 207, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [17, 24, 39],
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });
    }

    // Add footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.addPDFFooter(doc, i, totalPages);
    }

    // Save PDF
    const filename = `Executive_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  /**
   * Export Monthly Financial Summary PDF - Comprehensive Report
   */
  async exportMonthlyFinancialSummaryPDF(
    stats: DashboardStats,
    revenueForecast: RevenueForecast[],
    paymentCollectionRates: PaymentCollectionRate[],
    conversionFunnel: ConversionFunnelStage[],
    topCustomers: CustomerLifetimeValue[],
    dateRange: { startDate: string; endDate: string }
  ): Promise<void> {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 60;

    // Brand colors
    const primaryColor = '#00CFA2';
    const secondaryColor = '#2E2C34';
    const successColor = '#09C97F';
    const warningColor = '#E2B13C';
    const dangerColor = '#F95668';

    // Load logo
    const logoBase64 = await this.loadLogo();

    // Add header
    const monthYear = new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    this.addPDFHeader(
      doc,
      'Monthly Financial Summary',
      `${monthYear} • Comprehensive Report`,
      logoBase64
    );

    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, yPosition);
    yPosition += 10;

    const summaryData = [
      ['Projected Revenue', formatCurrency(stats.projectedRevenue)],
      ['Real Revenue', formatCurrency(stats.realRevenue)],
      ['Profitability', `${stats.profitability.toFixed(2)}%`],
      ['Active Applications', stats.activeApplications.toString()],
      ['Monthly Payable', formatCurrency(stats.monthlyPayable)],
      ['Monthly Receivable', formatCurrency(stats.monthlyReceivable)],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 207, 162],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [17, 24, 39],
      },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Revenue Analysis
    if (revenueForecast && revenueForecast.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Forecast Analysis', margin, yPosition);
      yPosition += 10;

      const revenueData = revenueForecast.slice(0, 6).map((item) => [
        item.period,
        formatCurrency(item.projectedRevenue),
        formatCurrency(item.actualRevenue),
        formatCurrency(item.forecastedRevenue),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Period', 'Projected', 'Actual', 'Forecasted']],
        body: revenueData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 207, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [17, 24, 39],
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Payment Collection Analysis
    if (paymentCollectionRates && paymentCollectionRates.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Collection Analysis', margin, yPosition);
      yPosition += 10;

      const collectionData = paymentCollectionRates.map((item) => [
        item.period,
        formatCurrency(item.totalDue),
        formatCurrency(item.totalCollected),
        `${item.collectionRate.toFixed(2)}%`,
        formatCurrency(item.overdueAmount),
        `${item.overdueRate.toFixed(2)}%`,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Period', 'Total Due', 'Collected', 'Rate', 'Overdue', 'Overdue Rate']],
        body: collectionData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 207, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [17, 24, 39],
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Conversion Funnel
    if (conversionFunnel && conversionFunnel.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Application Conversion Funnel', margin, yPosition);
      yPosition += 10;

      const funnelData = conversionFunnel.map((stage) => [
        stage.stage,
        stage.count.toString(),
        `${stage.percentage.toFixed(2)}%`,
        stage.dropOffRate ? `${stage.dropOffRate.toFixed(2)}%` : 'N/A',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Stage', 'Count', 'Percentage', 'Drop-off Rate']],
        body: funnelData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 207, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [17, 24, 39],
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Top Customers
    if (topCustomers && topCustomers.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(secondaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Customers by Lifetime Value', margin, yPosition);
      yPosition += 10;

      const customerData = topCustomers.slice(0, 10).map((customer) => [
        customer.customerName,
        formatCurrency(customer.totalRevenue),
        formatCurrency(customer.clv),
        customer.totalApplications.toString(),
        formatCurrency(customer.averagePaymentAmount),
        customer.totalPayments.toString(),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Customer', 'Revenue', 'CLV', 'Apps', 'Avg Payment', 'Payments']],
        body: customerData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 207, 162],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: [17, 24, 39],
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
      });
    }

    // Add footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.addPDFFooter(doc, i, totalPages);
    }

    // Save PDF
    const filename = `Monthly_Financial_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }
}

export const reportExportService = new ReportExportService();

