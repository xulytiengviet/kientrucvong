/* VCR-Voice: Unicode <-> CVNSS4.0 <-> Base27 data transport.
 * This is NOT ASR, TTS, a speech codec, or a voiceprint extractor. MIT.
 */
(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const C = node ? require("./core.js") : root.RingCore;
  const V = node ? require("../vendor/cvnss4_0_converter.v5.js") : root.CVNSSConverter;
  const api = factory(C, V);
  if (node) module.exports = api;
  else root.VoiceBridge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C, V) {
  "use strict";
  const PREFIX = "VR";
  const MAX_BYTES = 896; // VR (2) + length (4) + 2 symbols/byte <= RingAudio.MAX_LEN=1800
  function lengthDigits(n) {
    const out = [];
    for (let i=0; i<4; i++) { out.push(C.ALPHABET[n % 27]); n = Math.floor(n/27); }
    if (n) throw new RangeError("Vượt kích thước envelope.");
    return out.join("");
  }
  function readLength(s) {
    let n=0, place=1;
    for (const ch of s) { n += C.charToValue(ch)*place; place *= 27; }
    return n;
  }
  function packCvss(cvss) {
    const bytes = new TextEncoder().encode(String(cvss).normalize("NFC"));
    if (bytes.length > MAX_BYTES) throw new RangeError("CVNSS quá dài để gửi trong một khung 27-FSK ("+MAX_BYTES+" UTF-8 bytes).");
    let symbols=PREFIX+lengthDigits(bytes.length);
    for (const byte of bytes) symbols += C.ALPHABET[byte % 27]+C.ALPHABET[Math.floor(byte / 27)];
    return symbols;
  }
  function unpackCvss(symbols) {
    const s=C.normalizeSymbols(symbols);
    if (!s.startsWith(PREFIX) || s.length < 6) throw new Error("Sai mã phiên bản VR.");
    const n=readLength(s.slice(2,6));
    if (n > MAX_BYTES || s.length !== 6 + n*2) throw new Error("Sai độ dài envelope VR.");
    const bytes=new Uint8Array(n);
    for (let i=0; i<n; i++) {
      const byte=C.charToValue(s[6+2*i])+27*C.charToValue(s[7+2*i]);
      if (byte>255) throw new Error("Cặp mã Base27 không phải byte.");
      bytes[i]=byte;
    }
    return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }
  function ambiguity(cvss) {
    const words=String(cvss).match(/[\p{L}]+/gu) || [];
    return words.map(word=>V.inspectWord(word,"cvss")).filter(info=>info.ambiguous)
      .map(info=>({code:info.input,selected:info.selected,candidates:info.candidates}));
  }
  function fromVoiceTranscript(unicode) {
    if (typeof unicode !== "string" || unicode.length > 4000) throw new RangeError("Bản phiên âm phải là chuỗi <= 4000 ký tự.");
    const normalized=unicode.normalize("NFC");
    const cvss=V.fromCqn(normalized).cvss;
    const symbols=packCvss(cvss);
    return Object.freeze({
      unicode:normalized, cvss, symbols,
      trits:C.symbolsToTrits(symbols),
      ambiguous:ambiguity(cvss),
      canonicalUnicode:V.fromCvss(cvss).cqn
    });
  }
  function fromSymbols(symbols) {
    const cvss=unpackCvss(symbols);
    return Object.freeze({
      cvss, unicode:V.fromCvss(cvss).cqn, ambiguous:ambiguity(cvss),
      symbols:C.normalizeSymbols(symbols)
    });
  }
  function fromCvss(cvss) {
    const s=String(cvss).normalize("NFC");
    const symbols=packCvss(s);
    return Object.freeze({
      cvss:s, unicode:V.fromCvss(s).cqn, symbols,
      trits:C.symbolsToTrits(symbols), ambiguous:ambiguity(s)
    });
  }
  return Object.freeze({ PREFIX,MAX_BYTES,packCvss,unpackCvss,fromVoiceTranscript,fromSymbols,fromCvss,ambiguity });
});
