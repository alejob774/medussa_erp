# app/models/planeacion.py
class ForecastDemanda(Base):
    __tablename__ = "forecast_demanda"
    __table_args__ = {"schema": "planeacion"}
    id = Column(Integer, primary_key=True)
    empresa_id = Column(String(50), nullable=False)
    fecha = Column(Date, nullable=False)
    producto_id = Column(Integer, ForeignKey("inventario.productos.id"))
    cantidad = Column(Numeric(14, 2), default=0)

# app/models/comercial.py
class ZonaComercial(Base):
    __tablename__ = "zonas_comerciales"
    __table_args__ = {"schema": "comercial"}
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    empresa_id = Column(String(50), nullable=False)