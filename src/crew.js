/* ---------- Review Crew on Firebase (Google sign-in + Firestore) ---------- */
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut,connectAuthEmulator,signInAnonymously,linkWithPopup} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,arrayUnion,arrayRemove,writeBatch} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $=id=>document.getElementById(id);
const body=$("famBody"), title=$("famTitle"), leaveBtn=$("famLeave");
const banner=$("reviewBanner"), bannerText=$("reviewBannerText"), saveBtn=$("famSave"), soloBtn=$("soloSave");
const pick=$("famPick"), pickHint=$("famPickHint"), nameInput=$("name"), revCount=$("revCount");
const LS_CREW="ratemyyear-crew";
const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

let auth=null, db=null, user=null;
let crewId="", crew=null, claims={}, reviewsById={}, unsubs=[], revUnsubs=[], revKey="";
let me="", target=null, pending="", adminTab="scores", reportMember="", removeArmed="", myCrews=[];
let invite=null; // {crew, code} from the link
let guestTried=false;

/* ---------- helpers ---------- */
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
const inviteLink=()=>crew?`${location.origin}${location.pathname}?crew=${crewId}&code=${crew.joinCode}`:"";
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
function aggFor(id){
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
const ranked=main=>CATS.map((c,i)=>({c,v:main[c.id],i})).filter(x=>x.v!=null).sort((x,y)=>y.v-x.v||x.i-y.i);
const groupLine=main=>GROUPS.map(g=>{const vs=g.ids.map(id=>main[id]).filter(v=>v!=null);const v=vs.length?mean(vs):null;return `<span class="gl g-${g.id}"><b>${g.name}</b> ${dot(v)}</span>`}).join("");
const listHTML=rows=>`<ol>${rows.map(r=>`<li style="--g:${gcol(grade(r.v))}"><span class="chip">${grade(r.v)}</span><span class="nm">${r.c.name}</span><span class="sc">${r.v.toFixed(1)}</span></li>`).join("")}</ol>`;
const recsHTML=rows=>rows.map(r=>`<div class="rec" style="--g:${gcol(grade(r.v))}"><h4>${r.c.name} <span class="tag">${grade(r.v)} · ${r.v.toFixed(1)}</span></h4><ul>${r.c.recs.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");

/* ---------- report builders ---------- */
function memberReportHTML(id,detailed){
  const a=aggFor(id), name=esc(memberName(id));
  if(!a.rs.length||a.overall==null) return `<div class="results"><h3>${name}</h3><p class="muted">${a.rs.length?"Every area was marked don't know so far.":peopleLine(0)+"."}</p></div>`;
  const r=ranked(a.main), bottom=r.slice(Math.max(3,r.length-3)).reverse();
  const who=a.rs.map(x=>x.reviewer===id?"themselves":esc(memberName(x.reviewer)));
  const gap=c=>a.sa&&a.fa&&a.sa[c.id]!=null&&a.fa[c.id]!=null?(a.sa[c.id]-a.fa[c.id]):null;
  let html=`<div class="results">
    <h3>${name} · ${grade(a.overall)} overall (${a.overall.toFixed(1)})</h3>
    <p class="count">${peopleLine(a.rs.length)}${a.self?" (including a self review)":""}</p>
    <div class="glines">${groupLine(a.main)}</div>
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
function scoreboardHTML(){
  const rows=members().map(m=>({m,a:aggFor(m.id)})).sort((x,y)=>(y.a.overall??-1)-(x.a.overall??-1));
  if(!rows.length) return `<p class="muted">Add people to your crew to see scores.</p>`;
  const gv=(a,g)=>{if(!a.main)return null;const vs=g.ids.map(id=>a.main[id]).filter(v=>v!=null);return vs.length?mean(vs):null};
  return `<div class="rtable-wrap"><table class="rtable score">
    <thead><tr><th>Member</th><th>Reviews</th><th>Overall</th>${GROUPS.map(g=>`<th>${g.name}</th>`).join("")}${CATS.map(c=>`<th>${c.name}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(({m,a})=>`<tr><td><b>${esc(m.name)}</b></td><td class="n">${a.rs.length}</td><td class="n">${dot(a.overall)}</td>${GROUPS.map(g=>`<td class="n">${dot(gv(a,g))}</td>`).join("")}${CATS.map(c=>`<td class="n">${a.main?dot(a.main[c.id]):"–"}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div><p class="muted">Scores use the crew's view of each person. Where someone only has a self review, that is used instead.</p>`;
}
function crewReportHTML(){
  const ms=members(), withData=ms.map(m=>({m,a:aggFor(m.id)})).filter(x=>x.a.overall!=null);
  const total=liveReviews().length;
  if(!withData.length) return `<p class="muted">No reviews yet. Once your crew saves reviews, the crew report appears here.</p>`;
  const famCat=Object.fromEntries(CATS.map(c=>{const vs=withData.map(x=>x.a.main[c.id]).filter(v=>v!=null);return [c.id,vs.length?mean(vs):null]}));
  const known=CATS.map(c=>famCat[c.id]).filter(v=>v!=null), overall=mean(known);
  const leader=c=>withData.filter(x=>x.a.main[c.id]!=null).reduce((b,x)=>!b||x.a.main[c.id]>b.a.main[c.id]?x:b,null);
  const r=ranked(famCat), bottom=r.slice(Math.max(3,r.length-3)).reverse();
  return `<div class="results">
    <h3>${esc(crew.name)} · ${grade(overall)} overall (${overall.toFixed(1)})</h3>
    <p class="count">${total} review${total===1?"":"s"} saved · ${withData.length} of ${ms.length} members reviewed</p>
    <div class="glines">${groupLine(famCat)}</div>
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
  body.innerHTML=`<div class="stack">
    <p class="muted">A crew is your family, your mates, or both. Got an invite link? Just open it: no sign-in needed. Setting up a new crew? The crew admin signs in with Google once. You can also do a review on your own below without joining anything.</p>
    <div><button type="button" class="gbtn" id="gSignIn">${GOOGLE_SVG}Set up a crew with Google</button></div>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  $("gSignIn").onclick=googleSignIn;
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
      <button type="submit" id="createGo">Create crew</button>
    </form>
    <p class="err" id="famErr"${msg?"":" hidden"}>${esc(msg)}</p>
  </div>`;
  if($("signOut")) $("signOut").onclick=()=>signOut(auth);
  $("gUpgrade").onclick=googleSignIn;
  body.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openCrew(b.dataset.open));
  const tab=t=>{$("tabJoin").setAttribute("aria-selected",t==="join");$("tabCreate").setAttribute("aria-selected",t==="create");$("joinForm").hidden=t!=="join";$("createForm").hidden=t!=="create"||isGuest();$("createGuest").hidden=t!=="create"||!isGuest();famErr("")};
  $("tabJoin").onclick=()=>tab("join"); $("tabCreate").onclick=()=>tab("create");
  $("joinForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const inv=parseInvite($("jLink").value);
    if(!inv) return famErr("That doesn't look like an invite link. Ask your crew admin to send it again.");
    $("joinGo").disabled=true; await joinCrew(inv); const b=$("joinGo"); if(b) b.disabled=false;
  });
  $("createForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=$("cName").value.trim().slice(0,60), myName=$("cMe").value.trim().slice(0,40);
    if(!name) return famErr("Give your crew a name.");
    if(!myName) return famErr("Enter your name so the crew knows who you are.");
    $("createGo").disabled=true;
    try{
      const id=rid(10), myId=rid(10);
      await setDoc(doc(db,"crews",id),{name,ownerUid:user.uid,adminUids:[user.uid],joinCode:rid(8),members:[{id:myId,name:myName,type:"family"}],createdAt:Date.now()});
      await claimMember(id,myId,"");
      await rememberCrew(id,name);
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

async function joinCrew(inv){
  try{
    await setDoc(doc(db,"crews",inv.crew,"joins",user.uid),{code:inv.code,name:user.displayName||"",at:Date.now()});
    const snap=await getDoc(doc(db,"crews",inv.crew));
    await rememberCrew(inv.crew,snap.data().name);
    invite=null; history.replaceState(null,"",location.pathname);
    openCrew(inv.crew);
  }catch(x){
    invite=null; history.replaceState(null,"",location.pathname);
    viewLobby(x&&x.code==="permission-denied"?"That invite link isn't valid any more. Ask your crew admin for a new one.":errText(x));
  }
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
  leaveBtn.hidden=false;
  body.innerHTML=`<div class="stack">
    ${whoRow(myCrews.length>1?`<select id="crewSwitch" aria-label="Switch crew">${myCrews.map(c=>`<option value="${esc(c.id)}"${c.id===crewId?" selected":""}>${esc(c.name)}</option>`).join("")}<option value="__lobby">Join or set up another crew…</option></select>`:`<button type="button" class="ghost sm" id="toLobby">Other crews</button>`)}
    <p class="menote" id="meNote" hidden></p>
    <div class="form">
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
    <div class="invite" id="inviteBox" hidden>
      <label for="inviteLink">Invite link: send this to your crew so they can join</label>
      <div class="invite-row"><input id="inviteLink" readonly><button type="button" id="copyInvite">Copy</button><button type="button" class="ghost" id="newInvite">New link</button></div>
      <p class="muted">Anyone with this link can join the crew without signing in: they open it, pick their name and start reviewing. "New link" stops the old one working.</p>
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
  $("copyInvite").onclick=()=>{
    const v=inviteLink();
    navigator.clipboard.writeText(v).then(()=>toast("Invite link copied")).catch(()=>{$("inviteLink").select();toast("Selected. Press Ctrl+C or Cmd+C to copy.")});
  };
  $("newInvite").onclick=async()=>{try{await updateDoc(doc(db,"crews",crewId),{joinCode:rid(8)});toast("New invite link made. The old one no longer works.")}catch(x){famErr(errText(x))}};
  document.querySelectorAll("#adminArea [data-tab]").forEach(b=>b.onclick=()=>{adminTab=b.dataset.tab;renderAdmin()});
}

function refresh(){
  if(!crew||!$("memList")) return;
  title.textContent=`Your crew: ${crew.name}`;
  const ms=members(), admin=isAdmin();
  const taken=id=>claims[id]&&claims[id]!==user.uid;
  $("meSel").innerHTML=`<option value="">Choose your name…</option>`+ms.map(m=>`<option value="${m.id}"${m.id===me?" selected":""}${taken(m.id)?" disabled":""}>${esc(m.name)}${taken(m.id)?" (taken)":""}</option>`).join("")+`<option value="__new">I'm not on the list. Add me</option>`;
  if(!me&&ms.length&&$("meNote").hidden){$("meNote").textContent="Welcome! Pick your name under \"I am\" to get started.";$("meNote").hidden=false;$("meField").classList.add("attention")}
  $("memList").innerHTML=ms.length?ms.map(m=>{
    const a=aggFor(m.id), g=a.overall!=null?grade(a.overall):null;
    const mine=reviews().some(r=>r.member===m.id&&r.reviewerUid===user.uid);
    const canSee=admin||m.id===me;
    const joined=!!claims[m.id], isAdm=joined&&crew.adminUids.includes(claims[m.id]);
    return `<div class="member"${g&&canSee?` style="--g:${gcol(g)}"`:""}>
      <span class="chip${g&&canSee?"":" none"}">${g&&canSee?g:"–"}</span>
      <span class="nm">${esc(m.name)}${m.id===me?" (you)":""}<small>${memberType(m.id)==="mate"?"Mate":"Family"}${joined?" · joined":""}${isAdm?" · admin":""}${canSee?` · ${a.rs.length} review${a.rs.length===1?"":"s"}`:""}${mine?" · you've reviewed":""}</small></span>
      <span class="btns">
        <button type="button" data-review="${m.id}">${m.id===me?"Review myself":"Review"}</button>
        ${m.id===me&&!admin?`<button type="button" class="ghost" data-results="${m.id}"${a.rs.length?"":" disabled"}>My results</button>`:""}
        ${admin&&joined&&claims[m.id]!==crew.ownerUid&&claims[m.id]!==user.uid?`<button type="button" class="ghost" data-admin="${m.id}">${isAdm?"Remove admin":"Make admin"}</button>`:""}
        ${admin&&joined&&claims[m.id]!==user.uid?`<button type="button" class="ghost" data-free="${m.id}">Free up name</button>`:""}
        ${admin&&m.id!==me?`<button type="button" class="ghost" data-remove="${m.id}">${removeArmed===m.id?"Tap to confirm":"Remove"}</button>`:""}
      </span></div>`}).join("")
    :`<p class="muted">No one in the crew yet. Add everyone below.</p>`;
  $("memList").querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>startReview(b.dataset.review));
  $("memList").querySelectorAll("[data-results]").forEach(b=>b.onclick=()=>{const box=$("famResults");box.innerHTML=box.innerHTML?"":memberReportHTML(me,false)});
  $("memList").querySelectorAll("[data-free]").forEach(b=>b.onclick=async()=>{try{await deleteDoc(doc(db,"crews",crewId,"claims",b.dataset.free));toast("Name freed up. They can pick it again from their device.")}catch(x){famErr(errText(x))}});
  $("memList").querySelectorAll("[data-admin]").forEach(b=>b.onclick=async()=>{
    const uid=claims[b.dataset.admin]; if(!uid) return;
    try{await updateDoc(doc(db,"crews",crewId),{adminUids:crew.adminUids.includes(uid)?arrayRemove(uid):arrayUnion(uid)})}catch(x){famErr(errText(x))}
  });
  $("memList").querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{
    const id=b.dataset.remove;
    if(removeArmed!==id){removeArmed=id;refresh();setTimeout(()=>{if(removeArmed===id){removeArmed="";refresh()}},3000);return}
    removeArmed="";
    try{
      const uid=claims[id], upd={members:members().filter(m=>m.id!==id)};
      if(uid&&uid!==crew.ownerUid&&crew.adminUids.includes(uid)) upd.adminUids=arrayRemove(uid);
      await updateDoc(doc(db,"crews",crewId),upd);
      if(uid){
        await deleteDoc(doc(db,"crews",crewId,"claims",id));
        if(uid!==crew.ownerUid) await deleteDoc(doc(db,"crews",crewId,"joins",uid));
      }
    }catch(x){famErr(errText(x))}
  });
  $("inviteBox").hidden=!admin;
  if(admin) $("inviteLink").value=inviteLink();
  if($("famResults").innerHTML&&me&&!admin) $("famResults").innerHTML=memberReportHTML(me,false); else if(admin) $("famResults").innerHTML="";
  $("adminArea").hidden=!admin;
  if(admin) renderAdmin();
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
  setSliders(existing);
  state.who=id===me?"me":memberType(id); state.name=target.name;
  savedSig=sig();
  document.querySelectorAll('input[name=who]').forEach(r=>r.checked=r.value===state.who);
  nameInput.value=target.name;
  save(); render();
  $("cats").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
}
function stopReview(){target=null;render()}
const toTop=()=>$("fam").scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
$("reviewCancel").onclick=toTop;
function clearReview(){
  target=null; setSliders({}); state.name=""; nameInput.value=""; pick.value="";
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
  return {values,dk,cats,overall:Math.round(last.avg*100)/100,grade:grade(last.avg),year:2026,savedAt:Date.now()};
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
    if(!u){
      render();
      if(invite&&!guestTried){
        guestTried=true;
        body.innerHTML=`<p class="muted">Joining the crew…</p>`;
        try{await signInAnonymously(auth)}catch(x){viewSignedOut(x&&(x.code==="auth/operation-not-allowed"||x.code==="auth/admin-restricted-operation")?"Guest joining isn't switched on yet. Ask the crew admin to turn on Anonymous sign-in in Firebase.":errText(x))}
        return;
      }
      viewSignedOut();return;
    }
    try{const s=await getDoc(doc(db,"users",u.uid));myCrews=(s.exists()&&s.data().crews)||[]}catch(e){myCrews=[]}
    render();
    if(invite) return joinCrew(invite);
    const lastCrew=loadLS();
    if(lastCrew&&myCrews.some(c=>c.id===lastCrew)) openCrew(lastCrew);
    else if(myCrews.length===1) openCrew(myCrews[0].id);
    else viewLobby();
  });
})();
