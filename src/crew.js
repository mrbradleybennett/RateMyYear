/* ---------- Review Crew on Firebase (Google sign-in + Firestore) ---------- */
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {signInWithCredential,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,inMemoryPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,connectAuthEmulator,signInAnonymously,linkWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,arrayUnion,arrayRemove,writeBatch,getDocs,limit} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $=id=>document.getElementById(id);
const body=$("famBody"), title=$("famTitle"), leaveBtn=$("famLeave");
const banner=$("reviewBanner"), bannerText=$("reviewBannerText"), saveBtn=$("famSave"), soloBtn=$("soloSave");
const pick=$("famPick"), pickHint=$("famPickHint"), nameInput=$("name"), revCount=$("revCount");
const LS_CREW="ratemyyear-crew";
const PAGE=window.RMY_PAGE||"review";
const ADMIN=PAGE==="admin";                       // My Crew page
const JOIN=PAGE==="join";                         // Join A Crew page
const HOME_PATH=location.pathname.replace(/[^/]*$/,"");      // the landing page
const REVIEW_PATH=HOME_PATH+"review.html";
const MYCREW_PATH=HOME_PATH+"mycrew.html";
const JOIN_PATH=HOME_PATH+"join.html";
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

let auth=null, db=null, user=null;
let crewId="", crew=null, claims={}, reviewsById={}, unsubs=[], revUnsubs=[], revKey="";
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
const crewMemberType=()=>crew&&crew.type==="mates"?"mate":"family";
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
  return `Something went wrong. Try again in a moment.${c?` (${c})`:(x&&x.message?` (${String(x.message).slice(0,120)})`:"")}`;
};
/* Boot status and safety nets: the crew box never sits on a loading message forever. */
const BUSY=/^(Loading|Connecting|Signing you in|Loading your crews|Getting ready|Joining the crew)/;
const status=m=>{body.innerHTML=`<p class="muted">${m}</p>`};
const stillBusy=()=>BUSY.test(body.textContent.trim());
function showFatal(x){
  if(!stillBusy()) return;
  body.innerHTML=`<p class="err">The crew tools hit a problem while loading${x?`: ${esc(x.code||x.message||String(x)).slice(0,200)}`:""}.</p><p class="muted">Reload the page to try again. If it keeps happening, send a screenshot of this message.</p><div class="row-btns"><button type="button" id="bootReload">Reload</button></div>`;
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
  b.set(doc(db,"crews",cid,"accounts",user.uid),{member:memberId});
  b.set(doc(db,"crews",cid,"claims",memberId),{uid:user.uid,at:Date.now()});
  await b.commit();
}
const loadLS=()=>{try{return localStorage.getItem(LS_CREW)||""}catch(e){return ""}};
const saveLS=v=>{try{v?localStorage.setItem(LS_CREW,v):localStorage.removeItem(LS_CREW)}catch(e){}};
let crewNoteT=0;
function crewNote(html,warn){const el=$("crewNote");if(!el)return;el.innerHTML=html;el.className="crewnote"+(warn?" warn":"");el.hidden=false;clearTimeout(crewNoteT);crewNoteT=setTimeout(()=>{el.hidden=true},9000)}
function meErr(m){const el=$("meErr");if(!el)return famErr(m);el.textContent=m;el.hidden=!m;if(m)setTimeout(()=>{if(el.textContent===m)el.hidden=true},12000)}
function famErr(m){const el=$("famErr");if(!el)return;el.textContent=m;el.hidden=!m}
const toast=(m,ms=3500)=>{$("toast").textContent=m;setTimeout(()=>{if($("toast").textContent===m)$("toast").textContent=""},ms)};

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
  const r=ranked(a.main,CATS), bottom=r.slice(Math.max(3,r.length-3)).reverse();
  const who=a.rs.map(x=>x.reviewer===id?"themselves":esc(memberName(x.reviewer)));
  const gap=c=>a.sa&&a.fa&&a.sa[c.id]!=null&&a.fa[c.id]!=null?(a.sa[c.id]-a.fa[c.id]):null;
  let html=`<div class="results">
    <h3>${name} · ${grade(a.overall)} overall (${a.overall.toFixed(1)})</h3>
    <p class="count">${peopleLine(a.rs.length)}${a.self?" (including a self review)":""}</p>
    <p class="muted">${S.label} questions</p>
    <div class="glines">${groupLine(a.main,S.groups)}</div>
    <p class="muted">Reviewed by ${who.join(", ")}.</p>
    <div class="rtable-wrap"><table class="rtable">
      <thead><tr><th>Area</th><th>Self</th><th>Crew</th>${detailed?"<th>Gap</th>":""}</tr></thead>
      <tbody>${CATS.map(c=>{const g=gap(c);return `<tr><td><b>${c.name}</b></td><td class="n">${dot(a.sa?a.sa[c.id]:null)}</td><td class="n">${dot(a.fa?a.fa[c.id]:null)}</td>${detailed?`<td class="n">${g==null?"–":(g>0?"+":"")+g.toFixed(1)}</td>`:""}</tr>`}).join("")}</tbody>
    </table></div>`;
  if(detailed){
    html+=`<p class="muted">Gap is self score minus crew score. A big plus means ${name} rates themselves higher than the crew does. Question scores only appear where reviewers answered that question. Don't know answers are left out.</p>
    <div class="rtable-wrap"><table class="rtable">
      <thead><tr><th>Question</th><th>Self</th><th>Crew</th></tr></thead>
      <tbody>${CATS.map(c=>`<tr class="qcat"><td colspan="3">${c.name}</td></tr><tr><td><i>Quick: ${esc(fillThey(c.line))}</i></td><td class="n">${a.qSelf&&a.qSelf[c.id+"t"]!=null?a.qSelf[c.id+"t"]:"–"}</td><td class="n">${a.qFam&&a.qFam[c.id+"t"]!=null?a.qFam[c.id+"t"].toFixed(1):"–"}</td></tr>`+c.qs.map((q,i)=>`<tr><td>${esc(fillThey(q[0]))}</td><td class="n">${a.qSelf&&a.qSelf[c.id+i]!=null?a.qSelf[c.id+i]:"–"}</td><td class="n">${a.qFam&&a.qFam[c.id+i]!=null?a.qFam[c.id+i].toFixed(1):"–"}</td></tr>`).join("")).join("")}</tbody>
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
    if(c==="auth/unauthorized-domain") return famErr(`Google sign-in isn't allowed on ${location.hostname} yet. In Firebase → Authentication → Settings → Authorized domains, add ${location.hostname}.`);
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
    <p class="muted">Sign in with Google to set up your crew and manage it. You'll be the crew admin: you add the people, send the invite link, and see everyone's reports. Your crew don't need to sign in at all.</p>
    <div><button type="button" class="gbtn" id="gSignIn">${GOOGLE_SVG}Sign in with Google</button></div>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`:`<div class="stack">
    <p class="muted">A crew is your family, your mates, or both. To join yours, tap <b>Join A Crew</b>, search for its name and enter the crew password (or just open the invite link). Want to start your own? Tap <a href="${MYCREW_PATH}">Create My Crew</a>. You can also do a review on your own below.</p>
    <div><a class="topbtn" href="${JOIN_PATH}">Join A Crew</a></div>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  if($("gSignIn")) $("gSignIn").onclick=googleSignIn;
}

function viewLobby(msg=""){
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
      <div class="field"><label for="cName">Crew name</label><input id="cName" autocomplete="off" placeholder="e.g. Bennetts or Friday Footy"></div>
      <div class="field"><label for="cType">Review type</label><select id="cType"><option value="family">Family Review: see how well your family is functioning</option><option value="mates">Mate Review: a leaderboard of your top mates</option></select></div>
      <div class="field"><label for="cMe">Your name</label><input id="cMe" autocomplete="off" value="${esc((user.displayName||"").split(" ")[0])}"></div>
      <div class="field"><label for="cPw">Crew password</label><input id="cPw" type="text" autocomplete="off" placeholder="At least 6 characters"></div>
      <p class="muted" style="grid-column:1/-1">Your crew search for the crew name and enter this password to join. The name must be unique, so if it's taken, add your suburb or surname (e.g. Bennetts Melbourne).</p>
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
  else{$("joinForm").hidden=true;$("createForm").hidden=true;$("createGuest").hidden=true;const n=document.createElement("div");n.className="stack";n.innerHTML=`<div><a class="topbtn" href="${JOIN_PATH}">Join A Crew</a></div><p class="muted">To set up a new crew, tap <a href="${MYCREW_PATH}">Create My Crew</a> at the top.</p>`;$("joinForm").after(n)}
  $("joinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inv=parseInvite($("jLink").value);
    if(!inv) return famErr("That doesn't look like an invite link. Ask your crew admin to send it again.");
    $("joinGo").disabled=true; await joinCrew(inv); const b=$("joinGo"); if(b) b.disabled=false;
  });
  $("createForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=$("cName").value.trim().slice(0,60), myName=$("cMe").value.trim().slice(0,40), pw=$("cPw").value, slug=slugify(name);
    if(!slug) return famErr("Give your crew a name using letters or numbers.");
    if(!myName) return famErr("Enter your name so the crew knows who you are.");
    if(pw.length<6) return famErr("Use a crew password of at least 6 characters.");
    $("createGo").disabled=true;
    try{
      if((await getDoc(doc(db,"crewNames",slug))).exists()){$("createGo").disabled=false;return famErr(`"${name}" is already taken. Try adding your suburb or surname, e.g. ${name} Melbourne.`)}
      const id=rid(10), myId=rid(10), b=writeBatch(db);
      const ctype=$("cType").value==="mates"?"mates":"family";
      b.set(doc(db,"crews",id),{name,slug,type:ctype,showBoard:true,passHash:passHash(slug,pw),ownerUid:user.uid,adminUids:[user.uid],joinCode:rid(8),members:[{id:myId,name:myName,type:ctype==="mates"?"mate":"family"}],createdAt:Date.now()});
      b.set(doc(db,"crewNames",slug),{crewId:id,name,slug});
      await b.commit();
      await claimMember(id,myId,"");
      await rememberCrew(id,name);
      openCrew(id);
    }catch(x){famErr(x&&x.code==="permission-denied"?`"${name}" is already taken. Try another name.`:errText(x));const b=$("createGo");if(b)b.disabled=false}
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

/* ---------- Join A Crew: search by name, then the crew password ---------- */
function guestFail(x,retry){
  const c=x&&x.code||"";
  const msg=c==="auth/operation-not-allowed"||c==="auth/admin-restricted-operation"?"Joining isn't switched on yet. The site owner needs to turn on Anonymous sign-in in Firebase (Authentication → Sign-in method)."
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
    <p class="muted">Search for your crew by name, pick it, then enter the crew password your crew admin gave you.</p>
    <div class="field"><label for="jq">Crew name</label><input id="jq" type="search" autocomplete="off" placeholder="e.g. Bennetts" enterkeyhint="search"></div>
    <div class="jres" id="jres" aria-live="polite"></div>
    <form class="form" id="jpass" novalidate hidden>
      <p class="jpick" id="jpick" style="grid-column:1/-1"></p>
      <div class="field"><label for="jpw">Crew password</label><input id="jpw" type="password" autocomplete="off"></div>
      <button type="submit" id="jgo">Join crew</button>
    </form>
    <p class="muted">Got an invite link instead? Just open it and you'll go straight in.</p>
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
      const snap=await getDocs(query(collection(db,"crewNames"),where("slug",">=",q),where("slug","<=",q+"\uf8ff"),limit(10)));
      if(my!==seq) return;
      const hits=snap.docs.map(d=>d.data());
      res.innerHTML=hits.length?hits.map(h=>`<button type="button" class="jhit" data-id="${esc(h.crewId)}" data-slug="${esc(h.slug)}" data-name="${esc(h.name)}">${esc(h.name)}</button>`).join(""):`<p class="muted">No crew found with that name. Check the spelling with your crew admin. If the crew was set up before crew passwords existed, the admin needs to add a crew password on their My Crew page first.</p>`;
      res.querySelectorAll(".jhit").forEach(b=>b.onclick=()=>{
        pickId=b.dataset.id; pickSlug=b.dataset.slug; pickName=b.dataset.name;
        res.querySelectorAll(".jhit").forEach(x=>x.classList.toggle("on",x===b));
        $("jpick").innerHTML=`Joining <b>${esc(pickName)}</b>`; $("jpass").hidden=false; famErr(""); $("jpw").value=""; $("jpw").focus();
      });
    }catch(x){
      if(my!==seq) return;
      const msg=x&&x.code==="permission-denied"?"Crew search isn't switched on yet. The site owner needs to publish the latest security rules in Firebase.":x&&x.code==="failed-precondition"?"Crew search needs a moment to finish setting up. Try again shortly.":errText(x);
      res.innerHTML=`<p class="err">${esc(msg)}</p>`;
    }
  };
  $("jq").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(search,250)});
  $("jq").focus();
  if($("jback")) $("jback").onclick=()=>{if(JOIN){location.href=REVIEW_PATH;return}const last=loadLS();openCrew(myCrews.some(c=>c.id===last)?last:myCrews[0].id)};
  $("jpass").addEventListener("submit",async e=>{
    e.preventDefault();
    const pw=$("jpw").value; if(!pickId) return; if(!pw) return famErr("Enter the crew password.");
    $("jgo").disabled=true;
    try{
      await setDoc(doc(db,"crews",pickId,"joins",user.uid),{pass:passHash(pickSlug,pw),name:user.displayName||"",at:Date.now()});
      try{await rememberCrew(pickId,pickName)}catch(e){}
      if(JOIN){saveLS(pickId);body.innerHTML=`<p class="muted">You're in! Opening ${esc(pickName)}…</p>`;location.href=REVIEW_PATH;return}
      openCrew(pickId);
    }catch(x){famErr(x&&x.code==="permission-denied"?"That password isn't right. Check it with your crew admin.":errText(x));$("jgo").disabled=false}
  });
}

async function joinCrew(inv){
  body.innerHTML=`<p class="muted">Opening your crew…</p>`;
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
  crewId=id; crew=null; claims={}; reviewsById={}; me=""; target=null;
  saveLS(id);
  viewCrewShell();
  unsubs.push(onSnapshot(doc(db,"crews",id),s=>{
    if(!s.exists()){leaveLocal("That crew no longer exists.");return}
    crew=s.data(); syncReviewSubs(); syncBoardSub(); refresh();
  },x=>{leaveLocal(x&&x.code==="permission-denied"?"You're no longer in that crew.":errText(x))}));
  boardById={}; boardSubOn=false;
  let myMember="";
  const pickMe=()=>{me=myMember&&isMember(myMember)?myMember:"";syncReviewSubs();refresh()};
  unsubs.push(onSnapshot(doc(db,"crews",id,"accounts",user.uid),s=>{
    myMember=s.exists()?(s.data().member||""):""; pickMe();
  },()=>{}));
  unsubs.push(onSnapshot(collection(db,"crews",id,"claims"),s=>{
    claims={}; s.docs.forEach(d=>claims[d.id]=d.data().uid);
    if(!myMember){const old=Object.keys(claims).find(k=>claims[k]===user.uid);if(old)myMember=old}
    pickMe();
  },()=>{}));
}
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
  if(leaveBtn.dataset.armed!=="1"){leaveBtn.dataset.armed="1";leaveBtn.textContent="Tap again to leave";setTimeout(()=>{leaveBtn.dataset.armed="";leaveBtn.textContent="Leave crew"},3000);return}
  leaveBtn.dataset.armed="";leaveBtn.textContent="Leave crew";
  const id=crewId;
  try{
    if(me) await deleteDoc(doc(db,"crews",id,"claims",me));
    if(!isOwner()){
      if(isAdmin()) await updateDoc(doc(db,"crews",id),{adminUids:arrayRemove(user.uid)});
      await deleteDoc(doc(db,"crews",id,"joins",user.uid));
    }
    await forgetCrew(id);
  }catch(x){}
  leaveLocal(isOwner()?"You've left the crew view. As the owner you can open it again from Your crews.":"");
};

function viewCrewShell(){
  leaveBtn.hidden=ADMIN;
  body.innerHTML=`<div class="stack">
    ${whoRow(myCrews.length>1?`<select id="crewSwitch" aria-label="Switch crew">${myCrews.map(c=>`<option value="${esc(c.id)}"${c.id===crewId?" selected":""}>${esc(c.name)}</option>`).join("")}<option value="__lobby">Join or set up another crew…</option></select>`:`<button type="button" class="ghost sm" id="toLobby">Other crews</button>`)}
    <p class="menote" id="notAdmin" hidden>Only the crew admin can manage this crew. <a href="${REVIEW_PATH}">Go to the reviews</a> to review your crew.</p>
    <p class="adminlink" id="toMyCrew" hidden>You're the crew admin. <a href="${MYCREW_PATH}">Open My Crew</a> to add people, send the invite link and see all the reports.</p>
    <p class="menote" id="meNote" hidden></p>
    <p class="crewnote" id="crewNote" hidden></p>
    <div class="form" id="meWrap">
      <div class="field" id="meField"><label for="meSel">I am</label><select id="meSel"></select><p class="err" id="meErr" hidden></p><small class="muted">Picked the wrong name? Just choose the right one here.</small></div>
    </div>
    <form class="form" id="addMeForm" novalidate hidden>
      <div class="field"><label for="addMeName">Your name</label><input id="addMeName" autocomplete="off" placeholder="e.g. Dave"></div>
      <div class="field" id="addMeTypeF"><label for="addMeType">You are</label><select id="addMeType"><option value="family">Family</option><option value="mate">A mate</option></select></div>
      <button type="submit">Add me</button>
    </form>
    <div class="typebox" id="typeBox" hidden></div>
    <label class="typebox boardtoggle" id="boardToggle" hidden><span><input type="checkbox" id="boardOn"> <b>Make leaderboard visible</b></span><span class="muted">On by default: everyone in the crew sees the leaderboard. Untick it to blur the scores out for the crew. You can always see them here under All scores.</span></label>
    <h3 class="board-h" id="boardTitle" hidden>Who are you reviewing?</h3>
    <div class="crewscore" id="crewScore" hidden></div>
    <p class="muted" id="boardNote" hidden></p>
    <div class="members" id="memList"></div>
    <form class="form" id="addForm" novalidate>
      <div class="field"><label for="newMem">Add someone to the crew</label><input id="newMem" autocomplete="off" placeholder="e.g. Nikki or Dave"></div>
      <div class="field" id="newTypeF"><label for="newType">They are</label><select id="newType"><option value="family">Family</option><option value="mate">A mate</option></select></div>
      <button type="submit" class="ghost">Add to crew</button>
    </form>
    <div class="invite" id="passBox" hidden></div>
    <div class="invite" id="inviteBox" hidden>
      <label for="inviteLink">Invite link: send this to your crew so they can join</label>
      <div class="invite-row"><input id="inviteLink" readonly><button type="button" id="shareInvite" hidden>Share</button><button type="button" id="copyInvite">Copy</button><button type="button" class="ghost" id="newInvite">New link</button></div>
      <p class="muted">Tap <b>Share</b> to send it by text, WhatsApp or email, or <b>Copy</b> to paste it yourself. Anyone who opens it goes straight into the crew without signing in, picks their name and starts reviewing. "New link" stops the old one working.</p>
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
    if(members().some(m=>m.name.toLowerCase()===n.toLowerCase())) return famErr(`${n} is already on the list. Pick it under "I am".`);
    try{const id=rid(10);await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id,name:n,type:crew.type?crewMemberType():$("addMeType").value}]});await claimMember(crewId,id,me);$("addMeForm").hidden=true;$("addMeName").value="";famErr("");$("meNote").hidden=true;$("meField").classList.remove("attention");if(pending){const pid=pending;pending="";setTimeout(()=>startReview(pid),300)}}
    catch(x){famErr(errText(x))}
  });
  if($("toLobby")) $("toLobby").onclick=()=>{clearCrewSubs();crewId="";crew=null;saveLS("");target=null;render();viewLobby()};
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
    }catch(x){meErr(x&&x.code==="permission-denied"?"Couldn't switch to that name. The crew admin needs to publish the latest security rules in Firebase, which let the same name be used on more than one device.":errText(x));refresh()}
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
  $("newInvite").onclick=async()=>{try{await updateDoc(doc(db,"crews",crewId),{joinCode:rid(8)});toast("New invite link made. The old one no longer works.")}catch(x){famErr(errText(x))}};
  document.querySelectorAll("#adminArea [data-tab]").forEach(b=>b.onclick=()=>{adminTab=b.dataset.tab;renderAdmin()});
}

/* ---------- admin: crew name + password ---------- */
let passBoxKey="";
function renderPassBox(){
  const box=$("passBox"), key=`${crew.slug||""}|${!!crew.passHash}|${crew.name}`;
  if(key===passBoxKey&&box.innerHTML) return; passBoxKey=key;
  const has=!!(crew.slug&&crew.passHash);
  box.innerHTML=has?`<label>Joining with the crew name and password</label>
      <p class="muted">Your crew tap <b>Join A Crew</b>, search for <b>${esc(crew.name)}</b> and enter the crew password.</p>
      <form class="invite-row" id="pwForm" novalidate><input id="pwNew" type="text" autocomplete="off" placeholder="New crew password (at least 6 characters)"><button type="submit">Change password</button></form>`
    :`<label>Let your crew find you</label>
      <p class="muted">Choose a unique crew name and a password. Your crew tap <b>Join A Crew</b>, search for the name and enter the password.</p>
      <form class="form" id="pwForm" novalidate>
        <div class="field"><label for="pwName">Crew name</label><input id="pwName" autocomplete="off" value="${esc(crew.name)}"></div>
        <div class="field"><label for="pwNew">Crew password</label><input id="pwNew" type="text" autocomplete="off" placeholder="At least 6 characters"></div>
        <button type="submit">Save</button>
      </form>`;
  $("pwForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const pw=$("pwNew").value; if(pw.length<6) return famErr("Use a crew password of at least 6 characters.");
    try{
      if(has){await updateDoc(doc(db,"crews",crewId),{passHash:passHash(crew.slug,pw)});$("pwNew").value="";toast("Crew password changed. Let your crew know the new one.")}
      else{
        const name=$("pwName").value.trim().slice(0,60), slug=slugify(name);
        if(!slug) return famErr("Give your crew a name using letters or numbers.");
        if((await getDoc(doc(db,"crewNames",slug))).exists()) return famErr(`"${name}" is already taken. Try adding your suburb or surname.`);
        const b=writeBatch(db);
        b.update(doc(db,"crews",crewId),{name,slug,passHash:passHash(slug,pw)});
        b.set(doc(db,"crewNames",slug),{crewId,name,slug});
        await b.commit(); passBoxKey=""; toast("Saved. Your crew can now find you with Join A Crew.");
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
  const row=(act,label,desc,danger)=>`<div class="mrow"><button type="button" class="${danger?"danger":"ghost"} sm" data-act="${act}" data-id="${m.id}">${arm(act+":"+m.id)?"Tap again to confirm":label}</button><span>${desc}</span></div>`;
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
  if((act==="reset"||act==="delete")&&removeArmed!==act+":"+id){
    removeArmed=act+":"+id;refresh();
    setTimeout(()=>{if(removeArmed===act+":"+id){removeArmed="";refresh()}},4000);return;
  }
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
  const others=es.filter(e=>!e.self), use=others.length?others:es;
  return {v:use.length?mean(use.map(e=>e.o)):null,n:use.length};
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
function renderBoard(){
  const sec=$("boardSec"); if(sec) sec.hidden=true; return;
  if(ADMIN||!crew){sec.hidden=true;return}
  sec.hidden=false;
  const ms=members(), open=boardOpen(), mates=crew.type==="mates";
  $("boardSub").textContent=mates?"Who's the best bloke in your crew? Ranked by what the rest of the crew thinks.":"Ranked by what the rest of the crew thinks.";
  const wrap=$("boardWrap"), lock=$("boardLock"), list=$("boardList");
  if(!open){
    const fake=["A","B+","B","C+","C","D"];
    list.innerHTML=(ms.length?ms:[{name:"Crew member"},{name:"Crew member"},{name:"Crew member"}]).map((m,i)=>`<div class="member board-row" style="--g:${gcol(fake[i%fake.length])}"><span class="rank">${i+1}</span><span class="chip">${fake[i%fake.length]}</span><span class="nm">${"●".repeat(4+(i*3)%5)}<small>${(9.1-i*0.7).toFixed(1)} / 10</small></span><span class="btns"></span></div>`).join("");
    wrap.classList.add("locked"); lock.hidden=false;
    lock.innerHTML=`<b>Leaderboard locked</b><span>${isAdmin()?`You're the crew admin. Switch it on in <a href="${MYCREW_PATH}">My Crew</a> to show everyone the rankings.`:"The crew admin hasn't switched on the leaderboard yet."}</span>`;
    return;
  }
  wrap.classList.remove("locked"); lock.hidden=true;
  if(boardById===null){list.innerHTML=`<p class="muted">The leaderboard can't load yet. The crew admin needs to publish the latest security rules.</p>`;return}
  const rows=ms.map(m=>({m,b:boardScore(m.id)})).sort((x,y)=>(y.b.v??-1)-(x.b.v??-1)||x.m.name.localeCompare(y.m.name));
  list.innerHTML=rows.map(({m,b},i)=>{const g=b.v==null?null:grade(b.v);
    return `<div class="member board-row"${g?` style="--g:${gcol(g)}"`:""}><span class="rank">${b.v==null?"–":i+1}</span><span class="chip${g?"":" none"}">${g||"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?" (you)":""}<small>${b.v==null?"Not reviewed yet":`${b.v.toFixed(1)} / 10 · ${b.n} review${b.n===1?"":"s"}`}</small></span>
      <span class="btns"><button type="button" class="ghost" data-review2="${m.id}">${m.id===me?"Review myself":"Review"}</button></span></div>`}).join("");
  list.querySelectorAll("[data-review2]").forEach(b=>b.onclick=()=>startReview(b.dataset.review2));
}

function refresh(){
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
  const tbx=$("typeBox"); tbx.hidden=!(ADMIN&&admin);
  const tkey=`${crew.type||""}|${typeArmed}`;
  if(!tbx.hidden&&tbx.dataset.k!==tkey){
    tbx.dataset.k=tkey;
    const setType=async t=>{try{await updateDoc(doc(db,"crews",crewId),{type:t,members:members().map(m=>({...m,type:t==="mates"?"mate":"family"}))});typeArmed="";toast(`Switched to ${t==="mates"?"Mate":"Family"} Review.`)}catch(x){famErr(errText(x))}};
    if(!crew.type){
      tbx.innerHTML=`<p><b>Is this a Family crew or a Mates crew?</b> Family crews answer the family questions. Mates crews answer the mates questions. If you change review type later, everyone is asked a different set of questions and existing reviews won't carry across.</p><div class="row-btns"><button type="button" data-ctype="family">Family crew</button><button type="button" data-ctype="mates">Mates crew</button></div>`;
      tbx.querySelectorAll("[data-ctype]").forEach(b=>b.onclick=()=>setType(b.dataset.ctype));
    }else{
      const other=crew.type==="mates"?"family":"mates", On=other==="mates"?"Mates":"Family";
      tbx.innerHTML=`<p><b>Review type: ${crew.type==="mates"?"Mate Review":"Family Review"}</b>. Everyone is rated on the ${crew.type==="mates"?"mates":"family"} questions.</p><p class="muted">If you move to a different review type, your crew will be asked a different sort of questions and existing reviews won't come across. They're kept, and count again if you switch back.</p>`+
        (typeArmed?`<p class="err">Switch to ${On==="Mates"?"Mate":"Family"} Review? Your crew will be asked the ${other} questions and existing reviews won't come across. Everyone needs to review again.</p><div class="row-btns"><button type="button" id="typeYes">Yes, switch to ${On==="Mates"?"Mate":"Family"} Review</button><button type="button" class="ghost" id="typeNo">Cancel</button></div>`
          :`<div class="row-btns"><button type="button" class="ghost sm" id="typeSwitch">Switch to ${On==="Mates"?"Mate":"Family"} Review</button></div>`);
      if($("typeSwitch")) $("typeSwitch").onclick=()=>{typeArmed=other;refresh()};
      if($("typeNo")) $("typeNo").onclick=()=>{typeArmed="";refresh()};
      if($("typeYes")) $("typeYes").onclick=()=>setType(other);
    }
  }
  if(tbx.hidden){tbx.innerHTML="";tbx.dataset.k=""}
  $("boardTitle").hidden=ADMIN;
  const bt=$("boardToggle"); bt.hidden=!(ADMIN&&admin);
  if(!bt.hidden){$("boardOn").checked=crew.showBoard!==false;$("boardOn").onchange=async e=>{try{await updateDoc(doc(db,"crews",crewId),{showBoard:e.target.checked});toast(e.target.checked?"Leaderboard switched on for the crew.":"Leaderboard hidden from the crew.")}catch(x){e.target.checked=!e.target.checked;famErr(errText(x))}}}
  renderBoard();
  renderResetAll(ADMIN&&admin);
  const tb=document.getElementById("choiceCreate"); if(tb&&!ADMIN) tb.textContent=admin?"My Crew":"Create A Crew";
  $("meSel").innerHTML=`<option value="">Choose your name…</option>`+ms.map(m=>`<option value="${m.id}"${m.id===me?" selected":""}${taken(m.id)?" disabled":""}>${esc(m.name)}${taken(m.id)?" (taken)":""}</option>`).join("")+`<option value="__new">I'm not on the list. Add me</option>`;
  if(me||ADMIN){$("meNote").hidden=true;$("meField").classList.remove("attention")}
  else if(ms.length&&$("meNote").hidden){$("meNote").textContent="Welcome! Pick your name under \"I am\" to get started.";$("meNote").hidden=false;$("meField").classList.add("attention")}
  const doneIds=new Set(reviews().filter(r=>r.reviewerUid===user.uid||(me&&r.reviewer===me)).map(r=>r.member));
  const todo=ms.filter(m=>!doneIds.has(m.id)), done=ms.filter(m=>doneIds.has(m.id));
  const open=boardOpen();
  $("boardTitle").textContent=ADMIN?"":"Crew leaderboard";
  $("boardNote").hidden=ADMIN||!ms.length;
  if(!$("boardNote").hidden) $("boardNote").innerHTML=(me?(todo.length?`You've reviewed ${done.length} of ${ms.length}. Still to review: <b>${todo.map(m=>esc(m.id===me?"yourself":m.name)).join(", ")}</b>`:"✓ You've reviewed everyone in the crew. Nice work."):"Pick your name under <b>I am</b>, then tap <b>Review</b> next to someone.")+(open?"":` <span class="lockline">Scores are hidden: the crew admin has turned the leaderboard off.</span>`);
  const fake=["A","B+","B","C+","C","D"];
  const ranked=ms.map(m=>({m,b:open&&boardById?boardScore(m.id):{v:null,n:0}})).sort((x,y)=>(y.b.v??-1)-(x.b.v??-1)||x.m.name.localeCompare(y.m.name));
  /* Crew score: the average of everyone's leaderboard score (people with at least one review). */
  const scored=ranked.filter(x=>x.b.v!=null), cs=$("crewScore");
  cs.hidden=ADMIN||!ms.length;
  if(!cs.hidden){
    const v=scored.length?mean(scored.map(x=>x.b.v)):null, g=v==null?null:grade(v);
    cs.style.setProperty("--g",open&&g?gcol(g):open?"var(--track)":gcol("B"));
    cs.innerHTML=`<span class="cs-chip${open?"":" blurred"}">${open?(g||"–"):"B"}</span><span class="cs-txt"><b>Crew score</b><span class="cs-num${open?"":" blurred"}">${open?(v==null?"–":v.toFixed(1)+" / 10"):"7.4 / 10"}</span><small>${open?(v==null?"Shows once people have been reviewed":`Average of ${scored.length} of ${ms.length} people`):"Hidden: the crew admin has turned the leaderboard off"}</small></span>`;
  }
  $("memList").innerHTML=!ADMIN&&ms.length?ranked.map(({m,b},i)=>{
    const mine=doneIds.has(m.id), g=b.v==null?null:grade(b.v), fg=fake[i%fake.length];
    const rank=open?(b.v==null?"–":i+1):"#", chip=open?`<span class="chip${g?"":" none"}">${g||"–"}</span>`:`<span class="chip blurred">${fg}</span>`;
    const score=open?(b.v==null?"Not reviewed yet":`${b.v.toFixed(1)} / 10 · ${b.n} review${b.n===1?"":"s"}`):`<span class="blurred">${(9.1-i*0.7).toFixed(1)} / 10</span>`;
    const nScored=ranked.filter(x=>x.b.v!=null).length, mates=crew.type==="mates";
    const award=open&&i===0&&b.v!=null&&nScored>=2;
    const bottom=open&&b.v!=null&&nScored>=3&&i===nScored-1;
    return `<div class="member board-row${mine?" done":""}${award?" best":""}"${open&&g?` style="--g:${gcol(g)}"`:!open?` style="--g:${gcol(fg)}"`:""}>
      <span class="rank">${rank}</span>${chip}
      <span class="nm">${esc(m.name)}${m.id===me?" (you)":""}${award?` <span class="award">🏆 ${mates?"Best Bloke Award":"Holding You All Together Award"}</span>`:""}${bottom?` <span class="award low">${mates?"⚠️ Put On Notice":"🤝 Needs Some Family Support"}</span>`:""}<small>${score} <span class="rstat${mine?" ok":""}">${mine?"✓ Reviewed":"To do"}</span></small></span>
      <span class="btns">
        <button type="button" data-review="${m.id}">${m.id===me?"Review myself":"Review"}</button>
        ${m.id===me?`<button type="button" class="ghost" data-results="${m.id}"${aggFor(m.id).rs.length?"":" disabled"}>My results</button>`:""}
      </span></div>`}).join("")
    :ms.length?ms.map(m=>{
    const a=aggFor(m.id), g=a.overall!=null?grade(a.overall):null;
    const mine=reviews().some(r=>r.member===m.id&&(r.reviewerUid===user.uid||(me&&r.reviewer===me)));
    const canSee=ADMIN?admin:m.id===me;
    const joined=!!claims[m.id], isAdm=joined&&crew.adminUids.includes(claims[m.id]);
    return `<div class="member"${g&&canSee?` style="--g:${gcol(g)}"`:""}>
      <span class="chip${g&&canSee?"":" none"}">${g&&canSee?g:"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?" (you)":""}<small>${memberType(m.id)==="mate"?"Mate":"Family"}${joined?" · joined":""}${isAdm?" · admin":""}${canSee?` · ${a.rs.length} review${a.rs.length===1?"":"s"}`:""}${mine?" · you've reviewed":""}</small></span>
      <span class="btns">
        ${ADMIN?"":`<button type="button" data-review="${m.id}">${m.id===me?"Review myself":"Review"}</button>`}
        ${!ADMIN&&m.id===me?`<button type="button" class="ghost" data-results="${m.id}"${a.rs.length?"":" disabled"}>My results</button>`:""}
        ${ADMIN&&admin?`<button type="button" class="ghost" data-manage="${m.id}" aria-expanded="${managing===m.id}">${managing===m.id?"Close":"Manage"}</button>`:""}
      </span></div>${ADMIN&&admin&&managing===m.id?managePanel(m,joined,isAdm,a):""}`}).join("")
    :`<p class="muted">No one in the crew yet. Add everyone below.</p>`;
  $("memList").querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>startReview(b.dataset.review));
  $("memList").querySelectorAll("[data-results]").forEach(b=>b.onclick=()=>{const box=$("famResults");box.innerHTML=box.innerHTML?"":memberReportHTML(me,false)});
  $("memList").querySelectorAll("[data-manage]").forEach(b=>b.onclick=()=>{managing=managing===b.dataset.manage?"":b.dataset.manage;removeArmed="";refresh()});
  $("memList").querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>manageAction(b.dataset.act,b.dataset.id));
  const showAdmin=ADMIN&&admin;
  $("inviteBox").hidden=!showAdmin;
  if(showAdmin) $("inviteLink").value=inviteLink();
  $("passBox").hidden=!showAdmin; if(showAdmin) renderPassBox();
  if($("famResults").innerHTML&&me&&!ADMIN) $("famResults").innerHTML=memberReportHTML(me,false); else if(ADMIN) $("famResults").innerHTML="";
  $("adminArea").hidden=!showAdmin;
  if(showAdmin) renderAdmin();
  if(admin) syncBoardSoon();
  if(target&&!isMember(target.id)) target=null;
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
  CATS.forEach(c=>{if(state.v[c.id+"t"]==null&&!state.dk[c.id+"t"])syncTop(c)});
  applyMode();
}
function needMe(id){
  pending=id;
  const n=$("meNote"), f=$("meField"), s=$("meSel");
  if(!n) return;
  n.textContent=id?`First, pick your own name in "I am". Then ${memberName(id)}'s review opens.`:`First, pick your own name in "I am", then tap Review next to who you're reviewing.`;
  n.hidden=false; f.classList.add("attention");
  $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  s.focus();
}
function startReview(id){
  if(!crew) return;
  if(!me) return needMe(id);
  const wasTarget=!!target;
  target={id,name:memberName(id)};
  // this device's review, or else the latest one this person saved on another device
  const existing=reviews().find(r=>r.member===id&&r.reviewerUid===user.uid)||reviews().filter(r=>r.member===id&&r.reviewer===me).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0];
  const carry=!wasTarget&&!existing&&(Object.keys(state.v).length||Object.keys(state.dk).length)&&setForType(memberType(id))===activeSet();
  state.who=id===me?"me":memberType(id); state.qset=setForType(memberType(id)); state.name=target.name;
  if(carry){useSet(activeSet());CATS.forEach(c=>{if(state.v[c.id+"t"]==null&&!state.dk[c.id+"t"])syncTop(c)})}
  else setSliders(existing);
  const el=$("crewNote"); if(el) el.hidden=true;
  savedSig=carry?"":sig();
  document.querySelectorAll('input[name=who]').forEach(r=>r.checked=r.value===state.who);
  nameInput.value=target.name;
  save(); render();
  $("cats").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
}
function stopReview(){target=null;delete state.qset;render()}
const toTop=()=>$("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
$("reviewCancel").onclick=toTop;
function clearReview(){
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
  const crewWho=state.who==="family"||state.who==="mate";
  const show=!!crew&&crewWho;
  const others=members().filter(m=>m.id!==me&&memberType(m.id)===state.who);
  const word=state.who==="mate"?"mates":"family";
  pick.hidden=!show; nameInput.hidden=show; pickHint.hidden=true;
  if(show){
    $("nameLabel").textContent=state.who==="mate"?"Mate":"Family member";
    pick.innerHTML=`<option value="">${others.length?"Choose who to review…":`No ${word} in your crew yet`}</option>`+others.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
    pick.value=target&&target.id!==me&&others.some(m=>m.id===target.id)?target.id:"";
    if(!me){pickHint.textContent="Pick your own name under \"I am\" in your crew below first.";pickHint.hidden=false}
    else if(!others.length){pickHint.textContent=`Add ${word==="mates"?"mates":"family members"} to your crew below.`;pickHint.hidden=false}
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
  const myRid=`${user.uid}_${tid}`, mine=reviews().find(r=>r.id===myRid), myKey=mine?(mine.boardKey||legacyKey(myRid)):"";
  const by=(boardById&&boardById[tid]&&boardById[tid].by)||{};
  const readable=liveReviews().filter(r=>r.member===tid&&r.id!==myRid);
  const selfRev=readable.find(r=>r.reviewer===tid)||null, otherRevs=readable.filter(r=>r.reviewer!==tid);
  // overall: board first (everyone can read it), readable reviews as a fallback
  let crewVals=Object.entries(by).filter(([k,e])=>!e.self&&k!==myKey).map(([k,e])=>e.o);
  if(!crewVals.length) crewVals=otherRevs.map(r=>r.overall).filter(v=>typeof v==="number");
  let selfV;
  if(isSelf) selfV=avg;
  else{ const se=Object.values(by).find(e=>e.self); selfV=se?se.o:(selfRev?selfRev.overall:null); if(avg!=null) crewVals=[...crewVals,avg]; }
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
  HV(hs,"Self",v.self,v.selfNote); HV(hc,"Crew",v.crew,v.crewNote);
  if(v.self==null||v.crew==null){gb.hidden=true;return}
  const you=v.isSelf, them=esc(v.nm), d=v.self-v.crew;
  const subj=you?"You rate yourself":`${them} rates themselves`;
  const overall=Math.abs(d)<0.5?`Overall, ${you?"your view":`${them}'s view`} and the crew's are pretty much in line (${v.self.toFixed(1)} vs ${v.crew.toFixed(1)}).`
    :`Overall, ${subj.charAt(0).toLowerCase()+subj.slice(1)} <b>${Math.abs(d).toFixed(1)} ${d>0?"higher":"lower"}</b> than the crew does (${v.self.toFixed(1)} vs ${v.crew.toFixed(1)}).`;
  const big=(v.gaps||[]).filter(x=>Math.abs(x.d)>=1).slice(0,3);
  const line=x=>x.d>0?`<b>${x.c.name}</b>: ${subj.charAt(0).toLowerCase()+subj.slice(1)} ${Math.abs(x.d).toFixed(1)} higher than the crew does (${x.s.toFixed(1)} vs ${x.k.toFixed(1)}).`
    :`<b>${x.c.name}</b>: the crew rates ${you?"you":them} ${Math.abs(x.d).toFixed(1)} higher than ${you?"you do":"they do"} (${x.k.toFixed(1)} vs ${x.s.toFixed(1)}).`;
  gb.innerHTML=`<h3>Biggest gaps: self vs crew</h3><p>${overall}</p>`+(big.length?`<ul>${big.map(x=>`<li>${line(x)}</li>`).join("")}</ul>`:v.gaps?`<p class="muted">No area differs by a full point or more.</p>`:`<p class="muted">${you?"Area-by-area gaps show once someone in the crew has reviewed you.":`Only ${them} and the crew admin see the area-by-area gaps.`}</p>`);
  gb.hidden=false;
}

let last=null, savedSig="";
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
  syncPick();
  const on=!!(crew&&target&&me), pickFirst=!!(crew&&!target&&REVIEW_PAGE);
  banner.hidden=!on&&!pickFirst;
  if(pickFirst){bannerText.innerHTML=me?"<b>Who are you reviewing?</b> Tap Review next to their name":"<b>Pick your name</b> under I am first";bannerGrade.textContent="?";bannerGrade.style.setProperty("--g","var(--track)");$("reviewCancel").textContent="Choose"}
  else $("reviewCancel").textContent="Change"; saveBtn.hidden=true; soloBtn.hidden=true; nextBtn.hidden=!(crew&&REVIEW_PAGE);
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
    const rid0=`${user.uid}_${target.id}`, old=reviews().find(x=>x.id===rid0);
    const boardKey=old?(old.boardKey||legacyKey(rid0)):rid(16);
    const b=writeBatch(db);
    b.set(doc(db,"crews",crewId,"reviews",rid0),{member:target.id,reviewer:me,reviewerUid:user.uid,...r,boardKey});
    b.set(doc(db,"crews",crewId,"board",target.id),{by:{[boardKey]:{o:r.overall,self:target.id===me}}},{merge:true});
    try{await b.commit()}
    catch(x){ if(x&&x.code==="permission-denied"){ await setDoc(doc(db,"crews",crewId,"reviews",rid0),{member:target.id,reviewer:me,reviewerUid:user.uid,...r,boardKey}); } else throw x; }
    savedSig=sig(); ok=true;
    toast(`Saved. ${target.name}'s results are updated.`);
  }catch(x){toast(errText(x),6000)}
  saveBtn.disabled=false; nextBtn.disabled=false; render();
  return ok;
}
saveBtn.addEventListener("click",saveReview);
nextBtn.addEventListener("click",async()=>{
  if(!target){
    if(!me){needMe("");return}
    if(Object.keys(state.v).length||Object.keys(state.dk).length){crewNote(`Who is this review for? Tap <b>Review</b> next to their name in your crew list. Your answers are kept.`,true);toTop();return}
    return clearReview();
  }
  if(last&&last.avg!=null){if(!(await saveReview()))return; crewNote(`Saved your review of <b>${esc(target.name)}</b>. Pick the next person below.`)}
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
  if(REVIEW_PAGE) $("famH2").textContent=crew?"Review My Crew":entry==="join"?"Join A Crew":(myCrews.length?"Review My Crew":"Rate Me");
}
if(REVIEW_PAGE){
  $("choiceRate").onclick=()=>{
    const wasJoin=entry==="join"; entry="rate"; paintEntry();
    const r=$("who-me"); if(!r.checked){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}))}
    if(wasJoin&&!crew&&auth){ if(user&&myCrews.length) viewLobby(); else viewSignedOut(); }
    $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
    if(!crew) setTimeout(()=>nameInput.focus({preventScroll:true}),300);
  };
  $("choiceJoin").onclick=()=>{entry="join";paintEntry();startJoin()};
  $("endJoin").onclick=()=>$("choiceJoin").click();
  /* Rate My Family / Rate My Mates always mean rating, so leave the crew search if it was open. */
  ["who-family","who-mate","who-me"].forEach(id=>$(id).addEventListener("change",()=>{
    if(entry!=="join") return;
    entry="rate"; paintEntry();
    if(!crew&&auth){ if(user&&myCrews.length) viewLobby(); else viewSignedOut(); }
  }));
  /* Share Results: a picture of the report card, sent by the share sheet, WhatsApp, text or email.
     Each send is recorded in the shares collection (channel plus email or mobile if given). */
  const shareBox=$("shareBox"), shareBtn=$("shareBtn"), note=$("shareNote"), hint=$("shareHint");
  let cardBlob=null, cardUrl="";
  const canShareFiles=()=>{try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([new Blob(["x"])],"a.png",{type:"image/png"})]}))}catch(e){return false}};
  const shareText=()=>{
    if(!last||last.avg==null) return "";
    const g=grade(last.avg), top=[...last.rows].filter(r=>r.avg!=null).sort((a,b)=>b.avg-a.avg).slice(0,3).map(r=>r.c.name).join(", ");
    return `${cardTitle()}: ${g} (${last.avg.toFixed(1)}/10). ${VERDICTS[g[0]]}${top?` Top areas: ${top}.`:""} Do yours at ${location.origin}${HOME_PATH}`;
  };
  const say2=(m,err)=>{note.textContent=m;note.className=err?"err":"muted"};
  async function record(channel,extra){
    try{
      if(!auth) return;
      if(!auth.currentUser) await withTimeout(signInAnonymously(auth),10000,"Signing in");
      await withTimeout(addDoc(collection(db,"shares"),{uid:auth.currentUser.uid,channel,...extra,subject:state.name||"",who:state.who,set:activeSet(),grade:grade(last.avg),overall:Math.round(last.avg*100)/100,crewId:crewId||"",at:Date.now()}),10000,"Saving");
    }catch(x){console.warn("share not recorded",x)}
  }
  const ready=()=>{if(!last||last.avg==null){say2("Answer at least one area first, so there's a report card to share.",true);return false}return true};
  const phone=()=>$("sharePhone").value.replace(/[^\d+]/g,"");
  const intl=p=>p.startsWith("+")?p.slice(1):p.startsWith("0")?"61"+p.slice(1):p;   // Australian numbers by default
  async function buildCard(){
    $("cardMaking").hidden=false; $("cardImg").hidden=true;
    try{
      cardBlob=await window.makeCard(); if(cardUrl) URL.revokeObjectURL(cardUrl); cardUrl=URL.createObjectURL(cardBlob);
      $("cardImg").src=cardUrl; $("cardImg").hidden=false; $("cardMaking").hidden=true; $("saveImg").href=cardUrl;
    }catch(x){$("cardMaking").textContent="Couldn't make the picture on this device. You can still send the summary by WhatsApp, text or email."}
    const files=canShareFiles();
    $("shareImg").hidden=!files;
    hint.textContent=files?"WhatsApp and Text message send the picture and the summary: choose WhatsApp or Messages in the list that pops up."
      :(window.isSecureContext?"This browser can't attach the picture to a message directly.":"The picture can't go straight into WhatsApp or Messages until the site is on https (the padlock in the address bar).")+" For now WhatsApp and Text message send the words. To add the picture, tap Save picture (or press and hold it and choose Save to Photos), then attach it in the message.";
  }
  window.__rebuildCard=buildCard;
  shareBtn.onclick=()=>{shareBox.hidden=!shareBox.hidden;shareBtn.setAttribute("aria-expanded",!shareBox.hidden);say2("");if(!shareBox.hidden){if(!ready()){shareBox.hidden=false;return}buildCard();shareBox.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"nearest"})}};
  $("shareImg").onclick=async()=>{
    if(!ready()||!cardBlob) return;
    try{await navigator.share({files:[new File([cardBlob],"rate-my-year-report-card.png",{type:"image/png"})],text:shareText()});record("picture",{})}
    catch(x){if(x&&x.name!=="AbortError")say2("Couldn't open sharing. Try Save picture instead.",true)}
  };
  /* Where the device can share files (https on iPhone/iPad/Android), WhatsApp and Text message open the
     share sheet with the picture AND the words; pick WhatsApp or Messages there. Otherwise they send words only. */
  const sharePic=async channel=>{
    if(!canShareFiles()||!cardBlob) return false;
    try{await navigator.share({files:[new File([cardBlob],"rate-my-year-report-card.png",{type:"image/png"})],text:shareText()});record(channel,phone()?{phone:phone().slice(0,30)}:{});}
    catch(x){if(x&&x.name!=="AbortError")say2("Couldn't open sharing. Try Save picture instead.",true)}
    return true;
  };
  $("shareWa").onclick=async()=>{
    if(!ready()) return; if(await sharePic("whatsapp")) return; const p=phone();
    record("whatsapp",p?{phone:p.slice(0,30)}:{});
    const u=`https://wa.me/${p?intl(p):""}?text=${encodeURIComponent(shareText())}`;
    if(!window.open(u,"_blank")) location.href=u;
  };
  $("shareSms").onclick=async()=>{
    if(!ready()) return; if(await sharePic("sms")) return; const p=phone(), apple=/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    record("sms",p?{phone:p.slice(0,30)}:{});
    location.href=`sms:${p}${apple?"&":"?"}body=${encodeURIComponent(shareText())}`;
  };
  $("saveImg").addEventListener("click",e=>{if(!cardBlob){e.preventDefault();return}record("saved",{})});
  $("shareForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const email=$("shareEmail").value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say2("Enter a valid email address.",true);
    if(!ready()) return;
    $("shareGo").disabled=true; say2("Saving…");
    await record("email",{email:email.toLowerCase().slice(0,200)});
    $("shareGo").disabled=false;
    say2("Opening your email app… To include the picture, save it first and attach it.");
    const subject=`${cardTitle()}: ${grade(last.avg)} (Rate My Year)`;
    location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(window._summary+"\n\nDo your own at "+location.origin+HOME_PATH)}`;
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
  const cfg=await loadConfig();
  if(!cfg){body.innerHTML=`<p class="muted">Crews aren't connected yet. Follow the setup guide to link this site to Firebase. You can still do a review on your own below.</p>`;render();return}
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
  authWatch=setTimeout(()=>{if(stillBusy()&&!gotAuth)showFatal({code:"sign-in check timed out. Check your connection, or turn off content blockers for this site"})},20000);
  async function onAuth(u){ try{
    clearCrewSubs(); user=u; crew=null; crewId=""; target=null; myCrews=[];
    if(JOIN){
      if(!u){
        if(guestTried){viewSignedOut();return}
        guestTried=true; body.innerHTML=`<p class="muted">Getting ready…</p>`;
        try{await withTimeout(signInAnonymously(auth),15000,"Getting ready")}catch(x){guestFail(x,()=>location.reload())}
        return;
      }
      status("Loading your crews…");
      try{const s=await withTimeout(getDoc(doc(db,"users",u.uid)),12000,"Loading your crews");myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[]}
      render(); viewJoin(); return;
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
    try{render()}catch(x){console.error(x)}
    if(loadErr&&loadErr.code!=="permission-denied"&&!myCrews.length){body.innerHTML=`<p class="err">Couldn't load your crews: ${esc(errText(loadErr))}</p><p class="muted">Check your connection and reload. If it keeps happening, send a screenshot of this message.</p><div class="row-btns"><button type="button" id="bootReload">Reload</button></div>`;$("bootReload").onclick=()=>location.reload();return}
    if(afterAuth){const f=afterAuth;afterAuth=null;return f()}
    if(invite&&!ADMIN) return joinCrew(invite);
    if(REVIEW_PAGE&&entry==="join"&&!landJoin){landJoin=true;return startJoin()}
    const lastCrew=loadLS();
    if(lastCrew&&myCrews.some(c=>c.id===lastCrew)) openCrew(lastCrew);
    else if(myCrews.length===1) openCrew(myCrews[0].id);
    else viewLobby();
  }catch(x){console.error(x);showFatal(x)} }
}catch(x){console.error(x);showFatal(x)} })();

