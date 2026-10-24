import React from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Download } from 'lucide-react';
import './generateInvoice.css';

const POSITIONS = {
  invoice: {
    number: { x: 77, y: 266.5},
    date: { x: 90, y: 280 }
  },
  customer: {
    name: { x: 54, y: 350 },
    addressStart: { x: 54, y: 368 },
    addressLineSpacing: 15
  },
  subject: { x: 105, y: 453.5 },
  table: {
    startY: 498,
    rowSpacing: 15,
    columns: {
      serial: { x: 58 },
      item: { x: 90 },
      qty: { xFromRight: 245 },
      price: { xFromRight: 180 },
      total: { xFromRight: 112 }
    }
  },
  totals: {
    amount: {
      x: 481.5,
      y: 587
    },
    amountInWords: {
      xFromRight: 39,
      y: 607
    }
  },
  notes: {
    x: 54,
    y: 638,
    maxWidth: 300,
    lineSpacing: 12 
  }
};

const numberToWords = (number) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertLessThanThousand = (num) => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    }
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertLessThanThousand(num % 100) : '');
  };

  if (number === 0) return 'Zero';

  const inr = Math.floor(number);
  const words = [];

  if (inr >= 100000) {
    words.push(convertLessThanThousand(Math.floor(inr / 100000)) + ' Lakh');
    number = inr % 100000;
  }

  if (inr >= 1000) {
    if (words.length > 0) words.push(' ');
    words.push(convertLessThanThousand(Math.floor(number / 1000)) + ' Thousand');
    number = inr % 1000;
  }

  if (number > 0) {
    if (words.length > 0) words.push(' ');
    words.push(convertLessThanThousand(number));
  }

  return words.join('');
};

// Helper function to wrap text
const wrapText = (text, font, fontSize, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const width = font.widthOfTextAtSize(`${currentLine} ${words[i]}`, fontSize);
    if (width < maxWidth) {
      currentLine += ` ${words[i]}`;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
};

const GenerateInvoiceButton = ({ invoiceData, exposeRef }) => {
  const generatePDF = async () => {
    try {
      console.log('Generate PDF function triggered', invoiceData);

      // Select template based on currency
      const templatePath = invoiceData.currency === 'INR'
        ? '/assets/emaarInvoiceINR.pdf'
        : '/assets/emaarInvoiceAED.pdf';

      const templateResponse = await fetch(templatePath);
      if (!templateResponse.ok) throw new Error(`Failed to load the ${invoiceData.currency} PDF template`);
      const templateBytes = await templateResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(templateBytes);

      pdfDoc.registerFontkit(fontkit);

      const fontResponse = await fetch('/assets/fonts/RobotoMono-Regular.ttf');
      if (!fontResponse.ok) throw new Error('Failed to load Roboto font');
      const fontBytes = await fontResponse.arrayBuffer();
      const robotoFont = await pdfDoc.embedFont(fontBytes);

      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();

      // Calculate x-positions that depend on page width
      POSITIONS.table.columns.qty.x = width - POSITIONS.table.columns.qty.xFromRight;
      POSITIONS.table.columns.price.x = width - POSITIONS.table.columns.price.xFromRight;
      POSITIONS.table.columns.total.x = width - POSITIONS.table.columns.total.xFromRight;

      const textOptions = {
        font: robotoFont,
        size: 10,
        color: rgb(0, 0, 0),
      };

      // Add Invoice Details
      page.drawText(invoiceData.invoiceNumber || 'N/A', {
        x: POSITIONS.invoice.number.x,
        y: height - POSITIONS.invoice.number.y,
        ...textOptions,
      });

      page.drawText(
        new Date(invoiceData.date).toLocaleDateString() || 'Date',
        {
          x: POSITIONS.invoice.date.x,
          y: height - POSITIONS.invoice.date.y,
          ...textOptions,
        }
      );

      page.drawText(invoiceData.subject || 'N/A', {
        x: POSITIONS.subject.x,
        y: height - POSITIONS.subject.y,
        ...textOptions,
      });

      page.drawText(invoiceData.customerName || 'Client', {
        x: POSITIONS.customer.name.x,
        y: height - POSITIONS.customer.name.y,
        ...textOptions,
      });

      // Add customer address
      if (invoiceData.address) {
        const addressLines = invoiceData.address.split('\n');
        let addressY = POSITIONS.customer.addressStart.y;
        addressLines.forEach((line) => {
          page.drawText(line.trim(), {
            x: POSITIONS.customer.addressStart.x,
            y: height - addressY,
            ...textOptions,
            size: 10,
          });
          addressY += POSITIONS.customer.addressLineSpacing;
        });
      }

      // Items Table
      let currentY = POSITIONS.table.startY;
      invoiceData.items.forEach((item, index) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const itemTotal = (quantity * price).toFixed(2);

        // Add serial number
        page.drawText(`${index + 1}`, {
          x: POSITIONS.table.columns.serial.x,
          y: height - currentY,
          ...textOptions,
          size: 9,
        });

        page.drawText(item.description || 'Item', {
          x: POSITIONS.table.columns.item.x,
          y: height - currentY,
          ...textOptions,
          size: 9,
        });

        page.drawText(quantity.toString(), {
          x: POSITIONS.table.columns.qty.x,
          y: height - currentY,
          ...textOptions,
          size: 9,
        });

        page.drawText(`${price.toFixed(2)}`, {
          x: POSITIONS.table.columns.price.x,
          y: height - currentY,
          ...textOptions,
          size: 9,
        });

        page.drawText(`${itemTotal}`, {
          x: POSITIONS.table.columns.total.x,
          y: height - currentY,
          ...textOptions,
          size: 9,
        });

        currentY += POSITIONS.table.rowSpacing;
      });

      // Calculate total amount
      const totalAmount = invoiceData.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
        0
      );

      // Draw total amount using fixed positions
      page.drawText(`${totalAmount.toFixed(2)}`, {
        x: POSITIONS.totals.amount.x,
        y: height - POSITIONS.totals.amount.y,
        ...textOptions,
        size: 11,
      });

      const currencyPrefix = invoiceData.currency === 'INR' ? 'Rs.' : 'AED';
      const amountInWords = numberToWords(Math.floor(totalAmount));
      const amountInWordsText = `${currencyPrefix} ${amountInWords} only`;

      const textWidth = robotoFont.widthOfTextAtSize(amountInWordsText, textOptions.size);
      const amountInWordsX = width - POSITIONS.totals.amountInWords.xFromRight - textWidth;

      page.drawText(amountInWordsText, {
        x: amountInWordsX,
        y: height - POSITIONS.totals.amountInWords.y,
        ...textOptions,
        size: 9,
      });

      // Add notes with text wrapping
      if (invoiceData.notes) {
        const notesLines = wrapText(
          invoiceData.notes,
          robotoFont,
          9, // smaller font size for notes
          POSITIONS.notes.maxWidth
        );

        let notesY = POSITIONS.notes.y;
        notesLines.forEach((line) => {
          page.drawText(line, {
            x: POSITIONS.notes.x,
            y: height - notesY,
            ...textOptions,
            size: 9,
          });
          notesY += POSITIONS.notes.lineSpacing;
        });
      }

      // Save and download the PDF with currency in filename
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceData.invoiceNumber}-${invoiceData.currency}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message}`);
    }
  };

  // Expose the generatePDF function so Navbar can call it directly
  if (exposeRef) exposeRef(generatePDF);

  return (
    <button type="button" onClick={generatePDF} className="generate-invoice-btn">
      <Download size={16} />
      <span>Generate Invoice</span>
    </button>
  );
};

export default GenerateInvoiceButton;