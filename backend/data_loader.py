"""Load the source-of-truth CSV and distinguish real submitted rows by reserved ID prefix."""
import hashlib
import io
import os
import pandas as pd
from config import settings
from services.csv_storage import blob_enabled, csv_storage


class DataLoader:
    _instance = None
    _df = None
    _source_quality = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @staticmethod
    def _validate_records(df: pd.DataFrame, source: str) -> None:
        required = {"Dream_ID", "Dream_Text"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"{source} is missing required columns: {sorted(missing)}")
        if "synthetic_marker" in df.columns:
            raise ValueError(f"Synthetic marker found in {source}; refusing analysis")
        if df["Dream_ID"].isna().any() or df["Dream_ID"].astype(str).str.strip().eq("").any():
            raise ValueError(f"Missing Dream_ID in {source}")
        if df["Dream_ID"].astype(str).duplicated().any():
            raise ValueError(f"Duplicate Dream_ID in {source}")
        if df["Dream_Text"].isna().any() or df["Dream_Text"].astype(str).str.strip().eq("").any():
            raise ValueError(f"Missing Dream_Text in {source}")
        # A submitted narrative must be traceable verbatim to the submitted row.
        suspicious = df["Dream_ID"].astype(str).str.contains(r"synthetic|mock|placeholder|fake", case=False, regex=True)
        if suspicious.any():
            raise ValueError(f"Synthetic-looking Dream_ID found in {source}; refusing analysis")

    def load_dataset(self) -> pd.DataFrame:
        if self._df is not None:
            return self._df
        if blob_enabled():
            source_df = pd.read_csv(io.StringIO(csv_storage.read_source_csv()), keep_default_na=False)
        else:
            if not os.path.exists(settings.DATASET_PATH):
                raise FileNotFoundError(f"Dataset not found at {settings.DATASET_PATH}. Set DATASET_PATH to the supplied CSV.")
            source_df = pd.read_csv(settings.DATASET_PATH, keep_default_na=False)
        valid = (source_df["Dream_ID"].astype(str).str.strip().ne("") &
                 source_df["Dream_Text"].astype(str).str.strip().ne(""))
        excluded_indices = source_df.index[~valid].tolist()
        self._source_quality = {"source_rows": int(len(source_df)),
                                "analyzable_source_records": int(valid.sum()),
                                "excluded_source_rows": [int(i)+2 for i in excluded_indices],
                                "exclusion_reason": "Missing Dream_ID or Dream_Text; original CSV row is preserved and not analyzed."}
        source_df = source_df.loc[valid].copy()
        self._validate_records(source_df, "source dataset")
        # User submissions are appended to the same CSV with reserved U-prefixed IDs.
        source_df["_source"] = source_df["Dream_ID"].astype(str).str.startswith("U").map({True:"user_submission",False:"source_dataset"})
        source_df["_source_row_hash"] = source_df.apply(
            lambda r: hashlib.sha256((str(r["Dream_ID"]) + "\0" + str(r["Dream_Text"])).encode("utf-8")).hexdigest(), axis=1
        )
        frames = [source_df]
        if blob_enabled():
            submissions = []
            for _, content in csv_storage.read_csv_records("submissions/"):
                frame = pd.read_csv(io.StringIO(content), keep_default_na=False)
                self._validate_records(frame, "private user submissions")
                submissions.append(frame)
            if submissions:
                submitted = pd.concat(submissions, ignore_index=True, sort=False)
                if set(submitted["Dream_ID"].astype(str)) & set(source_df["Dream_ID"].astype(str)):
                    raise ValueError("User submission Dream_ID collides with a source Dream_ID")
                self._validate_records(submitted, "private user submissions")
                submitted["_source"] = "user_submission"
                submitted["_source_row_hash"] = submitted.apply(
                    lambda r: hashlib.sha256((str(r["Dream_ID"]) + "\0" + str(r["Dream_Text"])).encode("utf-8")).hexdigest(), axis=1
                )
                frames.append(submitted)
        elif settings.APP_SUBMISSIONS_PATH and os.path.exists(settings.APP_SUBMISSIONS_PATH):
            submissions = pd.read_csv(settings.APP_SUBMISSIONS_PATH, keep_default_na=False)
            self._validate_records(submissions, "user submissions")
            if set(submissions["Dream_ID"].astype(str)) & set(source_df["Dream_ID"].astype(str)):
                raise ValueError("User submission Dream_ID collides with a source Dream_ID")
            submissions["_source"] = "user_submission"
            submissions["_source_row_hash"] = submissions.apply(
                lambda r: hashlib.sha256((str(r["Dream_ID"]) + "\0" + str(r["Dream_Text"])).encode("utf-8")).hexdigest(), axis=1
            )
            frames.append(submissions)
        self._df = pd.concat(frames, ignore_index=True, sort=False).fillna("")
        return self._df

    def get_df(self) -> pd.DataFrame:
        return self.load_dataset()

    def get_corpus(self) -> list:
        df = self.load_dataset()
        return df["Dream_Text"].astype(str).tolist()

    def refresh(self) -> pd.DataFrame:
        self._df = None
        return self.load_dataset()

    def get_stats(self) -> dict:
        df = self.load_dataset()
        return {"total_records": len(df), "source_records": int((df["_source"] == "source_dataset").sum()),
                "user_submissions": int((df["_source"] == "user_submission").sum()),
                "source_quality": self._source_quality}


data_loader = DataLoader()
