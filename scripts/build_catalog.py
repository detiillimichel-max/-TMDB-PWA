import os,json,datetime,requests

API_KEY=os.environ["TMDB_API_KEY"]
BASE="https://api.themoviedb.org/3"
HEAD={"accept":"application/json"}
TODAY=datetime.date.today()
START=TODAY-datetime.timedelta(days=45)
END=TODAY+datetime.timedelta(days=45)
REGION="BR"

def get(path,params):
    params=dict(params)
    params["api_key"]=API_KEY
    r=requests.get(BASE+path,headers=HEAD,params=params,timeout=30)
    r.raise_for_status()
    return r.json()

# Providers are optional for cinema titles. We keep them when TMDB has them,
# but a movie must NOT disappear just because streaming availability is unknown.
providers=get("/watch/providers/movie",{"language":"pt-BR","watch_region":REGION}).get("results",[])
wanted=["Netflix","Prime Video","Disney Plus","Max","Globoplay","Paramount Plus","Apple TV","MUBI"]
wanted_ids={p["provider_id"] for p in providers if p["provider_name"] in wanted}

items=[]
for typ,path in [("movie","/discover/movie")]:
    p={
        "language":"pt-BR",
        "region":REGION,
        "include_adult":"false",
        "sort_by":"popularity.desc",
        "page":1,
        "primary_release_date.gte":START.isoformat(),
        "primary_release_date.lte":END.isoformat(),
        "with_release_type":"2|3"
    }

    for x in get(path,p).get("results",[]):
        date=x.get("release_date")
        if not date:
            continue

        media="movie"
        details=get(
            f"/{media}/{x['id']}",
            {
                "language":"pt-BR",
                "append_to_response":"videos,credits,images,watch/providers",
                "include_image_language":"pt-BR,en,null"
            }
        )

        region_data=details.get("watch/providers",{}).get("results",{}).get(REGION,{})
        flat=region_data.get("flatrate",[])
        ps=[
            {"id":q["provider_id"],"name":q["provider_name"],"logo":q.get("logo_path")}
            for q in flat
            if not wanted_ids or q["provider_id"] in wanted_ids
        ]

        videos=[]
        for v in details.get("videos",{}).get("results",[]):
            if v.get("site")=="YouTube" and v.get("key"):
                videos.append({
                    "key":v["key"],
                    "name":v.get("name",""),
                    "type":v.get("type",""),
                    "official":bool(v.get("official"))
                })

        cast=[
            c.get("name")
            for c in details.get("credits",{}).get("cast",[])[:8]
            if c.get("name")
        ]

        directors=[
            c.get("name")
            for c in details.get("credits",{}).get("crew",[])
            if c.get("job")=="Director" and c.get("name")
        ]

        backdrops=[]
        for img in details.get("images",{}).get("backdrops",[])[:8]:
            if img.get("file_path"):
                backdrops.append("https://image.tmdb.org/t/p/w780"+img["file_path"])

        items.append({
            "id":x["id"],
            "type":"movie",
            "title":details.get("title") or x.get("title"),
            "release_date":date,
            "poster":"https://image.tmdb.org/t/p/w500"+x["poster_path"] if x.get("poster_path") else "",
            "backdrop":"https://image.tmdb.org/t/p/w1280"+details["backdrop_path"] if details.get("backdrop_path") else "",
            "overview":details.get("overview") or "Sinopse não disponível.",
            "tagline":details.get("tagline") or "",
            "runtime":details.get("runtime") or 0,
            "genres":[g.get("name") for g in details.get("genres",[]) if g.get("name")],
            "vote_average":details.get("vote_average") or 0,
            "providers":ps[:8],
            "videos":videos[:12],
            "cast":cast,
            "director":directors[0] if directors else "",
            "images":backdrops,
            "tmdb_url":f"https://www.themoviedb.org/movie/{x['id']}"
        })

items.sort(key=lambda x:(x["release_date"],x["title"]))
os.makedirs("data",exist_ok=True)

with open("data/catalog.json","w",encoding="utf-8") as f:
    json.dump(
        {
            "updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "region":"BR",
            "items":items
        },
        f,
        ensure_ascii=False,
        indent=2
    )

print("Itens:",len(items))
