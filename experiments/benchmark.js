#!/usr/bin/env node
/* Monte Carlo with deterministic seed; reports symbol error rate and frame success with CRC. */
const fs=require('node:fs');
const path=require('node:path');
const A=require('../src/audio.js');
const payloads=['TIENG VIET','ABC XYZ','HELLO WORLD','CVNSS BASE TRIT'];
const snrs=[-35,-30,-25,-20,-15,-10,0,20];
const repetitions=24;
let seed=20261116;
function nextSeed(){seed=(Math.imul(seed,1664525)+1013904223)|0;return seed;}
const results=[];
for(const snr of snrs){
  let frameOK=0,errs=0,total=0,crcFails=0;
  for(let trial=0;trial<repetitions;trial++){
    const message=payloads[trial%payloads.length];
    const reference=A.frame(message);
    const samples=A.withAwgn(A.modulateSymbols(reference),snr,nextSeed());
    const decoded=A.detectRawSymbols(samples).symbols;
    errs+=decoded.reduce((acc,sym,i)=>acc+(sym!==reference[i]?1:0),0);
    total+=reference.length;
    try {if(A.unframe(decoded)===message)frameOK++;} catch {crcFails++;}
  }
  results.push({snr_dB:snr,frames:repetitions,frame_success:frameOK,frame_success_pct:100*frameOK/repetitions,symbol_errors:errs,symbols:total,ser:errs/total,crc_rejected:crcFails});
}
const report={metadata:{version:'1.0.0',date:'2026-11-16',channel:'discrete AWGN only, exact symbol start/length known; not acoustic over-air',sample_rate_hz:A.SR,samples_per_symbol:A.SPS,base_frequency_hz:A.F0,delta_frequency_hz:A.DF,modulation:'27-FSK',trials_per_snr:repetitions,seed_initial:20261116},results};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
