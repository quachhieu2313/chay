/* Thư viện bài tập dùng chung: hình người que chuyển động (F), nội dung bài (E), buổi mẫu (SES).
   Dùng ở bai-tap-bo-tro.html và ứng dụng tap/. Sửa bài ở đây là cả hai nơi cùng đổi.
   window.BaiTap = {F, E, LV, SES, fig(khoá, tên, tắtChuyểnĐộng)} */
(function(){
'use strict';
const arr=(x1,y1,x2,y2)=>{const a=Math.atan2(y2-y1,x2-x1),h=7,w=4.5,bx=x2-h*Math.cos(a),by=y2-h*Math.sin(a),px=-Math.sin(a)*w,py=Math.cos(a)*w,f=n=>n.toFixed(1);return `<line class="ar" x1="${x1}" y1="${y1}" x2="${f(bx)}" y2="${f(by)}"/><path class="ah" d="M${x2} ${y2}L${f(bx+px)} ${f(by+py)}L${f(bx-px)} ${f(by-py)}Z"/>`};

/* Hình: j = tư thế đầu, b = khớp thay đổi ở tư thế cuối, s = cặp khớp; cờ 1 = phần đang làm việc (màu nhấn), 3 = dây kháng lực.
   wt = khớp đang cầm tạ (tên khớp, hoặc [tên, độ lệch dọc]). */
const DESK=(a,b)=>`<rect class="dk" x="${a}" y="84" width="${b-a}" height="6" rx="1.5"/><line class="dl" x1="${a+5}" y1="90" x2="${a+5}" y2="132"/><line class="dl" x1="${b-5}" y1="90" x2="${b-5}" y2="132"/>`;
const WALL=x=>`<line class="wl" x1="${x}" y1="4" x2="${x}" y2="132"/>`;
const BOX=(x,y,w)=>`<rect class="st" x="${x}" y="${y}" width="${w}" height="${132-y}" rx="2"/>`;
const STAND={to:[92,131],an:[106,130],kn:[106,101],hp:[106,72],sh:[106,34],hd:[104,22],el:[92,56],ha:[78,82]};
const LEG1=[['an','to'],['an','kn'],['kn','hp'],['hp','sh'],['sh','el'],['el','ha']];
const FOURS=[['sh','hp'],['sh','el'],['el','ha'],['hp','kn'],['kn','an'],['sh','el2',1],['el2','ha2',1],['hp','kn2',1],['kn2','an2',1]];
const SKIP={to:[96,131],an:[110,130],kn:[110,101],hp:[110,72],sh:[110,34],hd:[108,22],el:[104,58],ha:[100,82],el2:[116,58],ha2:[120,82],kn2:[110,101],an2:[110,130],to2:[96,131]};
const SKIPS=[['an','to'],['an','kn'],['kn','hp'],['hp','sh'],['sh','el'],['el','ha'],['sh','el2',1],['el2','ha2',1],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]];
/* Hình nhìn chính diện: ne cổ, sl/sr vai trái phải, hl/hr hông trái phải. l, r = tô màu chân trái, chân phải. */
const FR=(l,r)=>[['ne','hp'],['sl','sr'],['hl','hr'],['sl','el'],['el','ha'],['sr','el2'],['el2','ha2'],['hl','kn',l],['kn','an',l],['an','to',l],['hr','kn2',r],['kn2','an2',r],['an2','to2',r]];
const F={
  /* có sẵn từ trang Lịch tập */
  plank:{dy:10,mat:1,j:{hd:[54,86],sh:[72,90],el:[72,118],ha:[46,118],hp:[140,104],kn:[172,111],an:[200,118]},s:[['sh','hp',1],['sh','el'],['el','ha'],['hp','kn'],['kn','an']],pre:'<line class="gd" x1="40" y1="69" x2="212" y2="107"/>'},
  side:{dy:10,mat:1,j:{hd:[60,72],sh:[78,82],el:[80,118],ha:[56,118],el2:[82,54],ha2:[86,26],hp:[140,114],kn:[172,117],an:[204,118]},b:{hp:[140,102],kn:[172,110]},s:[['sh','hp',1],['sh','el'],['el','ha'],['sh','el2'],['el2','ha2'],['hp','kn'],['kn','an']]},
  bug:{dy:10,mat:1,j:{hd:[48,108],sh:[66,114],hp:[130,114],el:[66,88],ha:[66,62],el2:[66,88],ha2:[66,62],kn:[130,82],an:[162,82],kn2:[130,82],an2:[162,82]},b:{el2:[46,96],ha2:[22,90],kn2:[164,108],an2:[198,102]},s:FOURS},
  bird:{dy:10,mat:1,j:{hd:[62,67],sh:[80,80],hp:[150,80],el:[80,100],ha:[80,118],kn:[150,118],an:[182,118],el2:[80,100],ha2:[80,118],kn2:[150,118],an2:[182,118]},b:{el2:[54,76],ha2:[26,72],kn2:[184,80],an2:[218,80]},s:FOURS,post:'<rect class="cup" x="109" y="62" width="13" height="13" rx="2"/>'},
  squat:{j:{to:[96,131],an:[112,130],kn:[110,101],hp:[112,72],sh:[112,34],hd:[110,22],el:[92,36],ha:[72,38]},b:{kn:[90,108],hp:[118,100],sh:[100,66],hd:[94,54],el:[78,70],ha:[56,72]},s:[['an','to'],['an','kn'],['hp','sh'],['sh','el'],['el','ha'],['kn','hp',1]],pre:'<path class="ch" d="M120 102H150V70M122 102V132M148 102V132"/>'},
  calf:{r:8,j:{to:[76,120],hl:[102,126],an:[98,122],kn:[98,94],hp:[98,66],sh:[98,36],hd:[96,26],el:[64,44],ha:[30,46]},b:{hl:[100,111],an:[98,108],kn:[98,80],hp:[98,52],sh:[98,22],hd:[96,12],el:[64,32],ha:[30,36]},s:[['to','hl',1],['an','kn',1],['kn','hp'],['hp','sh'],['sh','el'],['el','ha']],pre:'<rect class="st" x="30" y="120" width="62" height="12"/>'+WALL(24)},
  clam:{dy:10,mat:1,j:{hd:[44,104],sh:[62,113],ha:[30,118],hp:[128,112],kn:[160,120],an:[196,114],kn2:[160,113],an2:[196,114]},b:{kn2:[162,86]},s:[['sh','ha'],['sh','hp'],['hp','kn'],['kn','an'],['hp','kn2',1],['kn2','an2',1]]},
  bal:{j:{to:[96,131],an:[110,130],kn:[106,101],hp:[110,72],sh:[110,34],hd:[108,22],el:[124,54],ha:[134,72],el2:[96,50],ha2:[88,60],kn2:[84,76],an2:[88,102]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh'],['sh','el'],['el','ha'],['sh','el2'],['el2','ha2'],['hp','kn2',1],['kn2','an2',1]],pre:'<line class="gd" x1="96" y1="22" x2="30" y2="22"/><circle class="tg" cx="20" cy="22" r="7"/><circle class="ah" cx="20" cy="22" r="2.5"/>'},
  quad:{j:{...STAND,kn2:[108,102],an2:[126,79],el2:[116,54],ha2:[125,77]},s:[...LEG1,['sh','el2'],['el2','ha2'],['hp','kn2',1],['kn2','an2',1]],pre:DESK(16,80)},
  hipf:{j:{to:[66,131],an:[82,130],kn:[86,96],hp:[112,80],sh:[114,42],hd:[113,30],el:[102,60],ha:[110,78],kn2:[134,104],an2:[156,124],to2:[148,131]},s:[...LEG1,['an2','to2'],['hp','kn2',1],['kn2','an2',1]],post:arr(140,70,124,70)},

  /* kỹ thuật chạy */
  swing:{dur:1.8,pre:'<line class="wl" x1="140" y1="52" x2="140" y2="132"/>',j:{to:[106,131],an:[120,130],kn:[120,101],hp:[120,72],sh:[120,34],hd:[118,22],el:[128,56],ha:[140,70],el2:[114,58],ha2:[110,84],kn2:[134,99],an2:[146,126]},b:{kn2:[96,94],an2:[78,118]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh'],['sh','el'],['el','ha'],['sh','el2'],['el2','ha2'],['hp','kn2',1],['kn2','an2',1]]},
  aski:{dur:1.4,j:SKIP,b:{kn2:[82,78],an2:[84,107],to2:[72,108],el2:[100,56],ha2:[80,48],el:[124,54],ha:[130,76]},s:SKIPS},
  butt:{dur:1.2,j:SKIP,b:{kn2:[114,100],an2:[130,78],to2:[140,74],el2:[100,56],ha2:[80,48],el:[124,54],ha:[130,76]},s:SKIPS},
  pogo:{dur:.9,r:8,j:{to:[96,131],an:[110,128],kn:[108,100],hp:[110,72],sh:[110,34],hd:[108,22],el:[102,56],ha:[90,66]},b:{to:[100,124],an:[110,116],kn:[109,88],hp:[110,60],sh:[110,22],hd:[108,10],el:[102,44],ha:[90,54]},s:[['an','to',1],['an','kn',1],['kn','hp'],['hp','sh'],['sh','el'],['el','ha']]},

  /* sức mạnh */
  lunge:{j:{to:[76,131],an:[90,130],kn:[90,101],hp:[90,72],sh:[90,34],hd:[88,22],el:[88,58],ha:[86,84],kn2:[90,101],an2:[90,130],to2:[76,131]},b:{hp:[116,100],kn:[90,100],sh:[116,62],hd:[114,50],el:[114,86],ha:[112,112],kn2:[130,124],an2:[156,118],to2:[166,131]},s:[['an','to'],['an','kn'],['kn','hp',1],['hp','sh'],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]]},
  step:{r:8,pre:BOX(56,108,52),j:{to:[79,107],an:[90,106],kn:[89,81],hp:[114,82],sh:[108,50],hd:[104,39],el:[104,72],ha:[100,94],kn2:[118,106],an2:[122,130],to2:[111,131]},b:{kn:[90,81],hp:[90,56],sh:[90,24],hd:[88,13],el:[86,46],ha:[84,68],kn2:[102,79],an2:[110,102],to2:[100,106]},s:[['an','to'],['an','kn',1],['kn','hp',1],['hp','sh'],['sh','el'],['el','ha'],['hp','kn2'],['kn2','an2'],['an2','to2']]},
  slbridge:{dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[118,112],kn:[156,80],an:[170,118],to:[184,120],el:[84,118],ha:[110,118],kn2:[156,80],an2:[184,57]},b:{hp:[120,91],kn:[164,76],kn2:[164,76],an2:[198,64]},s:[['kn','an'],['an','to'],['sh','el'],['el','ha'],['sh','hp',1],['hp','kn',1],['kn2','an2',1]]},
  wsit:{pre:WALL(170),j:{to:[116,131],an:[130,130],kn:[130,100],hp:[160,100],sh:[162,62],hd:[160,50],el:[154,84],ha:[136,96]},s:[['an','to'],['an','kn'],['kn','hp',1],['hp','sh'],['sh','el'],['el','ha']]},
  slrdl:{j:{to:[96,131],an:[110,130],kn:[108,101],hp:[110,72],sh:[110,34],hd:[108,22],el:[108,58],ha:[106,84],kn2:[112,101],an2:[116,126],to2:[106,128]},b:{kn:[112,102],hp:[114,74],sh:[78,62],hd:[66,58],el:[78,86],ha:[78,110],kn2:[142,70],an2:[170,66],to2:[172,76]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh',1],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]]},
  band:{dur:2,j:{hd:[120,26],ne:[120,38],sl:[108,42],sr:[132,42],hp:[120,76],hl:[112,78],hr:[128,78],el:[98,60],ha:[110,78],el2:[142,60],ha2:[130,78],kn:[108,104],an:[106,130],to:[100,131],kn2:[132,104],an2:[134,130],to2:[140,131],b1:[107,118],b2:[133,118]},b:{kn2:[146,104],an2:[152,130],to2:[158,131],b2:[149,118]},s:[['ne','hp'],['sl','sr'],['hl','hr'],['sl','el'],['el','ha'],['sr','el2'],['el2','ha2'],['hl','kn'],['kn','an'],['an','to'],['hr','kn2',1],['kn2','an2',1],['an2','to2',1],['b1','b2',3]]},

  /* tạ */
  goblet:{wt:['ha'],j:{to:[96,131],an:[112,130],kn:[110,101],hp:[112,72],sh:[112,34],hd:[110,22],el:[100,60],ha:[98,42]},b:{kn:[90,108],hp:[118,100],sh:[100,66],hd:[94,54],el:[92,88],ha:[88,70]},s:[['an','to'],['an','kn'],['hp','sh'],['sh','el'],['el','ha'],['kn','hp',1]]},
  rdl:{wt:['ha'],j:{to:[96,131],an:[110,130],kn:[110,101],hp:[110,72],sh:[110,34],hd:[108,22],el:[108,58],ha:[106,82]},b:{kn:[112,102],hp:[126,74],sh:[94,54],hd:[83,47],el:[94,78],ha:[94,102]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh',1],['sh','el'],['el','ha']]},
  bss:{wt:['ha'],pre:BOX(150,104,64),j:{to:[70,131],an:[84,130],kn:[90,101],hp:[104,74],sh:[102,36],hd:[100,24],el:[100,60],ha:[98,86],kn2:[130,88],an2:[154,100],to2:[164,104]},b:{kn:[84,102],hp:[112,102],sh:[108,64],hd:[106,52],el:[106,88],ha:[104,112],kn2:[134,120]},s:[['an','to'],['an','kn',1],['kn','hp',1],['hp','sh'],['sh','el'],['el','ha'],['hp','kn2'],['kn2','an2'],['an2','to2']]},
  thrust:{r:8,wt:[['hp',-9]],pre:BOX(16,100,52),j:{hd:[50,92],sh:[64,98],hp:[94,122],kn:[124,108],an:[134,130],to:[148,131],el:[76,118],ha:[94,116]},b:{hp:[100,98],kn:[130,96],el:[80,110],ha:[100,92]},s:[['an','to'],['an','kn'],['kn','hp',1],['hp','sh',1],['sh','el'],['el','ha']]},
  carry:{dur:1.2,wt:['ha'],j:{hp:[110,72],sh:[110,34],hd:[108,22],el:[111,58],ha:[112,84],kn:[100,100],an:[94,128],to:[82,131],kn2:[118,100],an2:[128,124],to2:[120,131]},b:{kn:[118,100],an:[128,124],to:[120,131],kn2:[100,100],an2:[94,128],to2:[82,131]},s:[['hp','kn'],['kn','an'],['an','to'],['hp','kn2',1],['kn2','an2',1],['an2','to2',1],['hp','sh'],['sh','el'],['el','ha']]},

  /* core */
  hollow:{dy:10,mat:1,j:{hd:[64,108],sh:[82,114],el:[58,116],ha:[34,116],hp:[120,118],kn:[150,118],an:[180,118],to:[184,110]},b:{hd:[66,98],sh:[84,106],el:[60,98],ha:[36,92],kn:[150,110],an:[178,100],to:[182,92]},s:[['sh','hp'],['sh','el',1],['el','ha',1],['hp','kn',1],['kn','an',1],['an','to',1]]},
  tap:{dur:1.6,dy:10,mat:1,j:{hd:[54,72],sh:[72,78],el:[72,98],ha:[72,118],el2:[72,98],ha2:[72,118],hp:[140,96],kn:[172,106],an:[200,116]},b:{el2:[92,96],ha2:[78,84]},s:[['sh','hp'],['sh','el'],['el','ha'],['hp','kn'],['kn','an'],['sh','el2',1],['el2','ha2',1]]},
  sup:{dy:10,mat:1,j:{hd:[56,112],sh:[74,116],el:[50,118],ha:[24,118],hp:[142,118],kn:[174,118],an:[204,118]},b:{hd:[58,100],sh:[76,108],el:[52,102],ha:[28,96],kn:[174,110],an:[202,102]},s:[['sh','hp'],['sh','el',1],['el','ha',1],['hp','kn',1],['kn','an',1]]},

  /* giãn cơ */
  hams:{pre:BOX(40,108,40),j:{to:[106,131],an:[120,130],kn:[118,104],hp:[112,76],sh:[110,38],hd:[108,26],el:[104,62],ha:[96,82],kn2:[88,90],an2:[64,104],to2:[58,94]},b:{sh:[84,52],hd:[74,44],el:[82,76],ha:[84,98]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh',1],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]]},
  calfst:{pre:WALL(24),j:{to:[58,131],an:[70,130],kn:[76,106],hp:[100,84],sh:[72,56],hd:[62,46],el:[48,62],ha:[32,52],kn2:[122,105],an2:[144,126],to2:[134,131]},b:{kn:[74,108],hp:[96,88],sh:[68,60],hd:[58,50],el:[46,64],ha:[31,54]},s:[['an','to'],['an','kn'],['kn','hp'],['hp','sh'],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]]},
  hug:{dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[118,116],kn:[150,118],an:[182,118],to:[190,110],kn2:[132,90],an2:[156,100],el:[84,104],ha:[110,96]},b:{kn2:[112,84],an2:[136,82],ha:[106,88],el:[82,98]},s:[['sh','hp'],['hp','kn'],['kn','an'],['an','to'],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1]]},
  fig4:{dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[118,116],kn:[140,96],an:[164,116],to:[170,108],kn2:[152,110],an2:[140,96],el:[80,110],ha:[104,112]},b:{kn:[130,86],an:[156,80],to:[162,72],kn2:[144,100],an2:[130,86],el:[86,98],ha:[124,88]},s:[['sh','hp'],['hp','kn'],['kn','an'],['an','to'],['sh','el'],['el','ha'],['hp','kn2',1],['kn2','an2',1]]},
  butter:{dur:4,mat:1,j:{hd:[120,74],ne:[120,86],sl:[108,90],sr:[132,90],hp:[120,124],hl:[110,124],hr:[130,124],el:[100,108],ha:[114,126],el2:[140,108],ha2:[126,126],kn:[84,112],an:[114,128],kn2:[156,112],an2:[126,128]},b:{hd:[120,82],ne:[120,94],sl:[108,98],sr:[132,98],el:[98,114],el2:[142,114],kn:[80,122],kn2:[160,122]},s:[['ne','hp'],['sl','sr'],['hl','hr'],['sl','el'],['el','ha'],['sr','el2'],['el2','ha2'],['hl','kn',1],['kn','an'],['hr','kn2',1],['kn2','an2']]},
  itb:{dur:3.6,j:{hd:[120,24],ne:[120,36],sl:[108,40],sr:[132,40],hp:[120,74],hl:[112,76],hr:[128,76],el:[98,58],ha:[110,72],el2:[140,20],ha2:[134,4],kn:[114,103],an:[116,130],to:[110,131],kn2:[120,103],an2:[104,130],to2:[98,131]},b:{hd:[100,30],ne:[106,41],sl:[95,47],sr:[117,37],hp:[128,74],hl:[120,76],hr:[136,76],el:[88,64],ha:[104,74],el2:[118,18],ha2:[100,8],kn2:[124,103]},s:[['ne','hp'],['sl','sr'],['hl','hr'],['sl','el'],['el','ha'],['sr','el2',1],['el2','ha2',1],['hl','kn'],['kn','an'],['an','to'],['hr','kn2',1],['kn2','an2',1],['an2','to2',1]]},
  child:{dur:4,dy:10,mat:1,j:{hd:[62,67],sh:[80,80],hp:[150,80],el:[80,100],ha:[80,118],kn:[150,118],an:[182,118]},b:{hd:[124,104],sh:[140,110],hp:[174,94],el:[111,115]},s:[['sh','hp',1],['sh','el',1],['el','ha',1],['hp','kn'],['kn','an']]},
  catcow:{dur:4,dy:10,mat:1,j:{hd:[62,62],sh:[80,80],mb:[115,90],hp:[150,80],el:[80,100],ha:[80,118],kn:[150,118],an:[182,118]},b:{hd:[68,92],mb:[115,64]},s:[['sh','mb',1],['mb','hp',1],['sh','el'],['el','ha'],['hp','kn'],['kn','an']]},
  lhams:{dur:3.6,dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[118,116],kn:[150,118],an:[182,118],to:[190,110],kn2:[132,91],an2:[147,66],to2:[156,62],el:[80,100],ha:[102,86]},b:{kn2:[126,88],an2:[133,60],to2:[142,55],el:[78,98],ha:[98,82]},s:[['sh','hp'],['hp','kn'],['kn','an'],['an','to'],['sh','el'],['el','ha'],['ha','an2',3],['hp','kn2',1],['kn2','an2',1],['an2','to2',1]]},

  /* khởi động */
  lswing:{dur:1.6,pre:'<line class="wl" x1="74" y1="30" x2="74" y2="132"/>',j:{hd:[120,26],ne:[120,38],sl:[108,42],sr:[132,42],hp:[120,76],hl:[112,78],hr:[128,78],el:[92,58],ha:[78,62],el2:[138,60],ha2:[140,80],kn:[110,104],an:[110,130],to:[104,131],kn2:[148,100],an2:[164,124],to2:[171,124]},b:{kn2:[114,101],an2:[98,124],to2:[91,124]},s:FR(0,1)},
  hipc:{dur:2.4,j:{hd:[120,26],ne:[120,38],sl:[108,42],sr:[132,42],hp:[120,76],hl:[112,78],hr:[128,78],el:[98,60],ha:[110,76],el2:[142,60],ha2:[130,76],kn:[112,104],an:[112,130],to:[106,131],kn2:[132,72],an2:[132,98],to2:[134,104]},b:{kn2:[156,80],an2:[158,106],to2:[164,108]},s:FR(0,1)},
  inch:{dur:3.6,j:{to:[140,131],an:[150,128],kn:[150,100],hp:[148,72],sh:[118,96],hd:[106,104],el:[112,114],ha:[112,130]},b:{kn:[124,112],hp:[98,97],sh:[64,76],hd:[52,70],el:[64,103],ha:[64,130]},s:[['an','to'],['an','kn'],['kn','hp',1],['hp','sh',1],['sh','el'],['el','ha']]},

  /* thêm kỹ thuật chạy */
  bskip:{dur:1.4,j:SKIP,b:{kn2:[82,80],an2:[54,88],to2:[48,80],el2:[100,56],ha2:[80,48],el:[124,54],ha:[130,76]},s:SKIPS},
  sll:{dur:1,j:SKIP,b:{kn2:[87,90],an2:[64,108],to2:[56,100],el2:[100,56],ha2:[80,48],el:[124,54],ha:[130,76]},s:SKIPS},
  carioca:{dur:1.4,j:{hd:[120,26],ne:[120,38],sl:[108,42],sr:[132,42],hp:[120,76],hl:[112,78],hr:[128,78],el:[92,50],ha:[72,54],el2:[148,50],ha2:[168,54],kn:[106,104],an:[100,130],to:[94,131],kn2:[136,104],an2:[142,130],to2:[148,131]},b:{hp:[118,76],hl:[110,78],hr:[126,78],kn:[104,104],an:[106,130],to:[100,131],kn2:[108,102],an2:[94,128],to2:[88,130]},s:FR(0,1)},

  /* thêm sức mạnh */
  bridge:{dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[118,112],kn:[156,80],an:[170,118],to:[184,120],el:[84,118],ha:[110,118]},b:{hp:[120,91],kn:[164,76]},s:[['kn','an'],['an','to'],['sh','el'],['el','ha'],['sh','hp',1],['hp','kn',1]]},
  llunge:{j:{hd:[104,26],ne:[104,38],sl:[92,42],sr:[116,42],hp:[104,76],hl:[96,78],hr:[112,78],el:[90,62],ha:[102,56],el2:[118,62],ha2:[106,56],kn:[92,104],an:[88,130],to:[82,131],kn2:[116,104],an2:[120,130],to2:[126,131]},b:{hd:[144,50],ne:[144,62],sl:[132,66],sr:[156,66],hp:[144,100],hl:[136,102],hr:[152,102],el:[130,86],ha:[142,80],el2:[158,86],ha2:[146,80],kn:[112,116],kn2:[172,104],an2:[176,130],to2:[184,131]},s:FR(0,1)},
  soleus:{r:8,j:{to:[76,120],hl:[102,126],an:[98,122],kn:[86,97],hp:[100,72],sh:[100,36],hd:[98,26],el:[64,44],ha:[30,48]},b:{hl:[100,111],an:[98,108],kn:[86,83],hp:[100,58],sh:[100,22],hd:[98,12],el:[64,30],ha:[30,36]},s:[['to','hl',1],['an','kn',1],['kn','hp'],['hp','sh'],['sh','el'],['el','ha']],pre:'<rect class="st" x="30" y="120" width="62" height="12"/>'+WALL(24)},
  hike:{r:8,pre:BOX(60,116,56),j:{hd:[110,12],ne:[110,24],sl:[98,28],sr:[122,28],hp:[112,60],hl:[104,58],hr:[120,62],el:[92,44],ha:[102,58],el2:[130,44],ha2:[122,60],kn:[104,86],an:[104,114],to:[98,115],kn2:[124,92],an2:[126,122],to2:[132,123]},b:{hp:[112,56],hr:[120,54],el2:[130,40],ha2:[122,54],kn2:[122,82],an2:[124,110],to2:[130,111]},s:[['ne','hp'],['sl','sr'],['hl','hr',1],['sl','el'],['el','ha'],['sr','el2'],['el2','ha2'],['hl','kn',1],['kn','an',1],['an','to',1],['hr','kn2'],['kn2','an2'],['an2','to2']]},
  push:{dy:10,mat:1,j:{hd:[58,80],sh:[74,86],el:[76,102],ha:[78,118],hp:[130,106],kn:[160,118],an:[186,104]},b:{hd:[53,106],sh:[70,108],el:[86,102],hp:[128,114]},s:[['sh','hp'],['hp','kn'],['kn','an'],['sh','el',1],['el','ha',1]]},
  row:{wt:['ha2'],pre:BOX(26,96,64),j:{hd:[64,56],sh:[80,62],hp:[118,68],el:[78,80],ha:[76,96],el2:[88,86],ha2:[94,108],kn:[110,98],an:[112,128],to:[100,131],kn2:[134,96],an2:[152,122],to2:[146,131]},b:{el2:[106,54],ha2:[100,78]},s:[['an','to'],['an','kn'],['kn','hp'],['an2','to2'],['an2','kn2'],['kn2','hp'],['hp','sh'],['sh','el'],['el','ha'],['sh','el2',1],['el2','ha2',1]]},

  /* thêm core */
  bmarch:{dur:2.4,dy:10,mat:1,j:{hd:[40,112],sh:[56,114],hp:[120,91],kn:[164,76],an:[170,118],to:[184,120],el:[84,118],ha:[110,118],kn2:[164,76],an2:[170,118]},b:{kn2:[146,62],an2:[176,60]},s:[['kn','an'],['an','to'],['sh','el'],['el','ha'],['sh','hp',1],['hp','kn',1],['hp','kn2',1],['kn2','an2',1]]},
  sideleg:{dur:2.4,dy:10,mat:1,j:{hd:[60,72],sh:[78,82],el:[80,118],ha:[56,118],el2:[82,54],ha2:[86,26],hp:[140,102],kn:[172,110],an:[204,118],kn2:[172,110],an2:[204,118]},b:{kn2:[170,90],an2:[200,80]},s:[['sh','hp',1],['sh','el'],['el','ha'],['sh','el2'],['el2','ha2'],['hp','kn'],['kn','an'],['hp','kn2',1],['kn2','an2',1]]},
  mclimb:{dur:1.6,dy:10,mat:1,j:{hd:[54,72],sh:[72,78],el:[72,98],ha:[72,118],hp:[140,96],kn:[172,106],an:[200,116],kn2:[172,106],an2:[200,116]},b:{kn2:[118,104],an2:[146,112]},s:[['sh','hp',1],['sh','el'],['el','ha'],['hp','kn'],['kn','an'],['hp','kn2',1],['kn2','an2',1]]},
  bear:{dur:3,dy:10,mat:1,j:{hd:[62,67],sh:[80,80],hp:[150,80],el:[80,100],ha:[80,118],kn:[150,118],an:[182,118]},b:{hp:[150,76],kn:[152,108],an:[180,118]},s:[['sh','hp',1],['sh','el'],['el','ha'],['hp','kn',1],['kn','an']]}
};
F.march={...F.aski,dur:2.4};
F.llungew={...F.llunge,wt:['ha']};
F.lungew={...F.lunge,wt:['ha']};
F.stepw={...F.step,wt:['ha']};
F.slrdlw={...F.slrdl,wt:['ha']};

/* cat: drill kỹ thuật chạy, bw sức mạnh không tạ, wt tạ, core, mob giãn cơ. lv: 1 dễ, 2 vừa, 3 nâng cao. kg: có ô ghi mức tạ. */
const E={
  warm:{mini:1,cat:'warm',name:'Đi bộ nhanh rồi chạy thật chậm',dose:'5 phút',note:'Làm ấm người trước các bài kỹ thuật.'},
  strides:{mini:1,cat:'drill',name:'Chạy tăng tốc (strides)',dose:'4–6 × 80 m',note:'Cuối buổi chạy nhẹ: tăng dần lên khoảng 85% sức trong 15–20 giây, rồi đi bộ về. Chỉ làm khi đã chạy lại 2–3 tuần không đau.'},
  foam:{mini:1,cat:'mob',name:'Lăn foam roller',dose:'5–10 phút',note:'Bắp chân, đùi trước, đùi ngoài, mông. Lăn chậm, chỗ đau thì dừng lại thở 20–30 giây.'},

  swing:{cat:'warm',lv:1,eq:'Tường / cột',name:'Đá lăng chân trước sau',dose:'10 lần mỗi chân',sets:2,side:1,why:'Mở khớp hông trước khi chạy.',cues:['Đứng nghiêng cạnh tường hoặc cột, một tay vịn, người thẳng','Thả lỏng cho chân đung đưa, biên độ tăng dần','Chân ra sau thì không ưỡn lưng']},
  lswing:{cat:'warm',lv:1,eq:'Tường / cột',name:'Đá lăng chân sang ngang',dose:'10 lần mỗi chân',sets:2,side:1,why:'Mở hông theo chiều ngang, phần ít được vận động khi chạy thẳng.',cues:['Một tay vịn tường hoặc cột','Chân đung đưa ngang qua trước người rồi ra ngoài','Thân giữ yên, không lắc theo chân']},
  hipc:{cat:'warm',lv:1,eq:'Không cần',name:'Mở cổng hông',dose:'8 lần mỗi chân',sets:2,side:1,why:'Làm ấm khớp hông và mông trước khi chạy.',cues:['Nâng gối lên trước ngang hông, hai tay chống hông','Xoay gối ra ngoài rồi hạ xuống, như mở cánh cổng','Lượt sau làm ngược lại, từ ngoài vào trong']},
  march:{cat:'warm',lv:1,eq:'Không cần',name:'Đi nâng gối',dose:'2 × 20 m',sets:2,why:'Làm ấm đùi trước, hông và tập đặt chân ngay dưới thân.',cues:['Đi chậm, mỗi bước nâng gối ngang hông','Nhón nhẹ trên chân trụ','Tay đánh theo nhịp như khi chạy']},
  wlunge:{fig:'lunge',cat:'warm',lv:1,eq:'Không cần',name:'Lunge bước tới',dose:'6 lần mỗi chân',sets:2,side:1,why:'Làm ấm đùi trước, mông, và giãn nhẹ phía trước hông chân sau.',cues:['Bước dài về trước, hạ gối sau xuống thấp','Thân thẳng, gối trước theo hướng mũi chân','Đẩy lên rồi bước tiếp bằng chân kia']},
  inch:{cat:'warm',lv:2,eq:'Không cần',name:'Đi tay (inchworm)',dose:'5 lần',sets:1,why:'Làm ấm đùi sau, vai và core cùng lúc.',cues:['Gập người, hai tay chạm sàn, gối chùng nếu cần','Đi tay ra trước đến tư thế chống đẩy','Đi tay về lại gần chân rồi đứng lên']},

  hill:{mini:1,cat:'drill',name:'Chạy dốc ngắn',dose:'6–8 × 10 giây',note:'Cuối buổi chạy nhẹ, tìm dốc thoải: chạy lên mạnh 10 giây, đi bộ xuống nghỉ đủ. Chân khoẻ hơn mà ít va đập. Chỉ làm khi đã chạy strides vài tuần không đau.'},
  metro:{mini:1,cat:'drill',name:'Chạy theo metronome',dose:'3 × 3 phút ở 166',note:'Trong buổi chạy nhẹ: bật metronome 166 chạy 3 phút, tắt chạy 2 phút, lặp lại 3 lần. Bước ngắn lại cho khớp nhịp, không chạy nhanh hơn.'},
  aski:{cat:'drill',lv:2,eq:'Không cần',name:'Nâng cao đùi (A-skip)',dose:'2 × 20 m',sets:2,why:'Tập nhấc gối và đặt chân ngay dưới thân, giúp tăng cadence.',cues:['Đùi lên ngang hông, bàn chân hạ ngay dưới hông','Tay đánh ngược với chân như khi chạy','Bắt đầu bằng bước đi, quen rồi mới nhún nhảy']},
  butt:{cat:'drill',lv:2,eq:'Không cần',name:'Gót chạm mông',dose:'2 × 20 m',sets:2,why:'Kéo chân sau về nhanh, nhịp chân nhanh và nhẹ hơn.',cues:['Gót kéo thẳng lên dưới mông, gối hướng xuống đất','Bước ngắn, nhanh, nhẹ','Người thẳng, không gập về trước']},
  sll:{cat:'drill',lv:2,eq:'Không cần',name:'Chạy chân thẳng',dose:'2 × 20 m',sets:2,why:'Tập đặt chân ngay dưới hông và dùng đùi sau kéo người đi.',cues:['Hai chân gần như thẳng, đá ra trước thấp','Cào bàn chân xuống ngay dưới hông','Bước nhanh, nhẹ, thân hơi đổ về trước']},
  bskip:{cat:'drill',lv:3,eq:'Không cần',name:'B-skip',dose:'2 × 20 m',sets:2,why:'Như A-skip nhưng duỗi cẳng chân ra rồi cào xuống, tập kéo chân về dưới thân.',cues:['Nâng gối như A-skip','Duỗi cẳng chân ra trước rồi kéo xuống đất','Làm A-skip thành thạo rồi mới tập bài này']},
  carioca:{cat:'drill',lv:2,eq:'Không cần',name:'Bước chéo ngang (carioca)',dose:'2 × 20 m mỗi chiều',sets:4,side:1,why:'Hông xoay linh hoạt, cổ chân vững khi di chuyển ngang.',cues:['Đi ngang, chân sau lần lượt bắt chéo trước rồi chéo sau','Hông xoay, vai giữ hướng về trước','Chậm trước, quen rồi mới nhanh']},
  pogo:{cat:'drill',lv:3,eq:'Không cần',name:'Bật nhảy mũi chân (pogo)',dose:'2 × 20 lần',sets:2,why:'Gân gót và bắp chân đàn hồi tốt hơn, mỗi bước bật đi nhẹ hơn.',cues:['Gối gần thẳng, bật bằng cổ chân','Chạm đất êm và nhanh như đứng trên sàn nóng','Chỉ tập khi đã chạy lại 3 tuần không đau bắp chân, gân gót']},

  bridge:{cat:'bw',lv:1,eq:'Thảm',name:'Glute bridge',dose:'3 × 12',sets:3,why:'Bài mông cơ bản, làm trước bản 1 chân.',cues:['Hai bàn chân gần mông, đẩy bằng gót','Siết mông nâng hông, giữ 2 giây ở trên','Vai, hông, gối thành một đường']},
  squat:{cat:'bw',lv:1,eq:'Ghế',name:'Squat',dose:'3 × 10–12',sets:3,why:'Bài nền cho đùi trước và mông.',cues:['Chân rộng bằng vai','Đẩy hông ra sau như ngồi xuống ghế','Gối theo hướng mũi chân, gót không nhấc']},
  lunge:{cat:'bw',lv:2,eq:'Không cần',name:'Lunge lùi',dose:'3 × 8 mỗi chân',sets:6,side:1,why:'Sức mạnh từng chân riêng, gối vững khi tiếp đất.',cues:['Bước lùi dài, hạ gối sau gần chạm sàn','Gối trước theo hướng mũi chân, không đổ vào trong','Đẩy bằng gót chân trước để đứng lên']},
  step:{cat:'bw',lv:2,eq:'Bậc / ghế',name:'Bước lên bậc',dose:'3 × 8 mỗi chân',sets:6,side:1,why:'Giống động tác đẩy người khi chạy lên dốc.',cues:['Bậc cao 30–40 cm, chắc, không trượt','Dồn lực vào chân trên, chân dưới không đạp','Hạ xuống chậm 2–3 giây']},
  slbridge:{cat:'bw',lv:2,eq:'Thảm',name:'Glute bridge 1 chân',dose:'3 × 10 mỗi bên',sets:6,side:1,why:'Mông khoẻ giữ hông thẳng lúc tiếp đất bằng một chân.',cues:['Chân duỗi giữ thẳng theo đùi','Đẩy bằng gót chân co, nâng hông lên','Hai bên hông ngang nhau, không lệch']},
  wsit:{cat:'bw',lv:1,eq:'Tường',name:'Ngồi dựa tường',dose:'3 × 30–45 giây',sets:3,t:30,why:'Đùi trước bền hơn, đỡ gối khi chạy xuống dốc.',cues:['Lưng áp tường, đùi song song sàn','Gối nằm ngay trên cổ chân','Đùi trước còn ê thì ngồi cao hơn']},
  slrdl:{cat:'bw',lv:2,eq:'Không cần',name:'Gập hông 1 chân',dose:'3 × 8 mỗi bên',sets:6,side:1,why:'Đùi sau, mông và thăng bằng trên một chân.',cues:['Gập ở hông, lưng luôn thẳng','Chân sau và lưng thành một đường','Chưa vững thì một tay chạm nhẹ tường']},
  calf1:{fig:'calf',cat:'bw',lv:1,eq:'Bậc',name:'Nhón gót 1 chân',dose:'3 × 12 mỗi bên',sets:6,side:1,why:'Bắp chân và gân gót là phần chịu lực nhiều nhất mỗi bước chạy.',cues:['Đứng mép bậc, vịn tường','Nhón lên nhanh, hạ gót thấp hơn mép bậc trong 3 giây','Làm 15 lần dễ dàng thì cầm thêm tạ']},
  band:{cat:'bw',lv:1,eq:'Dây mini band',name:'Đi ngang với dây',dose:'2 × 12 bước mỗi bên',sets:4,side:1,why:'Cơ mông nhỡ giữ gối không đổ vào trong khi chạy.',cues:['Dây quanh cổ chân hoặc ngay trên gối','Hơi khuỵu gối, mũi chân hướng ra trước','Bước ngang, dây luôn căng']},
  clam:{cat:'bw',lv:1,eq:'Thảm',name:'Clamshell',dose:'2 × 15 mỗi bên',sets:4,side:1,why:'Khởi động cơ mông nhỡ, dễ với người mới chạy lại.',cues:['Nằm nghiêng, co gối khoảng 45°, hai bàn chân chạm nhau','Mở gối trên lên như vỏ sò','Hông giữ yên, không ngửa người ra sau']},
  bal:{cat:'bw',lv:1,eq:'Không cần',name:'Đứng thăng bằng 1 chân',dose:'3 × 30 giây mỗi bên',sets:6,side:1,t:30,why:'Cổ chân vững, giảm lật cổ chân.',cues:['Gối chân trụ hơi chùng','Mắt nhìn một điểm cố định','Thấy dễ thì nhắm mắt hoặc đứng trên gối mềm']},

  llunge:{cat:'bw',lv:2,eq:'Không cần',name:'Lunge ngang',dose:'3 × 8 mỗi bên',sets:6,side:1,why:'Đùi trong và mông khoẻ theo chiều ngang, gối vững hơn.',cues:['Bước rộng sang ngang, ngồi về phía chân bước','Chân kia duỗi thẳng, hai bàn chân hướng ra trước','Đẩy bằng gót để về giữa']},
  soleus:{cat:'bw',lv:1,eq:'Bậc',name:'Nhón gót gối chùng',dose:'3 × 15',sets:3,why:'Phần dưới bắp chân (cơ dép) chịu lực nhiều nhất khi chạy chậm và chạy dài.',cues:['Đứng mép bậc, gối chùng nhẹ suốt bài','Nhón lên, hạ gót chậm 3 giây','Dễ rồi thì làm từng chân']},
  hike:{cat:'bw',lv:2,eq:'Bậc',name:'Nâng hạ hông trên bậc',dose:'2 × 12 mỗi bên',sets:4,side:1,why:'Mông nhỡ của chân trụ giữ hông không xệ khi tiếp đất.',cues:['Đứng một chân trên mép bậc, chân kia thả ngoài','Hạ hông bên chân thả xuống, rồi kéo lên cao hơn hông bên kia','Chân trụ giữ thẳng, chỉ hông chuyển động']},
  stepdown:{fig:'step',cat:'bw',lv:2,eq:'Bậc',name:'Bước xuống bậc chậm',dose:'3 × 8 mỗi chân',sets:6,side:1,why:'Đùi trước chịu lực khi hạ người, giúp chạy xuống dốc êm gối hơn.',cues:['Đứng trên bậc thấp 15–20 cm','Chân trên chùng gối, hạ chân kia xuống chạm gót trong 3 giây','Gối chân trên theo hướng mũi chân, không đổ vào trong']},
  push:{cat:'bw',lv:1,eq:'Thảm',name:'Chống đẩy chống gối',dose:'3 × 8–12',sets:3,why:'Thân trên và vai khoẻ, tay đánh đều khi chạy mỏi.',cues:['Người thẳng từ gối đến đầu','Hạ ngực xuống gần sàn','Dễ rồi thì chống bằng mũi chân']},

  goblet:{cat:'wt',lv:2,kg:1,eq:'1 tạ đơn',name:'Goblet squat',dose:'3 × 8–10',sets:3,why:'Đùi trước và mông khoẻ, chịu lực tốt khi chạy dài.',cues:['Ôm tạ trước ngực, khuỷu tay hướng xuống','Ngồi đến khi đùi song song sàn, gối đau thì ngồi nông hơn','Lưng thẳng, gót không nhấc']},
  rdl:{cat:'wt',lv:2,kg:1,eq:'2 tạ đơn',name:'Romanian deadlift',dose:'3 × 8',sets:3,why:'Đùi sau và mông khoẻ, giảm nguy cơ căng cơ đùi sau.',cues:['Gối hơi chùng, đẩy hông ra sau','Tạ trượt sát đùi xuống đến giữa ống chân','Lưng thẳng suốt bài, siết mông khi đứng lên']},
  bss:{cat:'wt',lv:3,kg:1,eq:'2 tạ đơn + ghế',name:'Bulgarian split squat',dose:'3 × 8 mỗi chân',sets:6,side:1,why:'Bài một chân nặng nhất trong danh sách, sát với lực khi chạy.',cues:['Mu bàn chân sau đặt trên ghế','Hạ thẳng người xuống, gối trước theo mũi chân','Tập không tạ đến khi vững rồi mới cầm tạ']},
  lungew:{fig:'lungew',cat:'wt',lv:2,kg:1,eq:'2 tạ đơn',name:'Lunge lùi cầm tạ',dose:'3 × 8 mỗi chân',sets:6,side:1,why:'Bản nặng hơn của lunge lùi.',cues:['Hai tay buông thẳng cầm tạ','Bước lùi dài, gối sau gần chạm sàn','Người thẳng, không đổ về trước']},
  stepw:{fig:'stepw',cat:'wt',lv:3,kg:1,eq:'2 tạ đơn + bậc',name:'Bước lên bậc cầm tạ',dose:'3 × 6–8 mỗi chân',sets:6,side:1,why:'Bản nặng hơn của bước lên bậc.',cues:['Bậc thấp hơn bản không tạ một chút cho an toàn','Chân trên làm hết việc, chân dưới không đạp','Hạ xuống chậm, có kiểm soát']},
  slrdlw:{fig:'slrdlw',cat:'wt',lv:3,kg:1,eq:'1 tạ đơn',name:'Gập hông 1 chân cầm tạ',dose:'3 × 8 mỗi bên',sets:6,side:1,why:'Đùi sau, mông và thăng bằng có thêm tải.',cues:['Cầm tạ ở tay đối diện chân trụ','Tạ đi thẳng xuống, sát ống chân','Hông ngang, không xoay mở người']},
  thrust:{cat:'wt',lv:2,kg:1,eq:'1 tạ đơn + ghế',name:'Hip thrust',dose:'3 × 10',sets:3,why:'Mông khoẻ để đẩy người về trước mỗi bước.',cues:['Mép dưới bả vai tựa vào ghế, tạ đặt trên hông','Đẩy hông lên đến khi thân thẳng, giữ 1 giây','Cằm hơi cúi, mắt nhìn về đầu gối']},
  calfw:{fig:'calf',cat:'wt',lv:2,kg:1,eq:'1 tạ đơn + bậc',name:'Nhón gót cầm tạ',dose:'3 × 10–12 mỗi bên',sets:6,side:1,why:'Bắp chân khoẻ hơn nữa khi nhón 1 chân đã quá dễ.',cues:['Cầm tạ cùng bên với chân đang nhón','Tay kia vịn tường','Hạ gót chậm 3 giây']},
  carry:{cat:'wt',lv:1,kg:1,eq:'2 tạ đơn',name:'Xách tạ đi bộ',dose:'3 × 30–40 m',sets:3,why:'Core và vai giữ thân thẳng khi mỏi ở cuối buổi chạy.',cues:['Đứng thẳng, vai kéo nhẹ về sau','Bước đều, thân không nghiêng','Tạ đủ nặng để đi 40 m thấy mỏi tay']},

  row:{cat:'wt',lv:1,kg:1,eq:'1 tạ đơn + ghế',name:'Kéo tạ 1 tay',dose:'3 × 10 mỗi bên',sets:6,side:1,why:'Lưng trên khoẻ, vai mở, thân thẳng khi chạy dài.',cues:['Một tay chống ghế, lưng phẳng','Kéo tạ về phía hông, khuỷu tay sát người','Hạ chậm, không xoay người']},
  llungew:{fig:'llungew',cat:'wt',lv:2,kg:1,eq:'1 tạ đơn',name:'Lunge ngang ôm tạ',dose:'3 × 8 mỗi bên',sets:6,side:1,why:'Bản nặng hơn của lunge ngang.',cues:['Ôm tạ trước ngực','Ngồi về phía chân bước, lưng thẳng','Gối theo hướng mũi chân']},

  plank:{cat:'core',lv:1,eq:'Thảm',name:'Plank',dose:'3 × 30–45 giây',sets:3,t:30,why:'Thân giữ thẳng, ít lắc khi chạy.',cues:['Thẳng một đường từ đầu đến gót','Siết bụng và mông','Hông không võng xuống, không nhô lên']},
  side:{cat:'core',lv:1,eq:'Thảm',name:'Plank nghiêng',dose:'2 × 20–30 giây mỗi bên',sets:4,side:1,t:20,why:'Hông không bị xệ sang bên khi tiếp đất.',cues:['Khuỷu tay đặt ngay dưới vai','Đẩy hông lên cho thân thẳng','Khó quá thì hạ gối dưới chạm sàn']},
  bug:{cat:'core',lv:1,eq:'Thảm',name:'Dead bug',dose:'2 × 10 lần',sets:2,why:'Giữ lưng ổn định khi tay chân chuyển động, giống khi chạy.',cues:['Ép lưng dưới sát sàn suốt bài','Duỗi tay và chân đối bên thật chậm, rồi đổi bên','Lưng bật khỏi sàn là đang duỗi quá xa']},
  bird:{cat:'core',lv:1,eq:'Thảm',name:'Bird dog',dose:'2 × 10 lần',sets:2,why:'Lưng và mông phối hợp, thân thẳng.',cues:['Duỗi tay và chân đối bên thành một đường, giữ 2 giây','Lưng phẳng như đặt ly nước lên không đổ']},
  hollow:{cat:'core',lv:2,eq:'Thảm',name:'Hollow hold',dose:'3 × 20 giây',sets:3,t:20,why:'Cơ bụng trước khoẻ, giữ khung chậu không ngửa.',cues:['Lưng dưới ép sát sàn','Nâng vai và chân khỏi sàn một chút','Khó quá thì co gối hoặc để tay xuôi theo người']},
  tap:{cat:'core',lv:2,eq:'Thảm',name:'Plank chạm vai',dose:'2 × 10 mỗi bên',sets:4,side:1,why:'Chống xoay thân, giữ hông yên khi một bên rời đất.',cues:['Plank tay thẳng, hai chân rộng hơn hông','Nhấc một tay chạm vai bên kia','Hông không lắc khi nhấc tay']},
  sup:{cat:'core',lv:1,eq:'Thảm',name:'Superman',dose:'3 × 10, giữ 2 giây',sets:3,why:'Cơ lưng giữ dáng chạy thẳng khi mỏi.',cues:['Nằm sấp, nâng tay và chân vừa phải','Mắt nhìn xuống sàn, không ngửa cổ','Siết mông khi nâng chân']},

  bmarch:{cat:'core',lv:2,eq:'Thảm',name:'Bridge đổi chân',dose:'2 × 10 mỗi bên',sets:4,side:1,why:'Hông giữ ngang khi sức nặng dồn lên một chân, giống lúc chạy.',cues:['Nâng hông lên tư thế bridge','Nhấc từng gối về phía ngực, hông không xệ','Đặt chân xuống rồi đổi bên']},
  mclimb:{cat:'core',lv:2,eq:'Thảm',name:'Leo núi chậm',dose:'2 × 10 mỗi bên',sets:4,side:1,why:'Thân giữ yên khi chân kéo lên, giống lúc nhấc gối khi chạy.',cues:['Plank tay thẳng, vai ngay trên cổ tay','Kéo một gối về phía ngực thật chậm, rồi đổi chân','Hông không nhô lên']},
  bear:{cat:'core',lv:2,eq:'Thảm',name:'Gấu giữ (bear hold)',dose:'3 × 20–30 giây',sets:3,t:20,why:'Core giữ thân chắc mà không đè lên lưng dưới.',cues:['Bò bốn chân, tay dưới vai, gối dưới hông','Nhấc gối khỏi sàn khoảng 3 cm','Lưng phẳng, thở đều']},
  sideleg:{cat:'core',lv:3,eq:'Thảm',name:'Plank nghiêng nâng chân',dose:'2 × 8 mỗi bên',sets:4,side:1,why:'Thêm mông nhỡ vào plank nghiêng, hông vững hơn.',cues:['Vào plank nghiêng, thân thẳng','Nâng chân trên lên chậm rồi hạ xuống','Hông không xệ khi nâng chân']},

  quad:{cat:'mob',lv:1,eq:'Bàn / tường',name:'Giãn đùi trước',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Giảm căng phía trên gối.',cues:['Vịn bàn, kéo gót chân về phía mông','Hai gối sát nhau, không ưỡn lưng']},
  hipf:{cat:'mob',lv:1,eq:'Không cần',name:'Giãn cơ gập hông',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Hông mở, sải chân ra sau dễ hơn.',cues:['Một chân trước một chân sau như bước dài','Siết mông, đẩy hông ra trước, thân giữ thẳng','Căng ở phía trước hông của chân sau là đúng']},
  hams:{cat:'mob',lv:1,eq:'Bậc thấp',name:'Giãn đùi sau',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Đùi sau mềm, sải chân trước thoải mái.',cues:['Gót chân đặt lên bậc thấp, gối thẳng nhẹ','Gập người ở hông, lưng thẳng','Căng sau đùi là đủ, không ép tới đau']},
  calfst:{cat:'mob',lv:1,eq:'Tường',name:'Giãn bắp chân vào tường',dose:'30 giây mỗi bên × 2 kiểu',sets:4,side:1,t:30,why:'Bắp chân và gân gót bớt căng sau buổi chạy.',cues:['Chân sau thẳng, gót ép xuống sàn','Lần hai cho gối sau hơi chùng để giãn phần dưới bắp chân','Mũi chân sau hướng thẳng vào tường']},
  hug:{cat:'mob',lv:1,eq:'Thảm',name:'Ôm gối vào ngực',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Thả lỏng mông và lưng dưới.',cues:['Nằm ngửa, kéo một gối về phía ngực','Chân kia duỗi thẳng trên sàn','Thở chậm, vai thả lỏng']},
  fig4:{cat:'mob',lv:1,eq:'Thảm',name:'Giãn mông số 4',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Mông và cơ sâu ở hông bớt căng, chỗ người chạy hay bị căng.',cues:['Nằm ngửa, đặt cổ chân lên gối chân kia','Ôm sau đùi chân dưới, kéo về phía ngực','Căng ở mông bên chân bắt chéo là đúng']},
  itb:{cat:'mob',lv:1,eq:'Không cần',name:'Giãn hông ngoài',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Hông ngoài và mặt ngoài đùi bớt căng.',cues:['Bắt chéo chân cần giãn ra sau chân kia','Đẩy hông sang phía chân sau, tay cùng bên vươn qua đầu','Căng dọc hông ngoài là đúng']},
  butter:{cat:'mob',lv:1,eq:'Thảm',name:'Ngồi giãn đùi trong',dose:'30–45 giây',sets:2,t:30,why:'Đùi trong mềm, hông mở.',cues:['Ngồi, hai lòng bàn chân áp vào nhau','Tay giữ bàn chân, lưng thẳng','Từ từ đổ người về trước, không dùng tay ép gối']},
  lhams:{cat:'mob',lv:1,eq:'Thảm + khăn',name:'Giãn đùi sau nằm',dose:'30 giây mỗi bên',sets:2,side:1,t:30,why:'Giãn đùi sau mà không đè lên lưng dưới.',cues:['Nằm ngửa, vòng khăn hoặc dây qua lòng bàn chân','Kéo chân thẳng lên đến khi căng sau đùi','Chân kia duỗi trên sàn, lưng dưới không nhấc']},
  catcow:{cat:'mob',lv:1,eq:'Thảm',name:'Mèo và bò',dose:'8–10 lần',sets:1,why:'Lưng linh hoạt, dễ chịu sau một ngày ngồi nhiều.',cues:['Bò bốn chân, tay dưới vai, gối dưới hông','Hít vào: võng lưng, ngẩng đầu','Thở ra: cong lưng lên, cúi đầu']},
  child:{cat:'mob',lv:1,eq:'Thảm',name:'Tư thế em bé',dose:'45–60 giây',sets:1,t:45,why:'Thả lỏng lưng dưới, mông và vai.',cues:['Quỳ, ngồi lùi hông về gót chân','Đổ người về trước, hai tay duỗi dài trên sàn','Thở chậm bằng bụng']}
};
const LV={1:'Dễ',2:'Vừa',3:'Nâng cao'};

const SES=[
  {id:'kd',name:'Khởi động trước chạy',time:'8–10 phút',when:'Trước mọi buổi chạy. Đi bộ nhanh trước, rồi các bài mở hông, cuối cùng A-skip và gót chạm mông. Ngày chạy dài hoặc chân còn mỏi thì bỏ hai bài cuối.',mini:['warm'],ex:['swing','lswing','hipc','march','wlunge','aski','butt']},
  {id:'gc',name:'Giãn cơ sau chạy',time:'10–12 phút',when:'Sau mọi buổi chạy, khi cơ còn ấm. Giữ mỗi tư thế 30 giây, thở đều, không ép tới đau.',mini:['foam'],ex:['calfst','quad','hams','hipf','fig4','itb']},
  {id:'kt',name:'Sức mạnh không tạ',time:'25 phút',when:'2 buổi mỗi tuần trong 2–3 tuần đầu chạy lại. Tập sau buổi chạy nhẹ hoặc ngày không chạy.',ex:['lunge','step','slbridge','slrdl','calf1','band']},
  {id:'ta',name:'Sức mạnh với tạ',time:'35–40 phút',when:'Thay buổi không tạ khi đã chạy 3 buổi mỗi tuần không đau 2–3 tuần. 2 buổi mỗi tuần, cách nhau ít nhất 2 ngày.',ex:['goblet','rdl','bss','thrust','calfw','row','carry']},
  {id:'core',name:'Core 15 phút',time:'15 phút',when:'2–3 lần mỗi tuần, sau buổi chạy nhẹ hoặc buổi tối.',ex:['plank','side','bug','bird','hollow','sup']},
  {id:'core2',name:'Core nâng cao',time:'15 phút',when:'Khi Core 15 phút đã thấy dễ: thay vào 1 trong 2–3 buổi core mỗi tuần.',ex:['bear','mclimb','tap','sideleg','bmarch','hollow']},
  {id:'ky',name:'Kỹ thuật chạy',time:'15 phút',when:'1 lần mỗi tuần, sau khởi động và trước buổi chạy nhẹ. Làm từ tuần 3, khi đã chạy lại không đau.',ex:['march','aski','butt','sll','carioca','bskip']},
  {id:'toi',name:'Giãn cơ buổi tối',time:'12–15 phút',when:'Buổi tối ngày nghỉ hoặc ngày tập chân, nhẹ nhàng trước khi ngủ.',ex:['catcow','child','lhams','fig4','butter','hug']}
];
const KT='0;.4;.55;.95;1',KS='.42 0 .58 1;0 0 1 1;.42 0 .58 1;0 0 1 1';
const am=(at,a,b,d)=>a===b?'':`<animate attributeName="${at}" values="${a};${b};${b};${a};${a}" keyTimes="${KT}" calcMode="spline" keySplines="${KS}" dur="${d}s" repeatCount="indefinite"/>`;
const CL={0:'b',1:'a',3:'bd'};
function fig(k,name,rm){
  const RM=()=>!!rm;
  const f=F[k],A=f.j,B={...A,...(f.b||{})},mv=!!f.b&&!RM(),d=f.dur||3.2;
  const ln=(c,a1,a2,b1,b2)=>{const p=RM()?[b1,b2]:[a1,a2],kids=mv?am('x1',a1[0],b1[0],d)+am('y1',a1[1],b1[1],d)+am('x2',a2[0],b2[0],d)+am('y2',a2[1],b2[1],d):'';const tag=`<line class="${c}" x1="${p[0][0]}" y1="${p[0][1]}" x2="${p[1][0]}" y2="${p[1][1]}"`;return kids?`${tag}>${kids}</line>`:`${tag}/>`};
  const segs=[...f.s].sort((p,q)=>(p[2]||0)-(q[2]||0));
  const l=segs.map(([p,q,x])=>ln(CL[x||0],A[p],A[q],B[p],B[q])).join('');
  const w=(f.wt||[]).map(x=>{const[j,dy]=Array.isArray(x)?x:[x,5],o=(p,dx)=>[p[0]+dx,p[1]+dy];return ln('wt',o(A[j],-6),o(A[j],6),o(B[j],-6),o(B[j],6))}).join('');
  const h=RM()?B.hd:A.hd,hk=mv?am('cx',A.hd[0],B.hd[0],d)+am('cy',A.hd[1],B.hd[1],d):'';
  return `<svg viewBox="0 0 240 140" role="img" aria-label="Minh họa ${name}">${f.mat?'<rect class="mat" x="12" y="126" width="216" height="6" rx="3"/>':''}<line class="fl" x1="6" y1="132" x2="234" y2="132"/><g transform="translate(0,${f.dy||0})">${f.pre||''}${l}<circle class="hd" cx="${h[0]}" cy="${h[1]}" r="${f.r||9}">${hk}</circle>${w}${f.post||''}</g></svg>`;
}
window.BaiTap={F,E,LV,SES,fig};
})();
