import csv
import json
import os
import fcntl
from datetime import datetime
from config import settings

class AuditService:
    @staticmethod
    def log_event(event_type: str, dream_id: str, details: dict):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "dream_id": dream_id,
            "details": details
        }
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(settings.AUDIT_LOG_PATH), exist_ok=True)
        
        path=settings.AUDIT_LOG_PATH
        with open(path,'a',newline='',encoding='utf-8') as f:
            fcntl.flock(f.fileno(),fcntl.LOCK_EX)
            writer=csv.DictWriter(f,fieldnames=['timestamp','event_type','dream_id','details'])
            if os.path.getsize(path)==0: writer.writeheader()
            writer.writerow({**log_entry,'details':json.dumps(details,ensure_ascii=False,sort_keys=True)})
            f.flush(); os.fsync(f.fileno())
            fcntl.flock(f.fileno(),fcntl.LOCK_UN)

    @staticmethod
    def get_recent(n: int = 100):
        return AuditService.get_all()[-n:]

    @staticmethod
    def get_all():
        if not os.path.exists(settings.AUDIT_LOG_PATH):
            return []
            
        lines = []
        # Inefficient for very large files, but adequate for audit log requirements
        with open(settings.AUDIT_LOG_PATH,'r',newline='',encoding='utf-8') as f:
            lines=list(csv.DictReader(f))
        for row in lines:
            try: row['details']=json.loads(row.get('details','{}'))
            except (TypeError,json.JSONDecodeError): row['details']={}
        return lines

audit_service = AuditService()
