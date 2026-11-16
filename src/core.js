/* Ring-108 / Base-27 core — MIT, 2026 Long Ngo. Algebraic model, not a Vietnamese syllable codec. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const N = 108;
  const ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const mod = (a, n) => ((a % n) + n) % n;
  function assertState(n) {
    if (!Number.isInteger(n) || n < 0 || n >= N) throw new RangeError('Trạng thái phải là số nguyên [0,107].');
  }
  function crt(n) {
    assertState(n);
    return { mod4: n % 4, mod27: n % 27 };
  }
  function uncrt(q, r) {
    if (!Number.isInteger(q) || q < 0 || q >= 4 || !Number.isInteger(r) || r < 0 || r >= 27)
      throw new RangeError('CRT expects 0<=q<4, 0<=r<27.');
    const t = mod(3 * (q - r), 4); // 27 ≡ 3 (mod 4), 3^{-1} ≡ 3 (mod 4)
    return r + 27 * t;
  }
  function digits(n) {
    const { mod4, mod27 } = crt(n);
    return {
      bits: [mod4 % 2, Math.floor(mod4 / 2)],
      trits: [mod27 % 3 - 1, Math.floor(mod27 / 3) % 3 - 1, Math.floor(mod27 / 9) - 1],
      mod4, mod27
    };
  }
  function fromDigits(bits, trits) {
    if (!Array.isArray(bits) || bits.length !== 2 || bits.some(v => v !== 0 && v !== 1) ||
        !Array.isArray(trits) || trits.length !== 3 || trits.some(v => ![-1,0,1].includes(v)))
      throw new RangeError('Expected two bits in {0,1} and three balanced trits in {-1,0,1}.');
    const q = bits[0] + 2 * bits[1];
    const r = (trits[0] + 1) + 3 * (trits[1] + 1) + 9 * (trits[2] + 1);
    return uncrt(q, r);
  }
  function position(n, p = 0, k = 0) {
    assertState(n);
    if (!Number.isInteger(p) || !Number.isInteger(k)) throw new TypeError('Offsets must be integers.');
    const state = mod(n + p + k, N);
    const theta = 2 * Math.PI * state / N;
    return { state, angleDeg: 360 * state / N, x: Math.cos(theta), y: Math.sin(theta) };
  }
  function validVowelSlot(n) {
    assertState(n);
    const vowel = Math.floor(n / 18); // a e i o u y
    const family = Math.floor((n % 18) / 6); // 0 plain, 1 circumflex, 2 hook/breve
    return vowel === 0 || vowel === 3 || (vowel === 1 && family < 2) ||
      (vowel === 4 && family !== 1) || ((vowel === 2 || vowel === 5) && family === 0);
  }
  function charToValue(ch) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0 || ch.length !== 1) throw new RangeError('Ký tự không thuộc bảng Base27: ' + ch);
    return i;
  }
  function normalizeSymbols(text) {
    const normalized = String(text).normalize('NFC').toUpperCase();
    for (const ch of normalized) charToValue(ch);
    return normalized;
  }
  function symbolsToTrits(text) {
    return [...normalizeSymbols(text)].map(c => {
      const v = charToValue(c);
      return [v % 3 - 1, Math.floor(v / 3) % 3 - 1, Math.floor(v / 9) - 1];
    });
  }
  function tritsToSymbols(items) {
    return items.map(t => {
      if (!Array.isArray(t) || t.length !== 3 || t.some(v=>![-1,0,1].includes(v))) throw new RangeError('Invalid trit');
      return ALPHABET[(t[0]+1) + 3*(t[1]+1) + 9*(t[2]+1)];
    }).join('');
  }
  return Object.freeze({ N, ALPHABET, mod, crt, uncrt, digits, fromDigits, position, validVowelSlot, charToValue, normalizeSymbols, symbolsToTrits, tritsToSymbols });
});
