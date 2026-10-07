"""Private, append-only CSV storage for Vercel deployments.

The source corpus is uploaded once as ``source/dataset_deduplicated.csv``.
Submitted dreams and audit events are stored as immutable one-row CSV objects,
so concurrent function instances cannot overwrite one another's appends.
Local development continues to use the existing filesystem CSV workflow.
"""
import csv
import io
import os
import uuid
from datetime import datetime, timezone


def blob_enabled() -> bool:
    return os.getenv("VERCEL", "").lower() in {"1", "true"} or os.getenv("STORAGE_BACKEND") == "vercel-blob"


class PrivateCsvStorage:
    SOURCE_PATH = "source/dataset_deduplicated.csv"

    @staticmethod
    def _client():
        try:
            from vercel.blob import BlobClient
        except ImportError as exc:
            raise RuntimeError("Vercel Blob SDK is required when STORAGE_BACKEND=vercel-blob") from exc
        return BlobClient()

    @staticmethod
    def _decode_csv(content: bytes) -> str:
        return content.decode("utf-8-sig")

    def read_source_csv(self) -> str:
        with self._client() as client:
            blob = client.get(self.SOURCE_PATH, access="private", use_cache=False)
            if blob is None or blob.status_code != 200:
                raise FileNotFoundError(
                    "Private source CSV is missing. Upload dataset_deduplicated.csv to "
                    "the connected Blob store at source/dataset_deduplicated.csv."
                )
            return self._decode_csv(blob.content)

    def _objects(self, prefix: str):
        with self._client() as client:
            cursor = None
            while True:
                page = client.list_objects(prefix=prefix, limit=1000, cursor=cursor, mode="folded")
                yield from page.blobs
                if not page.has_more or not page.cursor:
                    break
                cursor = page.cursor

    def read_csv_records(self, prefix: str):
        records = []
        with self._client() as client:
            objects = list(self._objects(prefix))
            for item in sorted(objects, key=lambda x: (x.uploaded_at, x.pathname)):
                blob = client.get(item.pathname, access="private", use_cache=False)
                if blob is None or blob.status_code != 200:
                    raise RuntimeError(f"Could not read private CSV object {item.pathname}")
                records.append((item.pathname, self._decode_csv(blob.content)))
        return records

    def write_record(self, prefix: str, fields: list[str], record: dict) -> str:
        output = io.StringIO(newline="")
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerow({field: record.get(field, "") for field in fields})
        filename = f"{prefix.rstrip('/')}/{uuid.uuid4().hex}.csv"
        with self._client() as client:
            client.put(filename, output.getvalue().encode("utf-8"), access="private",
                       content_type="text/csv", overwrite=False)
        return filename

    def write_submission(self, fields: list[str], record: dict) -> str:
        # Dream_ID is already unique and useful in the durable object path.
        dream_id = str(record.get("Dream_ID", "")).strip()
        if not dream_id:
            raise ValueError("A real Dream_ID is required before storing a submission")
        output = io.StringIO(newline="")
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerow({field: record.get(field, "") for field in fields})
        path = f"submissions/{dream_id}.csv"
        with self._client() as client:
            client.put(path, output.getvalue().encode("utf-8"), access="private",
                       content_type="text/csv", overwrite=False)
        return path

    def write_audit_event(self, entry: dict) -> str:
        fields = ["timestamp", "event_type", "dream_id", "details"]
        stamp = str(entry.get("timestamp") or datetime.now(timezone.utc).isoformat())
        safe_stamp = stamp.replace(":", "-").replace("+", "_")
        name = f"audit/{safe_stamp}-{uuid.uuid4().hex}.csv"
        output = io.StringIO(newline="")
        writer = csv.DictWriter(output, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerow({field: entry.get(field, "") for field in fields})
        with self._client() as client:
            client.put(name, output.getvalue().encode("utf-8"), access="private",
                       content_type="text/csv", overwrite=False)
        return name

    def read_audit_events(self):
        events = []
        for _, content in self.read_csv_records("audit/"):
            events.extend(csv.DictReader(io.StringIO(content)))
        events.sort(key=lambda row: row.get("timestamp", ""))
        return events


csv_storage = PrivateCsvStorage()
