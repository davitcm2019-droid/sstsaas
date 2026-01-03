const stripNonDigits = (value = '') => String(value).replace(/\D/g, '');

const sanitizeCnpj = (value = '') => stripNonDigits(value);

const calculateCheckDigit = (digits, weights) => {
  const sum = digits.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const isValidCnpj = (value = '') => {
  const digits = sanitizeCnpj(value);
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const base12 = digits.slice(0, 12);
  const digit1 = calculateCheckDigit(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const base13 = `${base12}${digit1}`;
  const digit2 = calculateCheckDigit(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits === `${base12}${digit1}${digit2}`;
};

module.exports = {
  sanitizeCnpj,
  isValidCnpj
};

