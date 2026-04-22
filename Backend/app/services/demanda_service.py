from sqlalchemy.orm import Session
from app.models.demanda import Forecast, ForecastDetalle
from app.schemas.demanda import ForecastCreate

def generar_pronostico_sugerido(db: Session, empresa_id: str, producto_id: int):
    # Lógica analítica: Aquí podrías consultar ventas pasadas
    # Por ahora devolvemos un valor base para la HU
    return 100.0 

def crear_plan_demanda(db: Session, plan_in: ForecastCreate):
    db_forecast = Forecast(
        empresa_id=plan_in.empresa_id,
        version=plan_in.version,
        fecha_inicio=plan_in.fecha_inicio,
        fecha_fin=plan_in.fecha_fin,
        usuario_crea="sistema_analitico"
    )
    db.add(db_forecast)
    db.flush()

    for det in plan_in.detalles:
        # Regla HU-025: Cantidad final es la suma del sugerido y el ajuste
        c_final = det.forecast_sistema + det.ajuste_manual
        
        db_detalle = ForecastDetalle(
            forecast_id=db_forecast.id,
            producto_id=det.producto_id,
            cantidad_historica=det.demanda_historica,
            cantidad_forecast=det.forecast_sistema,
            ajuste_manual=det.ajuste_manual,
            cantidad_final=c_final
        )
        db.add(db_detalle)
    
    db.commit()
    db.refresh(db_forecast)
    return db_forecast