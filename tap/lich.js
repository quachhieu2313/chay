/* Bộ tạo lịch chạy theo hồ sơ của từng người. Không cần mạng, không lưu gì: cùng hồ sơ luôn ra cùng lịch.
   window.LichChay = {taoLich(hoSo, homNay), vung(hoSo), ...}

   Nguyên tắc (theo các giáo trình phổ biến: Daniels, Pfitzinger, Koop cho trail):
   - Chia giai đoạn: nền → tăng cường → cao điểm → giảm tải trước giải.
   - Khối lượng tăng tối đa 7–10% mỗi tuần, cứ tuần thứ 4 giảm khoảng 20% để cơ thể hấp thụ.
   - Khoảng 80% thời gian chạy nhẹ (vùng 2), bài nặng tối đa 2 buổi mỗi tuần, không xếp hai ngày nặng liền nhau.
   - Chạy dài không quá khoảng 1/3 tổng tuần, tăng tối đa 2 km mỗi lần.
   - Trail: tập theo thời gian và số mét leo, không theo pace; có bài leo dốc, xuống dốc, chạy dài hai ngày liền.
   - Pace tính bằng VDOT (công thức Daniels–Gilbert) từ một kết quả gần đây; không có thì chỉ dùng nhịp tim. */
(function(G){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addD=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const thu=s=>(parse(s).getDay()+6)%7;                 /* 0 = thứ 2 … 6 = chủ nhật */
const soNgay=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r05=x=>Math.round(x*2)/2;
const fmtP=s=>{s=Math.round(s);return Math.floor(s/60)+':'+pad(s%60)};
const fmtT=m=>{m=Math.round(m);return m<60?m+' phút':Math.floor(m/60)+' giờ'+(m%60?' '+pad(m%60):'')};
const fmtKm=k=>(Math.round(k*10)/10).toString().replace('.',',');

/* ---------- VDOT ---------- */
const vo2=v=>-4.6+0.182258*v+0.000104*v*v;                                     /* v: m/phút */
const phanTram=t=>0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t);
const vdot=(km,phut)=>vo2(km*1000/phut)/phanTram(phut);
const vTai=o=>{const a=0.000104,b=0.182258,c=-4.6-o;return(-b+Math.sqrt(b*b-4*a*c))/(2*a)};
const paceTai=(V,f)=>60000/vTai(V*f);                                          /* giây mỗi km */
function thoiGianDua(V,km){let lo=km*2,hi=km*20;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(vdot(km,m)>V)lo=m;else hi=m}return(lo+hi)/2}

/* Ước lượng VDOT: ưu tiên kết quả thi/chạy hết sức gần đây, nếu không thì từ pace chạy nhẹ ở vùng 2. */
function uocVdot(p){
  const t=p.thanhTich||{};
  if(t.km>=1.5&&t.phut>0){const V=vdot(+t.km,+t.phut);if(V>15&&V<85)return{V,nguon:'ket-qua'}}
  const e=+p.paceNhe;                                                           /* giây/km */
  if(e>=200&&e<=900){const v=60000/e;return{V:vo2(v)/0.66,nguon:'pace-nhe'}}
  return null;
}

/* ---------- Vùng nhịp tim (Karvonen) và pace ---------- */
function vung(p){
  const tuoi=+p.tuoi||35,max=+p.hrMax||Math.round(208-0.7*tuoi),nghi=+p.hrNghi||60,R=max-nghi;
  const at=f=>Math.round(nghi+R*f);
  const LT=+p.hrNguong||0,lf=f=>Math.min(max,Math.round(LT*f));
  const hr=LT>=100&&LT<max?{max,nghi,uocMax:!p.hrMax,lthr:LT,
    z:[['Z1','Hồi phục',lf(.72),lf(.85)],['Z2','Chạy nhẹ',lf(.85),lf(.89)],['Z3','Trung bình',lf(.9),lf(.94)],['Z4','Ngưỡng',lf(.95),lf(.99)],['Z5','Tối đa',LT,max]],
    nhe:[lf(.8),lf(.89)],hoiPhuc:[lf(.72),lf(.84)],dai:[lf(.8),lf(.9)],tempo:[lf(.95),LT],bien:[LT,lf(1.06)],doc:[lf(.95),lf(1.04)],leo:[lf(.88),lf(.97)],tran:lf(.89)}
  :{max,nghi,uocMax:!p.hrMax,
    z:[['Z1','Hồi phục',at(.5),at(.6)],['Z2','Chạy nhẹ',at(.6),at(.7)],['Z3','Trung bình',at(.7),at(.8)],['Z4','Ngưỡng',at(.8),at(.9)],['Z5','Tối đa',at(.9),max]],
    nhe:[at(.6),at(.7)],hoiPhuc:[at(.5),at(.65)],dai:[at(.6),at(.72)],tempo:[at(.8),at(.87)],bien:[at(.87),at(.95)],doc:[at(.8),at(.92)],leo:[at(.72),at(.85)],tran:at(.72)};
  const u=uocVdot(p);let pace=null,du=null;
  if(u){
    const V=u.V;
    pace={V:Math.round(V*10)/10,nguon:u.nguon,nhe:[paceTai(V,.70),paceTai(V,.62)],
      M:thoiGianDua(V,42.195)*60/42.195,HM:thoiGianDua(V,21.0975)*60/21.0975,T:paceTai(V,.88),I:paceTai(V,.975)};
    pace.R=pace.I-15;
    du=[5,10,21.0975,42.195].map(k=>[k,thoiGianDua(V,k)]);
  }
  return {hr,pace,du};
}

/* ---------- Thông số theo cự ly ---------- */
function thongSo(p){
  const m=p.muc,D=+m.km||10;
  if(m.loai==='trail'){
    return {trail:1,D,dPlus:+m.dPlus||0,
      dinh:[clamp(D*1.1+12,25,80),clamp(D*1.6+18,35,110)],
      daiMax:D<=25?D:clamp(D*0.62,25,38),gioDaiMax:D<=25?3:4.5,
      minTuan:D<=25?8:D<=50?14:20,giam:D<=25?1:D<=50?2:3};
  }
  const R=D<=5?[18,40,12,4,1]:D<=10?[24,50,16,6,1]:D<=21.1?[32,62,21,10,2]:[45,85,32,16,3];
  return {trail:0,D,dPlus:0,dinh:[R[0],R[1]],daiMax:R[2],gioDaiMax:3,minTuan:R[3],giam:R[4]};
}

/* Chọn ngày chạy: trải đều trong tuần, luôn có ngày chạy dài. */
const kc=(a,b)=>{const d=Math.abs(a-b);return Math.min(d,7-d)};
function chonNgay(ranh,n,dai,kem){
  const A=[...new Set(ranh)].sort();if(!A.length)return{chay:[],dai:6};
  const L=A.includes(dai)?dai:A[A.length-1];const c=[L];
  if(kem&&n>=4&&A.includes((L+6)%7))c.push((L+6)%7);
  while(c.length<Math.min(n,A.length)){
    let best=null,bs=-1;
    for(const d of A){if(c.includes(d))continue;const s=Math.min(...c.map(x=>kc(x,d)))*10-(d===(L+1)%7?3:0);if(s>bs){bs=s;best=d}}
    c.push(best);
  }
  return {chay:c.sort((a,b)=>a-b),dai:L};
}
function chonNang(chay,L,q){
  const cand=chay.filter(d=>d!==L&&d!==(L+1)%7&&d!==(L+6)%7),out=[];
  const pool=cand.length?cand:chay.filter(d=>d!==L);
  while(out.length<q&&pool.length>out.length){
    let best=null,bs=-1;
    for(const d of pool){if(out.includes(d))continue;const s=Math.min(kc(d,L),...out.map(x=>kc(x,d)));if(out.some(x=>kc(x,d)<2))continue;if(s>bs){bs=s;best=d}}
    if(best===null)break;out.push(best);
  }
  return out;
}

/* ---------- Các bài nặng, tăng dần theo số lần đã tập (k) ---------- */
const BAI={
  fartlek:k=>({ten:'Chạy biến tốc nhẹ',chinh:`${6+Math.min(k,4)} × 1 phút nhanh vừa / 2 phút chạy chậm`,km:(6+Math.min(k,4))*3/7.5,hr:'tempo',pace:null,
    mo:'Phần nhanh ở cảm giác 7/10, nói được vài chữ. Phần chậm chạy rất nhẹ, không đi bộ nếu không cần.'}),
  doc:(k,x)=>({ten:'Chạy lên dốc ngắn',chinh:`${6+Math.min(k,4)} × 45–60 giây chạy lên dốc mạnh, chạy chậm xuống nghỉ`,km:(6+Math.min(k,4))*0.4,hr:'doc',pace:null,
    mo:x.doc==='khong'?'Không có dốc: dùng máy chạy bộ độ dốc 6–8%, hoặc chạy lên cầu thang bộ.':'Dốc 5–8%. Lên dốc bước ngắn, đánh tay mạnh, thân hơi đổ về trước. Xuống dốc chạy thật chậm để nghỉ.'}),
  tempo:k=>{const L=[['3 × 6 phút',18],['3 × 8 phút',24],['4 × 8 phút',32],['3 × 10 phút',30],['2 × 15 phút',30],['25 phút liên tục',25],['30 phút liên tục',30]][Math.min(k,6)];
    return {ten:'Chạy ngưỡng (tempo)',chinh:L[0]+' ở pace ngưỡng'+(L[0].includes('×')?', nghỉ 1–2 phút chạy chậm':''),phut:L[1],nghi:L[0].includes('×')?4:0,hr:'tempo',pace:'T',
      mo:'Nhanh nhưng kiểm soát được, cảm giác 7–8/10, nói được từng câu ngắn. Không chạy nhanh hơn pace ghi ở đây.'}},
  bien:k=>{const L=[['5 × 3 phút',15],['6 × 3 phút',18],['5 × 4 phút',20],['6 × 4 phút',24],['5 × 5 phút',25],['4 × 6 phút',24]][Math.min(k,5)];
    return {ten:'Chạy biến tốc (interval)',chinh:L[0]+' ở pace interval, nghỉ bằng thời gian chạy (chạy chậm)',phut:L[1],nghi:L[1],hr:'bien',pace:'I',
      mo:'Khó, cảm giác 8–9/10. Lần cuối vẫn phải giữ được pace như lần đầu; không giữ được thì dừng sớm. Nhịp tim lên chậm trong các lần chạy ngắn nên theo pace hoặc cảm giác.'}},
  nhanh:k=>{const L=[['8 × 200 m',1.6],['10 × 200 m',2],['8 × 300 m',2.4],['6 × 400 m',2.4],['8 × 400 m',3.2]][Math.min(k,4)];
    return {ten:'Chạy nhanh ngắn (reps)',chinh:L[0]+' ở pace reps, nghỉ đi bộ hoặc chạy chậm bằng quãng đã chạy',km:L[1]*2,hr:null,pace:'R',
      mo:'Nhanh và thả lỏng, chú ý dáng chạy. Nghỉ đủ để lần sau nhanh như lần trước.'}},
  leo:(k,x)=>{const L=[['6 × 2 phút',12],['8 × 2 phút',16],['6 × 3 phút',18],['5 × 4 phút',20],['4 × 6 phút',24],['3 × 8 phút',24]][Math.min(k,5)];
    return {ten:'Leo dốc',chinh:L[0]+' leo dốc ở vùng 4, xuống chậm để nghỉ',phut:L[1]*2,hr:'doc',pace:null,leo:1,
      mo:(x.doc==='khong'?'Không có dốc: máy chạy bộ độ dốc 10–15% hoặc leo cầu thang bộ. ':'')+'Dốc gắt thì đi bộ nhanh, tay chống lên đùi, vẫn giữ nhịp tim trong vùng. Tập cả chạy lẫn đi bộ dốc vì trong giải bạn sẽ dùng cả hai.'}},
  leoDai:(k,x)=>{const m=[20,25,30,35,40][Math.min(k,4)];
    return {ten:'Leo dốc dài',chinh:`${m} phút leo liên tục ở vùng 3, đi bộ nhanh xen chạy`,phut:m*1.6,hr:'leo',pace:null,leo:1,
      mo:(x.doc==='khong'?'Máy chạy bộ dốc 8–12% hoặc cầu thang nhiều tầng. ':'')+'Đều sức từ đầu đến cuối, như đoạn leo dài trong giải.'}}
};
const DS_BAI={road:{5:['bien','nhanh'],10:['bien','tempo'],21:['tempo','bien'],42:['tempo','doc']},trail:['leo','tempo','leoDai']};

/* ---------- Tạo lịch ---------- */
function taoLich(p,homNay){
  homNay=homNay||ymd(new Date());
  const X=thongSo(p),Z=vung(p),hr=Z.hr,pc=Z.pace,canhBao=[];
  const cur=p.hienTai||{},kmNow=Math.max(0,+cur.kmTuan||0),daiNow=Math.max(0,+cur.dai||0),nam=+cur.nam||0;
  const ct=p.chanThuong||'khong',quayLai=ct!=='khong',moi=kmNow<10||nam===0,diBo=kmNow<8||ct==='dang-dau';
  const thanhTich=p.muc.mucTieu==='thanh-tich';

  /* Ngày bắt đầu: thứ 2 tới (hoặc hôm nay nếu là thứ 2). */
  let bd=thu(homNay)===0?homNay:addD(homNay,7-thu(homNay));
  let N,ngayDua=null;
  if(p.muc.ngay){
    ngayDua=p.muc.ngay;
    if(ngayDua<=bd){N=1;canhBao.push(['bad','Ngày thi đã quá gần hoặc đã qua. Chọn ngày thi khác, hoặc bỏ trống để tập nâng thể lực.'])}
    else N=Math.floor(soNgay(bd,ngayDua)/7)+1;
    if(N>30){bd=addD(bd,(N-30)*7);canhBao.push(['info',`Còn ${N} tuần đến giải. Lịch 30 tuần bắt đầu từ ${bd.split('-').reverse().join('/')}; trước đó chạy nhẹ đều như hiện tại để giữ nền.`]);N=30;}
  }else N=clamp(+p.muc.soTuan||12,4,30);
  if(ngayDua&&N<X.minTuan)canhBao.push(['warn',`Chỉ còn ${N} tuần, ít hơn ${X.minTuan} tuần nên có cho cự ly này. Lịch vẫn tăng dần an toàn nên có thể chưa đạt khối lượng tốt nhất. Cân nhắc đặt mục tiêu "hoàn thành" hoặc chọn giải muộn hơn.`]);
  if(ct==='dang-dau')canhBao.push(['bad','Bạn đang đau. Nên đi khám trước khi chạy. Lịch bắt đầu bằng đi bộ xen chạy rất nhẹ; đau tăng thì dừng hẳn.']);
  else if(ct==='moi-khoi')canhBao.push(['info','Vừa khỏi chấn thương: 4 tuần đầu chỉ chạy nhẹ, khối lượng tăng chậm hơn bình thường.']);
  if(X.trail&&p.doc==='khong')canhBao.push(['info','Không có dốc gần nhà: các bài leo dùng máy chạy bộ có độ dốc hoặc cầu thang bộ.']);
  if(!X.trail&&X.D>=42&&kmNow<25)canhBao.push(['warn','Marathon cần nền khoảng 25–30 km mỗi tuần trước khi bắt đầu giáo án. Nếu còn ít thời gian, cân nhắc chạy 21 km trước.']);
  if(X.trail&&X.D>=50&&kmNow<30)canhBao.push(['warn','Trail từ 50 km cần nền khoảng 30 km mỗi tuần và đã chạy dài được 20 km trở lên.']);
  let mt=null;
  if(!X.trail&&thanhTich&&+p.muc.tgMucTieu>0){
    const T=+p.muc.tgMucTieu,Vg=vdot(X.D,T);
    mt={T,pace:T*60/X.D,Vg:Math.round(Vg*10)/10,paceThi:T*60/X.D};
    if(pc){
      const moiTuan=nam===0?0.4:nam===1?0.3:0.2,kha=Math.min(8,N*moiTuan*(quayLai?0.6:1)),can=Vg-pc.V;
      Object.assign(mt,{can:Math.round(can*10)/10,kha:Math.round(kha*10)/10});
      const tDat=thoiGianDua(pc.V+kha,X.D);
      if(can<=0)canhBao.push(['ok',`Mục tiêu ${fmtT(T)} nằm trong sức hiện tại (dự đoán ${fmtT(thoiGianDua(pc.V,X.D))} nếu đủ sức bền cho cự ly). Có thể đặt cao hơn.`]);
      else if(can<=kha)canhBao.push(['info',`Mục tiêu ${fmtT(T)} khả thi nếu tập đều: cần tăng khoảng ${mt.can} điểm VDOT trong ${N} tuần (ước tính thường đạt được khoảng ${mt.kha}).`]);
      else{mt.paceThi=tDat*60/X.D;mt.kho=1;canhBao.push(['warn',`Mục tiêu ${fmtT(T)} khó trong ${N} tuần: cần tăng ${mt.can} điểm VDOT, thường chỉ đạt khoảng ${mt.kha}. Mục tiêu thực tế hơn: khoảng ${fmtT(tDat)}. Các đoạn chạy pace thi trong lịch dùng mức này.`])}
    }else canhBao.push(['info','Điền một kết quả road gần đây ở hồ sơ để kiểm tra thời gian mục tiêu có thực tế không.']);
  }
  if(!pc)canhBao.push(['info','Chưa có kết quả gần đây nên lịch chỉ dùng nhịp tim. Điền thời gian một lần chạy 5 km hết sức (hoặc pace chạy nhẹ) ở hồ sơ để có pace cho từng bài.']);

  /* Số buổi, ngày */
  const ranh=(p.ngayRanh&&p.ngayRanh.length?p.ngayRanh:[1,3,5,6]).map(Number);
  const nBuoi=clamp(+p.soBuoi||4,2,6);
  const {chay,dai:L}=chonNgay(ranh,nBuoi,p.ngayDai==null?6:+p.ngayDai,X.trail&&X.D>=30);
  if(ranh.length<nBuoi)canhBao.push(['warn',`Bạn chọn ${nBuoi} buổi mỗi tuần nhưng chỉ có ${ranh.length} ngày rảnh, nên lịch xếp ${chay.length} buổi. Chọn thêm ngày rảnh nếu muốn chạy nhiều hơn.`]);
  if(chay.length<3)canhBao.push(['info','Chạy 2 buổi mỗi tuần thì tiến bộ chậm. Nếu được, thêm một buổi chạy nhẹ 30 phút.']);

  /* Khối lượng */
  const giam=ngayDua?Math.min(X.giam,Math.max(0,N-2)):0,M=N-giam;
  let vt=thanhTich?0.7:0.35;if(nam>=2)vt+=0.15;if(moi)vt-=0.2;
  let dinh=X.dinh[0]+(X.dinh[1]-X.dinh[0])*clamp(vt,0,1);
  if(quayLai)dinh*=0.85;
  dinh=Math.max(dinh,Math.min(kmNow,X.dinh[1]));
  const tocDo=diBo?1.06:quayLai?1.07:moi?1.08:1.10;
  let W0=quayLai?Math.max(8,kmNow*0.7):Math.max(diBo?6:8,kmNow);
  W0=Math.min(W0,dinh);
  const coBan=Math.max(quayLai?4:2,Math.round(M*0.4)),caoDiem=M>=10?3:M>=6?2:M>=3?1:0;
  const tuan=[];let nen=W0,daiTruoc=Math.max(daiNow,W0*0.3),dem={};
  for(let i=0;i<N;i++){
    const sau=i>=M,ix=i-M;
    let pha=sau?'giam':i<coBan?'nen':i>=M-caoDiem?'cao':'tang';
    let deload=!sau&&i>0&&(i+1)%4===0&&i<M-1;
    let km;
    if(sau){
      const f=giam===1?[0.65]:giam===2?[0.78,0.55]:[0.85,0.68,0.5];
      km=Math.max(...tuan.map(t=>t.kmMucTieu),W0)*f[ix];
    }else if(i===0)km=W0;
    else if(deload)km=nen*0.78;
    else{nen=Math.min(dinh,nen*tocDo);km=nen}
    if(!ngayDua&&i===N-1&&!sau){pha='kiem';km=nen*0.8;deload=true}
    /* Hệ số người dùng tự chỉnh cho tuần này (ví dụ ốm, bận). */
    const start=addD(bd,i*7),adj=(p.chinh&&p.chinh[start])||1;km*=adj;
    if(adj<1&&!sau&&!deload)nen=Math.min(nen,km);

    /* Số buổi nặng */
    let q=0;
    if(pha==='tang'||pha==='cao')q=(chay.length>=4&&!moi&&!quayLai&&(thanhTich||nam>=1))?2:1;
    else if(pha==='nen')q=(!quayLai&&!diBo&&i>=2&&chay.length>=3)?1:0;
    else if(pha==='giam')q=(ix<giam-1)?1:0;
    if(deload&&pha!=='kiem')q=Math.min(q,moi?0:1);
    if(quayLai&&i<4)q=0;
    if(diBo)q=Math.min(q,i<6?0:1);
    if(ct==='dang-dau')q=0;
    if(adj<1)q=adj<=0.7?0:Math.min(q,1);
    if(chay.length<3)q=Math.min(q,1);
    const nang=chonNang(chay,L,q);

    /* Chạy dài */
    let dai;
    const tyLe=km<30?0.4:(X.D>=40?0.4:X.D>=21?0.35:0.32),trBuoi=X.trail?1.15:1;
    dai=Math.min(X.daiMax,km*tyLe,daiTruoc+2);
    if(pc){const cap=X.gioDaiMax*60*60/(pc.nhe[1]*trBuoi);dai=Math.min(dai,cap)}
    if(deload)dai=Math.min(dai,daiTruoc*0.8);
    dai=Math.max(dai,Math.min(km*0.3,3));
    if(!deload&&!sau)daiTruoc=Math.max(daiTruoc,dai);

    const tuanObj={i,start,pha,deload,adj,kmMucTieu:km,days:[]};
    const isRace=ngayDua&&i===N-1;
    const ngayDuaThu=isRace?thu(ngayDua):-1;

    /* Phân bố ngày */
    const plan=[];
    for(let d=0;d<7;d++){
      const date=addD(start,d);
      let o={date,thu:d,loai:'nghi'};
      if(isRace&&d===ngayDuaThu){o={date,thu:d,loai:'thi'}}
      else if(isRace&&d===ngayDuaThu-1){o={date,thu:d,loai:'nghi',truocThi:1}}
      else if(isRace&&d>ngayDuaThu){o={date,thu:d,loai:'nghi',sauThi:1}}
      else if(chay.includes(d)){
        if(d===L&&!isRace)o.loai=pha==='kiem'?'kiem':'dai';
        else if(nang.includes(d)&&!isRace)o.loai='nang';
        else if(d===(L+1)%7&&!isRace)o.loai='hoiphuc';
        else o.loai='nhe';
      }
      plan.push(o);
    }
    /* Trail dài từ 30 km: chạy dài hai ngày liền ở giai đoạn tăng cường/cao điểm. */
    if(X.trail&&X.D>=30&&(pha==='tang'||pha==='cao')&&!deload){const t=plan[(L+6)%7];if(t.loai==='nhe')t.loai='dai2'}
    /* Tuần thi: 2–3 buổi nhẹ ngắn, buổi gần nhất có strides. */
    if(isRace){
      const runs=plan.filter(x=>x.loai!=='thi'&&chay.includes(x.thu)&&x.thu<ngayDuaThu&&!x.truocThi);
      runs.forEach(x=>x.loai='nhe');
    }

    /* Km từng buổi */
    const nNang=plan.filter(x=>x.loai==='nang').length;
    const baiNang=plan.filter(x=>x.loai==='nang').map((x,j)=>{
      const ds=X.trail?DS_BAI.trail:DS_BAI.road[X.D<=5?5:X.D<=10?10:X.D<=21.1?21:42];
      let ten=moi&&!X.trail?(j===0?'fartlek':'doc'):ds[(i+j)%ds.length];
      if(pha==='nen')ten=X.trail?'leo':'doc';
      if(pha==='giam'&&!X.trail)ten=X.D<=10?'bien':'tempo';
      const k=dem[ten]||0;dem[ten]=k+(deload||pha==='giam'?0:1);
      const b=BAI[ten](pha==='giam'?Math.max(0,k-2):k,p);
      const ePace=pc?pc.nhe[1]:420;
      const kmChinh=b.km||(b.phut*60/((pc&&b.pace&&pc[b.pace])||ePace*0.85)+(b.nghi||0)*60/ePace);
      const kd=Math.min(4,25*60/ePace,Math.max(1.5,km*0.2));             /* khởi động 15 phút + thả lỏng 10 phút */
      x.bai={...b,ma:ten,kd};x.km=kd+kmChinh;
      return x;
    });
    const kmNang=baiNang.reduce((a,x)=>a+x.km,0);
    const dai2=plan.find(x=>x.loai==='dai2');
    if(dai2)dai2.km=dai*0.55;
    let du=km-(isRace?0:dai)-kmNang-(dai2?dai2.km:0);
    const nhe=plan.filter(x=>x.loai==='nhe'||x.loai==='hoiphuc');
    const w=nhe.reduce((a,x)=>a+(x.loai==='hoiphuc'?0.7:1),0);
    const tran=X.trail?Math.max(8,dai*0.6):Math.max(8,dai*0.75);
    nhe.forEach(x=>{x.km=clamp(w?du*(x.loai==='hoiphuc'?0.7:1)/w:0,diBo?2:3,tran)});
    if(isRace)nhe.forEach(x=>x.km=clamp(Math.min(x.km,X.D<=10?5:7),3,7));
    plan.forEach(x=>{if(x.loai==='dai'||x.loai==='kiem')x.km=x.loai==='kiem'?(X.trail?6:5):dai;if(x.loai==='thi')x.km=X.D});

    /* Strides: một buổi nhẹ mỗi tuần (không ở tuần đầu chạy lại, không ở ngày hồi phục). */
    if(!diBo&&!(quayLai&&i<3)&&i>=1){const s=plan.filter(x=>x.loai==='nhe');const pick=s.find(x=>!nang.includes((x.thu+1)%7)&&x.thu!==(L+6)%7)||s[0];if(pick&&!(nNang>=2&&pha!=='nen'))pick.strides=1;
      if(isRace){const last=plan.filter(x=>x.loai==='nhe').pop();plan.forEach(x=>delete x.strides);if(last)last.strides=1}}

    /* Trail: phân bổ số mét leo */
    /* Road + chạy dài trên trail cuối tuần (người chạy cả hai loại) */
    if(!X.trail&&p.ketHop){
      const pf={nen:.6,tang:.85,cao:1,giam:.6,kiem:.6}[pha]*(deload?.7:1),ratio=p.doc==='nhieu'?35:p.doc==='it'?20:10;
      plan.forEach(x=>{if(x.loai==='dai'){x.dh='trail';x.leo=Math.round(x.km*ratio*pf/10)*10}});
    }
    if(X.trail){
      const ratio=X.D?X.dPlus/X.D:0,pf={nen:.5,tang:.8,cao:1,giam:.5,kiem:.5}[pha]*(deload?.7:1);
      plan.forEach(x=>{
        if(x.loai==='dai'||x.loai==='dai2')x.leo=Math.round(x.km*ratio*pf/10)*10;
        else if(x.loai==='nang'&&x.bai&&x.bai.leo)x.leo=Math.round((x.bai.phut||20)*8*Math.min(1,ratio/40+0.4)/10)*10;
        else if(x.loai==='thi')x.leo=X.dPlus;
      });
      /* Xuống dốc: từ giai đoạn tăng cường, 1 buổi nhẹ có đoạn chạy xuống dốc. */
      if(pha==='tang'||pha==='cao'){const s=plan.find(x=>x.loai==='nhe'&&!x.strides);if(s)s.xuong=1}
    }

    /* Bổ trợ: 2 buổi sức mạnh vào ngày không chạy (không phải ngày trước chạy dài/bài nặng), core 1 buổi. */
    const sm=plan.filter(x=>x.loai==='nghi'&&!x.sauThi&&!x.truocThi&&!(plan[(x.thu+1)%7].loai==='dai'||plan[(x.thu+1)%7].loai==='nang'||plan[(x.thu+1)%7].loai==='thi'||plan[(x.thu+1)%7].loai==='kiem'));
    const nghiThat=plan.filter(x=>x.loai==='nghi').length;
    let soSM=isRace?0:(pha==='giam'?1:2);
    const smDays=[];
    for(const x of sm){if(smDays.length>=soSM)break;if(nghiThat-smDays.length<=1&&chay.length<6)break;if(smDays.some(y=>kc(y.thu,x.thu)<2))continue;smDays.push(x)}
    smDays.forEach(x=>{x.loai='suc';});
    if(smDays.length<soSM){const e=plan.filter(x=>x.loai==='nhe').filter(x=>plan[(x.thu+1)%7].loai!=='dai'&&plan[(x.thu+1)%7].loai!=='nang');
      for(const x of e){if(smDays.length>=soSM)break;if(smDays.some(y=>kc(y.thu,x.thu)<2))continue;x.sucSau=1;smDays.push(x)}}
    const coreDay=plan.find(x=>(x.loai==='nhe'||x.loai==='hoiphuc')&&!x.sucSau);if(coreDay&&!isRace)coreDay.core=1;

    /* Mô tả từng ngày */
    const giaiDoanSM=(quayLai&&i<4)||i<3?'kt':p.ta?'ta':'kt';
    plan.forEach(x=>moTa(x,{X,Z,pc,hr,pha,deload,diBo,i,giaiDoanSM,isRace,p,N,mt}));
    tuanObj.days=plan;
    tuanObj.km=plan.reduce((a,x)=>a+(x.km||0),0);
    tuanObj.leo=plan.reduce((a,x)=>a+(x.leo||0),0);
    tuanObj.phut=plan.reduce((a,x)=>a+(x.phut||0),0);
    tuanObj.ghiChu=ghiChuTuan(tuanObj,{X,isRace,N,pha,deload,diBo});
    tuan.push(tuanObj);
  }
  return {mt,batDau:bd,ketThuc:addD(bd,N*7-1),ngayDua,N,tuan,vung:Z,canhBao,X,dinh:Math.round(dinh),ngayChay:chay,ngayDai:L};
}

const TEN_PHA={nen:'Nền sức bền',tang:'Tăng cường',cao:'Cao điểm',giam:'Giảm tải trước giải',kiem:'Kiểm tra'};
function ghiChuTuan(t,c){
  if(c.isRace)return 'Tuần thi. Chạy ít, ngủ đủ, ăn quen. Không thử giày, đồ ăn hay đồ uống mới.';
  if(t.pha==='kiem')return 'Tuần cuối: giảm tải và chạy kiểm tra để so với lúc bắt đầu. Sau đó tạo lịch mới với mục tiêu tiếp theo.';
  if(t.adj<1)return `Tuần này bạn đã giảm còn ${Math.round(t.adj*100)}% khối lượng.`;
  if(t.deload)return 'Tuần giảm tải: khối lượng thấp hơn khoảng 20% để cơ thể hấp thụ các tuần trước.';
  if(t.pha==='nen')return c.diBo?'Xây nền: chạy xen đi bộ, tăng dần thời gian chạy. Chưa cần chạy nhanh.':'Xây nền: hầu hết chạy nhẹ ở vùng 2, tăng dần khối lượng.';
  if(t.pha==='tang')return c.X.trail?'Tăng cường: thêm bài leo dốc và tăng số mét leo mỗi tuần.':'Tăng cường: thêm bài chạy nhanh, chạy dài dài dần.';
  if(t.pha==='cao')return 'Cao điểm: khối lượng lớn nhất. Ưu tiên ngủ và ăn đủ.';
  return 'Giảm tải trước giải: bớt khối lượng, giữ một chút tốc độ để chân không bị ì.';
}

function moTa(x,c){
  const {X,pc,hr,diBo,i}=c,ep=pc?pc.nhe:null,eMid=ep?(ep[0]+ep[1])/2:450,tf0=1.15;
  /* Trail: mỗi 100 m leo tính như thêm 1 km đường bằng ("km-effort"). */
  const tg=(km,pace)=>(km+(x.leo||0)/100)*(pace||eMid)*(x.dh==='trail'?tf0:1)/60;
  const nhip=a=>a?`${a[0]}–${a[1]}`:'';
  const chayDi=['1 phút chạy / 1 phút đi bộ','2 phút chạy / 1 phút đi bộ','3 phút chạy / 1 phút đi bộ','4 phút chạy / 1 phút đi bộ','5 phút chạy / 1 phút đi bộ','8 phút chạy / 1 phút đi bộ'][Math.min(i,5)];
  x.km=x.km?r05(x.km):0;
  if(!x.dh)x.dh=X.trail&&(x.loai==='dai'||x.loai==='dai2'||x.loai==='thi'||(x.loai==='nang'&&x.bai&&x.bai.leo)||x.xuong)?'trail':'road';
  const trl=x.dh==='trail';
  x.bt={};
  switch(x.loai){
    case 'nhe':case 'hoiphuc':{
      const hp=x.loai==='hoiphuc';
      x.ten=(hp?'Chạy hồi phục ':'Chạy nhẹ ')+fmtKm(x.km)+' km';
      x.hr=hp?hr.hoiPhuc:hr.nhe;x.pace=ep&&!trl?[ep[0]+(hp?20:0),ep[1]+(hp?30:0)]:null;
      x.phut=tg(x.km,hp?eMid+20:eMid);
      x.buoc=[(diBo&&i<6?`Xen kẽ ${chayDi}. `:'')+(hp?'Chậm nhất tuần, cho chân hồi lại sau chạy dài.':'Chạy đều, nói chuyện được cả câu. Km đầu chậm nhất buổi.')];
      if(x.strides)x.buoc.push('Cuối buổi: 4–6 lần tăng tốc 20 giây (strides) lên khoảng 85% sức, đi bộ 1 phút giữa các lần.');
      if(x.xuong)x.buoc.push('Có đoạn dốc: thêm 5–6 lần chạy xuống dốc thoải 1 phút, bước ngắn và nhanh, chân đặt dưới người. Tập cho đùi trước quen xuống dốc.');
      x.bt={kd:1,gc:1};break;
    }
    case 'dai':case 'dai2':{
      const d2=x.loai==='dai2';
      x.ten=(trl?(d2?'Trail vừa ':'Chạy dài trail '):(d2?'Chạy vừa ':'Chạy dài '))+fmtKm(x.km)+' km'+(x.leo?` · ${x.leo} m leo`:'');
      x.hr=hr.dai;x.pace=ep&&!trl?[ep[0],ep[1]+15]:null;x.phut=tg(x.km);
      x.buoc=[trl?'Tính theo thời gian, không theo pace. Lên dốc gắt thì đi bộ nhanh, giữ nhịp tim dưới '+hr.tran+'. Xuống dốc thả lỏng, bước ngắn.':'Chạy đều ở vùng 2. Nửa sau tim hay vượt '+hr.tran+' thì chạy chậm lại hoặc đi bộ 1 phút.'];
      if(d2)x.buoc.push('Hôm sau chạy dài: tập chạy khi chân đã mỏi, giống nửa sau của giải.');
      /* Chạy dài có đoạn pace thi (21/42 km, giai đoạn tăng cường trở đi, tuần không giảm tải) */
      if(!trl&&X.D>=21&&(c.pha==='tang'||c.pha==='cao')&&!c.deload&&pc&&c.p.muc.mucTieu==='thanh-tich'&&i%2===1){
        const kmP=Math.min(Math.round(x.km*0.35),X.D>=42?12:6),P=c.mt?c.mt.paceThi:(X.D>=42?pc.M:pc.HM);
        x.buoc.push(`${kmP} km cuối chạy ở pace mục tiêu ${fmtP(P)}/km.`);
      }
      if(x.phut>75)x.buoc.push('Mang nước. Từ phút 60 trở đi ăn 30–60 g tinh bột mỗi giờ (gel, chuối, bánh), để tập cho bụng quen như ngày thi.');
      x.bt={kd:1,gc:1};break;
    }
    case 'nang':{
      const b=x.bai;x.ten=b.ten;
      x.hr=b.hr?hr[b.hr]:null;x.pace=pc&&b.pace?[pc[b.pace]-3,pc[b.pace]+3]:null;
      x.phut=(b.phut||b.km*(pc&&b.pace?pc[b.pace]:eMid*0.85)/60)+(b.nghi||0)+b.kd*eMid/60+(x.leo||0)/10;
      x.buoc=['Khởi động: 15 phút chạy nhẹ và các bài khởi động bên dưới.',b.chinh+'.',b.mo,'Thả lỏng: 10 phút chạy rất chậm.'];
      x.bt={kd:1,gc:1};break;
    }
    case 'kiem':{
      x.ten=X.trail?'Kiểm tra: 30 phút trên đường quen':'Chạy kiểm tra 5 km';
      x.hr=null;x.pace=null;x.phut=X.trail?45:40;
      x.buoc=X.trail?['Khởi động 10 phút.','Chạy 30 phút trên cùng cung đường, giữ nhịp tim '+nhip(hr.nhe)+'. Ghi lại quãng đường để so lần sau: đi được xa hơn ở cùng nhịp tim là thể lực đã lên.']
        :['Khởi động 15 phút và vài lần tăng tốc ngắn.','Chạy 5 km hết sức đều tay. Ghi lại thời gian vào hồ sơ để lịch sau tính pace chính xác hơn.'];
      x.bt={kd:1,gc:1};break;
    }
    case 'thi':{
      x.ten=(X.trail?'Ngày thi trail ':'Ngày thi ')+fmtKm(X.D)+' km'+(X.dPlus?` · ${X.dPlus} m leo`:'');
      x.phut=null;
      const du0=c.Z.du&&!X.trail?c.Z.du.find(d=>Math.abs(d[0]-X.D)<0.6):null,du=c.mt&&!c.mt.kho?[X.D,c.mt.T]:du0;
      x.buoc=X.trail?['Đi bộ các dốc gắt ngay từ đầu, giữ sức cho nửa sau.','Ăn 40–60 g tinh bột mỗi giờ, uống theo cảm giác khát và có điện giải.','Xuống dốc thả lỏng, mắt nhìn 3–4 m phía trước.']
        :[du?`Thể lực hiện tại dự đoán khoảng ${fmtT(du[1])} (${fmtP(du[1]*60/X.D)}/km). Km đầu chậm hơn pace này 5–10 giây.`:'Km đầu chậm hơn dự định, tăng dần.',X.D>=21?'Ăn gel hoặc tinh bột mỗi 30–40 phút từ phút 40, uống ở các trạm.':'Khởi động 10–15 phút trước giờ xuất phát.','Nửa sau còn sức thì mới tăng tốc.'];
      x.bt={};break;
    }
    case 'suc':{
      x.ten='Sức mạnh và core';x.phut=c.giaiDoanSM==='ta'?40:30;
      x.buoc=[X.trail?'Bài chân một bên, bước xuống bậc, cổ chân: giúp leo dốc khoẻ và xuống dốc không đau gối.':'Bài chân và mông giúp chạy khoẻ, ít chấn thương.','Hết hiệp vẫn còn làm thêm được 2–3 lần là mức vừa.'];
      x.bt={sm:X.trail?'trail':c.giaiDoanSM};break;
    }
    default:{
      x.ten=x.sauThi?'Nghỉ sau giải':x.truocThi?'Nghỉ trước giải':'Nghỉ';x.phut=0;
      x.buoc=[x.truocThi?'Nghỉ hoặc đi bộ nhẹ 20 phút. Chuẩn bị đồ, ngủ sớm.':x.sauThi?'Đi bộ nhẹ. Vài ngày sau giải chỉ chạy nhẹ nếu thấy khoẻ.':'Nghỉ hoàn toàn hoặc đi bộ nhẹ. Ngủ đủ 7–8 tiếng.'];
    }
  }
  if(x.sucSau){x.bt.sm=X.trail?'trail':c.giaiDoanSM;x.buoc.push('Sau buổi chạy: tập sức mạnh (bài bên dưới).')}
  if(x.core)x.bt.core=1;
  if(x.phut)x.phut=Math.round(x.phut/5)*5;
}

/* Kế hoạch ngày thi: thời gian dự kiến, chia pace từng đoạn, ăn uống theo giờ. */
function keHoachThi(P){
  const X=P.X,pc=P.vung.pace,mt=P.mt;let T=null,khoang=null;const doan=[];
  if(!X.trail){
    const paceThi=mt?mt.paceThi:(pc?thoiGianDua(pc.V,X.D)*60/X.D:null);
    if(paceThi){
      T=paceThi*X.D/60;
      const ps=d=>fmtP(paceThi+d);
      const D=X.D;
      if(D<=5)doan.push(['Km 1',ps(3)+'/km','Chậm hơn pace thi một chút, đừng lao theo đám đông'],['Km 2–4',ps(0)+'/km','Đều'],['Km cuối',ps(-5)+' hoặc nhanh hơn','Còn sức thì tăng dần']);
      else if(D<=10)doan.push(['Km 1–2',ps(5)+'/km','Khởi đầu chậm'],['Km 3–8',ps(0)+'/km','Đều, giữ nhịp thở'],['Km 9–10',ps(-5)+' hoặc nhanh hơn','Tăng dần nếu còn sức']);
      else if(D<=21.1)doan.push(['Km 1–3',ps(8)+'/km','Chậm hơn 5–10 giây'],['Km 4–15',ps(0)+'/km','Đều'],['Km 16–21',ps(-3)+'/km','Giữ hoặc tăng nhẹ']);
      else doan.push(['Km 1–5',ps(8)+'/km','Chậm hơn 5–10 giây, cảm giác rất dễ'],['Km 6–30',ps(0)+'/km','Đều, ăn uống đúng giờ'],['Km 31–42',ps(0)+'/km','Giữ pace; đây là đoạn khó nhất']);
    }
  }else{
    const ek=X.D+X.dPlus/100;
    const base=pc?thoiGianDua(pc.V,ek)*60/ek:(pc===null?null:null);
    const e=base||(P.vung.pace?P.vung.pace.nhe[0]:null);
    if(e){khoang=[ek*e*1.1/60,ek*e*1.35/60];T=(khoang[0]+khoang[1])/2}
    doan.push(['Lên dốc','Đi bộ nhanh khi dốc gắt','Giữ nhịp tim dưới '+P.vung.hr.tran+' trong 1–2 giờ đầu'],['Đường bằng, xuống dốc','Chạy thả lỏng','Bước ngắn, mắt nhìn 3–4 m phía trước'],['Nửa sau','Đều sức','Còn sức thì mới tăng']);
  }
  /* ăn uống theo thời gian dự kiến */
  const t=T||(X.trail?X.D*12:X.D*7);
  const an=[];let gel=[];
  if(t<75)an.push('Không cần gel. Uống vài ngụm nước ở trạm nếu trời nóng.');
  else{
    const g=t>150?'60–90':'30–60';
    an.push(`Tinh bột: ${g} g mỗi giờ (1 gói gel khoảng 20–25 g). Bắt đầu từ phút 40, đừng đợi đói.`);
    an.push(`Nước: 400–800 ml mỗi giờ tuỳ trời; trời nóng ẩm thì về mức cao.`);
    if(t>=90)an.push('Điện giải (muối): 300–600 mg natri mỗi giờ, nhất là khi ra nhiều mồ hôi.');
    const buoc=t>150?25:35;for(let m=40;m<t-15;m+=buoc)gel.push(m);
  }
  an.push('Tối hôm trước và sáng ngày thi ăn món quen, nhiều tinh bột, ít xơ và dầu mỡ. Ăn sáng trước giờ xuất phát 2–3 tiếng.');
  if(X.trail)an.push('Mang đủ đồ bắt buộc theo quy định giải (đèn, áo gió, còi, bình nước). Tập chạy với balo và đồ ăn này trong các buổi chạy dài.');
  return {T,khoang,doan,an,gel};
}

G.LichChay={keHoachThi,taoLich,vung,uocVdot,thongSo,TEN_PHA,fmtP,fmtT,fmtKm,addD,ymd,parse,thu,soNgay,vdot,thoiGianDua};
})(typeof window!=='undefined'?window:globalThis);
