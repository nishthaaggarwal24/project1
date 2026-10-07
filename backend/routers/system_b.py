import re
import hashlib
import pandas as pd
import numpy as np
from fastapi import APIRouter
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score
from sklearn.decomposition import TruncatedSVD
from data_loader import data_loader
from services.nlp_service import nlp_service
from services.embedding_service import embedding_service
from services.audit_service import audit_service

router=APIRouter(prefix="/api/system-b",tags=["Organization Workspace"])
_cluster_cache={"key":None,"value":None}
EMOTION_TERMS={
    "fear":["fear","afraid","scared","terrified","panic","horror","frightened"],
    "hope":["hope","hopeful","optimistic","looking forward","wish","aspire"],
    "stress":["stress","stressed","anxious","anxiety","pressure","overwhelmed","worried"],
    "career_anxiety":["career","job","boss","work","deadline","interview","promotion","unemployed"],
    "existential_anxiety":["existential","meaning of life","purpose of life","point of living","universe","mortality"],
    "belonging":["belong","accepted","included","connected","together","community"],
    "loneliness":["lonely","alone","isolated","abandoned","loneliness"]}

def _term_mask(texts, terms):
    pat=r"\b(?:"+"|".join(re.escape(x) for x in terms)+r")\b"
    return texts.str.contains(pat,case=False,regex=True,na=False)

@router.get("/emotional-climate")
def get_emotional_climate():
    df=data_loader.get_df(); labels=df.get("Emotion",pd.Series(index=df.index,dtype=str)).astype(str).str.strip(); valid=labels[labels.ne("")&labels.str.lower().ne("nan")]; denom=len(valid); indices={}; provenance={}
    wanted=["Fear","Joy","Sadness","Calm","Neutral"]
    for name in wanted:
        mask=labels.str.casefold().eq(name.casefold()); key=name.lower()+"_index"; indices[key]=float(mask.sum()/denom*100 if denom else 0)
        provenance[key]={"record_count":int(mask.sum()),"denominator_labeled_rows":denom,"evidence_ids":df.loc[mask,"Dream_ID"].astype(str).head(20).tolist(),"method":"exact case-insensitive match against source Emotion field"}
    pretty=[{"name":name+" Index","percentage":indices[name.lower()+"_index"]/100,"count":provenance[name.lower()+"_index"]["record_count"]} for name in wanted]
    return {**indices,"indices":pretty,"supporting_records":denom,"records_count":len(df),"provenance":provenance,
            "method":"Exact source Emotion labels only; denominator is rows with a nonblank Emotion label. No emotion is inferred from narrative text."}

@router.get("/emotional-climate-by-season")
def get_emotional_climate_by_season():
    return {"available":False,"limitation":"Season labels exist, but the CSV has no timestamp. These labels do not establish chronological trends.","records_count":0,"seasons":[]}

@router.get("/cluster-analysis")
def get_cluster_analysis():
    df=data_loader.get_df()
    texts=df.Dream_Text.astype(str).tolist()
    key=hashlib.sha256("\0".join(df.Dream_ID.astype(str)+"\0"+df.Dream_Text.astype(str)).encode("utf-8")).hexdigest()
    if _cluster_cache["key"]==key: return _cluster_cache["value"]
    n=len(df)
    if n<3: return {"available":False,"records_count":n,"clusters":[],"limitation":"At least three real narratives are required for clustering."}
    vectorizer=TfidfVectorizer(max_features=20000,min_df=2,stop_words="english",sublinear_tf=True)
    try:
        tfidf=vectorizer.fit_transform(texts)
    except ValueError as exc:
        return {"available":False,"records_count":n,"clusters":[],"limitation":f"The source narratives do not contain enough usable terms to form clusters ({exc})."}
    embeddings=embedding_service.encode_corpus(texts)
    if embeddings is not None:
        reduced=np.asarray(embeddings); method="all-MiniLM-L6-v2 sentence embeddings → K-Means"
        limitations=[]
    else:
        # Reproducible lexical fallback: clusters still come from the real source
        # narratives, with terms reduced to a compact semantic space before K-Means.
        components=min(100,tfidf.shape[1]-1,n-1)
        if components<2:
            return {"available":False,"records_count":n,"clusters":[],"limitation":"Not enough distinct narrative terms are available to reduce the source text into a cluster space."}
        reduced=TruncatedSVD(n_components=components,random_state=42,n_iter=7).fit_transform(tfidf)
        method="TF-IDF → TruncatedSVD → K-Means (deterministic fallback; sentence embeddings unavailable)"
        limitations=["Sentence embeddings were unavailable, so clusters use TF-IDF word patterns reduced with TruncatedSVD. They are descriptive text groupings, not psychological categories."]
    max_k=min(8,n-1); scores=[]; fitted={}
    for k in range(2,max_k+1):
        model=KMeans(n_clusters=k,random_state=42,n_init=10)
        labels=model.fit_predict(reduced); fitted[k]=(model,labels)
        sample_size=min(n,2000)
        scores.append({"k":k,"inertia":float(model.inertia_),"silhouette":float(silhouette_score(reduced,labels,metric="euclidean",sample_size=sample_size,random_state=42) if sample_size<n else silhouette_score(reduced,labels,metric="euclidean"))})
    inertias={item["k"]:item["inertia"] for item in scores}
    raw_elbow={item["k"]:max(0.0,inertias.get(item["k"]-1,0)-2*item["inertia"]+inertias.get(item["k"]+1,0)) for item in scores}
    sil_values=[item["silhouette"] for item in scores]; sil_min=min(sil_values); sil_max=max(sil_values)
    elbow_max=max(raw_elbow.values()) or 1.0
    for item in scores:
        sil_norm=(item["silhouette"]-sil_min)/(sil_max-sil_min) if sil_max>sil_min else 0.5
        elbow_norm=raw_elbow[item["k"]]/elbow_max
        item["elbow_strength"]=float(elbow_norm)
        item["selection_score"]=float(0.5*sil_norm+0.5*elbow_norm)
    best=max(scores,key=lambda x:x["selection_score"])["k"]
    model,labels=fitted[best]; terms=np.asarray(vectorizer.get_feature_names_out()); result=[]
    for cid in range(best):
        idx=np.flatnonzero(labels==cid); group=df.iloc[idx]
        mean_weights=np.asarray(tfidf[idx].mean(axis=0)).ravel(); top_terms=terms[np.argsort(mean_weights)[-8:][::-1]].tolist()
        distances=np.linalg.norm(reduced[idx]-model.cluster_centers_[cid],axis=1); rep_idx=idx[np.argsort(distances)[:3]]
        emo=group.get("Emotion",pd.Series(dtype=str)).astype(str).str.strip(); emo=emo[emo.ne("")]
        symbols={}
        for text in group.Dream_Text.astype(str):
            for sym,count in nlp_service.symbol_match(text).items(): symbols[sym]=symbols.get(sym,0)+count
        result.append({"cluster_id":str(cid),"name":" · ".join(top_terms[:3]) or f"Cluster {cid}","size":int(len(group)),"top_keywords":top_terms,
                       "representative_dreams":[{"dream_id":str(df.iloc[i].Dream_ID),"text":str(df.iloc[i].Dream_Text)[:400],"emotion":str(df.iloc[i].get("Emotion","Unavailable"))} for i in rep_idx],
                       "dominant_emotion":emo.value_counts().index[0] if len(emo) else "unavailable",
                       "sentiment":str(group.Sentiment.mode().iloc[0]) if "Sentiment" in group and not group.Sentiment.mode().empty else "Unavailable",
                       "emotion_distribution":[{"emotion":str(k),"value":int(v)} for k,v in emo.value_counts().items()],
                       "dominant_symbols":sorted([{"symbol":k,"count":v} for k,v in symbols.items()],key=lambda x:x["count"],reverse=True)[:5]})
    best_silhouette=next(item["silhouette"] for item in scores if item["k"]==best)
    if best_silhouette<0.1:
        limitations.append(f"The selected grouping has a low silhouette score ({best_silhouette:.3f}), indicating substantial overlap between clusters. Treat these as broad text groupings.")
    response={"available":True,"records_count":n,"clusters":result,"selected_k":best,
              "cluster_count_scores":scores,"method":method,
              "limitations":limitations+["Cluster names and top keywords are descriptive labels from source narratives, not psychological categories.","All source narratives are assigned with random_state=42 and n_init=10. Candidate k=2..8 are scored using silhouette and normalized elbow curvature with equal weight; silhouette uses a deterministic sample of up to 2,000 records.","Source Cluster_ID is ignored; assignments are derived from Dream_Text."]}
    _cluster_cache.update(key=key,value=response)
    return response

@router.get("/symbol-evolution")
def get_symbol_evolution():
    return {"available":False,"limitation":"The CSV contains Season labels but no timestamps. Symbol frequencies can be counted overall, but chronological evolution cannot be established."}

@router.get("/streaming-events")
def get_streaming_events(limit:int=20,offset:int=0):
    df=data_loader.get_df()
    submissions=df[df._source.eq("user_submission")].copy()
    if submissions.empty:
        return {"events":[],"total":0,"total_processed":0,"avg_word_count":0,"emotion_distribution":{},"has_more":False,"available":True,"limitation":"No real user-submitted rows with reserved U-prefixed Dream_IDs are present in the source CSV. No events are generated."}
    audit_by_id={}
    for entry in audit_service.get_all():
        if entry.get("event_type")!="dream_appended_to_source_csv": continue
        details=entry.get("details") or {}
        dream_id=str(entry.get("dream_id", ""))
        if dream_id: audit_by_id[dream_id]=str(details.get("submission_time") or entry.get("timestamp") or "")
    submissions["_event_timestamp"]=submissions.Dream_ID.astype(str).map(audit_by_id).fillna("")
    submissions["_sort_timestamp"]=submissions["_event_timestamp"].replace("", "9999")
    submissions["_event_words"]=pd.to_numeric(submissions.get("Word_Count",pd.Series(index=submissions.index,dtype=float)),errors="coerce")
    # Chronological where an audit timestamp exists; untimestamped but real U-ID rows follow.
    submissions=submissions.sort_values(["_sort_timestamp","Dream_ID"],kind="stable")
    total=len(submissions); limit=max(1,min(int(limit),100)); offset=max(0,int(offset)); batch=submissions.iloc[offset:offset+limit]
    events=[]
    for _,row in batch.iterrows():
        timestamp=str(row.get("_event_timestamp", "") or "")
        words=row.get("_event_words")
        events.append({"dream_id":str(row.Dream_ID),"timestamp":timestamp,"word_count":int(words) if pd.notna(words) else int(len(str(row.Dream_Text).split())),"emotion":str(row.get("Emotion", "")).strip() or "Unavailable"})
    processed=submissions.iloc[:offset+len(batch)]
    processed_emotions=processed.get("Emotion",pd.Series(index=processed.index,dtype=str)).astype(str).str.strip()
    emotion_distribution=processed_emotions[processed_emotions.ne("")&processed_emotions.str.lower().ne("nan")].value_counts().to_dict()
    mean_words=processed["_event_words"].mean() if len(processed) and processed["_event_words"].notna().any() else None
    return {"events":events,"total":total,"total_processed":len(processed),"avg_word_count":float(mean_words) if mean_words is not None else 0,"emotion_distribution":emotion_distribution,"has_more":offset+len(batch)<total,"available":True,"limitation":"Stream records come only from real U-prefixed rows in the source CSV; timestamps are read from the CSV audit log because the source schema has no timestamp column."}

@router.get("/overview-stats")
def get_overview_stats():
    df=data_loader.get_df(); out={"total_records":len(df),"source_records":int((df._source=="source_dataset").sum()),"user_submissions":int((df._source=="user_submission").sum()),"limitations":[]}
    for col,key in [("Emotion","emotion_distribution"),("Cluster_ID","cluster_sizes"),("Season","season_distribution"),("Dominant_Activity","top_activities")]:
        if col in df: out[key]=df[col].astype(str).value_counts().head(10).to_dict()
    if "Sentiment" in df:
        score=pd.to_numeric(df.Sentiment,errors="coerce")
        out["sentiment_distribution"]={"negative":int((score<=-.05).sum()),"neutral":int(((score>-.05)&(score<.05)).sum()),"positive":int((score>=.05).sum()),"unavailable":int(score.isna().sum())}
    wc=pd.to_numeric(df.get("Word_Count",pd.Series(dtype=float)),errors="coerce")
    out["avg_word_count"]=float(wc.mean()) if wc.notna().any() else None
    out["limitations"]=["No date/time, location, or demographic columns exist in the source CSV.","Season is a supplied category, not a chronological timestamp."]
    quality=data_loader.get_stats()["source_quality"]
    if quality["excluded_source_rows"]:
        out["limitations"].append(f"Excluded malformed source CSV row(s) {quality['excluded_source_rows']} from dream analysis; original rows remain untouched.")
    return out

@router.get("/correlation-data")
def get_correlation_data():
    df=data_loader.get_df(); cols=[x for x in ["Sentiment","Word_Count","Stress_Before_Sleep"] if x in df]
    numeric=df[cols].apply(pd.to_numeric,errors="coerce") if cols else pd.DataFrame()
    return {"labels":cols,"matrix":numeric.corr().fillna(0).values.tolist() if len(cols)>1 else [],"record_count":len(df),"limitation":"Only numeric fields present in the source are included."}

@router.get("/stress-analysis")
def get_stress_analysis():
    df=data_loader.get_df()
    stress=pd.to_numeric(df.get("Stress_Before_Sleep",pd.Series(index=df.index,dtype=float)),errors="coerce")
    sentiment=pd.to_numeric(df.get("Sentiment",pd.Series(index=df.index,dtype=float)),errors="coerce")
    paired=pd.DataFrame({"Stress_Before_Sleep":stress,"Sentiment":sentiment})
    corr=float(paired.corr().iloc[0,1]) if paired.notna().all(axis=1).sum()>=2 and paired.corr().shape==(2,2) and pd.notna(paired.corr().iloc[0,1]) else None
    emotions=[]
    if "Emotion" in df:
        for label,group in df.assign(_stress=stress).groupby("Emotion",dropna=False):
            values=group._stress.dropna()
            if len(values): emotions.append({"emotion":str(label) if str(label).strip() else "Unlabeled","mean_stress":float(values.mean()),"records":len(values),"evidence_ids":group.loc[group._stress.notna(),"Dream_ID"].astype(str).head(10).tolist()})
    bins=pd.cut(stress,[-np.inf,.25,.5,.75,np.inf],labels=["≤0.25","0.26–0.50","0.51–0.75",">0.75"])
    distribution=[{"range":str(k),"count":int(v)} for k,v in bins.value_counts(sort=False).items()]
    points=[{"dream_id":str(df.loc[i,"Dream_ID"]),"stress":float(stress.loc[i]),"sentiment":float(sentiment.loc[i]),"emotion":str(df.loc[i].get("Emotion",""))} for i in df.index[stress.notna()&sentiment.notna()][:2500]]
    return {"record_count":int(stress.notna().sum()),"mean_stress":float(stress.mean()) if stress.notna().any() else None,
      "stress_sentiment_correlation":corr,"correlation_records":int(paired.notna().all(axis=1).sum()),"emotion_groups":emotions,
      "distribution":distribution,"points":points,"limitation":"Pearson correlation is descriptive, based only on rows with both numeric source fields; it does not imply causation.",
      "provenance":{"stress_field":"Stress_Before_Sleep","sentiment_field":"Sentiment"}}

@router.get("/sleep-stage-analysis")
def get_sleep_stage_analysis():
    df=data_loader.get_df(); rows=[]
    word_counts=pd.to_numeric(df.get("Word_Count",pd.Series(index=df.index,dtype=float)),errors="coerce")
    sentiments=pd.to_numeric(df.get("Sentiment",pd.Series(index=df.index,dtype=float)),errors="coerce")
    stage_col=df.get("Sleep_Stage",pd.Series(index=df.index,dtype=str)).astype(str).str.strip()
    for stage,indices in stage_col[stage_col.ne("")&stage_col.str.lower().ne("nan")].groupby(stage_col):
        group=df.loc[indices.index]; emo=group.get("Emotion",pd.Series(index=group.index,dtype=str)).astype(str).str.strip(); activity=group.get("Dominant_Activity",pd.Series(index=group.index,dtype=str)).astype(str).str.strip()
        rows.append({"sleep_stage":str(stage),"dream_count":len(group),"average_sentiment":float(sentiments.loc[group.index].mean()) if sentiments.loc[group.index].notna().any() else None,
          "average_word_count":float(word_counts.loc[group.index].mean()) if word_counts.loc[group.index].notna().any() else None,
          "emotion_distribution":emo[emo.ne("")].value_counts().head(8).to_dict(),"activity_distribution":activity[activity.ne("")].value_counts().head(8).to_dict(),
          "evidence_ids":group.Dream_ID.astype(str).head(20).tolist()})
    return {"available":bool(rows),"record_count":len(df),"stages":rows,"limitation":"Only sleep-stage labels present in the source are included; missing values are excluded. Groups describe this dataset and do not establish causal relationships."}

@router.get("/dream-network")
def get_dream_network(limit:int=60):
    df=data_loader.get_df(); limit=max(10,min(limit,120)); term_count={}; terms_by_idx={}
    for idx,raw in df.get("Top_Keywords",pd.Series(index=df.index,dtype=str)).astype(str).items():
        unique=list(dict.fromkeys(x.strip().lower() for x in re.split(r"[,;|]",raw) if x.strip() and x.strip().lower() not in {"nan","none"}))
        terms_by_idx[idx]=unique
        for word in unique: term_count[word]=term_count.get(word,0)+1
    top_terms=set(sorted(term_count,key=lambda x:(-term_count[x],x))[:30]); nodes=[]; edges=[]
    # Select a deterministic, source-backed slice that covers the graph's common
    # keywords instead of always taking the first N rows (which can leave popular
    # terms with no visible connections when the CSV is ordered by another field).
    candidates=[]
    for idx,row in df.iterrows():
        relevant={x for x in terms_by_idx.get(idx,[]) if x in top_terms}
        emotion=str(row.get("Emotion","")).strip()
        if relevant or emotion:
            candidates.append((idx,row,relevant,emotion))
    selected_rows=[]; selected_indices=set(); uncovered=set(top_terms)
    while uncovered and len(selected_rows)<limit:
        best=None; best_score=0
        for item in candidates:
            idx,_,relevant,_=item
            if idx in selected_indices: continue
            score=len(relevant & uncovered)
            if score>best_score:
                best=item; best_score=score
        if best is None: break
        selected_rows.append(best); selected_indices.add(best[0]); uncovered.difference_update(best[2])
    if len(selected_rows)<limit:
        selected_rows.extend(item for item in candidates if item[0] not in selected_indices and len(selected_rows)<limit)
    used_emotions=set()
    for word in sorted(top_terms): nodes.append({"id":"keyword:"+word,"label":word,"type":"keyword","count":term_count[word]})
    for idx,row,relevant_set,emotion in selected_rows:
        relevant=[x for x in terms_by_idx.get(idx,[]) if x in top_terms]
        did=str(row.Dream_ID); nodes.append({"id":"dream:"+did,"label":did,"type":"dream","text":str(row.Dream_Text)[:320],"emotion":emotion or "Unavailable"})
        for word in relevant[:12]: edges.append({"source":"dream:"+did,"target":"keyword:"+word,"type":"keyword"})
        if emotion:
            eid="emotion:"+emotion
            if emotion not in used_emotions: nodes.append({"id":eid,"label":emotion,"type":"emotion"}); used_emotions.add(emotion)
            edges.append({"source":"dream:"+did,"target":eid,"type":"emotion"})
        if sum(1 for x in nodes if x.get("type")=="dream")>=limit: break
    return {"nodes":nodes,"edges":edges,"record_count":len(df),"shown_dreams":sum(x["type"]=="dream" for x in nodes),"method":"Top_Keywords and source Emotion labels linked to source Dream_IDs; no inferred edges.","limitation":"The CSV is a corpus without person identifiers. This graph is a bounded exploration of real rows, not a psychological network."}
