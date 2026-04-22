from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.demanda import ForecastDetalle, DemandaAnalisis, DemandaAlerta
from datetime import date

def procesar_analisis_demanda(db: Session, empresa_id: str, periodo: date):
    # 1. Obtener el forecast final del periodo
    detalles = db.query(ForecastDetalle).all() # En producción filtrar por fecha del forecast_id
    
    resultados = []
    for item in detalles:
        # Simulamos Venta Real (En el futuro vendrá de tabla scm_ventas_reales o similar)
        venta_real = 120.0 
        forecast = float(item.cantidad_final)
        
        # Cálculos HU-026
        error_absoluto = abs(venta_real - forecast)
        mape = (error_absoluto / venta_real) if venta_real > 0 else 0
        sesgo = forecast - venta_real # (+) Sobrestock, (-) Faltante
        
        nuevo_analisis = DemandaAnalisis(
            empresa_id=empresa_id,
            sku_id=item.producto_id,
            periodo=periodo,
            ventas_reales=venta_real,
            forecast_planeado=forecast,
            mape=mape,
            sesgo=sesgo
        )
        db.add(nuevo_analisis)
        
        # Generar alerta si el error es > 20%
        if mape > 0.20:
            alerta = DemandaAlerta(
                empresa_id=empresa_id,
                sku_id=item.producto_id,
                tipo_alerta="DESVIACION_ALTA",
                severidad="ALTA",
                descripcion=f"Error del {mape*100}% en pronóstico vs realidad."
            )
            db.add(alerta)
            
    db.commit()
    return {"status": "Analítica completada", "registros": len(detalles)}

def obtener_dashboard_analitico(db: Session, empresa_id: str):
    # Resumen para el frontend
    stats = db.query(
        func.avg(DemandaAnalisis.mape).label("mape_medio"),
        func.sum(DemandaAnalisis.ventas_reales).label("ventas_totales")
    ).filter(DemandaAnalisis.empresa_id == empresa_id).first()
    
    return {
        "precision_global": round((1 - (stats.mape_medio or 0)) * 100, 2),
        "ventas_periodo": float(stats.ventas_totales or 0),
        "moneda": "COP"
    }