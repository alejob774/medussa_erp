# app/services/desarrollo_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.desarrollo_productos import ProyectoProducto, ProyectoBOM
from app.models.inventario import Producto
from app.models.bom import ProduccionBOM, ProduccionBOMDetalle
from app.models.configuracion import Configuracion  # Importante para validar empresa_id

def crear_proyecto_desarrollo(db: Session, data: dict):
    # 1. Validar que la empresa existe (Evita el error de ForeignKeyViolation)
    empresa = db.query(Configuracion).filter(
        Configuracion.empresa_id == data['empresa_id']
    ).first()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La empresa con ID '{data['empresa_id']}' no existe."
        )

    # 2. Crear el encabezado del proyecto
    proyecto = ProyectoProducto(
        empresa_id=data['empresa_id'],
        nombre_producto=data['nombre_producto'],
        categoria=data['categoria'],
        sku_propuesto=data['sku_propuesto'],
        mercado_objetivo=data['mercado_objetivo'],
        fecha_lanzamiento=data['fecha_lanzamiento'],
        proyeccion_ventas=data['proyeccion_ventas'],
        responsable_id=data['responsable_id'],
        estado_proyecto="IDEA" # Estado inicial por defecto
    )
    
    try:
        db.add(proyecto)
        db.flush() # Obtener proyecto.id

        # 3. Crear el BOM preliminar si existe en el request
        if 'bom_preliminar' in data and data['bom_preliminar']:
            for item in data['bom_preliminar']:
                bom_item = ProyectoBOM(
                    proyecto_id=proyecto.id,
                    item_codigo=item.get('item_codigo'),
                    descripcion=item.get('descripcion'),
                    cantidad=item.get('cantidad'),
                    unidad_medida=item.get('unidad_medida'),
                    costo_estimado=item.get('costo_estimado', 0.0)
                )
                db.add(bom_item)
        
        db.commit()
        db.refresh(proyecto)
        return proyecto

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear el proyecto: {str(e)}"
        )

def convertir_a_maestro(db: Session, proyecto_id: int):
    # 1. Buscar el proyecto
    proyecto = db.query(ProyectoProducto).filter(ProyectoProducto.id == proyecto_id).first()
    
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto de desarrollo no encontrado")
    
    if proyecto.estado_proyecto == "LANZADO":
        raise HTTPException(status_code=400, detail="Este proyecto ya ha sido lanzado al maestro anteriormente")

    try:
        # 2. Crear el Producto Real en el maestro de inventarios
        nuevo_producto = Producto(
            empresa_id=proyecto.empresa_id,
            producto_nom=proyecto.nombre_producto,
            producto_sku=proyecto.sku_propuesto,
            producto_fam=proyecto.categoria,
            producto_descrip=f"Producto lanzado desde proyecto de innovación #{proyecto.id}",
            uom_base="UN", # Valor por defecto, ajustar según lógica de negocio
            producto_status="Activo"
        )
        db.add(nuevo_producto)
        db.flush() # Obtener nuevo_producto.id

        # 3. Crear el encabezado de la Lista de Materiales (BOM) Real
        nueva_bom = ProduccionBOM(
            empresa_id=proyecto.empresa_id,
            producto_id=nuevo_producto.id,
            version="1.0",
            estado="VIGENTE",
            observaciones=f"BOM migrada automáticamente desde proyecto {proyecto.id}"
        )
        db.add(nueva_bom)
        db.flush()

        # 4. Migrar ingredientes del BOM preliminar al BOM real
        # Asumimos que proyecto.ingredientes_preliminares es la relación definida en el modelo
        for item in proyecto.ingredientes_preliminares:
            # Importante: Aquí se debería mapear 'item_codigo' a un producto_id real 
            # de la tabla inventario.productos si son materias primas existentes.
            detalle_real = ProduccionBOMDetalle(
                bom_id=nueva_bom.id,
                # Si el ingrediente ya existe, buscar su ID, de lo contrario usar nulo o genérico
                cantidad_neta=item.cantidad,
                merma_porcentaje=0.0
            )
            db.add(detalle_real)

        # 5. Actualizar estado del proyecto
        proyecto.estado_proyecto = "LANZADO"
        
        db.commit()
        return {
            "status": "Conversión exitosa", 
            "producto_id": nuevo_producto.id,
            "bom_id": nueva_bom.id,
            "sku": nuevo_producto.producto_sku
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Fallo en la conversión: {str(e)}"
        )