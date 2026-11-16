/* 27-ary orthogonal audio FSK, deterministic PCM WAV protocol. No microphone synchronization claim. MIT. */
(function (root, factory) {
  const Core = typeof module === 'object' && module.exports ? require('./core.js') : root.RingCore;
  const api = factory(Core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RingAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';
  const SR = 24000, SPS = 2400, F0 = 600, DF = 80, RAMP = 120;
  const MAGIC = [26,0,26,0], HEADER_LEN = MAGIC.length + 3, CRC_LEN = 4, MAX_LEN = 1800;
  const toBase27 = (value, digits) => {
    const out = [];
    for (let i=0; i<digits; i++) {out.push(value%27); value=Math.floor(value/27);}
    if (value !== 0) throw new RangeError('Value does not fit the frame');
    return out;
  };
  const fromBase27 = digits => digits.reduceRight((acc, v) => acc*27+v, 0);
  function crc16(values) {
    let crc = 0xffff;
    for (const value of values) {
      crc ^= value << 8;
      for (let i=0; i<8; i++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc;
  }
  function frame(text) {
    const value = Core.normalizeSymbols(text);
    if (value.length > MAX_LEN) throw new RangeError('Chuỗi quá dài, tối đa '+MAX_LEN+' ký tự.');
    const payload = Array.from(value, Core.charToValue);
    return [...MAGIC, ...toBase27(payload.length, 3), ...payload, ...toBase27(crc16(payload), 4)];
  }
  function unframe(symbols) {
    if (symbols.length < HEADER_LEN + CRC_LEN) throw new Error('Khung tín hiệu quá ngắn.');
    if (MAGIC.some((v,i)=>symbols[i] !== v)) throw new Error('Sai magic/preamble: chưa đồng bộ khung.');
    const len = fromBase27(symbols.slice(4,7));
    if (len > MAX_LEN) throw new Error('Độ dài khung vượt giới hạn cho phép.');
    if (symbols.length !== HEADER_LEN + len + CRC_LEN) throw new Error('Độ dài khung không nhất quán.');
    const payload = symbols.slice(HEADER_LEN, HEADER_LEN + len);
    const received = fromBase27(symbols.slice(-CRC_LEN));
    const expected = crc16(payload);
    if (received !== expected) throw new Error('CRC-16 không khớp; tín hiệu đã bị sai hoặc nhiễu.');
    return payload.map(v=>Core.ALPHABET[v]).join('');
  }
  function modulateSymbols(symbols) {
    const out = new Float32Array(symbols.length * SPS);
    for (let j=0; j<symbols.length; j++) {
      const symbol = symbols[j];
      if (!Number.isInteger(symbol) || symbol < 0 || symbol > 26) throw new RangeError('symbol outside Base27');
      const freq = F0 + DF * symbol;
      const start = j*SPS;
      for (let t=0; t<SPS; t++) {
        const env = Math.min(1, t / RAMP, (SPS-1-t) / RAMP);
        out[start+t] = .73*env*Math.sin(2*Math.PI*freq*t/SR);
      }
    }
    return out;
  }
  function synthesize(text) {return modulateSymbols(frame(text));}
  function goertzel(samples, start, symbol) {
    const bin = (F0+DF*symbol)*SPS/SR; // integer bin due to frequencies and symbol length
    const omega = 2*Math.PI*bin/SPS;
    const coeff = 2*Math.cos(omega);
    let a=0,b=0;
    for (let j=0; j<SPS; j++) {
      const next = samples[start+j] + coeff*a - b;
      b=a; a=next;
    }
    return Math.max(0,a*a+b*b-coeff*a*b);
  }
  function detectRawSymbols(samples) {
    if (!(samples instanceof Float32Array)) throw new TypeError('Expected Float32Array PCM.');
    if (samples.length % SPS !== 0) throw new Error('WAV không căn khung: cần đúng số mẫu cho mỗi ký hiệu.');
    const count = samples.length / SPS;
    if (count < HEADER_LEN+CRC_LEN || count > HEADER_LEN+MAX_LEN+CRC_LEN) throw new Error('Kích thước WAV ngoài giới hạn.');
    const symbols=[], margins=[];
    for (let i=0; i<count; i++) {
      let best=-1, bestScore=-1, second=0;
      for (let s=0; s<27; s++) {
        const power = goertzel(samples,i*SPS,s);
        if (power > bestScore) {second=bestScore; bestScore=power; best=s;}
        else if (power>second) second=power;
      }
      if (bestScore < 0.0001) throw new Error('Không phát hiện sóng đủ mạnh ở ô '+i+'.');
      symbols.push(best);
      margins.push(bestScore/(second+1e-10));
    }
    return { symbols, minMargin: Math.min(...margins), avgMargin: margins.reduce((a,b)=>a+b,0)/margins.length };
  }
  function demodulateSamples(samples) {
    const raw=detectRawSymbols(samples);
    return {...raw, text: unframe(raw.symbols)};
  }
  function withAwgn(samples, snrDb, seed=123456789) {
    if (!Number.isFinite(snrDb)) throw new RangeError('SNR must be finite');
    let power=0; for (const x of samples) power+=x*x; power/=Math.max(1,samples.length);
    const noiseSigma = Math.sqrt(power/Math.pow(10, snrDb/10));
    let s=seed|0; const rnd=()=>{s ^= s<<13; s ^= s>>>17; s ^= s<<5; return ((s>>>0)+0.5)/4294967296;};
    const result = new Float32Array(samples.length);
    for(let i=0;i<samples.length;i+=2){
      const r=Math.sqrt(-2*Math.log(rnd())); const theta=2*Math.PI*rnd();
      result[i]=samples[i]+noiseSigma*r*Math.cos(theta);
      if(i+1<samples.length) result[i+1]=samples[i+1]+noiseSigma*r*Math.sin(theta);
    }
    return result;
  }
  function wavBytes(samples) {
    const buffer=new ArrayBuffer(44+samples.length*2), v=new DataView(buffer);
    const put=(offset,text)=>{for(let i=0;i<text.length;i++)v.setUint8(offset+i,text.charCodeAt(i));};
    put(0,'RIFF');v.setUint32(4,36+samples.length*2,true);put(8,'WAVE');put(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
    v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
    put(36,'data');v.setUint32(40,samples.length*2,true);
    for(let i=0;i<samples.length;i++)v.setInt16(44+2*i,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
    return buffer;
  }
  function parseWav(input) {
    const view=new DataView(input);
    const str=(offset,n)=>Array.from({length:n},(_,i)=>String.fromCharCode(view.getUint8(offset+i))).join('');
    if(view.byteLength<44 || str(0,4)!=='RIFF' || str(8,4)!=='WAVE')throw new Error('Không phải WAV RIFF.');
    let fmt=null,pcm=null;
    for(let off=12; off+8<=view.byteLength;){
      const type=str(off,4),size=view.getUint32(off+4,true),begin=off+8;
      if(begin+size>view.byteLength)throw new Error('WAV chunk lỗi/truncated.');
      if(type==='fmt '){
        if(size<16)throw new Error('WAV fmt lỗi.');
        fmt={tag:view.getUint16(begin,true),channels:view.getUint16(begin+2,true),rate:view.getUint32(begin+4,true),bits:view.getUint16(begin+14,true)};
      }
      if(type==='data')pcm={begin,size};
      off=begin+size+(size%2);
    }
    if(!fmt||!pcm)throw new Error('WAV thiếu fmt hoặc data.');
    if(fmt.tag!==1||fmt.channels!==1||fmt.rate!==SR||fmt.bits!==16)throw new Error('Chỉ hỗ trợ PCM 16-bit, mono, 24 kHz.');
    if(pcm.size%2)throw new Error('Invalid PCM data size.');
    const samples=new Float32Array(pcm.size/2);
    for(let i=0;i<samples.length;i++)samples[i]=view.getInt16(pcm.begin+2*i,true)/32768;
    return samples;
  }
  function decodeWav(buffer){return demodulateSamples(parseWav(buffer));}
  return Object.freeze({SR,SPS,F0,DF,MAX_LEN,MAGIC,crc16,frame,unframe,modulateSymbols,synthesize,withAwgn,wavBytes,parseWav,detectRawSymbols,demodulateSamples,decodeWav});
});
