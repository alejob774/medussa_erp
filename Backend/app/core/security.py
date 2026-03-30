import bcrypt

def get_password_hash(password: str) -> str:
    """
    Genera un hash seguro usando bcrypt directamente.
    Maneja el límite de 72 bytes truncando manualmente para evitar el ValueError de Python 3.13.
    """
    # 1. Convertir a bytes (UTF-8)
    pwd_bytes = password.encode('utf-8')
    
    # 2. Truncar manualmente a 72 bytes (límite de bcrypt)
    if len(pwd_bytes) > 72:
        pwd_bytes = pwd_bytes[:72]
        
    # 3. Generar sal y hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    
    # 4. Devolver como string
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si la contraseña coincide con el hash almacenado.
    """
    try:
        # Convertir entrada a bytes y truncar igual que al crear el hash
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
            
        # El hash de la DB debe ser bytes para bcrypt.checkpw
        hashed_bytes = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False