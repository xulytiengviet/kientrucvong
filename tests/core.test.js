'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const A = require('../src/audio.js');
const V = require('../vendor/cvnss4_0_converter.v5.js');
test('CRT bijection and mixed-radix representation for all 108 states', () => {
  const seen = new Set();
  for(let n=0;n<108;n++){
    const {mod4,mod27}=C.crt(n);
    assert.equal(C.uncrt(mod4,mod27),n);
    const d=C.digits(n);
    assert.equal(C.fromDigits(d.bits,d.trits),n);
    seen.add(d.bits.join('')+':'+d.trits.join(','));
  }
  assert.equal(seen.size,108);
});
test('vowel+modifier+tone schema occupies 72 of 108 slots',()=>{
  assert.equal(Array.from({length:108},(_,i)=>C.validVowelSlot(i)).filter(Boolean).length,72);
});
test('360 degree cyclic position, 180 degree flip, and relative offset invariance',()=>{
  for(let n=0;n<108;n++){
    const p=C.position(n,4,29), plus=C.position(n,4,29+54), period=C.position(n,4,29+108);
    assert.ok(Math.hypot(p.x,p.y)-1<1e-12);
    assert.ok(Math.abs(p.x+plus.x)<1e-12 && Math.abs(p.y+plus.y)<1e-12);
    assert.ok(Math.abs(p.x-period.x)<1e-12 && Math.abs(p.y-period.y)<1e-12);
    const delta=C.mod(C.position(n,7,19).state-C.position((n+23)%108,5,19).state,108);
    assert.equal(delta,C.mod(n-(n+23)+2,108));
  }
});
test('base27: all characters exactly ↔ 3 balanced trits',()=>{
  for(const symbol of C.ALPHABET){
    const tri=C.symbolsToTrits(symbol);
    assert.equal(C.tritsToSymbols(tri),symbol);
  }
});
test('zero-noise symbol → audio → symbol, including whole alphabet',()=>{
  const payload='ABCDEFGHIJKLMNOPQRSTUVWXYZ ABC XYZ';
  const pcm=A.synthesize(payload);
  const result=A.demodulateSamples(pcm);
  assert.equal(result.text,payload);
  assert.equal(A.decodeWav(A.wavBytes(pcm)).text,payload);
});
test('deterministic messages incl empty and whitespace round trip via PCM WAV',()=>{
  for(const payload of ['', 'A','   ','HELLO WORLD','TIENG VIET','ABC XYZ','ZYXWVUTSRQPONMLKJIHGFEDCBA']){
    const wav=A.wavBytes(A.synthesize(payload));
    assert.equal(A.decodeWav(wav).text,payload);
  }
});
test('non Base27 must be rejected (no silent data loss)',()=>{
  assert.throws(()=>A.frame('VIỆT'),/không thuộc/);
  assert.throws(()=>A.frame('ABC.'),/không thuộc/);
});
test('CRC catches a substituted valid symbol',()=>{
  const symbols=A.frame('HELLO WORLD');
  symbols[7]=(symbols[7]+1)%27;
  assert.throws(()=>A.unframe(symbols),/CRC/);
});
test('AWGN channel: deterministic high SNR round trip; not universal 100%',()=>{
  const original='ABC XYZ TIENG VIET';
  const noisy=A.withAwgn(A.synthesize(original),22,42);
  assert.equal(A.demodulateSamples(noisy).text,original);
});
test('official v5 audit-safe converter selfTest and explicit ambiguity',()=>{
  assert.equal(V.selfTest().ok,true);
  assert.equal(V.audit().ambiguityGroups,56);
  assert.equal(V.fromCqn('Tiếng Việt').cvss,'Tizb Vidf');
});
