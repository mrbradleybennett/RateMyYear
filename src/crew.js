/* ---------- Review Crew on Firebase (Google sign-in + Firestore) ---------- */
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,connectAuthEmulator,signInAnonymously,linkWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,arrayUnion,arrayRemove,writeBatch,getDocs,limit} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $=id=>document.getElementById(id);
const body=$("famBody"), title=$("famTitle"), leaveBtn=$("famLeave");
const banner=$("reviewBanner"), bannerText=$("reviewBannerText"), saveBtn=$("famSave"), soloBtn=$("soloSave");
const pick=$("famPick"), pickHint=$("famPickHint"), nameInput=$("name"), revCount=$("revCount");
const LS_CREW="ratemyyear-crew";
const PAGE=window.RMY_PAGE||"review";
const ADMIN=PAGE==="admin";                       // My Crew page
const JOIN=PAGE==="join";                         // Join A Crew page
const REVIEW_PATH=location.pathname.replace(/(mycrew|join)(\.html)?$/,"");
const MYCREW_PATH=REVIEW_PATH+"mycrew.html";
const JOIN_PATH=REVIEW_PATH+"join.html";
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

let auth=null, db=null, user=null;
let crewId="", crew=null, claims={}, reviewsById={}, unsubs=[], revUnsubs=[], revKey="";
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
const memberType=id=>((members().find(m=>m.id===id)||{}).type)||"family";
const isMember=id=>members().some(m=>m.id===id);
const isAdmin=()=>!!(crew&&user&&Array.isArray(crew.adminUids)&&crew.adminUids.includes(user.uid));
const isOwner=()=>!!(crew&&user&&crew.ownerUid===user.uid);
const reviews=()=>Object.values(reviewsById);
const liveReviews=()=>reviews().filter(r=>isMember(r.member)&&isMember(r.reviewer));
const fillThey=t=>t.replace(/\{(you|your|yourself|are)\}/g,(_,k)=>P.other[k]).replace(/(^|[.?!]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
const peopleLine=n=>n===0?"No one has reviewed them yet":`${n} ${n===1?"person has":"people have"} given a review`;
const dot=v=>v==null?`<span class="muted">–</span>`:`<span class="g-dot" style="--g:${gcol(grade(v))}">${grade(v)}</span>${v.toFixed(1)}`;
const errText=x=>{
  const c=x&&x.code||"";
  if(c==="permission-denied") return "You don't have access to do that. Check you're in this crew, or ask the crew admin for a new invite link.";
  if(c==="unavailable") return "Can't reach the database. Check your connection and try again.";
  if(c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request") return "Sign-in was cancelled.";
  return "Something went wrong. Try again in a moment.";
};
const inviteLink=()=>crew?`${location.origin}${REVIEW_PATH}?crew=${crewId}&code=${crew.joinCode}`:"";
const parseInvite=s=>{
  s=(s||"").trim(); if(!s) return null;
  try{const u=new URL(s);const c=u.searchParams.get("crew"),k=u.searchParams.get("code");if(c&&k)return {crew:c,code:k}}catch(e){}
  const m=s.match(/^([a-z0-9]{6,40})[-\s:]+([a-z0-9]{4,40})$/i); return m?{crew:m[1],code:m[2]}:null;
};
/* Claim a person in the crew ("I am"): one claim per account, written together with the account pointer. */
async function claimMember(cid,memberId,oldMemberId){
  const b=writeBatch(db);
  if(oldMemberId&&oldMemberId!==memberId) b.delete(doc(db,"crews",cid,"claims",oldMemberId));
  b.set(doc(db,"crews",cid,"accounts",user.uid),{member:memberId});
  b.set(doc(db,"crews",cid,"claims",memberId),{uid:user.uid,at:Date.now()});
  await b.commit();
}
const loadLS=()=>{try{return localStorage.getItem(LS_CREW)||""}catch(e){return ""}};
const saveLS=v=>{try{v?localStorage.setItem(LS_CREW,v):localStorage.removeItem(LS_CREW)}catch(e){}};
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
      try{await linkWithPopup(auth.currentUser,prov);location.reload();return}
      catch(x){if(x&&x.code==="auth/credential-already-in-use"){await signInWithPopup(auth,prov);return}throw x}
    }
    await signInWithPopup(auth,prov);
  }catch(x){
    if(x&&(x.code==="auth/popup-blocked"||x.code==="auth/operation-not-supported-in-this-environment")){try{await signInWithRedirect(auth,prov);return}catch(y){x=y}}
    famErr(errText(x));
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
      b.set(doc(db,"crews",id),{name,slug,passHash:passHash(slug,pw),ownerUid:user.uid,adminUids:[user.uid],joinCode:rid(8),members:[{id:myId,name:myName,type:"family"}],createdAt:Date.now()});
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
async function startJoin(){
  if(!JOIN){location.href=JOIN_PATH;return}
  $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  if(!auth){famErr("Crews aren't connected yet.");return}
  if(!user){
    body.innerHTML=`<p class="muted">Getting ready…</p>`;
    afterAuth=viewJoin;
    try{await signInAnonymously(auth)}catch(x){afterAuth=null;viewSignedOut(x&&(x.code==="auth/operation-not-allowed"||x.code==="auth/admin-restricted-operation")?"Joining isn't switched on yet. The site owner needs to turn on Anonymous sign-in in Firebase.":errText(x))}
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
function clearCrewSubs(){unsubs.forEach(u=>u());unsubs=[];revUnsubs.forEach(u=>u());revUnsubs=[];revKey=""}
function openCrew(id){
  clearCrewSubs();
  crewId=id; crew=null; claims={}; reviewsById={}; me=""; target=null;
  saveLS(id);
  viewCrewShell();
  unsubs.push(onSnapshot(doc(db,"crews",id),s=>{
    if(!s.exists()){leaveLocal("That crew no longer exists.");return}
    crew=s.data(); syncReviewSubs(); refresh();
  },x=>{leaveLocal(x&&x.code==="permission-denied"?"You're no longer in that crew.":errText(x))}));
  unsubs.push(onSnapshot(collection(db,"crews",id,"claims"),s=>{
    claims={}; s.docs.forEach(d=>claims[d.id]=d.data().uid);
    me=Object.keys(claims).find(k=>claims[k]===user.uid)||"";
    syncReviewSubs(); refresh();
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
  }
}
function leaveLocal(msg){
  clearCrewSubs(); crewId=""; crew=null; claims={}; reviewsById={}; me=""; target=null; saveLS("");
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
    <div class="form" id="meWrap">
      <div class="field" id="meField"><label for="meSel">I am</label><select id="meSel"></select></div>
    </div>
    <form class="form" id="addMeForm" novalidate hidden>
      <div class="field"><label for="addMeName">Your name</label><input id="addMeName" autocomplete="off" placeholder="e.g. Dave"></div>
      <div class="field"><label for="addMeType">You are</label><select id="addMeType"><option value="family">Family</option><option value="mate">A mate</option></select></div>
      <button type="submit">Add me</button>
    </form>
    <div class="members" id="memList"></div>
    <form class="form" id="addForm" novalidate>
      <div class="field"><label for="newMem">Add someone to the crew</label><input id="newMem" autocomplete="off" placeholder="e.g. Nikki or Dave"></div>
      <div class="field"><label for="newType">They are</label><select id="newType"><option value="family">Family</option><option value="mate">A mate</option></select></div>
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
    try{const id=rid(10);await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id,name:n,type:$("addMeType").value}]});await claimMember(crewId,id,me);$("addMeForm").hidden=true;$("addMeName").value="";famErr("");$("meNote").hidden=true;$("meField").classList.remove("attention");if(pending){const pid=pending;pending="";setTimeout(()=>startReview(pid),300)}}
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
        await deleteDoc(doc(db,"crews",crewId,"claims",me));
      }
      $("meNote").hidden=true;$("meField").classList.remove("attention");
      if(pending){const id=pending;pending="";setTimeout(()=>startReview(id),300)}
    }catch(x){famErr(x&&x.code==="permission-denied"?"Someone else has already picked that name. If it's you, ask the crew admin to tap \"Free up name\" next to it.":errText(x));refresh()}
  });
  $("addForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inp=$("newMem"), n=inp.value.trim(); if(!n||!crew) return;
    if(members().some(m=>m.name.toLowerCase()===n.toLowerCase())) return famErr(`${n} is already in the crew.`);
    try{await updateDoc(doc(db,"crews",crewId),{members:[...members(),{id:rid(10),name:n.slice(0,40),type:$("newType").value}]});inp.value="";famErr("")}
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
    ${joined&&!isMe?row("free","Free up name",`For when ${nm} changes phone or clears their browser. They pick their name again from the invite link. Their reviews are kept.`):""}
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

function refresh(){
  if(!crew||!$("memList")) return;
  title.textContent=`Your crew: ${crew.name}`;
  const ms=members(), admin=isAdmin();
  const taken=id=>claims[id]&&claims[id]!==user.uid;
  $("meWrap").hidden=ADMIN; $("addMeForm").hidden=ADMIN||$("addMeForm").hidden;
  $("notAdmin").hidden=!(ADMIN&&!admin); $("toMyCrew").hidden=ADMIN||!admin;
  $("addForm").hidden=!(ADMIN&&admin); $("memList").hidden=ADMIN&&!admin;
  const tb=document.getElementById("myCrewBtn"); if(tb&&!ADMIN) tb.textContent=admin?"My Crew":"Create My Crew";
  $("meSel").innerHTML=`<option value="">Choose your name…</option>`+ms.map(m=>`<option value="${m.id}"${m.id===me?" selected":""}${taken(m.id)?" disabled":""}>${esc(m.name)}${taken(m.id)?" (taken)":""}</option>`).join("")+`<option value="__new">I'm not on the list. Add me</option>`;
  if(me||ADMIN){$("meNote").hidden=true;$("meField").classList.remove("attention")}
  else if(ms.length&&$("meNote").hidden){$("meNote").textContent="Welcome! Pick your name under \"I am\" to get started.";$("meNote").hidden=false;$("meField").classList.add("attention")}
  $("memList").innerHTML=ms.length?ms.map(m=>{
    const a=aggFor(m.id), g=a.overall!=null?grade(a.overall):null;
    const mine=reviews().some(r=>r.member===m.id&&r.reviewerUid===user.uid);
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
  n.textContent=`First, pick your own name in "I am". Then ${memberName(id)}'s review opens.`;
  n.hidden=false; f.classList.add("attention");
  $("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
  s.focus();
}
function startReview(id){
  if(!crew) return;
  if(!me) return needMe(id);
  target={id,name:memberName(id)};
  const existing=reviews().find(r=>r.member===id&&r.reviewerUid===user.uid);
  state.who=id===me?"me":memberType(id); state.qset=setForType(memberType(id)); state.name=target.name;
  setSliders(existing);
  savedSig=sig();
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

let last=null, savedSig="";
const sig=()=>JSON.stringify([state.v,state.dk]);
const nextBtn=$("reviewNext"), bannerGrade=$("reviewBannerGrade");
window.afterRender=function(rows,avg){
  last={rows,avg};
  syncPick();
  const on=!!(crew&&target&&me);
  banner.hidden=!on; saveBtn.hidden=!on; soloBtn.hidden=on||!user; nextBtn.hidden=!on;
  document.body.classList.toggle("has-bar",on);
  if(on){
    const self=target.id===me, dirty=sig()!==savedSig, g=avg==null?null:grade(avg);
    bannerText.innerHTML=self?`<b>${esc(memberName(me))}</b> reviewing <b>themselves</b>`:`<b>${esc(memberName(me))}</b> reviewing <b>${esc(target.name)}</b>`;
    bannerGrade.textContent=g||"–"; bannerGrade.style.setProperty("--g",g?gcol(g):"var(--track)");
    nextBtn.textContent=dirty&&avg!=null?"Save & review someone else":"Review someone else";
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
    await setDoc(doc(db,"crews",crewId,"reviews",`${user.uid}_${target.id}`),{member:target.id,reviewer:me,reviewerUid:user.uid,...r});
    savedSig=sig(); ok=true;
    toast(`Saved. ${target.name}'s results are updated.`);
  }catch(x){toast(errText(x),6000)}
  saveBtn.disabled=false; nextBtn.disabled=false; render();
  return ok;
}
saveBtn.addEventListener("click",saveReview);
nextBtn.addEventListener("click",async()=>{
  if(!target) return clearReview();
  if(sig()!==savedSig&&last&&last.avg!=null){if(!(await saveReview()))return}
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

/* ---------- boot ---------- */
async function loadConfig(){
  if(window.RATEMYYEAR_FIREBASE_CONFIG&&window.RATEMYYEAR_FIREBASE_CONFIG.apiKey) return window.RATEMYYEAR_FIREBASE_CONFIG;
  try{const r=await fetch("/__/firebase/init.json");if(r.ok)return await r.json()}catch(e){}
  return null;
}
(async()=>{
  const p=new URLSearchParams(location.search);
  if(p.get("crew")&&p.get("code")) invite={crew:p.get("crew"),code:p.get("code")};
  const cfg=await loadConfig();
  if(!cfg){body.innerHTML=`<p class="muted">Crews aren't connected yet. Follow the setup guide to link this site to Firebase. You can still do a review on your own below.</p>`;render();return}
  const app=initializeApp(cfg);
  auth=getAuth(app); db=getFirestore(app);
  if(p.get("emulator")==="1"){connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(db,"127.0.0.1",8080)}
  getRedirectResult(auth).catch(()=>{});
  render();
  onAuthStateChanged(auth,async u=>{
    clearCrewSubs(); user=u; crew=null; crewId=""; target=null; myCrews=[];
    if(JOIN){
      if(!u){
        if(guestTried){viewSignedOut();return}
        guestTried=true; body.innerHTML=`<p class="muted">Getting ready…</p>`;
        try{await signInAnonymously(auth)}catch(x){body.innerHTML=`<p class="err">${esc(x&&(x.code==="auth/operation-not-allowed"||x.code==="auth/admin-restricted-operation")?"Joining isn't switched on yet. The site owner needs to turn on Anonymous sign-in in Firebase (Authentication → Sign-in method).":errText(x))}</p>`}
        return;
      }
      try{const s=await getDoc(doc(db,"users",u.uid));myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[]}
      render(); viewJoin(); return;
    }
    if(!u){
      render();
      if(invite&&!guestTried&&!ADMIN){
        guestTried=true;
        body.innerHTML=`<p class="muted">Joining the crew…</p>`;
        try{await signInAnonymously(auth)}catch(x){viewSignedOut(x&&(x.code==="auth/operation-not-allowed"||x.code==="auth/admin-restricted-operation")?"Guest joining isn't switched on yet. Ask the crew admin to turn on Anonymous sign-in in Firebase.":errText(x))}
        return;
      }
      viewSignedOut();return;
    }
    try{const s=await getDoc(doc(db,"users",u.uid));myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[]}
    render();
    if(afterAuth){const f=afterAuth;afterAuth=null;return f()}
    if(invite&&!ADMIN) return joinCrew(invite);
    const lastCrew=loadLS();
    if(lastCrew&&myCrews.some(c=>c.id===lastCrew)) openCrew(lastCrew);
    else if(myCrews.length===1) openCrew(myCrews[0].id);
    else viewLobby();
  });
})();

