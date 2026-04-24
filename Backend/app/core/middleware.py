from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.core.context import set_company_context

class MultiCompanyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Lista de rutas que NO requieren validación de empresa (Auth, Docs)
        exempt_paths = ["/api/v1/auth", "/docs", "/redoc", "/openapi.json", "/"]
        
        if any(request.url.path.startswith(path) for path in exempt_paths):
            return await call_next(request)

        # 2. Detectar el header X-Company-ID
        empresa_id = request.headers.get("X-Company-ID")

        # 3. Validar presencia (Error 422 como solicitaste)
        if not empresa_id:
            return JSONResponse(
                status_code=422,
                content={
                    "detail": [
                        {
                            "loc": ["header", "X-Company-ID"],
                            "msg": "El header X-Company-ID es obligatorio para esta ruta.",
                            "type": "value_error.missing"
                        }
                    ]
                }
            )

        # 4. Almacenar en el contexto global
        token = set_company_context(empresa_id)
        
        try:
            response = await call_next(request)
            return response
        finally:
            # Es buena práctica resetear contextos en tests o procesos largos, 
            # aunque en FastAPI el contextvar muere con el scope de la corrutina.
            pass