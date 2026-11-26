/* Ứng dụng Lịch chạy cá nhân.
   Dữ liệu (S): hs = hồ sơ, log = ghi chép theo ngày, done = ô đánh dấu. Lịch không lưu, luôn tạo lại từ hồ sơ (lich.js).
   Lưu ở localStorage; đăng nhập Google thì đồng bộ lên Firestore runners/<uid>, chỉ chủ tài khoản đọc/ghi được. */
(function(){
'use strict';
const LC=window.LichChay,BT=window.BaiTap;
const K='lich-ca-nhan-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const TODAY=LC.ymd(new Date());
const DOW=['T2','T3','T4','T5','T6','T7','CN'],DOWF=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const dm=s=>(+s.slice(8,10))+'/'+(+s.slice(5,7));
const dmy=s=>dm(s)+'/'+s.slice(0,4);
const trong=()=>({hs:null,log:{},done:{},sang:{},giay:[]});

let S;
try{S=JSON.parse(localStorage.getItem(K))||trong()}catch(e){S=trong()}
S.log=S.log||{};S.done=S.done||{};S.sang=S.sang||{};S.giay=S.giay||[];
let user=null,syncSt='';
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}if(SYNC)SYNC.changed()};
const SYNC=window.DongBo?DongBo.start({key:'tap',col:'runners',rieng:true,trong,get:()=>S,local:['anim'],
  apply:d=>{const a=S.anim;S={...trong(),...d};if(a!==undefined)S.anim=a;try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}PLAN=null;render()},
  onAuth:u=>{user=u;acct();dnUpd();if(location.hash==='#/du-lieu')render()},
  onState:s=>{syncSt=s;acct();dnUpd()}}):null;
function dnUpd(){const e=document.getElementById('dnhint');if(e)e.innerHTML=dnHint()}

/* ---------- Lịch (tạo lại khi hồ sơ đổi) ---------- */
let PLAN=null,PLANKEY='',CUR=TODAY;
const taoTu=(hs,chinh)=>LC.taoLich({...norm(hs),chinh},hs.ngayTao||S.hs.ngayTao||TODAY);
/* Sửa hồ sơ giữa chừng: các tuần trước lần sửa giữ theo hồ sơ cũ (S.hs.cu), không bị tính lại. */
function ghep(P,chinh){
  const cu=(S.hs.cu||[]).slice().sort((a,b)=>a.den<b.den?-1:1);
  if(!cu.length)return P;
  const old=cu.map(c=>({den:c.den,P:taoTu(c.hs,chinh)}));
  P.tuan=P.tuan.map((t,i)=>{const c=old.find(o=>t.start<o.den);if(!c)return t;const ot=c.P.tuan[i];return ot&&ot.start===t.start?{...ot,i}:t});
  return P;
}
function chiMuc(P){P.days=P.tuan.flatMap(t=>t.days.map(d=>Object.assign(d,{w:t.i})));P.byId=Object.fromEntries(P.days.map(d=>[d.date,d]));return P}
function plan(){
  if(!S.hs)return null;
  const k=JSON.stringify([S.hs,S.log,S.sang,TODAY]);
  if(PLAN&&k===PLANKEY)return PLAN;
  const man=S.hs.chinh||{};
  let P=chiMuc(ghep(taoTu(S.hs,man),man));
  const auto=tuDieuChinh(P);
  if(Object.keys(auto).length){const ch={...man};for(const[st,a]of Object.entries(auto))if(!(st in man))ch[st]=a.f;P=chiMuc(ghep(taoTu(S.hs,ch),ch))}
  P.auto=auto;
  /* Các khối tập đã xong (tập nhiều năm): giữ để tra loại buổi của ngày cũ */
  P.khoiCu=(S.hs.khoi||[]).map(x=>{const Q=chiMuc(taoTu(x.hs,x.hs.chinh||{}));Q.ten=x.ten;Q.loai=x.loai;return Q});
  PLAN=P;PLANKEY=k;return P;
}
/* Tự điều chỉnh: dấu hiệu xấu trong một tuần (đau, tim cao, quá sức, bỏ nhiều buổi, sáng chưa hồi phục) → tuần sau giảm.
   Người dùng bấm "Giữ nguyên" thì thôi (S.hs.chinh[tuần] = 1). */
function tuDieuChinh(P){
  const out={};
  for(const t of P.tuan){
    const nx=P.tuan[t.i+1];if(!nx||nx.days.some(x=>x.loai==='thi'))continue;
    const runs=t.days.filter(x=>x.km&&x.loai!=='suc'&&x.loai!=='thi');
    const logs=runs.map(x=>[x,S.log[x.date]||{}]),ez=logs.filter(([x])=>EZ.includes(x.loai));
    const ly=[];let f=1;const lo=(v,t)=>{f=Math.min(f,v);ly.push(t)};
    const dau=Math.max(0,...t.days.map(x=>num(S.log[x.date]||{},'dau')||0));
    if(dau>=4)lo(0.6,`có buổi đau ${dau}/10`);else if(dau>=2)lo(0.85,`có buổi đau nhẹ ${dau}/10`);
    const cao=ez.filter(([x,L])=>num(L,'hr')&&x.hr&&num(L,'hr')>x.hr[1]+2).length;if(cao>=2)lo(0.85,`${cao} buổi nhẹ tim cao hơn vùng`);
    const met=ez.filter(([,L])=>(num(L,'rpe')||0)>=7).length;if(met>=2)lo(0.85,`${met} buổi nhẹ thấy quá sức`);
    const troi=ez.filter(([x,L])=>L.troi>8&&dhOf(x)==='road').length;if(troi>=2)lo(0.9,`${troi} buổi tim trôi cao`);
    const sx=t.days.filter(x=>sangKQ(x.date)[0]==='bad').length;if(sx>=2)lo(0.85,`${sx} buổi sáng cơ thể chưa hồi phục`);
    if(LC.addD(t.start,6)<TODAY){const ghi=runs.filter(x=>daChay(x)||num(S.log[x.date]||{},'km')).length;if(ghi>0&&ghi/runs.length<0.5)lo(0.85,`chỉ chạy ${ghi}/${runs.length} buổi`)}
    if(f<1&&!(nx.deload&&f>0.78))out[nx.start]={f,ly,tu:t.i};
  }
  return out;
}
/* Hồ sơ trong form (chuỗi) → số cho bộ tạo lịch */
const tgPhut=s=>{if(!s)return 0;const p=String(s).trim().split(/[:.']/).map(Number);if(p.some(isNaN))return 0;return p.length===3?p[0]*60+p[1]+p[2]/60:p.length===2?p[0]+p[1]/60:p[0]};
const paceGiay=s=>{if(!s)return 0;const m=String(s).trim().match(/^(\d{1,2})\s*[:.'’]\s*(\d{1,2})$/);return m?+m[1]*60+ +m[2]:0};
function norm(h){
  const n=x=>x===''||x==null?'':+x;
  return {tuoi:n(h.tuoi),hrNghi:n(h.hrNghi),hrMax:n(h.hrMax),hrNguong:n(h.hrNguong),
    muc:{loai:h.muc.loai,km:+h.muc.km||10,dPlus:+h.muc.dPlus||0,ngay:h.muc.coNgay?h.muc.ngay:'',soTuan:+h.muc.soTuan||12,mucTieu:h.muc.mucTieu,tgMucTieu:h.muc.mucTieu==='thanh-tich'?tgPhut(h.muc.tgMucTieu):0},
    hienTai:{kmTuan:+h.hienTai.kmTuan||0,dai:+h.hienTai.dai||0,nam:+h.hienTai.nam||0},
    thanhTich:h.tt&&h.tt.tg?{km:+h.tt.km,phut:tgPhut(h.tt.tg)}:null,paceNhe:paceGiay(h.paceNhe),
    chanThuong:h.chanThuong,ngayRanh:h.ngayRanh,soBuoi:+h.soBuoi,ngayDai:+h.ngayDai,doc:h.doc,ta:!!h.ta,ketHop:h.muc.loai==='road'&&!!h.ketHop,kmMin:+h.kmMin||3,tienDo:h.tienDo||'',ngayBoi:h.ngayBoi===''||h.ngayBoi==null?'':+h.ngayBoi,dinhMoi:+h.dinhMoi||0,chinh:h.chinh||{}};
}
const MAU=()=>({ten:'',tuoi:'',hrNghi:'',hrMax:'',muc:{loai:'road',km:10,dPlus:'',coNgay:false,ngay:'',soTuan:12,mucTieu:'hoan-thanh'},
  hienTai:{kmTuan:'',dai:'',nam:1},tt:{km:5,tg:''},paceNhe:'',chanThuong:'khong',ngayRanh:[1,3,5,6],soBuoi:4,kmMin:3,tienDo:'',ngayBoi:'',ngayDai:6,doc:'it',ta:false,chinh:{},lienTuc:true,daiHan:{km:10,tg:''}});
const VIDU=()=>({...MAU(),daiHan:{km:21.1,tg:'1:59:00'},tuoi:34,hrNghi:58,hrMax:'',muc:{loai:'road',km:21.1,dPlus:'',coNgay:false,ngay:'',soTuan:14,mucTieu:'hoan-thanh'},hienTai:{kmTuan:20,dai:10,nam:1},tt:{km:5,tg:'29:30'}});

/* ---------- Tài khoản ---------- */
function acct(){
  const el=$('#acct');if(!el)return;
  if(!SYNC||!window.FIREBASE_CONFIG){el.innerHTML='<span class="st">Lưu trên máy này</span>';return}
  const lab={loading:'Đang kết nối…',saving:'Đang lưu…',ok:'Đã lưu lên tài khoản',slow:'Chưa kết nối được, đang lưu trên máy',err:'Lỗi đồng bộ',denied:'Máy chủ chưa cho phép lưu',nolib:'Không tải được thư viện đăng nhập'}[syncSt]||'';
  el.innerHTML=user?`<span class="st" title="${esc(user.email)}">${esc(lab)}</span><button class="hb" data-a="out" type="button">Đăng xuất</button>`
    :`<span class="st">${syncSt==='nolib'?esc(lab):'Chưa đăng nhập, chỉ lưu trên máy này'}</span><button class="hb solid" data-a="in" type="button">Đăng nhập Google</button>`;
}

/* ---------- Khung ---------- */
const TABS=[['#/','Hôm nay'],['#/lich','Cả lịch'],['#/nhat-ky','Nhật ký'],['#/lo-trinh','Lộ trình'],['#/vung','Vùng tập'],['#/ho-so','Hồ sơ']];
function route(){const h=location.hash||'#/';const m=h.match(/^#\/(ngay|ghi)\/(\d{4}-\d{2}-\d{2})$/);return m?{v:m[1],d:m[2]}:{v:{'#/':'ngay','#/lich':'lich','#/nhat-ky':'nhat-ky','#/lo-trinh':'lo-trinh','#/vung':'vung','#/ho-so':'ho-so','#/du-lieu':'du-lieu','#/huong-dan':'huong-dan'}[h]||'ngay'}}
function render(){
  if(S.hs)tuNoi();
  const r=route(),P=plan();
  const cur=r.v==='ngay'?'#/':'#/'+({lich:'lich',vung:'vung','ho-so':'ho-so','du-lieu':'ho-so',ghi:'nhat-ky','nhat-ky':'nhat-ky','lo-trinh':'lo-trinh','huong-dan':'huong-dan'}[r.v]);
  $('#tabs').innerHTML=TABS.map(([h,t])=>`<a href="${h}"${h===cur?' aria-current="page"':''}>${t}</a>`).join('');
  let h;
  if(r.v==='du-lieu')h=vDuLieu();
  else if(r.v==='huong-dan')h=vHuongDan();
  else if(!P||r.v==='ho-so')h=vHoSo(!P);
  else if(r.v==='nhat-ky')h=vNhatKy(P);
  else if(r.v==='lo-trinh')h=vLoTrinh(P);
  else if(r.v==='ghi')h=vGhi(P,r.d);
  else if(r.v==='lich')h=vLich(P);
  else if(r.v==='vung')h=vVung(P);
  else h=vNgay(P,r.d);
  $('#view').innerHTML=h;
  if(r.v==='ho-so'||!P)xemTruoc();
  prog();
}

/* ---------- Ngày ---------- */
/* Tên ngắn của bài nặng trong danh sách tuần: "Chạy biến tốc (interval)" → "Interval", "Chạy ngưỡng (tempo)" → "Ngưỡng (tempo)" */
const tenNgan=t=>/\(interval\)/.test(t)?'Interval':t.replace(/^Chạy /,'').replace(/^./,c=>c.toUpperCase());
const tagOf=d=>(d.dh==='trail'&&(d.loai==='dai'||d.loai==='dai2'))?'Trail':d.boi&&d.loai==='nghi'?'Bơi':d.boi&&d.loai==='suc'?'Sức mạnh + bơi':TAG[d.loai];
const TAG={nghi:'Nghỉ',nhe:'Nhẹ',hoiphuc:'Hồi phục',dai:'Dài',dai2:'Vừa',nang:'Nặng',suc:'Sức mạnh',thi:'Thi',kiem:'Kiểm tra'};
const CLR={nghi:'var(--line)',nhe:'var(--z2)',hoiphuc:'var(--z1)',dai:'var(--z3)',dai2:'var(--z3)',nang:'var(--z4)',suc:'var(--mut)',thi:'var(--z5)',kiem:'var(--z5)'};
const daChay=d=>!!(S.done[d.date+':run']||[])[0];
function strip(P,w,sel){
  const t=P.tuan[w];
  return `<div class="wkbar"><button class="nv" data-go="${w>0?P.tuan[w-1].start:''}" aria-label="Tuần trước"${w===0?' disabled':''}>‹</button>
    <span class="t">Tuần ${w+1}/${P.N} · ${dm(t.start)}–${dm(LC.addD(t.start,6))} · ${LC.fmtKm(t.km)} km${t.leo?' · '+t.leo+' m leo':''}</span>
    <button class="nv" data-go="${w<P.N-1?P.tuan[w+1].start:''}" aria-label="Tuần sau"${w===P.N-1?' disabled':''}>›</button>
    ${P.byId[TODAY]&&P.byId[TODAY].w!==w?'<button class="nv td" data-go="'+TODAY+'">Hôm nay</button>':''}</div>
  <div class="strip">${t.days.map(d=>`<button class="day" data-go="${d.date}" aria-pressed="${d.date===sel}" style="--c:${CLR[d.loai]}" aria-label="${DOWF[d.thu]} ${dm(d.date)}: ${esc(d.ten)}">${d.date===TODAY?'<span class="tdot"></span>':''}${d.km&&daChay(d)?'<span class="ck">✓</span>':''}<b>${DOW[d.thu]}</b><span class="dn">${+d.date.slice(8)}</span><i>${tagOf(d)}${d.km?'<br>'+LC.fmtKm(d.km):''}</i></button>`).join('')}</div>`;
}
function vNgay(P,id){
  let note='';
  if(!id){
    if(TODAY<P.batDau){id=P.batDau;note=`<p class="msg info">Lịch bắt đầu ${DOWF[0].toLowerCase()}, ${dmy(P.batDau)}. Từ giờ đến đó chạy nhẹ như bình thường, hoặc nghỉ cho khoẻ.</p>`}
    else if(TODAY>P.ketThuc){id=P.days[P.days.length-1].date;note=`<p class="msg info">Đã hết lịch. Vào <a href="#/ho-so">Hồ sơ</a> để cập nhật số liệu mới và tạo lịch tiếp theo.</p>`}
    else id=TODAY;
  }
  CUR=id;const d=P.byId[id];if(!d)return `<p class="msg warn">Ngày này không nằm trong lịch.</p>`+vNgay(P);
  const t=P.tuan[d.w],X=P.X;
  const warn=P.canhBao.filter(c=>c[0]!=='info').map(c=>`<p class="msg ${c[0]}">${esc(c[1])}</p>`).join('');
  if(S.hs.thongBao)note=`<p class="msg ok">${esc(S.hs.thongBao)} <button class="btn sm" type="button" data-a="tbXong">Đã hiểu</button></p>`+note;
  if(d.date===TODAY||!route().d){const tl=theLuc(P);if(tl.acwr>1.5)note+=`<p class="msg warn">7 ngày qua bạn chạy ${LC.fmtKm(tl.km1)} km, gấp ${String(Math.round(tl.acwr*10)/10).replace('.',',')} lần trung bình 4 tuần. Tăng tải nhanh như vậy dễ chấn thương: hôm nay chạy nhẹ hoặc nghỉ.</p>`}
  let h=note+(d.w===0&&id<=P.tuan[0].days[6].date?warn:'')+strip(P,d.w,id);
  const chips=[];
  if(d.km)chips.push(LC.fmtKm(d.km)+' km');
  if(d.phut)chips.push('khoảng '+LC.fmtT(d.phut));
  if(d.leo)chips.push(d.leo+' m leo');
  if(d.km&&d.loai!=='suc')chips.push(d.dh==='trail'?'Trail':'Đường bằng');
  chips.push(LC.TEN_PHA[t.pha]+(t.deload&&t.pha!=='kiem'?' · giảm tải':''));
  const coBai=d.bt&&(d.bt.kd||d.bt.gc||d.bt.sm||d.bt.core);
  h+=`<div class="dhead"><div><p class="kick">${DOWF[d.thu]}, ${dmy(d.date)}${d.date===TODAY?' · hôm nay':''}</p><h2>${esc(d.ten)}</h2><div class="chips">${chips.map(c=>`<span>${esc(c)}</span>`).join('')}</div></div>
    ${coBai?`<div class="row"><span class="prog num" id="pg" style="font-size:22px;font-weight:700"></span><button class="btn sm" id="rst" type="button">Bỏ đánh dấu</button></div>`:''}</div>`;
  const tg=[];
  if(d.hr)tg.push(['Nhịp tim',`${d.hr[0]}–${d.hr[1]}`]);
  if(d.pace)tg.push(['Pace',`${LC.fmtP(d.pace[0])}–${LC.fmtP(d.pace[1])}/km`]);
  if(d.loai==='nhe'||d.loai==='dai'||d.loai==='dai2'||d.loai==='hoiphuc')tg.push(['Vượt mức này thì chậm lại',String(P.vung.hr.tran)]);
  if((d.km||d.loai==='suc'||d.boi)&&d.date<=TODAY)h+=sangBox(P,d);
  if(tg.length)h+=`<div class="tgt">${tg.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>`;
  h+=`<ol class="steps">${d.buoc.map(b=>`<li>${esc(b)}</li>`).join('')}</ol>`;
  if(d.loai==='thi')h+=keHoachHtml(P);
  if(d.km&&d.loai!=='suc'&&d.loai!=='thi')h+=nongBox(d);

  /* Bài tập kèm theo */
  const blk=(id2,title,sub,keys,mini,open)=>`<details class="blk"${open?' open':''}><summary><h3>${title}</h3><span class="mut">${sub}</span></summary><div class="blkin">${mini?`<div class="minis">${mini.map(k=>miniCard(d.date,k)).join('')}</div>`:''}<div class="grid">${keys.map(k=>exCard(d.date,k)).join('')}</div></div></details>`;
  if(d.bt.kd){const ks=d.loai==='nang'?['swing','lswing','hipc','march','aski','butt']:['swing','lswing','hipc','march'];h+=blk('kd','Trước khi chạy: khởi động','8–10 phút',ks,['warm'],d.date===TODAY&&!daChay(d))}
  if(d.km&&d.loai!=='suc')h+=logForm(P,d);
  else if(d.date<=TODAY)h+=`<details class="blk"${S.log[id]?' open':''}><summary><h3>Hôm nay vẫn chạy?</h3><span class="mut">ghi buổi chạy thêm, được tính vào nhật ký và tiến bộ</span></summary><div class="blkin">${logForm(P,dayOf(P,id))}</div></details>`;
  if(d.bt.core)h+=blk('core','Core','15 phút, sau buổi chạy hoặc buổi tối',BT.SES.find(s=>s.id==='core').ex,null,false);
  if(d.bt.sm){const ks=d.bt.sm==='trail'?['stepdown','llunge','slrdl','calf1','hike','bal']:BT.SES.find(s=>s.id===d.bt.sm).ex;
    h+=blk('sm',d.bt.sm==='ta'?'Sức mạnh với tạ':d.bt.sm==='trail'?'Sức mạnh cho trail':'Sức mạnh không tạ',d.bt.sm==='ta'?'35–40 phút':'25–30 phút',ks,null,d.loai==='suc')}
  if(d.bt.gc)h+=blk('gc','Sau khi chạy: giãn cơ','8–10 phút, khi cơ còn ấm',['calfst','quad','hams','hipf','fig4'],null,daChay(d));
  if(d.loai==='suc'||d.bt.sm||d.bt.core)h+=`<p class="note" style="margin-top:12px">Thêm bài và bài thay thế: <a href="../bai-tap-bo-tro.html">Thư viện bài bổ trợ</a>.</p>`;
  h+=`<div id="ttw">${tuanTomTat(P,t)}</div>`;
  return h;
}
/* ---------- Kiểm tra buổi sáng ---------- */
function sangNen(date,k){const v=[];for(let i=1;i<=14;i++){const x=S.sang[LC.addD(date,-i)];const n=x&&num(x,k);if(n)v.push(n)}if(v.length<3)return null;v.sort((a,b)=>a-b);return v[v.length>>1]}
function sangKQ(date){
  const x=S.sang[date];if(!x)return['na',[]];
  const hr=num(x,'hr'),hrv=num(x,'hrv'),ngu=num(x,'ngu'),cg=num(x,'cg');
  if(!hr&&!hrv&&ngu==null&&cg==null)return['na',[]];
  const bh=sangNen(date,'hr')||(S.hs&&+S.hs.hrNghi)||null,bv=sangNen(date,'hrv'),ly=[];let lv=0;
  if(hr&&bh){if(hr>=bh+8){lv=2;ly.push(`nhịp tim nghỉ ${hr}, cao hơn mức thường (${bh}) ${hr-bh} nhịp`)}else if(hr>=bh+5){lv=Math.max(lv,1);ly.push(`nhịp tim nghỉ ${hr}, cao hơn mức thường ${hr-bh} nhịp`)}}
  if(hrv&&bv){if(hrv<bv*0.75){lv=2;ly.push(`HRV ${hrv}, thấp hơn nhiều so với mức thường (${bv})`)}else if(hrv<bv*0.88){lv=Math.max(lv,1);ly.push(`HRV ${hrv}, thấp hơn mức thường (${bv})`)}}
  if(ngu!=null&&ngu<6){lv=Math.max(lv,1);ly.push(`ngủ ${ngu} tiếng`)}
  if(cg!=null){if(cg<=1){lv=2;ly.push('cảm thấy rất mệt')}else if(cg===2){lv=Math.max(lv,1);ly.push('cảm thấy mệt')}}
  return[['ok','warn','bad'][lv],ly];
}
const SANG_NHAN={na:'kiểm tra cơ thể đã hồi phục chưa',ok:'sẵn sàng',warn:'nên tập nhẹ',bad:'nên nghỉ'};
function sangText(P,d){
  const[lv,ly]=sangKQ(d.date);
  if(lv==='na')return `<p class="hint">Điền vài ô lúc mới thức dậy. Trang so với 14 ngày gần nhất của bạn, nên càng điền đều càng chính xác.</p>`;
  const why=ly.length?' ('+esc(ly.join(', '))+')':'';
  if(lv==='ok')return `<p class="msg ok">Sẵn sàng, tập theo lịch.</p>`;
  if(lv==='bad')return `<p class="msg bad">Nên nghỉ hoặc chỉ đi bộ nhẹ 20–30 phút hôm nay${why}. Sáng mai đo lại. Hai ngày liền như vậy thì lịch tuần sau tự giảm.</p>`;
  const goi=d.loai==='nang'?`Đổi bài nặng thành chạy nhẹ ${LC.fmtKm(Math.max(3,Math.round(d.km*0.7)))} km ở vùng 2.`:d.loai==='dai'||d.loai==='dai2'?'Chạy dài bớt 20–30%, giữ vùng 2.':d.loai==='suc'?'Tập sức mạnh bớt một hiệp mỗi bài.':'Chạy như lịch nhưng chậm hơn, có thể bớt 1–2 km.';
  return `<p class="msg warn">Nên tập nhẹ hôm nay${why}. ${goi}</p>`;
}
function sangBox(P,d){
  const x=S.sang[d.date]||{},[lv]=sangKQ(d.date);
  const f=(k,lb,ph,tip)=>`<label class="f"><span class="lb">${lb}${tip?`<button type="button" class="tip" data-tip="${esc(tip)}" aria-label="${esc(tip)}">?</button>`:''}</span><input data-sang="${d.date}" data-f="${k}" type="number" inputmode="decimal" placeholder="${ph}" value="${esc(x[k])}"></label>`;
  return `<details class="blk"${d.date===TODAY?' open':''}><summary><h3>Buổi sáng</h3><span class="mut" id="sangnhan">${SANG_NHAN[lv]}</span></summary><div class="blkin">
    <div class="lg">${f('hr','Nhịp tim nghỉ','56','Đo lúc mới thức dậy, hoặc lấy số nhịp tim nghỉ hôm nay trên đồng hồ.')}${f('hrv','HRV (ms)','45','Số HRV qua đêm trên đồng hồ (Garmin: HRV Status). Không có thì bỏ trống.')}${f('ngu','Giờ ngủ','7')}
    <label class="f"><span class="lb">Cảm giác</span><select data-sang="${d.date}" data-f="cg"><option value="">–</option>${[[5,'Rất khoẻ'],[4,'Khoẻ'],[3,'Bình thường'],[2,'Mệt'],[1,'Rất mệt']].map(([v,t])=>`<option value="${v}"${String(x.cg)===String(v)?' selected':''}>${t}</option>`).join('')}</select></label></div>
    <div id="sangkq">${sangText(P,d)}</div></div></details>`;
}

/* ---------- Trời nóng: chỉnh pace theo nhiệt độ + điểm sương ---------- */
const troiLay=()=>{try{return JSON.parse(localStorage.getItem('lcn-troi'))||{}}catch(e){return{}}};
function nongPct(t,rh){const a=17.27,b=237.7,al=a*t/(b+t)+Math.log(rh/100),td=b*al/(a-al),sum=t*9/5+32+td*9/5+32;
  for(const[x,pc]of[[100,0],[110,.25],[120,.75],[130,1.5],[140,2.5],[150,3.75],[160,5.25],[170,7],[180,9]])if(sum<=x)return{pc,td};return{pc:null,td}}
function nongText(d){
  const w=troiLay();if(!(+w.t>0&&+w.rh>0))return '<p class="hint">Điền nhiệt độ và độ ẩm lúc chạy (xem ứng dụng thời tiết). Trang tính pace nên chậm lại bao nhiêu.</p>';
  const r=nongPct(+w.t,+w.rh),td=Math.round(r.td);
  if(r.pc===null)return `<p class="msg bad">Rất nóng ẩm (điểm sương ${td}°C). Chỉ chạy nhẹ theo nhịp tim, chạy sớm hơn hoặc dùng máy chạy; không chạy bài nặng hôm nay. Uống 500–800 ml mỗi giờ, có điện giải.</p>`;
  if(r.pc===0)return `<p class="msg ok">Thời tiết ổn (điểm sương ${td}°C), không cần chỉnh pace.</p>`;
  const k=1+r.pc/100;
  return `<p class="msg ${r.pc>=3.75?'warn':'info'}">Điểm sương ${td}°C: chậm hơn khoảng ${String(r.pc).replace('.',',')}%.${d.pace?` Pace hôm nay: <b>${LC.fmtP(d.pace[0]*k)}–${LC.fmtP(d.pace[1]*k)}/km</b>.`:' Chạy theo nhịp tim; ở cùng tốc độ tim sẽ cao hơn bình thường.'} Uống 400–800 ml mỗi giờ, thêm điện giải nếu chạy trên 60 phút.</p>`;
}
function nongBox(d){
  const w=troiLay();
  return `<details class="blk"><summary><h3>Trời nóng?</h3><span class="mut">tính pace nên chậm lại</span></summary><div class="blkin"><div class="lg"><label class="f">Nhiệt độ (°C)<input data-troi="t" type="number" inputmode="decimal" placeholder="30" value="${esc(w.t)}"></label><label class="f">Độ ẩm (%)<input data-troi="rh" type="number" inputmode="decimal" placeholder="75" value="${esc(w.rh)}"></label></div><div id="nongkq">${nongText(d)}</div></div></details>`;
}

/* ---------- Kế hoạch ngày thi ---------- */
function keHoachHtml(P){
  const k=LC.keHoachThi(P);
  const T=k.khoang?`${LC.fmtT(k.khoang[0])} – ${LC.fmtT(k.khoang[1])}`:k.T?LC.fmtT(k.T):null;
  const gel=k.gel.length?(k.gel.length<=6?`Ăn ở các phút: ${k.gel.join(', ')}.`:`Ăn mỗi ${k.gel[1]-k.gel[0]} phút, bắt đầu từ phút ${k.gel[0]}.`):'';
  return `<div class="log" style="margin:12px 0"><h3>Kế hoạch ngày thi</h3>${T?`<p class="big num" style="font-size:28px;margin:6px 0">Dự kiến ${T}</p>`:''}
    ${P.mt&&P.mt.kho?`<p class="msg warn">Mục tiêu ${LC.fmtT(P.mt.T)} khó với thể lực hiện tại; pace dưới đây theo mức thực tế hơn.</p>`:''}
    <table class="zt"><thead><tr><th>Đoạn</th><th>${P.X.trail?'Cách chạy':'Pace'}</th><th>Ghi chú</th></tr></thead><tbody>${k.doan.map(r=>`<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td class="mut">${esc(r[2])}</td></tr>`).join('')}</tbody></table>
    <h3 style="margin-top:16px;font-size:20px">Ăn uống</h3><ul class="steps">${k.an.map(x=>`<li>${esc(x)}</li>`).join('')}${gel?`<li>${gel}</li>`:''}</ul></div>`;
}
function miniCard(id,k){const e=BT.E[k],key=id+':'+k;return `<article class="card mini"><div class="t"><h3>${e.name}: <span class="dose">${e.dose}</span></h3><p>${e.note}</p></div><button class="dot wide" data-k="${key}" data-i="0" aria-pressed="${isDone(key,0)}">Xong</button></article>`}
function exCard(id,k){
  const e=BT.E[k],key=id+':'+k;
  const dots=Array.from({length:e.sets},(_,i)=>`<button class="dot" data-k="${key}" data-i="${i}" aria-pressed="${isDone(key,i)}" aria-label="Hiệp ${i+1}">${e.side?(i%2?'P':'T')+(Math.floor(i/2)+1):i+1}</button>`).join('');
  const tm=e.t?`<button class="btn tm" data-k="${key}" data-t="${e.t}">Bấm giờ ${e.t}s</button>`:'';
  return `<article class="card"><div class="fg">${BT.fig(e.fig||k,e.name,S.anim===false)}</div><div class="cb"><h3>${e.name}</h3><div class="dose">${e.dose}</div><ul class="cues">${e.cues.map(c=>`<li>${c}</li>`).join('')}</ul>${e.side?'<p class="hint">T là bên trái, P là bên phải</p>':''}<div class="sets">${dots}${tm}</div></div></article>`;
}
const isDone=(k,i)=>!!(S.done[k]||[])[i];
function dayKeys(d){
  const ks=[];const add=(arr)=>arr.forEach(k=>{const e=BT.E[k];ks.push([k,e.mini?1:e.sets])});
  if(d.bt.kd){add(['warm']);add(d.loai==='nang'?['swing','lswing','hipc','march','aski','butt']:['swing','lswing','hipc','march'])}
  if(d.bt.core)add(BT.SES.find(s=>s.id==='core').ex);
  if(d.bt.sm)add(d.bt.sm==='trail'?['stepdown','llunge','slrdl','calf1','hike','bal']:BT.SES.find(s=>s.id===d.bt.sm).ex);
  if(d.bt.gc)add(['calfst','quad','hams','hipf','fig4']);
  return ks;
}
function ttw(){const w=$('#ttw'),P=PLAN;if(w&&P&&P.byId[CUR])w.innerHTML=tuanTomTat(P,P.tuan[P.byId[CUR].w])}
function prog(){
  const el=$('#pg'),P=PLAN,r=route();if(!el||!P)return;
  const d=P.byId[CUR];if(!d)return;
  let n=0,t=0;for(const[k,c]of dayKeys(d)){t+=c;const a=S.done[d.date+':'+k]||[];for(let i=0;i<c;i++)if(a[i])n++}
  el.textContent=t?`${n}/${t} bài tập`:'';
}

/* ---------- Ghi chép và nhận xét ---------- */
const LF=[['km','Quãng đường (km)',1],['tg','Thời gian (h:mm:ss)',0,'52:30'],['hr','Nhịp tim TB',1],['hrmax','Nhịp tim cao nhất',1],['cad','Guồng chân',1],['rpe','Mức gắng sức (1–10)',1,'1 rất nhẹ, 10 hết sức'],['dau','Đau (0–10)',1,'0 là không đau']];
function logForm(P,d){
  const L={...(S.log[d.date]||{}),__d:d.date},key=d.date+':run',fields=[...LF],dh=dhOf(d);
  if(dh==='trail')fields.splice(2,0,['leo','Số mét leo',1]);
  const f=fields.map(([k,lb,n,ph])=>`<label class="f" for="l-${k}">${lb}<input id="l-${k}" data-l="${d.date}" data-f="${k}" type="${n?'number':'text'}" inputmode="${n?'decimal':'numeric'}"${ph?` placeholder="${ph}"`:''} value="${esc(L[k])}"></label>`).join('');
  return `<div class="log" data-log="${d.date}"><div class="row" style="justify-content:space-between"><h3>Sau buổi chạy</h3><button class="dot wide" data-k="${key}" data-i="0" aria-pressed="${isDone(key,0)}">${d.loai==='thi'?'Đã thi xong':'Đã chạy xong'}</button></div>
    <div class="row" style="margin:8px 0 4px"><span class="mut" style="font-size:14px">Buổi này chạy trên</span><div class="seg" role="group" aria-label="Địa hình">${[['road','Đường bằng'],['trail','Trail']].map(([v,t])=>`<button type="button" data-dh="${v}" data-d="${d.date}" aria-pressed="${dh===v}">${t}</button>`).join('')}</div></div>
    <div class="row up"><label class="btn" for="ff">Tải file từ đồng hồ<input id="ff" type="file" accept=".fit,.tcx,.gpx,.zip" data-ff="${d.date}" hidden></label><button type="button" class="tip tip-r" data-tip="Trên connect.garmin.com (bản web): mở buổi chạy, bấm biểu tượng bánh răng, chọn Export Original (.zip), Export to TCX hoặc GPX. Chọn file đó ở đây, hoặc kéo thả vào khung này. File chỉ được đọc trên máy bạn, không gửi đi đâu và không lưu đường chạy." aria-label="Cách lấy file từ Garmin">?</button><span class="mut" id="ffmsg" style="font-size:14px">${L.src?'Đã đọc từ file '+esc(L.src):'Tự điền các ô dưới từ file .fit, .tcx, .gpx hoặc .zip'}</span></div>
    ${fileTomTat(L)}
    <p class="hint">Road và trail được theo dõi riêng: mỗi buổi chỉ so với buổi cùng loại. Không có file thì lấy số trên đồng hồ hoặc ứng dụng chạy. Guồng chân: lấy của các km chạy liên tục, vì số trung bình cả buổi bị các đoạn đi bộ kéo xuống.</p>
    <div class="lg">${f}${giayChon(L)}${dh==='road'?`<label class="f w row" style="flex-direction:row;gap:8px;color:var(--ink)"><input type="checkbox" data-l="${d.date}" data-f="hetSuc" ${hetSuc(d,L)?'checked':''}> Buổi này chạy hết sức (thi, chạy kiểm tra): dùng để cập nhật thể lực</label>`:''}<label class="f w" for="l-nt">Ghi chú<input id="l-nt" data-l="${d.date}" data-f="nt" type="text" placeholder="Cảm giác, chỗ mỏi, thời tiết, đường chạy" value="${esc(L.nt)}"></label></div>
    <div class="rv" id="rv">${review(P,d)}</div></div>`;
}
/* Thông tin chỉ có khi tải file: phút đi bộ, tim trôi, từng km */
function fileTomTat(L){
  if(!L.src)return '';
  const c=[];
  if(L.diBo!=null)c.push('Đi bộ '+L.diBo+' phút');
  if(L.troi!=null)c.push('Tim trôi '+String(L.troi).replace('.',',')+'%');
  if(L.km1&&L.km1.length)c.push(L.km1.length+' km đầy đủ');
  const tb=L.km1&&L.km1.length?`<details class="km1"><summary>Từng km</summary><table class="zt"><thead><tr><th>Km</th><th>Pace</th><th>Nhịp tim TB</th></tr></thead><tbody>${L.km1.map((k,i)=>`<tr><td>${i+1}</td><td>${LC.fmtP(k[0])}</td><td>${k[1]??'–'}</td></tr>`).join('')}</tbody></table></details>`:'';
  return `<div class="chips" style="margin:6px 0 4px">${c.map(x=>`<span>${esc(x)}</span>`).join('')}</div>${tb}`;
}
/* ---------- Giày ---------- */
const giayKm=g=>(+g.kmDau||0)+Object.values(S.log).filter(L=>L.giay===g.id).reduce((a,L)=>a+(num(L,'km')||0),0);
const giayMac=()=>S.giay.find(g=>g.mac&&!g.nghi)||S.giay.find(g=>!g.nghi);
function giayChon(L){
  const ds=S.giay.filter(g=>!g.nghi||g.id===L.giay);if(!ds.length)return '';
  const cur=L.giay||(giayMac()||{}).id,g=S.giay.find(x=>x.id===cur),km=g?giayKm(g):0;
  return `<label class="f" for="l-giay">Giày<select id="l-giay" data-l="${esc(L.__d||'')}" data-f="giay">${ds.map(x=>`<option value="${esc(x.id)}"${x.id===cur?' selected':''}>${esc(x.ten)}</option>`).join('')}</select>${km>=800?`<span class="help" style="color:var(--bd)">${Math.round(km)} km: nên thay giày</span>`:km>=600?`<span class="help" style="color:var(--wn)">${Math.round(km)} km: sắp đến lúc thay</span>`:''}</label>`;
}
const fmtGiay=g=>{g=Math.round(g);const h=Math.floor(g/3600),m=Math.floor(g%3600/60),x=g%60;return h?h+':'+pad(m)+':'+pad(x):m+':'+pad(x)};
async function napFile(file,ngay){
  const msg=$('#ffmsg');if(msg)msg.textContent='Đang đọc '+file.name+'…';
  let r;
  try{r=await window.DocFile.read(file)}catch(e){if(msg)msg.textContent='Không đọc được: '+(e.message||e);return}
  const P=plan();let dich=ngay;
  if(r.date!==ngay){
    if(confirm(`File này là buổi chạy ngày ${dmy(r.date)}${P.byId[r.date]&&P.byId[r.date].km?'':' (ngoài lịch, sẽ ghi vào Nhật ký)'}. Ghi vào ngày ${dmy(r.date)}?\n(Bấm Huỷ để ghi vào ngày đang xem, ${dmy(ngay)}.)`))dich=r.date;
  }
  const L=S.log[dich]||(S.log[dich]={}),d=dayOf(P,dich);
  if(Object.keys(L).some(k=>['km','tg','hr'].includes(k)&&L[k])&&L.src!==r.ten&&!confirm('Ngày này đã có số liệu. Thay bằng số trong file?')){if(msg)msg.textContent='Đã huỷ.';return}
  Object.assign(L,{km:String(r.km),tg:fmtGiay(r.giay),hr:r.hr!=null?String(r.hr):'',hrmax:r.hrmax!=null?String(r.hrmax):'',src:r.ten,diBo:r.diBo,troi:r.troi,km1:r.km1});
  if(r.cad)L.cad=String(r.cad);
  if(r.leo!=null)L.leo=String(r.leo);
  if(!L.giay&&giayMac())L.giay=giayMac().id;
  if(d&&r.goiY!==(d.dh||'road'))L.dh=r.goiY;else delete L.dh;
  (S.done[dich+':run']=S.done[dich+':run']||[])[0]=1;
  save();
  if(dich!==CUR)go(dich);else keep(render);
}
/* ---------- Nhập lịch sử: CSV danh sách hoạt động của Garmin Connect, hoặc nhiều file cùng lúc ---------- */
function csvRows(txt,sep){
  const rows=[];let r=[],f='',q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===sep){r.push(f);f=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()!==''))rows.push(r);r=[]}
    else f+=c}
  r.push(f);if(r.some(x=>x.trim()!==''))rows.push(r);return rows;
}
/* Số trong CSV: "10.02", "10,02", "1,234" (nghìn), "--" là trống */
const soCsv=(v,nghin)=>{v=String(v??'').trim().replace(/\s/g,'');if(!v||v==='--')return null;
  if(v.includes(',')&&v.includes('.'))v=v.replace(/,/g,'');
  else if(v.includes(','))v=nghin&&/^\d{1,3}(,\d{3})+$/.test(v)?v.replace(/,/g,''):v.replace(',','.');
  const x=parseFloat(v);return isFinite(x)?x:null};
const giayCsv=v=>{v=String(v??'').trim();if(!v||v==='--')return null;const a=v.split(':').map(x=>+x.replace(',','.'));return a.some(x=>!isFinite(x))?null:a.reduce((t,x)=>t*60+x,0)};
const ngayCsv=v=>{v=String(v??'').trim();let m=v.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);
  m=v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m){const a=+m[1],b=+m[2];return m[3]+'-'+pad(a>12?b:a)+'-'+pad(a>12?a:b)}
  const d=new Date(v);return isNaN(d)?null:LC.ymd(d)};
function docCsv(txt){
  txt=txt.replace(/^\uFEFF/,'').normalize('NFC');const l1=txt.split(/\r?\n/)[0];
  const rows=csvRows(txt,l1.split(';').length>l1.split(',').length?';':',');if(rows.length<2)throw new Error('file trống');
  const H=rows[0].map(h=>h.trim().toLowerCase());
  const col=(...re)=>{for(const r of re){const i=H.findIndex(h=>r.test(h));if(i>=0)return i}return -1};
  const C={loai:col(/^activity type$/,/loại hoạt động/,/^loại$/),ngay:col(/^date$/,/^ngày$/,/start time/,/ngày/),ten:col(/^title$/,/tiêu đề/,/^tên/),
    km:col(/^distance$/,/khoảng cách/,/quãng đường/,/distance/),tg:col(/^time$/,/^thời gian$/,/moving time/,/elapsed time/,/thời gian/),
    hr:col(/^avg hr$/,/avg.*(hr|heart)/,/^hr trung bình$/,/(hr|nhịp tim).*(tb|trung bình)/),hrmax:col(/^max hr$/,/max.*(hr|heart)/,/^hr tối đa$/,/(hr|nhịp tim).*(tối đa|cao nhất)/),
    cad:col(/avg run cadence/,/avg.*cadence/,/^nhịp độ chạy trung bình$/,/(guồng|nhịp bước|nhịp độ chạy).*(tb|trung bình)/),leo:col(/total ascent/,/elev.*gain/,/tổng.*(lên|leo)/)};
  if(C.ngay<0||C.km<0||C.tg<0)throw new Error('không thấy cột Date, Distance, Time. Hãy xuất CSV từ danh sách Activities trên connect.garmin.com');
  const ds=[];let bo=0;
  for(const r of rows.slice(1)){
    const loai=C.loai>=0?(r[C.loai]||''):'running';
    if(!/run|chạy/i.test(loai)){bo++;continue}
    const date=ngayCsv(r[C.ngay]),km=soCsv(r[C.km]),giay=giayCsv(r[C.tg]);
    if(!date||!km||!giay||km<0.5||km>400){bo++;continue}
    const g=(k,n)=>C[k]>=0?soCsv(r[C[k]],n):null;
    ds.push({date,km,giay,hr:g('hr'),hrmax:g('hrmax'),cad:g('cad'),leo:g('leo',1),trail:/trail|địa hình|đường mòn/i.test(loai),ten:C.ten>=0?(r[C.ten]||'').trim():''});
  }
  return {ds,bo};
}
/* Ghi các buổi vào nhật ký. Nhiều buổi cùng ngày thì cộng lại. Ngày đã ghi tay giữ nguyên. */
function ghiNhieu(list,nguon){
  const P=plan(),g={},gan=LC.addD(TODAY,-60);let moi=0,capNhat=0,giu=0;
  for(const x of list)if(x.date<=TODAY)(g[x.date]=g[x.date]||[]).push(x);
  for(const[date,xs]of Object.entries(g)){
    const L0=S.log[date];
    if(L0&&!L0.nhap&&['km','tg','hr'].some(k=>L0[k])){giu++;continue}
    const km=xs.reduce((a,x)=>a+x.km,0),gi=xs.reduce((a,x)=>a+x.giay,0);
    const tb=k=>{const c=xs.filter(x=>x[k]!=null&&x[k]>0),w=c.reduce((a,x)=>a+x.giay,0);return w?Math.round(c.reduce((a,x)=>a+x[k]*x.giay,0)/w):null};
    const hr=tb('hr'),cad=tb('cad'),hrmax=Math.max(0,...xs.map(x=>x.hrmax||0)),leo=xs.some(x=>x.leo!=null)?Math.round(xs.reduce((a,x)=>a+(x.leo||0),0)):null;
    const L=L0||(S.log[date]={});L0?capNhat++:moi++;
    /* Nhiều buổi một ngày (giải + khởi động): km là tổng, còn "buổi chính" (VDOT cao nhất, từ 3 km) giữ riêng để tính thành tích */
    const ch=xs.length>1?xs.filter(x=>x.km>=3&&!x.trail).sort((a,b)=>LC.vdot(b.km,b.giay/60)-LC.vdot(a.km,a.giay/60))[0]:null;
    if(ch)L.chinh={km:String(Math.round(ch.km*100)/100),tg:fmtGiay(ch.giay),hr:ch.hr?String(Math.round(ch.hr)):'',ten:ch.ten||''};else delete L.chinh;
    Object.assign(L,{km:String(Math.round(km*100)/100),tg:fmtGiay(gi),hr:hr?String(hr):'',hrmax:hrmax?String(hrmax):'',src:xs.length>1?xs.length+' buổi, '+nguon:(xs[0].ten||nguon),nhap:1});
    if(cad)L.cad=String(cad);if(leo!=null)L.leo=String(leo);
    if(xs.length===1&&xs[0].km1&&date>=gan)Object.assign(L,{km1:xs[0].km1,troi:xs[0].troi,diBo:xs[0].diBo});
    if(!L.giay&&date>=gan&&giayMac())L.giay=giayMac().id;
    const trail=xs.some(x=>x.trail),d=P?dayOf(P,date):{dh:'road'};
    if(trail!==((d.dh||'road')==='trail'))L.dh=trail?'trail':'road';else delete L.dh;
    if(P&&P.byId[date]&&P.byId[date].km)(S.done[date+':run']=S.done[date+':run']||[])[0]=1;
  }
  return {moi,capNhat,giu};
}
async function nhapNhieu(files){
  const msg=$('#nhmsg'),say=x=>{if(msg)msg.textContent=x};
  const list=[],loi=[];let bo=0;
  for(let i=0;i<files.length;i++){const f=files[i];say(`Đang đọc ${i+1}/${files.length}: ${f.name}…`);
    try{
      if(/\.csv$/i.test(f.name)){const r=docCsv(await f.text());list.push(...r.ds);bo+=r.bo}
      else{const r=await window.DocFile.read(f);if(r&&r.km>=0.5)list.push({...r,trail:r.goiY==='trail',ten:r.ten||f.name});else bo++}
    }catch(e){loi.push(f.name+': '+(e.message||e))}}
  if(!list.length){say('Không có buổi chạy nào đọc được.'+(loi.length?' '+loi[0]:''));return}
  const r=ghiNhieu(list,files.length===1?files[0].name:'Garmin'),ng=list.map(x=>x.date).sort();
  save();
  let t=`Đã đọc ${list.length} buổi chạy, từ ${dmy(ng[0])} đến ${dmy(ng[ng.length-1])}: thêm ${r.moi} ngày, cập nhật ${r.capNhat} ngày`+(r.giu?`, giữ nguyên ${r.giu} ngày bạn đã ghi tay`:'')+'.'
    +(bo?` Bỏ qua ${bo} dòng không phải chạy bộ hoặc ngắn dưới 0,5 km.`:'')+(loi.length?` Không đọc được ${loi.length} file (${loi.slice(0,2).join('; ')}).`:'');
  if(JSON.stringify(S).length>450000)t+=' Dữ liệu đã gần giới hạn lưu trong tài khoản; nếu báo lỗi đồng bộ, hãy tải bản JSON về máy cho chắc.';
  try{localStorage.setItem('lcn-nhap',t)}catch(e){}
  if(location.hash!=='#/lo-trinh')location.hash='#/lo-trinh';else keep(render);
}
const nhapBox=()=>{let m='';try{m=localStorage.getItem('lcn-nhap')||'';localStorage.removeItem('lcn-nhap')}catch(e){}
  return `${m?`<p class="msg ok">${esc(m)}</p>`:''}<div class="row up" style="margin:14px 0 4px"><label class="btn pri" for="nhieu">Nhập lịch sử từ Garmin<input id="nhieu" type="file" accept=".csv,.fit,.tcx,.gpx,.zip" multiple hidden></label><span class="mut" id="nhmsg" style="font-size:14px">File .csv danh sách hoạt động, hoặc chọn nhiều file .fit, .tcx, .gpx, .zip một lần</span></div>
  <details class="km1"><summary>Cách lấy lịch sử từ Garmin Connect</summary><ol class="steps"><li>Mở <b>connect.garmin.com</b> trên máy tính và đăng nhập. Ứng dụng trên điện thoại không xuất được.</li><li>Vào <b>Hoạt động → Tất cả hoạt động</b> (Activities → All Activities). Lọc loại <b>Chạy</b> (Running) cho gọn.</li><li>Cuộn xuống cuối trang nhiều lần cho đến khi hiện hết các năm bạn muốn lấy. Garmin chỉ xuất những dòng đang hiện trên trang.</li><li>Bấm <b>Xuất CSV</b> (Export CSV) ở góc trên bên phải, rồi chọn file đó bằng nút ở trên.</li></ol>
  <p class="note">Đơn vị khoảng cách trong Garmin phải là km. File CSV chỉ có số tổng của mỗi buổi; muốn có từng km và độ trôi nhịp tim thì nhập thêm file .fit hoặc .zip của buổi đó. Ngày bạn đã ghi tay được giữ nguyên; nhập lại cùng file thì chỉ cập nhật, không nhân đôi. File được đọc ngay trên máy bạn, không gửi đi đâu.</p></details>`};
/* Buổi nhanh ở các cự ly chuẩn nhưng chưa đánh dấu: hỏi người dùng có phải chạy hết sức không */
function goiYHetSuc(P,KL){
  const out=[];
  for(const D of [5,10,21.1,42.2]){
    const c=Object.entries(S.log).filter(([dt,L])=>{const k=num(kq(L),'km'),m=tgPhut(kq(L).tg);return dt<=TODAY&&k&&m&&Math.abs(k-D)/D<=0.03&&(L.hetSuc==null||L.hetSuc==='')&&!hetSuc(dayOf(P,dt),L)&&dhOf(dayOf(P,dt))==='road'})
      .map(([dt,L])=>({dt,D,t:tgPhut(kq(L).tg)*D/num(kq(L),'km'),hr:kq(L).hr,ten:L.chinh?L.chinh.ten:L.src&&L.nhap?L.src:''})).filter(x=>!KL[D]||x.t<KL[D].t*1.04).sort((a,b)=>a.t-b.t).slice(0,2);
    out.push(...c);
  }
  return out;
}
/* Số liệu dùng để tính thành tích: buổi chính nếu ngày có nhiều buổi */
const kq=L=>L.chinh&&L.chinh.km?L.chinh:L;
const num=(L,k)=>{const v=L[k];if(v===''||v==null)return null;const x=+String(v).replace(',','.');return isFinite(x)?x:null};
function paceOf(L){const k=num(L,'km'),m=tgPhut(L.tg);return k&&m?m*60/k:(L.pace?paceGiay(L.pace)||null:null)}
function bpk(L){const h=num(L,'hr'),p=paceOf(L);return h&&p?Math.round(h*p/60):null}
/* Địa hình của buổi: người dùng chọn, nếu chưa chọn thì theo lịch. */
const dhOf=d=>(S.log[d.date]&&S.log[d.date].dh)||d.dh||'road';
/* Nhịp tim cho mỗi km: road theo km thật; trail theo km quy đổi (mỗi 100 m leo tính thêm 1 km). */
function hieuQua(L,dh){
  const h=num(L,'hr');if(!h)return null;
  if(dh==='trail'){const k=num(L,'km'),m=tgPhut(L.tg);return k&&m?Math.round(h*m/(k+(num(L,'leo')||0)/100)):null}
  const p=paceOf(L);return p?Math.round(h*p/60):null;
}
/* Ngày ngoài lịch (ghi thêm, hoặc dữ liệu cũ): coi như buổi chạy nhẹ */
function dayOf(P,date){let d=P.byId[date];if(!d&&P.khoiCu)for(const Q of P.khoiCu)if(Q.byId[date]){d=Q.byId[date];break}if(d&&d.km&&d.loai!=='suc')return d;
  return {date,thu:LC.thu(date),loai:'nhe',dh:'road',km:0,hr:P.vung.hr.nhe,ten:d?'Chạy thêm ngoài lịch':'Buổi chạy ngoài lịch',bt:{},buoc:[],ngoai:!d,them:!!d,w:d?d.w:-1}}
const EZ=['nhe','dai','dai2','hoiphuc'];
function review(P,d){
  const L=S.log[d.date]||{},hr=num(L,'hr'),mx=num(L,'hrmax'),cad=num(L,'cad'),rpe=num(L,'rpe'),pn=num(L,'dau'),km=num(L,'km'),ps=paceOf(L),Z=P.vung.hr;
  if([hr,mx,cad,rpe,pn,km].every(x=>x==null)&&!L.tg)return '<p>Chạy xong, nhập số liệu vào các ô trên. Nhận xét sẽ hiện ở đây.</p>';
  const o=[],add=(c,t)=>o.push([c,t]),nhe=['nhe','hoiphuc','dai','dai2'].includes(d.loai);
  if(pn!=null){
    if(pn>=4)add('bad',`Đau ${pn}/10: nghỉ chạy ít nhất 2 ngày, chỉ đi bộ và giãn cơ nhẹ. Sau 3 ngày vẫn đau thì nên đi khám.`);
    else if(pn>=1)add('warn',`Đau nhẹ ${pn}/10: theo dõi sáng mai. Còn đau thì buổi chạy tới bớt 20–30%, đau tăng thì nghỉ.`);
    else add('ok','Không đau.');
  }
  if(hr!=null&&d.hr){
    if(nhe){
      if(hr>d.hr[1]+2)add('warn',`Nhịp tim trung bình ${hr}, cao hơn mức ${d.hr[1]} của buổi này. Lần sau chạy chậm hơn 15–30 giây mỗi km hoặc đi bộ xen kẽ. Nóng ẩm, ngủ ít, mới ốm dậy cũng đẩy tim lên.`);
      else if(hr<d.hr[0]-5)add('ok',`Nhịp tim trung bình ${hr}: thấp hơn vùng, rất nhẹ nhàng. Không sao.`);
      else add('ok',`Nhịp tim trung bình ${hr}: đúng vùng.`);
    }else if(d.loai==='nang'&&d.bai&&d.bai.hr==='tempo'&&hr>d.hr[1]+4)add('warn',`Nhịp tim trung bình ${hr} cao so với bài ngưỡng. Lần sau giữ pace chậm hơn một chút.`);
  }
  if(mx!=null&&nhe&&mx>Z.tran+8)add('info',`Có lúc tim lên ${mx}. Khi đồng hồ báo quá ${Z.tran} thì chạy chậm lại hoặc đi bộ đến khi tim xuống.`);
  if(rpe!=null){
    if(nhe&&rpe>=7)add('warn',`Gắng sức ${rpe}/10 là quá nặng cho buổi chạy nhẹ (nên 3–5). Nếu nhiều buổi liền như vậy, tuần này nên giảm khối lượng.`);
    else if(d.loai==='nang'&&rpe<=4)add('info','Bài nặng mà thấy nhẹ: có thể pace đang thấp hơn sức bạn. Chạy kiểm tra lại 5 km để cập nhật hồ sơ.');
    else if(d.loai==='nang'&&rpe>=10)add('warn','Bài nặng mà phải hết sức: lần sau giữ đúng pace ghi trên lịch, không cố nhanh hơn.');
  }
  if(cad!=null){
    if(cad<160)add('warn',`Guồng chân ${cad}: thấp, bước đang dài. Thử metronome 166–170, bước ngắn lại, chân đặt ngay dưới người.`);
    else if(cad<166)add('info',`Guồng chân ${cad}: hơi thấp, nhắm khoảng 166–175.`);
    else add('ok',`Guồng chân ${cad}: tốt.`);
  }
  if(km!=null&&d.km&&d.loai!=='thi'){
    const r=km/d.km;
    if(r<0.7)add('info',`Chạy ${LC.fmtKm(km)}/${LC.fmtKm(d.km)} km. Thiếu một buổi không sao; đừng chạy bù vào buổi sau.`);
    else if(r>1.25)add('warn',`Chạy ${LC.fmtKm(km)} km, nhiều hơn lịch ${LC.fmtKm(d.km)} km. Tăng quá nhanh là nguyên nhân chấn thương hay gặp nhất.`);
  }
  if(ps&&d.loai==='thi')add('ok',`Về đích ${L.tg}, pace ${LC.fmtP(ps)}/km. Vào Hồ sơ điền kết quả này để lịch sau có pace chính xác.`);
  if(L.diBo>0&&nhe){const tot=tgPhut(L.tg);add('info',`Đi bộ ${L.diBo} phút${tot?` (khoảng ${Math.round(L.diBo/tot*100)}% thời gian)`:''}. Đi bộ để giữ nhịp tim trong vùng là đúng; các tuần tới số phút này giảm dần ở cùng nhịp tim là thể lực đang lên.`)}
  if(L.troi!=null&&nhe&&dhOf(d)==='road'){
    if(L.troi>8)add('warn',`Tim trôi ${String(L.troi).replace('.',',')}%: nửa sau tim cao hơn hẳn nửa đầu ở cùng tốc độ. Buổi này hơi quá sức, hoặc do nóng, thiếu nước. Lần sau chạy nửa đầu chậm hơn và mang nước.`);
    else if(L.troi>5)add('info',`Tim trôi ${String(L.troi).replace('.',',')}%, hơi cao. Dưới 5% là nền sức bền tốt cho quãng này.`);
    else add('ok',`Tim trôi ${String(L.troi).replace('.',',')}%: nhịp tim ổn định cả buổi, nền sức bền tốt.`);
  }
  if(L.km1&&L.km1.length>=3&&nhe&&dhOf(d)==='road'){const k1=L.km1[0][0],tb=L.km1.slice(1).reduce((a,k)=>a+k[0],0)/(L.km1.length-1);if(k1<tb-20)add('info',`Km đầu (${LC.fmtP(k1)}) nhanh hơn các km sau (${LC.fmtP(tb)}). Km đầu nên chậm nhất buổi để cơ thể ấm dần.`)}
  const dh=dhOf(d),b=hieuQua(L,dh);
  if(b&&nhe){
    const prev=Object.keys(S.log).filter(x=>x<d.date).sort().reverse().map(x=>dayOf(P,x)).find(x=>EZ.includes(x.loai)&&dhOf(x)===dh&&hieuQua(S.log[x.date]||{},dh));
    let t=dh==='trail'?`Trail: mỗi km quy đổi tốn khoảng ${b} nhịp tim (mỗi 100 m leo tính thêm 1 km). Chỉ so với các buổi trail.`:`Đường bằng: mỗi km tốn khoảng ${b} nhịp tim (nhịp tim TB × số phút mỗi km). Số này giảm dần là thể lực đang lên.`;
    if(dh==='trail'&&num(L,'leo')==null)t+=' Điền số mét leo để số này chính xác.';
    if(prev){const pb=hieuQua(S.log[prev.date],dh),ch=(b-pb)/pb*100;t+=` Buổi ${dh==='trail'?'trail':'đường bằng'} gần nhất (${dm(prev.date)}): ${pb}.`;
      add(ch<=-2?'ok':'info',t+(ch<=-2?' Lần này ít hơn: tốt.':ch>=3?' Lần này nhiều hơn: có thể do nóng, đường khác hoặc chưa hồi phục.':' Gần như không đổi.'))}
    else add('info',t);
  }
  const lv=o.some(x=>x[0]==='bad')?['bad','nghỉ và theo dõi']:o.some(x=>x[0]==='warn')?['warn','được, nhưng buổi tới cần chỉnh']:['ok','tốt, đi tiếp theo lịch'];
  return `<p class="vh ${lv[0]}">Nhận xét: ${lv[1]}</p>`+o.map(([c,t])=>`<p class="${c}">${t}</p>`).join('');
}
function tuanTomTat(P,t){
  const runs=t.days.filter(x=>x.km&&x.loai!=='suc');
  const xong=runs.filter(daChay),kmLog=runs.reduce((a,x)=>a+(num(S.log[x.date]||{},'km')||0),0);
  const dau=Math.max(0,...runs.map(x=>num(S.log[x.date]||{},'dau')||0));
  const ezHr=runs.filter(x=>['nhe','dai','hoiphuc'].includes(x.loai)).map(x=>[num(S.log[x.date]||{},'hr'),x.hr&&x.hr[1]]).filter(x=>x[0]);
  const cao=ezHr.filter(x=>x[0]>x[1]+2).length;
  let adv;
  if(dau>=4)adv=['bad','Có buổi đau từ 4/10: tuần tới nên giảm còn khoảng 60–70% hoặc nghỉ đến khi hết đau.'];
  else if(cao>=2||dau>=2)adv=['warn','Nhiều buổi nhẹ tim cao hơn vùng, hoặc có đau nhẹ: cân nhắc giảm tuần tới còn khoảng 80%.'];
  else if(xong.length)adv=['ok','Tuần đang ổn. Đi tiếp theo lịch.'];
  const adj=(S.hs.chinh||{})[t.start],au=P.auto&&P.auto[t.start];
  const nxt=P.tuan[t.i+1],auN=P.auto&&nxt&&P.auto[nxt.start];
  const tu=au&&adj===undefined?`<p class="msg warn">Tuần này lịch tự giảm còn ${Math.round(au.f*100)}% vì tuần trước ${esc(au.ly.join(', '))}. <button class="btn sm" data-adj="${t.start}" data-f="1">Giữ nguyên khối lượng</button></p>`
    :au&&adj===1?`<p class="msg info">Bạn đã giữ nguyên khối lượng dù tuần trước ${esc(au.ly.join(', '))}. <button class="btn sm" data-adj="${t.start}" data-f="auto">Áp dụng giảm</button></p>`:'';
  const tuN=auN&&(S.hs.chinh||{})[nxt.start]===undefined?`<p class="msg info">Tuần sau sẽ tự giảm còn ${Math.round(auN.f*100)}% vì tuần này ${esc(auN.ly.join(', '))}.</p>`:'';
  return `<details class="blk" open><summary><h3>Tuần ${t.i+1}</h3><span class="mut">${xong.length}/${runs.length} buổi chạy · ${LC.fmtKm(kmLog)}/${LC.fmtKm(t.km)} km đã ghi</span></summary><div class="blkin">
    <p class="note">${esc(t.ghiChu)}</p>${tu}${tuN||(adv?`<p class="msg ${adv[0]}">${adv[1]}</p>`:'')}
    <div class="row"><span class="mut" style="font-size:14px">Ốm, bận hay mệt:</span>
    ${[1,0.8,0.6].map(f=>`<button class="btn sm" data-adj="${t.start}" data-f="${f}" aria-pressed="${(adj||1)===f}">${f===1?'Tuần này đủ':'Tuần này '+f*100+'%'}</button>`).join('')}
    ${nxt?[0.8].map(f=>`<button class="btn sm" data-adj="${nxt.start}" data-f="${(S.hs.chinh||{})[nxt.start]===f?1:f}">${(S.hs.chinh||{})[nxt.start]===f?'Bỏ giảm tuần sau':'Giảm tuần sau còn 80%'}</button>`).join(''):''}</div></div></details>`;
}

/* ---------- Cả lịch ---------- */
function chart(P){
  const W=900,H=220,pl=34,pr=8,pt=14,pb=26,n=P.N,bw=(W-pl-pr)/n,mx=Math.max(...P.tuan.map(t=>t.km))*1.1||10;
  const y=v=>pt+(H-pt-pb)*(1-v/mx);
  const grid=[0,.25,.5,.75,1].map(f=>{const v=Math.round(mx*f/5)*5;return `<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${y(v)+4}" text-anchor="end">${v}</text>`}).join('');
  const cw=P.byId[TODAY]?P.byId[TODAY].w:-1;
  const bars=P.tuan.map((t,i)=>{const x=pl+i*bw+bw*.15,w=bw*.7,h=y(0)-y(t.km);return `<a href="#/ngay/${t.start}"><rect x="${x}" y="${y(t.km)}" width="${w}" height="${h}" rx="3" fill="var(--c-${t.pha})" opacity="${t.deload?.55:1}"${i===cw?' stroke="var(--ink)" stroke-width="2"':''}><title>Tuần ${i+1}: ${LC.fmtKm(t.km)} km${t.leo?', '+t.leo+' m leo':''}</title></rect></a>${n<=20||i%2===0?`<text x="${x+w/2}" y="${H-8}" text-anchor="middle">${i+1}</text>`:''}`}).join('');
  let line='';
  if(P.X.trail){const ml=Math.max(...P.tuan.map(t=>t.leo))||1,yl=v=>pt+(H-pt-pb)*(1-v/(ml*1.1));line=`<polyline fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="4 3" points="${P.tuan.map((t,i)=>`${pl+i*bw+bw/2},${yl(t.leo)}`).join(' ')}"/>`}
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Khối lượng từng tuần">${grid}${bars}${line}</svg>`;
}
function taiFile(txt,ten,kieu){const b=new Blob([txt],{type:kieu});const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download=ten;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
function xuatIcs(P){
  const e2=x=>String(x).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
  const enc=new TextEncoder(),fold=l=>{const o=[];let c='';for(const ch of l){if(enc.encode(c+ch).length>73){o.push(c);c=' '+ch}else c+=ch}o.push(c);return o.join('\r\n')};
  const st=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z',url=location.href.split('#')[0];
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lich chay ca nhan//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Lịch chạy'];
  for(const d of P.days){
    if(d.date<TODAY||!(d.km||d.loai==='suc'||d.boi))continue;
    const mo=[d.hr?`Nhịp tim ${d.hr[0]}–${d.hr[1]}`:'',d.pace?`Pace ${LC.fmtP(d.pace[0])}–${LC.fmtP(d.pace[1])}/km`:'',...d.buoc,'',url+'#/ngay/'+d.date].filter((x,i)=>x!==''||i>1).join('\n');
    L.push('BEGIN:VEVENT','UID:'+d.date+'@lich-chay-ca-nhan','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+d.date.replace(/-/g,''),'DTEND;VALUE=DATE:'+LC.addD(d.date,1).replace(/-/g,''),'SUMMARY:'+e2(d.ten),'DESCRIPTION:'+e2(mo),'TRANSP:TRANSPARENT','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+e2('Ngày mai: '+d.ten),'TRIGGER:-PT4H','END:VALARM','END:VEVENT');
  }
  L.push('END:VCALENDAR');
  taiFile(L.map(fold).join('\r\n'),'lich-chay.ics','text/calendar');
}
function vLich(P){
  const X=P.X,m=norm(S.hs).muc;
  const ten=X.trail?`Trail ${LC.fmtKm(X.D)} km${X.dPlus?', '+X.dPlus+' m leo':''}`:`Road ${X.D>=42?'marathon 42,2':X.D>=21?'bán marathon 21,1':LC.fmtKm(X.D)} km`;
  let h=`<p class="kick">${ten} · ${m.mucTieu==='thanh-tich'?'cải thiện thành tích':'hoàn thành khoẻ'}${P.ngayDua?' · thi '+dmy(P.ngayDua):''}</p><h2>${P.N} tuần, ${dm(P.batDau)} – ${dmy(P.ketThuc)}</h2>
  <p class="sub">${P.mt?`Mục tiêu ${LC.fmtT(P.mt.T)} (${LC.fmtP(P.mt.pace)}/km). `:''}Cao điểm khoảng ${P.dinh} km mỗi tuần. Chạy ${P.ngayChay.length} buổi: ${P.ngayChay.map(d=>DOW[d]).join(', ')}; chạy dài ${DOWF[P.ngayDai].toLowerCase()}. Bấm vào một tuần để xem từng ngày.</p>`;
  h+=`<p class="row" style="margin:14px 0"><button class="btn" type="button" data-a="ics">Thêm vào lịch điện thoại (.ics)</button><button type="button" class="tip tip-r" data-tip="Tải file lịch các buổi từ hôm nay, mở file trên điện thoại hoặc nhập vào Google Calendar. Mỗi buổi nhắc lúc 20:00 tối hôm trước. Đổi lịch thì tải lại file, các buổi cũ được cập nhật." aria-label="Giải thích xuất lịch">?</button></p>`;
  h+=P.canhBao.map(c=>`<p class="msg ${c[0]}">${esc(c[1])}</p>`).join('');
  h+=chart(P)+`<div class="legend">${['nen','tang','cao','giam','kiem'].filter(p=>P.tuan.some(t=>t.pha===p)).map(p=>`<span><i style="background:var(--c-${p})"></i>${LC.TEN_PHA[p]}</span>`).join('')}<span><i style="background:var(--mut);opacity:.55"></i>Tuần giảm tải</span>${X.trail?'<span>- - - số mét leo</span>':''}</div>`;
  const cw=P.byId[TODAY]?P.byId[TODAY].w:-1;
  h+=`<div class="wks">${P.tuan.map(t=>{
    const ic=t.days.filter(d=>d.km).map(d=>`<span class="${d.loai==='nang'?'q':d.loai==='dai'||d.loai==='dai2'?'l':d.loai==='thi'?'r':''}">${DOW[d.thu]} ${d.loai==='nang'?esc(tenNgan(d.ten)):TAG[d.loai]} ${LC.fmtKm(d.km)}</span>`).join('');
    return `<a class="wk${t.i===cw?' cur':''}" href="#/ngay/${t.i===cw?TODAY:t.start}" style="--c:var(--c-${t.pha})"><span class="n">Tuần ${t.i+1}</span><span><b>${LC.TEN_PHA[t.pha]}${t.deload&&t.pha!=='kiem'?' · giảm tải':''}</b><br><span class="d">${dm(t.start)}–${dm(LC.addD(t.start,6))}${t.leo?' · '+t.leo+' m leo':''}</span></span><span class="k">${LC.fmtKm(t.km)} km</span><span class="ic">${ic}</span></a>`}).join('')}</div>`;
  return h;
}

/* ---------- Vùng tập ---------- */
function vVung(P){
  const Z=P.vung,hr=Z.hr,pc=Z.pace,h0=S.hs;
  let h=`<h2>Vùng tập của bạn</h2><p class="sub">${hr.lthr?`Nhịp tim tính theo nhịp tim ngưỡng ${hr.lthr} (cách của Joe Friel), chính xác hơn tính theo nhịp tối đa.`:`Nhịp tim tính theo công thức Karvonen từ nhịp tim nghỉ ${hr.nghi} và tối đa ${hr.max}${hr.uocMax?' (ước tính theo tuổi, nên đo thật: chạy dốc hết sức 2–3 phút rồi xem số cao nhất)':''}. Nếu biết nhịp tim ngưỡng (LTHR), điền vào Hồ sơ để vùng chính xác hơn.`}</p>
  <table class="zt" style="margin-top:18px"><thead><tr><th>Vùng</th><th>Nhịp tim</th><th>Dùng cho</th></tr></thead><tbody>${hr.z.map((z,i)=>`<tr><td><span class="zsw" style="background:var(--z${i+1})"></span><b>${z[0]}</b> ${z[1]}</td><td><b>${z[2]}–${z[3]}</b></td><td class="mut">${['Đi bộ, chạy hồi phục, khởi động','Phần lớn các buổi chạy: chạy nhẹ, chạy dài','Leo dốc dài, chạy vừa','Chạy ngưỡng (tempo), leo dốc ngắn','Chạy biến tốc ngắn, nước rút'][i]}</td></tr>`).join('')}</tbody></table>`;
  if(pc){
    const src=pc.nguon==='ket-qua'?`kết quả ${LC.fmtKm(+h0.tt.km)} km trong ${esc(h0.tt.tg)}`:`pace chạy nhẹ ${esc(h0.paceNhe)}/km (ước lượng, kém chính xác hơn kết quả chạy hết sức)`;
    h+=`<h3 style="margin-top:32px">Pace (VDOT ${pc.V})</h3><p class="note">Tính từ ${src}. Trời nóng ẩm hoặc đường dốc thì chậm hơn 10–20 giây/km; khi đó theo nhịp tim.${P.X.trail?' Chạy trail tính theo thời gian và nhịp tim; pace dưới đây dùng cho các buổi trên đường bằng.':''}</p>
    <table class="zt"><thead><tr><th>Loại</th><th>Pace mỗi km</th><th>Dùng cho</th></tr></thead><tbody>
    <tr><td>Chạy nhẹ</td><td><b>${LC.fmtP(pc.nhe[0])}–${LC.fmtP(pc.nhe[1])}</b></td><td class="mut">Chạy nhẹ, chạy dài</td></tr>
    <tr><td>Marathon</td><td><b>${LC.fmtP(pc.M)}</b></td><td class="mut">Đoạn pace thi trong chạy dài 42 km</td></tr>
    <tr><td>Bán marathon</td><td><b>${LC.fmtP(pc.HM)}</b></td><td class="mut">Đoạn pace thi trong chạy dài 21 km</td></tr>
    <tr><td>Ngưỡng (T)</td><td><b>${LC.fmtP(pc.T)}</b></td><td class="mut">Chạy tempo</td></tr>
    <tr><td>Interval (I)</td><td><b>${LC.fmtP(pc.I)}</b></td><td class="mut">Lần chạy 3–5 phút</td></tr>
    <tr><td>Reps (R)</td><td><b>${LC.fmtP(pc.R)}</b></td><td class="mut">Lần chạy 200–400 m</td></tr></tbody></table>
    <h3 style="margin-top:32px">Thể lực hiện tại tương đương</h3><p class="note">Nếu đã tập đủ cho cự ly đó. Cự ly dài cần thêm nhiều tuần chạy dài mới đạt.</p>
    <table class="zt"><tbody>${Z.du.map(([k,m])=>`<tr><td>${k>=42?'Marathon':k>=21?'Bán marathon':k+' km'}</td><td><b>${LC.fmtT(m)}</b></td><td class="mut">${LC.fmtP(m*60/k)}/km</td></tr>`).join('')}</tbody></table>`;
  }else h+=`<p class="msg info" style="margin-top:24px">Chưa có pace. Vào <a href="#/ho-so">Hồ sơ</a> điền thời gian một lần chạy 5 km hết sức (hoặc pace chạy nhẹ) để có pace cho từng bài.</p>`;
  if(P.ngayDua)h+=`<h2 style="margin-top:40px">Ngày thi ${dmy(P.ngayDua)}</h2>`+keHoachHtml(P);
  h+=tienBo(P);
  return h;
}

/* Tiến bộ: road và trail theo dõi riêng, chỉ tính các buổi chạy nhẹ/dài đã ghi đủ km, thời gian, nhịp tim. */
function tienBo(P){
  const R={road:[],trail:[]};
  for(const[date,L]of Object.entries(S.log).sort()){const d=dayOf(P,date);if(!EZ.includes(d.loai))continue;const dh=dhOf(d),e=hieuQua(L,dh);if(e)R[dh].push([date,L,e])}
  const bang=(dh,ten,gt)=>{const r=R[dh].slice(-8);if(!r.length)return `<h3 style="margin-top:24px">${ten}</h3><p class="note">Chưa có buổi ${ten.toLowerCase()} nào ghi đủ quãng đường, thời gian và nhịp tim.</p>`;
    const f=r[0][2],l=r[r.length-1][2],ch=Math.round((l-f)/f*100);
    return `<h3 style="margin-top:24px">${ten}</h3><p class="note">${gt}${r.length>1?` Từ ${dm(r[0][0])} đến ${dm(r[r.length-1][0])}: ${ch<0?'giảm '+(-ch)+'%, thể lực đang lên':ch>0?'tăng '+ch+'%, xem lại giấc ngủ, thời tiết, mức mệt':'không đổi'}.`:''}</p>
    <table class="zt"><thead><tr><th>Ngày</th><th>Quãng đường</th>${dh==='trail'?'<th>Leo</th>':'<th>Pace</th>'}<th>Nhịp tim TB</th><th>Nhịp/km${dh==='trail'?' quy đổi':''}</th></tr></thead><tbody>${r.map(([dt,L,e])=>`<tr><td>${dm(dt)}</td><td>${L.km?esc(L.km)+' km':'–'}</td><td>${dh==='trail'?esc(L.leo||'–')+' m':LC.fmtP(paceOf(L))}</td><td>${esc(L.hr)}</td><td><b>${e}</b></td></tr>`).join('')}</tbody></table>`};
  return `<h2 style="margin-top:40px">Tiến bộ</h2><p class="sub">Road và trail theo dõi riêng, vì cùng nhịp tim nhưng trail chậm hơn nhiều do dốc và địa hình. Chỉ tính các buổi chạy nhẹ và chạy dài; số càng thấp là càng khoẻ.</p>`
    +bang('road','Đường bằng','Số nhịp tim cho mỗi km.')+bang('trail','Trail','Số nhịp tim cho mỗi km quy đổi, mỗi 100 m leo tính thêm 1 km.');
}

/* ---------- Hồ sơ ---------- */
let D=null;
const getP=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.'),l=ks.pop();ks.reduce((a,k)=>a[k]=a[k]||{},o)[l]=v};
function vHoSo(moi){
  if(!D)D=JSON.parse(JSON.stringify(S.hs||MAU()));
  const inp=(f,lb,o={})=>`<label class="f" for="f-${f}"><span class="lb">${lb}${o.help?`<button type="button" class="tip" data-tip="${esc(o.help)}" aria-label="${esc(lb+': '+o.help)}">?</button>`:''}</span><input id="f-${f}" data-f="${f}" type="${o.t||'number'}" ${o.t==='date'?`min="${LC.addD(TODAY,7)}"`:'inputmode="'+(o.im||'decimal')+'"'}${o.ph?` placeholder="${o.ph}"`:''} value="${esc(getP(D,f))}"></label>`;
  const seg=(f,opts)=>`<div class="seg" role="group">${opts.map(([v,t])=>`<button type="button" data-seg="${f}" data-v="${v}" aria-pressed="${String(getP(D,f))===String(v)}">${t}</button>`).join('')}</div>`;
  const sel=(f,lb,opts)=>`<label class="f" for="f-${f}"><span class="lb">${lb}</span><select id="f-${f}" data-f="${f}">${opts.map(([v,t])=>`<option value="${v}"${String(getP(D,f))===String(v)?' selected':''}>${t}</option>`).join('')}</select></label>`;
  const m=D.muc,tr=m.loai==='trail';
  let h=moi?`<h1>Lịch chạy theo thể trạng của bạn</h1><p class="sub">Điền vài thông số, trang tạo lịch theo tuần cho road hoặc trail: chạy gì mỗi ngày, ở nhịp tim và pace nào, kèm khởi động, bài sức mạnh, giãn cơ. Chạy xong ghi lại số liệu để nhận nhận xét và chỉnh tuần sau.</p>
    <div class="hero"><div><h3>Theo thể trạng</h3><p>Vùng nhịp tim tính từ nhịp nghỉ và nhịp tối đa của bạn, pace tính từ một kết quả gần đây.</p></div><div><h3>Tăng dần an toàn</h3><p>Khối lượng tăng tối đa khoảng 10% mỗi tuần, có tuần giảm tải, phần lớn là chạy nhẹ.</p></div><div><h3>Road và trail</h3><p>Trail tập theo thời gian và số mét leo, có bài leo dốc, xuống dốc, chạy dài hai ngày liền.</p></div></div>
    <p class="row" style="margin:10px 0 26px"><button class="btn" type="button" data-a="vidu">Điền thử hồ sơ mẫu</button><a class="btn" href="#/huong-dan">Cách dùng</a><span id="dnhint" class="row">${dnHint()}</span></p>`
    :`<h2>Hồ sơ</h2><p class="sub">Cập nhật số liệu sau mỗi lần chạy kiểm tra hoặc thi để lịch tính lại pace và khối lượng. Ghi chép các buổi đã chạy vẫn giữ nguyên.</p><div style="height:20px"></div>`;
  h+=`<form class="form" id="hsf" onsubmit="return false">
  <fieldset><legend>Mục tiêu</legend>
    ${seg('muc.loai',[['road','Road (đường nhựa)'],['trail','Trail (đường mòn, núi)']])}
    <div class="fr">${tr?inp('muc.km','Cự ly (km)',{ph:'25'})+inp('muc.dPlus','Tổng độ cao leo (m)',{ph:'1200',help:'Tổng số mét leo (D+) của giải, ghi trên trang giới thiệu giải.'}):sel('muc.km','Cự ly',[[5,'5 km'],[10,'10 km'],[21.1,'Bán marathon 21,1 km'],[42.2,'Marathon 42,2 km']])}
      ${sel('muc.mucTieu','Mục tiêu',[['hoan-thanh','Hoàn thành khoẻ, không chấn thương'],['thanh-tich','Cải thiện thành tích']])}
      ${!tr&&m.mucTieu==='thanh-tich'?inp('muc.tgMucTieu','Thời gian mục tiêu',{t:'text',im:'numeric',ph:'1:59:00',help:'Ví dụ 1:59:00 cho 21 km, 49:30 cho 10 km. Trang so với thể lực hiện tại để báo mục tiêu có thực tế không.'}):''}</div>
    <div class="row"><label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="muc.coNgay" ${m.coNgay?'checked':''}> Đã có ngày thi</label></div>
    <div class="fr">${m.coNgay?inp('muc.ngay','Ngày thi',{t:'date'}):sel('muc.soTuan','Tập trong bao lâu',[[8,'8 tuần'],[10,'10 tuần'],[12,'12 tuần'],[16,'16 tuần'],[20,'20 tuần'],[24,'24 tuần']])}</div>
    ${tr?'':`<label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="lienTuc" ${D.lienTuc!==false?'checked':''}> Tập liên tục nhiều năm <button type="button" class="tip tip-r" data-tip="Hết lịch (hoặc sau ngày thi) thì trang tự tạo khối tập tiếp theo, dựa trên số liệu trong nhật ký: km mỗi tuần, buổi dài nhất, kết quả chạy hết sức gần nhất. Các khối nối nhau theo chu kỳ nền, tốc độ, sức bền; mỗi vòng khối lượng đỉnh cao hơn vòng trước một chút." aria-label="Giải thích tập liên tục">?</button></label>
    ${D.lienTuc!==false?`<div class="fr">${sel('daiHan.km','Mục tiêu dài hạn',[[5,'5 km'],[10,'10 km'],[21.1,'Bán marathon 21,1 km'],[42.2,'Marathon 42,2 km']])}${inp('daiHan.tg','Thời gian muốn đạt',{t:'text',im:'numeric',ph:'49:59',help:'Mục tiêu trong vài năm tới, ví dụ 10 km dưới 50 phút. Trang Lộ trình dự báo bao giờ có thể đạt. Bỏ trống nếu chỉ muốn tiến bộ dần.'})}</div>`:''}`}
  </fieldset>
  <fieldset><legend>Cơ thể</legend>
    <div class="fr">${inp('tuoi','Tuổi',{im:'numeric'})}${inp('hrNghi','Nhịp tim nghỉ',{im:'numeric',help:'Đo lúc mới thức dậy, chưa ra khỏi giường. Hoặc lấy số "nhịp tim nghỉ" trên đồng hồ.'})}${inp('hrMax','Nhịp tim tối đa',{im:'numeric',help:'Số cao nhất bạn từng thấy khi chạy hết sức. Bỏ trống thì trang ước tính theo tuổi.'})}${inp('hrNguong','Nhịp tim ngưỡng',{im:'numeric',help:'Nếu biết (LTHR): nhịp tim trung bình 20 phút cuối của một lần chạy hết sức 30 phút, hoặc số "ngưỡng lactate" trên đồng hồ Garmin. Có số này thì vùng tim chính xác hơn. Không biết thì bỏ trống.'})}</div>
    ${sel('chanThuong','Chấn thương',[['khong','Không'],['moi-khoi','Vừa khỏi chấn thương, đang chạy lại'],['dang-dau','Đang đau khi chạy']])}
  </fieldset>
  <fieldset><legend>Hiện tại bạn chạy</legend>
    <div class="fr">${inp('hienTai.kmTuan','Km mỗi tuần',{help:'Trung bình 4 tuần gần nhất. Điền 0 nếu chưa chạy.'})}${inp('hienTai.dai','Buổi dài nhất (km)',{help:'Buổi chạy dài nhất trong 4 tuần gần nhất.'})}${sel('hienTai.nam','Đã chạy đều',[[0,'Dưới 1 năm'],[1,'1–3 năm'],[2,'Trên 3 năm']])}</div>
    <p class="help" style="margin:4px 0 0">Kết quả gần đây giúp tính pace. Một lần chạy hết sức trong 3 tháng gần nhất là tốt nhất; không có thì điền pace chạy nhẹ.</p>
    <div class="fr">${sel('tt.km','Kết quả road gần đây',[[3,'3 km'],[5,'5 km'],[10,'10 km'],[21.1,'21,1 km'],[42.2,'42,2 km']])}${inp('tt.tg','Thời gian',{t:'text',im:'numeric',ph:'h:mm:ss hoặc mm:ss'})}${inp('paceNhe','Hoặc pace chạy nhẹ',{t:'text',im:'numeric',ph:'7:30',help:'Phút mỗi km khi chạy nhẹ, vẫn nói chuyện được cả câu.'})}</div>
  </fieldset>
  <fieldset><legend>Thời gian của bạn</legend>
    <div><span class="help" style="display:block;margin-bottom:6px;font-weight:600;color:var(--mut);font-size:13.5px">Ngày có thể chạy</span><div class="dows">${DOW.map((t,i)=>`<label><input type="checkbox" data-dow="${i}" ${D.ngayRanh.includes(i)?'checked':''}> ${t}</label>`).join('')}</div></div>
    <div class="fr">${sel('soBuoi','Số buổi chạy mỗi tuần',[[2,'2 buổi'],[3,'3 buổi'],[4,'4 buổi'],[5,'5 buổi'],[6,'6 buổi']])}${sel('kmMin','Buổi chạy ngắn nhất',[[3,'3 km'],[4,'4 km'],[5,'5 km']])}${sel('tienDo','Tiến độ',[['','Bình thường'],['nhanh','Nhanh hơn']])}${sel('ngayBoi','Bơi hoặc đạp xe',[['','Không'],...DOWF.map((t,i)=>[i,t])])}${sel('ngayDai','Ngày chạy dài',DOWF.map((t,i)=>[i,t]))}${sel('doc','Gần nhà có dốc',[['khong','Không (sẽ dùng cầu thang, máy chạy)'],['it','Có vài dốc'],['nhieu','Có đồi núi']])}</div>
    <label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="ta" ${D.ta?'checked':''}> Có tạ đơn ở nhà</label>
    ${tr?'':`<label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="ketHop" ${D.ketHop?'checked':''}> Cuối tuần chạy dài trên trail <button type="button" class="tip tip-r" data-tip="Cho người chạy cả road lẫn trail: buổi chạy dài mỗi tuần chuyển lên đường mòn, tính theo thời gian và nhịp tim, có số mét leo. Các buổi khác vẫn trên đường bằng." aria-label="Giải thích chạy dài trên trail">?</button></label>`}
  </fieldset>
  <div class="prev" id="prev" aria-live="polite"></div>
  </form>`;
  if(!moi)h+=vGiay()+`<p class="row" style="margin-top:28px"><a class="btn" href="#/du-lieu">Dữ liệu và quyền riêng tư</a><a class="btn" href="#/huong-dan">Hướng dẫn</a></p>`;
  return h;
}
/* Gợi ý đăng nhập trên trang hồ sơ mới; Firebase báo đã đăng nhập sau khi trang vẽ xong nên phải cập nhật lại chỗ này. */
function dnHint(){
  if(!SYNC||!window.FIREBASE_CONFIG)return '';
  if(!user)return '<button class="btn" type="button" data-a="in">Đã có lịch? Đăng nhập Google</button>';
  if(syncSt==='loading'||syncSt==='saving')return `<span class="mut">Đang tải dữ liệu của ${esc(user.email)}…</span>`;
  if(syncSt==='denied')return `<span class="msg warn" style="margin:0">Đã đăng nhập ${esc(user.email)} nhưng máy chủ chưa cho phép lưu. Hồ sơ vẫn lưu trên máy này.</span>`;
  return `<span class="mut">Đã đăng nhập ${esc(user.email)}. Tài khoản này chưa có lịch: điền hồ sơ bên dưới, lịch sẽ lưu vào tài khoản.</span>`;
}
function xemTruoc(){
  const el=$('#prev');if(!el||!D)return;
  const loi=[];
  if(!D.ngayRanh.length)loi.push('Chọn ít nhất 2 ngày có thể chạy.');
  if(D.muc.loai==='trail'&&!(+D.muc.km>0))loi.push('Điền cự ly trail.');
  if(D.muc.coNgay&&!D.muc.ngay)loi.push('Chọn ngày thi, hoặc bỏ tick "Đã có ngày thi".');
  if(D.hienTai.kmTuan==='')loi.push('Điền số km mỗi tuần hiện tại (0 nếu chưa chạy).');
  if(D.tt.tg&&!tgPhut(D.tt.tg))loi.push('Thời gian kết quả chưa đúng dạng, ví dụ 28:45 hoặc 1:02:30.');
  if(D.paceNhe&&!paceGiay(D.paceNhe))loi.push('Pace chạy nhẹ chưa đúng dạng, ví dụ 7:30.');
  if(D.muc.loai==='road'&&D.muc.mucTieu==='thanh-tich'&&D.muc.tgMucTieu&&!tgPhut(D.muc.tgMucTieu))loi.push('Thời gian mục tiêu chưa đúng dạng, ví dụ 1:59:00.');
  if(D.daiHan&&D.daiHan.tg&&!tgPhut(D.daiHan.tg))loi.push('Thời gian mục tiêu dài hạn chưa đúng dạng, ví dụ 49:59.');
  if(D.hrNguong&&(+D.hrNguong<100||+D.hrNguong>210))loi.push('Nhịp tim ngưỡng thường trong khoảng 140–190.');
  const moi=!S.hs;
  let h='';
  if(loi.length)h=`<p class="big">Còn thiếu</p>${loi.map(x=>`<p class="mut" style="margin:2px 0">${esc(x)}</p>`).join('')}`;
  else{
    const P=LC.taoLich(norm(D),moi?TODAY:(S.hs.ngayTao||TODAY));
    const maxDai=Math.max(...P.tuan.flatMap(t=>t.days).filter(d=>d.loai==='dai').map(d=>d.km),0);
    h=`<p class="big">${P.N} tuần, ${dm(P.batDau)} – ${dmy(P.ketThuc)} · cao điểm ${P.dinh} km/tuần · chạy dài tối đa ${LC.fmtKm(maxDai)} km</p>
      ${P.canhBao.filter(c=>c[0]!=='info').map(c=>`<p class="msg ${c[0]}" style="margin:8px 0">${esc(c[1])}</p>`).join('')}`;
  }
  /* Bắt đầu tuần này (từ thứ 2 vừa qua) hoặc thứ 2 tới; hôm nay là thứ 2 thì hai cách như nhau */
  const thu2=LC.addD(TODAY,-LC.thu(TODAY)),nay=thu2!==TODAY,dis=loi.length?' disabled':'';
  h+=`<div class="row" style="margin-top:10px">${moi?`<button class="btn pri" type="button" data-a="tao"${dis}>Tạo lịch${nay?', bắt đầu thứ 2 tới':''}</button>${nay?`<button class="btn" type="button" data-a="tao" data-nay="1"${dis}>Bắt đầu ngay tuần này (từ thứ 2, ${dm(thu2)})</button>`:''}`
    :`<button class="btn pri" type="button" data-a="luu"${dis}>Lưu, giữ ngày bắt đầu</button><button class="btn" type="button" data-a="moi"${dis}>Bắt đầu lịch mới từ thứ 2 tới</button>${nay?`<button class="btn" type="button" data-a="moi" data-nay="1"${dis}>Bắt đầu lịch mới ngay tuần này (từ ${dm(thu2)})</button>`:''}`}</div>`;
  el.innerHTML=h;
}

/* ---------- Tập nhiều năm ---------- */
/* Buổi chạy hết sức: người dùng đánh dấu, hoặc ngày thi / ngày chạy kiểm tra road. */
function hetSuc(d,L){
  if(L.hetSuc!=null&&L.hetSuc!=='')return !!+L.hetSuc;
  if(!((d.loai==='thi'||d.loai==='kiem')&&dhOf(d)==='road'))return false;
  /* ngày thi/kiểm tra: chỉ tính là hết sức khi quãng đường khớp cự ly của buổi đó */
  const k=num(kq(L),'km'),D=d.loai==='thi'?(PLAN&&PLAN.X?PLAN.X.D:d.km):5;return !!k&&Math.abs(k-D)/D<=0.1;
}
const kmNgay=(a,b)=>Object.entries(S.log).filter(([dt])=>dt>a&&dt<=b).reduce((x,[,L])=>x+(num(L,'km')||0),0);
/* Thể lực hiện tại tính từ nhật ký */
function theLuc(P){
  const km4=kmNgay(LC.addD(TODAY,-28),TODAY)/4,km1=kmNgay(LC.addD(TODAY,-7),TODAY);
  const ghi4=Object.keys(S.log).filter(dt=>dt>LC.addD(TODAY,-28)&&dt<=TODAY&&num(S.log[dt],'km')).length;
  const dai8=Math.max(0,...Object.entries(S.log).filter(([dt])=>dt>LC.addD(TODAY,-56)&&dt<=TODAY).map(([,L])=>num(L,'km')||0));
  /* VDOT: kết quả hết sức gần nhất trong 150 ngày */
  /* VDOT: kết quả hết sức tốt nhất trong 90 ngày; không có thì gần nhất trong 150 ngày */
  let V=null;const ds=[];
  for(const[dt,L]of Object.entries(S.log)){
    if(dt<LC.addD(TODAY,-150)||dt>TODAY)continue;const d=dayOf(P,dt),k=num(kq(L),'km'),m=tgPhut(kq(L).tg);
    if(k>=3&&m&&hetSuc(d,L)){const v=LC.vdot(k,m);if(v>15&&v<85)ds.push({V:Math.round(v*10)/10,ngay:dt,km:k,tg:kq(L).tg})}
  }
  const g90=ds.filter(x=>x.ngay>LC.addD(TODAY,-90));
  if(g90.length)V=g90.reduce((a,b)=>b.V>a.V?b:a);else if(ds.length)V=ds.reduce((a,b)=>b.ngay>a.ngay?b:a);
  const pc=P.vung.pace;
  return {km4:Math.round(km4*10)/10,km1:Math.round(km1*10)/10,ghi4,dai8,V,Vho:pc?pc.V:null,acwr:km4>=8?km1/km4:null};
}
/* Kỷ lục cá nhân từ các buổi hết sức */
function kyLuc(P){
  const KL={5:null,10:null,21.1:null,42.2:null};
  for(const[dt,L]of Object.entries(S.log)){const d=dayOf(P,dt),k=num(kq(L),'km'),m=tgPhut(kq(L).tg);if(!k||!m||!hetSuc(d,L))continue;
    for(const D of Object.keys(KL)){if(Math.abs(k-D)/D<=0.03){const t=m*(+D)/k;if(!KL[D]||t<KL[D].t)KL[D]={t,ngay:dt}}}}
  return KL;
}
/* Chu kỳ khối: nền → tốc độ → sức bền (→ marathon khi đủ nền) */
const KHOI={nen:{ten:'Nền sức bền',km:10,N:10,mt:'hoan-thanh'},toc:{ten:'Tốc độ',km:10,N:8,mt:'thanh-tich'},ben:{ten:'Sức bền dài',km:21.1,N:12,mt:'thanh-tich'},mara:{ten:'Marathon',km:42.2,N:16,mt:'hoan-thanh'}};
function chuKy(hs){const g=+((hs.daiHan||{}).km)||10;return g>=42?['nen','toc','ben','mara']:g>=21?['nen','toc','ben']:['nen','toc','nen','ben']}
function khoiTiep(P,lyDo){
  const old=S.hs,t=theLuc(P),ck=chuKy(old);
  let i=old.khoiLoai?(old.khoiSo||0)+1:0;let loai=ck[i%ck.length];
  if(old.muc.coNgay)loai='nen';                                   /* sau giải: về nền */
  if(loai==='mara'&&t.km4<35){loai='ben'}                          /* chưa đủ nền cho marathon */
  const K=KHOI[loai];
  const dinhCu=Math.max(...P.tuan.map(w=>w.km));
  const kmThat=t.ghi4>=4?t.km4:Math.max(...P.tuan.slice(-4).map(w=>w.km))*0.85;   /* ít ghi chép: coi như đã theo lịch */
  const dauGan=Object.entries(S.log).some(([dt,L])=>dt>LC.addD(TODAY,-14)&&(num(L,'dau')||0)>=4);
  const nam0=old.namGoc??(+old.hienTai.nam||0),namTap=(LC.soNgay((old.khoi&&old.khoi[0]?old.khoi[0].tu:old.ngayTao)||TODAY,TODAY))/365;
  const {cu:_c,khoi:_k,thongBao:_t,...snap}=old;
  const hs={...old,muc:{...old.muc,loai:'road',km:loai==='toc'&&+((old.daiHan||{}).km)<=5?5:K.km,dPlus:'',coNgay:false,ngay:'',soTuan:K.N,mucTieu:K.mt,tgMucTieu:''},
    hienTai:{kmTuan:Math.round(kmThat*0.85),dai:Math.round(Math.max(t.dai8,+old.hienTai.dai||0)),nam:Math.min(2,nam0+(namTap>=1?1:0)+(namTap>=3?1:0))},
    tt:t.V?{km:t.V.km,tg:t.V.tg}:old.tt,chanThuong:dauGan?'moi-khoi':'khong',dinhMoi:Math.round(dinhCu*1.08),namGoc:nam0,
    ngayTao:TODAY,chinh:{},cu:[],khoi:[...(old.khoi||[]),{tu:old.ngayTao,den:P.ketThuc,ten:old.khoiTen||'Khối '+((old.khoi||[]).length+1),loai:old.khoiLoai||'',hs:snap}].slice(-12),
    khoiLoai:loai,khoiSo:i,khoiTen:K.ten+' '+(Math.floor(i/ck.length)+1),lienTuc:true,
    thongBao:`${lyDo} Khối mới: ${K.ten} (${K.N} tuần, hướng tới cự ly ${LC.fmtKm(K.km)} km). Tính từ số liệu gần đây: khoảng ${LC.fmtKm(Math.round(kmThat))} km mỗi tuần, buổi dài nhất ${LC.fmtKm(Math.round(Math.max(t.dai8,+old.hienTai.dai||0)))} km${t.V?`, thể lực theo buổi chạy hết sức ngày ${dm(t.V.ngay)} (VDOT ${String(t.V.V).replace('.',',')})`:''}.`};
  S.hs=hs;PLAN=null;save();
}
/* Hết lịch thì tự nối khối mới (chỉ khi bật tập liên tục, road) */
function tuNoi(){
  const P=plan();if(!P||S.hs.lienTuc===false||P.X.trail||TODAY<=P.ketThuc)return false;
  khoiTiep(P,`${S.hs.khoiTen?'Khối "'+S.hs.khoiTen+'"':'Lịch trước'} đã xong ngày ${dmy(P.ketThuc)}.`);return true;
}
/* Dự báo nhiều năm: VDOT tăng nhanh những năm đầu, chậm dần; tập ít thì tăng chậm hơn */
function duBao(P,t){
  const V0=(t.V&&t.V.V)||t.Vho;if(!V0)return null;
  /* Giả định: năm tập thứ y tăng khoảng 7×0,7^y điểm VDOT ở 40 km/tuần; khối lượng tăng khoảng 25%/năm đến 70 km; ít km hơn thì tăng chậm hơn. */
  const nam=+S.hs.hienTai.nam||0,y0=[0.5,1.5,3.5][nam]||1.5,km0=t.km4||+S.hs.hienTai.kmTuan||15;
  const out=[];let V=V0;
  for(let q=0;q<=12;q++){
    if(q){const y=y0+(q-1)/4,vol=Math.min(70,km0*Math.pow(1.25,(q-1)/4)),f=Math.min(1.1,Math.max(0.5,vol/40)),g=Math.max(0.3,7*Math.pow(0.7,y))*f;V+=g/4}
    out.push({q,ngay:LC.addD(TODAY,Math.round(q*91.25)),V:Math.round(V*10)/10,t:[5,10,21.0975,42.195].map(k=>LC.thoiGianDua(V,k))});
  }
  return out;
}
function vLoTrinh(P){
  const t=theLuc(P),KL=kyLuc(P),db=duBao(P,t),dh=S.hs.daiHan||{};
  const card=(lb,v,sub)=>`<div><span>${lb}</span><b>${v}</b>${sub?`<span style="margin-top:2px">${sub}</span>`:''}</div>`;
  const ac=t.acwr;
  let h=`<h2>Lộ trình</h2><p class="sub">Mọi con số ở đây tính từ <b>Nhật ký</b> của bạn (các buổi đã ghi, đã tải file hoặc đã nhập từ Garmin), cộng với kết quả chạy hết sức ở Hồ sơ khi nhật ký chưa có. Có sẵn nhiều năm số liệu trên Garmin thì nhập một lần ở dưới.</p>${nhapBox()}
  <h3 style="margin-top:24px">Thể lực hiện tại</h3><div class="tgt" style="margin-top:10px">
    ${card('Km mỗi tuần (4 tuần qua)',LC.fmtKm(t.km4),t.ghi4?t.ghi4+' buổi đã ghi':'chưa có ghi chép')}
    ${card('Buổi dài nhất (8 tuần)',t.dai8?LC.fmtKm(t.dai8)+' km':'–')}
    ${card('VDOT',String(t.V?t.V.V:(t.Vho||'–')).replace('.',','),t.V?`từ buổi hết sức ${dm(t.V.ngay)}`:t.Vho?'từ hồ sơ':'điền kết quả ở hồ sơ')}
    ${card('Tải tuần này / trung bình',ac?String(Math.round(ac*100)/100).replace('.',','):'–',ac?(ac>1.5?'tăng quá nhanh':ac>1.3?'hơi nhanh':ac<0.7?'đang nghỉ nhiều':'ổn'):'')}
  </div>${ac>1.5?`<p class="msg warn">7 ngày qua chạy ${LC.fmtKm(t.km1)} km, gấp ${String(Math.round(ac*10)/10).replace('.',',')} lần trung bình 4 tuần. Tải tăng quá 1,5 lần là lúc dễ chấn thương nhất; tuần tới nên chạy ít lại.</p>`:''}`;
  if(t.V&&t.Vho&&Math.abs(t.V.V-t.Vho)>=0.5)h+=`<p class="msg info">Kết quả ngày ${dm(t.V.ngay)} cho VDOT ${t.V.V}, khác hồ sơ (${t.Vho}). Khối tiếp theo sẽ tự dùng số mới; muốn dùng ngay thì cập nhật kết quả ở <a href="#/ho-so">Hồ sơ</a>.</p>`;
  /* Khối tập */
  const ds=[...(S.hs.khoi||[]).map(k=>[k.ten,k.tu,k.den,'xong']),[S.hs.khoiTen||'Khối hiện tại',P.batDau,P.ketThuc,'nay']];
  if(S.hs.lienTuc!==false&&!P.X.trail){const ck=chuKy(S.hs);let i=S.hs.khoiLoai?(S.hs.khoiSo||0)+1:0,bd=LC.addD(P.ketThuc,1);for(let n=0;n<3;n++){const K=KHOI[ck[(i+n)%ck.length]];const kt=LC.addD(bd,K.N*7-1);ds.push([K.ten+' (dự kiến)',bd,kt,'sau']);bd=LC.addD(kt,1)}}
  h+=`<h3 style="margin-top:28px">Các khối tập</h3><p class="note">${S.hs.lienTuc!==false&&!P.X.trail?'Hết khối, trang tự tạo khối tiếp theo từ số liệu nhật ký. Mỗi vòng, khối lượng đỉnh cao hơn vòng trước khoảng 8% nếu bạn chạy được.':'Đang tắt tập liên tục: hết lịch thì vào Hồ sơ tạo lịch mới.'}</p>
  <div class="wks">${ds.map(([ten,a,b,k])=>`<div class="wk${k==='nay'?' cur':''}" style="--c:${k==='xong'?'var(--line)':k==='nay'?'var(--trk)':'var(--z2)'};grid-template-columns:1fr auto"><span><b>${esc(ten)}</b><br><span class="d">${dmy(a)} – ${dmy(b)}</span></span><span class="d">${k==='xong'?'Đã xong':k==='nay'?'Đang tập':'Sắp tới'}</span></div>`).join('')}</div>
  ${S.hs.lienTuc!==false&&!P.X.trail?`<p class="row" style="margin-top:12px"><button class="btn" type="button" data-a="khoiMoi">Kết thúc khối này, bắt đầu khối tiếp theo</button></p>`:''}`;
  /* Dự báo */
  if(db){
    const g=+dh.km,gT=tgPhut(dh.tg),gi=[5,10,21.1,42.2].indexOf(g);
    let eta='';if(gT&&gi>=0){const hit=db.find(x=>x.t[gi]<=gT);eta=hit?(hit.q===0?`Mục tiêu ${LC.fmtKm(g)} km dưới ${esc(dh.tg)}: thể lực hiện tại đã đủ, cần sức bền cho cự ly và một ngày chạy tốt.`:`Mục tiêu ${LC.fmtKm(g)} km dưới ${esc(dh.tg)}: nếu tập đều, dự kiến đạt khoảng <b>tháng ${+hit.ngay.slice(5,7)}/${hit.ngay.slice(0,4)}</b>.`):`Mục tiêu ${LC.fmtKm(g)} km dưới ${esc(dh.tg)}: chưa đạt trong 3 năm theo dự báo; vẫn có thể nếu tăng khối lượng nhiều hơn mức giả định.`}
    h+=`<h3 style="margin-top:28px">Dự báo 3 năm</h3><p class="note">Ước tính nếu tập đều và khối lượng tăng dần khoảng 25% mỗi năm (đến khoảng 70 km mỗi tuần): thể lực tăng nhanh những năm đầu rồi chậm dần; chạy ít km thì tăng chậm hơn. Chỉ để định hướng, không phải cam kết. Mỗi lần chạy hết sức và ghi lại, dự báo được tính lại từ số mới.</p>${eta?`<p class="msg info">${eta}</p>`:''}
    <div style="overflow-x:auto"><table class="zt" style="max-width:none"><thead><tr><th>Thời điểm</th><th>VDOT</th><th>5 km</th><th>10 km</th><th>21,1 km</th><th>42,2 km</th></tr></thead><tbody>${db.filter(x=>x.q%2===0).map(x=>`<tr><td>${x.q?'Tháng '+(+x.ngay.slice(5,7))+'/'+x.ngay.slice(0,4):'Hiện tại'}</td><td><b>${String(x.V).replace('.',',')}</b></td>${x.t.map((m,i)=>`<td${gi===i&&gT&&m<=gT?' style="color:var(--ok);font-weight:700"':''}>${fmtGiay(m*60)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }else h+=`<p class="msg info" style="margin-top:24px">Chưa có kết quả chạy hết sức nên chưa dự báo được. Điền ở Hồ sơ, hoặc đánh dấu "chạy hết sức" khi ghi một buổi thi hay chạy kiểm tra.</p>`;
  /* Gợi ý đánh dấu chạy hết sức */
  const gy=goiYHetSuc(P,KL);
  if(gy.length)h+=`<h3 style="margin-top:28px">Buổi nào là chạy hết sức?</h3><p class="note">Đây là các buổi nhanh nhất ở cự ly 5, 10, 21,1 và 42,2 km chưa được đánh dấu. Nếu là giải hoặc buổi chạy kiểm tra, bấm <b>Hết sức</b> để tính thể lực (VDOT), kỷ lục và dự báo. Buổi chạy thường thì bấm <b>Không</b>.</p>
  <div style="overflow-x:auto"><table class="zt" style="max-width:none"><tbody>${gy.map(x=>`<tr><td><a href="${dayOf(P,x.dt).ngoai?'#/ghi/':'#/ngay/'}${x.dt}">${dmy(x.dt)}</a></td><td>${LC.fmtKm(x.D)} km</td><td><b>${fmtGiay(x.t*60)}</b></td><td class="mut">${x.hr?'tim '+esc(x.hr):''}${x.ten?' · '+esc(x.ten):''}</td><td style="white-space:nowrap"><button class="btn sm" type="button" data-hs="${x.dt}" data-v="1">Hết sức</button> <button class="btn sm" type="button" data-hs="${x.dt}" data-v="0">Không</button></td></tr>`).join('')}</tbody></table></div>`;
  /* Kỷ lục */
  h+=`<h3 style="margin-top:28px">Kỷ lục cá nhân</h3><p class="note">Từ các buổi road đánh dấu chạy hết sức, quãng đường lệch không quá 3%.</p><table class="zt"><tbody>${Object.entries(KL).map(([D,x])=>`<tr><td>${D==='42.2'?'Marathon':D==='21.1'?'Bán marathon':D+' km'}</td><td><b>${x?fmtGiay(x.t*60):'–'}</b></td><td class="mut">${x?dmy(x.ngay)+' · '+LC.fmtP(x.t*60/+D)+'/km':''}</td></tr>`).join('')}</tbody></table>`;
  /* Km theo tháng, 24 tháng */
  const th=[];for(let i=23;i>=0;i--){const d=new Date(+TODAY.slice(0,4),+TODAY.slice(5,7)-1-i,1);th.push(LC.ymd(d).slice(0,7))}
  const kmT=th.map(m=>{let r=0,tr=0;for(const[dt,L]of Object.entries(S.log))if(dt.slice(0,7)===m){const k=num(L,'km')||0;if(dhOf(dayOf(P,dt))==='trail')tr+=k;else r+=k}return[r,tr]});
  const mx=Math.max(10,...kmT.map(x=>x[0]+x[1])),W=900,H=200,bw=(W-40)/24,y=v=>14+(H-40)*(1-v/mx);
  h+=`<h3 style="margin-top:28px">Km mỗi tháng</h3><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Km mỗi tháng trong 24 tháng">${[0,.5,1].map(f=>{const v=Math.round(mx*f);return `<line x1="34" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="30" y="${y(v)+4}" text-anchor="end">${v}</text>`}).join('')}${kmT.map(([r,tr],i)=>{const x=40+i*bw+bw*.15,w=bw*.7;return `<rect x="${x}" y="${y(r)}" width="${w}" height="${y(0)-y(r)}" fill="var(--z2)"><title>${th[i]}: đường bằng ${LC.fmtKm(r)} km</title></rect><rect x="${x}" y="${y(r+tr)}" width="${w}" height="${y(r)-y(r+tr)}" fill="var(--z3)"><title>${th[i]}: trail ${LC.fmtKm(tr)} km</title></rect>${i%3===0?`<text x="${x+w/2}" y="${H-8}" text-anchor="middle">${+th[i].slice(5)}/${th[i].slice(2,4)}</text>`:''}`}).join('')}</svg>
  <div class="legend"><span><i style="background:var(--z2)"></i>Đường bằng</span><span><i style="background:var(--z3)"></i>Trail</span></div>`;
  /* Km mỗi năm, khi có hơn 1 năm số liệu */
  const nam={};for(const[dt,L]of Object.entries(S.log)){const k=num(L,'km');if(!k||dt>TODAY)continue;const y=dt.slice(0,4),o=nam[y]||(nam[y]={r:0,t:0,n:0,dai:0});if(dhOf(dayOf(P,dt))==='trail')o.t+=k;else o.r+=k;o.n++;o.dai=Math.max(o.dai,k)}
  const ys=Object.keys(nam).sort();
  if(ys.length>1)h+=`<h3 style="margin-top:28px">Km mỗi năm</h3><table class="zt"><thead><tr><th>Năm</th><th>Tổng</th><th>Đường bằng</th><th>Trail</th><th>Số buổi</th><th>Dài nhất</th></tr></thead><tbody>${ys.reverse().map(y=>{const o=nam[y];return `<tr><td>${y}</td><td><b>${LC.fmtKm(Math.round(o.r+o.t))}</b></td><td>${LC.fmtKm(Math.round(o.r))}</td><td>${LC.fmtKm(Math.round(o.t))}</td><td>${o.n}</td><td>${LC.fmtKm(Math.round(o.dai*10)/10)} km</td></tr>`}).join('')}</tbody></table>`;
  return h;
}

/* ---------- Nhật ký ---------- */
function vNhatKy(P){
  const ds=Object.entries(S.log).filter(([,L])=>L.km||L.tg||L.hr||L.pace).sort((a,b)=>a[0]<b[0]?1:-1);
  const th=TODAY.slice(0,7),thang={road:0,trail:0,n:0};
  for(const[dt,L]of ds)if(dt.slice(0,7)===th){const d=dayOf(P,dt);thang[dhOf(d)]+=num(L,'km')||0;thang.n++}
  let h=`<h2>Nhật ký</h2><p class="sub">Mọi buổi chạy đã ghi, cả trong lịch lẫn ngoài lịch. Tháng này: <b>${LC.fmtKm(thang.road+thang.trail)} km</b> trong ${thang.n} buổi (đường bằng ${LC.fmtKm(thang.road)}, trail ${LC.fmtKm(thang.trail)}).</p>
  <div class="row" style="margin:16px 0 20px"><label class="f" style="max-width:200px">Ghi buổi chạy ngoài lịch<input id="ghiNgay" type="date" max="${TODAY}" value="${TODAY}"></label><button class="btn" type="button" data-a="ghi" style="align-self:flex-end">Ghi</button></div>`;
  if(!ds.length)return h+'<p class="note">Chưa có buổi nào. Chạy xong, mở ngày đó và ghi số liệu hoặc tải file từ đồng hồ.</p>';
  h+=`<div style="overflow-x:auto"><table class="zt" style="max-width:none"><thead><tr><th>Ngày</th><th>Buổi</th><th>Km</th><th>Thời gian</th><th>Pace / leo</th><th>Tim TB</th><th>Đau</th></tr></thead><tbody>${ds.map(([dt,L])=>{const d=dayOf(P,dt),tr=dhOf(d)==='trail',ps=paceOf(L);
    return `<tr><td><a href="${d.ngoai?'#/ghi/':'#/ngay/'}${dt}">${dm(dt)}/${dt.slice(2,4)}</a></td><td>${esc(d.ngoai?'Ngoài lịch':d.them?'Chạy thêm':d.ten)}${tr?' · trail':''}</td><td>${L.km?esc(L.km):'–'}</td><td>${esc(L.tg||'–')}</td><td>${tr?(L.leo?esc(L.leo)+' m':'–'):ps?LC.fmtP(ps):'–'}</td><td>${esc(L.hr||'–')}</td><td>${L.dau!=null&&L.dau!==''?esc(L.dau):'–'}</td></tr>`}).join('')}</tbody></table></div>`;
  return h;
}
function vGhi(P,date){
  if(P.byId[date]){location.replace('#/ngay/'+date);return ''}
  CUR=date;const d=dayOf(P,date);
  return `<p class="kick"><a href="#/nhat-ky">← Nhật ký</a></p><h2>Buổi chạy ngoài lịch</h2><p class="sub">${DOWF[d.thu]}, ${dmy(date)}. Buổi này được tính vào nhật ký, tiến bộ và km của giày, không làm đổi lịch.</p>`
    +(date<=TODAY?sangBox(P,d):'')+logForm(P,d);
}
function vGiay(){
  const ds=S.giay;
  return `<h2 style="margin-top:40px">Giày</h2><p class="sub">Km được cộng từ các buổi đã ghi. Giày chạy thường nên thay sau khoảng 600–800 km, sớm hơn nếu đế mòn lệch hoặc chân bắt đầu đau.</p>
  ${ds.length?`<div class="wks" style="margin-top:14px">${ds.map(g=>{const km=giayKm(g);return `<div class="wk" style="--c:${g.nghi?'var(--line)':km>=800?'var(--z5)':km>=600?'var(--z4)':'var(--z3)'};grid-template-columns:1fr auto"><span><b>${esc(g.ten)}</b>${g.mac&&!g.nghi?' · mặc định':''}${g.nghi?' · đã ngừng dùng':''}<br><span class="d">${km>=800?'Nên thay':km>=600?'Sắp đến lúc thay':'Còn tốt'}</span></span><span class="k">${Math.round(km)} km</span><span class="ic" style="grid-column:1/-1">${!g.mac&&!g.nghi?`<button class="btn sm" type="button" data-giay="${esc(g.id)}" data-op="mac">Đặt mặc định</button>`:''}<button class="btn sm" type="button" data-giay="${esc(g.id)}" data-op="nghi">${g.nghi?'Dùng lại':'Ngừng dùng'}</button><button class="btn sm" type="button" data-giay="${esc(g.id)}" data-op="xoa">Xoá</button></span></div>`}).join('')}</div>`:''}
  <div class="row" style="margin-top:14px;align-items:flex-end"><label class="f" style="max-width:260px">Tên giày<input id="gTen" type="text" placeholder="Ví dụ: Pegasus 41 xanh"></label><label class="f" style="max-width:160px">Đã chạy (km)<input id="gKm" type="number" inputmode="decimal" placeholder="0"></label><button class="btn" type="button" data-a="giayThem">Thêm giày</button></div>`;
}
function vHuongDan(){
  const q=(t,b)=>`<details class="blk"><summary><h3>${t}</h3></summary><div class="blkin">${b}</div></details>`;
  return `<h2>Hướng dẫn</h2><p class="sub">Cách trang tạo lịch, ý nghĩa các con số, và cách dùng hằng ngày.</p><div style="height:12px"></div>`
  +q('Bắt đầu thế nào','<ol class="steps"><li>Vào <a href="#/ho-so">Hồ sơ</a>, điền mục tiêu, nhịp tim, số km hiện tại, một kết quả road gần đây và ngày rảnh. Bấm Tạo lịch.</li><li>Đăng nhập Google nếu muốn mở ở nhiều máy. Không đăng nhập thì dữ liệu chỉ ở trình duyệt này.</li><li>Mỗi sáng mở trang Hôm nay: điền phần Buổi sáng, xem bài của ngày, làm khởi động.</li><li>Chạy xong: tải file từ đồng hồ hoặc gõ số, đọc nhận xét, làm giãn cơ.</li><li>Sau mỗi lần chạy kiểm tra hoặc thi: cập nhật kết quả ở Hồ sơ để pace được tính lại.</li></ol>')
  +q('Lịch được tạo ra sao','<ul class="steps"><li>Chia giai đoạn: nền sức bền, tăng cường, cao điểm, giảm tải trước giải.</li><li>Khối lượng tăng tối đa khoảng 10% mỗi tuần; cứ 4 tuần có 1 tuần giảm khoảng 20%.</li><li>Khoảng 80% thời gian là chạy nhẹ; tối đa 2 bài nặng mỗi tuần, không xếp liền nhau, không sát ngày chạy dài.</li><li>Chạy dài không quá khoảng 1/3 tổng tuần, mỗi lần dài thêm tối đa 2 km.</li><li>Vừa khỏi chấn thương hoặc mới chạy: 4 tuần đầu chỉ chạy nhẹ, tăng chậm hơn.</li><li>Lịch tự giảm tuần sau khi tuần này có đau, tim cao, quá sức, bỏ nhiều buổi hoặc nhiều buổi sáng chưa hồi phục. Bạn có thể bấm giữ nguyên.</li></ul>')
  +q('Tập nhiều năm','<ul class="steps"><li>Bật <b>Tập liên tục nhiều năm</b> ở Hồ sơ (mặc định đã bật cho road) và đặt mục tiêu dài hạn, ví dụ 10 km dưới 50 phút.</li><li>Hết một khối tập (hoặc sau ngày thi), trang tự tạo khối tiếp theo từ nhật ký: km mỗi tuần 4 tuần qua, buổi dài nhất 8 tuần qua, kết quả chạy hết sức tốt nhất 90 ngày qua. Khối mới bắt đầu nhẹ hơn khoảng 15% để hồi phục.</li><li>Các khối nối theo chu kỳ: <b>Nền sức bền</b> (tăng khối lượng, chạy nhẹ) → <b>Tốc độ</b> (biến tốc, 5–10 km) → <b>Sức bền dài</b> (tempo, chạy dài, 21 km); mục tiêu marathon thì thêm khối Marathon khi đã chạy đều trên 35 km mỗi tuần.</li><li>Mỗi vòng, khối lượng đỉnh cao hơn khối trước khoảng 8% nếu bạn đã chạy được. Mỗi khối kết thúc bằng tuần chạy kiểm tra 5 km: ghi lại và tick "chạy hết sức" để thể lực được cập nhật.</li><li>Trang Lộ trình cho thấy thể lực hiện tại, các khối, dự báo 3 năm, kỷ lục và km mỗi tháng. Nếu 7 ngày qua chạy gấp hơn 1,5 lần trung bình 4 tuần, trang cảnh báo vì đó là lúc dễ chấn thương nhất.</li></ul>')
  +q('Các loại buổi chạy','<ul class="steps"><li><b>Chạy nhẹ:</b> vùng 2, nói chuyện được cả câu. Là phần lớn khối lượng, xây nền sức bền.</li><li><b>Chạy hồi phục:</b> chậm nhất tuần, sau ngày chạy dài.</li><li><b>Chạy dài:</b> buổi dài nhất tuần, vẫn ở vùng nhẹ.</li><li><b>Strides:</b> 4–6 lần tăng tốc 20 giây cuối buổi nhẹ, giữ dáng chạy và guồng chân.</li><li><b>Tempo (ngưỡng):</b> nhanh nhưng kiểm soát được, cảm giác 7–8/10, nâng tốc độ chịu được lâu.</li><li><b>Interval:</b> lần chạy 3–5 phút khó, nghỉ bằng thời gian chạy, nâng VO2max.</li><li><b>Chạy lên dốc ngắn:</b> sức mạnh chân mà ít va đập.</li><li><b>Leo dốc (trail):</b> chạy hoặc đi bộ nhanh lên dốc ở vùng 3–4; tập cả hai vì trong giải sẽ dùng cả hai.</li><li><b>Chạy dài hai ngày liền (trail):</b> tập chạy khi chân đã mỏi, như nửa sau giải dài.</li></ul>')
  +q('Ý nghĩa các con số','<ul class="steps"><li><b>Vùng nhịp tim:</b> tính từ nhịp nghỉ và nhịp tối đa (Karvonen), hoặc từ nhịp tim ngưỡng nếu bạn điền.</li><li><b>VDOT:</b> chỉ số thể lực tính từ một kết quả chạy hết sức (Jack Daniels). Từ đó ra pace cho từng loại bài và thời gian dự đoán.</li><li><b>Nhịp tim mỗi km:</b> nhịp tim trung bình × số phút mỗi km. Cùng loại đường mà số này giảm dần là thể lực đang lên. Trail tính trên km quy đổi: mỗi 100 m leo tính thêm 1 km.</li><li><b>Tim trôi:</b> nửa sau buổi chạy tim cao hơn nửa đầu bao nhiêu % ở cùng tốc độ. Dưới 5% là nền sức bền tốt; trên 8% là quá sức, nóng hoặc thiếu nước.</li><li><b>Điểm sương:</b> đo độ oi. Nhiệt độ và điểm sương càng cao, pace càng phải chậm lại.</li></ul>')
  +q('Lấy file từ Garmin','<ol class="steps"><li>Mở connect.garmin.com trên máy tính hoặc trình duyệt điện thoại (ứng dụng Garmin Connect không xuất được file).</li><li>Mở buổi chạy, bấm biểu tượng bánh răng, chọn Export Original (.zip), Export to TCX hoặc Export to GPX.</li><li>Trong trang này, mở ngày đó, bấm Tải file từ đồng hồ hoặc kéo thả file vào khung Sau buổi chạy.</li></ol><p><b>Lấy nhiều năm một lần:</b> trên connect.garmin.com vào Hoạt động → Tất cả hoạt động, lọc Chạy, cuộn xuống đến khi hiện hết các năm, bấm Xuất CSV (Export CSV). Ở trang <a href="#/lo-trinh">Lộ trình</a> bấm Nhập lịch sử từ Garmin và chọn file đó. Cũng chọn được nhiều file .fit, .tcx, .gpx, .zip cùng lúc.</p><p class="note">File chỉ được đọc trên máy bạn; trang không lưu đường chạy.</p>')
  +q('Cài lên điện thoại','<ul class="steps"><li><b>Android (Chrome):</b> mở trang, bấm menu ⋮, chọn Thêm vào màn hình chính hoặc Cài đặt ứng dụng.</li><li><b>iPhone (Safari):</b> bấm nút Chia sẻ, chọn Thêm vào MH chính.</li><li>Sau khi cài, trang mở như ứng dụng và vẫn xem được lịch khi không có mạng; ghi chép sẽ gửi lên tài khoản khi có mạng lại.</li></ul>')
  +q('Giới hạn','<ul class="steps"><li>Lịch tạo theo quy tắc, không thay huấn luyện viên. Bạn hiểu cơ thể mình nhất: đau nhói, chóng mặt, tức ngực thì dừng và đi khám.</li><li>Pace từ "pace chạy nhẹ" kém chính xác hơn pace từ kết quả chạy hết sức.</li><li>Mỗi lúc chỉ theo một mục tiêu chính. Có cả giải road và trail thì chọn giải đến trước.</li></ul>');
}
/* Chuyển dữ liệu từ trang "Lịch tập chạy lại" cũ (cùng trình duyệt) */
function chuyenCu(){
  let o;try{o=JSON.parse(localStorage.getItem('lich-tap-chay-lai-v1'))}catch(e){}
  if(!o||(!o.log&&!o.chk)){alert('Không thấy dữ liệu của trang Lịch tập chạy lại trên trình duyệt này. Mở trang đó trên máy này một lần (đăng nhập nếu có) để nó tải dữ liệu về, rồi bấm lại.');return}
  let n=0,m=0;
  for(const[dt,l]of Object.entries(o.log||{})){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)||!l)continue;const has=['hr','hrmax','pace','cad','walk','pain','nt'].some(k=>l[k]!=null&&l[k]!=='');if(!has)continue;
    const L=S.log[dt]||(S.log[dt]={});if(L.src&&L.src!=='Lịch tập chạy lại')continue;
    Object.assign(L,{hr:l.hr??L.hr,hrmax:l.hrmax??L.hrmax,cad:l.cad??L.cad,pace:l.pace??L.pace,dau:l.pain??L.dau,diBo:l.walk!=null&&l.walk!==''?+l.walk:L.diBo,nt:[l.nt,l.gl?'Garmin: '+l.gl:''].filter(Boolean).join(' · ')||L.nt,src:'Lịch tập chạy lại'});
    Object.keys(L).forEach(k=>{if(L[k]===undefined||L[k]==='')delete L[k]});n++;
  }
  for(const[dt,c]of Object.entries(o.chk||{})){if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)||!c)continue;const x=S.sang[dt]||(S.sang[dt]={});if(c.hr!=null&&c.hr!=='')x.hr=String(c.hr);if(c.hrv!=null&&c.hrv!=='')x.hrv=String(c.hrv);m++}
  save();alert(`Đã chuyển ${n} buổi chạy và ${m} lần kiểm tra buổi sáng. Xem trong Nhật ký.`);location.hash='#/nhat-ky';
}

/* ---------- Dữ liệu ---------- */
function vDuLieu(){
  return `<h2>Dữ liệu và quyền riêng tư</h2>
  <div class="hero"><div><h3>Lưu ở đâu</h3><p>Chưa đăng nhập: chỉ trên trình duyệt này. Đăng nhập Google: thêm một bản trong tài khoản của bạn trên Firebase (Google), để mở ở máy khác.</p></div>
  <div><h3>Ai đọc được</h3><p>Chỉ bạn. Quy tắc máy chủ chỉ cho chính tài khoản đó đọc, ghi dữ liệu của mình. Người khác có link trang cũng chỉ thấy trang trống của họ.</p></div>
  <div><h3>Lưu những gì</h3><p>Hồ sơ bạn điền (tuổi, nhịp tim, mục tiêu, ngày rảnh), số liệu các buổi chạy và ô đánh dấu. Từ file đồng hồ chỉ lấy các con số của buổi chạy, không lưu vị trí hay đường chạy.</p></div></div>
  <p class="msg info">${user?`Đang đăng nhập: <b>${esc(user.email)}</b>.`:'Chưa đăng nhập.'}</p>
  <div class="row"><button class="btn" type="button" data-a="xuat">Tải dữ liệu về máy (JSON)</button><label class="btn" for="nhap">Nhập từ file<input id="nhap" type="file" accept="application/json" hidden></label>
  <button class="btn" type="button" data-a="chuyen">Chuyển từ trang Lịch tập chạy lại</button>
  <button class="btn" type="button" data-a="xoa" style="color:var(--bd)">${user?'Xoá toàn bộ dữ liệu (máy này và tài khoản)':'Xoá dữ liệu trên máy này'}</button></div>
  <h3 style="margin-top:28px">Nhập lịch sử từ Garmin</h3>${nhapBox()}
  <p class="foot">Dùng chung máy với người khác: đăng nhập tài khoản của mình, dùng xong bấm Đăng xuất. Đăng xuất sẽ xoá bản trên máy, dữ liệu vẫn còn trong tài khoản.</p>`;
}

/* ---------- Sự kiện ---------- */
function go(id){const P=plan();location.hash=(P&&P.byId[id]?'#/ngay/':'#/ghi/')+id}
document.addEventListener('click',async ev=>{
  const t=ev.target,a=t.closest('[data-a]');
  const g=t.closest('[data-go]');if(g){if(g.dataset.go)go(g.dataset.go);return}
  const dot=t.closest('.dot');if(dot){const k=dot.dataset.k,i=+dot.dataset.i,v=!isDone(k,i);const arr=S.done[k]||(S.done[k]=[]);arr[i]=v?1:0;if(!v&&!arr.some(Boolean))delete S.done[k];save();dot.setAttribute('aria-pressed',String(v));prog();
    if(k.endsWith(':run')){ttw();const b=document.querySelector(`.day[data-go="${k.slice(0,10)}"]`);if(b){const c=b.querySelector('.ck');if(v&&!c)b.insertAdjacentHTML('afterbegin','<span class="ck">✓</span>');if(!v&&c)c.remove()}}return}
  const dhb=t.closest('[data-dh]');if(dhb){const L=S.log[dhb.dataset.d]||(S.log[dhb.dataset.d]={});const P=plan(),d=dayOf(P,dhb.dataset.d);L.dh=dhb.dataset.dh===d.dh?undefined:dhb.dataset.dh;if(L.dh===undefined)delete L.dh;if(!Object.keys(L).length)delete S.log[dhb.dataset.d];save();const lg=document.querySelector('.log[data-log]');if(lg)keep(()=>{lg.outerHTML=logForm(P,dayOf(P,d.date))});return}
  const hsb=t.closest('[data-hs]');if(hsb){const L=S.log[hsb.dataset.hs];if(L){L.hetSuc=+hsb.dataset.v;save();keep(render)}return}
  const tm=t.closest('.tm');if(tm){startT(tm);return}
  if(t.closest('#rst')){const d=CUR;Object.keys(S.done).forEach(k=>{if(k.startsWith(d+':')&&!k.endsWith(':run'))delete S.done[k]});save();render();return}
  const sg=t.closest('[data-seg]');if(sg){setP(D,sg.dataset.seg,sg.dataset.v);if(sg.dataset.seg==='muc.loai'){D.muc.km=sg.dataset.v==='trail'?'':10;D.muc.dPlus=''}keep(()=>{$('#view').innerHTML=vHoSo(!S.hs);xemTruoc()});return}
  const gy=t.closest('[data-giay]');if(gy){const g=S.giay.find(x=>x.id===gy.dataset.giay);if(!g)return;const op=gy.dataset.op;
    if(op==='mac'){S.giay.forEach(x=>x.mac=x===g)}else if(op==='nghi'){g.nghi=!g.nghi;if(g.nghi)g.mac=false}else if(op==='xoa'){if(!confirm('Xoá giày "'+g.ten+'"? Các buổi đã gắn giày này vẫn giữ.'))return;S.giay=S.giay.filter(x=>x!==g)}
    save();keep(render);return}
  const adj=t.closest('[data-adj]');if(adj){const c=S.hs.chinh||(S.hs.chinh={}),st=adj.dataset.adj,P0=plan();if(adj.dataset.f==='auto')delete c[st];else{const f=+adj.dataset.f;if(f===1&&!(P0.auto&&P0.auto[st]))delete c[st];else c[st]=f}save();keep(render);return}
  if(!a)return;
  switch(a.dataset.a){
    case 'in':SYNC&&SYNC.signIn();break;
    case 'out':if(confirm('Đăng xuất? Dữ liệu trên máy này sẽ được xoá; dữ liệu trong tài khoản vẫn giữ.')){await SYNC.signOut();S=trong();save();D=null;PLAN=null;location.hash='#/';render()}break;
    case 'vidu':D=VIDU();keep(()=>{$('#view').innerHTML=vHoSo(true);xemTruoc()});break;
    case 'tao':S.hs={...D,ngayTao:a.dataset.nay?LC.addD(TODAY,-LC.thu(TODAY)):TODAY};D=null;save();location.hash='#/';render();window.scrollTo(0,0);break;
    case 'luu':{const old=S.hs,P0=plan(),cut=LC.addD(TODAY,-LC.thu(TODAY));let cu=(old.cu||[]).slice();
      if(P0&&cut>P0.batDau&&cut<=P0.ketThuc){const{cu:_,...o}=old;cu.push({den:cut,hs:o});cu=cu.slice(-8)}
      S.hs={...D,ngayTao:old.ngayTao||TODAY,cu,khoi:old.khoi,khoiLoai:old.khoiLoai,khoiSo:old.khoiSo,khoiTen:old.khoiTen,namGoc:old.namGoc,dinhMoi:old.dinhMoi};D=null;PLAN=null;save();location.hash='#/lich';break}
    case 'moi':{const bd=a.dataset.nay?LC.addD(TODAY,-LC.thu(TODAY)):TODAY;if(confirm(a.dataset.nay?'Tạo lịch mới bắt đầu ngay tuần này (từ thứ 2, '+dm(bd)+')? Ghi chép cũ vẫn giữ trong Nhật ký.':'Tạo lịch mới bắt đầu từ thứ 2 tới? Ghi chép cũ vẫn giữ trong Nhật ký.')){const old=S.hs,{cu:_c,khoi:_k,thongBao:_t,...snap}=old;S.hs={...D,ngayTao:bd,chinh:{},cu:[],dinhMoi:0,khoiLoai:'',khoiSo:0,khoiTen:'',khoi:[...(old.khoi||[]),{tu:old.ngayTao,den:plan().ketThuc,ten:old.khoiTen||'Khối trước',loai:old.khoiLoai||'',hs:snap}].slice(-12)};D=null;PLAN=null;save();location.hash='#/lich'}break}
    case 'ics':xuatIcs(plan());break;
    case 'ghi':{const v=($('#ghiNgay')||{}).value;if(v)go(v);break}
    case 'giayThem':{const ten=($('#gTen').value||'').trim();if(!ten){$('#gTen').focus();break}const g={id:'g'+Date.now().toString(36),ten,kmDau:+($('#gKm').value||0)||0,mac:!S.giay.some(x=>!x.nghi)};S.giay.push(g);save();keep(render);break}
    case 'chuyen':chuyenCu();break;
    case 'tbXong':delete S.hs.thongBao;save();keep(render);break;
    case 'khoiMoi':if(confirm('Kết thúc khối đang tập và tạo khối tiếp theo từ số liệu nhật ký? Các tuần còn lại của khối này sẽ bỏ.')){khoiTiep(plan(),'Bạn đã bắt đầu khối mới sớm.');location.hash='#/lich'}break;
    case 'xuat':taiFile(JSON.stringify({ung_dung:'lich-chay-ca-nhan',xuat_luc:new Date().toISOString(),...S,anim:undefined},null,1),'lich-chay-'+TODAY+'.json','application/json');break;
    case 'xoa':if(confirm(user?'Xoá vĩnh viễn hồ sơ, lịch và mọi ghi chép trong tài khoản và trên máy này? Không hoàn tác được.':'Xoá hồ sơ và ghi chép trên máy này?')){
      try{if(user)await SYNC.wipe()}catch(e){alert('Không xoá được trên máy chủ: '+(e.code||e.message)+'. Thử lại khi có mạng.');break}
      S=trong();try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}D=null;PLAN=null;location.hash='#/';render()}break;
  }
});
/* Giữ vị trí cuộn khi vẽ lại */
function keep(fn){const y=scrollY;fn();window.scrollTo(0,y)}
document.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.id==='nhieu'&&t.files.length){nhapNhieu([...t.files]);t.value='';return}
  if(t.dataset.ff&&t.files[0]){napFile(t.files[0],t.dataset.ff);t.value='';return}
  if(t.id==='nhap'&&t.files[0]){t.files[0].text().then(x=>{try{const d=JSON.parse(x);if(!d||typeof d!=='object'||!('hs' in d))throw 0;if(!confirm('Thay dữ liệu hiện tại bằng dữ liệu trong file?'))return;S={...trong(),hs:d.hs,log:d.log||{},done:d.done||{},sang:d.sang||{},giay:d.giay||[],anim:S.anim};save();PLAN=null;D=null;location.hash='#/';render()}catch(e){alert('File không đúng định dạng.')}});return}
  if(t.dataset.l&&(t.tagName==='SELECT'||t.type==='checkbox')){luuLog(t);return}
  if(t.dataset.sang&&t.tagName==='SELECT'){t.dispatchEvent(new Event('input',{bubbles:true}));return}
  if(t.dataset.dow!=null){const i=+t.dataset.dow;D.ngayRanh=t.checked?[...new Set([...D.ngayRanh,i])].sort():D.ngayRanh.filter(x=>x!==i);xemTruoc();return}
  if(t.dataset.f&&D&&t.closest('#hsf')){
    if(t.type==='checkbox'){setP(D,t.dataset.f,t.checked);keep(()=>{$('#view').innerHTML=vHoSo(!S.hs);xemTruoc()});return}
    if(t.tagName==='SELECT'){setP(D,t.dataset.f,t.value);if(t.dataset.f==='muc.mucTieu')keep(()=>{$('#view').innerHTML=vHoSo(!S.hs);xemTruoc()});else xemTruoc()}
  }
});
let tPrev=null,tTt=null;
function luuLog(t){
  const L=S.log[t.dataset.l]||(S.log[t.dataset.l]={});L[t.dataset.f]=t.type==='checkbox'?(t.checked?1:0):t.value;
  if(t.dataset.f!=='giay'&&!L.giay&&giayMac()&&(L.km||L.tg))L.giay=giayMac().id;
  if(!Object.entries(L).some(([k,v])=>k!=='giay'&&v!==''&&v!=null))delete S.log[t.dataset.l];
  save();const rv=$('#rv'),P=plan(),d=P&&dayOf(P,t.dataset.l);if(rv&&d)rv.innerHTML=review(P,d);clearTimeout(tTt);tTt=setTimeout(ttw,400);
}
document.addEventListener('dragover',ev=>{const lg=ev.target.closest&&ev.target.closest('.log[data-log]');if(lg){ev.preventDefault();lg.classList.add('drop')}});
document.addEventListener('dragleave',ev=>{const lg=ev.target.closest&&ev.target.closest('.log');if(lg&&!lg.contains(ev.relatedTarget))lg.classList.remove('drop')});
document.addEventListener('drop',ev=>{const lg=ev.target.closest&&ev.target.closest('.log[data-log]');if(!lg)return;ev.preventDefault();lg.classList.remove('drop');const f=ev.dataTransfer.files[0],inp=lg.querySelector('[data-ff]');if(f&&inp)napFile(f,inp.dataset.ff)});
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset.l&&t.tagName!=='SELECT'&&t.type!=='checkbox'){luuLog(t);return}
  if(t.dataset.sang){const x=S.sang[t.dataset.sang]||(S.sang[t.dataset.sang]={});x[t.dataset.f]=t.value;if(!Object.values(x).some(v=>v!==''&&v!=null))delete S.sang[t.dataset.sang];save();const P=plan(),d=P.byId[t.dataset.sang]||dayOf(P,t.dataset.sang),k=$('#sangkq'),n=$('#sangnhan');if(k)k.innerHTML=sangText(P,d);if(n)n.textContent=SANG_NHAN[sangKQ(d.date)[0]];clearTimeout(tTt);tTt=setTimeout(ttw,400);return}
  if(t.dataset.troi){const w=troiLay();w[t.dataset.troi]=t.value;try{localStorage.setItem('lcn-troi',JSON.stringify(w))}catch(e){}const P=plan(),k=$('#nongkq');if(k)k.innerHTML=nongText(dayOf(P,CUR));return}
  if(t.dataset.f&&D&&t.closest('#hsf')&&t.tagName==='INPUT'&&t.type!=='checkbox'){setP(D,t.dataset.f,t.value);clearTimeout(tPrev);tPrev=setTimeout(xemTruoc,250)}
});
window.addEventListener('hashchange',()=>{if(location.hash!=='#/ho-so'&&location.hash!=='#/du-lieu')D=null;Object.keys(TM).forEach(stopT);render();if(!/^#\/ngay\//.test(location.hash))window.scrollTo(0,0)});
/* Cài lên điện thoại, mở được khi không có mạng */
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});

/* Bấm giờ (giống trang Bài tập bổ trợ) */
const TM={};let AC=null;
function stopT(k){const t=TM[k];if(!t)return;clearInterval(t.iv);try{t.o&&t.o.stop()}catch(e){}delete TM[k];const b=document.querySelector(`.tm[data-k="${k}"]`);if(b){b.classList.remove('run');b.textContent='Bấm giờ '+b.dataset.t+'s'}}
function startT(b){
  const k=b.dataset.k,s=+b.dataset.t;if(TM[k]){stopT(k);return}
  let o=null;
  try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.resume)AC.resume();o=AC.createOscillator();const g=AC.createGain(),t0=AC.currentTime+s;o.frequency.value=880;g.gain.setValueAtTime(0.0001,AC.currentTime);g.gain.setValueAtTime(0.3,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+0.6);o.connect(g);g.connect(AC.destination);o.start();o.stop(t0+0.7)}catch(e){o=null}
  const end=Date.now()+s*1000;b.classList.add('run');b.textContent=s+'s';
  TM[k]={o,iv:setInterval(()=>{
    const left=Math.max(0,Math.ceil((end-Date.now())/1000)),btn=document.querySelector(`.tm[data-k="${k}"]`);
    if(btn&&left>0){btn.textContent=left+'s';btn.classList.add('run')}
    if(left<=0){clearInterval(TM[k].iv);delete TM[k];try{navigator.vibrate&&navigator.vibrate(300)}catch(e){}
      const n=BT.E[k.slice(11)].sets,a=S.done[k]||[];for(let i=0;i<n;i++){if(!a[i]){const arr=S.done[k]||(S.done[k]=[]);arr[i]=1;save();const d=document.querySelector(`.dot[data-k="${k}"][data-i="${i}"]`);if(d)d.setAttribute('aria-pressed','true');prog();break}}
      if(btn){btn.classList.remove('run');btn.textContent='Xong';setTimeout(()=>{if(!TM[k]){const x=document.querySelector(`.tm[data-k="${k}"]`);if(x)x.textContent='Bấm giờ '+s+'s'}},2500)}}
  },200)};
}

acct();render();
})();
