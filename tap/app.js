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
const trong=()=>({hs:null,log:{},done:{}});

let S;
try{S=JSON.parse(localStorage.getItem(K))||trong()}catch(e){S=trong()}
S.log=S.log||{};S.done=S.done||{};
let user=null,syncSt='';
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}if(SYNC)SYNC.changed()};
const SYNC=window.DongBo?DongBo.start({key:'tap',col:'runners',rieng:true,trong,get:()=>S,local:['anim'],
  apply:d=>{const a=S.anim;S={...trong(),...d};if(a!==undefined)S.anim=a;try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}PLAN=null;render()},
  onAuth:u=>{user=u;acct();if(location.hash==='#/du-lieu')render()},
  onState:s=>{syncSt=s;acct()}}):null;

/* ---------- Lịch (tạo lại khi hồ sơ đổi) ---------- */
let PLAN=null,PLANKEY='',CUR=TODAY;
function plan(){
  if(!S.hs)return null;
  const k=JSON.stringify(S.hs);
  if(!PLAN||k!==PLANKEY){PLAN=LC.taoLich(norm(S.hs),S.hs.ngayTao||TODAY);PLANKEY=k;
    PLAN.days=PLAN.tuan.flatMap(t=>t.days.map(d=>Object.assign(d,{w:t.i})));PLAN.byId=Object.fromEntries(PLAN.days.map(d=>[d.date,d]));}
  return PLAN;
}
/* Hồ sơ trong form (chuỗi) → số cho bộ tạo lịch */
const tgPhut=s=>{if(!s)return 0;const p=String(s).trim().split(/[:.']/).map(Number);if(p.some(isNaN))return 0;return p.length===3?p[0]*60+p[1]+p[2]/60:p.length===2?p[0]+p[1]/60:p[0]};
const paceGiay=s=>{if(!s)return 0;const m=String(s).trim().match(/^(\d{1,2})\s*[:.'’]\s*(\d{1,2})$/);return m?+m[1]*60+ +m[2]:0};
function norm(h){
  const n=x=>x===''||x==null?'':+x;
  return {tuoi:n(h.tuoi),hrNghi:n(h.hrNghi),hrMax:n(h.hrMax),
    muc:{loai:h.muc.loai,km:+h.muc.km||10,dPlus:+h.muc.dPlus||0,ngay:h.muc.coNgay?h.muc.ngay:'',soTuan:+h.muc.soTuan||12,mucTieu:h.muc.mucTieu},
    hienTai:{kmTuan:+h.hienTai.kmTuan||0,dai:+h.hienTai.dai||0,nam:+h.hienTai.nam||0},
    thanhTich:h.tt&&h.tt.tg?{km:+h.tt.km,phut:tgPhut(h.tt.tg)}:null,paceNhe:paceGiay(h.paceNhe),
    chanThuong:h.chanThuong,ngayRanh:h.ngayRanh,soBuoi:+h.soBuoi,ngayDai:+h.ngayDai,doc:h.doc,ta:!!h.ta,chinh:h.chinh||{}};
}
const MAU=()=>({ten:'',tuoi:'',hrNghi:'',hrMax:'',muc:{loai:'road',km:10,dPlus:'',coNgay:false,ngay:'',soTuan:12,mucTieu:'hoan-thanh'},
  hienTai:{kmTuan:'',dai:'',nam:1},tt:{km:5,tg:''},paceNhe:'',chanThuong:'khong',ngayRanh:[1,3,5,6],soBuoi:4,ngayDai:6,doc:'it',ta:false,chinh:{}});
const VIDU=()=>({...MAU(),tuoi:34,hrNghi:58,hrMax:'',muc:{loai:'road',km:21.1,dPlus:'',coNgay:false,ngay:'',soTuan:14,mucTieu:'hoan-thanh'},hienTai:{kmTuan:20,dai:10,nam:1},tt:{km:5,tg:'29:30'}});

/* ---------- Tài khoản ---------- */
function acct(){
  const el=$('#acct');if(!el)return;
  if(!SYNC||!window.FIREBASE_CONFIG){el.innerHTML='<span class="st">Lưu trên máy này</span>';return}
  const lab={loading:'Đang kết nối…',saving:'Đang lưu…',ok:'Đã lưu lên tài khoản',slow:'Chưa kết nối được, đang lưu trên máy',err:'Lỗi đồng bộ',denied:'Máy chủ chưa cho phép lưu',nolib:'Không tải được thư viện đăng nhập'}[syncSt]||'';
  el.innerHTML=user?`<span class="st" title="${esc(user.email)}">${esc(lab)}</span><button class="hb" data-a="out" type="button">Đăng xuất</button>`
    :`<span class="st">${syncSt==='nolib'?esc(lab):'Chưa đăng nhập, chỉ lưu trên máy này'}</span><button class="hb solid" data-a="in" type="button">Đăng nhập Google</button>`;
}

/* ---------- Khung ---------- */
const TABS=[['#/','Hôm nay'],['#/lich','Cả lịch'],['#/vung','Vùng tập'],['#/ho-so','Hồ sơ']];
function route(){const h=location.hash||'#/';const m=h.match(/^#\/ngay\/(\d{4}-\d{2}-\d{2})$/);return m?{v:'ngay',d:m[1]}:{v:{'#/':'ngay','#/lich':'lich','#/vung':'vung','#/ho-so':'ho-so','#/du-lieu':'du-lieu'}[h]||'ngay'}}
function render(){
  const r=route(),P=plan();
  const cur=r.v==='ngay'?'#/':'#/'+({lich:'lich',vung:'vung','ho-so':'ho-so','du-lieu':'ho-so'}[r.v]);
  $('#tabs').innerHTML=TABS.map(([h,t])=>`<a href="${h}"${h===cur?' aria-current="page"':''}>${t}</a>`).join('');
  let h;
  if(r.v==='du-lieu')h=vDuLieu();
  else if(!P||r.v==='ho-so')h=vHoSo(!P);
  else if(r.v==='lich')h=vLich(P);
  else if(r.v==='vung')h=vVung(P);
  else h=vNgay(P,r.d);
  $('#view').innerHTML=h;
  if(r.v==='ho-so'||!P)xemTruoc();
  prog();
}

/* ---------- Ngày ---------- */
const TAG={nghi:'Nghỉ',nhe:'Nhẹ',hoiphuc:'Hồi phục',dai:'Dài',dai2:'Vừa',nang:'Nặng',suc:'Sức mạnh',thi:'Thi',kiem:'Kiểm tra'};
const CLR={nghi:'var(--line)',nhe:'var(--z2)',hoiphuc:'var(--z1)',dai:'var(--z3)',dai2:'var(--z3)',nang:'var(--z4)',suc:'var(--mut)',thi:'var(--z5)',kiem:'var(--z5)'};
const daChay=d=>!!(S.done[d.date+':run']||[])[0];
function strip(P,w,sel){
  const t=P.tuan[w];
  return `<div class="wkbar"><button class="nv" data-go="${w>0?P.tuan[w-1].start:''}" aria-label="Tuần trước"${w===0?' disabled':''}>‹</button>
    <span class="t">Tuần ${w+1}/${P.N} · ${dm(t.start)}–${dm(LC.addD(t.start,6))} · ${LC.fmtKm(t.km)} km${t.leo?' · '+t.leo+' m leo':''}</span>
    <button class="nv" data-go="${w<P.N-1?P.tuan[w+1].start:''}" aria-label="Tuần sau"${w===P.N-1?' disabled':''}>›</button>
    ${P.byId[TODAY]&&P.byId[TODAY].w!==w?'<button class="nv td" data-go="'+TODAY+'">Hôm nay</button>':''}</div>
  <div class="strip">${t.days.map(d=>`<button class="day" data-go="${d.date}" aria-pressed="${d.date===sel}" style="--c:${CLR[d.loai]}" aria-label="${DOWF[d.thu]} ${dm(d.date)}: ${esc(d.ten)}">${d.date===TODAY?'<span class="tdot"></span>':''}${d.km&&daChay(d)?'<span class="ck">✓</span>':''}<b>${DOW[d.thu]}</b><span class="dn">${+d.date.slice(8)}</span><i>${TAG[d.loai]}${d.km?'<br>'+LC.fmtKm(d.km):''}</i></button>`).join('')}</div>`;
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
  let h=note+(d.w===0&&id<=P.tuan[0].days[6].date?warn:'')+strip(P,d.w,id);
  const chips=[];
  if(d.km)chips.push(LC.fmtKm(d.km)+' km');
  if(d.phut)chips.push('khoảng '+LC.fmtT(d.phut));
  if(d.leo)chips.push(d.leo+' m leo');
  chips.push(LC.TEN_PHA[t.pha]+(t.deload&&t.pha!=='kiem'?' · giảm tải':''));
  const coBai=d.bt&&(d.bt.kd||d.bt.gc||d.bt.sm||d.bt.core);
  h+=`<div class="dhead"><div><p class="kick">${DOWF[d.thu]}, ${dmy(d.date)}${d.date===TODAY?' · hôm nay':''}</p><h2>${esc(d.ten)}</h2><div class="chips">${chips.map(c=>`<span>${esc(c)}</span>`).join('')}</div></div>
    ${coBai?`<div class="row"><span class="prog num" id="pg" style="font-size:22px;font-weight:700"></span><button class="btn sm" id="rst" type="button">Bỏ đánh dấu</button></div>`:''}</div>`;
  const tg=[];
  if(d.hr)tg.push(['Nhịp tim',`${d.hr[0]}–${d.hr[1]}`]);
  if(d.pace)tg.push(['Pace',`${LC.fmtP(d.pace[0])}–${LC.fmtP(d.pace[1])}/km`]);
  if(d.loai==='nhe'||d.loai==='dai'||d.loai==='dai2'||d.loai==='hoiphuc')tg.push(['Vượt mức này thì chậm lại',String(P.vung.hr.tran)]);
  if(tg.length)h+=`<div class="tgt">${tg.map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>`;
  h+=`<ol class="steps">${d.buoc.map(b=>`<li>${esc(b)}</li>`).join('')}</ol>`;

  /* Bài tập kèm theo */
  const blk=(id2,title,sub,keys,mini,open)=>`<details class="blk"${open?' open':''}><summary><h3>${title}</h3><span class="mut">${sub}</span></summary><div class="blkin">${mini?`<div class="minis">${mini.map(k=>miniCard(d.date,k)).join('')}</div>`:''}<div class="grid">${keys.map(k=>exCard(d.date,k)).join('')}</div></div></details>`;
  if(d.bt.kd){const ks=d.loai==='nang'?['swing','lswing','hipc','march','aski','butt']:['swing','lswing','hipc','march'];h+=blk('kd','Trước khi chạy: khởi động','8–10 phút',ks,['warm'],d.date===TODAY&&!daChay(d))}
  if(d.km&&d.loai!=='suc')h+=logForm(P,d);
  if(d.bt.core)h+=blk('core','Core','15 phút, sau buổi chạy hoặc buổi tối',BT.SES.find(s=>s.id==='core').ex,null,false);
  if(d.bt.sm){const ks=d.bt.sm==='trail'?['stepdown','llunge','slrdl','calf1','hike','bal']:BT.SES.find(s=>s.id===d.bt.sm).ex;
    h+=blk('sm',d.bt.sm==='ta'?'Sức mạnh với tạ':d.bt.sm==='trail'?'Sức mạnh cho trail':'Sức mạnh không tạ',d.bt.sm==='ta'?'35–40 phút':'25–30 phút',ks,null,d.loai==='suc')}
  if(d.bt.gc)h+=blk('gc','Sau khi chạy: giãn cơ','8–10 phút, khi cơ còn ấm',['calfst','quad','hams','hipf','fig4'],null,daChay(d));
  if(d.loai==='suc'||d.bt.sm||d.bt.core)h+=`<p class="note" style="margin-top:12px">Thêm bài và bài thay thế: <a href="../bai-tap-bo-tro.html">Thư viện bài bổ trợ</a>.</p>`;
  h+=`<div id="ttw">${tuanTomTat(P,t)}</div>`;
  return h;
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
  const L=S.log[d.date]||{},key=d.date+':run',fields=[...LF];
  if(P.X.trail)fields.splice(2,0,['leo','Số mét leo',1]);
  const f=fields.map(([k,lb,n,ph])=>`<label class="f" for="l-${k}">${lb}<input id="l-${k}" data-l="${d.date}" data-f="${k}" type="${n?'number':'text'}" inputmode="${n?'decimal':'numeric'}"${ph?` placeholder="${ph}"`:''} value="${esc(L[k])}"></label>`).join('');
  return `<div class="log"><div class="row" style="justify-content:space-between"><h3>Sau buổi chạy</h3><button class="dot wide" data-k="${key}" data-i="0" aria-pressed="${isDone(key,0)}">${d.loai==='thi'?'Đã thi xong':'Đã chạy xong'}</button></div>
    <p class="hint">Lấy số trên đồng hồ hoặc ứng dụng chạy. Guồng chân: lấy của các km chạy liên tục, vì số trung bình cả buổi bị các đoạn đi bộ kéo xuống.</p>
    <div class="lg">${f}<label class="f w" for="l-nt">Ghi chú<input id="l-nt" data-l="${d.date}" data-f="nt" type="text" placeholder="Cảm giác, chỗ mỏi, thời tiết, đường chạy" value="${esc(L.nt)}"></label></div>
    <div class="rv" id="rv">${review(P,d)}</div></div>`;
}
const num=(L,k)=>{const v=L[k];if(v===''||v==null)return null;const x=+String(v).replace(',','.');return isFinite(x)?x:null};
function paceOf(L){const k=num(L,'km'),m=tgPhut(L.tg);return k&&m?m*60/k:null}
function bpk(L){const h=num(L,'hr'),p=paceOf(L);return h&&p?Math.round(h*p/60):null}
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
  const b=bpk(L);
  if(b&&nhe&&!P.X.trail){
    const prev=[...P.days].reverse().find(x=>x.date<d.date&&['nhe','dai','hoiphuc'].includes(x.loai)&&bpk(S.log[x.date]||{}));
    let t=`Mỗi km tốn khoảng ${b} nhịp tim (nhịp tim TB × số phút mỗi km). Số này giảm dần là thể lực đang lên.`;
    if(prev){const pb=bpk(S.log[prev.date]),ch=(b-pb)/pb*100;t+=` Buổi ${dm(prev.date)}: ${pb}.`;
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
  const adj=(S.hs.chinh||{})[t.start];
  const nxt=P.tuan[t.i+1];
  return `<details class="blk" open><summary><h3>Tuần ${t.i+1}</h3><span class="mut">${xong.length}/${runs.length} buổi chạy · ${LC.fmtKm(kmLog)}/${LC.fmtKm(t.km)} km đã ghi</span></summary><div class="blkin">
    <p class="note">${esc(t.ghiChu)}</p>${adv?`<p class="msg ${adv[0]}">${adv[1]}</p>`:''}
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
function vLich(P){
  const X=P.X,m=norm(S.hs).muc;
  const ten=X.trail?`Trail ${LC.fmtKm(X.D)} km${X.dPlus?', '+X.dPlus+' m leo':''}`:`Road ${X.D>=42?'marathon 42,2':X.D>=21?'bán marathon 21,1':LC.fmtKm(X.D)} km`;
  let h=`<p class="kick">${ten} · ${m.mucTieu==='thanh-tich'?'cải thiện thành tích':'hoàn thành khoẻ'}${P.ngayDua?' · thi '+dmy(P.ngayDua):''}</p><h2>${P.N} tuần, ${dm(P.batDau)} – ${dmy(P.ketThuc)}</h2>
  <p class="sub">Cao điểm khoảng ${P.dinh} km mỗi tuần. Chạy ${P.ngayChay.length} buổi: ${P.ngayChay.map(d=>DOW[d]).join(', ')}; chạy dài ${DOWF[P.ngayDai].toLowerCase()}. Bấm vào một tuần để xem từng ngày.</p>`;
  h+=P.canhBao.map(c=>`<p class="msg ${c[0]}">${esc(c[1])}</p>`).join('');
  h+=chart(P)+`<div class="legend">${['nen','tang','cao','giam','kiem'].filter(p=>P.tuan.some(t=>t.pha===p)).map(p=>`<span><i style="background:var(--c-${p})"></i>${LC.TEN_PHA[p]}</span>`).join('')}<span><i style="background:var(--mut);opacity:.55"></i>Tuần giảm tải</span>${X.trail?'<span>- - - số mét leo</span>':''}</div>`;
  const cw=P.byId[TODAY]?P.byId[TODAY].w:-1;
  h+=`<div class="wks">${P.tuan.map(t=>{
    const ic=t.days.filter(d=>d.km).map(d=>`<span class="${d.loai==='nang'?'q':d.loai==='dai'||d.loai==='dai2'?'l':d.loai==='thi'?'r':''}">${DOW[d.thu]} ${d.loai==='nang'?esc(d.ten.split(' (')[0]):TAG[d.loai]} ${LC.fmtKm(d.km)}</span>`).join('');
    return `<a class="wk${t.i===cw?' cur':''}" href="#/ngay/${t.i===cw?TODAY:t.start}" style="--c:var(--c-${t.pha})"><span class="n">Tuần ${t.i+1}</span><span><b>${LC.TEN_PHA[t.pha]}${t.deload&&t.pha!=='kiem'?' · giảm tải':''}</b><br><span class="d">${dm(t.start)}–${dm(LC.addD(t.start,6))}${t.leo?' · '+t.leo+' m leo':''}</span></span><span class="k">${LC.fmtKm(t.km)} km</span><span class="ic">${ic}</span></a>`}).join('')}</div>`;
  return h;
}

/* ---------- Vùng tập ---------- */
function vVung(P){
  const Z=P.vung,hr=Z.hr,pc=Z.pace,h0=S.hs;
  let h=`<h2>Vùng tập của bạn</h2><p class="sub">Nhịp tim tính theo công thức Karvonen từ nhịp tim nghỉ ${hr.nghi} và tối đa ${hr.max}${hr.uocMax?' (ước tính theo tuổi, nên đo thật: chạy dốc hết sức 2–3 phút rồi xem số cao nhất)':''}.</p>
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
  return h;
}

/* ---------- Hồ sơ ---------- */
let D=null;
const getP=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.'),l=ks.pop();ks.reduce((a,k)=>a[k]=a[k]||{},o)[l]=v};
function vHoSo(moi){
  if(!D)D=JSON.parse(JSON.stringify(S.hs||MAU()));
  const inp=(f,lb,o={})=>`<label class="f" for="f-${f}">${lb}${o.help?` <span class="help">${o.help}</span>`:''}<input id="f-${f}" data-f="${f}" type="${o.t||'number'}" ${o.t==='date'?`min="${LC.addD(TODAY,7)}"`:'inputmode="'+(o.im||'decimal')+'"'}${o.ph?` placeholder="${o.ph}"`:''} value="${esc(getP(D,f))}"></label>`;
  const seg=(f,opts)=>`<div class="seg" role="group">${opts.map(([v,t])=>`<button type="button" data-seg="${f}" data-v="${v}" aria-pressed="${String(getP(D,f))===String(v)}">${t}</button>`).join('')}</div>`;
  const sel=(f,lb,opts)=>`<label class="f" for="f-${f}">${lb}<select id="f-${f}" data-f="${f}">${opts.map(([v,t])=>`<option value="${v}"${String(getP(D,f))===String(v)?' selected':''}>${t}</option>`).join('')}</select></label>`;
  const m=D.muc,tr=m.loai==='trail';
  let h=moi?`<h1>Lịch chạy theo thể trạng của bạn</h1><p class="sub">Điền vài thông số, trang tạo lịch theo tuần cho road hoặc trail: chạy gì mỗi ngày, ở nhịp tim và pace nào, kèm khởi động, bài sức mạnh, giãn cơ. Chạy xong ghi lại số liệu để nhận nhận xét và chỉnh tuần sau.</p>
    <div class="hero"><div><h3>Theo thể trạng</h3><p>Vùng nhịp tim tính từ nhịp nghỉ và nhịp tối đa của bạn, pace tính từ một kết quả gần đây.</p></div><div><h3>Tăng dần an toàn</h3><p>Khối lượng tăng tối đa khoảng 10% mỗi tuần, có tuần giảm tải, phần lớn là chạy nhẹ.</p></div><div><h3>Road và trail</h3><p>Trail tập theo thời gian và số mét leo, có bài leo dốc, xuống dốc, chạy dài hai ngày liền.</p></div></div>
    <p class="row" style="margin:10px 0 26px"><button class="btn" type="button" data-a="vidu">Điền thử hồ sơ mẫu</button>${!user&&SYNC?'<button class="btn" type="button" data-a="in">Đã có lịch? Đăng nhập Google</button>':''}</p>`
    :`<h2>Hồ sơ</h2><p class="sub">Cập nhật số liệu sau mỗi lần chạy kiểm tra hoặc thi để lịch tính lại pace và khối lượng. Ghi chép các buổi đã chạy vẫn giữ nguyên.</p><div style="height:20px"></div>`;
  h+=`<form class="form" id="hsf" onsubmit="return false">
  <fieldset><legend>Mục tiêu</legend>
    ${seg('muc.loai',[['road','Road (đường nhựa)'],['trail','Trail (đường mòn, núi)']])}
    <div class="fr">${tr?inp('muc.km','Cự ly (km)',{ph:'25'})+inp('muc.dPlus','Tổng độ cao leo (m)',{ph:'1200',help:'D+ của giải'}):sel('muc.km','Cự ly',[[5,'5 km'],[10,'10 km'],[21.1,'Bán marathon 21,1 km'],[42.2,'Marathon 42,2 km']])}
      ${sel('muc.mucTieu','Mục tiêu',[['hoan-thanh','Hoàn thành khoẻ, không chấn thương'],['thanh-tich','Cải thiện thành tích']])}</div>
    <div class="row"><label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="muc.coNgay" ${m.coNgay?'checked':''}> Đã có ngày thi</label></div>
    <div class="fr">${m.coNgay?inp('muc.ngay','Ngày thi',{t:'date'}):sel('muc.soTuan','Tập trong bao lâu',[[8,'8 tuần'],[10,'10 tuần'],[12,'12 tuần'],[16,'16 tuần'],[20,'20 tuần'],[24,'24 tuần']])}</div>
  </fieldset>
  <fieldset><legend>Cơ thể</legend>
    <div class="fr">${inp('tuoi','Tuổi',{im:'numeric'})}${inp('hrNghi','Nhịp tim nghỉ',{im:'numeric',help:'lúc mới thức dậy, hoặc số "nhịp tim nghỉ" trên đồng hồ'})}${inp('hrMax','Nhịp tim tối đa',{im:'numeric',help:'nếu biết; bỏ trống thì ước tính theo tuổi'})}</div>
    ${sel('chanThuong','Chấn thương',[['khong','Không'],['moi-khoi','Vừa khỏi chấn thương, đang chạy lại'],['dang-dau','Đang đau khi chạy']])}
  </fieldset>
  <fieldset><legend>Hiện tại bạn chạy</legend>
    <div class="fr">${inp('hienTai.kmTuan','Km mỗi tuần',{help:'trung bình 4 tuần gần nhất, 0 nếu chưa chạy'})}${inp('hienTai.dai','Buổi dài nhất (km)',{help:'trong 4 tuần gần nhất'})}${sel('hienTai.nam','Đã chạy đều',[[0,'Dưới 1 năm'],[1,'1–3 năm'],[2,'Trên 3 năm']])}</div>
    <p class="help" style="margin:4px 0 0">Kết quả gần đây giúp tính pace. Một lần chạy hết sức trong 3 tháng gần nhất là tốt nhất; không có thì điền pace chạy nhẹ.</p>
    <div class="fr">${sel('tt.km','Kết quả gần đây: cự ly',[[3,'3 km'],[5,'5 km'],[10,'10 km'],[21.1,'21,1 km'],[42.2,'42,2 km']])}${inp('tt.tg','Thời gian',{t:'text',im:'numeric',ph:'h:mm:ss hoặc mm:ss'})}${inp('paceNhe','Hoặc pace chạy nhẹ',{t:'text',im:'numeric',ph:'7:30',help:'phút/km, lúc nói chuyện được'})}</div>
  </fieldset>
  <fieldset><legend>Thời gian của bạn</legend>
    <div><span class="help" style="display:block;margin-bottom:6px;font-weight:600;color:var(--mut);font-size:13.5px">Ngày có thể chạy</span><div class="dows">${DOW.map((t,i)=>`<label><input type="checkbox" data-dow="${i}" ${D.ngayRanh.includes(i)?'checked':''}> ${t}</label>`).join('')}</div></div>
    <div class="fr">${sel('soBuoi','Số buổi chạy mỗi tuần',[[2,'2 buổi'],[3,'3 buổi'],[4,'4 buổi'],[5,'5 buổi'],[6,'6 buổi']])}${sel('ngayDai','Ngày chạy dài',DOWF.map((t,i)=>[i,t]))}${sel('doc','Gần nhà có dốc',[['khong','Không (sẽ dùng cầu thang, máy chạy)'],['it','Có vài dốc'],['nhieu','Có đồi núi']])}</div>
    <label class="row" style="gap:8px;font-weight:600"><input type="checkbox" data-f="ta" ${D.ta?'checked':''}> Có tạ đơn ở nhà</label>
  </fieldset>
  <div class="prev" id="prev" aria-live="polite"></div>
  </form>`;
  if(!moi)h+=`<p class="row" style="margin-top:28px"><a class="btn" href="#/du-lieu">Dữ liệu và quyền riêng tư</a></p>`;
  return h;
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
  const moi=!S.hs;
  let h='';
  if(loi.length)h=`<p class="big">Còn thiếu</p>${loi.map(x=>`<p class="mut" style="margin:2px 0">${esc(x)}</p>`).join('')}`;
  else{
    const P=LC.taoLich(norm(D),moi?TODAY:(S.hs.ngayTao||TODAY));
    const maxDai=Math.max(...P.tuan.flatMap(t=>t.days).filter(d=>d.loai==='dai').map(d=>d.km),0);
    h=`<p class="big">${P.N} tuần, ${dm(P.batDau)} – ${dmy(P.ketThuc)} · cao điểm ${P.dinh} km/tuần · chạy dài tối đa ${LC.fmtKm(maxDai)} km</p>
      ${P.canhBao.filter(c=>c[0]!=='info').map(c=>`<p class="msg ${c[0]}" style="margin:8px 0">${esc(c[1])}</p>`).join('')}`;
  }
  h+=`<div class="row" style="margin-top:10px">${moi?`<button class="btn pri" type="button" data-a="tao"${loi.length?' disabled':''}>Tạo lịch</button>`
    :`<button class="btn pri" type="button" data-a="luu"${loi.length?' disabled':''}>Lưu, giữ ngày bắt đầu</button><button class="btn" type="button" data-a="moi"${loi.length?' disabled':''}>Bắt đầu lịch mới từ thứ 2 tới</button>`}</div>`;
  el.innerHTML=h;
}

/* ---------- Dữ liệu ---------- */
function vDuLieu(){
  return `<h2>Dữ liệu và quyền riêng tư</h2>
  <div class="hero"><div><h3>Lưu ở đâu</h3><p>Chưa đăng nhập: chỉ trên trình duyệt này. Đăng nhập Google: thêm một bản trong tài khoản của bạn trên Firebase (Google), để mở ở máy khác.</p></div>
  <div><h3>Ai đọc được</h3><p>Chỉ bạn. Quy tắc máy chủ chỉ cho chính tài khoản đó đọc, ghi dữ liệu của mình. Người khác có link trang cũng chỉ thấy trang trống của họ.</p></div>
  <div><h3>Lưu những gì</h3><p>Hồ sơ bạn điền (tuổi, nhịp tim, mục tiêu, ngày rảnh), số liệu các buổi chạy và ô đánh dấu. Không lưu vị trí, không lấy dữ liệu từ đồng hồ.</p></div></div>
  <p class="msg info">${user?`Đang đăng nhập: <b>${esc(user.email)}</b>.`:'Chưa đăng nhập.'}</p>
  <div class="row"><button class="btn" type="button" data-a="xuat">Tải dữ liệu về máy (JSON)</button><label class="btn" for="nhap">Nhập từ file<input id="nhap" type="file" accept="application/json" hidden></label>
  <button class="btn" type="button" data-a="xoa" style="color:var(--bd)">${user?'Xoá toàn bộ dữ liệu (máy này và tài khoản)':'Xoá dữ liệu trên máy này'}</button></div>
  <p class="foot">Dùng chung máy với người khác: đăng nhập tài khoản của mình, dùng xong bấm Đăng xuất. Đăng xuất sẽ xoá bản trên máy, dữ liệu vẫn còn trong tài khoản.</p>`;
}

/* ---------- Sự kiện ---------- */
function go(id){location.hash='#/ngay/'+id}
document.addEventListener('click',async ev=>{
  const t=ev.target,a=t.closest('[data-a]');
  const g=t.closest('[data-go]');if(g){if(g.dataset.go)go(g.dataset.go);return}
  const dot=t.closest('.dot');if(dot){const k=dot.dataset.k,i=+dot.dataset.i,v=!isDone(k,i);const arr=S.done[k]||(S.done[k]=[]);arr[i]=v?1:0;if(!v&&!arr.some(Boolean))delete S.done[k];save();dot.setAttribute('aria-pressed',String(v));prog();
    if(k.endsWith(':run')){ttw();const b=document.querySelector(`.day[data-go="${k.slice(0,10)}"]`);if(b){const c=b.querySelector('.ck');if(v&&!c)b.insertAdjacentHTML('afterbegin','<span class="ck">✓</span>');if(!v&&c)c.remove()}}return}
  const tm=t.closest('.tm');if(tm){startT(tm);return}
  if(t.closest('#rst')){const d=CUR;Object.keys(S.done).forEach(k=>{if(k.startsWith(d+':')&&!k.endsWith(':run'))delete S.done[k]});save();render();return}
  const sg=t.closest('[data-seg]');if(sg){setP(D,sg.dataset.seg,sg.dataset.v);if(sg.dataset.seg==='muc.loai'){D.muc.km=sg.dataset.v==='trail'?'':10;D.muc.dPlus=''}keep(()=>{$('#view').innerHTML=vHoSo(!S.hs);xemTruoc()});return}
  const adj=t.closest('[data-adj]');if(adj){const c=S.hs.chinh||(S.hs.chinh={});const f=+adj.dataset.f;if(f===1)delete c[adj.dataset.adj];else c[adj.dataset.adj]=f;save();keep(render);return}
  if(!a)return;
  switch(a.dataset.a){
    case 'in':SYNC&&SYNC.signIn();break;
    case 'out':if(confirm('Đăng xuất? Dữ liệu trên máy này sẽ được xoá; dữ liệu trong tài khoản vẫn giữ.')){await SYNC.signOut();S=trong();save();D=null;PLAN=null;location.hash='#/';render()}break;
    case 'vidu':D=VIDU();keep(()=>{$('#view').innerHTML=vHoSo(true);xemTruoc()});break;
    case 'tao':S.hs={...D,ngayTao:TODAY};D=null;save();location.hash='#/';render();window.scrollTo(0,0);break;
    case 'luu':S.hs={...D,ngayTao:S.hs.ngayTao||TODAY};D=null;save();location.hash='#/lich';break;
    case 'moi':if(confirm('Tạo lịch mới bắt đầu từ thứ 2 tới? Ghi chép cũ vẫn giữ theo ngày.')){S.hs={...D,ngayTao:TODAY,chinh:{}};D=null;save();location.hash='#/lich'}break;
    case 'xuat':{const b=new Blob([JSON.stringify({ung_dung:'lich-chay-ca-nhan',xuat_luc:new Date().toISOString(),...S,anim:undefined},null,1)],{type:'application/json'});const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download='lich-chay-'+TODAY+'.json';l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);break}
    case 'xoa':if(confirm(user?'Xoá vĩnh viễn hồ sơ, lịch và mọi ghi chép trong tài khoản và trên máy này? Không hoàn tác được.':'Xoá hồ sơ và ghi chép trên máy này?')){
      try{if(user)await SYNC.wipe()}catch(e){alert('Không xoá được trên máy chủ: '+(e.code||e.message)+'. Thử lại khi có mạng.');break}
      S=trong();try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}D=null;PLAN=null;location.hash='#/';render()}break;
  }
});
/* Giữ vị trí cuộn khi vẽ lại */
function keep(fn){const y=scrollY;fn();window.scrollTo(0,y)}
document.addEventListener('change',ev=>{
  const t=ev.target;
  if(t.id==='nhap'&&t.files[0]){t.files[0].text().then(x=>{try{const d=JSON.parse(x);if(!d||typeof d!=='object'||!('hs' in d))throw 0;if(!confirm('Thay dữ liệu hiện tại bằng dữ liệu trong file?'))return;S={...trong(),hs:d.hs,log:d.log||{},done:d.done||{},anim:S.anim};save();PLAN=null;D=null;location.hash='#/';render()}catch(e){alert('File không đúng định dạng.')}});return}
  if(t.dataset.dow!=null){const i=+t.dataset.dow;D.ngayRanh=t.checked?[...new Set([...D.ngayRanh,i])].sort():D.ngayRanh.filter(x=>x!==i);xemTruoc();return}
  if(t.dataset.f&&D&&t.closest('#hsf')){
    if(t.type==='checkbox'){setP(D,t.dataset.f,t.checked);keep(()=>{$('#view').innerHTML=vHoSo(!S.hs);xemTruoc()});return}
    if(t.tagName==='SELECT'){setP(D,t.dataset.f,t.value);xemTruoc()}
  }
});
let tPrev=null,tTt=null;
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.dataset.l){const L=S.log[t.dataset.l]||(S.log[t.dataset.l]={});L[t.dataset.f]=t.value;if(!Object.values(L).some(v=>v!==''&&v!=null))delete S.log[t.dataset.l];save();const rv=$('#rv'),P=plan(),d=P&&P.byId[t.dataset.l];if(rv&&d)rv.innerHTML=review(P,d);clearTimeout(tTt);tTt=setTimeout(ttw,400);return}
  if(t.dataset.f&&D&&t.closest('#hsf')&&t.tagName==='INPUT'&&t.type!=='checkbox'){setP(D,t.dataset.f,t.value);clearTimeout(tPrev);tPrev=setTimeout(xemTruoc,250)}
});
window.addEventListener('hashchange',()=>{if(location.hash!=='#/ho-so'&&location.hash!=='#/du-lieu')D=null;Object.keys(TM).forEach(stopT);render();if(!/^#\/ngay\//.test(location.hash))window.scrollTo(0,0)});

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
