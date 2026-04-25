from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.context import _company_id_ctx_var

class MultiCompanyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # 1. Rutas exentas (Auth y Docs)
        exact_exempt_paths = ["/docs", "/redoc", "/openapi.json", "/"]
        exempt_prefixes = ["/api/v1/auth"]

        if path in exact_exempt_paths or any(path.startswith(p) for p in exempt_prefixes):
            return await call_next(request)

        # 2. Capturar X-Company-ID
        empresa_id = request.headers.get("X-Company-ID")

        if not empresa_id:
            return JSONResponse(
                status_code=401,
                content={"detail": "No autorizado. El header X-Company-ID es obligatorio."}
            )

        # 3. Seteo del ContextVar (Garantiza que el servicio lo vea)
        token = _company_id_ctx_var.set(empresa_id)
        
        try:
            response = await call_next(request)
            return response
        finally:
            # Limpieza del contexto al terminar la petición
            _company_id_ctx_var.reset(token)