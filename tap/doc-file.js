/* Đọc file hoạt động từ đồng hồ (Garmin và các hãng khác): .fit, .tcx, .gpx, và .zip của Garmin "Export Original".
   Đọc ngay trong trình duyệt, không gửi file đi đâu. Chỉ trả về các con số tổng hợp, không giữ toạ độ GPS.
   window.DocFile = {read(file) → Promise<KetQua>, phanTich(diem, tong)}
   KetQua: {date, km, giay, hr, hrmax, cad, diBo (phút), leo (m), troi (%), km1 (từng km: [giây, nhịp tim]), goiY ('road'|'trail'), ten} */
(function(G){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());

/* ---------- ZIP (chỉ cần lấy file .fit đầu tiên) ---------- */
async function moZip(buf){
  const v=new DataView(buf),u8=new Uint8Array(buf);
  let e=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-66000);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error('File zip bị hỏng.');
  let p=v.getUint32(e+16,true);const n=v.getUint16(e+10,true);
  for(let k=0;k<n;k++){
    if(v.getUint32(p,true)!==0x02014b50)break;
    const method=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    const name=new TextDecoder().decode(u8.subarray(p+46,p+46+nl));
    p+=46+nl+xl+cl;
    if(!/\.(fit|tcx|gpx)$/i.test(name))continue;
    const ds=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true),data=u8.slice(ds,ds+cs);
    let out;
    if(method===0)out=data.buffer;
    else if(method===8){
      if(typeof DecompressionStream==='undefined')throw new Error('Trình duyệt này không giải nén được file zip. Giải nén ra file .fit rồi chọn lại.');
      out=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    }else throw new Error('Kiểu nén zip không hỗ trợ.');
    return {name,buf:out};
  }
  throw new Error('Trong file zip không có file .fit, .tcx hay .gpx.');
}

/* ---------- FIT ---------- */
const FIT0=631065600;                          /* 31/12/1989, mốc thời gian của FIT */
function docFit(buf){
  const v=new DataView(buf),hs=v.getUint8(0);
  if(buf.byteLength<14||String.fromCharCode(v.getUint8(8),v.getUint8(9),v.getUint8(10),v.getUint8(11))!=='.FIT')throw new Error('Không phải file FIT.');
  const end=Math.min(buf.byteLength,hs+v.getUint32(4,true));
  const defs={},diem=[],tong={};let p=hs,lastTs=0;
  const val=(o,bt,size,le)=>{
    switch(bt&0x1f){
      case 0:case 2:case 10:case 13:{const x=v.getUint8(o);return(bt&0x1f)===10?(x===0?null:x):(x===0xff?null:x)}
      case 1:{const x=v.getInt8(o);return x===0x7f?null:x}
      case 3:{const x=v.getInt16(o,le);return x===0x7fff?null:x}
      case 4:case 11:{const x=v.getUint16(o,le);return(bt&0x1f)===11?(x===0?null:x):(x===0xffff?null:x)}
      case 5:{const x=v.getInt32(o,le);return x===0x7fffffff?null:x}
      case 6:case 12:{const x=v.getUint32(o,le);return(bt&0x1f)===12?(x===0?null:x):(x===0xffffffff?null:x)}
      case 8:return v.getFloat32(o,le);
      case 9:return v.getFloat64(o,le);
      default:return null;
    }
  };
  const SZ={0:1,1:1,2:1,3:2,4:2,5:4,6:4,8:4,9:8,10:1,11:2,12:4,13:1};
  while(p<end){
    const h=v.getUint8(p++);
    if(h&0x80){                                   /* tiêu đề thời gian nén */
      const local=(h>>5)&3,off=h&0x1f;let ts=(lastTs&~0x1f)+off;if(off<(lastTs&0x1f))ts+=0x20;
      p=data(local,p,ts);continue;
    }
    if(h&0x40){                                   /* định nghĩa */
      const local=h&0x0f,dev=h&0x20,le=v.getUint8(p+1)===0,gnum=v.getUint16(p+2,le),nf=v.getUint8(p+4);
      const f=[];let q=p+5,len=0;
      for(let i=0;i<nf;i++){f.push([v.getUint8(q),v.getUint8(q+1),v.getUint8(q+2),len]);len+=v.getUint8(q+1);q+=3}
      if(dev){const nd=v.getUint8(q);q++;for(let i=0;i<nd;i++){len+=v.getUint8(q+1);q+=3}}
      defs[local]={le,gnum,f,len};p=q;continue;
    }
    p=data(h&0x0f,p,null);
  }
  function data(local,p,tsNen){
    const d=defs[local];if(!d)throw new Error('File FIT bị hỏng.');
    const m={};
    for(const[num,size,bt,o]of d.f){if(SZ[bt&0x1f]===size)m[num]=val(p+o,bt,size,d.le)}
    if(m[253]!=null)lastTs=m[253];else if(tsNen!=null){m[253]=tsNen;lastTs=tsNen}
    if(d.gnum===20){                               /* record */
      const alt=m[78]!=null?m[78]/5-500:m[2]!=null?m[2]/5-500:null;
      diem.push({t:m[253],d:m[5]!=null?m[5]/100:null,hr:m[3],cad:m[4]!=null?m[4]+(m[53]?m[53]/128:0):null,alt});
    }else if(d.gnum===18){                         /* session */
      tong.giay=m[8]!=null?m[8]/1000:m[7]!=null?m[7]/1000:tong.giay;
      tong.m=m[9]!=null?m[9]/100:tong.m;tong.hr=m[16]??tong.hr;tong.hrmax=m[17]??tong.hrmax;tong.leo=m[22]??tong.leo;
      if(m[2]!=null)tong.bd=m[2];tong.sport=m[5];
    }
    return p+d.len;
  }
  diem.forEach(x=>x.t=x.t!=null?(x.t+FIT0):null);
  if(tong.bd)tong.bd+=FIT0;
  return {diem:diem.filter(x=>x.t!=null),tong};
}

/* ---------- TCX, GPX ---------- */
const tag=(el,n)=>{const x=el.getElementsByTagNameNS('*',n)[0];return x?x.textContent.trim():null};
const so=x=>x==null||x===''?null:+x;
function docTcx(txt){
  const x=new DOMParser().parseFromString(txt,'application/xml');
  if(x.getElementsByTagName('parsererror').length)throw new Error('File TCX bị hỏng.');
  const diem=[...x.getElementsByTagNameNS('*','Trackpoint')].map(tp=>{
    const hrEl=tp.getElementsByTagNameNS('*','HeartRateBpm')[0];
    return {t:Date.parse(tag(tp,'Time'))/1000,d:so(tag(tp,'DistanceMeters')),alt:so(tag(tp,'AltitudeMeters')),hr:hrEl?so(tag(hrEl,'Value')):null,cad:so(tag(tp,'RunCadence'))??so(tag(tp,'Cadence')),lat:so(tag(tp,'LatitudeDegrees')),lon:so(tag(tp,'LongitudeDegrees'))};
  }).filter(p=>isFinite(p.t));
  const laps=[...x.getElementsByTagNameNS('*','Lap')],tong={};
  if(laps.length){
    tong.giay=laps.reduce((a,l)=>a+(so(tag(l,'TotalTimeSeconds'))||0),0)||null;
    tong.m=laps.reduce((a,l)=>{const d=[...l.children].find(c=>c.localName==='DistanceMeters');return a+(d?+d.textContent:0)},0)||null;
    const mx=laps.map(l=>{const e=[...l.children].find(c=>c.localName==='MaximumHeartRateBpm');return e?so(tag(e,'Value')):null}).filter(Boolean);
    if(mx.length)tong.hrmax=Math.max(...mx);
  }
  return {diem,tong};
}
function docGpx(txt){
  const x=new DOMParser().parseFromString(txt,'application/xml');
  if(x.getElementsByTagName('parsererror').length)throw new Error('File GPX bị hỏng.');
  const diem=[...x.getElementsByTagNameNS('*','trkpt')].map(tp=>({t:Date.parse(tag(tp,'time'))/1000,lat:+tp.getAttribute('lat'),lon:+tp.getAttribute('lon'),alt:so(tag(tp,'ele')),hr:so(tag(tp,'hr')),cad:so(tag(tp,'cad')),d:null})).filter(p=>isFinite(p.t));
  return {diem,tong:{}};
}
const R=6371000,rad=Math.PI/180;
const hav=(a,b)=>{const dl=(b.lat-a.lat)*rad,dn=(b.lon-a.lon)*rad,s=Math.sin(dl/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(s))};

/* ---------- Phân tích ---------- */
function phanTich(diem,tong){
  diem=diem.slice().sort((a,b)=>a.t-b.t);
  if(diem.length<2&&!tong.m)throw new Error('File không có dữ liệu chạy.');
  /* quãng đường cộng dồn: dùng số của đồng hồ, không có thì tính từ GPS */
  if(diem.some(p=>p.d==null)){let c=0;diem.forEach((p,i)=>{if(i&&p.lat&&diem[i-1].lat)c+=hav(diem[i-1],p);if(p.d==null)p.d=c;else c=p.d})}
  /* guồng chân: đồng hồ ghi số bước của một chân → nhân 2 */
  const cs=diem.map(p=>p.cad).filter(c=>c>0).sort((a,b)=>a-b),x2=cs.length&&cs[cs.length>>1]<120?2:1;
  diem.forEach(p=>{if(p.cad!=null)p.cad*=x2});
  const coCad=cs.length>diem.length*0.3;
  let tg=0,hrT=0,hrS=0,hrMax=0,cadT=0,cadS=0,diBo=0;
  const seg=[];
  for(let i=1;i<diem.length;i++){
    const a=diem[i-1],b=diem[i],dt=b.t-a.t,dd=Math.max(0,b.d-a.d);
    if(dt<=0||dt>20)continue;                           /* dừng đồng hồ hoặc mất tín hiệu */
    const v=dd/dt;if(v<0.4)continue;                    /* đứng yên */
    tg+=dt;
    const hr=b.hr>30&&b.hr<240?b.hr:null;
    if(hr){hrT+=hr*dt;hrS+=dt;if(hr>hrMax)hrMax=hr}
    const chay=coCad?(b.cad>=140):(v>=1.75);
    if(chay&&b.cad>=140){cadT+=b.cad*dt;cadS+=dt}
    if(!chay)diBo+=dt;
    seg.push({t:tg,d:b.d,dt,dd,hr,chay});
  }
  const m=tong.m||(diem[diem.length-1].d-diem[0].d);
  const giay=tong.giay||tg||(diem[diem.length-1].t-diem[0].t);
  /* số mét leo: lọc nhiễu 3 m */
  let leo=tong.leo;
  if(leo==null){let base=null;leo=0;for(const p of diem){if(p.alt==null)continue;if(base==null){base=p.alt;continue}if(p.alt-base>=3){leo+=p.alt-base;base=p.alt}else if(base-p.alt>=3)base=p.alt}if(!diem.some(p=>p.alt!=null))leo=null}
  /* từng km */
  const km1=[];let mk=1000,t0=0,hT=0,hS=0,tc=0;
  for(const s of seg){tc+=s.dt;if(s.hr){hT+=s.hr*s.dt;hS+=s.dt}if(s.d-diem[0].d>=mk){km1.push([Math.round(tc-t0),hS?Math.round(hT/hS):null]);t0=tc;hT=0;hS=0;mk+=1000}}
  /* tim trôi: so nửa đầu và nửa sau (nhịp tim trên tốc độ), chỉ tính đoạn chạy */
  let troi=null;
  const run=seg.filter(s=>s.chay&&s.hr);
  const tRun=run.reduce((a,s)=>a+s.dt,0);
  if(tRun>=1200){
    let acc=0;const h=[[0,0,0],[0,0,0]];
    for(const s of run){const k=acc<tRun/2?0:1;h[k][0]+=s.hr*s.dt;h[k][1]+=s.dd;h[k][2]+=s.dt;acc+=s.dt}
    const e=k=>(h[k][0]/h[k][2])/(h[k][1]/h[k][2]);
    troi=Math.round((e(1)/e(0)-1)*1000)/10;
  }
  const t0s=tong.bd||diem[0].t;
  const km=m/1000;
  return {date:ymd(new Date(t0s*1000)),km:Math.round(km*100)/100,giay:Math.round(giay),
    hr:tong.hr||(hrS?Math.round(hrT/hrS):null),hrmax:tong.hrmax||(hrMax||null),
    cad:cadS>=60?Math.round(cadT/cadS):null,diBo:Math.round(diBo/60),leo:leo==null?null:Math.round(leo),troi,km1,
    goiY:leo!=null&&km>0&&leo/km>=15?'trail':'road'};
}

async function read(file){
  if(file.size>40e6)throw new Error('File quá lớn.');
  let name=file.name,buf=await file.arrayBuffer();
  if(/\.zip$/i.test(name)){const z=await moZip(buf);name=z.name;buf=z.buf}
  let raw;
  if(/\.fit$/i.test(name))raw=docFit(buf);
  else if(/\.tcx$/i.test(name))raw=docTcx(new TextDecoder().decode(buf));
  else if(/\.gpx$/i.test(name))raw=docGpx(new TextDecoder().decode(buf));
  else throw new Error('Chỉ đọc được file .fit, .tcx, .gpx hoặc .zip.');
  return {...phanTich(raw.diem,raw.tong),ten:file.name};
}
G.DocFile={read,phanTich};
})(typeof window!=='undefined'?window:globalThis);
