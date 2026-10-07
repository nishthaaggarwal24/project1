from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from data_loader import data_loader
from routers import system_a, system_b, governance

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load dataset, build tf-idf
    print("Loading dataset and initializing models...")
    data_loader.load_dataset()
    data_loader.get_corpus() # forces generation of corpus texts
    print("Startup complete.")
    yield
    print("Shutdown...")

app = FastAPI(title="DreamTwin AI", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/health")
def health_check():
    stats = data_loader.get_stats()
    return {"status": "ok", "total_records": stats['total_records'], "source_quality": stats['source_quality']}

# Include routers
app.include_router(system_a.router)
app.include_router(system_b.router)
app.include_router(governance.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
