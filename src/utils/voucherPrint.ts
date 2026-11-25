import { getBrandConfig } from './brand';

export type VoucherPrintSize = 'A4' | 'A5' | '80mm';

const VOUCHER_PRINT_SIZE_KEY = 'ujc_voucher_print_size';
export const VOUCHER_PRINT_SIZE_EVENT = 'ujc_voucher_print_size_changed';

export function getVoucherPrintSize(): VoucherPrintSize {
  try {
    const saved = localStorage.getItem(VOUCHER_PRINT_SIZE_KEY);
    if (saved === 'A4' || saved === 'A5' || saved === '80mm') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'A4';
}

export function setVoucherPrintSize(size: VoucherPrintSize): void {
  try {
    localStorage.setItem(VOUCHER_PRINT_SIZE_KEY, size);
    window.dispatchEvent(new CustomEvent(VOUCHER_PRINT_SIZE_EVENT, { detail: size }));
  } catch {
    // ignore storage errors
  }
}

function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(val: unknown): string {
  const num = Number(val || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dStr: unknown): string {
  const raw = String(dStr || '').split('T')[0];
  if (!raw) return new Date().toLocaleDateString('en-GB');
  const parts = raw.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return raw;
}

export interface PrintableVoucherInput {
  id?: number | string;
  voucher_no?: string;
  voucherNo?: string;
  voucher_type?: string;
  entryType?: string;
  voucher_date?: string;
  date?: string;
  created_at?: string;
  account_title?: string;
  accountTitle?: string;
  account_code?: string;
  accountCode?: string;
  paymentMode?: string;
  total_amount?: number;
  voucherAmount?: number;
  debit?: number;
  credit?: number;
  notes?: string;
  narration?: string;
  items?: Array<{
    accountCode?: string;
    account_code?: string;
    accountTitle?: string;
    account_title?: string;
    description?: string;
    narration?: string;
    debit?: number;
    credit?: number;
  }>;
  metadata?: Record<string, any>;
}

export function printSingleVoucher(
  voucher: PrintableVoucherInput,
  options?: { businessName?: string | null; size?: VoucherPrintSize }
): void {
  const size = options?.size || getVoucherPrintSize();
  const brand = getBrandConfig();
  const companyName = options?.businessName || brand.fullName;

  const voucherNo = voucher.voucher_no || voucher.voucherNo || `VCH-${voucher.id ?? ''}`;
  const voucherType = voucher.voucher_type || voucher.entryType || 'Accounting Voucher';
  const voucherDate = formatDateDisplay(voucher.voucher_date || voucher.date || voucher.created_at);
  const accountTitle = voucher.account_title || voucher.accountTitle || 'General Account';
  const accountCode = voucher.account_code || voucher.accountCode || '';
  const paymentMode = voucher.paymentMode || '';
  const totalAmount = Number(
    voucher.total_amount ?? voucher.voucherAmount ?? voucher.debit ?? voucher.credit ?? 0
  );
  const notes = voucher.notes || voucher.narration || '';

  const rawItems = Array.isArray(voucher.items) ? voucher.items : [];
  const rowsHtml =
    rawItems.length > 0
      ? rawItems
          .map((it, idx) => {
            const code = it.accountCode || it.account_code || '';
            const title = it.accountTitle || it.account_title || it.description || 'Account Entry';
            const desc = it.narration || it.description || '';
            const dr = Number(it.debit || 0);
            const cr = Number(it.credit || 0);
            return `
              <tr>
                <td class="center">${idx + 1}</td>
                <td>
                  <div class="bold">${escapeHtml(title)}${code ? ` <span class="muted">(${escapeHtml(code)})</span>` : ''}</div>
                  ${desc && desc !== title ? `<div class="sub">${escapeHtml(desc)}</div>` : ''}
                </td>
                <td class="right mono">${dr > 0 ? `Rs. ${formatAmount(dr)}` : '-'}</td>
                <td class="right mono">${cr > 0 ? `Rs. ${formatAmount(cr)}` : '-'}</td>
              </tr>
            `;
          })
          .join('')
      : `
        <tr>
          <td class="center">1</td>
          <td>
            <div class="bold">${escapeHtml(accountTitle)}${accountCode ? ` <span class="muted">(${escapeHtml(accountCode)})</span>` : ''}</div>
            ${notes ? `<div class="sub">${escapeHtml(notes)}</div>` : ''}
          </td>
          <td class="right mono">${Number(voucher.debit || 0) > 0 ? `Rs. ${formatAmount(voucher.debit)}` : `Rs. ${formatAmount(totalAmount)}`}</td>
          <td class="right mono">${Number(voucher.credit || 0) > 0 ? `Rs. ${formatAmount(voucher.credit)}` : '-'}</td>
        </tr>
      `;

  const pageCss =
    size === '80mm'
      ? `@page { size: 80mm auto; margin: 3mm; }
         body { width: 74mm; font-size: 10px; }`
      : size === 'A5'
      ? `@page { size: A5 portrait; margin: 8mm 10mm; }
         body { font-size: 11px; }`
      : `@page { size: A4 portrait; margin: 12mm 14mm; }
         body { font-size: 12px; }`;

  const isThermal = size === '80mm';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(voucherNo)} - ${escapeHtml(companyName)}</title>
  <style>
    ${pageCss}
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0 auto;
      padding: ${isThermal ? '4px' : '8px'};
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .voucher-box {
      border: ${isThermal ? '1px dashed #334155' : '1.5px solid #1e293b'};
      border-radius: ${isThermal ? '4px' : '8px'};
      padding: ${isThermal ? '8px' : size === 'A5' ? '14px' : '20px'};
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: ${isThermal ? '6px' : '10px'};
      margin-bottom: ${isThermal ? '8px' : '14px'};
    }
    .company {
      font-size: ${isThermal ? '13px' : size === 'A5' ? '16px' : '20px'};
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .tagline {
      font-size: ${isThermal ? '8px' : '10px'};
      color: #475569;
      margin-top: 2px;
    }
    .v-title {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 10px;
      background: #0f172a;
      color: #fff;
      font-weight: 800;
      font-size: ${isThermal ? '9px' : '11px'};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-radius: 4px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr' : '1fr 1fr'};
      gap: ${isThermal ? '4px' : '8px 16px'};
      margin-bottom: ${isThermal ? '8px' : '14px'};
      padding: ${isThermal ? '6px' : '10px 12px'};
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: ${isThermal ? '9.5px' : '11px'};
    }
    .meta-label { color: #64748b; font-weight: 700; text-transform: uppercase; }
    .meta-val { font-weight: 800; color: #0f172a; text-align: right; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: ${isThermal ? '8px' : '14px'};
    }
    th {
      background: #f1f5f9;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding: ${isThermal ? '4px 3px' : '7px 8px'};
      text-align: left;
      font-size: ${isThermal ? '9px' : '10.5px'};
      font-weight: 800;
      text-transform: uppercase;
    }
    td {
      border-bottom: 1px solid #e2e8f0;
      padding: ${isThermal ? '5px 3px' : '8px'};
      vertical-align: top;
      font-size: ${isThermal ? '9.5px' : '11.5px'};
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; }
    .bold { font-weight: 700; }
    .muted { color: #64748b; font-weight: 500; font-size: 0.9em; }
    .sub { color: #475569; font-size: 0.88em; margin-top: 2px; }
    .total-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${isThermal ? '6px 8px' : '10px 14px'};
      background: #f1f5f9;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      font-weight: 900;
      font-size: ${isThermal ? '11px' : size === 'A5' ? '13px' : '14px'};
    }
    .notes {
      margin-top: 10px;
      padding: 8px 10px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      font-size: ${isThermal ? '9px' : '11px'};
      color: #334155;
    }
    .sigs {
      display: grid;
      grid-template-columns: ${isThermal ? '1fr 1fr' : '1fr 1fr 1fr'};
      gap: ${isThermal ? '16px' : '24px'};
      margin-top: ${isThermal ? '22px' : size === 'A5' ? '34px' : '48px'};
      padding-top: 6px;
    }
    .sig-line {
      border-top: 1px solid #334155;
      text-align: center;
      padding-top: 4px;
      font-size: ${isThermal ? '8.5px' : '10px'};
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .foot {
      margin-top: 12px;
      text-align: center;
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="voucher-box">
    <div class="header">
      <div class="company">${escapeHtml(companyName)}</div>
      <div class="tagline">${escapeHtml(brand.address)} &bull; ${escapeHtml(brand.supportPhone)}</div>
      <div class="v-title">${escapeHtml(voucherType)}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-row">
        <span class="meta-label">Voucher #</span>
        <span class="meta-val mono">${escapeHtml(voucherNo)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date</span>
        <span class="meta-val mono">${escapeHtml(voucherDate)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Account / Party</span>
        <span class="meta-val">${escapeHtml(accountTitle)}${accountCode ? ` (${escapeHtml(accountCode)})` : ''}</span>
      </div>
      ${
        paymentMode
          ? `<div class="meta-row">
               <span class="meta-label">Mode</span>
               <span class="meta-val">${escapeHtml(paymentMode)}</span>
             </div>`
          : `<div class="meta-row">
               <span class="meta-label">Paper Size</span>
               <span class="meta-val">${escapeHtml(size)}</span>
             </div>`
      }
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width:28px">#</th>
          <th>Account &amp; Particulars</th>
          <th class="right">Debit</th>
          <th class="right">Credit</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="total-bar">
      <span>TOTAL VOUCHER AMOUNT</span>
      <span class="mono">Rs. ${formatAmount(totalAmount)}</span>
    </div>

    ${notes ? `<div class="notes"><strong>Narration / Notes:</strong> ${escapeHtml(notes)}</div>` : ''}

    <div class="sigs">
      <div class="sig-line">Prepared By</div>
      ${isThermal ? '' : '<div class="sig-line">Approved By</div>'}
      <div class="sig-line">Receiver Signature</div>
    </div>

    <div class="foot">Printed on ${new Date().toLocaleString('en-GB')}</div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 150);
}
