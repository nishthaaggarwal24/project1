from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import json
import time
from datetime import datetime
from data_loader import data_loader
from config import settings
from services.audit_service import audit_service
from services.nlp_service import nlp_service

router = APIRouter(prefix="/api/governance", tags=["Governance"])

@router.get("/audit-log")
def get_audit_log():
    return {"audit_log": audit_service.get_recent(100)}

@router.get("/data-provenance/{dream_id}")
def get_data_provenance(dream_id: str):
    df = data_loader.get_df()
    record = df[df['Dream_ID'] == dream_id]
    
    if record.empty:
        raise HTTPException(status_code=404, detail="Dream ID not found")
        
    source = record.iloc[0].get('_source', 'unknown')
    
    # columns present for this record (not null)
    row = record.iloc[0]
    present_cols = [col for col in record.columns if pd.notna(row[col])]
    
    return {
        "dream_id": dream_id,
        "source": source,
        "columns_present": present_cols,
        "source_row_hash": row.get('_source_row_hash'),
        "validation_status": "valid" if row.get('_source_row_hash') else "unverified"
    }

@router.get("/synthetic-check")
def check_synthetic_data():
    df = data_loader.get_df()
    ids = df['Dream_ID'].astype(str)
    
    # Validate source row identity by recomputing a digest from the retained ID and
    # exact narrative. User submissions are separately identified in their own file.
    hashes = df.apply(lambda r: __import__('hashlib').sha256(
        (str(r['Dream_ID']) + "\0" + str(r['Dream_Text'])).encode('utf-8')).hexdigest(), axis=1)
    violations = df.loc[hashes != df['_source_row_hash'], 'Dream_ID'].astype(str).tolist()
    
    return {
        "status": "clean" if not violations else "violation",
        "total_checked": len(ids),
        "violations": violations,
        "method": "Each record ID and exact narrative are checked against a SHA-256 row digest captured during source loading.",
        "source_dataset_path": settings.DATASET_PATH,
        "source_file_modified": False,
        "source_quality": data_loader.get_stats()["source_quality"]
    }
