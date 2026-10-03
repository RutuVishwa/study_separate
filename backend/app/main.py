from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.routes import upload, materials

# Create SQLite tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Study Material Organizer API",
    description="Backend API for classifying and organizing student study materials into 3rd-semester subjects.",
    version="1.0.0"
)

CORS_SAFE_METHODS = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, QUERY"
CORS_SAFE_HEADERS = (
    "Accept, Accept-Language, Content-Language, Content-Type, Authorization, "
    "X-Requested-With, X-CSRF-Token, Range, User-Agent"
)
CORS_MAX_AGE = 86400


@app.middleware("http")
async def permissive_cors_middleware(request: Request, call_next):
    """
    Mobile-Chrome-friendly CORS middleware.

    The default Starlette/FastAPI CORSMiddleware with allow_origins=["*"] always
    returns Access-Control-Allow-Origin: * literally. Strict mobile browsers
    (especially behind Cloudflare/Vary frontends like Render) often reject this
    in favor of an exact echo of the request's Origin header.

    This middleware always echoes the request's Origin back (if present),
    handles CORS preflight OPTIONS directly (short-circuits FastAPI routing),
    sets proper Vary/Max-Age and handles Access-Control-Request-Private-Network
    which mobile Chrome can send for sites served behind proxies.
    """
    origin = request.headers.get("origin")
    acpn = request.headers.get("access-control-request-private-network")

    preflight = request.method == "OPTIONS"

    if preflight:
        acrm = request.headers.get("access-control-request-method", "POST")
        acrh = request.headers.get("access-control-request-headers", "")
        response = Response(status_code=204, media_type="text/plain; charset=utf-8")
        response.headers["Content-Length"] = "0"
        response.headers["Access-Control-Allow-Methods"] = request.headers.get(
            "access-control-request-method", CORS_SAFE_METHODS
        )
        allow_headers = CORS_SAFE_HEADERS
        if acrh:
            allow_headers = f"{CORS_SAFE_HEADERS}, {acrh}"
        response.headers["Access-Control-Allow-Headers"] = allow_headers
        response.headers["Access-Control-Max-Age"] = str(CORS_MAX_AGE)
        if acpn:
            response.headers["Access-Control-Allow-Private-Network"] = "true"
    else:
        try:
            response = await call_next(request)
        except Exception:
            response = JSONResponse(
                {"detail": "Internal server error"},
                status_code=500,
            )

    response.headers["Vary"] = "Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Request-Private-Network"
    response.headers["Access-Control-Expose-Headers"] = "Content-Disposition, Content-Length, Content-Type"
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "false"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "false"

    return response


# API Routers
app.include_router(upload.router)
app.include_router(materials.router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint required by spec."""
    return {"status": "ok"}
