# seed_db.py
from app.db.session import SessionLocal
from app.models.usuarios import Usuario
from app.core.security import get_password_hash

def seed():
    db = SessionLocal()
    try:
        # Buscamos por email
        admin_exists = db.query(Usuario).filter(Usuario.email == "admin@medussa.com").first()
        if not admin_exists:
            # Generamos el hash con la lógica de 72 bytes para Python 3.13
            hashed_pwd = get_password_hash("PasswordSeguro123!")
            
            admin_user = Usuario(
                nombre="Admin",
                apellido="Sistema", # Añadido ya que el modelo lo pide como obligatorio
                username="admin",
                email="admin@medussa.com",
                password_hash=hashed_pwd, # CAMBIO AQUÍ
                cargo="Administrador",
                celular="0000000000",
                estado=True
            )
            db.add(admin_user)
            db.commit()
            print("✅ Usuario admin@medussa.com creado con éxito.")
        else:
            print("⚠️ El usuario admin ya existe.")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()