import os,json,datetime,requests
TOKEN=os.environ["TMDB_TOKEN"]
BASE="https://api.themoviedb.org/3"
HEAD={"Authorization":f"Bearer {TOKEN}","accept":"application/json"}
TODAY=datetime.date.today(); END=TODAY+datetime.timedelta(days=45); REGION="BR"
def get(path,params):
 r=requests.get(BASE+path,headers=HEAD,params=params,timeout=30); r.raise_for_status(); return r.json()
providers=get("/watch/providers/movie",{"language":"pt-BR","watch_region":REGION}).get("results",[])
wanted=["Netflix","Prime Video","Disney Plus","Max","Globoplay","Paramount Plus","Apple TV","MUBI"]
wanted_ids={p["provider_id"] for p in providers if p["provider_name"] in wanted}
items=[]
for typ,path in [("movie","/discover/movie"),("tv","/discover/tv")]:
 p={"language":"pt-BR","region":REGION,"watch_region":REGION,"include_adult":"false","sort_by":"popularity.desc","page":1,"with_watch_monetization_types":"flatrate","with_watch_providers":"|".join(map(str,wanted_ids))}
 if typ=="movie": p.update({"primary_release_date.gte":TODAY.isoformat(),"primary_release_date.lte":END.isoformat(),"with_release_type":"4|6"})
 else: p.update({"first_air_date.gte":TODAY.isoformat(),"first_air_date.lte":END.isoformat()})
 for x in get(path,p).get("results",[]):
  date=x.get("release_date") if typ=="movie" else x.get("first_air_date")
  if not date: continue
  d=get(f"/{'movie' if typ=='movie' else 'tv'}/{x['id']}/watch/providers",{})
  flat=d.get("results",{}).get(REGION,{}).get("flatrate",[])
  ps=[{"id":q["provider_id"],"name":q["provider_name"],"logo":q.get("logo_path")} for q in flat if not wanted_ids or q["provider_id"] in wanted_ids]
  if not ps: continue
  items.append({"id":x["id"],"type":typ,"title":x.get("title") or x.get("name"),"release_date":date,"poster":"https://image.tmdb.org/t/p/w500"+x["poster_path"] if x.get("poster_path") else "","overview":x.get("overview") or "Sinopse não disponível.","providers":ps[:5],"tmdb_url":f"https://www.themoviedb.org/{'movie' if typ=='movie' else 'tv'}/{x['id']}"})
items.sort(key=lambda x:(x["release_date"],x["title"]))
os.makedirs("data",exist_ok=True)
with open("data/catalog.json","w",encoding="utf-8") as f: json.dump({"updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"region":"BR","items":items},f,ensure_ascii=False,indent=2)
print("Itens:",len(items))