from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

load_dotenv()

@asynccontextmanager
async def app_lifespan(app: FastAPI):
    app.mongodb_client = MongoClient(os.getenv("MONGODB_URI"))
    app.database = app.mongodb_client[os.getenv("DEV_DATABASE")]
    # app.database = app.mongodb_client[env_settings.PROD_DATABASE]
    try:
        yield
    finally:
        app.mongodb_client.close()

app = FastAPI(
    title="IML Project API",
    description="FastAPI application for IML Project",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1},
    version="0.1",
    debug=True,
    lifespan=app_lifespan,
    # root_path="/api"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint to verify API and database status
    """
    try:
        return JSONResponse(content={"status": "ok"}, status_code=200)
    except Exception as e:
        return JSONResponse(
            content={"status": "error", "database": "disconnected", "detail": str(e)},
            status_code=503,
        )
    
# Include Routers
from routes.auth import auth_router
from routes.quiz import quiz_router

app.include_router(auth_router)
app.include_router(quiz_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        # log_level="info"
    )
