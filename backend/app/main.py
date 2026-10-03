from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import upload, materials

# Create SQLite tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Study Material Organizer API",
    description="Backend API for classifying and organizing student study materials into 3rd-semester subjects.",
    version="1.0.0"
)

# Enable CORS for frontend accessibility
# Note: allow_credentials MUST be False when allow_origins is ["*"] per
# the CORS spec. Violating this causes strict mobile browsers to reject
# preflight (OPTIONS) requests for multipart file uploads with "Failed to fetch".
# Since this API does not rely on cookies/session auth, credentials are not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Include API Routers
app.include_router(upload.router)
app.include_router(materials.router)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint required by spec."""
    return {"status": "ok"}
