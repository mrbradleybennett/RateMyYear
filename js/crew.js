/* ---------- Review Crew on Firebase (Google sign-in + Firestore) ---------- */
/* Firebase loads in the background, only once the page is working. If it can't load (blocked or offline),
   the solo review still works; only crew features are unavailable. */
const FB_URLS=["https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js","https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"];
let initializeApp,signInWithCredential,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,connectAuthEmulator,signInAnonymously,linkWithPopup,getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,arrayUnion,arrayRemove,writeBatch,getDocs,limit;

const $=id=>document.getElementById(id);
const body=$("famBody"), title=$("famTitle"), leaveBtn=$("famLeave");
const banner=$("reviewBanner"), bannerText=$("reviewBannerText"), saveBtn=$("famSave"), soloBtn=$("soloSave");
const pick=$("famPick"), pickHint=$("famPickHint"), nameInput=$("name"), revCount=$("revCount");
const LS_CREW="ratemyyear-crew";
const PAGE=window.RMY_PAGE||"review";
const ADMIN=PAGE==="admin";                       // My Crew page
const JOIN=PAGE==="join";                         // Join A Crew page
const HOME_PATH=location.pathname.replace(/[^/]*$/,"");      // the landing page
/* Menu: mark the page you're on; show "My Crew" straight away if this device was signed in last time. */
if(ADMIN) document.getElementById("choiceCreate").setAttribute("aria-current","page");
if(JOIN) document.getElementById("choiceJoin").setAttribute("aria-current","page");
if(!ADMIN&&!JOIN) document.getElementById("navRate").setAttribute("aria-current","page");
try{if(localStorage.getItem("rmy-signedin")==="1")document.getElementById("choiceCreate").textContent="My Crew"}catch(e){}
const REVIEW_PATH=HOME_PATH+"review.html";
const MYCREW_PATH=HOME_PATH+"mycrew.html";
const JOIN_PATH=HOME_PATH+"join.html";
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

let auth=null, db=null, user=null;
let crewId="", crew=null, claims={}, reviewsById={}, unsubs=[], revUnsubs=[], revKey="", doneBy={};
let resetArmed=false, resetting=false;
let boardById={}, boardSyncT=0, typeArmed="", boardUnsub=null, boardSubOn=false;
let me="", target=null, pending="", adminTab="scores", reportMember="", removeArmed="", managing="", myCrews=[];
let invite=null; // {crew, code} from the link
let guestTried=false;

/* ---------- helpers ---------- */
/* Crew names: unique, searchable by their slug. Passwords are stored as a SHA-256 hash of slug + password. */
const slugify=t=>String(t||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50);
function sha256hex(str){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes=[...new TextEncoder().encode(str)], l=bytes.length*8;
  bytes.push(0x80); while(bytes.length%64!==56) bytes.push(0);
  for(let i=7;i>=0;i--) bytes.push(i>3?0:(l>>>(i*8))&255);
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const r=(x,n)=>(x>>>n)|(x<<(32-n)), w=new Array(64);
  for(let o=0;o<bytes.length;o+=64){
    for(let i=0;i<16;i++) w[i]=(bytes[o+4*i]<<24)|(bytes[o+4*i+1]<<16)|(bytes[o+4*i+2]<<8)|bytes[o+4*i+3];
    for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3), s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10); w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){const S1=r(e,6)^r(e,11)^r(e,25), ch=(e&f)^(~e&g), t1=(h+S1+ch+K[i]+w[i])|0, S0=r(a,2)^r(a,13)^r(a,22), mj=(a&b)^(a&c)^(b&c), t2=(S0+mj)|0; h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}
    H=H.map((v,i)=>(v+[a,b,c,d,e,f,g,h][i])|0);
  }
  return H.map(v=>(v>>>0).toString(16).padStart(8,"0")).join("");
}
const passHash=(slug,pw)=>sha256hex(slug+":"+pw);
let afterAuth=null;
const rid=(n=10)=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(x=>"abcdefghjkmnpqrstuvwxyz23456789"[x%31]).join("")};
const members=()=>(crew&&Array.isArray(crew.members))?crew.members:[];
const memberName=id=>(members().find(m=>m.id===id)||{}).name||"Someone";
/* A crew is either a Family crew or a Mates crew. Older crews without a type keep each person's own type. */
const crewMemberType=()=>CREW_TYPES[crewTypeOf(crew&&crew.type)].member;
const memberType=id=>crew&&crew.type?crewMemberType():(((members().find(m=>m.id===id)||{}).type)||"family");
const isMember=id=>members().some(m=>m.id===id);
const isAdmin=()=>!!(crew&&user&&Array.isArray(crew.adminUids)&&crew.adminUids.includes(user.uid));
const isOwner=()=>!!(crew&&user&&crew.ownerUid===user.uid);
const reviews=()=>Object.values(reviewsById);
/* One review per reviewer per person: if someone came back on a new device (name freed up) and reviewed again,
   only their latest review counts. */
const liveReviews=()=>{const best={};reviews().filter(r=>isMember(r.member)&&isMember(r.reviewer)).forEach(r=>{const k=r.reviewer+"|"+r.member;if(!best[k]||(r.savedAt||0)>(best[k].savedAt||0))best[k]=r});return Object.values(best)};
const fillThey=t=>t.replace(/\{(you|your|yourself|are)\}/g,(_,k)=>P.other[k]).replace(/(^|[.?!]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
const peopleLine=n=>n===0?"No one has reviewed them yet":`${n} ${n===1?"person has":"people have"} given a review`;
const dot=v=>v==null?`<span class="muted">–</span>`:`<span class="g-dot" style="--g:${gcol(grade(v))}">${grade(v)}</span>${v.toFixed(1)}`;
const errText=x=>{
  const c=x&&x.code||"";
  if(c==="permission-denied") return "You don't have access to do that. Check you're in this crew, or ask the crew admin for a new invite link.";
  if(c==="unavailable") return "Can't reach the database. Check your connection and try again.";
  if(c==="timeout") return "The database took too long to answer (over 12 seconds).";
  if(c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request") return "Sign-in was cancelled.";
  console.warn("Rate My Year error:",x);
  return "Something went wrong. Check your connection and try again in a moment.";
};
/* Boot status and safety nets: the crew box never sits on a loading message forever. */
const BUSY=/^(Loading|Connecting|Signing you in|Loading your crews|Getting ready|Joining the crew)/;
const status=m=>{body.innerHTML=`<p class="muted">${m}</p>`};
const stillBusy=()=>BUSY.test(body.textContent.trim());
function showFatal(x){
  if(!stillBusy()) return;
  body.innerHTML=`<p class="err">The crew tools couldn't load. ${x&&String(x.code||x.message||x).includes("sign-in check timed out")?"Check your connection, or turn off content blockers for this site.":""}</p><p class="muted">Reload the page to try again. If it keeps happening, send a screenshot of this message.</p><div class="row-btns"><button type="button" id="bootReload">Reload</button></div>`;
  $("bootReload").onclick=()=>location.reload();
}
window.addEventListener("error",e=>showFatal(e.error||e.message));
window.addEventListener("unhandledrejection",e=>showFatal(e.reason));
const withTimeout=(pr,ms,what)=>Promise.race([pr,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(new Error(`${what} took too long`),{code:"timeout"})),ms))]);
const inviteLink=()=>crew?`${location.origin}${REVIEW_PATH}?crew=${crewId}&code=${crew.joinCode}`:"";
const parseInvite=s=>{
  s=(s||"").trim(); if(!s) return null;
  try{const u=new URL(s);const c=u.searchParams.get("crew"),k=u.searchParams.get("code");if(c&&k)return {crew:c,code:k}}catch(e){}
  const m=s.match(/^([a-z0-9]{6,40})[-\s:]+([a-z0-9]{4,40})$/i); return m?{crew:m[1],code:m[2]}:null;
};
/* "I am": each device/account says who it is in accounts/{uid}. Several devices can be the same person.
   claims/{memberId} just records the latest account to pick that name (used for admin tools). */
async function claimMember(cid,memberId,oldMemberId){
  const b=writeBatch(db);
  // let go of the name this device had before (only if this device holds it)
  if(oldMemberId&&oldMemberId!==memberId&&claims[oldMemberId]===user.uid) b.delete(doc(db,"crews",cid,"claims",oldMemberId));
  b.set(doc(db,"crews",cid,"accounts",user.uid),{member:memberId},{merge:true});
  b.set(doc(db,"crews",cid,"claims",memberId),{uid:user.uid,at:Date.now()});
  await b.commit();
}
const loadLS=()=>{try{return localStorage.getItem(LS_CREW)||""}catch(e){return ""}};
const saveLS=v=>{try{v?localStorage.setItem(LS_CREW,v):localStorage.removeItem(LS_CREW)}catch(e){}};
let crewNoteT=0;
function crewNote(html,warn){const el=$("crewNote");if(!el)return;el.innerHTML=html;el.className="crewnote"+(warn?" warn":"");el.hidden=false;clearTimeout(crewNoteT);crewNoteT=setTimeout(()=>{el.hidden=true},9000)}
function meErr(m){const el=$("meErr");if(!el)return famErr(m);el.textContent=m;el.hidden=!m;if(m)setTimeout(()=>{if(el.textContent===m)el.hidden=true},12000)}
function famErr(m){const el=$("famErr");if(!el)return;el.textContent=m;el.hidden=!m}
/* Message bar: long-lasting ones (errors) are shown in red. */
const toast=(m,ms=3500,err=ms>=5000)=>{const t=$("toast");t.classList.toggle("err",!!err);t.textContent=m;setTimeout(()=>{if(t.textContent===m)t.textContent=""},ms)};
/* A message carried over a page reload (Save & Rate Another). */
try{const f=sessionStorage.getItem("rmy-flash");if(f){sessionStorage.removeItem("rmy-flash");try{history.scrollRestoration="manual"}catch(e){}scrollTo(0,0);setTimeout(()=>toast(f,5000,false),600)}}catch(e){}

/* ---------- aggregation ---------- */
const setOf=id=>SETS[setForType(memberType(id))];
function aggFor(id){
  const CATS=setOf(id).cats;
  const rs=liveReviews().filter(r=>r.member===id);
  const self=rs.find(r=>r.reviewer===id)||null, others=rs.filter(r=>r.reviewer!==id);
  const pickAvg=(list,get)=>{const vs=list.map(get).filter(v=>v!=null);return vs.length?mean(vs):null};
  const cats=list=>list.length?Object.fromEntries(CATS.map(c=>[c.id,pickAvg(list,r=>r.cats&&r.cats[c.id])])):null;
  const qs=list=>list.length?Object.fromEntries(CATS.flatMap(c=>["t",0,1,2].map(i=>[c.id+i,pickAvg(list,r=>r.values&&r.values[c.id+i])]))):null;
  const all=cats(rs), fa=cats(others);
  const main=fa||all;
  const known=main?CATS.map(c=>main[c.id]).filter(v=>v!=null):[];
  const overall=known.length?mean(known):null;
  return {rs,self,others,sa:self?self.cats:null,fa,all,main,overall,qSelf:self?self.values:null,qFam:qs(others)};
}
const ranked=(main,CATS)=>CATS.map((c,i)=>({c,v:main[c.id],i})).filter(x=>x.v!=null).sort((x,y)=>y.v-x.v||x.i-y.i);
const groupLine=(main,GROUPS)=>GROUPS.map(g=>{const vs=g.ids.map(id=>main[id]).filter(v=>v!=null);const v=vs.length?mean(vs):null;return `<span class="gl g-${g.id}"><b>${g.name}</b> ${dot(v)}</span>`}).join("");
const listHTML=rows=>`<ol>${rows.map(r=>`<li style="--g:${gcol(grade(r.v))}"><span class="chip">${grade(r.v)}</span><span class="nm">${r.c.name}</span><span class="sc">${r.v.toFixed(1)}</span></li>`).join("")}</ol>`;
const recsHTML=rows=>rows.map(r=>`<div class="rec" style="--g:${gcol(grade(r.v))}"><h4>${r.c.name} <span class="tag">${grade(r.v)} · ${r.v.toFixed(1)}</span></h4><ul>${r.c.recs.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");

/* ---------- report builders ---------- */
function memberReportHTML(id,detailed){
  const a=aggFor(id), name=esc(memberName(id)), S=setOf(id), CATS=S.cats;
  if(!a.rs.length||a.overall==null) return `<div class="results"><h3>${name}</h3><p class="muted">${a.rs.length?"Every area was marked don't know so far.":peopleLine(0)+"."}</p></div>`;
  /* Members see combined crew scores only, never who said what, and only once 2+ people have reviewed them.
     Crew admins (detailed view) see who reviewed. */
  const locked=!detailed&&a.others.length+(a.self?1:0)<2;
  if(locked){a.fa=null;a.main=a.sa||a.main;const k=a.main?CATS.map(c=>a.main[c.id]).filter(v=>v!=null):[];a.overall=k.length?mean(k):a.overall}
  if(!a.main||a.overall==null) return `<div class="results"><h3>${name}</h3><p class="muted">🔒 Crew scores show after 2 reviews, so nobody's rating stands out on its own.</p></div>`;
  const r=ranked(a.main,CATS), bottom=r.slice(Math.max(3,r.length-3)).reverse();
  const who=a.rs.map(x=>x.reviewer===id?"themselves":esc(memberName(x.reviewer)));
  const gap=c=>a.sa&&a.fa&&a.sa[c.id]!=null&&a.fa[c.id]!=null?(a.sa[c.id]-a.fa[c.id]):null;
  let html=`<div class="results">
    <h3>${name} · ${grade(a.overall)} overall (${a.overall.toFixed(1)})</h3>
    <p class="count">${peopleLine(a.rs.length)}${a.self?" (including a self review)":""}</p>
    <p class="muted">${S.label} questions</p>
    <div class="glines">${groupLine(a.main,S.groups)}</div>
    <p class="muted">${detailed?`Reviewed by ${who.join(", ")}.`:locked?"🔒 Crew scores show after 2 reviews, so nobody's rating stands out on its own. For now this shows your own ratings.":"Crew scores are combined, so you can't see who gave which score."}</p>
    <div class="rtable-wrap"><table class="rtable">
      <thead><tr><th>Area</th><th>Self</th><th>Crew</th>${detailed?"<th>Gap</th>":""}</tr></thead>
      <tbody>${CATS.map(c=>{const g=gap(c);return `<tr><td><b>${c.name}</b></td><td class="n">${dot(a.sa?a.sa[c.id]:null)}</td><td class="n">${dot(a.fa?a.fa[c.id]:null)}</td>${detailed?`<td class="n">${g==null?"–":(g>0?"+":"")+g.toFixed(1)}</td>`:""}</tr>`}).join("")}</tbody>
    </table></div>`;
  if(detailed){
    html+=`<p class="muted">Gap is self score minus crew score. A big plus means ${name} rates themselves higher than the crew does. Question scores only appear where reviewers answered that question. Don't know answers are left out.</p>
    <div class="rtable-wrap"><table class="rtable">
      <thead><tr><th>Question</th><th>Self</th><th>Crew</th></tr></thead>
      <tbody>${CATS.map(c=>`<tr class="qcat"><td colspan="3">${c.name}</td></tr>`+c.qs.map((q,i)=>`<tr><td>${esc(fillThey(q[0]))}</td><td class="n">${dot(a.qSelf&&a.qSelf[c.id+i]!=null?a.qSelf[c.id+i]:null)}</td><td class="n">${dot(a.qFam&&a.qFam[c.id+i]!=null?a.qFam[c.id+i]:null)}</td></tr>`).join("")).join("")}</tbody>
    </table></div>`;
  }
  html+=`<div class="split"><div class="list"><h3>Top 3</h3>${listHTML(r.slice(0,3))}</div><div class="list"><h3>Bottom 3</h3>${listHTML(bottom)}</div></div>
    <div class="recs"><h3>Ideas for the bottom two</h3>${recsHTML(bottom.slice(0,2))}</div></div>`;
  return html;
}
const setsInCrew=()=>Object.values(SETS).filter(S=>members().some(m=>setOf(m.id)===S));
function scoreboardHTML(){
  if(!members().length) return `<p class="muted">Add people to your crew to see scores.</p>`;
  const sets=setsInCrew();
  return sets.map(S=>(sets.length>1?`<h3 class="set-h">${S.label}</h3>`:"")+scoreTableHTML(S)).join("")+`<p class="muted">Scores use the crew's view of each person. Where someone only has a self review, that is used instead.${sets.length>1?" Mates are rated on the mates questions, everyone else on the family and others questions.":""}</p>`;
}
function scoreTableHTML(S){
  const CATS=S.cats, GROUPS=S.groups;
  const rows=members().filter(m=>setOf(m.id)===S).map(m=>({m,a:aggFor(m.id)})).sort((x,y)=>(y.a.overall??-1)-(x.a.overall??-1));
  const gv=(a,g)=>{if(!a.main)return null;const vs=g.ids.map(id=>a.main[id]).filter(v=>v!=null);return vs.length?mean(vs):null};
  return `<div class="rtable-wrap"><table class="rtable score">
    <thead><tr><th>Member</th><th>Reviews</th><th>Overall</th>${GROUPS.map(g=>`<th>${g.name}</th>`).join("")}${CATS.map(c=>`<th>${c.name}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(({m,a})=>`<tr><td><b>${esc(m.name)}</b></td><td class="n">${a.rs.length}</td><td class="n">${dot(a.overall)}</td>${GROUPS.map(g=>`<td class="n">${dot(gv(a,g))}</td>`).join("")}${CATS.map(c=>`<td class="n">${a.main?dot(a.main[c.id]):"–"}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}
function crewReportHTML(){
  const ms=members(), total=liveReviews().length;
  const all=ms.map(m=>({m,a:aggFor(m.id)})).filter(x=>x.a.overall!=null);
  if(!all.length) return `<p class="muted">No reviews yet. Once your crew saves reviews, the crew report appears here.</p>`;
  const sets=setsInCrew().filter(S=>all.some(x=>setOf(x.m.id)===S));
  return `<p class="count">${total} review${total===1?"":"s"} saved · ${all.length} of ${ms.length} members reviewed</p>`+sets.map(S=>crewSetHTML(S,all.filter(x=>setOf(x.m.id)===S),sets.length>1)).join("");
}
function crewSetHTML(S,withData,multi){
  const CATS=S.cats, ms=members().filter(m=>setOf(m.id)===S);
  const famCat=Object.fromEntries(CATS.map(c=>{const vs=withData.map(x=>x.a.main[c.id]).filter(v=>v!=null);return [c.id,vs.length?mean(vs):null]}));
  const known=CATS.map(c=>famCat[c.id]).filter(v=>v!=null), overall=mean(known);
  const leader=c=>withData.filter(x=>x.a.main[c.id]!=null).reduce((b,x)=>!b||x.a.main[c.id]>b.a.main[c.id]?x:b,null);
  const r=ranked(famCat,CATS), bottom=r.slice(Math.max(3,r.length-3)).reverse();
  return `<div class="results">
    <h3>${esc(crew.name)}${multi?` · ${S.label}`:""} · ${grade(overall)} overall (${overall.toFixed(1)})</h3>
    <p class="count">${withData.length} of ${ms.length} ${S.key==="mates"?"mates":"people"} reviewed</p>
    <div class="glines">${groupLine(famCat,S.groups)}</div>
    <div class="rtable-wrap"><table class="rtable">
      <thead><tr><th>Area</th><th>Crew</th><th></th><th>Leads the crew</th></tr></thead>
      <tbody>${CATS.map(c=>{const v=famCat[c.id],l=leader(c);return `<tr><td><b>${c.name}</b></td><td class="n">${dot(v)}</td><td style="width:30%">${v==null?"":`<div class="bar" style="--g:${gcol(grade(v))}"><i style="width:${(v-1)/9*100}%"></i></div>`}</td><td>${l?`${esc(l.m.name)} (${l.a.main[c.id].toFixed(1)})`:"–"}</td></tr>`}).join("")}</tbody>
    </table></div>
    <div class="split"><div class="list"><h3>Crew strengths</h3>${listHTML(r.slice(0,3))}</div><div class="list"><h3>Crew weak spots</h3>${listHTML(bottom)}</div></div>
    <div class="recs"><h3>What the crew could work on together</h3>${recsHTML(bottom.slice(0,2))}</div>
  </div>`;
}

/* ---------- sign-in ---------- */
const isGuest=()=>!!(user&&user.isAnonymous);
async function googleSignIn(){
  const prov=new GoogleAuthProvider();
  try{
    if(auth.currentUser&&auth.currentUser.isAnonymous){
      try{await linkWithPopup(auth.currentUser,prov,browserPopupRedirectResolver);location.reload();return}
      catch(x){
        // This Google account already exists: sign straight into it with the sign-in just done.
        // (Opening a second Google window here gets blocked by Safari.)
        if(x&&x.code==="auth/credential-already-in-use"){
          const cred=GoogleAuthProvider.credentialFromError(x);
          if(cred){await signInWithCredential(auth,cred);return}
        }
        throw x;
      }
    }
    await signInWithPopup(auth,prov,browserPopupRedirectResolver);
  }catch(x){
    const c=x&&x.code||"";
    if(c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request") return famErr("Google sign-in was closed before it finished. Tap Sign in with Google to try again.");
    if(c==="auth/popup-blocked") return famErr("Your browser blocked the Google sign-in window. Tap Sign in with Google again. If it keeps happening, turn off Block Pop-ups for this site (on iPad: Settings → Apps → Safari).");
    if(c==="auth/unauthorized-domain") return famErr(`Google sign-in isn't working on this site right now. Please try again later.`);
    if(c==="auth/operation-not-supported-in-this-environment"){try{try{sessionStorage.setItem("rmy-redirect","1")}catch(e){}await signInWithRedirect(auth,prov,browserPopupRedirectResolver);return}catch(y){x=y}}
    famErr(`Google sign-in didn't work. ${errText(x)}`);
  }
}
const GOOGLE_SVG=`<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>`;
const whoRow=extra=>`<div class="who-row"><span>${isGuest()?"You're in as a guest":`Signed in as <b>${esc(user.displayName||user.email||"you")}</b>`}</span><span class="row-btns">${extra||""}${isGuest()?"":`<button type="button" class="ghost sm" id="signOut">Sign out</button>`}</span></div>`;

/* ---------- screens ---------- */
function viewSignedOut(msg=""){
  title.textContent="Your crew"; leaveBtn.hidden=true;
  body.innerHTML=ADMIN?`<div class="stack">
    <p>Sign in with Google to set up a crew you can manage from any device. You add the people, send the invite link and see everyone's reports.</p>
    <div><button type="button" class="gbtn" id="gSignIn">${GOOGLE_SVG}Sign in with Google</button></div>
    <p class="muted">No account? Do your own review, then tap <b>Invite Others To Rate You</b> at the end to make a quick link without signing in. <a href="review.html?who=me">Start a review</a></p>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`:`<div class="stack">
    <p class="muted">Do your own review below. At the end, tap <b>Invite Others To Rate You</b> to send a link to your family, mates or partner. Got an invite link? Just tap it in your message.</p>
    <div><a class="topbtn" href="${JOIN_PATH}">Join A Crew</a></div>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  if($("gSignIn")) $("gSignIn").onclick=googleSignIn;
}

function viewLobby(msg=""){
  const cbox=document.querySelector("#fam .crew-box"); if(cbox) cbox.hidden=false;
  /* Review page with no crew of the type picked: just do the review. Crews are set up from the invite at the end,
     or on My Crew (for a second crew of the same type). */
  if(REVIEW_PAGE&&entry!=="join"){if(cbox)cbox.hidden=true;body.innerHTML="";
    /* Show the questions for the type you used last, so the highlighted button matches. */
    try{const lt=localStorage.getItem("rmy-last-type"), r=lt&&$("who-"+lt);if(r&&setForType(lt)!==activeSet()){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}))}}catch(e){}if(msg)toast(msg.replace(/<[^>]+>/g,""),5000,false);return}
  title.textContent="Your crew"; leaveBtn.hidden=true;
  body.innerHTML=`<div class="stack">
    ${whoRow("")}
    ${myCrews.length?`<div class="field"><label>Your crews</label><div class="crew-list">${myCrews.map(c=>`<button type="button" class="ghost" data-open="${esc(c.id)}">${esc(c.name)}</button>`).join("")}</div></div>`:""}
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="tabJoin" aria-selected="true">Join a crew</button>
      <button type="button" role="tab" id="tabCreate" aria-selected="false">Set up a new crew</button>
    </div>
    <form class="form" id="joinForm" novalidate>
      <div class="field" style="grid-column:1/-1"><label for="jLink">Invite link</label><input id="jLink" autocomplete="off" placeholder="Paste the link your crew admin sent you"></div>
      <button type="submit" id="joinGo">Join crew</button>
    </form>
    <div id="createGuest" hidden class="stack"><p class="muted">Setting up a crew needs a Google sign-in, so you can manage it as the crew admin. Any crews you've joined stay with you.</p><div><button type="button" class="gbtn" id="gUpgrade">${GOOGLE_SVG}Continue with Google</button></div></div>
    <form class="form" id="createForm" novalidate hidden>
      <div class="field"><label for="cType">Crew type</label><select id="cType"><option value="family">Family</option><option value="mates">Mates</option><option value="partner">Couple Check-in</option></select></div>
      <div class="field"><label for="cMe">Your name</label><input id="cMe" autocomplete="off" value="${esc((user.displayName||"").split(" ")[0])}"></div>
      <div class="field"><label for="cPw">Backup password <span class="muted">(optional)</span></label><input id="cPw" type="password" autocomplete="new-password" placeholder="At least 6 characters"><button type="button" class="ghost sm pwshow" data-for="cPw" aria-pressed="false">Show</button></div>
      <p class="muted" style="grid-column:1/-1">Once it's set up, send your crew the invite link. They open it and pick their name. No sign-in needed. The backup password is only for anyone who loses the link. Your crew gets its own unique name, a number followed by the crew type, like <b>482931-family</b>, <b>482931-mates</b> or <b>482931-love</b>.</p>
      <button type="submit" id="createGo">Create crew</button>
    </form>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  if($("signOut")) $("signOut").onclick=()=>signOut(auth);
  $("gUpgrade").onclick=googleSignIn;
  body.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openCrew(b.dataset.open));
  const tab=t=>{$("tabJoin").setAttribute("aria-selected",t==="join");$("tabCreate").setAttribute("aria-selected",t==="create");$("joinForm").hidden=t!=="join";$("createForm").hidden=t!=="create"||isGuest();$("createGuest").hidden=t!=="create"||!isGuest();famErr("")};
  $("tabJoin").onclick=()=>tab("join"); $("tabCreate").onclick=()=>tab("create");
  body.querySelector(".tabs").hidden=true;
  if(ADMIN){tab("create");$("joinForm").hidden=true}
  else{$("joinForm").hidden=true;$("createForm").hidden=true;$("createGuest").hidden=true;const n=document.createElement("div");n.className="stack";n.innerHTML=`<div><a class="topbtn" href="${JOIN_PATH}">Join A Crew</a></div><p class="muted">To set up a new crew, tap <a href="${MYCREW_PATH}">My Crews</a> at the top.</p>`;$("joinForm").after(n)}
  $("joinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inv=parseInvite($("jLink").value);
    if(!inv) return famErr("That doesn't look like an invite link. Ask your crew admin to send it again.");
    $("joinGo").disabled=true; await joinCrew(inv); const b=$("joinGo"); if(b) b.disabled=false;
  });
  $("createForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const myName=$("cMe").value.trim().slice(0,40), pw=$("cPw").value, ctype=crewTypeOf($("cType").value);
    if(!myName) return famErr("Enter your name so the crew knows who you are.");
    if(pw&&pw.length<6) return famErr("Use a backup password of at least 6 characters, or leave it blank.");
    $("createGo").disabled=true;
    try{
      /* Unique crew name: a number followed by the crew type, e.g. 482-love. */
      let name="", slug="";
      for(let i=0;i<12&&!slug;i++){
        const n=Math.floor(100000+Math.random()*900000);   // 6 digits: hard to guess
        const cand=`${n}-${CREW_SUFFIX[ctype]}`;
        if(!(await getDoc(doc(db,"crewNames",cand))).exists()){name=cand;slug=cand}
      }
      if(!slug){$("createGo").disabled=false;return famErr("Couldn't find a free crew number. Please try again.")}
      const id=rid(10), myId=rid(10), b=writeBatch(db);
      b.set(doc(db,"crews",id),{name,slug,type:ctype,showBoard:true,...(pw?{passHash:passHash(slug,pw)}:{}),ownerUid:user.uid,ownerEmail:user.email||"",adminUids:[user.uid],joinCode:rid(8),members:[{id:myId,name:myName,type:CREW_TYPES[ctype].member}],createdAt:Date.now()});
      b.set(doc(db,"crewNames",slug),{crewId:id,name,slug});
      try{await b.commit()}
      catch(x){
        $("createGo").disabled=false;
        if(x&&x.code==="permission-denied") return famErr(ctype==="partner"?"Couldn't create the crew right now. Please try again in a moment.":"Couldn't create the crew right now. Please try again in a moment.");
        return famErr(errText(x));
      }
      /* The crew exists now, so open it even if one of these finishing steps fails. */
      try{await claimMember(id,myId,"")}catch(x){console.warn("claim",x)}
      try{await rememberCrew(id,name)}catch(x){console.warn("remember",x)}
      openCrew(id);
    }catch(x){famErr(errText(x));const b=$("createGo");if(b)b.disabled=false}
  });
}

async function rememberCrew(id,name){
  myCrews=[...myCrews.filter(c=>c.id!==id),{id,name}];
  await setDoc(doc(db,"users",user.uid),{crews:myCrews},{merge:true});
}
async function forgetCrew(id){
  myCrews=myCrews.filter(c=>c.id!==id);
  await setDoc(doc(db,"users",user.uid),{crews:myCrews},{merge:true});
}

/* ---------- Join A Crew: open or paste the invite link; crew name + backup password if the link is lost ---------- */
function guestFail(x,retry){
  const c=x&&x.code||"";
  const msg=c==="auth/operation-not-allowed"||c==="auth/admin-restricted-operation"?"Joining isn't switched on yet. Something isn't set up right on our side. Please try again later."
    :c==="timeout"?"Couldn't reach the sign-in service (it took too long). Check your connection, or turn off content blockers and iCloud Private Relay for this site, then try again."
    :c==="auth/network-request-failed"?"Couldn't reach the sign-in service. Check your connection and try again."
    :errText(x);
  body.innerHTML=`<div class="stack"><p class="err">${esc(msg)}</p><div class="row-btns"><button type="button" id="guestRetry">Try again</button></div></div>`;
  $("guestRetry").onclick=retry;
}
async function startJoin(){
  if(ADMIN){location.href=JOIN_PATH;return}
  $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  if(!auth){famErr("Crews aren't connected yet.");return}
  if(!user&&auth.currentUser) user=auth.currentUser;
  if(!user){
    body.innerHTML=`<p class="muted">Getting ready…</p>`;
    afterAuth=()=>{if(!$("jq"))viewJoin()};
    try{const c=await withTimeout(signInAnonymously(auth),15000,"Getting ready");user=c.user;if(!$("jq"))viewJoin()}
    catch(x){afterAuth=null;guestFail(x,startJoin)}
    return;
  }
  viewJoin();
}
function viewJoin(msg=""){
  clearCrewSubs(); crew=null; crewId=""; target=null; render();
  title.textContent="Join a crew"; leaveBtn.hidden=true;
  body.innerHTML=`<div class="stack">
    <p class="muted">${JOIN?"Tap the invite link in your message, or paste it here.":"Open the invite link your crew admin sent you and pick your name. No sign-in needed. Tap it in your message, or paste it here."}</p>
    <form class="form" id="jlinkForm" novalidate>
      <div class="field" style="grid-column:1/-1"><label for="jLink2">Invite link</label><input id="jLink2" autocomplete="off" placeholder="Paste the invite link" value="${esc(window.__jl||"")}" oninput="window.__jl=this.value"></div>
      <button type="submit" id="jlinkGo">Join crew</button>
    </form>
    <details class="jbackup"><summary>Lost the link? Use the crew name and backup password</summary>
    <div class="stack" style="margin-top:10px">
    <div class="field"><label for="jq">Crew name</label><input id="jq" type="search" autocomplete="off" placeholder="e.g. 482931-family" enterkeyhint="search"></div>
    <div class="jres" id="jres" aria-live="polite"></div>
    <form class="form" id="jpass" novalidate hidden>
      <p class="jpick" id="jpick" style="grid-column:1/-1"></p>
      <div class="field"><label for="jpw">Crew password</label><input id="jpw" type="password" autocomplete="off"></div>
      <button type="submit" id="jgo">Join crew</button>
    </form>
    <p class="muted">Ask your crew admin for the backup password, or for a fresh invite link.</p>
    </div></details>
    <div class="row-btns">${myCrews.length?`<button type="button" class="ghost sm" id="jback">Back to my crew</button>`:""}</div>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  let pickId="", pickSlug="", pickName="", t=0, seq=0;
  const res=$("jres");
  const search=async()=>{
    const q=slugify($("jq").value); const my=++seq;
    if(q.length<2){res.innerHTML=q?`<p class="muted">Keep typing…</p>`:"";return}
    res.innerHTML=`<p class="muted">Searching…</p>`;
    try{
      /* Exact match only, so crews can't be browsed: the full name (e.g. 482931-family), or just its number. */
      const opts=/^\d+$/.test(q)?[q,q+"-family",q+"-mates",q+"-love"]:[q];
      const snap=await getDocs(query(collection(db,"crewNames"),where("slug","in",opts),limit(10)));
      if(my!==seq) return;
      const hits=snap.docs.map(d=>d.data());
      res.innerHTML=hits.length?hits.map(h=>`<button type="button" class="jhit" data-id="${esc(h.crewId)}" data-slug="${esc(h.slug)}" data-name="${esc(h.name)}">${esc(h.name)}</button>`).join(""):`<p class="muted">No crew found with that name. Check the spelling with your crew admin, or ask them to send the invite link again.</p>`;
      res.querySelectorAll(".jhit").forEach(b=>b.onclick=()=>{
        pickId=b.dataset.id; pickSlug=b.dataset.slug; pickName=b.dataset.name;
        res.querySelectorAll(".jhit").forEach(x=>x.classList.toggle("on",x===b));
        $("jpick").innerHTML=`Joining <b>${esc(pickName)}</b>`; $("jpass").hidden=false; famErr(""); $("jpw").value=""; $("jpw").focus();
      });
    }catch(x){
      if(my!==seq) return;
      const msg=x&&x.code==="permission-denied"?"Crew search isn't switched on yet. Something isn't set up right on our side. Please try again later.":x&&x.code==="failed-precondition"?"Crew search needs a moment to finish setting up. Try again shortly.":errText(x);
      res.innerHTML=`<p class="err">${esc(msg)}</p>`;
    }
  };
  $("jq").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(search,250)});
  $("jlinkForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inv=parseInvite($("jLink2").value);
    if(!inv) return famErr("That doesn't look like an invite link. Ask your crew admin to send it again.");
    if(JOIN){location.href=REVIEW_PATH+"?crew="+encodeURIComponent(inv.crew)+"&code="+encodeURIComponent(inv.code);return}
    $("jlinkGo").disabled=true; await joinCrew(inv); const b=$("jlinkGo"); if(b) b.disabled=false;
  });
  if($("jback")) $("jback").onclick=()=>{if(JOIN){location.href=REVIEW_PATH;return}const last=loadLS();openCrew(myCrews.some(c=>c.id===last)?last:myCrews[0].id)};
  $("jpass").addEventListener("submit",async e=>{
    e.preventDefault();
    const pw=$("jpw").value; if(!pickId) return; if(!pw) return famErr("Enter the backup password.");
    $("jgo").disabled=true;
    try{
      await setDoc(doc(db,"crews",pickId,"joins",user.uid),{pass:passHash(pickSlug,pw),name:user.displayName||"",at:Date.now()});
      try{await rememberCrew(pickId,pickName)}catch(e){}
      if(JOIN){saveLS(pickId);body.innerHTML=`<p class="muted">You're in! Opening ${esc(pickName)}…</p>`;location.href=REVIEW_PATH;return}
      openCrew(pickId);
    }catch(x){famErr(x&&x.code==="permission-denied"?"That password isn't right, or this crew has no backup password. Ask your crew admin for the invite link.":errText(x));$("jgo").disabled=false}
  });
}

/* The Join page shows straight away; joining waits here for the quiet background sign-in if it isn't done yet. */
const waitUser=(ms=20000)=>user?Promise.resolve(user):new Promise(r=>{const t0=Date.now(),t=setInterval(()=>{if(user||Date.now()-t0>ms){clearInterval(t);r(user)}},100)});
async function joinCrew(inv){
  body.innerHTML=`<p class="muted">Opening your crew…</p>`;
  if(!user){await waitUser();if(!user){viewJoin("Couldn't get ready to join. Check your connection and try again.");return}}
  const linkText=`${location.origin}${REVIEW_PATH}?crew=${inv.crew}&code=${inv.code}`;
  try{
    await setDoc(doc(db,"crews",inv.crew,"joins",user.uid),{code:inv.code,name:user.displayName||"",at:Date.now()});
  }catch(x){
    invite=null; history.replaceState(null,"",location.pathname);
    viewLobby(x&&x.code==="permission-denied"?"That invite link isn't valid any more. Ask your crew admin for a new one.":errText(x));
    const j=$("jLink"); if(j) j.value=linkText;
    return;
  }
  invite=null; history.replaceState(null,"",location.pathname);
  if(inviteFrom){setFrom(inv.crew,inviteFrom);inviteFrom=""}
  let name="Your crew";
  try{const snap=await getDoc(doc(db,"crews",inv.crew));if(snap.exists())name=snap.data().name||name}catch(e){}
  try{await rememberCrew(inv.crew,name)}catch(e){}
  openCrew(inv.crew);
}

/* ---------- inside a crew ---------- */
function clearCrewSubs(){unsubs.forEach(u=>u());unsubs=[];revUnsubs.forEach(u=>u());revUnsubs=[];revKey="";if(boardUnsub){boardUnsub();boardUnsub=null}boardSubOn=false}
/* The leaderboard is only readable by the crew when the admin switches it on (admins can always read it). */
const boardOpen=()=>!!(crew&&(isAdmin()||crew.showBoard!==false));
function syncBoardSub(){
  const want=boardOpen();
  if(want===boardSubOn) return;
  if(boardUnsub){boardUnsub();boardUnsub=null}
  boardSubOn=want; boardById={};
  if(want) boardUnsub=onSnapshot(collection(db,"crews",crewId,"board"),s=>{boardById={};s.docs.forEach(d=>boardById[d.id]=d.data());refresh()},()=>{boardById=null;refresh()});
}
function openCrew(id){
  clearCrewSubs();
  crewId=id; crew=null; claims={}; reviewsById={}; doneBy={}; me=""; target=null;
  saveLS(id);
  viewCrewShell();
  unsubs.push(onSnapshot(doc(db,"crews",id),s=>{
    if(!s.exists()){leaveLocal("That crew no longer exists.");return}
    crew=s.data(); syncReviewSubs(); syncBoardSub(); refresh();
  },x=>{leaveLocal(x&&x.code==="permission-denied"?"You're no longer in that crew.":errText(x))}));
  boardById={}; boardSubOn=false;
  let myMember="";
  const pickMe=()=>{
    me=myMember&&isMember(myMember)?myMember:"";syncReviewSubs();refresh();
    if(afterOpen&&me&&crew&&isMember(afterOpen.id)){
      const a=afterOpen; afterOpen=null;
      setTimeout(()=>{if(a.fresh){state.v={};state.dk={}}startReview(a.id,a.quiet);if(!a.fresh){savedSig=sig();revealed=true}render()},60);
    }
  };
  unsubs.push(onSnapshot(doc(db,"crews",id,"accounts",user.uid),s=>{
    myMember=s.exists()?(s.data().member||""):""; pickMe();
  },()=>{}));
  /* Reviews each person has given: every device records the names it reviewed as (accounts/{uid}.done). */
  unsubs.push(onSnapshot(collection(db,"crews",id,"accounts"),s=>{
    doneBy={}; s.docs.forEach(d=>{const dn=d.data().done||{};Object.keys(dn).forEach(rv=>{doneBy[rv]=doneBy[rv]||new Set();Object.keys(dn[rv]||{}).forEach(t=>doneBy[rv].add(t))})});
    refresh();
  },()=>{}));
  unsubs.push(onSnapshot(collection(db,"crews",id,"claims"),s=>{
    claims={}; s.docs.forEach(d=>claims[d.id]=d.data().uid);
    if(!myMember){const old=Object.keys(claims).find(k=>claims[k]===user.uid);if(old)myMember=old}
    pickMe();
  },()=>{}));
}
/* How many people someone has reviewed: from the devices' records, plus any reviews this device can read. */
function givenCount(id){const set=new Set(doneBy[id]||[]);reviews().forEach(r=>{if(r.reviewer===id)set.add(r.member)});const ids=new Set(members().map(m=>m.id));return [...set].filter(t=>ids.has(t)&&t!==id).length}
async function markDone(cid,reviewer,tid){try{await setDoc(doc(db,"crews",cid,"accounts",user.uid),{done:{[reviewer]:{[tid]:true}}},{merge:true})}catch(e){console.warn("done",e)}}
/* Reviews written by whoever is picked under "Your name" (not every name used on this device). */
const byMe=r=>me&&r.reviewer?r.reviewer===me:r.reviewerUid===user.uid;
/* Review id for the name picked under "Your name": each name on a shared device (say, helping Nana) keeps its own review.
   An older review this device wrote as the same name keeps its id. */
const myRidFor=tid=>{const legacy=`${user.uid}_${tid}`, o=reviews().find(r=>r.id===legacy);return o&&(!o.reviewer||o.reviewer===me)?legacy:`${user.uid}_${me}_${tid}`};
function syncReviewSubs(){
  if(!crew) return;
  const key=`${isAdmin()}|${me}`;
  if(key===revKey) return;
  revUnsubs.forEach(u=>u()); revUnsubs=[]; revKey=key; reviewsById={};
  const col=collection(db,"crews",crewId,"reviews");
  const merge=(tag)=>s=>{
    Object.keys(reviewsById).forEach(k=>{if(reviewsById[k]._via===tag)delete reviewsById[k]});
    s.docs.forEach(d=>reviewsById[d.id]={id:d.id,_via:tag,...d.data()});
    refresh();
  };
  if(isAdmin()) revUnsubs.push(onSnapshot(col,merge("all"),()=>{}));
  else{
    revUnsubs.push(onSnapshot(query(col,where("reviewerUid","==",user.uid)),merge("mine"),()=>{}));
    if(me) revUnsubs.push(onSnapshot(query(col,where("member","==",me)),merge("aboutMe"),()=>{}));
    if(me) revUnsubs.push(onSnapshot(query(col,where("reviewer","==",me)),merge("byMe"),()=>{}));   // written on my other devices
  }
}
function leaveLocal(msg){
  clearCrewSubs(); if($("boardSec")) $("boardSec").hidden=true; crewId=""; crew=null; claims={}; reviewsById={}; me=""; target=null; saveLS("");
  render(); if(user) viewLobby(msg||""); else viewSignedOut();
}
leaveBtn.onclick=async()=>{
  /* Ask first, with a separate Yes button. */
  if(!$("leaveAsk")){const d=document.createElement("div");d.id="leaveAsk";d.className="mrow confirm";d.setAttribute("role","alert");
    d.innerHTML=`<span class="err">Leave ${esc(crew&&crew.name||"this crew")}? ${isOwner()?"You can open it again from Your crews.":"You'll need the invite link to come back."}</span><div class="row-btns"><button type="button" class="danger sm" id="leaveYes">Yes, leave</button><button type="button" class="ghost sm" id="leaveNo">Cancel</button></div>`;
    leaveBtn.insertAdjacentElement("afterend",d);$("leaveNo").onclick=()=>d.remove();$("leaveYes").onclick=()=>{d.remove();doLeave()};return}
};
async function doLeave(){
  const id=crewId;
  try{
    if(me) await deleteDoc(doc(db,"crews",id,"claims",me));
    if(!isOwner()){
      if(isAdmin()) await updateDoc(doc(db,"crews",id),{adminUids:arrayRemove(user.uid)});
      await deleteDoc(doc(db,"crews",id,"joins",user.uid));
    }
    await forgetCrew(id);
  }catch(x){toast(errText(x),6000);return}
  leaveLocal(isOwner()?"You've left the crew view. As the owner you can open it again from Your crews.":"");
}

function viewCrewShell(){
  leaveBtn.hidden=false; {const cbox=document.querySelector("#fam .crew-box"); if(cbox) cbox.hidden=false;}
  body.innerHTML=`<div class="stack">
    ${whoRow(myCrews.length>1?`<select id="crewSwitch" aria-label="Switch crew">${myCrews.map(c=>`<option value="${esc(c.id)}"${c.id===crewId?" selected":""}>${esc(c.name)}</option>`).join("")}<option value="__lobby">Join or set up another crew…</option></select>`:`<button type="button" class="ghost sm" id="toLobby">Other crews</button>`)}
    <p class="menote" id="notAdmin" hidden>Only the crew admin can manage this crew. <a href="${REVIEW_PATH}">Go to the reviews</a> to review your crew.</p>
    <p class="adminlink" id="toMyCrew" hidden>You're the crew admin. <a href="${MYCREW_PATH}">Open My Crew</a> to add people, send the invite link and see all the reports.</p>
    <p class="menote" id="meNote" hidden></p>
    <p class="crewnote" id="crewNote" hidden></p>
    <div class="welcome" id="welcomeBox" hidden></div>
    <div class="form" id="meWrap">
      <div class="field" id="meField"><label for="meSel">Your name</label><select id="meSel"></select><p class="err" id="meErr" hidden></p><small class="muted">Picked the wrong name? Just choose the right one here.</small></div>
    </div>
    <form class="form" id="addMeForm" novalidate hidden>
      <div class="field"><label for="addMeName">Your name</label><input id="addMeName" autocomplete="off" placeholder="e.g. Dave"></div>
      <div class="field" id="addMeTypeF"><label for="addMeType">You are</label><select id="addMeType"><option value="family">Family</option><option value="mate">A mate</option><option value="partner">A partner</option></select></div>
      <button type="submit">Add me</button>
    </form>
    <div class="typebox" id="typeBox" hidden></div>
    <label class="typebox boardtoggle" id="boardToggle" hidden><span><input type="checkbox" id="boardOn"> <b>Make leaderboard visible</b></span><span class="muted">On by default: everyone in the crew sees the leaderboard. Untick it to blur the scores out for the crew. You can always see them here under All scores.</span></label>
    <h3 class="board-h" id="boardTitle" hidden>Who are you reviewing?</h3>
    <div class="crewscore" id="crewScore" hidden></div>
    <p class="muted" id="boardNote" hidden></p>
    <div class="members" id="memList"></div>
    <div class="nextbox nextadd" id="nextAdd" hidden></div>
    <div class="nextbox" id="nextBox" hidden></div>
    <form class="form" id="addForm" novalidate>
      <div class="field"><label for="newMem">Add someone to the crew</label><input id="newMem" autocomplete="off" placeholder="e.g. Nikki or Dave"></div>
      <div class="field" id="newTypeF"><label for="newType">They are</label><select id="newType"><option value="family">Family</option><option value="mate">A mate</option><option value="partner">A partner</option></select></div>
      <button type="submit" class="ghost">Add to crew</button>
    </form>
    <div class="invite" id="passBox" hidden></div>
    <div class="invite" id="inviteBox" hidden>
      <label for="inviteLink">Invite link: send this to your crew so they can join</label>
      <div class="invite-row"><input id="inviteLink" readonly><button type="button" id="shareInvite" hidden>Share</button><button type="button" id="copyInvite">Copy</button><button type="button" class="ghost" id="newInvite">New link</button></div>
      <p class="muted">Tap <b>Share</b> to send it by text, WhatsApp or email, or <b>Copy</b> to paste it yourself. Your crew open the invite link and pick their name. No sign-in needed. "New link" stops the old one working.</p>
    </div>
    <p class="err" id="famErr" hidden></p>
    <div id="famResults"></div>
    <div class="danger" id="resetAllBox" hidden></div>
    <div id="adminArea" hidden>
      <div class="admin-head"><h3>Crew admin</h3>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" data-tab="scores">All scores</button>
          <button type="button" role="tab" data-tab="member">Member reports</button>
          <button type="button" role="tab" data-tab="crew">Crew report</button>
        </div></div>
      <div id="adminBody"></div>
    </div>
  </div>`;
  if($("signOut")) $("signOut").onclick=()=>signOut(auth);
  $("addMeForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const n=$("addMeName").value.trim().slice(0,40); if(!n) return famErr("Type your name first.");
    if(members().some(m=>m.name.toLowerCase()===n.toLowerCase())) return famErr(`${n} is already on the list. Pick it under "Your name".`);
    try{const id=rid(10);await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id,name:n,type:crew.type?crewMemberType():$("addMeType").value}]});await claimMember(crewId,id,me);$("addMeForm").hidden=true;$("addMeName").value="";famErr("");$("meNote").hidden=true;$("meField").classList.remove("attention");if(pending){const pid=pending;pending="";setTimeout(()=>startReview(pid),300)}}
    catch(x){famErr(errText(x))}
  });
  if($("toLobby")) $("toLobby").onclick=()=>{if($("rateCrew"))$("rateCrew").hidden=true;clearCrewSubs();crewId="";crew=null;saveLS("");target=null;render();viewLobby()};
  if($("crewSwitch")) $("crewSwitch").onchange=e=>{const v=e.target.value;if(v==="__lobby"){clearCrewSubs();crewId="";crew=null;saveLS("");target=null;render();viewLobby()}else openCrew(v)};
  $("meSel").addEventListener("change",async e=>{
    const v=e.target.value;
    try{
      if(v==="__new"){
        $("addMeForm").hidden=false; $("addMeName").value=isGuest()?"":(user.displayName||"").split(" ")[0]; $("addMeName").focus();
        return;
      }else if(v){
        if(v!==me) await claimMember(crewId,v,me);
      }else if(me){
        await deleteDoc(doc(db,"crews",crewId,"accounts",user.uid));
      }
      $("meNote").hidden=true;$("meField").classList.remove("attention");meErr("");
      if(target&&v!==me){target=null;delete state.qset;setSliders({});render()}
      if(pending){const id=pending;pending="";setTimeout(()=>startReview(id),300)}
    }catch(x){meErr(x&&x.code==="permission-denied"?"Couldn't switch to that name. Try again in a moment, or ask your crew admin for a fresh invite link.":errText(x));refresh()}
  });
  $("addForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inp=$("newMem"), n=inp.value.trim(); if(!n||!crew) return;
    if(members().some(m=>m.name.toLowerCase()===n.toLowerCase())) return famErr(`${n} is already in the crew.`);
    try{await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id:rid(10),name:n.slice(0,40),type:crew.type?crewMemberType():$("newType").value}]});inp.value="";famErr("")}
    catch(x){famErr(errText(x))}
  });
  const inp=$("inviteLink");
  const selectLink=()=>{inp.focus();inp.setSelectionRange(0,inp.value.length)};
  inp.addEventListener("focus",()=>setTimeout(()=>inp.setSelectionRange(0,inp.value.length),0));
  $("copyInvite").onclick=async()=>{
    const v=inviteLink(); let ok=false;
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(v);ok=true}}catch(e){}
    if(!ok){
      inp.removeAttribute("readonly"); selectLink();
      try{ok=document.execCommand("copy")}catch(e){}
      inp.setAttribute("readonly","");
    }
    if(ok){inp.blur();toast("Invite link copied. Paste it into a text or email.")}
    else{selectLink();toast("The link is selected. Tap it and choose Copy.",5000)}
  };
  if(navigator.share){
    $("shareInvite").hidden=false;
    $("shareInvite").onclick=async()=>{
      try{await navigator.share({title:"Rate My Year",text:`Join ${crew?crew.name:"our crew"} on Rate My Year and rate each other's year:`,url:inviteLink()})}
      catch(x){if(!x||x.name!=="AbortError")toast("Couldn't open sharing. Use Copy instead.")}
    };
  }
  /* New link breaks the old one, so ask first. */
  $("newInvite").onclick=()=>{if($("newAsk"))return;const d=document.createElement("div");d.id="newAsk";d.className="mrow confirm";d.setAttribute("role","alert");
    d.innerHTML=`<span class="err">Make a new invite link? The old link stops working, so anyone who hasn't joined yet will need the new one.</span><div class="row-btns"><button type="button" class="danger sm" id="newYes">Yes, make a new link</button><button type="button" class="ghost sm" id="newNo">Cancel</button></div>`;
    $("inviteBox").appendChild(d);$("newNo").onclick=()=>d.remove();
    $("newYes").onclick=async()=>{d.remove();try{await updateDoc(doc(db,"crews",crewId),{joinCode:rid(8)});toast("New invite link made. The old one no longer works.")}catch(x){famErr(errText(x))}}};
  document.querySelectorAll("#adminArea [data-tab]").forEach(b=>b.onclick=()=>{adminTab=b.dataset.tab;renderAdmin()});
}

/* ---------- admin: crew name + password ---------- */
let passBoxKey="";
function renderPassBox(){
  const box=$("passBox"), key=`${crew.slug||""}|${!!crew.passHash}|${crew.name}`;
  if(key===passBoxKey&&box.innerHTML) return; passBoxKey=key;
  const has=!!(crew.slug&&crew.passHash), named=!!crew.slug;
  box.innerHTML=named?`<label>Backup: crew name and password</label>
      <p class="muted">For anyone who loses the invite link: they tap <b>Lost your invite link?</b> at the bottom of any page, search for <b>${esc(crew.name)}</b> and enter this password.${has?"":" No backup password is set yet."}</p>
      <form class="invite-row" id="pwForm" novalidate><input id="pwNew" type="password" autocomplete="new-password" placeholder="${has?"New backup password":"Backup password"} (at least 6 characters)"><button type="button" class="ghost sm pwshow" data-for="pwNew" aria-pressed="false">Show</button><button type="submit">${has?"Change password":"Set password"}</button></form>`
    :`<label>Backup: crew name and password</label>
      <p class="muted">For anyone who loses the invite link. Choose a unique crew name and a password. They tap <b>Lost your invite link?</b> at the bottom of any page, search for the name and enter the password.</p>
      <form class="form" id="pwForm" novalidate>
        <div class="field"><label for="pwName">Crew name</label><input id="pwName" autocomplete="off" value="${esc(crew.name)}"></div>
        <div class="field"><label for="pwNew">Backup password</label><input id="pwNew" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div>
        <button type="submit">Save</button>
      </form>`;
  $("pwForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const pw=$("pwNew").value; if(pw.length<6) return famErr("Use a backup password of at least 6 characters.");
    try{
      if(named){await updateDoc(doc(db,"crews",crewId),{passHash:passHash(crew.slug,pw)});$("pwNew").value="";passBoxKey="";toast(has?"Backup password changed.":"Backup password set.")}
      else{
        const name=$("pwName").value.trim().slice(0,60), slug=slugify(name);
        if(!slug) return famErr("Give your crew a name using letters or numbers.");
        if((await getDoc(doc(db,"crewNames",slug))).exists()) return famErr(`"${name}" is already taken. Try adding your suburb or surname.`);
        const b=writeBatch(db);
        b.update(doc(db,"crews",crewId),{name,slug,passHash:passHash(slug,pw)});
        b.set(doc(db,"crewNames",slug),{crewId,name,slug});
        await b.commit(); passBoxKey=""; toast("Saved. Anyone who loses the invite link can now find the crew with Join.");
      }
      famErr("");
    }catch(x){famErr(x&&x.code==="permission-denied"?"That name is already taken. Try another.":errText(x))}
  });
}

/* ---------- admin: manage one crew member ---------- */
function managePanel(m,joined,isAdm,a){
  const uid=claims[m.id], isMe=m.id===me, isOwnerSeat=uid&&uid===crew.ownerUid;
  const byThem=reviews().filter(r=>r.reviewer===m.id).length, aboutThem=a.rs.length;
  const arm=k=>removeArmed===k;
  const nm=esc(m.name);
  /* Destructive actions ask with a separate "Yes" button and Cancel, so a double-tap can't delete anything. */
  const row=(act,label,desc,danger)=>arm(act+":"+m.id)
    ?`<div class="mrow confirm" role="alert"><span class="err">${act==="delete"?`Delete ${nm} and every review by and about them? This can't be undone.`:`Reset ${nm}? This deletes the reviews by and about them.`}</span><div class="row-btns"><button type="button" class="danger sm" data-act="${act}" data-id="${m.id}" data-yes="1">Yes, ${act==="delete"?"delete":"reset"} ${nm}</button><button type="button" class="ghost sm" data-cancel="1">Cancel</button></div></div>`
    :`<div class="mrow"><button type="button" class="${danger?"danger":"ghost"} sm" data-act="${act}" data-id="${m.id}">${label}</button><span>${desc}</span></div>`;
  return `<div class="manage" role="group" aria-label="Manage ${nm}">
    ${false?row("free","Free up name",`For when ${nm} changes phone or clears their browser. They pick their name again from the invite link. Their reviews are kept.`):""}
    ${joined&&!isMe&&!isOwnerSeat?row("admin",isAdm?"Remove admin":"Make admin",isAdm?`${nm} goes back to seeing only their own results.`:`${nm} will see everyone's reports and can manage the crew.`):""}
    ${row("reset","Reset",`Deletes the ${aboutThem} review${aboutThem===1?"":"s"} about ${nm} and the ${byThem} they wrote${joined&&!isMe?", and frees up their name":""}. ${isMe?"You stay":"They stay"} in the crew to start again.`,true)}
    ${!isMe&&!isOwnerSeat?row("delete","Delete",`Removes ${nm} from the crew, along with every review by and about them. This can't be undone.`,true):""}
  </div>`;
}
async function deleteReviewsFor(id){
  const docs=reviews().filter(r=>r.member===id||r.reviewer===id);
  for(let i=0;i<docs.length;i+=400){
    const b=writeBatch(db);
    docs.slice(i,i+400).forEach(r=>b.delete(doc(db,"crews",crewId,"reviews",r.id)));
    await b.commit();
  }
  return docs.length;
}
async function manageAction(act,id){
  const m=members().find(x=>x.id===id); if(!m) return;
  const uid=claims[id];
  if((act==="reset"||act==="delete")&&removeArmed!==act+":"+id){removeArmed=act+":"+id;refresh();return}
  removeArmed="";
  try{
    if(act==="free"){await deleteDoc(doc(db,"crews",crewId,"claims",id));toast(`${m.name}'s name is free. They can pick it again from the invite link.`)}
    else if(act==="admin"){if(!uid)return;await updateDoc(doc(db,"crews",crewId),{adminUids:crew.adminUids.includes(uid)?arrayRemove(uid):arrayUnion(uid)})}
    else if(act==="reset"){
      const n=await deleteReviewsFor(id);
      if(uid&&id!==me) await deleteDoc(doc(db,"crews",crewId,"claims",id));
      managing=""; toast(`${m.name} has been reset. ${n} review${n===1?"":"s"} deleted.`);
    }else if(act==="delete"){
      const n=await deleteReviewsFor(id);
      const upd={members:members().filter(x=>x.id!==id)};
      if(uid&&uid!==crew.ownerUid&&crew.adminUids.includes(uid)) upd.adminUids=arrayRemove(uid);
      await updateDoc(doc(db,"crews",crewId),upd);
      if(uid){
        await deleteDoc(doc(db,"crews",crewId,"claims",id));
        if(uid!==crew.ownerUid) await deleteDoc(doc(db,"crews",crewId,"joins",uid));
      }
      managing=""; if(target&&target.id===id) target=null;
      toast(`${m.name} has been deleted from the crew, with ${n} review${n===1?"":"s"}.`);
    }
  }catch(x){famErr(errText(x))}
  refresh();
}

/* ---------- crew leaderboard ----------
   board/{memberId} = {by:{<key>:{o:overall,self:bool}}}. Each reviewer writes one entry per person under a random key
   kept in their (private) review, so everyone in the crew sees the scores but not who gave which. */
const legacyKey=reviewId=>"L"+sha256hex("rmy-board:"+reviewId).slice(0,19);
function boardScore(id){
  const by=(boardById&&boardById[id]&&boardById[id].by)||{}, es=Object.values(by).filter(e=>e&&typeof e.o==="number");
  const others=es.filter(e=>!e.self), use=others.length>=2?others:es;
  return {v:use.length?mean(use.map(e=>e.o)):null,n:use.length,o:others.length,t:es.length,s:es.length>others.length};
}
/* Crew admins can read every review, so their device keeps the leaderboard in step: it adds older reviews
   that were saved before the leaderboard existed and removes entries for deleted reviews or people. */
function syncBoardSoon(){clearTimeout(boardSyncT);boardSyncT=setTimeout(syncBoard,1200)}
async function syncBoard(){
  if(!crew||!isAdmin()||boardById===null) return;
  const want={};
  liveReviews().forEach(r=>{if(typeof r.overall!=="number"||(r.set||"life")!==setOf(r.member).key)return;(want[r.member]=want[r.member]||{})[r.boardKey||legacyKey(r.id)]={o:r.overall,self:r.reviewer===r.member}});
  const ids=new Set([...Object.keys(want),...Object.keys(boardById||{})]);
  const b=writeBatch(db); let n=0;
  ids.forEach(mid=>{
    const have=JSON.stringify(Object.entries((boardById[mid]||{}).by||{}).sort()), next=JSON.stringify(Object.entries(want[mid]||{}).sort());
    if(have===next) return;
    if(want[mid]) b.set(doc(db,"crews",crewId,"board",mid),{by:want[mid]}); else b.delete(doc(db,"crews",crewId,"board",mid));
    n++;
  });
  if(n) try{await b.commit()}catch(x){console.warn("leaderboard sync",x)}
}

/* Crew admin: reset all reviews. Keeps the crew, its people and everyone's names; deletes every review
   and clears the leaderboard so the crew can start fresh. */
function renderResetAll(show){
  const box=$("resetAllBox"); if(!box) return;
  box.hidden=!show; if(!show){box.innerHTML="";return}
  const n=reviews().length;
  const key=`${n}|${resetArmed}|${resetting}`; if(box.dataset.k===key) return; box.dataset.k=key;
  box.innerHTML=`<p><b>Reset all</b>: delete all ${n} review${n===1?"":"s"} in this crew and clear the leaderboard. Everyone stays in the crew with their name, ready to start again.</p>`+
    (resetting?`<p class="muted">Resetting…</p>`
    :resetArmed?`<p class="err">This deletes every review in ${esc(crew.name)} for good. It can't be undone.</p><div class="row-btns"><button type="button" class="dangerbtn" id="resetAllYes">Yes, delete all ${n} review${n===1?"":"s"}</button><button type="button" class="ghost" id="resetAllNo">Cancel</button></div>`
    :`<div class="row-btns"><button type="button" class="ghost dangerline" id="resetAllGo"${n?"":" disabled"}>Reset all</button></div>`);
  if($("resetAllGo")) $("resetAllGo").onclick=()=>{resetArmed=true;renderResetAll(true)};
  if($("resetAllNo")) $("resetAllNo").onclick=()=>{resetArmed=false;renderResetAll(true)};
  if($("resetAllYes")) $("resetAllYes").onclick=resetAll;
}
async function resetAll(){
  if(!crew||!isAdmin()) return;
  resetting=true; renderResetAll(true);
  try{
    const refs=[...reviews().map(r=>doc(db,"crews",crewId,"reviews",r.id)),...Object.keys(boardById||{}).map(id=>doc(db,"crews",crewId,"board",id))];
    for(let i=0;i<refs.length;i+=400){const b=writeBatch(db);refs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit()}
    toast(`All reviews in ${crew.name} have been deleted. The crew can start fresh.`);
  }catch(x){famErr(errText(x))}
  resetting=false; resetArmed=false; renderResetAll(true);
}
/* Signed in with Google (or running a crew) → "My Crew"; otherwise "Create A Crew". */
function paintCreate(){
  const mine=!!(user&&!user.isAnonymous)||(crew&&isAdmin());
  try{localStorage.setItem("rmy-signedin",mine?"1":"0")}catch(e){}
  const tb=$("choiceCreate"); if(tb) tb.textContent="My Crews";
  paintEndInvite();
}
/* My results open right under your own row in the leaderboard. */
let resultsOpen=false;
function placeResults(){
  const list=$("nextBox"); if(!list) return;
  const old=list.querySelector(".myresults"); if(old) old.remove();
  const b=list.querySelector(`[data-results="${me}"]`); if(b) b.textContent=(crew&&crew.type==="partner"?(resultsOpen?"Hide Results":"Show Results"):(resultsOpen?"Hide My Results":"Show My Results"));
  if(!resultsOpen||!me||ADMIN) return;
  const row=b&&b.closest(".myres-wrap"); if(!row) return;
  const d=document.createElement("div"); d.className="myresults"; d.innerHTML=memberReportHTML(me,false); row.after(d);
}
/* In a crew, Rate My Family / Rate My Mates / Couple Check-in switch to your crew of that type
   (or, with none, a fresh review of that type). The open crew's button stays highlighted. */
function paintRatebar(){
  window.__crewSet=REVIEW_PAGE&&crew?{family:"life",mates:"mates",partner:"partner"}[crewTypeOf(crew.type)]:null;
  if(window.__crewSet){try{localStorage.setItem("rmy-last-type",{family:"family",mates:"mate",partner:"partner"}[crewTypeOf(crew.type)])}catch(e){}}
  if(!window.__crewSet) return;
  [["who-family","life"],["who-mate","mates"],["who-partner","partner"]].forEach(([id,set])=>{const r=$(id);if(r&&r.parentElement)r.parentElement.classList.toggle("on",set===window.__crewSet)});
}
document.querySelectorAll(".ratebar label").forEach(l=>l.addEventListener("click",e=>{
  /* Not in a crew and you have none: the buttons just change the questions. */
  if(!REVIEW_PAGE||(!crew&&!myCrews.length)) return;
  const who=l.querySelector("input").value, want={family:"family",mate:"mates",partner:"partner"}[who];
  if(!crew&&state.who===who) return;
  e.preventDefault(); e.stopPropagation();
  if(crew&&crewTypeOf(crew.type)===want) return;
  location.href=`${REVIEW_PATH}?who=${who}`;
},true));
function renderBoard(){
  const sec=$("boardSec"); if(sec) sec.hidden=true; return;
  if(ADMIN||!crew){sec.hidden=true;return}
  sec.hidden=false;
  const ms=members(), open=boardOpen(), mates=crew.type==="mates";
  $("boardSub").textContent=mates?"Who's the MVP of your crew? Ranked by what the rest of the crew thinks.":crew.type==="partner"?"Each of you rates the relationship. Your relationship score is the average.":"Ranked by what the rest of the crew thinks.";
  const wrap=$("boardWrap"), lock=$("boardLock"), list=$("boardList");
  if(!open){
    const fake=["A","B+","B","C+","C","D"];
    list.innerHTML=(ms.length?ms:[{name:"Crew member"},{name:"Crew member"},{name:"Crew member"}]).map((m,i)=>`<div class="member board-row" style="--g:${gcol(fake[i%fake.length])}"><span class="rank">${i+1}</span><span class="chip">${fake[i%fake.length]}</span><span class="nm">${"●".repeat(4+(i*3)%5)}<small>${(9.1-i*0.7).toFixed(1)} / 10</small></span><span class="btns"></span></div>`).join("");
    wrap.classList.add("locked"); lock.hidden=false;
    lock.innerHTML=`<b>Leaderboard locked</b><span>${isAdmin()?`You're the crew admin. Switch it on in <a href="${MYCREW_PATH}">My Crew</a> to show everyone the rankings.`:"The crew admin hasn't switched on the leaderboard yet."}</span>`;
    return;
  }
  wrap.classList.remove("locked"); lock.hidden=true;
  if(boardById===null){list.innerHTML=`<p class="muted">The leaderboard can't load yet. Please try again later.</p>`;return}
  const rows=ms.map(m=>({m,b:boardScore(m.id)})).sort((x,y)=>(y.b.v??-1)-(x.b.v??-1)||x.m.name.localeCompare(y.m.name));
  list.innerHTML=rows.map(({m,b},i)=>{const g=b.v==null?null:grade(b.v);
    return `<div class="member board-row"${g?` style="--g:${gcol(g)}"`:""}><span class="rank">${b.v==null?"–":i+1}</span><span class="chip${g?"":" none"}">${g||"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?' <span class="youbadge">You</span>':""}<small>${b.v==null?"Not reviewed yet":`${b.v.toFixed(1)} / 10 · ${b.n} review${b.n===1?"":"s"}`}</small></span>
      <span class="btns"><button type="button" class="ghost" data-review2="${m.id}">${m.id===me?"Review myself":"Review"}</button></span></div>`}).join("");
  list.querySelectorAll("[data-review2]").forEach(b=>b.onclick=()=>startReview(b.dataset.review2));
}

function refresh(){
  paintRatebar();
  if(!crew||!$("memList")) return;
  title.textContent=`Your crew: ${crew.name}`;
  const ms=members(), admin=isAdmin();
  const taken=id=>false;   // several devices can be the same person
  $("meWrap").hidden=ADMIN; $("addMeForm").hidden=ADMIN||$("addMeForm").hidden;
  $("notAdmin").hidden=!(ADMIN&&!admin); $("toMyCrew").hidden=ADMIN||!admin;
  $("addForm").hidden=!(ADMIN&&admin); $("memList").hidden=ADMIN&&!admin;
  $("newTypeF").hidden=!!crew.type; $("addMeTypeF").hidden=!!crew.type;
  /* Crew type (admins, on My Crew). Switching keeps every saved review; only reviews on the crew's
     current questions count, so switching back brings the earlier ones back. */
  if($("rateCrew")) $("rateCrew").hidden=!crew;
  const tbx=$("typeBox"); tbx.hidden=!(ADMIN&&admin);
  const tkey=`${crew.type||""}|${typeArmed}`;
  if(!tbx.hidden&&tbx.dataset.k!==tkey){
    tbx.dataset.k=tkey;
    const setType=async t=>{try{
      const upd={type:t,members:members().map(m=>({...m,type:CREW_TYPES[t].member}))}, m=AUTO_NAME.exec(crew.name||""), b=writeBatch(db);
      /* Auto-named crews (e.g. 482-love) keep their number and take the new type: 482-family. */
      if(m&&crew.slug===crew.name){const nn=`${m[1]}-${CREW_SUFFIX[t]}`;if(nn!==crew.name&&!(await getDoc(doc(db,"crewNames",nn))).exists()){upd.name=nn;upd.slug=nn;b.set(doc(db,"crewNames",nn),{crewId,name:nn,slug:nn});b.delete(doc(db,"crewNames",crew.slug))}}
      b.update(doc(db,"crews",crewId),upd);await b.commit();
      if(upd.name){try{await rememberCrew(crewId,upd.name)}catch(e){}}
      typeArmed="";toast(`Switched to ${CREW_TYPES[t].review}${upd.name?`. Your crew is now ${upd.name}`:""}.`)}catch(x){famErr(errText(x))}};
    if(!crew.type){
      tbx.innerHTML=`<p><b>What kind of crew is this?</b> Family crews answer the family questions, Mates crews the mates questions and Couple crews the partner questions. If you change review type later, everyone is asked a different set of questions and existing reviews won't carry across.</p><div class="row-btns">${Object.keys(CREW_TYPES).map(t=>`<button type="button" data-ctype="${t}">${CREW_TYPES[t].crew}</button>`).join("")}</div>`;
      tbx.querySelectorAll("[data-ctype]").forEach(b=>b.onclick=()=>setType(b.dataset.ctype));
    }else{
      /* Changing type is rare and resets everyone's scores, so it lives in a closed "Advanced" section.
         Couple Check-in is only offered to crews of two or fewer. */
      const cur=crewTypeOf(crew.type), T=CREW_TYPES[cur], others=Object.keys(CREW_TYPES).filter(t=>t!==cur&&!(t==="partner"&&members().length>2));
      const nRev=liveReviews().length;
      tbx.innerHTML=`<details class="adv"${typeArmed?" open":""}><summary>Advanced: change crew type (now ${T.review})</summary><p class="muted">If you change type, your crew is asked a different set of questions and the ${nRev} existing review${nRev===1?"":"s"} stop counting. They're kept, and count again if you switch back.</p>`+
        (typeArmed?`<p class="err">Switch to ${CREW_TYPES[typeArmed].review}? ${nRev} review${nRev===1?"":"s"} will stop counting and everyone needs to review again.</p><div class="row-btns"><button type="button" id="typeYes">Yes, switch to ${CREW_TYPES[typeArmed].review}</button><button type="button" class="ghost" id="typeNo">Cancel</button></div>`
          :`<div class="row-btns">${others.map(t=>`<button type="button" class="ghost sm" data-switch="${t}">Switch to ${CREW_TYPES[t].review}</button>`).join("")}</div>`)+`</details>`;
      tbx.querySelectorAll("[data-switch]").forEach(b=>b.onclick=()=>{typeArmed=b.dataset.switch;refresh()});
      if($("typeNo")) $("typeNo").onclick=()=>{typeArmed="";refresh()};
      if($("typeYes")) $("typeYes").onclick=()=>setType(typeArmed);
    }
  }
  if(tbx.hidden){tbx.innerHTML="";tbx.dataset.k=""}
  $("boardTitle").hidden=ADMIN;
  const bt=$("boardToggle"); bt.hidden=!(ADMIN&&admin);
  if(!bt.hidden){$("boardOn").checked=crew.showBoard!==false;$("boardOn").onchange=async e=>{try{await updateDoc(doc(db,"crews",crewId),{showBoard:e.target.checked});toast(e.target.checked?"Leaderboard switched on for the crew.":"Leaderboard hidden from the crew.")}catch(x){e.target.checked=!e.target.checked;famErr(errText(x))}}}
  renderBoard();
  renderResetAll(ADMIN&&admin);
  paintCreate();
  $("meSel").innerHTML=`<option value="">Choose your name…</option>`+ms.map(m=>`<option value="${m.id}"${m.id===me?" selected":""}${taken(m.id)?" disabled":""}>${esc(m.name)}${taken(m.id)?" (taken)":""}</option>`).join("")+`<option value="__new">I'm not on the list. Add me</option>`;
  if(me||ADMIN){$("meNote").hidden=true;$("meField").classList.remove("attention")}
  else if(ms.length&&$("meNote").hidden){$("meNote").textContent="Welcome! Pick your name under \"Your name\" to get started.";$("meNote").hidden=false;$("meField").classList.add("attention")}
  const doneIds=new Set(reviews().filter(byMe).map(r=>r.member));
  const todo=ms.filter(m=>!doneIds.has(m.id)), done=ms.filter(m=>doneIds.has(m.id));
  const open=boardOpen();
  $("boardTitle").textContent=ADMIN?"":crew.type==="partner"?"Our check-in":"Crew leaderboard";
  $("boardNote").hidden=ADMIN||!ms.length||crew.type==="partner";
  if(!$("boardNote").hidden) $("boardNote").innerHTML=(me?(todo.length?`You've reviewed ${done.length} of ${ms.length}. Still to review: <b>${todo.map(m=>esc(m.id===me?"yourself":m.name)).join(", ")}</b>`:"✓ You've reviewed everyone in the crew. Nice work."):($("welcomeBox")&&!$("welcomeBox").hidden?"Type your first name above to get started.":"Pick your name under <b>I am</b>, then tap <b>Review</b> next to someone."))+(open?"":` <span class="lockline">Scores are hidden: the crew admin has turned the leaderboard off.</span>`);
  const fake=["A","B+","B","C+","C","D"];
  const lockOne=b=>crew.type!=="partner"&&(b.t||0)<2&&b.o===1?{v:null,n:b.n,o:1,t:b.t,s:b.s,locked:true}:b;
  const ranked=ms.map(m=>({m,b:open&&boardById?lockOne(boardScore(m.id)):{v:null,n:0,...(boardById?(({o,t,s})=>({o,t,s}))(boardScore(m.id)):{o:0,t:0,s:false})}})).sort((x,y)=>(y.b.v??-1)-(x.b.v??-1)||x.m.name.localeCompare(y.m.name));
  /* Crew score: the average of everyone's leaderboard score (people with at least one review). */
  const scored=ranked.filter(x=>x.b.v!=null), cs=$("crewScore");
  cs.hidden=ADMIN||!ms.length;
  if(!cs.hidden){
    const v=scored.length?mean(scored.map(x=>x.b.v)):null, g=v==null?null:grade(v);
    cs.style.setProperty("--g",open&&g?gcol(g):open?"var(--track)":gcol("B"));
    cs.innerHTML=`<span class="cs-chip${open?"":" blurred"}">${open?(g||"–"):"B"}</span><span class="cs-txt"><b>${esc(crew.type==="partner"?`${crew.name} Love Score`:/crew$/i.test(crew.name.trim())?`${crew.name} Score`:`${crew.name} Crew Score`)}</b><span class="cs-num${open?"":" blurred"}">${open?(v==null?"–":v.toFixed(1)+" / 10"):"7.4 / 10"}</span><small>${open?(v==null?"Shows once people have been reviewed":`Average of ${scored.length} of ${ms.length} people`):"Hidden: the crew admin has turned the leaderboard off"}</small></span>`;
  }
  $("memList").innerHTML=!ADMIN&&ms.length&&crew.type==="partner"?ms.map(m=>{
    /* Couple Check-in: each person rates the relationship, not each other, so just show who has had their say. */
    const did=boardScore(m.id).s||reviews().some(r=>r.member===m.id&&r.reviewer===m.id);
    return `<div class="member board-row couple-row">
      <span class="rank"></span><span class="chip${did?"":" none"}" style="--g:var(--gA)">${did?"✓":"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?' <span class="youbadge">You</span>':""}</span><small class="meta">${did?"✓ Reviewed":"Not reviewed yet"}</small>
      <span class="btns">${m.id===me?`<button type="button" data-review="${m.id}"${did?' class="ghost reviewed"':""}>${did?"✓ Reviewed":"Rate our relationship"}</button>`:""}</span></div>`}).join("")
    :!ADMIN&&ms.length?ranked.map(({m,b},i)=>{
    const mine=doneIds.has(m.id), g=b.v==null?null:grade(b.v), fg=fake[i%fake.length];
    const rank=open?(b.v==null?"–":i+1):"#", chip=open?`<span class="chip${g?"":" none"}">${g||"–"}</span>`:`<span class="chip blurred">${fg}</span>`;
    /* Count reviews from other people (what unlocks the score); a self-rating is shown separately. */
    const o=b.o||0, cnt=`<span class="revcount">${o?`${o} review${o===1?"":"s"}${b.s?" + self":""}`:b.s?"Self-rated only":"No reviews yet"}</span>`;
    /* The letter grade carries the score, so the line just counts reviews received and given. */
    const gv=givenCount(m.id), rc=b.t||0;
    const score=`${open&&b.locked?`<span class="lockline2">🔒</span> `:""}<span class="revcount">Received: ${rc}</span> · <span class="givecount">Given: ${gv}</span>`;
    const nScored=ranked.filter(x=>x.b.v!=null).length, mates=crew.type==="mates";
    /* Badges by grade: A gets the award (everyone sees it); D "keep an eye on them" and E "support required"
       are private: only that person and the crew admin see them, so nobody is singled out in front of the crew. */
    const CT=CREW_TYPES[crewTypeOf(crew.type)], scored=open&&b.v!=null&&g, priv=true;
    const award=scored&&/^A/.test(g);
    const lowName=scored&&priv?(/^E/.test(g)?CT.low:/^D/.test(g)?CT.eye:""):"";
    const bottom=!!lowName;
    return `<div class="member board-row${mine?" done":""}${award?" best":""}"${open&&g?` style="--g:${gcol(g)}"`:!open?` style="--g:${gcol(fg)}"`:""}>
      <span class="rank">${rank}</span>${chip}
      <span class="nm">${esc(m.name)}${m.id===me?' <span class="youbadge">You</span>':""}${award&&CREW_TYPES[crewTypeOf(crew.type)].top?` <span class="award">${CREW_TYPES[crewTypeOf(crew.type)].top}</span>`:""}${bottom?` <span class="award low${/^D/.test(g)?" eye":""}">${lowName}</span>`:""}</span><small class="meta">${score}</small>
      <span class="btns">
        <button type="button" data-review="${m.id}"${mine?' class="ghost reviewed" title="Reviewed. Tap to change your review"':""}>${mine?"✓ Reviewed":m.id===me?"Review myself":"Review"}</button>
      </span></div>`}).join("")+(open&&ranked.some(x=>x.b.locked)?`<p class="muted locknote">🔒 Scores show once someone has 2 reviews, so nobody's rating stands out on its own.</p>`:"")
    :ms.length?ms.map(m=>{
    const a=aggFor(m.id), g=a.overall!=null?grade(a.overall):null;
    const mine=reviews().some(r=>r.member===m.id&&byMe(r));
    const canSee=ADMIN?admin:m.id===me;
    const joined=!!claims[m.id], isAdm=joined&&crew.adminUids.includes(claims[m.id]);
    return `<div class="member"${g&&canSee?` style="--g:${gcol(g)}"`:""}>
      <span class="chip${g&&canSee?"":" none"}">${g&&canSee?g:"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?' <span class="youbadge">You</span>':""}<small>${MEMBER_WORD[memberType(m.id)]||"Family"}${joined?" · joined":""}${isAdm?" · admin":""}${canSee?` · ${a.rs.length} review${a.rs.length===1?"":"s"}`:""}${mine?" · you've reviewed":""}</small></span>
      <span class="btns">
        ${ADMIN?"":`<button type="button" data-review="${m.id}">${m.id===me?"Review myself":"Review"}</button>`}
        ${!ADMIN&&m.id===me?`<button type="button" class="ghost" data-results="${m.id}"${a.rs.length?"":" disabled"}>My results</button>`:""}
        ${ADMIN&&admin?`<button type="button" class="ghost" data-manage="${m.id}" aria-expanded="${managing===m.id}">${managing===m.id?"Close":"Manage"}</button>`:""}
      </span></div>${ADMIN&&admin&&managing===m.id?managePanel(m,joined,isAdm,a):""}`}).join("")
    :`<p class="muted">No one in the crew yet. Add everyone below.</p>`;
  $("memList").querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>startReview(b.dataset.review));

  $("memList").querySelectorAll("[data-manage]").forEach(b=>b.onclick=()=>{managing=managing===b.dataset.manage?"":b.dataset.manage;removeArmed="";refresh()});
  $("memList").querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>manageAction(b.dataset.act,b.dataset.id));
  $("memList").querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{removeArmed="";refresh()});
  const showAdmin=ADMIN&&admin;
  $("inviteBox").hidden=!showAdmin;
  if(showAdmin) $("inviteLink").value=inviteLink();
  $("passBox").hidden=!showAdmin; if(showAdmin) renderPassBox();
  $("famResults").innerHTML=""; placeResults();
  $("adminArea").hidden=!showAdmin;
  if(showAdmin) renderAdmin();
  if(admin) syncBoardSoon();
  if(target&&!isMember(target.id)) target=null;
  paintWelcome(); paintNext();
  render();
}

function renderAdmin(){
  const box=$("adminBody"); if(!box) return;
  document.querySelectorAll("#adminArea [data-tab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===adminTab));
  if(adminTab==="scores") box.innerHTML=scoreboardHTML();
  else if(adminTab==="crew") box.innerHTML=crewReportHTML();
  else{
    const ms=members();
    if(!isMember(reportMember)) reportMember=ms[0]?ms[0].id:"";
    box.innerHTML=`<div class="form" style="margin-bottom:12px"><div class="field"><label for="repSel">Crew member</label><select id="repSel">${ms.map(m=>`<option value="${m.id}"${m.id===reportMember?" selected":""}>${esc(m.name)}</option>`).join("")}</select></div></div>`+(reportMember?memberReportHTML(reportMember,true):`<p class="muted">Add people to the crew first.</p>`);
    const s=$("repSel"); if(s) s.onchange=()=>{reportMember=s.value;renderAdmin()};
  }
}

/* ---------- reviewing a member ---------- */
function setSliders(rv){
  rv=rv||{};
  state.v=Object.assign({},rv.values||{});
  state.dk=Object.assign({},rv.dk||{});
  useSet(activeSet());
  /* Only answered questions count; area scores are worked out again from them. */
  Object.keys(state.v).forEach(k=>{if(/t$/.test(k))delete state.v[k]});
  CATS.forEach(c=>{if(state.v[c.id+"t"]==null&&!state.dk[c.id+"t"])syncTop(c)});
  applyMode();
}
function needMe(id){
  pending=id;
  const wb=$("welcomeBox");
  if(wb&&!wb.hidden){wb.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});const w=$("wName");if(w)w.focus({preventScroll:true});return}
  const n=$("meNote"), f=$("meField"), s=$("meSel");
  if(!n) return;
  n.textContent=id?`First, pick your own name under "Your name". Then ${memberName(id)}'s review opens.`:`First, pick your own name under "Your name", then tap Review next to who you're reviewing.`;
  n.hidden=false; f.classList.add("attention");
  $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  s.focus();
}
/* Warn before leaving with an unsaved crew review. */
window.addEventListener("beforeunload",e=>{try{if(crew&&target&&me&&savedSig!==undefined&&sig()!==savedSig&&progress().n){e.preventDefault();e.returnValue=""}}catch(x){}});
function startReview(id,quiet){
  if(!crew) return;
  if(!me) return needMe(id);
  const wasTarget=!!target;
  target={id,name:memberName(id)};
  // this device's review, or else the latest one this person saved on another device
  const existing=reviews().filter(r=>r.member===id&&byMe(r)).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0];
  /* Answers on screen only carry over to the same person: your own review to "yourself", or a review of Mum to Mum. */
  const samePerson=id===me?state.who==="me":(state.who!=="me"&&(state.name||"").trim().toLowerCase()===memberName(id).trim().toLowerCase());
  const carry=!wasTarget&&!existing&&samePerson&&(Object.keys(state.v).length||Object.keys(state.dk).length)&&setForType(memberType(id))===activeSet();
  state.who=id===me?"me":memberType(id); state.qset=setForType(memberType(id)); state.name=target.name;
  if(carry){useSet(activeSet());CATS.forEach(c=>{if(state.v[c.id+"t"]==null&&!state.dk[c.id+"t"])syncTop(c)})}
  else setSliders(existing);
  revealed=!!existing&&!carry;
  const el=$("crewNote"); if(el) el.hidden=true;
  savedSig=carry?"":sig();
  document.querySelectorAll('input[name=who]').forEach(r=>r.checked=r.value===state.who);
  nameInput.value=target.name;
  save(); render();
  if(!quiet) $("cats").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
}
function stopReview(){target=null;delete state.qset;render()}
const toTop=()=>$("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
$("reviewCancel").onclick=toTop;
function clearReview(){
  revealed=false; state.revealed=false;
  target=null; delete state.qset; setSliders({}); state.name=""; nameInput.value=""; pick.value="";
  save(); render(); toTop();
}

pick.addEventListener("change",()=>{
  if(!pick.value){stopReview();return}
  const id=pick.value;
  if(!me){pick.value="";needMe(id);return}
  startReview(id);
});
document.querySelectorAll('input[name=who]').forEach(r=>r.addEventListener("change",()=>{
  if(!crew) return;
  if(r.value==="me"&&me) startReview(me);
  else if(target&&(target.id===me||memberType(target.id)!==r.value)) stopReview();
}));
function syncPick(){
  const crewWho=state.who==="family"||state.who==="mate"||state.who==="partner";
  const show=!!crew&&crewWho;
  const others=members().filter(m=>m.id!==me&&memberType(m.id)===state.who);
  const word=state.who==="mate"?"mates":state.who==="partner"?"partners":"family";
  pick.hidden=!show; nameInput.hidden=show; pickHint.hidden=true;
  if(show){
    $("nameLabel").textContent=state.who==="mate"?"Mate":state.who==="partner"?"Partner":"Family member";
    pick.innerHTML=`<option value="">${others.length?"Choose who to review…":`No ${word} in your crew yet`}</option>`+others.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
    pick.value=target&&target.id!==me&&others.some(m=>m.id===target.id)?target.id:"";
    if(!me){pickHint.textContent="Pick your own name under \"Your name\" in your crew below first.";pickHint.hidden=false}
    else if(!others.length){pickHint.textContent=`Add ${word==="family"?"family members":word==="partners"?"your partner":"mates"} to your crew below.`;pickHint.hidden=false}
  }
}

/* ---------- self vs crew on the report card ---------- */
const VIEW=(label,v,note)=>{const g=v==null?null:grade(v);return `<div class="view"${g?` style="--g:${gcol(g)}"`:""}><span class="vg">${g||"–"}</span><span class="vt"><b>${label}</b><span>${v==null?"–":v.toFixed(1)+" / 10"}</span>${note?`<small>${note}</small>`:""}</span></div>`};
function selfVsCrew(rows,avg){
  if(!REVIEW_PAGE) return null;
  if(!crew||!target){
    if(state.who!=="me") return null;
    return {self:avg,crew:null,crewN:0,selfNote:"Your own rating",crewNote:"Join or create a crew to see how others rate you",gaps:null};
  }
  const tid=target.id, isSelf=tid===me, nm=target.name;
  const myRid=myRidFor(tid), mine=reviews().find(r=>r.id===myRid), myKey=mine?(mine.boardKey||legacyKey(myRid)):"";
  const by=(boardById&&boardById[tid]&&boardById[tid].by)||{};
  const readable=liveReviews().filter(r=>r.member===tid&&r.id!==myRid);
  const selfRev=readable.find(r=>r.reviewer===tid)||null, otherRevs=readable.filter(r=>r.reviewer!==tid);
  // overall: board first (everyone can read it), readable reviews as a fallback
  let crewVals=Object.entries(by).filter(([k,e])=>!e.self&&k!==myKey).map(([k,e])=>e.o);
  if(!crewVals.length) crewVals=otherRevs.map(r=>r.overall).filter(v=>typeof v==="number");
  let selfV;
  if(isSelf) selfV=avg;
  else{ const se=Object.values(by).find(e=>e.self); selfV=se?se.o:(selfRev?selfRev.overall:null); if(avg!=null) crewVals=[...crewVals,avg]; }
  if(crew.type==="partner"&&isSelf){
    const theirs=members().filter(m=>m.id!==me).map(m=>{const b2=(boardById&&boardById[m.id]&&boardById[m.id].by)||{};const e=Object.values(b2).find(x=>x&&x.self);return e?e.o:null}).filter(v=>typeof v==="number");
    const pr=liveReviews().find(r=>r.member!==me&&r.reviewer===r.member);
    const theirsV=theirs.length?mean(theirs):(pr?pr.overall:null);
    const live0=Object.fromEntries(rows.filter(r=>r.avg!=null).map(r=>[r.c.id,r.avg]));
    const g0=pr&&pr.cats?CATS.filter(c=>live0[c.id]!=null&&pr.cats[c.id]!=null).map(c=>({c,s:live0[c.id],k:pr.cats[c.id],d:live0[c.id]-pr.cats[c.id]})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)):null;
    return {self:avg,crew:theirsV,crewN:theirs.length,isSelf:true,nm,gaps:g0,couple:true,selfNote:"How you rate the relationship",crewNote:theirsV==null?"Waiting on your partner's side":"How your partner rates it"};
  }
  if(isSelf&&crew.type!=="partner"&&crewVals.length===1&&avg==null)
    return {self:selfV,crew:null,crewN:1,isSelf,nm,gaps:null,selfNote:"How you rate yourself",crewNote:"🔒 Shows after 2 reviews (1 in so far), so nobody's rating stands out on its own"};
  const crewV=crewVals.length?mean(crewVals):null;
  // per-area: needs the person's own review and the crew's (readable for yourself, or for crew admins)
  const live=Object.fromEntries(rows.filter(r=>r.avg!=null).map(r=>[r.c.id,r.avg]));
  const selfCats=isSelf?live:(selfRev&&selfRev.cats)||null;
  const crewList=[...otherRevs.map(r=>r.cats||{}),...(isSelf?[]:[live])];
  const crewCats=crewList.length?Object.fromEntries(CATS.map(c=>{const vs=crewList.map(x=>x[c.id]).filter(v=>v!=null);return [c.id,vs.length?mean(vs):null]})):null;
  let gaps=null;
  if(selfCats&&crewCats&&(isSelf?otherRevs.length:true)) gaps=CATS.filter(c=>selfCats[c.id]!=null&&crewCats[c.id]!=null).map(c=>({c,s:selfCats[c.id],k:crewCats[c.id],d:selfCats[c.id]-crewCats[c.id]})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  const n=crewVals.length;
  const hiddenSelf=!isSelf&&selfV==null&&!boardOpen();
  return {self:selfV,crew:crewV,crewN:n,isSelf,nm,gaps,
    selfNote:isSelf?"How you rate yourself":(hiddenSelf?"Shows once the crew admin switches on the leaderboard":selfV==null?`${esc(nm)} hasn't done a self review yet`:`How ${esc(nm)} rates themselves`),
    crewNote:n?`Average of ${n} review${n===1?"":"s"} from the crew${isSelf?"":" (including yours)"}`:(isSelf?"No one in the crew has reviewed you yet":"")};
}
function paintViews(rows,avg){
  const vb=$("views"), gb=$("gaps"); if(!vb||!gb) return;
  const v=selfVsCrew(rows,avg); window.__views=v;
  if(v&&v.self!=null&&v.crew!=null&&window._summary) window._summary=window._summary.replace("\n\n",`\nSelf assessment: ${grade(v.self)} (${v.self.toFixed(1)}) · Crew assessment: ${grade(v.crew)} (${v.crew.toFixed(1)})\n\n`);
  const hs=$("viewSelf"), hc=$("viewCrew");
  const HV=(el,label,val,note)=>{const g=val==null?null:grade(val);el.innerHTML=`<span class="hl">${label}</span><span class="hbig">${g||"–"}</span><span class="hn">${val==null?"–":val.toFixed(1)+" / 10"}</span>${note?`<small>${note}</small>`:""}`;el.hidden=false};
  vb.hidden=true;
  if(!v){hs.hidden=true;hc.hidden=true;gb.hidden=true;$("bigGrade").hidden=false;return}
  $("bigGrade").hidden=true;
  HV(hs,v.couple?"You":"Self",v.self,v.selfNote); HV(hc,v.couple?"Partner":"Crew",v.crew,v.crewNote);
  if(v.self==null||v.crew==null){gb.hidden=true;return}
  const you=v.isSelf, them=esc(v.nm), d=v.self-v.crew;
  const subj=v.couple?"You rate the relationship":you?"You rate yourself":`${them} rates themselves`;
  const crewW=v.couple?"your partner":"the crew";
  const overall=Math.abs(d)<0.5?`Overall, ${you?"your view":`${them}'s view`} and ${v.couple?"your partner's":"the crew's"} are pretty much in line (${v.self.toFixed(1)} vs ${v.crew.toFixed(1)}).`
    :`Overall, ${subj.charAt(0).toLowerCase()+subj.slice(1)} <b>${Math.abs(d).toFixed(1)} ${d>0?"higher":"lower"}</b> than ${v.couple?"your partner":"the crew"} does (${v.self.toFixed(1)} vs ${v.crew.toFixed(1)}).`;
  const big=(v.gaps||[]).filter(x=>Math.abs(x.d)>=1).slice(0,3);
  const line=x=>x.d>0?`<b>${x.c.name}</b>: ${subj.charAt(0).toLowerCase()+subj.slice(1)} ${Math.abs(x.d).toFixed(1)} higher than ${crewW} does (${x.s.toFixed(1)} vs ${x.k.toFixed(1)}).`
    :`<b>${x.c.name}</b>: ${crewW} rates ${v.couple?"it":you?"you":them} ${Math.abs(x.d).toFixed(1)} higher than ${you?"you do":"they do"} (${x.k.toFixed(1)} vs ${x.s.toFixed(1)}).`;
  gb.innerHTML=`<h3>${v.couple?"Biggest gaps: you vs your partner":"Biggest gaps: self vs crew"}</h3><p>${overall}</p>`+(big.length?`<ul>${big.map(x=>`<li>${line(x)}</li>`).join("")}</ul>`:v.gaps?`<p class="muted">No area differs by a full point or more.</p>`:`<p class="muted">${you?"Area-by-area gaps show once someone in the crew has reviewed you.":`Only ${them} and the crew admin see the area-by-area gaps.`}</p>`);
  gb.hidden=false;
}

let last=null, savedSig="", revealed=false;   // revealed: this crew review was saved, so its report card shows
const sig=()=>JSON.stringify([state.v,state.dk]);
const nextBtn=$("reviewNext"), bannerGrade=$("reviewBannerGrade");
window.afterRender=function(rows,avg){
  last={rows,avg};
  try{paintViews(rows,avg)}catch(x){console.warn(x)}
  if(crew&&entry==="join") entry="rate";
  if(REVIEW_PAGE&&!$("shareBox").hidden){clearTimeout(window.__cardT);window.__cardT=setTimeout(()=>$("shareBtn")&&$("shareBox")&&!$("shareBox").hidden&&window.__rebuildCard&&window.__rebuildCard(),400)}
  document.body.classList.toggle("in-crew",!!crew);
  document.body.classList.toggle("crew-ready",!!crew||myCrews.length>0);
  paintEntry();
  paintDone();
  if(window.__paintAsk) window.__paintAsk();
  syncPick();
  const on=!!(crew&&target&&me), pickFirst=!!(crew&&!target&&REVIEW_PAGE);
  banner.hidden=!on&&!pickFirst;
  if(pickFirst){bannerText.innerHTML=me?"<b>Who are you reviewing?</b> Tap Review next to their name":($("welcomeBox")&&!$("welcomeBox").hidden)?"<b>Type your first name</b> to get started":"<b>Pick your name</b> under Your name first";bannerGrade.textContent="?";bannerGrade.style.setProperty("--g","var(--track)");$("reviewCancel").textContent="Choose"}
  else $("reviewCancel").textContent="Change"; saveBtn.hidden=true; soloBtn.hidden=true; nextBtn.hidden=!REVIEW_PAGE;
  document.body.classList.toggle("has-bar",on||pickFirst);
  if(on){
    const self=target.id===me, dirty=sig()!==savedSig, g=avg==null?null:grade(avg);
    bannerText.innerHTML=self?`<b>${esc(memberName(me))}</b> reviewing <b>themselves</b>`:`<b>${esc(memberName(me))}</b> reviewing <b>${esc(target.name)}</b>`;
    bannerGrade.textContent=g||"–"; bannerGrade.style.setProperty("--g",g?gcol(g):"var(--track)");
    saveBtn.textContent=self?"Save my review to the crew":`Save review of ${target.name}`;
    if(isAdmin()||self){const n=aggFor(target.id).rs.length;revCount.textContent=`${n} ${n===1?"person has":"people have"} reviewed ${self?"you":target.name} so far`;revCount.hidden=false}
    else revCount.hidden=true;
  }else revCount.hidden=true;
};
const snapshotResult=()=>{
  const values={}, dk={};
  CATS.forEach(c=>["t",0,1,2].forEach(i=>{const k=c.id+i;
    if(state.dk[k])dk[k]=true;
    else if(i==="t")values[k]=val(c.id,"t");
    else if(state.v[k]!=null)values[k]=state.v[k];
  }));
  const cats={};last.rows.forEach(r=>{if(r.avg!=null)cats[r.c.id]=Math.round(r.avg*100)/100});
  return {set:activeSet(),values,dk,cats,overall:Math.round(last.avg*100)/100,grade:grade(last.avg),year:2026,savedAt:Date.now()};
};
async function saveReview(){
  if(!crew||!target||!me||!last) return false;
  if(last.avg==null){toast("Answer at least one area before saving.");return false}
  const r=snapshotResult(); saveBtn.disabled=true; nextBtn.disabled=true;
  let ok=false;
  try{
    const put=async rid0=>{
      const old=reviews().find(x=>x.id===rid0), boardKey=old?(old.boardKey||legacyKey(rid0)):rid(16);
      const b=writeBatch(db);
      b.set(doc(db,"crews",crewId,"reviews",rid0),{member:target.id,reviewer:me,reviewerUid:user.uid,...r,boardKey});
      b.set(doc(db,"crews",crewId,"board",target.id),{by:{[boardKey]:{o:r.overall,self:target.id===me}}},{merge:true});
      await b.commit();
    };
    const rid0=myRidFor(target.id), legacy=`${user.uid}_${target.id}`;
    try{await put(rid0)}
    catch(x){
      if(!(x&&x.code==="permission-denied")) throw x;
      /* Security rules not updated yet for one-review-per-name: fall back to the older one-per-device id. */
      if(rid0!==legacy){
        /* If the review alone saves, the rules are up to date and only the leaderboard entry was refused. */
        let alone=false;try{await setDoc(doc(db,"crews",crewId,"reviews",rid0),{member:target.id,reviewer:me,reviewerUid:user.uid,...r,boardKey:(reviews().find(z=>z.id===rid0)||{}).boardKey||rid(16)});alone=true}catch(y){if(!(y&&y.code==="permission-denied"))throw y}
        if(!alone){try{await put(legacy)}catch(y){if(!(y&&y.code==="permission-denied"))throw y;await setDoc(doc(db,"crews",crewId,"reviews",legacy),{member:target.id,reviewer:me,reviewerUid:user.uid,...r})}}
      }
      else await setDoc(doc(db,"crews",crewId,"reviews",rid0),{member:target.id,reviewer:me,reviewerUid:user.uid,...r,boardKey:(reviews().find(z=>z.id===rid0)||{}).boardKey||rid(16)});
    }
    savedSig=sig(); ok=true; await markDone(crewId,me,target.id);
    toast(`Saved. ${target.name}'s results are updated.`);
  }catch(x){toast(errText(x),6000)}
  saveBtn.disabled=false; nextBtn.disabled=false; render();
  return ok;
}
saveBtn.addEventListener("click",saveReview);
nextBtn.addEventListener("click",async()=>{
  /* No crew: the review is already kept on this device, so start a new one for someone else. */
  if(!crew){
    const nm=$("name"),wp=$("whoPick");if(nm&&state.who!=="me")nm.dispatchEvent(new Event("change"));
    nextBtn.disabled=true;
    try{const g=await soloToCrew();if(g){const who=state.name;clearReview();try{sessionStorage.setItem("rmy-flash",`Saved. Your ${CREW_TYPES[g.type].crew} is set up${who?` with ${who}`:""}. Pick who to rate next.`)}catch(e){}location.href=REVIEW_PATH;return}}
    catch(x){toast(`Saved on this device. Couldn't set up your crew yet: ${errText(x)}`,6000)}
    nextBtn.disabled=false;
    if(wp){wp.value="new";wp.dispatchEvent(new Event("change"))}toTop();return}
  if(!target){
    if(!me){needMe("");return}
    if(Object.keys(state.v).length||Object.keys(state.dk).length){crewNote(`Who is this review for? Tap <b>Review</b> next to their name in your crew list. Your answers are kept.`,true);toTop();return}
    return clearReview();
  }
  /* Save, then reload the whole page so the leaderboard, scores and next steps all start fresh. */
  if(last&&last.avg!=null){const nm=target.name;if(!(await saveReview()))return;clearReview();
    try{sessionStorage.setItem("rmy-flash",`Saved your review of ${nm}. Pick who to rate next.`)}catch(e){}
    location.href=REVIEW_PATH;return}
  clearReview();
});
soloBtn.addEventListener("click",async()=>{
  if(!user||!last) return;
  if(last.avg==null) return toast("Answer at least one area before saving.");
  soloBtn.disabled=true;
  try{
    await addDoc(collection(db,"results"),{uid:user.uid,kind:"solo",relation:state.who==="me"?"self":state.who,subject:state.name||"",...snapshotResult()});
    toast("Result saved to your account.");
  }catch(x){toast(errText(x),6000)}
  soloBtn.disabled=false;
});

/* ---------- Save & See Results: the report card stays hidden until the review is saved ---------- */
function paintDone(){
  const bar=$("doneBar"); if(!bar) return;
  if(!REVIEW_PAGE){bar.hidden=true;return}
  const inRev=!!(crew&&target&&me), solo=!crew, show=solo||inRev;
  bar.hidden=!show;
  const open=solo?!!state.revealed:revealed, dirty=inRev&&sig()!==savedSig;
  document.body.classList.toggle("report-locked",show&&!open);
  const t=!show?null:solo?(open?null:["Save &amp; See My Results",$("myName")&&$("myName").value.trim()?"Saves your review and sets up your crew":"Your answers are saved on this device"])
    :!open?["Save &amp; See Results",target.id===me?"Saves your review to the crew, then shows your report card":`Saves your review of ${esc(target.name)} to the crew`]
    :dirty?["Save Changes","Update your saved review"]:null;
  const pn=inRev?pendingName():""; if(t&&pn&&!(target&&target.name.trim().toLowerCase()===pn.toLowerCase())) t[1]=`Adds ${esc(pn)} to your crew and saves your review of them`;
  const btn=$("doneBtn"); btn.hidden=!t;
  if(t){const h=`<b>${t[0]}</b><small>${t[1]}</small>`;if(btn.innerHTML!==h)btn.innerHTML=h}
  $("doneSaved").hidden=!(inRev&&open&&!dirty);
  const nb=$("reviewNext"), nh=inRev&&open&&!dirty?`<b>Rate Someone Else</b><small>Pick the next person in your crew, or add someone new</small>`:`<b>Save &amp; Rate Another</b><small>Saves this review and starts the next person</small>`;
  const nh2=crew?nh:`<b>Save &amp; Rate Another</b><small>Keeps this review on this device and starts a new one</small>`;
  if(nb&&nb.innerHTML!==nh2) nb.innerHTML=nh2;
}
/* A name typed in "Rate someone who isn't here yet" but not added yet: Save & See Results adds them and saves the answers on screen as the review of them. */
const pendingName=()=>REVIEW_PAGE&&crew&&me&&$("addRateName")?$("addRateName").value.trim().slice(0,40):"";
async function adoptPending(){
  const n=pendingName(); if(!n) return true;
  let hit=members().find(m=>m.name.trim().toLowerCase()===n.toLowerCase());
  try{
    if(!hit){hit={id:rid(10),name:n,type:crew.type?crewMemberType():"family"};const next=[...members(),hit];await updateDoc(doc(db,"crews",crewId),{members:next});crew={...crew,members:next}}
  }catch(x){famErr(errText(x));return false}
  $("addRateName").value="";famErr("");
  if(target&&target.id===hit.id) return true;
  /* someone on a different question set: open their review instead of saving these answers against them */
  if(setForType(memberType(hit.id))!==activeSet()){startReview(hit.id);toast(`${hit.name} is added. They're rated on different questions, so start their review here.`,6000);return false}
  target={id:hit.id,name:memberName(hit.id)}; state.who=hit.id===me?"me":memberType(hit.id); state.name=target.name;
  return true;
}
/* Before showing results: you need at least one answer, and you're told how many are still unanswered. */
const firstUnanswered=()=>{for(const c of CATS)for(let i=0;i<c.qs.length;i++)if(!isAnswered(c.id+i))return $("q-"+c.id+i);return null};
const goUnanswered=()=>{const q=firstUnanswered();if(q){q.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"center"});const b=q.querySelector(".gseg button");if(b)setTimeout(()=>b.focus({preventScroll:true}),300)}};
let doneOk=false;
$("doneKeep").onclick=()=>{$("doneAsk").hidden=true;goUnanswered()};
$("doneAnyway").onclick=()=>{$("doneAsk").hidden=true;doneOk=true;$("doneBtn").click()};
$("doneBtn").addEventListener("click",async()=>{
  const pr=progress();
  if(!last||last.avg==null||pr.n===0){state.revealedTried=true;render();const a=$("doneAsk");$("doneAskText").textContent="Answer at least one question first. Tap a grade from A to E, or Don't know.";a.hidden=false;$("doneAnyway").hidden=true;return}
  if(pr.n<pr.t&&!doneOk){state.revealedTried=true;render();const a=$("doneAsk");$("doneAskText").textContent=`You've answered ${pr.n} of ${pr.t} questions. Unanswered ones are left out of the grades.`;$("doneAnyway").hidden=false;a.hidden=false;a.scrollIntoView({block:"nearest"});return}
  doneOk=false;$("doneAsk").hidden=true;
  const b=$("doneBtn"); b.disabled=true;
  if(pendingName()&&!(await adoptPending())){b.disabled=false;return}
  if(!crew){
    state.revealed=true;save();
    try{const g=await soloToCrew();if(g){openCrew(g.id);toast(`Saved. Your ${CREW_TYPES[g.type].crew} is set up with everyone you've rated. Invite people at the end of your report card.`,6000,false)}}
    catch(x){toast(`Saved on this device. Couldn't set up your crew yet: ${errText(x)}`,6000)}
  }
  else if(target&&me){if(!(await saveReview())){b.disabled=false;return}revealed=true}
  b.disabled=false; render();
  setTimeout(()=>document.querySelector(".report").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"}),50);
});

/* ---------- main page entry: Rate Me / Join A Crew / Create A Crew ---------- */
let entry="rate", landJoin=false;
const REVIEW_PAGE=!ADMIN&&!JOIN;
function paintEntry(){
  if(!REVIEW_PAGE) return;
  document.body.classList.toggle("entry-rate",entry==="rate");
  document.body.classList.toggle("entry-join",entry==="join");
  if($("choiceRate")) $("choiceRate").setAttribute("aria-pressed",entry==="rate");
  if($("choiceJoin")) $("choiceJoin").setAttribute("aria-pressed",entry==="join");
  if($("choiceRate")) $("choiceRate").setAttribute("aria-pressed",entry==="rate"&&state.who==="me");
  if(REVIEW_PAGE) $("famH2").textContent=crew?`Review ${crew.name}`:entry==="join"?"Join A Crew":"Who are you rating?";
}
if(REVIEW_PAGE){
  $("choiceRate").onclick=()=>{
    const wasJoin=entry==="join"; entry="rate"; paintEntry();
    const r=$("who-me"); if(!r.checked){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}))}
    if(wasJoin&&!crew&&auth){ if(user&&myCrews.length) viewLobby(); else viewSignedOut(); }
    $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
    if(!crew) setTimeout(()=>nameInput.focus({preventScroll:true}),300);
  };
  /* Join always goes to the Join page (no inline join on top of the questions). */
  $("endJoin").onclick=()=>$("choiceJoin").click();
  /* Rate My Family / Rate My Mates always mean rating, so leave the crew search if it was open. */
  ["who-family","who-mate","who-partner","who-me"].forEach(id=>$(id).addEventListener("change",()=>{
    if(entry!=="join") return;
    entry="rate"; paintEntry();
    if(!crew&&auth){ if(user&&myCrews.length) viewLobby(); else viewSignedOut(); }
  }));
  /* Share Results: a picture of the report card, sent by the share sheet, WhatsApp, text or email.
     Each send is recorded in the shares collection (channel plus email or mobile if given). */
  const shareBox=$("shareBox"), shareBtn=$("shareBtn"), note=$("shareNote");
  /* Invite Others To Rate You: solo, it opens a small box for names, then makes your group and link.
     Inside a group it sends your invite link straight away. */
  const askBox=$("askBox"), askBtn=$("endAsk");
  const askNote=(m,err)=>{$("askNote").textContent=m||"";$("askNote").className=err?"err":"muted"};
  const askFor=()=>state.who==="me"?"me":state.who==="partner"?"partner":"other";
  window.__paintAsk=()=>{
    const k=reviewKind(), them=esc((state.name||"").trim()), inGroup=!!crew, partner=inGroup?crew.type==="partner":askFor()==="partner";
    const crewWord=inGroup?CREW_TYPES[crewTypeOf(crew.type)].crew:k==="mates"?"Mates crew":"Family crew";
    const t=partner?["Ask Your Partner To Rate You","Send the link. They add their side, then you see how your views compare."]
      :inGroup||askFor()==="me"?["Invite Others To Rate You",`Send your ${crewWord} link. Each person rates you in about 5 minutes, then rates themselves.`]
      :["Invite Others To Rate",`Send the link to ${them||"them"} and anyone else in your ${crewWord}. They rate you, then themselves.`];
    const html=`<b>${t[0]}</b><small>${t[1]}</small>`; if(askBtn.innerHTML!==html) askBtn.innerHTML=html;
    if(!askBox.hidden){$("askForm").hidden=inGroup;$("askSend").hidden=!inGroup;if(inGroup)$("askLead").textContent=partner?"✓ Your link is ready. Send it to your partner.":"✓ Your link is ready. Send it to your family and friends."}
  };
  function openAsk(){
    const who=askFor();
    $("askName").value=(who==="me"?(state.name||""):"")||$("shareFrom").value.trim()||"";
    $("askThemF").hidden=who==="me"; $("askThem").value=who==="me"?"":(state.name||"");
    $("askThemL").textContent=who==="partner"?"Your partner's first name (optional)":"Their first name";
    $("askLead").textContent=who==="me"?`We'll make a private link just for your ${KIND_WORD[reviewKind()]==="Personal"?"family and friends":KIND_WORD[reviewKind()].toLowerCase()}. Anyone who opens it rates you, then rates themselves. No sign-up needed.`
      :who==="partner"?"We'll make a private link for the two of you. Your partner adds their side, then you both see how your views compare."
      :`We'll make a private link for you and ${(state.name||"them").trim()}. They can rate themselves and see how it compares with your rating.`;
    $("askLead").textContent+=" Your answers are saved online so the people with the link can compare. See Privacy at the bottom of the page for who sees what.";
    /* One panel at a time: opening this one closes Share. */
    if($("shareBox")){$("shareBox").hidden=true;$("shareBtn").setAttribute("aria-expanded","false")}
    askNote(""); $("askGo").disabled=false; askBox.hidden=false; askBtn.setAttribute("aria-expanded","true"); window.__paintAsk();
    window.__resetInviteCard&&window.__resetInviteCard(); try{inviteCard()}catch(e){}
    askBox.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"nearest"});
    if(!$("askName").value) setTimeout(()=>$("askName").focus({preventScroll:true}),250);
  }
  askBtn.onclick=()=>{
    if(!last||last.avg==null){toast("Answer at least one area first, so there's a review to send.");return}
    if(crew){
      if(!me){needMe("");toast("First pick your own name under \"Your name\" in your crew.");return}
      const showBox=()=>{askBox.hidden=false;askBtn.setAttribute("aria-expanded","true");window.__paintAsk();askBox.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"nearest"})};
      shareLink("invite",false,showBox).catch(x=>{console.warn("invite share failed",x);showBox();askNote("Couldn't open sharing. Tap Send the link, or Copy link and paste it into a message.",true)});
      return}
    if(!askBox.hidden){askBox.hidden=true;askBtn.setAttribute("aria-expanded","false");return}
    openAsk();
  };
  $("askGo").onclick=async()=>{
    const who=askFor(), myName=$("askName").value.trim().slice(0,40), them=who==="me"?"":$("askThem").value.trim().slice(0,40);
    if(!myName){askNote("Type your first name, so people know whose link it is.",true);$("askName").focus();return}
    if(who==="other"&&!them){askNote("Type their first name too.",true);$("askThem").focus();return}
    try{localStorage.setItem("rmy-from",myName)}catch(e){} $("shareFrom").value=myName;
    if(who==="me"){state.name=myName;nameInput.value=myName;save()}
    $("askGo").disabled=true; askNote("Setting up your link…");
    try{
      const g=await startQuickGroup(myName,them);
      openCrew(g.id);
      window.__paintAsk();
      /* One tap: make the link and open the share list straight away. If the phone blocks that
         (it only allows sharing right after a tap), the "Send the link" button below does it. */
      const t0=Date.now(); while(!(crew&&me)&&Date.now()-t0<4000) await new Promise(r=>setTimeout(r,100));
      askNote("Your link is ready. Pick WhatsApp, Messages or email. Each person who opens it rates you, then themselves.");
      if(crew&&me) shareLink("invite",true);
    }catch(x){
      afterOpen=null; $("askGo").disabled=false;
      if(x&&x.code==="permission-denied") askNote("Couldn't make your link right now. For now, use My Crews at the top of the page to set up a crew with Google.",true);
      else askNote(x&&x.code==="no-config"?"Crews aren't connected yet.":errText(x),true);
    }
  };
  $("askShare").onclick=()=>shareLink("invite");
  $("askCopy").onclick=copyLink;
  let cardBlob=null, cardUrl="";
  const canShareFiles=()=>{try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([new Blob(["x"])],"a.png",{type:"image/png"})]}))}catch(e){return false}};
  /* Who the report card is from: your crew name if you've joined a crew, otherwise the From box. */
  const inCrew=()=>!!(crew&&me&&members().some(m=>m.id===me));
  const sender=()=>inCrew()?memberName(me):$("shareFrom").value.trim();
  try{$("shareFrom").value=localStorage.getItem("rmy-from")||""}catch(e){}
  $("shareFrom").addEventListener("input",()=>{try{localStorage.setItem("rmy-from",$("shareFrom").value.trim())}catch(e){}});
  const shareText=()=>{
    if(!last||last.avg==null) return "";
    const g=grade(last.avg), top=[...last.rows].filter(r=>r.avg!=null).sort((a,b)=>b.avg-a.avg).slice(0,3).map(r=>r.c.name).join(", ");
    const n=(state.name||"").trim(), an=/^[AE]/.test(g)?"an":"a", from=sender();
    const rel=reviewKind()==="partner";
    if(rel) return `${n?`${n},\n\n`:""}${from?`${from} rates our 2026 relationship ${an}: ${g}`:`Our relationship has been rated ${an} ${g} for 2026`}\n\n${cardTitle()}: ${g} (${last.avg.toFixed(1)}/10).\n${VERDICTS[g[0]]}${top?` Top areas: ${top}.`:""}\n\nFeedback is a GIFT 🎁\nRate your family and friends at:\nwww.ratemyyear.com`;
    if(from&&!isMe()) return `${n?`${n},\n\n`:""}${from} rates your 2026 ${KIND_WORD[reviewKind()]} Rating ${an}: ${g}\n\n${cardTitle()}: ${g} (${last.avg.toFixed(1)}/10).\n${VERDICTS[g[0]]}${top?` Top areas: ${top}.`:""}\n\nFeedback is a GIFT 🎁\nRate your family and friends at:\nwww.ratemyyear.com`;
    return `${n?`${n}, you have`:"You have"} been rated ${an} ${g} for 2026\n\n${cardTitle()}: ${g} (${last.avg.toFixed(1)}/10).\n${VERDICTS[g[0]]}${top?` Top areas: ${top}.`:""}\n\nFeedback is a GIFT 🎁\nRate your family and friends at:\nwww.ratemyyear.com`;
  };
  const say2=(m,err)=>{note.textContent=m;note.className=err?"err":"muted"};
  async function record(channel,extra){
    try{
      if(!auth) return;
      if(!auth.currentUser) await withTimeout(signInAnonymously(auth),10000,"Signing in");
      await withTimeout(addDoc(collection(db,"shares"),{uid:auth.currentUser.uid,channel,...extra,who:state.who,set:activeSet(),grade:grade(last.avg),overall:Math.round(last.avg*100)/100,crewId:crewId||"",at:Date.now()}),10000,"Saving");
    }catch(x){console.warn("share not recorded",x)}
  }
  const ready=()=>{if(!last||last.avg==null){say2("Answer at least one area first, so there's a report card to share.",true);return false}return true};
  async function buildCard(){
    $("fromField").hidden=isMe()||inCrew();
    $("cardMaking").hidden=false; $("cardImg").hidden=true;
    try{
      cardBlob=await window.makeCard(); if(cardUrl) URL.revokeObjectURL(cardUrl); cardUrl=URL.createObjectURL(cardBlob);
      $("cardImg").src=cardUrl; $("cardImg").hidden=false; $("cardMaking").hidden=true; $("saveImg").href=cardUrl;
    }catch(x){$("cardMaking").textContent="Couldn't make the picture on this device. You can still share the words with the Share Report Card button."}
  }
  window.__rebuildCard=buildCard;
  shareBtn.onclick=()=>{if(shareBox.hidden&&$("askBox")){$("askBox").hidden=true;$("endAsk").setAttribute("aria-expanded","false")}shareBox.hidden=!shareBox.hidden;shareBtn.setAttribute("aria-expanded",!shareBox.hidden);say2("");if(!shareBox.hidden){if(!ready()){shareBox.hidden=false;return}buildCard();shareBox.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"})}};
  /* Share Report Card: the share list with the picture and the message (pick WhatsApp, Messages, Mail…).
     Where a device can't share pictures, it shares the words, or opens WhatsApp with them. */
  $("shareImg").onclick=async()=>{
    if(!ready()) return; const extra={};
    try{
      if(canShareFiles()&&cardBlob){await navigator.share({files:[new File([cardBlob],"rate-my-year-report-card.png",{type:"image/png"})],title:cardTitle(),text:shareText()});record("picture",extra);return}
      if(navigator.share){await navigator.share({title:cardTitle(),text:shareText()});record("picture",{...extra,textOnly:true});say2("Only the words were sent: this device can't attach the picture. Tap Save Report to keep the picture.");return}
    }catch(x){if(x&&x.name==="AbortError")return;say2("Couldn't open sharing. Try Save Report instead.",true);return}
    record("whatsapp",extra);
    const u=`https://wa.me/?text=${encodeURIComponent(shareText())}`;
    if(!window.open(u,"_blank")) location.href=u;
  };
  $("saveImg").addEventListener("click",e=>{if(!cardBlob){e.preventDefault();return}record("saved",{})});
}

/* ---------- Review first, then ask others ----------
   Finish your own review, tap "Invite Others To Rate You", and a small group is made for you behind the
   scenes (no Google sign-in). The invite link carries &from=<member> so whoever opens it is asked to rate
   that person first, then themselves, and gets their own link to pass on. */
let afterOpen=null;           // {id, fresh, quiet}: the review to open once "I am" is known
let inviteFrom="";            // member id from ?from= on the invite link
const FROM_KEY=id=>"rmy-from-"+id;
function getFrom(id){try{return localStorage.getItem(FROM_KEY(id))||""}catch(e){return ""}}
function setFrom(id,v){try{v?localStorage.setItem(FROM_KEY(id),v):localStorage.removeItem(FROM_KEY(id))}catch(e){}}
const linkFrom=id=>inviteLink()+(id?`&from=${encodeURIComponent(id)}`:"");
const GROUP_WORD={family:"Family",mates:"Mates",partner:"Check-in"};
function selfScoreOf(id){const by=(boardById&&boardById[id]&&boardById[id].by)||{};const e=Object.values(by).find(x=>x&&x.self&&typeof x.o==="number");return e?e.o:null}
function inviteText(kind){
  const nm=me?memberName(me):"Someone", T=crewTypeOf(crew&&crew.type), so=me?selfScoreOf(me):null;
  if(kind==="nudge") return T==="partner"?`Just a reminder: I'm waiting on your side of our Couple Check-in 💕 It takes about 5 minutes:`:`Just a reminder: ${nm} is waiting on your rating 🙂 It takes about 5 minutes:`;
  if(T==="partner") return `${nm} just did our Couple Check-in for 2026 💕 Add your side (about 5 minutes) and we'll see how we compare:`;
  /* Just rated someone else: the invite leads with the grade you gave them. */
  const an=g=>/^[AE]/.test(g)?"an":"a";
  if(target&&target.id!==me&&last&&last.avg!=null){const g=grade(last.avg),tn=target.name;return `${nm} rates ${tn} ${an(g)} ${g} for their 2026 ${CREW_TYPES[T].review}.\nMake ${tn} even more awesome! 💪\nFeedback is a GIFT 🎁`}
  /* Once you've rated yourself, the invite leads with your own grade. */
  const own=me?reviews().find(r=>r.member===me&&r.reviewer===me&&typeof r.overall==="number"):null;
  const self=so!=null?so:own?own.overall:null;
  if(self!=null) return `${nm} rates themselves ${/^[AE]/.test(grade(self))?"an":"a"} ${grade(self)} for their 2026 ${CREW_TYPES[T].review}.\nMake ${nm} even more awesome! 💪\nFeedback is a GIFT 🎁`;
  return `${nm} wants to know how they've gone this year. Rate ${nm} in about 5 minutes, then rate yourself and see how you compare:`;
}
async function recordShare(channel){
  try{ if(db&&user) await addDoc(collection(db,"shares"),{uid:user.uid,channel,crewId:crewId||"",type:(crew&&crew.type)||"",at:Date.now()}) }catch(x){console.warn("share not recorded",x)}
}
/* Send the invite link from the phone's share sheet (WhatsApp, Messages, email…), or WhatsApp where that isn't available. */
/* The invite goes with a picture of your report card (made ahead of time, so sharing starts straight away). */
let inviteCardP=null;
const inviteCard=()=>{if(!inviteCardP&&window.makeCard&&last&&last.avg!=null) inviteCardP=window.makeCard().catch(()=>null);return inviteCardP||Promise.resolve(null)};
window.__resetInviteCard=()=>{inviteCardP=null};
async function shareLink(kind,auto,onBlocked){
  if(!crew){toast("Your crew is still loading. Try again in a moment.");return}
  if(!me){needMe("");return}
  const text=inviteText(kind), link=linkFrom(me);
  if(navigator.share){
    const blob=kind==="invite"&&(!$("incCard")||$("incCard").checked)?await inviteCard():null;
    const file=blob?new File([blob],"rate-my-year-report-card.png",{type:"image/png"}):null;
    const withPic=file&&navigator.canShare&&navigator.canShare({files:[file]});
    try{await navigator.share(withPic?{files:[file],text:`${text}\n${link}`}:{text:`${text}\n${link}`});recordShare(kind==="nudge"?"nudge":"invite");return}
    catch(x){if(x&&x.name==="AbortError")return;if(auto)return;if(onBlocked){onBlocked();const n=$("askNote");if(n){n.textContent="Your link is ready. Tap Send the link, or Copy link and paste it into a message.";n.className="muted"}return}}   // auto: the phone wanted a fresh tap, so leave it to the Send button
  }
  if(auto) return;
  recordShare(kind==="nudge"?"nudge":"invite");
  const u=`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`;
  if(!window.open(u,"_blank")) location.href=u;
}
async function copyLink(){
  if(!crew||!me) return;
  const v=linkFrom(me); let ok=false;
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(v);ok=true}}catch(e){}
  if(!ok){const t=document.createElement("textarea");t.value=v;t.setAttribute("readonly","");t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();try{ok=document.execCommand("copy")}catch(e){}t.remove()}
  toast(ok?"Link copied. Paste it into a text, WhatsApp or email.":v,ok?3500:9000);
  if(ok) recordShare("invite");
}
/* Make a small group from the review just done: you, plus the person you rated (if it wasn't you). */
/* No crew yet: saving sets up your crew of this type. The review on screen goes in first, then any other
   reviews of the same type kept on this device (people you rated before) are added and saved too. */
async function soloToCrew(){
  const myN=REVIEW_PAGE&&$("myName")?$("myName").value.trim().slice(0,40):"";
  const selfish=state.who==="me"||state.who==="partner", them=state.who==="me"?"":(state.name||"").trim().slice(0,40);
  if(!myN||!db||(!selfish&&!them)) return false;
  const set=activeSet();
  const g=await startQuickGroup(myN,them);
  const extras=Object.entries(state.drafts||{}).filter(([k,d])=>k.startsWith("o:")&&d&&d.name&&lc(d.name)!==lc(them)&&lc(d.name)!==lc(myN)
    &&Object.keys(d.v||{}).length&&setForType(["family","mate","partner"].includes(d.who)?d.who:"family")===set);
  if(extras.length){
    const keep={v:state.v,dk:state.dk,name:state.name,who:state.who,qset:state.qset};
    let ms=[...g.ms];
    for(const [,d] of extras){
      try{
        const tid=rid(10); ms=[...ms,{id:tid,name:d.name.trim().slice(0,40),type:g.mt}];
        await updateDoc(doc(db,"crews",g.id),{members:ms});
        state.v=d.v||{};state.dk=d.dk||{};state.who=d.who||keep.who;state.name=d.name;if(d.qset)state.qset=d.qset;else delete state.qset;render();
        if(!last||last.avg==null) continue;
        const r=snapshotResult(), boardKey=rid(16), b=writeBatch(db);
        b.set(doc(db,"crews",g.id,"reviews",`${user.uid}_${tid}`),{member:tid,reviewer:g.myId,reviewerUid:user.uid,...r,boardKey});
        b.set(doc(db,"crews",g.id,"board",tid),{by:{[boardKey]:{o:r.overall,self:false}}},{merge:true});
        await b.commit(); await markDone(g.id,g.myId,tid);
      }catch(x){console.warn("carry over",d.name,x)}
    }
    state.v=keep.v;state.dk=keep.dk;state.name=keep.name;state.who=keep.who;if(keep.qset)state.qset=keep.qset;else delete state.qset;save();render();
  }
  try{localStorage.setItem("rmy-last-type",{family:"family",mates:"mate",partner:"partner"}[g.type])}catch(e){}
  return g;
}
async function startQuickGroup(myName,themName){
  if(!auth||!db) throw Object.assign(new Error("Crews aren't connected yet"),{code:"no-config"});
  if(!auth.currentUser) await withTimeout(signInAnonymously(auth),15000,"Getting ready");
  user=auth.currentUser;
  const k=reviewKind(), type=k==="partner"?"partner":k==="mates"?"mates":"family", mt=CREW_TYPES[type].member;
  const rateSelf=state.who==="me"||state.who==="partner";
  const myId=rid(10), themId=rid(10), ms=[{id:myId,name:myName,type:mt}];
  if(themName) ms.push({id:themId,name:themName,type:mt});
  const targetId=rateSelf?myId:themId;
  const id=rid(10), r=snapshotResult(), boardKey=rid(16);
  const name=type==="partner"?(themName?`${myName} & ${themName}'s Check-in`:`${myName}'s Check-in`):`${myName}'s ${GROUP_WORD[type]}`;
  await setDoc(doc(db,"crews",id),{name,type,quick:true,showBoard:true,ownerUid:user.uid,ownerEmail:user.email||"",adminUids:[user.uid],joinCode:rid(8),members:ms,createdAt:Date.now()});
  afterOpen={id:targetId,fresh:false,quiet:true};
  try{await claimMember(id,myId,"")}catch(x){console.warn("claim",x)}
  try{
    const b=writeBatch(db);
    b.set(doc(db,"crews",id,"reviews",`${user.uid}_${targetId}`),{member:targetId,reviewer:myId,reviewerUid:user.uid,...r,boardKey});
    b.set(doc(db,"crews",id,"board",targetId),{by:{[boardKey]:{o:r.overall,self:targetId===myId}}},{merge:true});
    await b.commit(); await markDone(id,myId,targetId);
  }catch(x){console.warn("first review",x)}
  try{await rememberCrew(id,name)}catch(x){console.warn("remember",x)}
  return {id,name,myId,type,mt,ms};
}
/* Someone opened an invite link and hasn't said who they are yet: one friendly box instead of the crew tools. */
function paintWelcome(){
  const box=$("welcomeBox"); if(!box) return;
  const show=REVIEW_PAGE&&!!crew&&!me&&members().length>0;
  box.hidden=!show; if(show){$("meWrap").hidden=true;$("meNote").hidden=true;$("meField").classList.remove("attention")}
  if(!show){box.dataset.k="";return}
  const from=getFrom(crewId), fromM=members().find(m=>m.id===from)||members()[0], partner=crew.type==="partner";
  const free=members().filter(m=>m.id!==fromM.id&&!claims[m.id]);
  if(!box.dataset.shown){box.dataset.shown="1";setTimeout(()=>{if(!box.hidden)box.scrollIntoView({behavior:"auto",block:"start"})},350)}
  const key=JSON.stringify([fromM.id,fromM.name,partner,free.map(m=>m.id+m.name)]); if(box.dataset.k===key) return; box.dataset.k=key;
  const fn=esc(fromM.name);
  box.innerHTML=`<p class="wtitle">${partner?`<b>${fn}</b> wants your side of the Couple Check-in 💕`:`<b>${fn}</b> wants your honest take`}</p>
    <p class="muted">${partner?"Type your first name, then rate the relationship. It takes about 5 minutes, then you'll see how your views compare.":`Type your first name, then rate ${fn}. It takes about 5 minutes. After that you can rate yourself and see how you compare.`}</p>
    ${free.length?`<div class="row-btns">${free.map(m=>`<button type="button" class="ghost" data-iam="${m.id}">I'm ${esc(m.name)}</button>`).join("")}</div>`:""}
    <form class="wform" id="wForm" novalidate><input id="wName" autocomplete="given-name" maxlength="40" placeholder="Your first name" aria-label="Your first name"><button type="submit" id="wGo">Let's go</button></form>`;
  box.querySelectorAll("[data-iam]").forEach(b=>b.onclick=()=>welcomeGo(b.dataset.iam,"",fromM.id));
  $("wForm").addEventListener("submit",e=>{e.preventDefault();const n=$("wName").value.trim().slice(0,40);if(!n){famErr("Type your first name first.");$("wName").focus();return}welcomeGo("",n,fromM.id)});
}
async function welcomeGo(id,name,fromId){
  const go=$("wGo"); if(go) go.disabled=true; famErr("");
  try{
    if(!id){
      const hit=members().find(m=>m.name.trim().toLowerCase()===name.toLowerCase());
      if(hit) id=hit.id;
      else{id=rid(10);await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id,name,type:crew.type?crewMemberType():"family"}]})}
    }
    const first=crew.type==="partner"?id:(fromId&&fromId!==id&&isMember(fromId)?fromId:id);
    afterOpen={id:first,fresh:true,quiet:false};
    await claimMember(crewId,id,me);
  }catch(x){afterOpen=null;famErr(errText(x));if(go)go.disabled=false}
}
/* Your next steps, at the top of the crew box: rate yourself, who you're waiting on, invite more people. */
function paintNext(){
  const box=$("nextBox"); if(!box) return;
  const show=REVIEW_PAGE&&!!crew&&!!me; box.hidden=!show; if($("nextAdd")) $("nextAdd").hidden=!show;
  if(!show){box.dataset.k="";return}
  const partner=crew.type==="partner";
  const selfDone=reviews().some(r=>r.member===me&&byMe(r));
  const waiting=members().filter(m=>m.id!==me&&!claims[m.id]);
  const mine=boardOpen()&&boardById?boardScore(me):null, need=partner||!mine?0:Math.max(0,2-(mine.t||0));
  const guestOwner=isGuest()&&isOwner();
  const key=JSON.stringify([selfDone,waiting.map(m=>m.name),need,guestOwner,partner]); if(box.dataset.k===key) return; box.dataset.k=key;
  const rows=[];
  if(!selfDone) rows.push(`<div class="nrow"><span><b>Next:</b> ${partner?"add your side of the check-in.":"rate yourself, so you can see how you compare."}</span><button type="button" data-next="self">${partner?"Start":"Rate myself"}</button></div>`);
  else if(need) rows.push(`<div class="nrow"><span>🔒 Your crew score unlocks after <b>${need} more review${need===1?"":"s"}</b> of you.</span></div>`);
  if(partner&&!waiting.length&&members().length>=2) rows.push(`<div class="nrow"><span>${selfDone?"You've both had your say. Your report card shows how your views compare.":"Your partner is in. Add your side to compare."}</span>${selfDone?`<button type="button" class="ghost sm" data-next="self">See our report</button>`:""}</div>`);
  else rows.push(`<div class="nrow"><span>${waiting.length?`Waiting on <b>${waiting.map(m=>esc(m.name)).join(", ")}</b>`:partner?"Send your partner the link so they can add their side.":"The more people who rate you, the clearer the picture."}</span><span class="row-btns">${waiting.length?`<button type="button" class="ghost sm" data-next="nudge">Nudge</button>`:""}<button type="button" data-next="invite">${partner?"Send the link":waiting.length?"Invite more":"Invite people"}</button></span></div>`);
  rows.push(`<div class="nrow myres-wrap"><button type="button" class="ghost" data-results="${me}">${(crew&&crew.type==="partner"?(resultsOpen?"Hide Results":"Show Results"):(resultsOpen?"Hide My Results":"Show My Results"))}</button></div>`);
  const addRow=(`<form class="nrow addrate" id="addRate" novalidate><span><b>Rate someone who isn't here yet</b></span><span class="wform"><input id="addRateName" maxlength="40" autocomplete="off" placeholder="Their first name" aria-label="Their first name"><button type="submit" class="ghost">Add &amp; rate</button></span></form>`);
  $("nextAdd").innerHTML=partner?"":addRow; $("nextAdd").hidden=!show||partner;
  box.innerHTML=`${rows.join("")}${guestOwner?`<p class="keep" role="note"><span><b>Don't lose your crew.</b> It's only saved on this device, and clearing your browser or private browsing will lose it.</span><button type="button" class="linkbtn" data-next="keep">Keep it with Google</button></p>`:""}`;
  $("addRateName").addEventListener("input",paintDone);
  $("addRate").addEventListener("submit",async e=>{
    e.preventDefault();
    const n=$("addRateName").value.trim().slice(0,40); if(!n){$("addRateName").focus();return}
    const hit=members().find(m=>m.name.trim().toLowerCase()===n.toLowerCase());
    if(hit){if(hit.id===me){famErr("That's you. Tap Rate myself instead.");return}startReview(hit.id);return}
    try{const id=rid(10), next=[...members(),{id,name:n,type:crew.type?crewMemberType():"family"}];await updateDoc(doc(db,"crews",crewId),{members:next});crew={...crew,members:next};$("addRateName").value="";famErr("");startReview(id);toast(`${n} is added. Rate them, then send them the link so they can join in.`,5000)}
    catch(x){famErr(errText(x))}
  });
  box.querySelectorAll("[data-results]").forEach(b=>b.onclick=()=>{resultsOpen=!resultsOpen;placeResults()});
  placeResults();
  box.querySelectorAll("[data-next]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.next;
    if(a==="self") startReview(me);
    else if(a==="invite") shareLink("invite");
    else if(a==="nudge") shareLink("nudge");
    else if(a==="keep") googleSignIn();
  });
}

/* ---------- boot ---------- */
async function loadConfig(){
  if(window.RATEMYYEAR_FIREBASE_CONFIG&&window.RATEMYYEAR_FIREBASE_CONFIG.apiKey) return window.RATEMYYEAR_FIREBASE_CONFIG;
  try{const r=await fetch("/__/firebase/init.json");if(r.ok)return await r.json()}catch(e){}
  return null;
}
(async()=>{ try{
  status("Connecting…");
  const p=new URLSearchParams(location.search);
  if(p.get("crew")&&p.get("code")) invite={crew:p.get("crew"),code:p.get("code")};
  if(invite&&/^[a-z0-9]{4,40}$/i.test(p.get("from")||"")) inviteFrom=p.get("from");
  try{
    const [A,U,F]=await withTimeout(Promise.all(FB_URLS.map(u=>import(u))),15000,"Loading crews");
    ({initializeApp}=A); ({signInWithCredential,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,connectAuthEmulator,signInAnonymously,linkWithPopup}=U); ({getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,arrayUnion,arrayRemove,writeBatch,getDocs,limit}=F);
  }catch(x){console.warn("Firebase didn't load",x);body.innerHTML=`<p class="muted">Crews can't load right now (check your connection, or turn off content blockers for this site). You can still do a review on your own below.</p>`;render();return}
  const cfg=await loadConfig();
  if(!cfg){body.innerHTML=`<p class="muted">Crews aren't available right now. You can still do a review on your own below.</p>`;render();return}
  /* Sign-in start-up. Firebase normally keeps the signed-in person in IndexedDB, which can freeze in Safari
     on iPad so the sign-in check never answers. If nothing comes back within 6 seconds we switch to a backup
     that keeps sign-in in localStorage instead, and remember that for next time on this device. */
  const LS_AUTH="rmy-authmode";
  let authGen=0, gotAuth=false, authWatch=0;
  const useLocal=()=>{try{return localStorage.getItem(LS_AUTH)==="local"}catch(e){return false}};
  function startAuth(local){
    const gen=++authGen;
    const a=local?initializeApp(cfg,"rmy-local"):initializeApp(cfg);
    auth=initializeAuth(a,{persistence:local?[browserLocalPersistence,inMemoryPersistence]:[indexedDBLocalPersistence,browserLocalPersistence]});
    db=getFirestore(a);
    onAuthStateChanged(auth,u=>{if(gen!==authGen)return;gotAuth=true;clearTimeout(authWatch);onAuth(u)});
  }
  const local0=useLocal();
  startAuth(local0);
  if(REVIEW_PAGE&&LAND.get("go")==="join"&&!invite){entry="join";paintEntry()}
  if(LAND.get("who")||LAND.get("go")) history.replaceState(null,"",location.pathname);
  if(!local0) setTimeout(()=>{
    if(gotAuth) return;
    try{localStorage.setItem(LS_AUTH,"local")}catch(e){}
    status("Still connecting… switching to a backup sign-in");
    startAuth(true);
  },6000);
  if(p.get("emulator")==="1"){connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(db,"127.0.0.1",8080)}
  let wasRedirect=false;try{wasRedirect=sessionStorage.getItem("rmy-redirect")==="1";sessionStorage.removeItem("rmy-redirect")}catch(e){}
  if(wasRedirect) getRedirectResult(auth,browserPopupRedirectResolver).catch(()=>{});
  try{render()}catch(x){console.error(x)}
  if(JOIN) try{viewJoin()}catch(x){console.error(x)}
  authWatch=setTimeout(()=>{if(stillBusy()&&!gotAuth)showFatal({code:"sign-in check timed out. Check your connection, or turn off content blockers for this site"})},20000);
  async function onAuth(u){ try{ user=u; paintCreate();
    clearCrewSubs(); user=u; crew=null; crewId=""; target=null; myCrews=[];
    if(JOIN){
      if(!u){
        if(guestTried){viewSignedOut();return}
        guestTried=true; if(!$("jLink2")) viewJoin();
        try{await withTimeout(signInAnonymously(auth),15000,"Getting ready")}catch(x){guestFail(x,()=>location.reload())}
        return;
      }
      if(!$("jLink2")) status("Loading your crews…");
      try{const s=await withTimeout(getDoc(doc(db,"users",u.uid)),12000,"Loading your crews");myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[]}
      render(); if(!$("jLink2")||document.activeElement!==$("jLink2")) viewJoin(); return;
    }
    if(!u){
      render();
      if(invite&&!guestTried&&!ADMIN){
        guestTried=true;
        body.innerHTML=`<p class="muted">Joining the crew…</p>`;
        try{await withTimeout(signInAnonymously(auth),15000,"Joining the crew")}catch(x){guestFail(x,()=>location.reload())}
        return;
      }
      if(REVIEW_PAGE&&entry==="join"&&!landJoin){landJoin=true;return startJoin()}
      viewSignedOut();return;
    }
    status("Loading your crews…");
    let loadErr=null;
    try{const s=await withTimeout(getDoc(doc(db,"users",u.uid)),12000,"Loading your crews");myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[];loadErr=e}
    if(!u.isAnonymous&&u.email) setDoc(doc(db,"users",u.uid),{email:u.email,name:u.displayName||"",seenAt:Date.now()},{merge:true}).catch(()=>{});
    try{render()}catch(x){console.error(x)}
    if(loadErr&&loadErr.code!=="permission-denied"&&!myCrews.length){body.innerHTML=`<p class="err">Couldn't load your crews: ${esc(errText(loadErr))}</p><p class="muted">Check your connection and reload. If it keeps happening, send a screenshot of this message.</p><div class="row-btns"><button type="button" id="bootReload">Reload</button></div>`;$("bootReload").onclick=()=>location.reload();return}
    if(afterAuth){const f=afterAuth;afterAuth=null;return f()}
    if(invite&&!ADMIN) return joinCrew(invite);
    if(REVIEW_PAGE&&entry==="join"&&!landJoin){landJoin=true;return startJoin()}
    const lastCrew=loadLS();
    /* Picked Rate My Family / Mates / Couple Check-in? Only open a group of that type. With none, do a fresh
       review of that type; Invite Others To Rate You then makes a new group for it. */
    /* Open the crew for the type picked, or with none picked, the type you used last (so the highlight matches your latest review). */
    let lastType="";try{if(LAND.get("who")&&LAND.get("who")!=="me")localStorage.setItem("rmy-last-type",LAND.get("who"));lastType=localStorage.getItem("rmy-last-type")||""}catch(e){}
    const want=REVIEW_PAGE?{family:"family",mate:"mates",partner:"partner"}[LAND.get("who")||lastType]:"";
    if(want&&myCrews.length){
      const order=[...myCrews.filter(c=>c.id===lastCrew),...myCrews.filter(c=>c.id!==lastCrew)];
      for(const c of order){try{const d=await withTimeout(getDoc(doc(db,"crews",c.id)),8000,"Loading");if(d.exists()&&crewTypeOf(d.data().type)===want)return openCrew(c.id)}catch(e){}}
      return viewLobby();
    }
    if(lastCrew&&myCrews.some(c=>c.id===lastCrew)) openCrew(lastCrew);
    else if(myCrews.length===1) openCrew(myCrews[0].id);
    else viewLobby();
  }catch(x){console.error(x);showFatal(x)} }
}catch(x){console.error(x);showFatal(x)} })();

