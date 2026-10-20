export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

// Simple custom ASCII-safe encoder that normalizes accents to avoid weird characters
const encodeText = (text: string): Uint8Array => {
  if (!text) return new Uint8Array();
  
  // Map common Moroccan/Arabic characters or other special symbols if needed, otherwise normalize French accents
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics/accents (é -> e, à -> a)
    .replace(/[^\x00-\x7F]/g, "?");  // replace any non-ASCII characters with ?
  
  const encoder = new TextEncoder();
  return encoder.encode(normalized);
};

// Robust chunking write helper for BLE printers to avoid RX buffer overflows
const writeDataInChunks = async (characteristic: any, data: Uint8Array): Promise<void> => {
  const chunkSize = 20; // 20 bytes is universally safe for all BLE Bluetooth thermal printers
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.writeValueWithResponse) {
      await characteristic.writeValueWithResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    // Tiny delay to ensure cheap printer buffers do not overflow
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
};

const formatReceiptText = (
  doc: any,
  settings: any,
  recipient: any,
  widthMm: number
): Uint8Array => {
  const cols = widthMm === 58 ? 32 : 48;
  const lineChar = '-';
  const divider = lineChar.repeat(cols) + '\n';
  
  const bytesList: number[] = [];
  
  const addText = (text: string) => {
    const encoded = encodeText(text);
    bytesList.push(...Array.from(encoded));
  };
  
  const addCmd = (cmd: number[]) => {
    bytesList.push(...cmd);
  };
  
  // ESC/POS Commands
  const ESC = 0x1B;
  const GS = 0x1D;
  const INIT = [ESC, 0x40];
  const ALIGN_LEFT = [ESC, 0x61, 0];
  const ALIGN_CENTER = [ESC, 0x61, 1];
  const ALIGN_RIGHT = [ESC, 0x61, 2];
  const BOLD_ON = [ESC, 0x45, 1];
  const BOLD_OFF = [ESC, 0x45, 0];
  const DOUBLE_SIZE = [GS, 0x21, 0x11];
  const NORMAL_SIZE = [GS, 0x21, 0x00];
  
  // 1. Initialize
  addCmd(INIT);
  addCmd(ALIGN_CENTER);
  
  // 2. Company Header
  const companyName = settings?.companyName || 'FACTURAGO';
  addCmd(DOUBLE_SIZE);
  addCmd(BOLD_ON);
  addText(companyName + '\n');
  addCmd(NORMAL_SIZE);
  addCmd(BOLD_OFF);
  
  if (settings?.address) {
    addText(settings.address + '\n');
  }
  if (settings?.phone) {
    addText(`Tel: ${settings.phone}\n`);
  }
  if (settings?.email) {
    addText(`Email: ${settings.email}\n`);
  }
  
  const companyIdentifiers: string[] = [];
  if (settings?.ice) companyIdentifiers.push(`ICE: ${settings.ice}`);
  if (settings?.rc) companyIdentifiers.push(`RC: ${settings.rc}`);
  if (settings?.fiscalId) companyIdentifiers.push(`IF: ${settings.fiscalId}`);
  if (companyIdentifiers.length > 0) {
    addText(companyIdentifiers.join(' | ') + '\n');
  }
  
  addCmd(ALIGN_LEFT);
  addText(divider);
  
  // 3. Document info
  let docType = 'DOCUMENT';
  const docId = doc.documentId || doc.id || '';
  if (docId) {
    if (docId.startsWith('FA')) docType = 'FACTURE';
    else if (docId.startsWith('BL')) docType = 'BON DE LIVRAISON';
    else if (docId.startsWith('DV')) docType = 'DEVIS';
    else if (docId.startsWith('BC')) docType = 'BON DE COMMANDE';
    else if (docId.startsWith('AV')) docType = 'AVOIR';
  }
  
  addCmd(BOLD_ON);
  addText(`${docType}: ${docId}\n`);
  addCmd(BOLD_OFF);
  
  addText(`Date: ${doc.date || ''}\n`);
  
  const clientName = recipient?.name || doc.clientName || doc.supplierName || '';
  if (clientName) {
    addText(`Client: ${clientName}\n`);
    if (recipient?.ice) {
      addText(`ICE: ${recipient.ice}\n`);
    }
  }
  
  addText(divider);
  
  // 4. Line Items Table Header
  let header = '';
  if (cols === 32) {
    header = 'Designation   Qt x P.U   Total';
  } else {
    header = 'Designation             Qt    P.U      Total';
  }
  addCmd(BOLD_ON);
  addText(header + '\n');
  addCmd(BOLD_OFF);
  addText(divider);
  
  // 5. Line Items List
  const items = doc.lineItems || [];
  items.forEach((item: any) => {
    const name = item.name || '';
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const total = qty * price;
    
    // Line 1: Item Name
    addCmd(BOLD_ON);
    addText(name + '\n');
    addCmd(BOLD_OFF);
    
    // Line 2: Qty x PU and Total
    const leftText = `  ${qty} x ${price.toFixed(2)}`;
    const rightText = total.toFixed(2);
    const spacesCount = cols - leftText.length - rightText.length;
    const rowText = leftText + ' '.repeat(Math.max(1, spacesCount)) + rightText;
    addText(rowText + '\n');
  });
  
  addText(divider);
  
  // 6. Financial Summary
  const subTotal = doc.subTotal ?? doc.amount ?? 0;
  const vatAmount = doc.vatAmount ?? 0;
  const totalAmount = doc.totalAmount ?? doc.amount ?? 0;
  
  const padLine = (label: string, value: string): string => {
    const spaces = cols - label.length - value.length;
    return label + ' '.repeat(Math.max(1, spaces)) + value;
  };
  
  addText(padLine('Sous-Total HT:', subTotal.toFixed(2)) + '\n');
  if (vatAmount > 0) {
    addText(padLine('TVA:', vatAmount.toFixed(2)) + '\n');
  }
  
  addCmd(BOLD_ON);
  addText(padLine('TOTAL NET:', totalAmount.toFixed(2)) + '\n');
  addCmd(BOLD_OFF);
  
  addText(divider);
  
  // 7. Footer
  addCmd(ALIGN_CENTER);
  if (doc.notes) {
    addText(`Note: ${doc.notes}\n\n`);
  }
  
  const footerNote = settings?.footerNotes || 'Merci pour votre visite !';
  addText(footerNote + '\n\n');
  addText('A bientot !\n');
  
  // 8. Feed paper & cut
  addText('\n\n\n\n');
  addCmd([GS, 0x56, 0x41, 0x03]); // Paper Cut command
  
  return new Uint8Array(bytesList);
};

export const printViaWebBluetooth = async (
  doc: any,
  settings: any,
  recipient: any,
  widthMm: number
): Promise<{ success: boolean; deviceName?: string; error?: string }> => {
  if (!isWebBluetoothSupported()) {
    return { success: false, error: 'Web Bluetooth is not supported on this browser/platform' };
  }
  
  try {
    // Request bluetooth device. We accept any device with optional service UUIDs corresponding to standard and common custom printer characteristics
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Printer Service
        '0000e7e1-0000-1000-8000-00805f9b34fb', // Custom Bluetooth Printer
        '0000ff00-0000-1000-8000-00805f9b34fb', // Custom/Chinese Bluetooth Printer
        '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat/Other Printer
        '0000180a-0000-1000-8000-00805f9b34fb', // Device Info Service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // IS_SC
        '00001101-0000-1000-8000-00805f9b34fb'  // Classic SPP Profile
      ]
    });
    
    if (!device) {
      return { success: false, error: 'No device selected' };
    }
    
    const deviceName = device.name || 'Imprimante Bluetooth';
    
    // Connect to the GATT Server
    const server = await device.gatt.connect();
    
    // Get primary services
    const services = await server.getPrimaryServices();
    if (services.length === 0) {
      throw new Error('No GATT services found on the selected device.');
    }
    
    // Find a service that has characteristics we can write to
    let writeChar: any = null;
    let foundService: any = null;
    
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        const candidate = characteristics.find((c: any) => 
          c.properties.write || c.properties.writeWithoutResponse
        );
        if (candidate) {
          writeChar = candidate;
          foundService = service;
          break;
        }
      } catch (err) {
        console.warn('Could not read characteristics from service', service.uuid, err);
      }
    }
    
    if (!writeChar) {
      throw new Error('No writeable characteristic found on any of the services.');
    }
    
    // Format receipt binary payload
    const receiptData = formatReceiptText(doc, settings, recipient, widthMm);
    
    // Write data in chunked packets
    await writeDataInChunks(writeChar, receiptData);
    
    // Graceful disconnect
    setTimeout(() => {
      try {
        device.gatt.disconnect();
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }, 1500);
    
    return { success: true, deviceName };
  } catch (error: any) {
    console.error('Bluetooth printing error:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to connect or print via Bluetooth' 
    };
  }
};
