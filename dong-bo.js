/* Đồng bộ tiến độ tập (đánh dấu hiệp, ghi chép, mức tạ) giữa các máy qua Firebase.
   - Dùng chung tài khoản Google với trang "Kế hoạch nhà mình" (cùng địa chỉ trang nên đăng nhập một lần là đủ).
   - Lưu ở Firestore: habits/<khoa>_<uid>, nội dung là chuỗi JSON trong trường s, số phiên bản trong trường v.
     Collection habits đã được Rules cho phép; trang Kế hoạch chỉ đọc các mục hieu_<ngày>/vo_<ngày> nên bỏ qua mục này.
   - Chưa đăng nhập hoặc mất mạng: vẫn lưu trên máy (localStorage), đăng nhập lại sẽ gửi lên.
   Cách dùng trong trang:
     const SYNC=window.DongBo&&DongBo.start({key,btn,get:()=>S,apply:d=>{...},local:['anim']});
     và gọi SYNC.changed() mỗi khi lưu. */
(function(){
'use strict';
const FB='https://www.gstatic.com/firebasejs/10.12.2/';
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
/* Gộp hai bản: giữ mọi khoá của cả hai, trùng khoá thì b thắng. */
function merge(a,b){if(!isObj(a)||!isObj(b))return b===undefined?a:b;const o={...a};for(const k of Object.keys(b))o[k]=merge(a[k],b[k]);return o}
const LABEL={
  loading:['Đồng bộ: đang kết nối…','Đang kết nối tới Firebase.'],
  out:['Đăng nhập Google để lưu lên mạng','Hiện chỉ lưu trên máy này. Đăng nhập để mở ở máy khác vẫn thấy đánh dấu.'],
  ok:['Đã đồng bộ','Đánh dấu được lưu lên tài khoản Google, mở ở máy khác vẫn thấy. Bấm để đăng xuất.'],
  saving:['Đang lưu lên mạng…','Đang gửi thay đổi lên Firebase.'],
  slow:['Chưa kết nối được, đang lưu trên máy','Mạng chặn kết nối tới Firebase (hay gặp ở mạng công ty). Đánh dấu vẫn lưu trên máy này và sẽ gửi lên khi kết nối được. Bấm để thử lại.'],
  err:['Lỗi đồng bộ, bấm để thử lại','Không đọc được dữ liệu trên Firebase. Đánh dấu vẫn lưu trên máy này.'],
  denied:['Tài khoản này chưa có quyền, bấm để đổi','Email này chưa nằm trong Firestore rules. Đăng nhập bằng tài khoản Google đã được cấp quyền.'],
  nolib:['Không tải được Firebase, đang lưu trên máy','Kiểm tra mạng rồi tải lại trang.']
};

window.DongBo={start(o){
  const MK=o.key+'-dongbo';                 /* {uid, v, dirty} của máy này */
  let M={};try{M=JSON.parse(localStorage.getItem(MK))||{}}catch(e){}
  const saveM=()=>{try{localStorage.setItem(MK,JSON.stringify(M))}catch(e){}};
  const btn=o.btn;
  let st='',U=null,F=null,auth=null,fs=null,ref=null,uid=null,email='',unsub=null,timer=null,slowT=null,gen=0,applying=false,lastJSON=null,waiting=null;

  const show=s=>{st=s;if(!btn)return;btn.hidden=false;btn.textContent=LABEL[s][0];btn.title=LABEL[s][1]+(s==='ok'&&email?' ('+email+')':'');btn.dataset.st=s};
  const pick=()=>{const d=JSON.parse(JSON.stringify(o.get()||{}));(o.local||[]).forEach(k=>delete d[k]);return d};
  const typing=()=>{const a=document.activeElement;return !!a&&(a.tagName==='TEXTAREA'||a.tagName==='SELECT'||(a.tagName==='INPUT'&&!/^(checkbox|radio|button)$/.test(a.type)))};
  function apply(d){applying=true;try{o.apply(d)}finally{applying=false}}

  async function push(){
    clearTimeout(timer);timer=null;
    if(!ref||!M.dirty)return;
    const s=JSON.stringify(pick());
    if(s===lastJSON){M.dirty=false;saveM();show('ok');return}
    const g=gen,v=(M.v||0)+1,r=ref;
    show('saving');
    try{
      await F.setDoc(r,{s,v,t:Date.now()});
      if(r!==ref)return;
      M.v=v;M.uid=uid;lastJSON=s;if(g===gen)M.dirty=false;saveM();
      show(M.dirty?'saving':'ok');if(M.dirty)push();
    }catch(e){if(r!==ref)return;show(e&&e.code==='permission-denied'?'denied':'err')}
  }

  function onSnap(snap){
    if(snap.metadata.hasPendingWrites||snap.metadata.fromCache)return;
    clearTimeout(slowT);
    if(typing()){waiting=snap;return}
    if(!snap.exists()){M.uid=uid;M.v=0;M.dirty=true;saveM();push();return}
    const r=snap.data()||{};let data;try{data=JSON.parse(r.s)}catch(e){show('err');return}
    if(!isObj(data)){show('err');return}
    const loc=pick(),rs=JSON.stringify(data);
    if(rs===JSON.stringify(loc)){M.uid=uid;M.v=r.v||0;lastJSON=rs;if(!timer)M.dirty=false;saveM();show('ok');return}
    if(M.uid===uid&&(r.v||0)===M.v){lastJSON=rs;if(M.dirty)push();else show('ok');return}
    /* Bản trên mạng đã đổi ở máy khác (hoặc máy này mới đăng nhập lần đầu). */
    let next;
    if(M.uid!==uid)next=merge(loc,data);            /* máy mới: lấy bản trên mạng, giữ thêm những gì máy này có */
    else if(M.dirty)next=merge(data,loc);           /* cả hai cùng sửa: thay đổi chưa gửi của máy này thắng */
    else next=data;                                 /* máy này không sửa gì: lấy nguyên bản trên mạng */
    apply(next);
    M.uid=uid;M.v=r.v||0;lastJSON=rs;
    M.dirty=JSON.stringify(pick())!==rs;saveM();
    if(M.dirty)push();else show('ok');
  }

  function sub(){
    if(unsub){try{unsub()}catch(e){}unsub=null}
    clearTimeout(slowT);
    if(!uid||!F)return;
    ref=F.doc(fs,'habits',o.key+'_'+uid);
    show('loading');
    slowT=setTimeout(()=>{if(st==='loading')show('slow')},12000);
    unsub=F.onSnapshot(ref,{includeMetadataChanges:true},onSnap,e=>{clearTimeout(slowT);show(e&&e.code==='permission-denied'?'denied':'err')});
  }

  document.addEventListener('focusout',()=>{if(waiting)setTimeout(()=>{if(waiting&&!typing()){const s=waiting;waiting=null;onSnap(s)}},0)});
  if(btn)btn.addEventListener('click',()=>{
    if(!U)return;
    if(st==='ok'||st==='saving'){
      if(confirm('Đang đồng bộ bằng tài khoản '+(email||'Google')+'.\nĐăng xuất? (Trang Kế hoạch nhà mình cũng sẽ đăng xuất.) Đánh dấu vẫn giữ trên máy này.'))U.signOut(auth);
      return;
    }
    if(st==='slow'||st==='err'){sub();return}
    if(st==='loading')return;
    const prov=new U.GoogleAuthProvider();prov.setCustomParameters({prompt:'select_account'});
    U.signInWithPopup(auth,prov).catch(e=>{
      if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'))return U.signInWithRedirect(auth,prov);
      if(e&&(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'))return;
      alert('Không đăng nhập được: '+((e&&e.code)||e));
    });
  });

  (async()=>{
    const cfg=window.FIREBASE_CONFIG;
    if(!cfg||!cfg.apiKey||/DIEN_/.test(cfg.apiKey)){if(btn)btn.hidden=true;return}
    show('loading');
    let A;
    try{[A,U,F]=await Promise.all([import(FB+'firebase-app.js'),import(FB+'firebase-auth.js'),import(FB+'firebase-firestore.js')])}
    catch(e){U=null;show('nolib');return}
    const app=A.initializeApp(cfg);auth=U.getAuth(app);
    /* Long polling: mạng công ty hay chặn kết nối streaming của Firestore. Không bật bộ nhớ đệm IndexedDB vì máy đã có localStorage. */
    try{fs=F.initializeFirestore(app,{experimentalForceLongPolling:true})}catch(e){fs=F.getFirestore(app)}
    U.onAuthStateChanged(auth,u=>{
      uid=u?u.uid:null;email=u?(u.email||''):'';ref=null;lastJSON=null;waiting=null;
      if(!u){if(unsub){try{unsub()}catch(e){}unsub=null}clearTimeout(slowT);show('out');return}
      sub();
    });
  })();

  return {changed(){
    if(applying)return;
    gen++;M.dirty=true;saveM();
    if(ref&&st!=='denied'){clearTimeout(timer);timer=setTimeout(push,700)}
  }};
}};
})();
