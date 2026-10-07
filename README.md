# DreamTwin AI

FastAPI and React application configured for the supplied `dataset_deduplicated.csv`.

## Source data and integrity

- Default source: `../../../dataset_deduplicated.csv` from `backend/` (the file `/Users/nishthaaggarwal/Downloads/dataset_deduplicated.csv`). Override with `DATASET_PATH` when starting the backend.
- The configured CSV is the single source of truth. New real submissions append one row with a unique `U`-prefixed Dream_ID and the narrative verbatim; existing rows are never rewritten or deleted. No database is used. The source schema has no timestamp column, so submission timestamps are retained in the separate CSV audit log.
- Records are checked for required ID/narrative fields, duplicate IDs, blank narratives, and a synthetic marker before analysis. Data provenance endpoints include row hashes of IDs and exact narratives.
- Derived analysis is computed from the source records plus actual user submissions. No historical stream timestamps or unknown emotion values are invented.

## Supplied CSV coverage

The supplied CSV has 11,400 rows with `Dream_ID`, `Dream_Text`, `Sentiment`, `Emotion`, `Word_Count`, `Lucid`, `Dominant_Activity`, `Season`, `Stress_Before_Sleep`, `Sleep_Stage`, `Top_Keywords`, and `Cluster_ID`. Source row 696 is malformed (blank `Dream_ID`, narrative `0`, shifted field values). It remains untouched in the original CSV and is excluded from dream analysis, leaving 11,399 analyzable records. `Cluster_ID` is blank for all analyzable records; the app derives clusters from actual narratives using TF-IDF, TruncatedSVD, and deterministic K-Means. It evaluates k=2..8 using full-data silhouette and normalized elbow curvature with equal weight, and exposes inertia/silhouette values. Sentence-transformer embeddings are not configured. Of the analyzable records, `Emotion` is blank for three; those rows are not silently reclassified.

It does not contain a timestamp, location, age, gender, region, or individual owner field. Therefore the application does not claim chronological trends, geographic or demographic findings, or a personal rather than corpus-level twin. Weekly/monthly/yearly trends are marked unavailable. The `Season` source column is not used to classify psychological seasons or infer chronology. Emotion and sentiment values are displayed as source-provided labels; this project does not claim to have trained BERT.

Emotion climate percentages are transparent case-insensitive lexicon counts over actual narratives, not validated psychological indices. Progression uses record count, recurring lexicon symbols, and narrative richness; historical consistency is omitted because timestamps are absent. The progress score is a reproducible heuristic, not a calibrated probability. The chatbot is the System A hero view. It answers supported count and retrieval questions from source fields, cites real dream IDs, and declines personal or chronological claims the data cannot support. Search and similar-dream retrieval use all-MiniLM-L6-v2 when the optional `sentence-transformers` package and model weights are available; otherwise the API explicitly reports a lexical TF-IDF fallback. Clustering remains TF-IDF-based. The CSV does not contain an emotion field for new submissions; that field is left blank rather than inferred. Short submitted narratives are retained verbatim and marked low confidence when under 20 words.

## Start

Run `./start.sh`. Backend defaults expect the supplied dataset at the path above. For another location, export `DATASET_PATH=/absolute/path/to/dataset.csv` before starting.

## Vercel deployment

- The Vercel entrypoint serves the existing FastAPI routes and the built React app from the same origin. `requirements.txt` intentionally omits the optional Sentence Transformers/PyTorch stack to keep the function bundle within Vercel's size limit; the app reports embedding unavailability and uses its documented supported alternatives.
- Connect the private `dreamtwin-data` Blob store to the DreamTwin project for Production and Preview. Upload the unchanged source file as `source/dataset_deduplicated.csv` with **Private** access. The original local CSV is never included in Git or the function bundle.
- The source CSV stays immutable in Blob. Each real app submission is stored verbatim in its own private, append-only CSV record under `submissions/`, and audit events are stored as private CSV records under `audit/`. The loader combines these real records for analysis; no database or generated dream data is used.
- In Vercel project Security → Deployment Protection, enable Vercel Authentication for **All Deployments** (including Production) before uploading the source corpus. Keep the Blob store private.
- Vercel deployments require the connected store's `BLOB_STORE_ID` and platform OIDC environment, supplied when the store is connected. Local development continues to use the filesystem CSV paths described above.
