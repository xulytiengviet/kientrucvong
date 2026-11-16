"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const B=require("../src/voice-bridge.js");
const C=require("../src/core.js");
const A=require("../src/audio.js");
test("Vietnamese transcript -> CVNSS -> Base27 envelope -> Unicode canonical",()=>{
  const item=B.fromVoiceTranscript("Tiếng Việt!");
  assert.equal(item.cvss,"Tizb Vidf!");
  assert.equal(B.unpackCvss(item.symbols),item.cvss);
  assert.equal(B.fromSymbols(item.symbols).unicode,item.canonicalUnicode);
  assert.equal(C.tritsToSymbols(item.trits),item.symbols);
});
test("CVNSS punctuation, Unicode UTF-8 and whitespace survive symbol transport exactly",()=>{
  for(const payload of ["", "Tizb Vidf!", "xin, CHAO?  123", "ký hiệu ☯ / emoji 🎤", "điện thoại\n"]) {
    assert.equal(B.unpackCvss(B.packCvss(payload)),payload.normalize("NFC"));
  }
});
test("invalid or truncated Base27 envelope is rejected",()=>{
  assert.throws(()=>B.unpackCvss("ABC"),/phiên bản/);
  const x=B.packCvss("HELLO");
  assert.throws(()=>B.unpackCvss(x.slice(0,-1)),/độ dài/);
  assert.throws(()=>B.unpackCvss("VR"+C.ALPHABET[1]+C.ALPHABET[0]+C.ALPHABET[0]+C.ALPHABET[0]+"ZZ"),/byte/);
  assert.throws(()=>B.packCvss("A".repeat(B.MAX_BYTES+1)),/quá dài/);
});
test("envelope transport across 27-FSK frame/CRC remains byte-exact in noiseless model",()=>{
  const symbols=B.packCvss("Tizb Vidf! 123");
  const wav=A.wavBytes(A.synthesize(symbols));
  const recovered=A.decodeWav(wav).text;
  assert.equal(B.unpackCvss(recovered),"Tizb Vidf! 123");
});
test("canonical CVNSS policy is not guaranteed to invert all Unicode strings",()=>{
  const result=B.fromVoiceTranscript("Tiếng Việt");
  assert.equal(typeof result.canonicalUnicode,"string");
  assert.ok(Array.isArray(result.ambiguous));
});
