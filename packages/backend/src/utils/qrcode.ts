import QRCode from 'qrcode';

export interface QRCodeData {
  type: 'unit' | 'booking';
  id: string;
  accessCode?: string;
  expiresAt?: string;
}

// Generate QR code as data URL (base64)
export async function generateQRCodeDataURL(
  data: QRCodeData
): Promise<string> {
  const payload = JSON.stringify(data);

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

// Generate QR code as buffer
export async function generateQRCodeBuffer(
  data: QRCodeData
): Promise<Buffer> {
  const payload = JSON.stringify(data);

  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 300,
    margin: 2,
  });
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(
  data: QRCodeData
): Promise<string> {
  const payload = JSON.stringify(data);

  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
  });
}

// Generate a unique QR code identifier for a storage unit
export function generateUnitQRCode(
  unitId: string,
  locationId: string
): string {
  const timestamp = Date.now().toString(36);
  return `UNIT:${locationId.slice(0, 8)}:${unitId.slice(0, 8)}:${timestamp}`;
}

// Parse QR code data
export function parseQRCode(qrString: string): QRCodeData | null {
  try {
    return JSON.parse(qrString) as QRCodeData;
  } catch {
    return null;
  }
}

// Validate booking QR code
export function validateBookingQRCode(
  data: QRCodeData,
  expectedBookingId: string,
  expectedAccessCode: string
): boolean {
  if (data.type !== 'booking') {
    return false;
  }

  if (data.id !== expectedBookingId) {
    return false;
  }

  if (data.accessCode !== expectedAccessCode) {
    return false;
  }

  if (data.expiresAt) {
    const expiresAt = new Date(data.expiresAt);
    if (expiresAt < new Date()) {
      return false;
    }
  }

  return true;
}
