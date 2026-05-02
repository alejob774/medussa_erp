from app.db.session import SessionLocal
from app.models.usuarios import Usuario
from app.core.security import get_password_hash

db = SessionLocal()
admin = db.query(Usuario).filter(Usuario.username == "admin@medussa.com").first()
if admin:
    admin.hashed_password = get_password_hash("admin123")
    db.commit()
    print("Contraseña reseteada a: admin123")