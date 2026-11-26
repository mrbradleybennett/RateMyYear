#!/usr/bin/env python3
"""Build the review pages from src/review.src.html (the one file you edit).

Outputs:
  index.html, review.html, join.html, mycrew.html   the pages (index.html is the same as review.html) (same app, different mode)
  js/app.js                            the page script (questions, scoring, report card)
  js/crew.js                           the crew script (Firebase, crews, sharing)
The scripts are separate files so the browser downloads them once and caches them for all three pages.
Run:  python3 tools/build-pages.py
"""
import hashlib,os,re
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *a:os.path.join(root,*a)
src=open(P("src","review.src.html"),encoding="utf-8").read()
cls=re.search(r'\n<script>\n(.*?)\n</script>\n',src,re.S)
mod=re.search(r'\n<script type="module">\n(.*?)\n</script>\n',src,re.S)
assert cls and mod, "couldn't find the two script blocks"
os.makedirs(P("js"),exist_ok=True)
def write(path,text):
    open(path,"w",encoding="utf-8").write(text); return hashlib.sha1(text.encode()).hexdigest()[:10]
ha=write(P("js","app.js"),cls.group(1)+"\n")
hc=write(P("js","crew.js"),mod.group(1)+"\n")
page=src[:cls.start()]+f'\n<script src="js/app.js?v={ha}"></script>\n'+src[cls.end():mod.start()]+f'\n<script type="module" src="js/crew.js?v={hc}"></script>\n'+src[mod.end():]
def variant(title,body,h2,mode):
    s=page
    if mode:
        s=s.replace("<title>End Of Year Review</title>",f"<title>{title}</title>",1)
        s=s.replace('<body class="entry-rate">',f'<body class="{body}">',1)
        s=s.replace('<h2 id="famH2">Review My Crew</h2>',f'<h2 id="famH2">{h2}</h2>',1)
        s=s.replace('<script type="module" src=',f'<script>window.RMY_PAGE="{mode}";</script>\n<script type="module" src=',1)
    return s
NOTE="<!-- Built from src/review.src.html by tools/build-pages.py. Edit that file, not this one. -->\n"
def out(name,text):
    # keep <!doctype html> first so the page renders in standards mode
    text=text.replace("<!doctype html>\n","<!doctype html>\n"+NOTE,1)
    open(P(name),"w",encoding="utf-8").write(text)
out("review.html",variant("","","",""))
out("index.html",variant("","","","").replace("<title>End Of Year Review</title>","<title>Rate My Year · End of Year Performance Review</title>",1))   # the home page opens straight on Rate
for name,args in {"mycrew.html":("My Crew · Rate My Year","admin-page","My Crew","admin"),
                  "join.html":("Join A Crew · Rate My Year","join-page","Join A Crew","join")}.items():
    out(name,variant(*args))
print("built index.html, review.html, join.html, mycrew.html, js/app.js, js/crew.js")
