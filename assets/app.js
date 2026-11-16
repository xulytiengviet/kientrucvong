/* Browser UI for reproducible signal-symbol prototype. */
(() => {
  'use strict';
  const C=window.RingCore, A=window.RingAudio, V=window.CVNSSConverter;
  const $=id=>document.getElementById(id);
  const btns=['baseState','positionInput','offsetInput'];
  const ring=$('ringCanvas'), hero=$('heroCanvas');
  function lines(ctx,cx,cy,theta,r1,r2,color,width){ctx.beginPath();ctx.moveTo(cx+r1*Math.cos(theta),cy+r1*Math.sin(theta));ctx.lineTo(cx+r2*Math.cos(theta),cy+r2*Math.sin(theta));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function circle(ctx,cx,cy,r,color,width=1){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
  function drawRing(canvas, state, compact=false){
    const ctx=canvas.getContext('2d'), size=canvas.width,c=size/2;
    ctx.clearRect(0,0,size,size);
    const r=compact?size*.355:size*.335;
    circle(ctx,c,c,r,'#506466',1);
    circle(ctx,c,c,r*.73,'#26413d',1);
    circle(ctx,c,c,r*.33,'#2e4442',1);
    for(let i=0;i<108;i++){
      const theta=2*Math.PI*i/108-Math.PI/2;
      const valid=C.validVowelSlot(i);
      const color= i===state?'#f9ba79':(valid?'#8bcf71':'#3b5056');
      const len=i%27===0?24:(i%9===0?17:10);
      lines(ctx,c,c,theta,r+8,r+8+len,color,i%27===0?4:(i===state?4:2));
      if(!compact && valid){ctx.beginPath();ctx.arc(c+(r-10)*Math.cos(theta),c+(r-10)*Math.sin(theta),2,0,Math.PI*2);ctx.fillStyle='#547c64';ctx.fill();}
    }
    for(let i=0;i<4;i++){
      const angle=i*Math.PI/2-Math.PI/2;
      const x=c+(r+66)*Math.cos(angle),y=c+(r+66)*Math.sin(angle);
      ctx.fillStyle=i===0?'#b6ff57':'#bbc9c2';ctx.font=compact?'12px monospace':'16px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['0°','90°','180°','270°'][i],x,y);
    }
    const theta=2*Math.PI*state/108-Math.PI/2;
    lines(ctx,c,c,theta,0,r-17,'#b6ff57',compact?3:4);
    lines(ctx,c,c,theta+Math.PI,0,r-17,'#ffb96e88',compact?1.5:2);
    ctx.beginPath();ctx.arc(c+(r-17)*Math.cos(theta),c+(r-17)*Math.sin(theta),compact?6:8,0,Math.PI*2);ctx.fillStyle='#b6ff57';ctx.fill();
    ctx.beginPath();ctx.arc(c,c,5,0,Math.PI*2);ctx.fillStyle='#f6f9ea';ctx.fill();
    if(!compact){ctx.fillStyle='#f0f5eb';ctx.font='bold 55px Inter, sans-serif';ctx.fillText(String(state).padStart(3,'0'),c,c-34);ctx.fillStyle='#91adab';ctx.font='15px monospace';ctx.fillText('STATE / 108',c,c+4);ctx.fillStyle='#b6ff57';ctx.font='bold 23px monospace';ctx.fillText((state*360/108).toFixed(2)+'°',c,c+41);}
  }
  function updateRing(){
    const n=+$('baseState').value,p=+$('positionInput').value,k=+$('offsetInput').value;
    $('baseValue').textContent=n;$('positionValue').textContent=p;$('offsetValue').textContent=k;
    const pos=C.position(n,p,k),d=C.digits(pos.state);
    $('stateValue').textContent=String(pos.state).padStart(3,'0');$('angleValue').textContent=pos.angleDeg.toFixed(2)+'°';
    $('vectorValue').textContent=`(${pos.x.toFixed(4)}, ${pos.y.toFixed(4)})`;
    $('crtValue').textContent=`(${d.mod4}, ${d.mod27})`;
    $('digitsValue').textContent=`[${d.bits.join(',')}] · [${d.trits.join(',')}]`;
    $('slotText').textContent=(C.validVowelSlot(pos.state)?'Nằm trong miền 72 ô. ':'Nằm ngoài miền 72 ô. ')+ 'Miền này chỉ mô tả bảng nguyên âm–dấu–thanh trừu tượng, không phải bộ mã toàn bộ âm tiết.';
    drawRing(ring,pos.state);drawRing(hero,pos.state,true);
  }
  btns.forEach(id=>$(id).addEventListener('input',updateRing));
  $('flipButton').addEventListener('click',()=>{$('offsetInput').value=C.mod(+$('offsetInput').value+54,108);updateRing();});
  $('resetButton').addEventListener('click',()=>{$('baseState').value=21;$('positionInput').value=0;$('offsetInput').value=0;updateRing();});
  updateRing();

  let currentSamples=null,currentWav=null,currentText='',currentUrl=null;
  const wave=$('waveCanvas'), wctx=wave.getContext('2d');
  function drawWave(samples){
    const width=wave.width,height=wave.height,c=height/2;
    wctx.clearRect(0,0,width,height);
    wctx.strokeStyle='#2d4c4d';wctx.lineWidth=1;
    for(let i=0;i<6;i++){let x=i*width/5;wctx.beginPath();wctx.moveTo(x,0);wctx.lineTo(x,height);wctx.stroke();}
    for(let i=0;i<5;i++){let y=i*height/4;wctx.beginPath();wctx.moveTo(0,y);wctx.lineTo(width,y);wctx.stroke();}
    if(!samples||!samples.length){wctx.fillStyle='#718d88';wctx.font='18px monospace';wctx.textAlign='center';wctx.fillText('WAVEFORM AWAITING INPUT',width/2,c);return;}
    wctx.beginPath();wctx.strokeStyle='#b6ff57';wctx.lineWidth=1.2;
    const step=samples.length/width;
    for(let x=0;x<width;x++){
      let min=1,max=-1;
      const start=Math.floor(x*step),end=Math.min(samples.length,Math.max(start+1,Math.floor((x+1)*step)));
      for(let j=start;j<end;j++){if(samples[j]<min)min=samples[j];if(samples[j]>max)max=samples[j];}
      wctx.moveTo(x,c-max*c*.82);wctx.lineTo(x,c-min*c*.82);
    }
    wctx.stroke();
  }
  drawWave(null);
  function status(kind,title,msg){$('audioStatus').className='status-'+kind;$('audioStatus').textContent=title;$('audioMessage').textContent=msg;}
  function converted(){
    const input=$('sourceText').value;
    const cvss=V.fromCqn(input).cvss;
    const symbols=C.normalizeSymbols(cvss);
    return {input,cvss,symbols};
  }
  function updateSymbols(){
    try{
      const c=converted();$('cvssText').textContent=c.cvss||'(chuỗi rỗng)';
      const first=C.symbolsToTrits(c.symbols).slice(0,5);
      $('tritText').textContent=first.length?first.map(t=>'['+t.join(',')+']').join(' '):'—';
      return c;
    }catch(error){$('cvssText').textContent='KHÔNG HỢP LỆ: '+error.message;$('tritText').textContent='—';return null;}
  }
  $('sourceText').addEventListener('input',updateSymbols);updateSymbols();
  function showDecoded(decoded){
    $('decodedText').textContent=decoded.text||'(trống)';
    const recovered=V.fromCvss(decoded.text).cqn;
    $('unicodeText').textContent=recovered||'(trống)';
    let ambiguities=0;
    for(const word of decoded.text.split(/\s+/).filter(Boolean)){
      try{if(V.inspectWord(word.toLowerCase(),'cvss').ambiguous)ambiguities++;}catch(_){/* no candidate */}
    }
    const unicodeMatches=C.normalizeSymbols(decoded.text)===currentText &&
       recovered.normalize('NFC').toLocaleLowerCase('vi')===$('sourceText').value.normalize('NFC').toLocaleLowerCase('vi');
    $('unicodeNotice').textContent=(ambiguities?`${ambiguities} từ có nhiều ứng viên Unicode theo graph. `:'')+
      (unicodeMatches?'Unicode (không phân biệt hoa/thường) khớp đầu vào lần này.':'Unicode có thể không khớp văn bản gốc do chính sách chọn ứng viên, khoảng trắng hoặc biến thể chữ.');
    $('channelResult').textContent='CRC16: PASS';
    $('marginResult').textContent='Tỉ số đỉnh phổ trung bình: '+(decoded.avgMargin>10000?decoded.avgMargin.toExponential(2):decoded.avgMargin.toFixed(2));
    status('pass','PASS / CRC OK',`Khôi phục ${decoded.text.length} ký hiệu, đầu ra Base27 đúng cấu trúc và đạt kiểm tra CRC.`);
  }
  function showFailure(error){
    status('fail','REJECTED / CHECK FAIL',error.message);
    $('channelResult').textContent='CRC16 / framing: FAIL';
    $('marginResult').textContent='Không thể xác nhận độ đúng của payload';
    $('decodedText').textContent='—';$('unicodeText').textContent='—';
  }
  $('encodeButton').addEventListener('click',()=>{
    try{
      const c=updateSymbols();if(!c)throw new Error('Không thể chuyển input thành 27 ký hiệu A–Z + SPACE. Hãy bỏ dấu câu và số.');
      currentText=c.symbols;currentSamples=A.synthesize(currentText);currentWav=A.wavBytes(currentSamples);
      $('waveDuration').textContent=(currentSamples.length/A.SR).toFixed(2)+' s · '+A.SR+' Hz';
      drawWave(currentSamples);$('downloadButton').disabled=false;
      if(currentUrl)URL.revokeObjectURL(currentUrl);
      currentUrl=URL.createObjectURL(new Blob([currentWav],{type:'audio/wav'}));
      $('audioPlayer').src=currentUrl;
      $('decodedText').textContent='—';$('unicodeText').textContent='—';$('channelResult').textContent='CRC16: READY';
      status('standby','WAVE / READY',`Đã tạo WAV gồm ${A.frame(currentText).length} ô 27-FSK; hãy giải mã, tải file hoặc nghe thử.`);
    }catch(err){showFailure(err);}
  });
  $('decodeButton').addEventListener('click',()=>{
    try{if(!currentWav)throw new Error('Chưa có file WAV; hãy bấm Tạo sóng trước.');showDecoded(A.decodeWav(currentWav));}
    catch(err){showFailure(err);}
  });
  $('downloadButton').addEventListener('click',()=>{
    if(!currentWav)return;
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([currentWav],{type:'audio/wav'}));
    a.href=url;a.download='cvnss-base27-27fsk.wav';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('waveUpload').addEventListener('change',async ev=>{
    const file=ev.target.files[0];if(!file)return;
    try{
      const buffer=await file.arrayBuffer();currentWav=buffer;currentSamples=A.parseWav(buffer);
      $('waveDuration').textContent=(currentSamples.length/A.SR).toFixed(2)+' s · '+A.SR+' Hz';
      drawWave(currentSamples);
      currentText=updateSymbols()?.symbols||'';
      showDecoded(A.demodulateSamples(currentSamples));
      $('downloadButton').disabled=false;
      if(currentUrl)URL.revokeObjectURL(currentUrl);currentUrl=URL.createObjectURL(file);$('audioPlayer').src=currentUrl;
    }catch(err){showFailure(err);}
  });
  $('snrInput').addEventListener('input',()=>{$('snrValue').textContent=$('snrInput').value+' dB';});
  $('noiseTest').addEventListener('click',()=>{
    try{
      if(!currentSamples)throw new Error('Chưa có mẫu sóng nguồn; hãy tạo sóng trước.');
      const snr=+$('snrInput').value;
      const noisy=A.withAwgn(currentSamples,snr,20261116);
      drawWave(noisy);$('waveDuration').textContent=`AWGN ${snr} dB`;
      const result=A.demodulateSamples(noisy);
      showDecoded(result);
      if(result.text!==currentText)status('fail','CRC PASS / PAYLOAD CHANGED','CRC không đủ để đảm bảo tính nguyên vẹn tuyệt đối; cần so trực tiếp khi có bản gốc.');
      else $('audioMessage').textContent+=' Ở mức SNR '+snr+' dB, chuỗi ký hiệu khớp 100% cho khung đang thử.';
    }catch(err){showFailure(err);}
  });
})();
