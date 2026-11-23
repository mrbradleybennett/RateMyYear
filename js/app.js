/* Tokens: {you} {your} {yourself} {are} */
/* Life set: used for Rate Me, Rate My Family and family crew members. */
const LIFE_CATS=[
 {id:"self",name:"Self Care",line:"How well do {you} look after {yourself}?",lo:"Struggling",hi:"Looks after {yourself}",qs:[
  ["How well do {you} keep {your} life in order (money, home, admin)?","All over the place","Sorted"],
  ["When things go wrong, how do {you} treat {yourself}?","Very harsh","Kind and fair"],
  ["Do {you} say no when {you} need to?","Never","Every time"]],
  recs:["Block out one hour a week for bills, appointments and the admin that keeps getting put off.","Pick one thing to say no to next year and stick to it.","After a stuff-up, talk to yourself the way you'd talk to a mate."]},
 {id:"health",name:"Health",line:"How well do {you} look after {your} body?",lo:"Not great",hi:"Fit and healthy",qs:[
  ["How often do {you} move or train?","Rarely","Most days"],
  ["How are {your} eating and drinking?","Mostly takeaway","Eats well"],
  ["How are {your} sleep and recovery?","Running on fumes","Well rested"]],
  recs:["Aim for a 30 minute walk or session most days.","Swap a few takeaway meals or drinks each week for something decent.","Set a bedtime and keep the phone out of the bedroom."]},
 {id:"clean",name:"Cleanliness",line:"How clean and tidy {are} {you}?",lo:"Very messy",hi:"Spotless",qs:[
  ["Do {you} clean up after {yourself}?","Leaves a trail","Every time"],
  ["How tidy do {you} keep {your} room and space?","Very messy","Neat as a pin"],
  ["Do {you} pitch in with the chores?","Never","First to help"]],
  recs:["Clean up as you go: dishes away, clothes off the floor.","Pick one room or space each week and give it a proper tidy.","Do a chore before anyone has to ask."]},
 {id:"mates",name:"Mates",line:"How good a mate {are} {you}?",lo:"Hard work",hi:"A great friend",qs:[
  ["How often do {you} show up for {your} mates?","Rarely","Always there"],
  ["{are} {you} good company to be around?","Drains the mood","Lifts the mood"],
  ["Do {you} reach out first, or wait to be called?","Always waits","Makes the call"]],
  recs:["Put a regular catch-up in the calendar with your closest two or three mates.","Be the one who sends the first message.","Say yes to the next invite, even if you're tired."]},
 {id:"others",name:"Family & Others",line:"How well do {you} treat {your} family and the people around {you}?",lo:"Tags along",hi:"Really cares",qs:[
  ["Do {you} pitch in for {your} family and people outside {your} own circle?","Not really","Regularly"],
  ["Do {you} leave places and people better than {you} find them?","Worse off","Better off"],
  ["When something isn't right, do {you} speak up?","Keeps quiet","Stands up"]],
  recs:["Help out with one family, community or charity thing each quarter.","Leave every place a bit better than you found it.","When something's off, say so early and calmly."]},
 {id:"love",name:"Love",line:"How well do {you} show love to the people closest to {you}?",lo:"Holds back",hi:"Shows it every day",qs:[
  ["Do the people {you} love know it?","They have to guess","Tells them often"],
  ["How much real time do {you} give family or partner?","Barely any","Plenty"],
  ["How is {your} patience at home?","Short fuse","Calm as"]],
  recs:["Tell the people you love that you do, out loud, this week.","Have one phone-free night a week with family or partner.","Count to five before snapping at home."]},
 {id:"action",name:"Action",line:"Do {you} get things done?",lo:"Rarely",hi:"Gets it done",qs:[
  ["How much of what {you} say {you}'ll do actually gets done?","Hardly any","All of it"],
  ["How do {you} handle the hard or boring jobs?","Dodges them","Knocks them over first"],
  ["How much effort goes into {your} work?","Coasting","Flat out"]],
  recs:["Write down three things to finish in January and tick them off.","Do the worst job first thing each morning.","Stop agreeing to things you won't get to."]},
 {id:"growth",name:"Growth Mindset",line:"How much {are} {you} learning and growing?",lo:"Stuck",hi:"On the up",qs:[
  ["{are} {you} learning new things?","Not much","Heaps"],
  ["How do {you} take criticism and feedback?","Gets defensive","Takes it on board"],
  ["What is {your} outlook most days?","Glass half empty","Glass half full"]],
  recs:["Pick one skill, course or book to get through each quarter.","When someone gives feedback, say \"fair point\" before defending yourself.","Write down one good thing at the end of each day."]},
 {id:"humour",name:"Humour",line:"How much fun {are} {you} to be around?",lo:"Serious",hi:"Great fun",qs:[
  ["How often do {you} have a proper laugh?","Rarely","Daily"],
  ["Do {you} bring fun to other people's days?","Rarely","Makes their day"],
  ["Can {you} laugh at {yourself}?","Touchy","Every time"]],
  recs:["Plan one thing each month purely for fun.","Share the funny stuff with someone who needs a laugh.","Be the first to laugh when you stuff up."]}
];
const LIFE_GROUPS=[
  {id:"me",name:"Self",blurb:"Looking after yourself",ids:["self","health","clean"]},
  {id:"others",name:"Others",blurb:"How you are with people",ids:["mates","others","love"]},
  {id:"life",name:"Life",blurb:"Getting on with it",ids:["action","growth","humour"]}];
/* Mates set: used for Rate My Mates and mate crew members. Group ids reuse the three group colours. */
const MATE_CATS=[
 {id:"vibe",name:"Vibe",line:"What's {your} vibe like?",lo:"Dead weight",hi:"Good energy",qs:[
  ["Do {you} lift the mood when {you} walk in?","Sucks the air out","Lights it up"],
  ["How positive {are} {you} to be around?","Whinger","Glass half full"],
  ["How easy-going {are} {you}?","Highly strung","Chill as"]],
  recs:["Leave the whinging at the door for the next catch-up and see how it lands.","Bring the energy: be the one who suggests the next plan.","Let the small stuff slide. Not every hill needs dying on."]},
 {id:"banter",name:"Banter",line:"How good is {your} banter?",lo:"Crickets",hi:"Pure gold",qs:[
  ["How quick {are} {you} with a comeback?","Thinks of it tomorrow","Razor sharp"],
  ["Can {you} take a ribbing as well as dish it out?","Spits the dummy","Cops it sweet"],
  ["Do {you} know where the line is?","Crosses it","Reads the room"]],
  recs:["Cop the next ribbing with a laugh before firing back.","Keep the group chat alive with one decent message a week.","Read the room. If a mate's having a rough trot, ease off."]},
 {id:"generous",name:"Generous",line:"How generous {are} {you} with {your} time and money?",lo:"Tight as",hi:"Shouts the round",qs:[
  ["Do {you} shout {your} round?","Short arms, deep pockets","First to the bar"],
  ["Do {you} give up {your} time to help a mate out?","Too busy","Drops everything"],
  ["Do {you} share what {you}'ve got (car, gear, contacts)?","Keeps it to {yourself}","What's mine is yours"]],
  recs:["Get the first round in next time.","Offer a hand with a mate's move, reno or job hunt before they ask.","Lend the gear, share the contact, pass on the tip."]},
 {id:"mclean",name:"Cleanliness",line:"How clean and tidy {are} {you}?",lo:"Feral",hi:"Fresh as",qs:[
  ["How's {your} personal hygiene?","On the nose","Fresh as a daisy"],
  ["What state {are} {your} car and place in?","Pigsty","Spotless"],
  ["Do {you} clean up after {yourself} at a mate's place?","Leaves a mess","Leaves it better"]],
  recs:["Shower, deodorant, clean clothes: every time you head out.","Give the car and your place a proper clean once a week.","At a mate's place, clean up before you leave."]},
 {id:"reliable",name:"Reliable",line:"How reliable {are} {you}?",lo:"Flaky",hi:"Rock solid",qs:[
  ["Do {you} turn up when {you} say {you} will?","Always pikes","Every time"],
  ["{are} {you} on time?","Always late","Early"],
  ["Can {your} mates count on {you} in a crisis?","Goes missing","First call"]],
  recs:["Stop saying maybe. Give a straight yes or no.","Turn up on time to the next three catch-ups.","Be the mate who answers the 2am call."]},
 {id:"loyal",name:"Loyalty",line:"How loyal {are} {you} to {your} mates?",lo:"Snake",hi:"Ride or die",qs:[
  ["Do {you} have {your} mates' backs when they're not around?","Talks behind backs","Sticks up for them"],
  ["Can {you} keep a secret?","Blabbermouth","Locked in the vault"],
  ["Do {you} stick around through the tough times?","Fair-weather friend","Sticks like glue"]],
  recs:["Only say things about a mate you'd say to their face.","What's told in confidence stays there.","Check in on the mate who's gone quiet."]},
 {id:"adventure",name:"Adventure",line:"How up for an adventure {are} {you}?",lo:"Homebody",hi:"Up for anything",qs:[
  ["Do {you} say yes to new things?","Not for me","Let's go"],
  ["How often do {you} organise trips or outings?","Never","Always planning one"],
  ["Do {you} get out of {your} comfort zone?","Same old","Pushes it"]],
  recs:["Book one trip or weekend away with the crew this year.","Say yes to the next thing you'd normally knock back.","Try something none of you have done before."]},
 {id:"social",name:"Social",line:"How social {are} {you}?",lo:"Hermit",hi:"Life of the party",qs:[
  ["How often do {you} turn up to catch-ups?","Never seen","At everything"],
  ["Do {you} bring people together?","Keeps to {yourself}","Glue of the group"],
  ["Do {you} make new people feel welcome?","Closed shop","Brings them in"]],
  recs:["Put a standing monthly catch-up in the calendar.","Introduce two mates who'd get on.","Make the new person in the group feel part of it."]}
];
const MATE_GROUPS=[
  {id:"me",name:"Them",blurb:"What they bring",ids:["vibe","banter","generous","mclean"]},
  {id:"others",name:"Us",blurb:"How they are with their mates",ids:["reliable","loyal"]},
  {id:"life",name:"Life",blurb:"Getting out there",ids:["adventure","social"]}];
/* Rate My Partner: rates the relationship itself, not the other person. Nine areas in three groups. */
const PARTNER_CATS=[
 {id:"kind",name:"Kindness",line:"How kind and patient are you with each other?",lo:"Short fuses",hi:"Endlessly patient",qs:[
  ["How patient are you with each other when things go wrong?","Snappy","Calm as"],
  ["Do you both say sorry when you're wrong?","Never","Always"],
  ["Are you kind to each other on a bad day?","Take it out on each other","Still gentle"]],
  recs:["Count to five before answering when you're frustrated with each other.","Whoever is more in the wrong says sorry first, tonight.","On a bad day, say so, rather than taking it out on each other."]},
 {id:"trust",name:"Trust",line:"How much do you trust each other?",lo:"Walking on eggshells",hi:"Rock solid",qs:[
  ["Do you both do what you say you'll do?","Rarely","Every time"],
  ["Are you honest with each other, even when it's awkward?","Little white lies","Straight up"],
  ["Can you count on each other when it really matters?","Not really","Always"]],
  recs:["Only promise each other what you'll actually do.","Tell each other the awkward truth early, and kindly.","Show up for each other's big moments: appointments, tough days and wins."]},
 {id:"fun",name:"Fun",line:"How much fun do you have together?",lo:"Groundhog Day",hi:"Best of friends",qs:[
  ["Do you make each other laugh?","Never","All the time"],
  ["Do you plan fun things to do together?","Never","Always planning"],
  ["Can you laugh at yourselves together?","Too serious","Laugh it off"]],
  recs:["Share one funny thing with each other every day.","Plan one new thing to do together this month.","Laugh together at your stuff-ups."]},
 {id:"talk",name:"Communication",line:"How well do you talk things through?",lo:"Silent treatment",hi:"Talk it out",qs:[
  ["Do you really listen to each other?","Talk over each other","All ears"],
  ["Do you raise problems calmly and early?","Bottle it up","Talk it through"],
  ["Do you share what's going on for each of you?","Closed books","Open books"]],
  recs:["Phones down, and listen until the other one has finished.","Raise small things early and calmly, before they become big things.","Each night, share one thing on your mind, good or bad."]},
 {id:"romance",name:"Romance",line:"How much romance and affection is there?",lo:"Flatmates",hi:"Still swooning",qs:[
  ["Do you show each other affection every day?","Rarely","All the time"],
  ["Do you still make an effort with dates and surprises?","Stopped trying","Still courting"],
  ["Do you say the nice stuff out loud?","Never","Every day"]],
  recs:["A proper hug and kiss hello and goodbye, every day.","Book a date night this month, and take turns planning it.","Tell each other one thing you love about the other, out loud, this week."]},
 {id:"support",name:"Support",line:"How much are you in each other's corner?",lo:"Separate planets",hi:"Biggest fans",qs:[
  ["Do you back each other's goals and dreams?","Not interested","Biggest fans"],
  ["Do you have each other's backs in front of others?","Throw each other under the bus","Always"],
  ["Do you notice when the other one is struggling?","Oblivious","Straight away"]],
  recs:["Share one goal each and help each other with the next step this month.","Back each other in public. Disagree in private.","When one of you goes quiet, the other asks how they're really going."]},
 {id:"qtime",name:"Quality Time",line:"How much quality time do you spend together?",lo:"Ships in the night",hi:"Fully present",qs:[
  ["Do you put the phones away when you're together?","Glued to them","Phones away"],
  ["Do you make time just for the two of you?","Never","Every week"],
  ["Are you interested in each other's day?","Not really","Want every detail"]],
  recs:["Phone-free dinners, at least three nights a week.","Lock in one night a week that's just the two of you.","Ask about each other's day, then ask a follow-up question."]},
 {id:"share",name:"Fair Share",line:"How fairly do you share the load at home?",lo:"One does it all",hi:"Equal partners",qs:[
  ["Are the chores shared fairly?","One does it all","Fifty-fifty"],
  ["Is the mental load (planning, remembering, organising) shared?","One carries it","Shared"],
  ["Do you both step up without being asked?","Need reminding","Just do it"]],
  recs:["Agree on two chores each that are always yours.","Split the remembering: birthdays, bills and bookings each get an owner.","Do one job a day before anyone has to ask."]},
 {id:"money",name:"Money & Plans",line:"How sorted are you with money and plans?",lo:"Chaos",hi:"Sorted",qs:[
  ["Are you on the same page with money?","Constant fights","Same page"],
  ["Are you open with each other about spending?","Secrets","Open book"],
  ["Are you planning the future together?","Living for today","Shared plan"]],
  recs:["Set a monthly money date to check in on spending and goals.","No secret spending. Talk before any big purchase.","Write down one shared goal for 2027 and the first step."]}
];
const PARTNER_GROUPS=[
  {id:"me",name:"Heart",blurb:"The foundations",ids:["kind","trust","fun"]},
  {id:"others",name:"Connection",blurb:"How close you are",ids:["talk","romance","support","qtime"]},
  {id:"life",name:"Life",blurb:"Running life together",ids:["share","money"]}];
const SETS={life:{key:"life",label:"Family & others",cats:LIFE_CATS,groups:LIFE_GROUPS},mates:{key:"mates",label:"Mates",cats:MATE_CATS,groups:MATE_GROUPS},partner:{key:"partner",label:"Partner",cats:PARTNER_CATS,groups:PARTNER_GROUPS}};
/* Crew types: which member type, words and leaderboard awards go with each. */
const CREW_TYPES={
  family:{member:"family",word:"Family",review:"Family Review",crew:"Family crew",top:"🏆 Family Award",low:"🤝 Family Support Required"},
  mates:{member:"mate",word:"Mate",review:"Mate Review",crew:"Mates crew",top:"🏆 MVP Mate Award",low:"⚠️ Who's On Notice"},
  partner:{member:"partner",word:"Relationship",review:"Couple Check-in",crew:"Couple crew",top:"",low:""}};
const crewTypeOf=t=>CREW_TYPES[t]?t:"family";
const CREW_SUFFIX={family:"family",mates:"mates",partner:"love"};
const AUTO_NAME=/^(\d+)-(family|mates|love)$/;
const MEMBER_WORD={family:"Family",mate:"Mate",partner:"Partner"};
/* One tip per detailed question (same order as the questions), so ideas can target the lowest-scoring ones. */
const TIPS={
 self:["Block out one hour a week for bills, appointments and the admin that keeps getting put off.","After a stuff-up, talk to yourself the way you'd talk to a mate.","Pick one thing to say no to next year and stick to it."],
 health:["Aim for a 30 minute walk or session most days.","Swap a few takeaway meals or drinks each week for something decent.","Set a bedtime and keep the phone out of the bedroom."],
 clean:["Clean up as you go: dishes away, clothes off the floor.","Pick one room or space each week and give it a proper tidy.","Do a chore before anyone has to ask."],
 mates:["Put a regular catch-up in the calendar with your closest two or three mates.","Bring good energy: ask how they're really going, listen, and leave the whinging at home.","Be the one who sends the first message."],
 others:["Help out with one family, community or charity thing each quarter.","Leave every place a bit better than you found it.","When something's off, say so early and calmly."],
 love:["Tell the people you love that you do, out loud, this week.","Have one phone-free night a week with family or partner.","Count to five before snapping at home."],
 action:["Only say yes to what you'll really do, then write it down and tick it off.","Do the worst job first thing each morning.","Pick one piece of work each week and give it your absolute best."],
 growth:["Pick one skill, course or book to get through each quarter.","When someone gives feedback, say \"fair point\" before defending yourself.","Write down one good thing at the end of each day."],
 humour:["Plan one thing each month purely for fun.","Share the funny stuff with someone who needs a laugh.","Be the first to laugh when you stuff up."],
 vibe:["Bring the energy: be the one who suggests the next plan.","Leave the whinging at the door for the next catch-up and see how it lands.","Let the small stuff slide. Not every hill needs dying on."],
 banter:["Keep the group chat alive with one decent message a week.","Cop the next ribbing with a laugh before firing back.","Read the room. If a mate's having a rough trot, ease off."],
 generous:["Get the first round in next time.","Offer a hand with a mate's move, reno or job hunt before they ask.","Lend the gear, share the contact, pass on the tip."],
 mclean:["Shower, deodorant, clean clothes: every time you head out.","Give the car and your place a proper clean once a week.","At a mate's place, clean up before you leave."],
 reliable:["Stop saying maybe. Give a straight yes or no.","Turn up on time to the next three catch-ups.","Be the mate who answers the 2am call."],
 loyal:["Only say things about a mate you'd say to their face.","What's told in confidence stays there.","Check in on the mate who's gone quiet."],
 adventure:["Say yes to the next thing you'd normally knock back.","Book one trip or weekend away with the crew this year.","Try something none of you have done before."],
 social:["Put a standing monthly catch-up in the calendar.","Introduce two mates who'd get on.","Make the new person in the group feel part of it."]};
Object.values(SETS).forEach(s=>s.cats.forEach(c=>{c.group=s.groups.find(g=>g.ids.includes(c.id));c.tips=TIPS[c.id]||c.recs;c.recs=c.tips}));
const setForType=t=>t==="mate"?"mates":t==="partner"?"partner":"life";
let CATS=LIFE_CATS, GROUPS=LIFE_GROUPS, curSet="";
const VERDICTS={A:"Absolute legend of a year.",B:"Solid year. A few things to polish.",C:"Middle of the ladder. Room to climb.",D:"Tough season. Time for a reset.",E:"Rough one. Next year starts now."};
const P={me:{you:"you",your:"your",yourself:"yourself",are:"are"},other:{you:"they",your:"their",yourself:"themselves",are:"are"}};
const KEY="eoy-review-2026";
let state={who:"me",name:"",v:{},dk:{}};
try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v)state=Object.assign(state,s)}catch(e){}
/* Older saved answers had area scores filled in automatically (everything started at C, or at an old slider
   value), which showed as grades nobody chose. Drop those: area grades now only come from questions you answer. */
if(state.schema!==3){Object.keys(state.v||{}).forEach(k=>{if(/t$/.test(k))delete state.v[k]});Object.keys(state.dk||{}).forEach(k=>{if(/t$/.test(k))delete state.dk[k]});delete state.legacyT;
  Object.values(state.drafts||{}).forEach(d=>{Object.keys(d.v||{}).forEach(k=>{if(/t$/.test(k))delete d.v[k]});delete d.legacyT});if(!Object.keys(state.v).length)state.revealed=false;state.schema=3}
/* Links from the landing page: ?who=me|family|mate picks what you're rating; ?go=join opens crew search. */
const LAND=new URLSearchParams(location.search);
if(["me","family","mate","partner"].includes(LAND.get("who"))){if(state.who!==LAND.get("who"))state.revealed=false;state.who=LAND.get("who");if(state.who!=="me")state.other=state.who;delete state.qset}
if(state.who==="friend")state.who="mate";
if(!state.dk)state.dk={};
delete state.mode;delete state.src;delete state.dt;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
/* Letter bands: A 8.5+, B 7+, C 5.5+, D 4+, E below. Each band splits into thirds: lower = "-", middle = plain, upper = "+". */
const BANDS=[["A",8.5,10],["B",7,8.5],["C",5.5,7],["D",4,5.5],["E",1,4]];
const grade=a=>{
  const [L,lo,hi]=BANDS.find(b=>a>=b[1])||BANDS[4];
  const t=(Math.min(a,hi)-lo)/(hi-lo);
  return L+(t>=2/3-1e-9?"+":t<1/3-1e-9?"-":"");
};
const gcol=g=>`var(--g${g[0]})`;
/* Sliders score in 5 grades, E up to A. Each is stored as the middle of its grade band (1-10 scale),
   so averages (which can land on a + or -), the wheel and saved reviews keep working. */
const GSTEPS=["E","D","C","B","A"];
const GVAL=[2.5,4.75,6.25,7.75,9.25];
const toStep=v=>Math.max(0,GSTEPS.indexOf(grade(v)[0]));
const val=(c,i)=>state.v[c+i]??null;
const isMe=()=>state.who==="me";
const activeSet=()=>SETS[state.qset]?state.qset:setForType(state.who);
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
/* The quick (top) question is the master score. Answering detailed questions sets it to their average. */
const topScore=c=>state.dk[c.id+"t"]?null:(state.v[c.id+"t"]??null);
const answeredDetails=c=>c.qs.map((_,i)=>c.id+i).filter(k=>state.v[k]!=null&&!state.dk[k]);
const detailScore=c=>{const ks=answeredDetails(c);return ks.length?mean(ks.map(k=>state.v[k])):null};
const catScore=c=>topScore(c);
const fmt=v=>Number.isInteger(v)?String(v):v.toFixed(1);
/* Each area is scored by the average of its answered questions. Unanswered questions are left out (no default).
   The area score is kept in the hidden "t" slot so saved reviews, crew reports and the leaderboard keep working.
   All three Don't know = no score. Older reviews that only have an area score keep it until a question is answered. */
function syncTop(c){
  const ans=c.qs.map((_,i)=>i).filter(i=>!state.dk[c.id+i]&&state.v[c.id+i]!=null), t=c.id+"t";
  if(ans.length){state.v[t]=Math.round(mean(ans.map(i=>state.v[c.id+i]))*100)/100;delete state.dk[t];return}
  if(c.qs.every((_,i)=>state.dk[c.id+i])){state.dk[t]=true;delete state.v[t];return}
  delete state.dk[t];
  delete state.v[t];
}
const isAnswered=k=>!!state.dk[k]||state.v[k]!=null;
const progress=()=>{let n=0,t=0;CATS.forEach(c=>c.qs.forEach((_,i)=>{t++;if(isAnswered(c.id+i))n++}));return {n,t}};
function fill(t){const p=isMe()?P.me:P.other;
  return t.replace(/\{(you|your|yourself|are)\}/g,(_,k)=>p[k])
          .replace(/(^|[.?!]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $m=id=>document.getElementById(id);

/* ---------- category cards ---------- */
const qHTML=(key,lo,hi)=>`<div class="q" id="q-${key}"><p id="l-${key}"></p><div class="ends" aria-hidden="true"><span>${lo}</span><span id="e-${key}">${hi}</span></div>
   <div class="gseg" id="r-${key}" role="radiogroup" aria-labelledby="l-${key}">${GSTEPS.map((g,st)=>`<button type="button" role="radio" aria-checked="false" data-step="${st}" aria-label="${g}${st===0?` (${esc(lo)})`:st===4?` (${esc(hi)})`:""}">${g}</button>`).join("")}</div>
   <div class="q-ctrl"><button type="button" class="dkchip" id="k-${key}" aria-pressed="false">Don't know</button></div></div>`;
const host=$m("cats");
function buildCards(){
host.innerHTML="";
CATS.forEach((c,ci)=>{
  if(c.group.ids[0]===c.id){const gh=document.createElement("div");gh.className="group-head g-"+c.group.id;gh.innerHTML=`<h2>${c.group.name}</h2><span>${c.group.blurb}</span>`;host.appendChild(gh)}
  const s=document.createElement("section");s.className="cat";s.id="cat-"+c.id;
  s.innerHTML=`<div class="cat-head"><div><h2><span class="num">${ci+1}</span>${c.name}</h2></div><div class="grade" id="g-${c.id}" aria-label="${c.name} grade">C</div></div>
  <div class="src-block" id="tb-${c.id}">${qHTML(c.id+"t",c.lo,"")}
  <details class="more" id="d-${c.id}"><summary><span>Detailed questions</span><small id="ds-${c.id}"></small></summary><div class="more-body">`+
  c.qs.map((q,i)=>qHTML(c.id+i,q[1],q[2])).join("")+`</div></details></div>`;
  host.appendChild(s);
  ["t",0,1,2].forEach(i=>{
    const key=c.id+i, r=s.querySelector(`#r-${key}`), k=s.querySelector(`#k-${key}`);
    /* Tap a grade to choose it; tap it again to clear it. */
    r.addEventListener("click",e=>{const b=e.target.closest("button[data-step]");if(!b)return;const v=GVAL[+b.dataset.step];
      if(state.v[key]===v&&!state.dk[key])delete state.v[key];else state.v[key]=v;delete state.dk[key];syncTop(c);save();render()});
    /* Arrow keys move within the grade buttons, like a radio group. */
    r.addEventListener("keydown",e=>{const d={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1}[e.key];if(!d)return;e.preventDefault();
      const cur=state.v[key]==null?(d>0?-1:5):toStep(state.v[key]),nx=Math.max(0,Math.min(4,cur+d));state.v[key]=GVAL[nx];delete state.dk[key];syncTop(c);save();render();r.querySelectorAll("button")[nx].focus()});
    k.addEventListener("click",()=>{if(state.dk[key])delete state.dk[key];else state.dk[key]=true;syncTop(c);save();render()});
  });
});
}
/* All detailed questions are always open. */
function applyMode(){CATS.forEach(c=>{const d=$m("d-"+c.id);if(d)d.open=true})}
/* Me / Someone else: "Someone else" keeps the last family-or-mates choice (family by default). */
const pickWho=w=>{const r=$m("who-"+w);if(r&&!r.checked){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}))}};
$m("whoMe").onclick=()=>pickWho("me");
$m("whoOther").onclick=()=>pickWho(["mate","partner"].includes(state.other)?state.other:"family");
const nameEl=$m("name");nameEl.value=state.name||"";
nameEl.addEventListener("input",()=>{state.name=nameEl.value.trim();save();render()});
document.querySelectorAll('input[name=who]').forEach(r=>{
  r.checked=r.value===state.who;
  r.addEventListener("change",()=>{
    /* Your own review and a review of someone else are kept as separate drafts, so one never pre-fills or overwrites the other. */
    const dk=w=>w==="me"?"me":"other", from=dk(state.who), to=dk(r.value);
    if(from!==to){state.drafts=state.drafts||{};state.drafts[from]={v:state.v,dk:state.dk,name:state.name,revealed:!!state.revealed,legacyT:!!state.legacyT};
      const d=state.drafts[to]||{};state.v=d.v||{};state.dk=d.dk||{};state.name=d.name||"";state.revealed=!!d.revealed;state.legacyT=!!d.legacyT;nameEl.value=state.name}
    else if(state.who!==r.value)state.revealed=false;
    state.who=r.value;if(r.value!=="me")state.other=r.value;delete state.qset;save();render()});
});

/* ---------- wheel (drawn twice: header and report card) ---------- */
const WH={r0:30,R:104,gap:1.6};
const pt=(r,a)=>`${(r*Math.cos(a)).toFixed(2)} ${(r*Math.sin(a)).toFixed(2)}`;
const rad=d=>d*Math.PI/180;
function wedge(a0,a1,r0,r1){
  const A0=rad(a0),A1=rad(a1);
  return `M${pt(r0,A0)} L${pt(r1,A0)} A${r1} ${r1} 0 0 1 ${pt(r1,A1)} L${pt(r0,A1)} A${r0} ${r0} 0 0 0 ${pt(r0,A0)} Z`;
}
const arc=(r,a0,a1)=>`M${pt(r,rad(a0))} A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${pt(r,rad(a1))}`;
const WHEELS=["wheel","wheel2"];
function buildWheel(svgId){
  const svg=$m(svgId); let h="";
  [4,7,8.5].forEach(v=>{const r=WH.r0+(WH.R-WH.r0)*(v-1)/9;h+=`<circle class="ring" r="${r}"/>`});
  const st=360/CATS.length, hs=st/2;
  svg.setAttribute("aria-label",`Grades for the ${CATS.length} areas`);
  GROUPS.forEach(g=>{
    const i0=CATS.findIndex(c=>c.id===g.ids[0]), i1=CATS.findIndex(c=>c.id===g.ids[g.ids.length-1]);
    h+=`<path class="garc g-${g.id}" d="${arc(WH.R+6,-90+st*i0-hs+WH.gap,-90+st*i1+hs-WH.gap)}"/>`;
  });
  CATS.forEach((c,i)=>{
    const mid=-90+st*i, a0=mid-hs+WH.gap, a1=mid+hs-WH.gap;
    const lx=(WH.R+17)*Math.cos(rad(mid)), ly=(WH.R+17)*Math.sin(rad(mid));
    const cx=Math.cos(rad(mid)), anchor=cx>0.3?"start":cx<-0.3?"end":"middle";
    const dy=Math.sin(rad(mid))>0.5?"0.9em":Math.sin(rad(mid))<-0.5?"-0.2em":"0.35em";
    h+=`<g class="wseg" data-cat="${c.id}" tabindex="0" role="link" aria-label="${c.name}">
      <path class="wtrack" d="${wedge(a0,a1,WH.r0,WH.R)}"/>
      <path class="wfill" data-f="${c.id}" d="${wedge(a0,a1,WH.r0,WH.r0)}"/>
      <text class="wlabel" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" dy="${dy}" text-anchor="${anchor}"><tspan class="wnum">${i+1}</tspan> ${esc(c.name)}</text>
      <text class="wscore" data-s="${c.id}" x="${((WH.R-13)*Math.cos(rad(mid))).toFixed(1)}" y="${((WH.R-13)*Math.sin(rad(mid))).toFixed(1)}" dy="0.35em" text-anchor="middle"></text>
    </g>`;
  });
  h+=`<circle class="wcenter" r="${WH.r0-3}"/><text class="wgrade" data-c="1" dy="0.36em" text-anchor="middle">–</text>`;
  svg.innerHTML=h;
  svg.querySelectorAll(".wseg").forEach(g=>{
    const go=()=>$m("cat-"+g.dataset.cat).scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
    g.addEventListener("click",go);
    g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}});
  });
}
function drawWheel(rows,overall){
  const st=360/CATS.length, hs=st/2;
  WHEELS.forEach(id=>{
    const svg=$m(id);
    rows.forEach((r,i)=>{
      const mid=-90+st*i, a0=mid-hs+WH.gap, a1=mid+hs-WH.gap;
      const f=svg.querySelector(`[data-f="${r.c.id}"]`), t=svg.querySelector(`[data-s="${r.c.id}"]`);
      if(r.avg==null){f.setAttribute("d",wedge(a0,a1,WH.r0,WH.r0));t.textContent="?";t.setAttribute("class","wscore muted-t");return}
      f.setAttribute("d",wedge(a0,a1,WH.r0,WH.r0+(WH.R-WH.r0)*(r.avg-1)/9));
      f.style.fill=gcol(r.g); t.textContent=r.g; t.setAttribute("class","wscore");
    });
    svg.querySelector("[data-c]").textContent=overall==null?"–":grade(overall);
  });
}
/* Switch question set: rebuild the cards, wheels and legend. */
function useSet(k){
  if(k===curSet) return;
  curSet=k; CATS=SETS[k].cats; GROUPS=SETS[k].groups;
  buildCards(); WHEELS.forEach(buildWheel); applyMode();
  const legendHTML=GROUPS.map(g=>`<span class="lg g-${g.id}"><i></i>${g.name}</span>`).join("");
  document.querySelectorAll(".wlegend").forEach(el=>el.innerHTML=legendHTML);
}
const NUMW=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"];

/* ---------- render ---------- */
function words(){
  const me=isMe(),n=state.name;
  return {poss: me?(n?n+"'s":"Your"):(n?n+"'s":"Their")};
}
/* What kind of review this is: a crew review follows the crew's type; otherwise the button picked. */
const KIND_LABEL={me:"Personal Review",family:"Family Review",mates:"Mate Review",partner:"Couple Check-in"};
const reviewKind=()=>state.qset?(state.qset==="mates"?"mates":state.qset==="partner"?"partner":"family"):state.who==="family"?"family":state.who==="mate"?"mates":state.who==="partner"?"partner":"me";
/* Report card title: "<Name> Family Report Card", "<Name> Mate Report Card", "<Name> Personal Report Card". */
const KIND_WORD={me:"Personal",family:"Family",mates:"Mate",partner:"Partner"};
function cardTitle(){const n=(state.name||"").trim(), kk=reviewKind(), k=KIND_WORD[kk];
  if(kk==="me") return n?`${n} Report Card`:"Your Report Card";
  if(kk==="partner") return "Your Love Report";
  return n?`${n} ${k} Report Card`:isMe()?`Your ${k} Report Card`:`${k} Report Card`}
/* Ideas for an area: tips for its two lowest-scoring detailed questions, or its general tips if none were answered. */
function tipsFor(c,max){const qs=c.qs.map((q,i)=>({i,v:state.dk[c.id+i]?null:val(c.id,i)})).filter(x=>x.v!=null).sort((a,b)=>a.v-b.v||a.i-b.i);
  return {targeted:qs.length>0,tips:qs.length?qs.slice(0,2).map(x=>c.tips[x.i]):c.tips.slice(0,max||3)}}
const HEROES={
  me:{h:"End Of Year <span>Review</span>",t:""},
  family:{h:"End Of Year <span>Family Review</span>",t:"",awards:["🏆 Family Award","🤝 Family Support Required"]},
  mates:{h:"End Of Year <span>Mate Review</span>",t:"",awards:["🏆 MVP Mate Award","⚠️ Who's On Notice"]},
  partner:{h:"End Of Year <span>Couple Check-in</span>",t:"",awards:["💪 Our Top Qualities","💐 Date Night Required"]}};
/* End of the report card: "Invite Your Family / Mates / Partner" (opens My Crew to set up or share the invite link). */
function paintEndInvite(){
  const eb=document.getElementById("endCreate"); if(!eb) return;
  const k=reviewKind(), o=state.other;
  const who=k==="partner"||(k==="me"&&o==="partner")?"partner":k==="mates"||(k==="me"&&o==="mate")?"mates":"family";
  const txt={family:["Invite Your Family","Send them the link so they can review you, and each other"],mates:["Invite Your Mates","Send them the link so they can review you, and each other"],partner:["Invite Your Partner","Send them the link so you can both check in on your relationship"]}[who];
  const html=`<b>${txt[0]}</b><small>${txt[1]}</small>`; if(eb.innerHTML!==html) eb.innerHTML=html;
}
function render(){
  /* Highlight the question set whose wheel is showing, including your own review ("me" uses the family wheel). */
  {const as=activeSet();[["who-family","life"],["who-mate","mates"],["who-partner","partner"]].forEach(([id,set])=>{const r=$m(id);if(r&&r.parentElement)r.parentElement.classList.toggle("on",set===as)})}
  CATS.forEach(syncTop);
  paintEndInvite();
  useSet(activeSet());
  const hk=reviewKind();
  $m("reviewKind").textContent=KIND_LABEL[hk];
  if($m("heroH1").dataset.k!==hk){$m("heroH1").dataset.k=hk;$m("heroH1").innerHTML=HEROES[hk].h;$m("heroTag").textContent=HEROES[hk].t;$m("heroTag").hidden=!HEROES[hk].t;
    const aw=HEROES[hk].awards||[];$m("heroAwards").innerHTML=aw.map((t,i)=>`<span class="pop${i?" low":""}">${t}</span>`).join("");$m("heroAwards").hidden=!aw.length}
  const me=isMe(),w=words();
  $m("lede").innerHTML=[`${NUMW[CATS.length]} areas, three quick questions each.`,"Tap a grade for each question: E (lowest) to A (highest).","Not sure? Tap Don't know and it's left out."].map(t=>`<li>${t}</li>`).join("");
  $m("nameLabel").textContent="Name:";
  $m("whoMe").setAttribute("aria-pressed",me); $m("whoOther").setAttribute("aria-pressed",!me);
  nameEl.placeholder=me?"e.g. Brad":(state.who==="mate"?"e.g. Dave":state.who==="partner"?"e.g. Sam":"e.g. Mum");

  const rows=CATS.map((c,ci)=>{
    $m(`l-${c.id}t`).textContent=fill(c.line);
    $m(`e-${c.id}t`).textContent=fill(c.hi);
    c.qs.forEach((q,i)=>{$m(`l-${c.id}${i}`).textContent=fill(q[0])});
    ["t",0,1,2].forEach(i=>{
      const key=c.id+i, r=$m("r-"+key), dk=!!state.dk[key], v=state.v[key], st=v==null||dk?-1:toStep(v);
      r.querySelectorAll("button").forEach((b,bi)=>{const on=bi===st;b.setAttribute("aria-checked",on);b.tabIndex=(st<0?bi===0:on)?0:-1;if(on)b.style.setProperty("--gsel",gcol(GSTEPS[bi]));});
      $m("k-"+key).setAttribute("aria-pressed",dk);
      $m("q-"+key).classList.toggle("is-dk",dk);
      $m("q-"+key).classList.toggle("unanswered",i!=="t"&&!dk&&v==null&&!!state.revealedTried);
    });
    const ds=detailScore(c), n=answeredDetails(c).length;
    $m("ds-"+c.id).textContent=ds==null?"3 more questions, optional":`${n} of 3 answered · average ${grade(ds)}`;
    const avg=catScore(c), g=avg==null?null:grade(avg);
    const ge=$m("g-"+c.id);ge.textContent=g||"?";ge.style.setProperty("--g",g?gcol(g):"var(--track)");
    ge.classList.toggle("unknown",!g);
    return {c,avg,g,i:ci};
  });
  const scored=rows.filter(r=>r.avg!=null);
  const avg=scored.length?mean(scored.map(r=>r.avg)):null, g=avg==null?null:grade(avg);
  drawWheel(rows,avg);
  {const pr=progress(), qp=$m("qprog"); if(qp){$m("qprogText").textContent=`${pr.n} of ${pr.t} answered`;$m("qprogBar").style.width=(pr.t?pr.n/pr.t*100:0)+"%";
    qp.hidden=document.body.classList.contains("admin-page")||document.body.classList.contains("join-page")}}
  $m("bigGrade").textContent=g||"–";
  $m("reportTitle").textContent=cardTitle();
  $m("verdict").textContent=g?VERDICTS[g[0]]:"Answer at least one area to get a grade.";
  const skipped=rows.length-scored.length;
  $m("avg").textContent=g?`Overall ${g} · ${avg.toFixed(1)} / 10${skipped?` · ${skipped} area${skipped===1?"":"s"} marked don't know`:""}`:"";

  const groupRows=GROUPS.map(gp=>{const vs=rows.filter(r=>gp.ids.includes(r.c.id)&&r.avg!=null).map(r=>r.avg);const v=vs.length?mean(vs):null;return {gp,v,g:v==null?null:grade(v),n:vs.length}});
  $m("groupScores").innerHTML=groupRows.map(({gp,v,g,n})=>`<div class="gscore g-${gp.id}"${g?` style="--g:${gcol(g)}"`:""}>
    <div class="gs-top"><span class="gs-name">${gp.name}</span><span class="chip${g?"":" none"}">${g||"?"}</span></div>
    <div class="gs-num">${v==null?"–":v.toFixed(1)}<small> / 10</small></div>
    <div class="gs-areas">${gp.ids.map(id=>CATS.find(c=>c.id===id).name).join(" · ")}</div></div>`).join("");
  const sorted=[...scored].sort((a,b)=>b.avg-a.avg||a.i-b.i);
  const top=sorted.slice(0,3), bottom=sorted.slice(Math.max(3,sorted.length-3)).reverse();
  const couple=reviewKind()==="partner";
  const li=(r,k,which)=>`<li style="--g:${gcol(r.g)}"><span class="chip">${r.g}</span><span class="nm">${r.c.name}${couple&&k===0?` <span class="ltag${which==="low"?" low":""}">${which==="low"?"💐 Date Night Required":"💪 Our Top Qualities"}</span>`:""}<small>${esc(r.avg>=5.5?fill(r.c.hi):r.c.lo)}</small></span><span class="sc">${r.avg.toFixed(1)}</span></li>`;
  const none=`<li class="none-li">Not enough answers yet</li>`;
  $m("top3").innerHTML=top.length?top.map((r,k)=>li(r,k,"top")).join(""):none;
  $m("bottom3").innerHTML=bottom.length?bottom.map((r,k)=>li(r,k,"low")).join(""):none;

  const two=bottom.slice(0,2);
  $m("recsTitle").textContent=couple?"Ideas to try together for the bottom two":me?"How to lift your bottom two":`Ideas to suggest to ${state.name||"them"} for the bottom two`;
  /* Ideas aim at the lowest-scoring detailed questions in each of the bottom two areas. */
  $m("recs").innerHTML=two.length?two.map(r=>{
    const T=tipsFor(r.c);
    const body=T.targeted
      ?`<ul>${T.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`
      :`<ul>${T.tips.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
    return `<div class="rec" style="--g:${gcol(r.g)}"><h4>${r.c.name} <span class="tag">${r.g} · ${r.avg.toFixed(1)}</span></h4>${body}</div>`}).join(""):`<p class="muted">Score at least four areas to see ideas for the bottom two.</p>`;

  if(window.afterRender) window.afterRender(rows,avg,g);
  window._summary=g?`${cardTitle()} (Rate My Year 2026): ${g} overall (${avg.toFixed(1)}/10). ${VERDICTS[g[0]]}\n\n${groupRows.map(x=>`${x.gp.name}: ${x.g?`${x.g} (${x.v.toFixed(1)})`:"don't know"}`).join(" · ")}\n\nTop 3:\n${top.map((r,k)=>`${k+1}. ${r.c.name} – ${r.g} (${r.avg.toFixed(1)})`).join("\n")}\n\nBottom 3:\n${bottom.map((r,k)=>`${k+1}. ${r.c.name} – ${r.g} (${r.avg.toFixed(1)})`).join("\n")}${two.length?`\n\nTo improve:\n${two.map(r=>`${r.c.name}\n${tipsFor(r.c).tips.map(t=>"- "+t).join("\n")}`).join("\n\n")}`:""}`:`${cardTitle()}: not enough answers yet.`;
}
render();

/* ---------- report card picture (PNG drawn on a canvas, always in the light palette) ---------- */
const PAL={bg:"#eef1ec",panel:"#ffffff",ink:"#14231b",muted:"#5a6b60",line:"#d5ddd6",green:"#0f4d32",gold:"#f2b705",blue:"#3f5fb5",track:"#dfe6e0",soft:"#e4ece6",A:"#1d7a46",B:"#3f7a1c",C:"#8a6700",D:"#b04f0c",E:"#c2362b"};
const FD='"Bowlby One","Arial Black",Impact,sans-serif', FB='"Figtree",system-ui,-apple-system,sans-serif', FM='"JetBrains Mono",Menlo,monospace';
async function makeCard(){
  try{await document.fonts.ready}catch(e){}
  const rows=CATS.map((c,i)=>{const avg=catScore(c);return {c,avg,g:avg==null?null:grade(avg),i}});
  const sc=rows.filter(r=>r.avg!=null), avg=sc.length?mean(sc.map(r=>r.avg)):null, G=avg==null?null:grade(avg);
  // ideas for the bottom two, wrapped to fit
  const sorted0=[...sc].sort((a,b)=>b.avg-a.avg||a.i-b.i), bot0=sorted0.slice(Math.max(3,sorted0.length-3)).reverse(), two=bot0.slice(0,2);
  const mx=document.createElement("canvas").getContext("2d"); mx.font=`500 25px ${FB}`;
  const wrap=(t,w)=>{const out=[];let line="";t.split(" ").forEach(word=>{const tryL=line?line+" "+word:word;if(mx.measureText(tryL).width>w&&line){out.push(line);line=word}else line=tryL});if(line)out.push(line);return out};
  const ideas=two.map(r=>({r,lines:tipsFor(r.c,2).tips.map(t=>wrap(t,860))}));
  const ideaH=ideas.length?70+ideas.reduce((s,d)=>s+70+d.lines.reduce((a,l)=>a+l.length*34+8,0),0):0;
  const W=1080,H=1500+ideaH+(ideaH?30:0),cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  const gc=g=>g?PAL[g[0]]:PAL.track;
  const rr=(X,Y,w,h,r)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()};
  const fit=(t,max)=>{if(x.measureText(t).width<=max)return t;while(t.length>1&&x.measureText(t+"…").width>max)t=t.slice(0,-1);return t+"…"};
  // page + card
  x.fillStyle=PAL.bg;x.fillRect(0,0,W,H);
  rr(30,30,W-60,H-60,28);x.fillStyle=PAL.panel;x.fill();
  x.save();rr(30,30,W-60,300,28);x.clip();x.fillStyle=PAL.green;x.fillRect(30,30,W-60,300);x.restore();
  // header
  const w=words(), poss=w.poss;
  x.fillStyle=PAL.gold;x.font=`700 24px ${FM}`;x.textBaseline="alphabetic";x.fillText(("RATE MY YEAR · 2026 · "+KIND_LABEL[reviewKind()]).toUpperCase(),80,100);
  x.fillStyle="#fff";x.font=`64px ${FD}`;x.font=`${cardTitle().length>22?48:58}px ${FD}`;x.fillText(fit(cardTitle(),690),80,180);
  x.font=`500 30px ${FB}`;x.fillText(fit(G?VERDICTS[G[0]]:"Not enough answers yet.",700),80,232);
  const V=window.__views, vline=V&&V.self!=null&&V.crew!=null?`Self ${grade(V.self)} ${V.self.toFixed(1)} · Crew ${grade(V.crew)} ${V.crew.toFixed(1)}`:"";
  x.font=`500 26px ${FM}`;x.globalAlpha=.85;x.fillText(G?(vline||`Overall ${G} · ${avg.toFixed(1)} / 10`):"",80,280);x.globalAlpha=1;
  x.save();x.translate(900,180);x.rotate(-3*Math.PI/180);rr(-95,-95,190,190,22);x.fillStyle=PAL.gold;x.fill();
  x.fillStyle=PAL.ink;x.font=`96px ${FD}`;x.textAlign="center";x.textBaseline="middle";x.fillText(G||"–",0,6);x.restore();
  // wheel
  const cx=540,cy=640,k=2.35,r0=WH.r0*k,R=WH.R*k,n=rows.length,st=2*Math.PI/n,gap=WH.gap*Math.PI/180;
  const ang=i=>-Math.PI/2+st*i;
  const wedgeP=(i,ra,rb)=>{const a0=ang(i)-st/2+gap,a1=ang(i)+st/2-gap;x.beginPath();x.arc(cx,cy,rb,a0,a1);x.arc(cx,cy,ra,a1,a0,true);x.closePath()};
  rows.forEach((r,i)=>{wedgeP(i,r0,R);x.fillStyle=PAL.track;x.fill();
    if(r.avg!=null){wedgeP(i,r0,r0+(R-r0)*(r.avg-1)/9);x.fillStyle=gc(r.g);x.fill()}});
  x.setLineDash([4,6]);x.strokeStyle=PAL.line;x.lineWidth=2;[4,7,8.5].forEach(v=>{x.beginPath();x.arc(cx,cy,r0+(R-r0)*(v-1)/9,0,2*Math.PI);x.stroke()});x.setLineDash([]);
  const gcols={me:PAL.green,others:PAL.gold,life:PAL.blue};
  GROUPS.forEach(g=>{const i0=CATS.findIndex(c=>c.id===g.ids[0]),i1=CATS.findIndex(c=>c.id===g.ids[g.ids.length-1]);
    x.beginPath();x.arc(cx,cy,R+14,ang(i0)-st/2+gap,ang(i1)+st/2-gap);x.strokeStyle=gcols[g.id];x.lineWidth=9;x.lineCap="round";x.stroke()});
  rows.forEach((r,i)=>{const a=ang(i),c=Math.cos(a),s=Math.sin(a);
    x.font=`700 27px ${FB}`;x.fillStyle=PAL.ink;x.textAlign=c>0.3?"left":c<-0.3?"right":"center";x.textBaseline=s>0.5?"top":s<-0.5?"bottom":"middle";
    x.fillText(r.c.name,cx+(R+34)*c,cy+(R+34)*s);
    x.font=`26px ${FD}`;x.textAlign="center";x.textBaseline="middle";const t=r.g||"?";const tx=cx+(R-32)*c,ty=cy+(R-32)*s;
    x.lineWidth=7;x.strokeStyle=PAL.panel;x.strokeText(t,tx,ty);x.fillStyle=r.g?PAL.ink:PAL.muted;x.fillText(t,tx,ty)});
  x.beginPath();x.arc(cx,cy,r0-6,0,2*Math.PI);x.fillStyle=PAL.panel;x.fill();x.strokeStyle=PAL.line;x.lineWidth=2;x.stroke();
  x.fillStyle=PAL.green;x.font=`44px ${FD}`;x.textAlign="center";x.textBaseline="middle";x.fillText(G||"–",cx,cy+3);
  // group scores
  const gy=990,gw=(W-160-2*24)/3;
  GROUPS.forEach((g,j)=>{const vs=g.ids.map(id=>rows.find(r=>r.c.id===id).avg).filter(v=>v!=null),v=vs.length?mean(vs):null,gg=v==null?null:grade(v),X=80+j*(gw+24);
    rr(X,gy,gw,140,16);x.fillStyle=PAL.soft;x.fill();x.save();rr(X,gy,gw,140,16);x.clip();x.fillStyle=gcols[g.id];x.fillRect(X,gy,gw,8);x.restore();
    x.textAlign="left";x.textBaseline="alphabetic";x.fillStyle=PAL.ink;x.font=`34px ${FD}`;x.fillText(g.name,X+20,gy+60);
    x.font=`700 38px ${FM}`;const vt=v==null?"–":v.toFixed(1),vw=x.measureText(vt).width;x.fillText(vt,X+20,gy+115);if(v!=null){x.font=`500 22px ${FM}`;x.fillStyle=PAL.muted;x.fillText(" / 10",X+20+vw,gy+115)}
    x.beginPath();x.arc(X+gw-42,gy+50,28,0,2*Math.PI);x.fillStyle=gc(gg);x.fill();x.fillStyle="#fff";x.font=`22px ${FD}`;x.textAlign="center";x.textBaseline="middle";x.fillText(gg||"?",X+gw-42,gy+52)});
  // top 3 / bottom 3
  const sorted=[...sc].sort((a,b)=>b.avg-a.avg||a.i-b.i), top=sorted.slice(0,3), bot=sorted.slice(Math.max(3,sorted.length-3)).reverse();
  const list=(title,items,X)=>{x.textAlign="left";x.textBaseline="alphabetic";x.fillStyle=PAL.muted;x.font=`700 22px ${FM}`;x.fillText(title,X,1180);
    items.forEach((r,k)=>{const Y=1200+k*58;rr(X,Y,440,50,10);x.fillStyle=PAL.soft;x.fill();
      x.beginPath();x.arc(X+26,Y+25,17,0,2*Math.PI);x.fillStyle=gc(r.g);x.fill();x.fillStyle="#fff";x.font=`15px ${FD}`;x.textAlign="center";x.textBaseline="middle";x.fillText(r.g,X+26,Y+26);
      x.textAlign="left";x.fillStyle=PAL.ink;x.font=`700 25px ${FB}`;x.fillText(fit(r.c.name,300),X+56,Y+26);
      x.textAlign="right";x.font=`700 24px ${FM}`;x.fillText(r.avg.toFixed(1),X+424,Y+26)})};
  list("TOP 3",top,80);list("BOTTOM 3",bot,560);
  if(ideas.length){
    let y=1420;
    x.textAlign="left";x.textBaseline="alphabetic";x.fillStyle=PAL.muted;x.font=`700 22px ${FM}`;
    x.fillText((reviewKind()==="partner"?"IDEAS TO TRY TOGETHER":reviewKind()==="me"||isMe()?"HOW TO LIFT YOUR BOTTOM TWO":"IDEAS FOR THE BOTTOM TWO"),80,y+10); y+=30;
    ideas.forEach(({r,lines})=>{
      const boxH=60+lines.reduce((a,l)=>a+l.length*34+8,0);
      rr(80,y,920,boxH,14);x.fillStyle=PAL.soft;x.fill();
      x.save();rr(80,y,920,boxH,14);x.clip();x.fillStyle=gc(r.g);x.fillRect(80,y,8,boxH);x.restore();
      x.fillStyle=PAL.ink;x.font=`30px ${FD}`;x.textBaseline="alphabetic";x.fillText(r.c.name,108,y+42);
      const nw=x.measureText(r.c.name).width;x.font=`700 20px ${FM}`;x.fillStyle=gc(r.g);x.fillText(`${r.g} · ${r.avg.toFixed(1)}`,108+nw+16,y+40);
      let ty=y+80; x.font=`500 25px ${FB}`;x.fillStyle=PAL.ink;
      lines.forEach(ls=>{ls.forEach((l,k)=>{if(k===0){x.beginPath();x.arc(116,ty-9,5,0,2*Math.PI);x.fill()}x.fillText(l,132,ty);ty+=34});ty+=8});
      y+=boxH+16;
    });
  }
  x.textAlign="center";x.textBaseline="alphabetic";x.fillStyle=PAL.muted;x.font=`600 26px ${FB}`;x.fillText("Rate yours at ratemyyear.com",W/2,H-45);
  {x.font=`40px ${FD}`;const t1="Feedback is a ",t2="GIFT",w1=x.measureText(t1).width,w2=x.measureText(t2).width,X0=W/2-(w1+w2+16)/2,Y=H-110;
   x.textAlign="left";x.fillStyle=PAL.ink;x.fillText(t1,X0,Y);x.fillStyle=PAL.gold;x.beginPath();x.roundRect?x.roundRect(X0+w1,Y-38,w2+16,52,6):x.rect(X0+w1,Y-38,w2+16,52);x.fill();x.fillStyle="#14231b";x.fillText(t2,X0+w1+8,Y);x.textAlign="center"}
  return await new Promise(res=>cv.toBlob(res,"image/png"));
}
window.makeCard=makeCard;
setTimeout(()=>{const b=$m("famBody");if(b&&/^Loading…$/.test(b.textContent.trim()))b.innerHTML=`<p class="err">The crew tools didn't load.</p><p class="muted">This usually means the connection to Google Firebase was blocked. Check your internet, turn off any content blocker or private relay for this site, then reload. You can still do a review on your own below.</p>`},15000);

const toast=$m("toast");
const say=m=>{toast.classList.remove("err");toast.textContent=m;setTimeout(()=>{if(toast.textContent===m)toast.textContent=""},2500)};
$m("copy").addEventListener("click",()=>{
  (navigator.clipboard&&window.isSecureContext?navigator.clipboard.writeText(window._summary):Promise.reject()).then(()=>say("Copied")).catch(()=>{
    const r=document.createRange();r.selectNodeContents(document.querySelector(".report-body"));const s=getSelection();s.removeAllRanges();s.addRange(r);say("Selected. Press Ctrl+C or Cmd+C to copy.")});
});
/* Start again: asks first, then clears this review's answers (the other draft is kept). */
$m("startOver").onclick=()=>{if(!progress().n&&!state.name){say("Nothing to clear yet.");return}$m("startAsk").hidden=false};
$m("startNo").onclick=()=>{$m("startAsk").hidden=true};
$m("startYes").onclick=()=>{$m("startAsk").hidden=true;state.v={};state.dk={};state.revealed=false;state.legacyT=false;state.revealedTried=false;
  if(state.who==="me"){}else{state.name="";nameEl.value=""}save();useSet(activeSet());applyMode();render();say("Cleared. Start again whenever you're ready.");window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})};
const resetBtn=$m("reset");let armed=false;
resetBtn.addEventListener("click",()=>{
  if(!armed){armed=true;resetBtn.textContent="Tap again to clear";setTimeout(()=>{armed=false;resetBtn.textContent="Start again"},3000);return}
  state={who:state.who,name:"",v:{},dk:{}};save();useSet(activeSet());nameEl.value="";applyMode();
  armed=false;resetBtn.textContent="Start again";render();say("Cleared");
});
/* Show / hide for password fields. */
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".pwshow");if(!b)return;const f=document.getElementById(b.dataset.for);if(!f)return;const show=f.type==="password";f.type=show?"text":"password";b.textContent=show?"Hide":"Show";b.setAttribute("aria-pressed",show)});
