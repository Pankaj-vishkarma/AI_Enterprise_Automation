import os
import sys

# Add server directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.organization import Organization
from app.core.security import hash_password

def seed_db():
    # Make sure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check roles
        super_admin_role = db.query(Role).filter(Role.name == "SUPER_ADMIN").first()
        if not super_admin_role:
            super_admin_role = Role(name="SUPER_ADMIN", description="Super Administrator")
            db.add(super_admin_role)
            db.commit()
            db.refresh(super_admin_role)
            print("Created SUPER_ADMIN role.")
            
        org_admin_role = db.query(Role).filter(Role.name == "ORG_ADMIN").first()
        if not org_admin_role:
            org_admin_role = Role(name="ORG_ADMIN", description="Organization Administrator")
            db.add(org_admin_role)
            db.commit()
            db.refresh(org_admin_role)
            print("Created ORG_ADMIN role.")

        manager_role = db.query(Role).filter(Role.name == "MANAGER").first()
        if not manager_role:
            manager_role = Role(name="MANAGER", description="Manager")
            db.add(manager_role)
            db.commit()
            print("Created MANAGER role.")

        employee_role = db.query(Role).filter(Role.name == "EMPLOYEE").first()
        if not employee_role:
            employee_role = Role(name="EMPLOYEE", description="Employee")
            db.add(employee_role)
            db.commit()
            print("Created EMPLOYEE role.")
            
        # Check organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Default Org")
            db.add(org)
            db.commit()
            db.refresh(org)
            print("Created Default Org.")
            
        # Check users
        users = db.query(User).all()
        print(f"Current users: {len(users)}")
        for u in users:
            print(f"- {u.email} ({u.role.name if u.role else 'No Role'})")
            
        if not users:
            admin_user = User(
                first_name="Admin",
                last_name="User",
                email="admin@example.com",
                password_hash=hash_password("Password123"),
                organization_id=org.id,
                role_id=super_admin_role.id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Created admin@example.com / Password123 as SUPER_ADMIN.")
            
            # Let's verify permissions
            permissions_list = [
                "VIEW_ROLES", "MANAGE_USER_ROLES", "VIEW_TEAMS", "MANAGE_TEAMS",
                "VIEW_PERMISSIONS", "MANAGE_PERMISSIONS", "MANAGE_ROLE_PERMISSIONS",
                "MANAGE_USER_ASSIGNMENTS", "KNOWLEDGE_VIEW", "KNOWLEDGE_MANAGE", "KNOWLEDGE_ASK"
            ]
            for p_name in permissions_list:
                perm = db.query(Permission).filter(Permission.name == p_name).first()
                if not perm:
                    perm = Permission(name=p_name, description=f"Permission to {p_name.lower().replace('_', ' ')}")
                    db.add(perm)
                    db.commit()
                    db.refresh(perm)
                
                # Assign to super admin role
                if perm not in super_admin_role.permissions:
                    super_admin_role.permissions.append(perm)
            db.commit()
            print("Seeded all permissions and assigned to SUPER_ADMIN role.")

    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
