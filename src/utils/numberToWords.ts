/**
 * Converts a numerical Indian currency amount into words.
 * Standard Indian numbering system (Crore, Lakh, Thousand, Hundred)
 * e.g. 15420.50 -> "Rupees Fifteen Thousand Four Hundred and Twenty and Fifty Paise Only"
 */
export const numberToWords = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  if (isNaN(num) || num < 0) return '';
  if (num === 0) return 'Rupees Zero Only';

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return units[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? ' ' + units[unit] : ''}`;
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${units[hundred]} Hundred`;
    }
    if (rest > 0) {
      res += `${res ? ' and ' : ''}${convertTwoDigits(rest)}`;
    }
    return res;
  };

  const intPart = Math.floor(num);
  const paisePart = Math.round((num - intPart) * 100);

  let remaining = intPart;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundreds = remaining;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundreds > 0) {
    words += `${convertThreeDigits(hundreds)} `;
  }

  words = words.trim();
  if (!words) {
    words = 'Zero';
  }

  let result = `Rupees ${words}`;
  if (paisePart > 0) {
    result += ` and ${convertTwoDigits(paisePart)} Paise`;
  }
  result += ' Only';

  return result;
};
