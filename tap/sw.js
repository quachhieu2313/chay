/* Cho phép cài lên điện thoại và mở khi không có mạng.
   - File của trang: lấy bản mới trên mạng trước, mất mạng thì dùng bản đã lưu.
   - Thư viện Firebase, phông chữ: dùng bản đã lưu (tên file có số phiên bản, không đổi).
   - Không đụng tới các yêu cầu đăng nhập và Firestore. */
const V='lcn-v8';
const GOC=['./','index.html','app.js','lich.js','doc-file.js','../bai-tap-data.js','../dong-bo.js','../firebase-config.js','manifest.webmanifest','icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(GOC)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match(new URL('index.html',self.registration.scope).href):undefined))));
    return;
  }
  if(u.host==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/')||u.host==='fonts.googleapis.com'||u.host==='fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})));
  }
});
