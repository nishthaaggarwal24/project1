from datetime import datetime, timezone
import os
import re
import time
import uuid
import csv
import fcntl
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from data_loader import data_loader
from config import settings
from services.nlp_service import nlp_service
from services.audit_service import audit_service
from services.embedding_service import embedding_service
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

router = APIRouter(prefix="/api/system-a", tags=["Individual Workspace"])
INSUFFICIENT = "I do not have enough dream history to answer that."

class AnalyzeRequest(BaseModel):
    text: str
class TwinChatRequest(BaseModel):
    message: str
    session_history: list[dict[str, str]] = Field(default_factory=list)
class SubmitDreamRequest(BaseModel):
    dream_text: str

def _word_count(text): return len(str(text).split())
@router.get("/dreams")
def get_dreams(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    df = data_loader.get_df(); page_df = df.iloc[(page-1)*page_size:page*page_size]
    fields = ["Dream_ID", "Dream_Text", "Word_Count", "Season", "Dominant_Activity", "Sentiment", "Emotion", "Top_Keywords", "Cluster_ID"]
    return {"total": len(df), "page": page, "page_size": page_size,
            "dreams": page_df[[c for c in fields if c in page_df]].to_dict("records")}

@router.get("/dashboard")
def get_dashboard():
    """Source-field statistics. Missing values remain missing; no date is synthesized."""
    df=data_loader.get_df(); n=len(df)
    def mode(col):
        values=df[col].astype(str).str.strip()
        values=values[values.ne("") & values.str.lower().ne("nan")]
        if not len(values): return None
        value=str(values.value_counts().index[0]); mask=df[col].astype(str).str.strip().eq(value)
        return {"value":value,"count":int(mask.sum()),"evidence_ids":df.loc[mask,"Dream_ID"].astype(str).head(20).tolist()}
    sentiment=pd.to_numeric(df.get("Sentiment",pd.Series(dtype=float)),errors="coerce")
    lucid_values=df.get("Lucid",pd.Series(index=df.index,dtype=str)).astype(str).str.strip().str.lower()
    lucid=lucid_values.isin(["yes","true","1","lucid"])
    nonlucid=lucid_values.isin(["no","false","0","non-lucid","non lucid"])
    known_lucid=lucid|nonlucid
    kw_counts={}; kw_records={}
    if "Top_Keywords" in df:
        for idx, raw in df.Top_Keywords.astype(str).items():
            seen=set()
            for token in re.split(r"[,;|]",raw):
                term=token.strip().strip('"').lower()
                if term and term not in {"nan","none","dream","dreams","like","something","things"} and term not in ENGLISH_STOP_WORDS and term not in seen:
                    seen.add(term); kw_counts[term]=kw_counts.get(term,0)+1
                    kw_records.setdefault(term,[]).append(str(df.loc[idx,"Dream_ID"]))
    keys=sorted(kw_counts,key=lambda k:(-kw_counts[k],k))[:50]
    emotion_counts=df.get("Emotion",pd.Series(index=df.index,dtype=str)).astype(str).str.strip().replace("",np.nan).dropna().value_counts()
    activity=mode("Dominant_Activity")
    lucid_sentiment=sentiment[lucid & sentiment.notna()]
    nonlucid_sentiment=sentiment[(~lucid) & sentiment.notna()]
    quality=data_loader.get_stats().get("source_quality") or {}
    return {"total_dreams":n,"source_row_count":int(quality.get("source_rows",n)),"excluded_row_count":len(quality.get("excluded_source_rows",[])),"excluded_source_rows":quality.get("excluded_source_rows",[]),"average_sentiment":float(sentiment.mean()) if sentiment.notna().any() else None,
      "sentiment_records":int(sentiment.notna().sum()),"lucid_count":int(lucid.sum()),
      "lucidity_rate":float(lucid.sum()/known_lucid.sum()) if known_lucid.any() else None,"lucid_average_sentiment":float(lucid_sentiment.mean()) if len(lucid_sentiment) else None,
      "nonlucid_average_sentiment":float(sentiment[nonlucid & sentiment.notna()].mean()) if (nonlucid & sentiment.notna()).any() else None,
      "most_common_emotion":mode("Emotion"),"most_common_activity":activity,
      "lucid_activities":df.loc[lucid,"Dominant_Activity"].astype(str).str.strip().replace("",np.nan).dropna().value_counts().head(5).to_dict() if "Dominant_Activity" in df else {},
      "emotion_distribution":[{"name":str(k),"count":int(v),"percentage":float(v/n*100 if n else 0),"evidence_ids":df.loc[df.Emotion.astype(str).str.strip().eq(str(k)),"Dream_ID"].astype(str).head(20).tolist()} for k,v in emotion_counts.items()],
      "top_keywords":[{"keyword":k,"count":kw_counts[k],"evidence_ids":kw_records[k][:20]} for k in keys],
      "timeline":{"available":False,"limitation":"The source CSV has no date or timestamp column; weekly, monthly, and yearly trends cannot be calculated."},
      "symbol_trends":{"available":False,"limitation":"The source CSV has no date or timestamp column; recurring keyword frequency is available, but trend direction is not."},
      "scope":"All analyzable CSV records; this file has no individual owner identifier.",
      "lucid_evidence_ids":df.loc[lucid,"Dream_ID"].astype(str).head(20).tolist(),"lucid_labeled_records":int(known_lucid.sum()),
      "provenance":{"source":"dataset_deduplicated.csv","record_count":n,"sentiment_evidence_ids":df.loc[sentiment.notna(),"Dream_ID"].astype(str).head(20).tolist()}}

@router.get("/search")
def search_dreams(q: str = Query(..., min_length=1, max_length=200), limit: int = Query(20, ge=1, le=100)):
    df=data_loader.get_df(); q=q.strip()
    if not q: return {"query":q,"results":[],"method":"exact case-insensitive field search"}
    columns=[c for c in ["Dream_Text","Top_Keywords","Emotion","Dominant_Activity"] if c in df]
    mask=pd.Series(False,index=df.index)
    for col in columns: mask |= df[col].astype(str).str.contains(re.escape(q),case=False,regex=True,na=False)
    exact_indices=set(df.index[mask].tolist()); corpus=df.Dream_Text.astype(str).tolist()
    embedding=embedding_service.rank(corpus,q,max(limit*3,60))
    scores={}
    selected=exact_indices
    method="Exact source-field matches plus all-MiniLM-L6-v2 semantic retrieval" if embedding["available"] else "case-insensitive exact field match; embedding ranking unavailable"
    if embedding["available"]:
        scores={int(x["index"]):x["score"] for x in embedding["results"]}
        selected.update(scores)
    subset=df.loc[sorted(selected)].copy()
    results=[]
    for idx,row in subset.iterrows():
        out={"dream_id":str(row.Dream_ID),"text":str(row.Dream_Text)[:1200],"emotion":str(row.get("Emotion","")).strip() or "Unavailable",
             "activity":str(row.get("Dominant_Activity","")).strip() or "Unavailable","date":None,
             "similarity":scores.get(int(idx)),"matched_fields":[c for c in columns if q.lower() in str(row.get(c," ")).lower()],
             "keywords":[x.strip() for x in re.split(r"[,;|]",str(row.get("Top_Keywords",""))) if x.strip() and x.strip().lower()!="nan"][:8]}
        results.append(out)
    if embedding["available"]: results.sort(key=lambda x:(bool(x["matched_fields"]),x["similarity"] or 0),reverse=True)
    return {"query":q,"results":results[:limit],"total_matches":len(selected),"exact_matches":int(mask.sum()),"method":method,
            "embedding_available":embedding["available"],"embedding_limitation":embedding.get("limitation"),
            "date_limitation":"No date or timestamp field exists in the source CSV."}

@router.get("/similar/{dream_id}")
def similar_dreams(dream_id:str, limit:int=Query(10,ge=1,le=50)):
    df=data_loader.get_df(); matches=df.index[df.Dream_ID.astype(str).eq(dream_id)]
    if len(matches)==0: raise HTTPException(404,"Dream not found")
    source_idx=int(matches[0]); text=str(df.loc[source_idx,"Dream_Text"]); corpus=df.Dream_Text.astype(str).tolist()
    embedding=embedding_service.rank(corpus,text,len(df))
    if not embedding["available"]:
        return {"query_dream_id":dream_id,"available":False,"results":[],"method":"Sentence embedding search unavailable","limitation":embedding.get("limitation")}
    ranked=[x for x in embedding["results"] if x["index"]!=source_idx][:limit]; method=embedding["method"]
    target_terms=set(re.findall(r"[a-z0-9]+",text.lower()))
    source_emotions=set(x.strip() for x in re.split(r"[,;|]",str(df.loc[source_idx].get("Emotion",""))) if x.strip())
    results=[]
    for item in ranked:
        row=df.iloc[item["index"]]; words=set(re.findall(r"[a-z0-9]+",str(row.get("Top_Keywords"," ")).lower()))
        if not words: words=set(re.findall(r"[a-z0-9]+",str(row.Dream_Text).lower()))
        emotions=set(x.strip() for x in re.split(r"[,;|]",str(row.get("Emotion",""))) if x.strip())
        results.append({"dream_id":str(row.Dream_ID),"text":str(row.Dream_Text)[:1000],"similarity":float(item["score"]),
          "shared_keywords":sorted(target_terms & words)[:12],"shared_emotions":sorted(source_emotions & emotions),"emotion":str(row.get("Emotion","Unavailable"))})
    return {"query_dream_id":dream_id,"available":True,"method":method,"results":results,"embedding_available":True}

@router.get("/dream/{dream_id}")
def get_dream(dream_id: str):
    df = data_loader.get_df(); found = df[df.Dream_ID.astype(str) == dream_id]
    if found.empty: raise HTTPException(404, "Dream not found")
    return found.iloc[0].where(pd.notna(found.iloc[0]), None).to_dict()

@router.post("/analyze")
def analyze_dream(req: AnalyzeRequest):
    text = req.text
    if not text.strip(): raise HTTPException(400, "Text cannot be empty")
    sentiment = nlp_service.vader_analyze(text)
    similar = nlp_service.compute_tfidf_similarity(nlp_service.preprocess(text), [nlp_service.preprocess(t) for t in data_loader.get_corpus()], 5)
    df = data_loader.get_df()
    return {"emotional_polarity": sentiment["compound"], "sentiment": sentiment,
            "matched_symbols": [{"symbol": k, "count": v} for k,v in nlp_service.symbol_match(text).items()],
            "similar_dreams": [{"Dream_ID": str(df.iloc[x["index"]]["Dream_ID"]), "similarity_score": x["score"],
                                "Dream_Text": str(df.iloc[x["index"]]["Dream_Text"])[:250], "Emotion": df.iloc[x["index"]].get("Emotion"),
                                "Sentiment": df.iloc[x["index"]].get("Sentiment")} for x in similar],
            "clean_text": nlp_service.preprocess(text), "analysis_scope": "This endpoint analyzes the provided text; it does not add it to the dataset."}

@router.get("/twin-profile")
def get_twin_profile():
    df = data_loader.get_df(); n = len(df)
    wc = pd.to_numeric(df.get("Word_Count", pd.Series(dtype=float)), errors="coerce").fillna(df.Dream_Text.map(_word_count))
    emotions = df.get("Emotion", pd.Series(dtype=str)).astype(str).str.strip()
    emotions = emotions[emotions.ne("")]
    symbols = get_symbol_frequencies()["symbols"]
    observed_symbols = [item for item in symbols if item["frequency"] > 0]
    recurrence = float(sum(item["frequency"] >= 3 for item in observed_symbols) / max(1, len(observed_symbols)))
    recurring_symbols = [item for item in observed_symbols if item["frequency"] >= 3]
    shares = emotions.value_counts(normalize=True)
    richness = min(float(wc.mean()) / 300, 1) if len(wc) else 0
    count_coverage = min(n / 100, 1)
    # Historical consistency cannot be measured: the source has no timestamps.
    progress = 100 * (count_coverage + recurrence + richness) / 3
    stage = "Dream Explorer" if progress < 34 else "Pattern Recognition" if progress < 67 else "Digital Twin Activated"
    emotion_counts=emotions.value_counts()
    return {"total_dreams": n, "stage": stage, "progress_score": progress,
            "confidence_pct": progress, "confidence": progress, "confidence_formula": "The score gives equal weight to three dataset measures: dream count (up to 100), the share of tracked symbols appearing in at least three dreams, and average narrative length (up to 300 words). The stages are Dream Explorer (below 34), Pattern Recognition (34 to under 67), and Digital Twin Activated (67 or higher). This is a dataset summary, not a probability or a measure of one person's progress.",
            "dominant_emotion": emotion_counts.index[0] if len(emotion_counts) else "unavailable",
            "emotional_diversity": float(1-shares.max()) if len(shares) else 0,
            "patterns_detected":len(recurring_symbols),"symbols_learned":len(observed_symbols),
            "top_symbols":[{"symbol":item["symbol"],"count":item["frequency"],"evidence_ids":item["evidence_ids"]} for item in sorted(observed_symbols,key=lambda x:x["frequency"],reverse=True)[:5]],
            "top_emotions":[{"emotion":str(name),"count":int(count),"evidence_ids":df.loc[df.Emotion.astype(str).str.strip().eq(str(name)),"Dream_ID"].astype(str).head(5).tolist()} for name,count in emotion_counts.head(5).items()],
            "historical_consistency": "Unavailable: source CSV has no timestamp.",
            "supporting_evidence": df.Dream_ID.astype(str).head(5).tolist(),
            "limitation": "This dataset has no individual owner/user field, so this is a corpus-level summary, not a personal twin profile."}

@router.get("/symbol-frequencies")
def get_symbol_frequencies():
    df=data_loader.get_df(); total=len(df); texts=df.Dream_Text.astype(str)
    out=[]
    for symbol, words in nlp_service.dream_symbol_lexicon.items():
        pat=r"\b(?:"+"|".join(__import__('re').escape(x) for x in words)+r")\b"
        mask=texts.str.contains(pat,case=False,regex=True,na=False); out.append({"symbol":symbol,"count":int(mask.sum()),"percentage":float(mask.mean()*100 if total else 0),"evidence_ids":df.loc[mask,"Dream_ID"].astype(str).head(10).tolist()})
    return {"records_count": total, "symbols": [{"symbol":x["symbol"],"frequency":x["count"],"evidence_ids":x["evidence_ids"]} for x in out]}

@router.get("/emotion-distribution")
def get_emotion_distribution():
    df=data_loader.get_df(); col="Emotion" if "Emotion" in df else None
    if col is None: return {"available":False,"limitation":"Source has no emotion field."}
    labels=df[col].astype(str).str.strip(); labels=labels[labels.ne("")]; counts=labels.value_counts()
    return {"records_count":len(df),"distribution":[{"emotion":k,"value":int(v),"evidence_ids":df.loc[labels.index[labels.eq(k)],"Dream_ID"].astype(str).head(10).tolist()} for k,v in counts.items()],"timeline_available":False,"limitation":"The source has no timestamps, so emotion changes over time cannot be calculated."}

@router.get("/sentiment-trajectory")
def get_sentiment_trajectory():
    df=data_loader.get_df()
    scores=pd.to_numeric(df.get("Sentiment",pd.Series(dtype=float)),errors="coerce")
    labels={"Negative":scores.le(-.05),"Neutral":scores.gt(-.05)&scores.lt(.05),"Positive":scores.ge(.05)}
    distribution=[]
    for label,mask in labels.items():
        matching=df.loc[mask,"Dream_ID"].astype(str)
        distribution.append({"sentiment":label,"count":int(mask.sum()),"percentage":float(mask.mean()*100 if len(mask) else 0),"evidence_ids":matching.head(10).tolist()})
    return {"records_count":len(df),"trajectory":[],"distribution":distribution,"available":False,
            "limitation":"The source has no timestamps, so time trends are unavailable. This cross-sectional distribution bins the source Sentiment score at -0.05 and +0.05."}

@router.get("/dream-dna")
def get_dream_dna():
    df=data_loader.get_df(); sentiment=pd.to_numeric(df.get("Sentiment",pd.Series(dtype=float)),errors="coerce")
    emotion_labels=df.get("Emotion",pd.Series(dtype=str)).astype(str).str.strip(); emotion=emotion_labels[emotion_labels.ne("")].value_counts()
    symbols=get_symbol_frequencies()["symbols"]; top_symbols=sorted(symbols,key=lambda x:x["frequency"],reverse=True)[:5]
    return {"dream_count":len(df),"records_count":len(df),"total_dreams":len(df),"dominant_emotions":[{"emotion":k,"strength":float(v/max(1,len(df))*100),"evidence_ids":df.loc[df.Emotion.astype(str).str.strip().eq(str(k)),"Dream_ID"].astype(str).head(5).tolist()} for k,v in emotion.head(3).items()],"dominant_symbols":[{"symbol":x["symbol"],"count":x["frequency"],"evidence_ids":x["evidence_ids"]} for x in top_symbols],
            "limitation":"Corpus-level summary: the source has no individual owner or timestamp fields.",
            "emotional_polarity_mean":float(sentiment.mean()) if sentiment.notna().any() else None,
            "narrative_richness_score":min(float(pd.to_numeric(df.get("Word_Count",pd.Series(dtype=float)),errors="coerce").mean())/300,1) if "Word_Count" in df else None,
            "narrative_richness":min(float(pd.to_numeric(df.get("Word_Count",pd.Series(dtype=float)),errors="coerce").mean())/3,100) if "Word_Count" in df else None,
            "emotional_polarity":float(sentiment.mean()) if sentiment.notna().any() else None,
            "evidence_ids":df.Dream_ID.astype(str).head(10).tolist()}

@router.post("/twin-chat")
def twin_chat(req: TwinChatRequest):
    message=req.message.strip()
    if not message: raise HTTPException(400,"Message cannot be empty")
    profile=get_twin_profile()
    if profile["stage"]!="Digital Twin Activated":
        return {"response":"Twin chat is locked until Stage 3. Continue adding real dream records to the dataset to progress.","locked":True,"evidence":[],"cited_dreams":[],"reasoning":"Stage is calculated from record count, recurring-symbol coverage, and narrative richness."}
    df=data_loader.get_df(); lower=message.lower()
    temporal=bool(re.search(r"\b(when|this month|last month|this week|last week|this year|last year|monthly|recently|changed|change over time|timeline|trend|become more|become less|what changed)\b",lower))
    def response(answer, rows, method, scores=None, excerpts=None):
        items=[]
        for idx in rows:
            row=df.iloc[int(idx)]
            keywords=[x.strip() for x in re.split(r"[,;|]",str(row.get("Top_Keywords",""))) if x.strip() and x.strip().lower()!="nan"]
            item={"dream_id":str(row.Dream_ID),"excerpt":(excerpts or {}).get(int(idx),str(row.Dream_Text)[:250]),"keywords":keywords[:8],"emotion":str(row.get("Emotion","Unavailable")).strip() or "Unavailable"}
            if scores and int(idx) in scores: item["similarity"]=float(scores[int(idx)])
            items.append(item)
        conversational=answer if answer.startswith(("I ","Yes.","No.","The ")) else "I checked the source records.\n\n"+answer
        return {"response":conversational,"evidence":items,"cited_dreams":items,"reasoning":method,
                "reasoning_chain":[method,"Evidence IDs refer to real narratives in the loaded CSV or separately stored real user submissions.","Results describe this dataset; no individual owner field is available."]}
    if re.search(r"\b(latest|most recent)\b",lower) and re.search(r"\b(similar|compare|entry|dream)\b",lower):
        submissions=df[df.get("_source",pd.Series(index=df.index,dtype=str)).eq("user_submission")].copy()
        if "Submitted_At" not in submissions or submissions.empty:
            return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No timestamped user-submitted dream is available to identify as your latest entry."}
        latest=submissions.sort_values("Submitted_At").iloc[-1]
        sims=nlp_service.compute_tfidf_similarity(nlp_service.preprocess(latest.Dream_Text),[nlp_service.preprocess(t) for t in df.Dream_Text],len(df))
        sims=[item for item in sims if str(df.iloc[item["index"]].Dream_ID)!=str(latest.Dream_ID)][:5]
        if not sims: return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No other dream narratives were available for comparison."}
        rows=[item["index"] for item in sims]; scores={item["index"]:item["score"] for item in sims}
        return response(f"Dreams most similar to the latest timestamped user-submitted entry in this app ({latest.Dream_ID}), ranked by TF-IDF cosine similarity:",rows,
                        "Compared the latest separately stored user submission with all other real narratives; similarity is lexical, not thematic or psychological.",scores)
    if temporal:
        return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"The source has no timestamp or individual owner field, so a personal or chronological comparison cannot be supported.","reasoning_chain":["Checked available source fields.","No timestamp or person identifier is present.","No period or personal change claim was generated."]}
    if re.search(r"\b(about most|dream most|most common themes?|top keywords?)\b",lower):
        if "Top_Keywords" not in df: return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"The source has no Top_Keywords field."}
        counts={}; evidence={}
        for _,row in df.iterrows():
            for term in set(x.strip().lower() for x in re.split(r"[,;|]",str(row.get("Top_Keywords",""))) if x.strip() and x.strip().lower()!="nan"):
                counts[term]=counts.get(term,0)+1; evidence.setdefault(term,[]).append(str(row.Dream_ID))
        top=sorted(counts,key=lambda x:(-counts[x],x))[:5]
        if not top: return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No source keywords are available."}
        rows=[]; excerpts={}
        for word in top:
            for did in evidence[word][:2]:
                idx=df.index[df.Dream_ID.astype(str).eq(did)][0]; rows.append(int(idx)); excerpts[int(idx)]=f"Source Top_Keywords includes: {word}"
        return response("Most frequent source Top_Keywords across the dataset (distinct records):\n"+"\n".join(f"{term}: {counts[term]} records" for term in top),rows,
          "Counted distinct comma/semicolon/pipe-separated terms in the CSV Top_Keywords column; no narrative themes were inferred.",excerpts=excerpts)
    if re.search(r"\bemotion\w*\b",lower) and re.search(r"\b(with|during|among|in)\b",lower):
        for symbol,terms in nlp_service.dream_symbol_lexicon.items():
            matched=[term for term in terms if re.search(rf"\b{re.escape(term)}s?\b",lower)]
            if not matched: continue
            pat=r"\b(?:"+"|".join(re.escape(x)+r"s?" for x in matched)+r")\b"
            mask=df.Dream_Text.astype(str).str.contains(pat,case=False,regex=True,na=False); group=df.loc[mask]
            labels=group.get("Emotion",pd.Series(index=group.index,dtype=str)).astype(str).str.strip(); labels=labels[labels.ne("")&labels.str.lower().ne("nan")]
            if labels.empty: return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":f"No source Emotion labels accompany narratives matching {symbol}."}
            counts=labels.value_counts(); rowids=group.index[group.Emotion.astype(str).str.strip().isin(counts.index)][:10].tolist()
            excerpts={int(i):f"Source Emotion label: {df.loc[i,'Emotion']}" for i in rowids}
            return response(f"Source Emotion labels among {len(group)} dreams with literal {symbol} term matches:\n"+"\n".join(f"{k}: {v} records" for k,v in counts.head(6).items())+"\nCo-occurrence only; no causal relationship is inferred.",rowids,
              f"Matched whole-word {symbol} terms in Dream_Text, then counted the supplied Emotion labels on those same rows.",excerpts=excerpts)
    if re.search(r"\blucid\b",lower) and re.search(r"\b(count|how many|rate|often|compare)\b",lower):
        vals=df.get("Lucid",pd.Series(index=df.index,dtype=str)).astype(str).str.strip().str.lower()
        yes=vals.isin(["yes","true","1","lucid"]); no=vals.isin(["no","false","0","non-lucid","non lucid"]); known=yes|no
        rows=df.index[yes][:10].tolist()
        return response(f"The source marks {int(yes.sum())} of {int(known.sum())} labeled records as lucid ({(yes.sum()/known.sum()*100 if known.any() else 0):.1f}%). Unlabeled Lucid values were excluded.",rows,
          "Counted the CSV Lucid field using its observed yes/no-like values; cited Dream_IDs are actual lucid-labeled rows.",excerpts={int(i):"Source Lucid label: "+str(df.loc[i,"Lucid"]) for i in rows})
    if re.search(r"\b(activity|activities)\b",lower) and re.search(r"\b(most|common|often|frequent)\b",lower):
        values=df.get("Dominant_Activity",pd.Series(index=df.index,dtype=str)).astype(str).str.strip(); values=values[values.ne("")&values.str.lower().ne("nan")]; counts=values.value_counts().head(5)
        if counts.empty:return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No source activity labels are available."}
        top=counts.index[0]; rows=df.index[df.Dominant_Activity.astype(str).str.strip().eq(top)][:10].tolist()
        return response("Most common source Dominant_Activity values:\n"+"\n".join(f"{k}: {v} records" for k,v in counts.items()),rows,
          "Counted nonblank labels in the CSV Dominant_Activity column.",excerpts={int(i):f"Source Dominant_Activity: {top}" for i in rows})
    if re.search(r"\b(emotion|emotions|feeling|feelings)\b",lower) and re.search(r"\b(most|often|common|distribution|appear)\b",lower):
        labels=df.Emotion.astype(str).str.strip(); labels=labels[labels.ne("")]; counts=labels.value_counts().head(5)
        if counts.empty: return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No source emotion labels are available."}
        lines=[f"{name}: {int(count)} records ({count/len(df)*100:.1f}%)" for name,count in counts.items()]
        top_label=counts.index[0]; row_ids=df.index[df.Emotion.astype(str).str.strip().eq(top_label)][:5]
        return response("Most frequent source-provided emotion labels across this dataset:\n"+"\n".join(lines),row_ids,"Counted the CSV Emotion field, excluded blank labels, and divided by all analyzed dream records. These are corpus totals, not a personal distribution.",excerpts={int(idx):f"Source CSV Emotion label: {top_label}" for idx in row_ids})
    if re.search(r"\b(sentiment|positive|negative)\b",lower):
        scores=pd.to_numeric(df.get("Sentiment",pd.Series(dtype=float)),errors="coerce")
        if not scores.notna().any(): return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No numeric source sentiment scores are available."}
        bins={"Negative":scores.le(-.05),"Neutral":scores.gt(-.05)&scores.lt(.05),"Positive":scores.ge(.05)}
        lines=[f"{label}: {int(mask.sum())} records ({mask.mean()*100:.1f}%)" for label,mask in bins.items()]
        evidence_rows=[]; excerpts={}
        for label,mask in bins.items():
            chosen=df.index[mask][:2].tolist(); evidence_rows.extend(chosen)
            for idx in chosen: excerpts[int(idx)]=f"Source CSV Sentiment score: {float(scores.loc[idx]):.3f} ({label})"
        return response("Current source sentiment-score distribution:\n"+"\n".join(lines)+f"\nMean source score: {scores.mean():.2f}. No direction over time can be inferred.",evidence_rows,"Binned numeric CSV Sentiment using -0.05/+0.05 cutoffs and computed its observed mean. This is corpus-level, not personal or longitudinal.",excerpts=excerpts)
    requested=[]
    for symbol,terms in nlp_service.dream_symbol_lexicon.items():
        matched=[term for term in terms if re.search(rf"\b{re.escape(term)}s?\b",lower)]
        if matched or re.search(rf"\b{re.escape(symbol.lower())}s?\b",lower): requested.append((symbol,matched or terms))
    if requested and "stress" not in lower:
        found=[]; details=[]; excerpts={}
        for symbol,terms in requested:
            pattern=r"\b(?:"+"|".join(re.escape(t)+r"s?" for t in terms)+r")\b"; mask=df.Dream_Text.astype(str).str.contains(pattern,case=False,regex=True,na=False); ids=df.index[mask].tolist(); found.extend(ids); details.append(f"{symbol}: {len(ids)} records")
            for idx in ids:
                match=re.search(pattern,str(df.loc[idx,"Dream_Text"]),flags=re.IGNORECASE)
                if match and idx not in excerpts:
                    a=max(0,match.start()-80); b=min(len(str(df.loc[idx,"Dream_Text"])),match.end()+120); excerpts[int(idx)]=("…" if a else "")+str(df.loc[idx,"Dream_Text"])[a:b]+("…" if b<len(str(df.loc[idx,"Dream_Text"])) else "")
        found=list(dict.fromkeys(found))
        if not found:return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No analyzed narrative matched the requested symbol terms."}
        return response("Literal symbol-term matches across the loaded dataset:\n"+"\n".join(details)+"\nThis is recurrence evidence; text alone does not establish why a symbol appears.",found[:5],"Applied whole-word matching against the configured source symbol lexicon and counted matching records.",excerpts=excerpts)
    cleaned=nlp_service.preprocess(message)
    sims=nlp_service.compute_tfidf_similarity(cleaned,[nlp_service.preprocess(t) for t in df.Dream_Text],5)
    matches=[item for item in sims if item["score"]>=.15]
    if not matches:return {"response":INSUFFICIENT,"evidence":[],"cited_dreams":[],"reasoning":"No analyzed narrative met the TF-IDF cosine similarity threshold of 0.15.","reasoning_chain":["TF-IDF searched the narratives.","No result met the documented 0.15 threshold.","No unsupported answer was generated."]}
    rows=[item["index"] for item in matches]; scores={item["index"]:item["score"] for item in matches}
    excerpts=[f"{df.iloc[i].Dream_ID}: {str(df.iloc[i].Dream_Text)[:180]}" for i in rows[:3]]
    return response("Textually similar records (this corpus has no person identifier):\n"+"\n".join(excerpts)+"\nText similarity can retrieve related narratives, but cannot establish psychological causes or personal history.",rows,"TF-IDF vectorized the question and source narratives; cosine similarity results below 0.15 were omitted.",scores)

@router.post("/submit-dream")
def submit_dream(req: SubmitDreamRequest):
    text=req.dream_text
    if not text.strip(): raise HTTPException(400,"Dream text cannot be empty")
    now=datetime.now(timezone.utc).isoformat(); dream_id="U"+uuid.uuid4().hex
    sentiment=nlp_service.vader_analyze(text); symbols=nlp_service.symbol_match(text)
    word_count=_word_count(text)
    path=Path(settings.DATASET_PATH).expanduser().resolve()
    with path.open("r+",newline="",encoding="utf-8-sig") as handle:
        fcntl.flock(handle.fileno(),fcntl.LOCK_EX)
        reader=csv.DictReader(handle); fieldnames=reader.fieldnames or []
        if not {"Dream_ID","Dream_Text"}.issubset(fieldnames): raise HTTPException(500,"Source CSV schema does not support dream submissions")
        existing_ids={row.get("Dream_ID","") for row in reader}
        if dream_id in existing_ids: raise HTTPException(409,"Dream ID collision; retry submission")
        record={key:"" for key in fieldnames}; record.update({"Dream_ID":dream_id,"Dream_Text":text})
        if "Sentiment" in record: record["Sentiment"]=str(sentiment["compound"])
        if "Word_Count" in record: record["Word_Count"]=str(word_count)
        handle.seek(0,os.SEEK_END)
        end=handle.tell()
        if end:
            if os.pread(handle.fileno(),1,end-1) not in (b"\n",b"\r"):
                handle.seek(0,os.SEEK_END); handle.write("\n")
        handle.seek(0,os.SEEK_END); csv.writer(handle).writerow([record.get(key,"") for key in fieldnames]); handle.flush(); os.fsync(handle.fileno())
        fcntl.flock(handle.fileno(),fcntl.LOCK_UN)
    processed=datetime.now(timezone.utc).isoformat()
    audit_service.log_event("dream_appended_to_source_csv",dream_id,{"submission_time":now,"processing_time":processed,"features_extracted":{"word_count":word_count,"vader":sentiment,"literal_symbol_matches":symbols},"source_path":str(path),"other fields":"left blank when not directly observed or supported"})
    data_loader.refresh()
    # Refresh the cached source embeddings after the CSV append. The service is
    # lazy and reports model unavailability without substituting generated data.
    try:
        embedding_service.encode_corpus(data_loader.get_corpus())
    except Exception as exc:
        # A failed optional model refresh must not turn a successful CSV append
        # into an apparent failed submission.
        audit_service.log_event("dream_embedding_refresh_failed",dream_id,{"error":f"{type(exc).__name__}: {exc}"})
    return {"dream_id":dream_id,"submitted_at":now,"analysis":{"sentiment":sentiment,"matched_symbols":symbols,"analysis_confidence":"low" if word_count<20 else "lexical_only","cluster_assignment":None},"message":"Dream narrative appended verbatim to the source CSV. Existing rows were not rewritten."}
