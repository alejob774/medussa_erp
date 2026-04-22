from sqlalchemy.orm import Session
from app.models.bom import ProduccionBOM, ProduccionBOMDetalle

def crear_formula_bom(db: Session, data: dict, empresa_id: str):
    # 1. Crear encabezado de la fórmula
    nueva_formula = ProduccionBOM(
        empresa_id=empresa_id,
        producto_id=data['producto_id'],
        version="1.0",
        estado="BORRADOR",
        vigencia_desde=data['vigencia_desde'],
        merma_esperada=data['merma_esperada'],
        tiempo_proceso=data['tiempo_proceso_min'],
        rendimiento_esperado=data['rendimiento_esperado'],
        observaciones=data.get('observaciones')
    )
    
    db.add(nueva_formula)
    db.flush() # Para obtener el ID de la fórmula

    # 2. Agregar detalles (ingredientes) y calcular costo total
    costo_total_estandar = 0
    for ing in data['ingredientes']:
        detalle = ProduccionBOMDetalle(
            bom_id=nueva_formula.id,
            materia_prima_id=ing['insumo_id'],
            cantidad=ing['cantidad'],
            unidad_medida=ing['unidad'],
            costo_unitario=ing['costo_unitario']
        )
        costo_total_estandar += (ing['cantidad'] * ing['costo_unitario'])
        db.add(detalle)

    db.commit()
    db.refresh(nueva_formula)
    
    return {
        "formula": nueva_formula,
        "costo_estandar_lote": costo_total_estandar,
        "costo_estandar_unidad": costo_total_estandar / data['rendimiento_esperado'] if data['rendimiento_esperado'] > 0 else 0
    }

def aprobar_formula(db: Session, formula_id: int):
    formula = db.query(ProduccionBOM).filter(ProduccionBOM.id == formula_id).first()
    if formula:
        # Desactivar versiones anteriores vigentes del mismo producto
        db.query(ProduccionBOM).filter(
            ProduccionBOM.producto_id == formula.producto_id,
            ProduccionBOM.estado == "VIGENTE"
        ).update({"estado": "OBSOLETA"})
        
        formula.estado = "VIGENTE"
        db.commit()
    return formula