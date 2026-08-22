from fastapi import FastAPI
from rag_estimator import router as estimate_router
from rag_reliability import router as reliability_router

app = FastAPI()

app.include_router(estimate_router)
app.include_router(reliability_router)

