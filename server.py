import os
import sqlite3
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS for all cross-origin requests
CORS(app)

DB_PATH = 'assetflow.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Helper to run migrations and seed data
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        head_id TEXT,
        parent_id TEXT,
        status TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        custom_fields TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        department_id TEXT,
        role TEXT NOT NULL,
        status TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        tag TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        serial_number TEXT UNIQUE NOT NULL,
        acquisition_date TEXT NOT NULL,
        acquisition_cost REAL NOT NULL,
        condition TEXT NOT NULL,
        location TEXT NOT NULL,
        is_shared INTEGER NOT NULL,
        status TEXT NOT NULL,
        allocated_to TEXT,
        expected_return_date TEXT,
        custom_fields TEXT,
        history TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        from_employee_id TEXT NOT NULL,
        to_employee_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        request_date TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        approved_by TEXT,
        approval_date TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS maintenance (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        reported_by TEXT NOT NULL,
        issue_description TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        raised_date TEXT NOT NULL,
        approved_by TEXT,
        technician_name TEXT,
        resolution_details TEXT,
        resolved_date TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS audits (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        scope_department_id TEXT,
        scope_location TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        assigned_auditors TEXT NOT NULL,
        status TEXT NOT NULL,
        findings TEXT NOT NULL,
        discrepancies TEXT,
        closed_by TEXT,
        closed_date TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        message TEXT NOT NULL,
        date TEXT NOT NULL,
        is_read INTEGER NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS logs (
        date TEXT NOT NULL,
        user TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL
    )
    ''')

    conn.commit()

    # Check if we need to seed the data
    cursor.execute("SELECT COUNT(*) FROM employees")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)
    
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()
    print("Database is empty. Seeding initial ERP datasets...")

    # Seed Departments
    depts = [
        ("dept-1", "Information Technology", "emp-2", "", "Active"),
        ("dept-2", "Human Resources", "emp-3", "", "Active"),
        ("dept-3", "Operations", "emp-4", "", "Active"),
        ("dept-4", "Engineering", "emp-4", "dept-1", "Active"),
        ("dept-5", "Finance", "", "", "Inactive")
    ]
    cursor.executemany("INSERT INTO departments VALUES (?, ?, ?, ?, ?)", depts)

    # Seed Categories
    cats = [
        ("cat-1", "Electronics", json.dumps([{"name": "Warranty Months", "type": "number", "value": "24"}, {"name": "OS", "type": "text", "value": "Windows 11"}])),
        ("cat-2", "Vehicles", json.dumps([{"name": "Fuel Type", "type": "text", "value": "Electric"}, {"name": "License Plate", "type": "text", "value": ""}])),
        ("cat-3", "Office Furniture", json.dumps([{"name": "Material", "type": "text", "value": "Ergonomic Mesh"}])),
        ("cat-4", "Shared Spaces", json.dumps([{"name": "Capacity", "type": "number", "value": "10"}]))
    ]
    cursor.executemany("INSERT INTO categories VALUES (?, ?, ?)", cats)

    # Seed Employees
    employees = [
        ("emp-1", "Administrator", "admin@assetflow.com", "password123", "dept-1", "Admin", "Active"),
        ("emp-2", "Priya Sharma", "priya@assetflow.com", "password123", "dept-1", "Asset Manager", "Active"),
        ("emp-3", "Raj Patel", "raj@assetflow.com", "password123", "dept-2", "Department Head", "Active"),
        ("emp-4", "Amit Kumar", "amit@assetflow.com", "password123", "dept-3", "Department Head", "Active"),
        ("emp-5", "Siddharth Rao", "sid@assetflow.com", "password123", "dept-1", "Employee", "Active"),
        ("emp-6", "Neha Gupta", "neha@assetflow.com", "password123", "dept-2", "Employee", "Active"),
        ("emp-7", "Vikram Singh", "vikram@assetflow.com", "password123", "dept-3", "Employee", "Active"),
        ("emp-8", "Pooja Mehta", "pooja@assetflow.com", "password123", "dept-4", "Employee", "Active")
    ]
    cursor.executemany("INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?)", employees)

    # Seed Assets
    assets = [
        (
            "asset-1", "AF-0001", "MacBook Pro M3 Max", "cat-1", "SN-MBP99281A", "2025-06-15", 2800.0, "Excellent", "IT Room 302", 0, "Allocated",
            json.dumps({"type": "Employee", "id": "emp-5"}), "2026-06-15",
            json.dumps([]),
            json.dumps([
                {"date": "2025-06-15", "action": "Registration", "user": "Priya Sharma", "notes": "Asset registered under IT department."},
                {"date": "2025-06-16", "action": "Allocation", "user": "Priya Sharma", "notes": "Allocated to Siddharth Rao. Expected return: 2026-06-15."}
            ])
        ),
        (
            "asset-2", "AF-0002", "ThinkPad T14 Gen 4", "cat-1", "SN-TPAD48301B", "2025-08-20", 1400.0, "Good", "Main HQ", 0, "Available",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2025-08-20", "action": "Registration", "user": "Priya Sharma", "notes": "Standard developer issue laptop."}
            ])
        ),
        (
            "asset-3", "AF-0003", "Conference Room Alpha", "cat-4", "ROOM-CONF-A", "2024-01-10", 15000.0, "Excellent", "Block B, 2nd Floor", 1, "Available",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2024-01-10", "action": "Registration", "user": "Administrator", "notes": "Conference room space with projector."}
            ])
        ),
        (
            "asset-4", "AF-0004", "Tesla Model Y (Company Car)", "cat-2", "VIN-5YJ3E1EA5L", "2024-11-05", 45000.0, "Good", "Basement Parking B1", 1, "Reserved",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2024-11-05", "action": "Registration", "user": "Priya Sharma", "notes": "Tesla Model Y for executive travels."}
            ])
        ),
        (
            "asset-5", "AF-0005", "Dell UltraSharp 32'' Monitor", "cat-1", "SN-DELL32901", "2025-01-12", 800.0, "Fair", "Engineering Bay 4", 0, "Under Maintenance",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2025-01-12", "action": "Registration", "user": "Priya Sharma", "notes": "4K designer monitor."},
                {"date": "2026-07-10", "action": "Maintenance Raised", "user": "Amit Kumar", "notes": "Display flickering on warm boot."}
            ])
        ),
        (
            "asset-6", "AF-0006", "Ergonomic Desk Chair", "cat-3", "SN-CHAIR8819", "2025-02-18", 350.0, "Good", "Operations Area", 0, "Allocated",
            json.dumps({"type": "Department", "id": "dept-3"}), "2026-09-01",
            json.dumps([]),
            json.dumps([
                {"date": "2025-02-18", "action": "Registration", "user": "Priya Sharma", "notes": "Mesh support back chair."},
                {"date": "2025-02-19", "action": "Allocation", "user": "Priya Sharma", "notes": "Allocated to Operations department."}
            ])
        ),
        (
            "asset-7", "AF-0007", "iPad Pro 12.9''", "cat-1", "SN-IPAD9901B", "2025-09-10", 1100.0, "Excellent", "IT Room 302", 0, "Available",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2025-09-10", "action": "Registration", "user": "Priya Sharma", "notes": "iPad Pro with Apple Pencil."}
            ])
        ),
        (
            "asset-8", "AF-0008", "Conference Room Beta", "cat-4", "ROOM-CONF-B", "2024-01-10", 10000.0, "Excellent", "Block B, 1st Floor", 1, "Available",
            None, None,
            json.dumps([]),
            json.dumps([
                {"date": "2024-01-10", "action": "Registration", "user": "Administrator", "notes": "Smaller conference room."}
            ])
        )
    ]
    cursor.executemany("INSERT INTO assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", assets)

    # Seed Transfers
    trans = [
        ("trans-1", "asset-1", "emp-5", "emp-8", "emp-8", "2026-07-11", "Siddharth has left for vacation and I need this laptop for testing high-load builds.", "Pending", None, None)
    ]
    cursor.executemany("INSERT INTO transfers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", trans)

    # Seed Bookings
    bookings = [
        ("book-1", "asset-3", "emp-6", "2026-07-12T10:00", "2026-07-12T11:30", "Monthly Team Alignment & OKR Review", "Ongoing"),
        ("book-2", "asset-3", "emp-7", "2026-07-12T14:00", "2026-07-12T15:30", "Engineering Sprint Planning", "Upcoming"),
        ("book-3", "asset-4", "emp-3", "2026-07-12T09:00", "2026-07-12T17:00", "Client Visit at HighTech City Office", "Ongoing")
    ]
    cursor.executemany("INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?)", bookings)

    # Seed Maintenance
    maint = [
        ("maint-1", "asset-5", "emp-7", "Flickering lines across the lower half of screen.", "High", "In Progress", "2026-07-09", "emp-2", "Alex Mercer (Internal Support)", "", None),
        ("maint-2", "asset-2", "emp-5", "Battery draining in less than 1.5 hours.", "Medium", "Pending", "2026-07-12", None, "", "", None)
    ]
    cursor.executemany("INSERT INTO maintenance VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", maint)

    # Seed Audits
    audits = [
        (
            "audit-1", "Q2 IT Asset Compliance Audit", "dept-1", "IT Room 302", "2026-06-01", "2026-06-10",
            json.dumps(["emp-2", "emp-3"]), "Closed",
            json.dumps({"asset-1": "Verified", "asset-7": "Verified"}),
            json.dumps([]), "emp-1", "2026-06-10"
        ),
        (
            "audit-2", "July Facilities Spot Audit", "", "Main HQ", "2026-07-05", "2026-07-15",
            json.dumps(["emp-2"]), "Active",
            json.dumps({"asset-2": "Verified"}),
            json.dumps([]), "", ""
        )
    ]
    cursor.executemany("INSERT INTO audits VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", audits)

    # Seed Notifications
    notifs = [
        ("notif-1", "emp-5", "Laptop AF-0001 return is overdue (expected: 2026-06-15). Please return or request extension.", "2026-07-12T08:00:00", 0),
        ("notif-2", "emp-2", "New Transfer Request: Siddharth Rao -> Pooja Mehta for MacBook Pro (AF-0001).", "2026-07-11T16:30:00", 0),
        ("notif-3", "emp-3", "Booking Confirmed: Tesla Model Y (AF-0004) for today, 09:00 - 17:00.", "2026-07-12T08:30:00", 1)
    ]
    cursor.executemany("INSERT INTO notifications VALUES (?, ?, ?, ?, ?)", notifs)

    # Seed logs
    logs = [
        ("2026-07-12T09:00:00", "Raj Patel", "Resource Booking", "Booked Tesla Model Y from 09:00 to 17:00"),
        ("2026-07-12T08:15:00", "Siddharth Rao", "Maintenance Request", "Raised request for ThinkPad battery issue"),
        ("2026-07-11T16:30:00", "Pooja Mehta", "Transfer Request", "Requested transfer of MacBook Pro AF-0001 from Siddharth Rao"),
        ("2025-06-15T10:00:00", "Priya Sharma", "Asset Registration", "Registered MacBook Pro M3 Max (AF-0001)")
    ]
    cursor.executemany("INSERT INTO logs VALUES (?, ?, ?, ?)", logs)

    conn.commit()
    print("Database seeding completed successfully.")

# Initialize the schema
init_db()

# --- HELPER SYSTEM LOGGING & NOTIFY ---
def write_log(user, action, details):
    conn = get_db_connection()
    conn.execute("INSERT INTO logs VALUES (?, ?, ?, ?)", (datetime.now().isoformat(), user, action, details))
    conn.commit()
    conn.close()

def send_notification(emp_id, message):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO notifications VALUES (?, ?, ?, ?, 0)",
        (f"notif-{int(datetime.now().timestamp() * 1000)}", emp_id, message, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

# ====================================================
# REST API ENDPOINTS
# ====================================================

# 1. Auth Endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    emp = conn.execute("SELECT * FROM employees WHERE email = ? AND password = ?", (email, password)).fetchone()
    conn.close()

    if emp:
        emp_dict = dict(emp)
        if emp_dict['status'] != 'Active':
            return jsonify({'error': 'Account is deactivated. Contact Admin.'}), 403
        
        write_log(emp_dict['name'], "Sign In", "Successfully signed into the ERP platform")
        return jsonify(emp_dict)
    
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required.'}), 400

    conn = get_db_connection()
    exists = conn.execute("SELECT 1 FROM employees WHERE email = ?", (email,)).fetchone()
    if exists:
        conn.close()
        return jsonify({'error': 'Email address already registered.'}), 400

    emp_id = f"emp-{int(datetime.now().timestamp() * 1000)}"
    conn.execute(
        "INSERT INTO employees VALUES (?, ?, ?, ?, '', 'Employee', 'Active')",
        (emp_id, name, email, password)
    )
    conn.commit()
    conn.close()

    write_log(name, "Sign Up", "Created employee account via signup")
    return jsonify({'id': emp_id, 'name': name, 'email': email, 'role': 'Employee', 'status': 'Active', 'department_id': ''})

# 2. Departments API
@app.route('/api/departments', methods=['GET', 'POST'])
def departments_api():
    conn = get_db_connection()
    if request.method == 'GET':
        depts = conn.execute("SELECT * FROM departments").fetchall()
        conn.close()
        return jsonify([dict(d) for d in depts])
    
    # POST - Create Department
    data = request.json
    name = data.get('name')
    head_id = data.get('headId')
    parent_id = data.get('parentId')
    user_name = data.get('userName', 'Admin')

    if not name:
        conn.close()
        return jsonify({'error': 'Department name is required.'}), 400

    dept_id = f"dept-{int(datetime.now().timestamp() * 1000)}"
    conn.execute("INSERT INTO departments VALUES (?, ?, ?, ?, 'Active')", (dept_id, name, head_id, parent_id))
    
    # Promote Head employee to Dept Head
    if head_id:
        conn.execute("UPDATE employees SET role = 'Department Head', department_id = ? WHERE id = ?", (dept_id, head_id))
    
    conn.commit()
    conn.close()

    write_log(user_name, "Create Department", f"Created department: {name}")
    return jsonify({'status': 'success', 'id': dept_id})

@app.route('/api/departments/<id>/status', methods=['POST'])
def toggle_dept_status(id):
    data = request.json
    status = data.get('status')
    user_name = data.get('userName', 'Admin')

    conn = get_db_connection()
    conn.execute("UPDATE departments SET status = ? WHERE id = ?", (status, id))
    conn.commit()
    conn.close()

    write_log(user_name, "Update Department Status", f"Toggled department ID {id} status to {status}")
    return jsonify({'status': 'success'})

# 3. Categories API
@app.route('/api/categories', methods=['GET', 'POST'])
def categories_api():
    conn = get_db_connection()
    if request.method == 'GET':
        cats = conn.execute("SELECT * FROM categories").fetchall()
        conn.close()
        
        res = []
        for c in cats:
            c_dict = dict(c)
            c_dict['customFields'] = json.loads(c_dict['custom_fields']) if c_dict['custom_fields'] else []
            res.append(c_dict)
        return jsonify(res)

    # POST - Create Category
    data = request.json
    name = data.get('name')
    custom_fields = data.get('customFields', [])
    user_name = data.get('userName', 'Admin')

    if not name:
        conn.close()
        return jsonify({'error': 'Category name is required.'}), 400

    cat_id = f"cat-{int(datetime.now().timestamp() * 1000)}"
    conn.execute("INSERT INTO categories VALUES (?, ?, ?)", (cat_id, name, json.dumps(custom_fields)))
    conn.commit()
    conn.close()

    write_log(user_name, "Create Category", f"Created asset category: {name}")
    return jsonify({'status': 'success', 'id': cat_id})

@app.route('/api/categories/<id>', methods=['DELETE'])
def delete_category(id):
    conn = get_db_connection()
    conn.execute("DELETE FROM categories WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

# 4. Employees API
@app.route('/api/employees', methods=['GET'])
def employees_api():
    conn = get_db_connection()
    emps = conn.execute("SELECT * FROM employees").fetchall()
    conn.close()
    return jsonify([dict(e) for e in emps])

@app.route('/api/employees/<id>/role', methods=['POST'])
def update_employee_role(id):
    data = request.json
    role = data.get('role')
    user_name = data.get('userName', 'Admin')

    conn = get_db_connection()
    conn.execute("UPDATE employees SET role = ? WHERE id = ?", (role, id))
    conn.commit()
    conn.close()

    write_log(user_name, "Promote Employee", f"Updated role of employee ID {id} to {role}")
    return jsonify({'status': 'success'})

@app.route('/api/employees/<id>/status', methods=['POST'])
def update_employee_status(id):
    data = request.json
    status = data.get('status')
    user_name = data.get('userName', 'Admin')

    conn = get_db_connection()
    conn.execute("UPDATE employees SET status = ? WHERE id = ?", (status, id))
    conn.commit()
    conn.close()

    write_log(user_name, "Update Employee Status", f"Toggled employee ID {id} status to {status}")
    return jsonify({'status': 'success'})

# 5. Assets API
@app.route('/api/assets', methods=['GET', 'POST'])
def assets_api():
    conn = get_db_connection()
    if request.method == 'GET':
        assets = conn.execute("SELECT * FROM assets").fetchall()
        conn.close()

        res = []
        for a in assets:
            a_dict = dict(a)
            a_dict['isShared'] = bool(a_dict['is_shared'])
            a_dict['allocatedTo'] = json.loads(a_dict['allocated_to']) if a_dict['allocated_to'] else None
            a_dict['customFields'] = json.loads(a_dict['custom_fields']) if a_dict['custom_fields'] else []
            a_dict['history'] = json.loads(a_dict['history']) if a_dict['history'] else []
            res.append(a_dict)
        return jsonify(res)

    # POST - Register Asset
    data = request.json
    name = data.get('name')
    category_id = data.get('categoryId')
    serial_number = data.get('serialNumber')
    acquisition_date = data.get('acquisitionDate')
    acquisition_cost = float(data.get('acquisitionCost', 0))
    condition = data.get('condition', 'Excellent')
    location = data.get('location')
    is_shared = 1 if data.get('isShared') else 0
    custom_fields = data.get('customFields', [])
    user_name = data.get('userName', 'Asset Manager')

    if not name or not category_id or not serial_number or not location:
        conn.close()
        return jsonify({'error': 'Required asset registration parameters missing.'}), 400

    # Auto tag calculation (e.g. AF-0009)
    assets_count = conn.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
    tag = f"AF-{str(assets_count + 1).zfill(4)}"

    # Check serial number duplicates
    dup = conn.execute("SELECT 1 FROM assets WHERE serial_number = ?", (serial_number,)).fetchone()
    if dup:
        conn.close()
        return jsonify({'error': f'Asset with Serial Number {serial_number} already registered.'}), 400

    asset_id = f"asset-{int(datetime.now().timestamp() * 1000)}"
    history = [{"date": datetime.now().isoformat().split('T')[0], "action": "Registration", "user": user_name, "notes": f"Asset registered by {user_name}."}]

    conn.execute(
        "INSERT INTO assets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', NULL, NULL, ?, ?)",
        (asset_id, tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, is_shared, json.dumps(custom_fields), json.dumps(history))
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Register Asset", f"Registered new asset {name} ({tag})")
    return jsonify({'status': 'success', 'id': asset_id, 'tag': tag})

# 6. Allocations & Returns API
@app.route('/api/allocations', methods=['POST'])
def allocate_asset():
    data = request.json
    asset_id = data.get('assetId')
    emp_id = data.get('empId')
    dept_id = data.get('deptId')
    return_date = data.get('returnDate')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if not asset:
        conn.close()
        return jsonify({'error': 'Asset not found.'}), 404
    
    asset_dict = dict(asset)
    if asset_dict['status'] == 'Allocated':
        conn.close()
        return jsonify({'error': 'Double-allocation conflict.'}), 409

    # Setup allocated details
    allocated_to = None
    notes = ""
    if emp_id:
        allocated_to = {"type": "Employee", "id": emp_id}
        emp = conn.execute("SELECT name FROM employees WHERE id = ?", (emp_id,)).fetchone()
        notes = f"Allocated to employee: {emp['name']}."
    elif dept_id:
        allocated_to = {"type": "Department", "id": dept_id}
        dept = conn.execute("SELECT name FROM departments WHERE id = ?", (dept_id,)).fetchone()
        notes = f"Allocated to department: {dept['name']}."
    else:
        conn.close()
        return jsonify({'error': 'Allocation holder target missing.'}), 400

    history = json.loads(asset_dict['history']) if asset_dict['history'] else []
    history.append({
        "date": datetime.now().isoformat().split('T')[0],
        "action": "Allocation",
        "user": user_name,
        "notes": f"{notes} Expected return: {return_date or 'None'}."
    })

    conn.execute(
        "UPDATE assets SET status = 'Allocated', allocated_to = ?, expected_return_date = ?, history = ? WHERE id = ?",
        (json.dumps(allocated_to), return_date, json.dumps(history), asset_id)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Allocate Asset", f"Allocated asset tag {asset_dict['tag']} to {emp_id or dept_id}")
    
    if emp_id:
        send_notification(emp_id, f"Asset Allocated: {asset_dict['name']} ({asset_dict['tag']}) has been assigned to you. Expected: {return_date or 'None'}.")
        
    return jsonify({'status': 'success'})

@app.route('/api/allocations/return', methods=['POST'])
def return_asset():
    data = request.json
    asset_id = data.get('assetId')
    condition = data.get('condition')
    notes = data.get('notes')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
    if not asset:
        conn.close()
        return jsonify({'error': 'Asset not found.'}), 404

    asset_dict = dict(asset)
    history = json.loads(asset_dict['history']) if asset_dict['history'] else []
    history.append({
        "date": datetime.now().isoformat().split('T')[0],
        "action": "Return Check-in",
        "user": user_name,
        "notes": f"Asset returned in {condition} condition. Notes: {notes or 'None'}"
    })

    conn.execute(
        "UPDATE assets SET status = 'Available', allocated_to = NULL, expected_return_date = NULL, condition = ?, history = ? WHERE id = ?",
        (condition, json.dumps(history), asset_id)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Return Check-in", f"Returned asset tag {asset_dict['tag']} with condition {condition}")
    return jsonify({'status': 'success'})

# 7. Transfers API
@app.route('/api/transfers', methods=['GET', 'POST'])
def transfers_api():
    conn = get_db_connection()
    if request.method == 'GET':
        trans = conn.execute("SELECT * FROM transfers").fetchall()
        conn.close()
        return jsonify([dict(t) for t in trans])

    # POST - Create request
    data = request.json
    asset_id = data.get('assetId')
    from_emp_id = data.get('fromEmployeeId')
    to_emp_id = data.get('toEmployeeId')
    requested_by = data.get('requestedBy')
    reason = data.get('reason')
    user_name = data.get('userName', 'Employee')

    if not asset_id or not from_emp_id or not to_emp_id or not reason:
        conn.close()
        return jsonify({'error': 'Required parameters missing.'}), 400

    trans_id = f"trans-{int(datetime.now().timestamp() * 1000)}"
    conn.execute(
        "INSERT INTO transfers VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NULL, NULL)",
        (trans_id, asset_id, from_emp_id, to_emp_id, requested_by, datetime.now().isoformat().split('T')[0], reason)
    )
    
    # Notify Asset Manager
    managers = conn.execute("SELECT id FROM employees WHERE role = 'Asset Manager'").fetchall()
    asset = conn.execute("SELECT tag FROM assets WHERE id = ?", (asset_id,)).fetchone()
    for m in managers:
        send_notification(m['id'], f"New Transfer Request: Asset tag {asset['tag']} transfer requested.")
        
    conn.commit()
    conn.close()

    write_log(user_name, "Raise Transfer Request", f"Requested transfer for asset ID {asset_id}")
    return jsonify({'status': 'success', 'id': trans_id})

@app.route('/api/transfers/<id>/approve', methods=['POST'])
def approve_transfer(id):
    data = request.json
    approver_id = data.get('approverId')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    t = conn.execute("SELECT * FROM transfers WHERE id = ?", (id,)).fetchone()
    if not t:
        conn.close()
        return jsonify({'error': 'Request not found.'}), 404
    
    t_dict = dict(t)
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (t_dict['asset_id'],)).fetchone()
    asset_dict = dict(asset)

    history = json.loads(asset_dict['history']) if asset_dict['history'] else []
    history.append({
        "date": datetime.now().isoformat().split('T')[0],
        "action": "Transfer",
        "user": user_name,
        "notes": f"Transferred from employee ID {t_dict['from_employee_id']} to {t_dict['to_employee_id']}. Approved by {user_name}."
    })

    conn.execute(
        "UPDATE assets SET allocated_to = ?, history = ? WHERE id = ?",
        (json.dumps({"type": "Employee", "id": t_dict['to_employee_id']}), json.dumps(history), t_dict['asset_id'])
    )

    conn.execute(
        "UPDATE transfers SET status = 'Approved', approved_by = ?, approval_date = ? WHERE id = ?",
        (approver_id, datetime.now().isoformat().split('T')[0], id)
    )

    conn.commit()
    conn.close()

    write_log(user_name, "Approve Transfer", f"Approved transfer of {asset_dict['tag']} to {t_dict['to_employee_id']}")
    send_notification(t_dict['to_employee_id'], f"Transfer Approved: Asset {asset_dict['name']} ({asset_dict['tag']}) has been successfully transferred to you.")
    send_notification(t_dict['from_employee_id'], f"Transfer Complete: Asset {asset_dict['name']} ({asset_dict['tag']}) was transferred.")

    return jsonify({'status': 'success'})

@app.route('/api/transfers/<id>/reject', methods=['POST'])
def reject_transfer(id):
    data = request.json
    approver_id = data.get('approverId')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    t = conn.execute("SELECT * FROM transfers WHERE id = ?", (id,)).fetchone()
    if not t:
        conn.close()
        return jsonify({'error': 'Request not found.'}), 404
    
    t_dict = dict(t)
    conn.execute(
        "UPDATE transfers SET status = 'Rejected', approved_by = ?, approval_date = ? WHERE id = ?",
        (approver_id, datetime.now().isoformat().split('T')[0], id)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Reject Transfer", f"Rejected transfer of asset ID {t_dict['asset_id']}")
    send_notification(t_dict['requested_by'], f"Transfer Rejected: Your transfer request for asset ID {t_dict['asset_id']} was rejected.")
    return jsonify({'status': 'success'})

# 8. Bookings API (Calendar)
@app.route('/api/bookings', methods=['GET', 'POST'])
def bookings_api():
    conn = get_db_connection()
    if request.method == 'GET':
        books = conn.execute("SELECT * FROM bookings").fetchall()
        conn.close()
        return jsonify([dict(b) for b in books])

    # POST - Book resource
    data = request.json
    resource_id = data.get('resourceId')
    employee_id = data.get('employeeId')
    start_time = data.get('startTime')
    end_time = data.get('endTime')
    purpose = data.get('purpose')
    user_name = data.get('userName', 'Employee')

    if not resource_id or not employee_id or not start_time or not end_time or not purpose:
        conn.close()
        return jsonify({'error': 'Missing reservation slot inputs.'}), 400

    # Booking overlap verification: (StartA < EndB) and (StartB < EndA)
    # in database query terms:
    overlap = conn.execute(
        "SELECT 1 FROM bookings WHERE resource_id = ? AND status != 'Cancelled' AND (start_time < ? AND ? < end_time)",
        (resource_id, end_time, start_time)
    ).fetchone()

    if overlap:
        conn.close()
        return jsonify({'error': 'Overlap reservation detected. Booking rejected.'}), 409

    book_id = f"book-{int(datetime.now().timestamp() * 1000)}"
    conn.execute(
        "INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, 'Upcoming')",
        (book_id, resource_id, employee_id, start_time, end_time, purpose)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Book Resource", f"Booked resource {resource_id} for slot {start_time} - {end_time}")
    send_notification(employee_id, f"Booking Confirmed: Resource {resource_id} has been reserved.")
    
    return jsonify({'status': 'success', 'id': book_id})

@app.route('/api/bookings/<id>/cancel', methods=['POST'])
def cancel_booking_api(id):
    data = request.json
    user_name = data.get('userName', 'Employee')

    conn = get_db_connection()
    booking = conn.execute("SELECT employee_id FROM bookings WHERE id = ?", (id,)).fetchone()
    conn.execute("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    write_log(user_name, "Cancel Booking", f"Cancelled booking ID {id}")
    if booking:
        send_notification(booking['employee_id'], f"Booking Cancelled: Your booking reservation has been cancelled.")
    return jsonify({'status': 'success'})

# 9. Maintenance API
@app.route('/api/maintenance', methods=['GET', 'POST'])
def maintenance_api():
    conn = get_db_connection()
    if request.method == 'GET':
        maint = conn.execute("SELECT * FROM maintenance").fetchall()
        conn.close()
        return jsonify([dict(m) for m in maint])

    # POST - Raise ticket
    data = request.json
    asset_id = data.get('assetId')
    reported_by = data.get('reportedBy')
    issue_description = data.get('issueDescription')
    priority = data.get('priority')
    user_name = data.get('userName', 'Employee')

    if not asset_id or not issue_description or not priority:
        conn.close()
        return jsonify({'error': 'Required parameters missing.'}), 400

    maint_id = f"maint-{int(datetime.now().timestamp() * 1000)}"
    conn.execute(
        "INSERT INTO maintenance VALUES (?, ?, ?, ?, ?, 'Pending', ?, NULL, NULL, '', NULL)",
        (maint_id, asset_id, reported_by, issue_description, priority, datetime.now().isoformat().split('T')[0])
    )
    
    # Notify Manager
    managers = conn.execute("SELECT id FROM employees WHERE role = 'Asset Manager'").fetchall()
    for m in managers:
        send_notification(m['id'], f"New Maintenance Ticket: Issue reported on asset ID {asset_id}.")
        
    conn.commit()
    conn.close()

    write_log(user_name, "Raise Maintenance Request", f"Raised maintenance for asset ID {asset_id}")
    return jsonify({'status': 'success', 'id': maint_id})

@app.route('/api/maintenance/<id>/approve', methods=['POST'])
def approve_maintenance_api(id):
    data = request.json
    approver_id = data.get('approverId')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    maint = conn.execute("SELECT * FROM maintenance WHERE id = ?", (id,)).fetchone()
    if not maint:
        conn.close()
        return jsonify({'error': 'Ticket not found.'}), 404
    
    m_dict = dict(maint)
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (m_dict['asset_id'],)).fetchone()
    asset_dict = dict(asset)

    history = json.loads(asset_dict['history']) if asset_dict['history'] else []
    history.append({
        "date": datetime.now().isoformat().split('T')[0],
        "action": "Maintenance Approved",
        "user": user_name,
        "notes": f"Asset status flipped to Under Maintenance. Approved by {user_name}."
    })

    conn.execute("UPDATE assets SET status = 'Under Maintenance', history = ? WHERE id = ?", (json.dumps(history), m_dict['asset_id']))
    conn.execute("UPDATE maintenance SET status = 'Approved', approved_by = ? WHERE id = ?", (approver_id, id))
    conn.commit()
    conn.close()

    write_log(user_name, "Approve Maintenance", f"Approved maintenance request for asset ID {m_dict['asset_id']}")
    send_notification(m_dict['reported_by'], f"Maintenance Approved: Your maintenance request for asset ID {m_dict['asset_id']} has been approved.")
    return jsonify({'status': 'success'})

@app.route('/api/maintenance/<id>/reject', methods=['POST'])
def reject_maintenance_api(id):
    data = request.json
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    maint = conn.execute("SELECT * FROM maintenance WHERE id = ?", (id,)).fetchone()
    if not maint:
        conn.close()
        return jsonify({'error': 'Ticket not found.'}), 404
    m_dict = dict(maint)

    conn.execute("UPDATE maintenance SET status = 'Rejected' WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    write_log(user_name, "Reject Maintenance", f"Rejected maintenance request ID {id}")
    send_notification(m_dict['reported_by'], f"Maintenance Rejected: Your maintenance ticket for asset ID {m_dict['asset_id']} was rejected.")
    return jsonify({'status': 'success'})

@app.route('/api/maintenance/<id>/assign', methods=['POST'])
def assign_technician_api(id):
    data = request.json
    tech_name = data.get('technicianName')
    user_name = data.get('userName', 'Asset Manager')

    if not tech_name:
        return jsonify({'error': 'Technician name is required.'}), 400

    conn = get_db_connection()
    conn.execute("UPDATE maintenance SET status = 'Technician Assigned', technician_name = ? WHERE id = ?", (tech_name, id))
    conn.commit()
    conn.close()

    write_log(user_name, "Assign Technician", f"Assigned technician {tech_name} to maintenance ID {id}")
    return jsonify({'status': 'success'})

@app.route('/api/maintenance/<id>/resolve', methods=['POST'])
def resolve_maintenance_api(id):
    data = request.json
    resolution_details = data.get('resolutionDetails')
    user_name = data.get('userName', 'Asset Manager')

    conn = get_db_connection()
    maint = conn.execute("SELECT * FROM maintenance WHERE id = ?", (id,)).fetchone()
    if not maint:
        conn.close()
        return jsonify({'error': 'Ticket not found.'}), 404
    m_dict = dict(maint)
    asset = conn.execute("SELECT * FROM assets WHERE id = ?", (m_dict['asset_id'],)).fetchone()
    asset_dict = dict(asset)

    history = json.loads(asset_dict['history']) if asset_dict['history'] else []
    history.append({
        "date": datetime.now().isoformat().split('T')[0],
        "action": "Maintenance Resolved",
        "user": user_name,
        "notes": f"Work completed by {m_dict['technician_name']}. Resolution: {resolution_details}"
    })

    conn.execute("UPDATE assets SET status = 'Available', history = ? WHERE id = ?", (json.dumps(history), m_dict['asset_id']))
    conn.execute(
        "UPDATE maintenance SET status = 'Resolved', resolution_details = ?, resolved_date = ? WHERE id = ?",
        (resolution_details, datetime.now().isoformat().split('T')[0], id)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Resolve Maintenance", f"Resolved maintenance for asset ID {m_dict['asset_id']}")
    send_notification(m_dict['reported_by'], f"Maintenance Resolved: Asset {asset_dict['name']} ({asset_dict['tag']}) was repaired and returned to pool.")
    return jsonify({'status': 'success'})

# 10. Audits API
@app.route('/api/audits', methods=['GET', 'POST'])
def audits_api():
    conn = get_db_connection()
    if request.method == 'GET':
        audits = conn.execute("SELECT * FROM audits").fetchall()
        conn.close()

        res = []
        for au in audits:
            au_dict = dict(au)
            au_dict['assignedAuditors'] = json.loads(au_dict['assigned_auditors']) if au_dict['assigned_auditors'] else []
            au_dict['findings'] = json.loads(au_dict['findings']) if au_dict['findings'] else {}
            au_dict['discrepancies'] = json.loads(au_dict['discrepancies']) if au_dict['discrepancies'] else []
            res.append(au_dict)
        return jsonify(res)

    # POST - Create Audit Cycle campaign
    data = request.json
    title = data.get('title')
    scope_dept_id = data.get('scopeDepartmentId')
    scope_location = data.get('scopeLocation')
    start_date = data.get('startDate')
    end_date = data.get('endDate')
    auditors = data.get('assignedAuditors', [])
    user_name = data.get('userName', 'Admin')

    if not title or len(auditors) == 0:
        conn.close()
        return jsonify({'error': 'Title and assigned auditors are required.'}), 400

    # Build target scoped assets list
    assets = conn.execute("SELECT id, status, location, allocated_to FROM assets").fetchall()
    findings = {}
    for a in assets:
        a_dict = dict(a)
        if a_dict['status'] == 'Retired' or a_dict['status'] == 'Disposed':
            continue
        
        matches_dept = True
        if scope_dept_id:
            alloc = json.loads(a_dict['allocated_to']) if a_dict['allocated_to'] else None
            matches_dept = alloc and alloc['id'] == scope_dept_id
            
        matches_loc = True
        if scope_location:
            matches_loc = scope_location.lower() in a_dict['location'].lower()
            
        if matches_dept and matches_loc:
            findings[a_dict['id']] = "Pending"

    audit_id = f"audit-{int(datetime.now().timestamp() * 1000)}"
    conn.execute(
        "INSERT INTO audits VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, '', '')",
        (audit_id, title, scope_dept_id, scope_location, start_date, end_date, json.dumps(auditors), json.dumps(findings), json.dumps([]))
    )

    for aud_id in auditors:
        send_notification(aud_id, f"Audit Assigned: You are assigned to the audit cycle \"{title}\".")

    conn.commit()
    conn.close()

    write_log(user_name, "Create Audit Cycle", f"Created audit cycle campaign: {title}")
    return jsonify({'status': 'success', 'id': audit_id})

@app.route('/api/audits/<id>/findings', methods=['POST'])
def update_audit_findings(id):
    data = request.json
    findings = data.get('findings')

    conn = get_db_connection()
    conn.execute("UPDATE audits SET findings = ? WHERE id = ?", (json.dumps(findings), id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/api/audits/<id>/close', methods=['POST'])
def close_audit_cycle(id):
    data = request.json
    closed_by = data.get('closedBy')
    user_name = data.get('userName', 'Admin')

    conn = get_db_connection()
    audit = conn.execute("SELECT * FROM audits WHERE id = ?", (id,)).fetchone()
    if not audit:
        conn.close()
        return jsonify({'error': 'Audit not found.'}), 404
    
    au_dict = dict(audit)
    findings = json.loads(au_dict['findings'])

    # Validate no Pending
    for k, v in findings.items():
        if v == "Pending":
            conn.close()
            return jsonify({'error': 'Cannot close audit cycle. Verification checklist has pending items.'}), 400

    discrepancies = []
    for asset_id, finding in findings.items():
        if finding == 'Missing' or finding == 'Damaged':
            discrepancies.append({
                "assetId": asset_id,
                "finding": finding,
                "resolved": False
            })

            # Auto change asset status to Lost if missing
            if finding == 'Missing':
                asset = conn.execute("SELECT * FROM assets WHERE id = ?", (asset_id,)).fetchone()
                if asset:
                    a_dict = dict(asset)
                    history = json.loads(a_dict['history']) if a_dict['history'] else []
                    history.append({
                        "date": datetime.now().isoformat().split('T')[0],
                        "action": "Audit Flagged",
                        "user": user_name,
                        "notes": f"Asset marked as Missing during Audit Campaign. Status updated to Lost."
                    })
                    conn.execute("UPDATE assets SET status = 'Lost', history = ? WHERE id = ?", (json.dumps(history), asset_id))

                    # Notify manager
                    managers = conn.execute("SELECT id FROM employees WHERE role = 'Asset Manager'").fetchall()
                    for m in managers:
                        send_notification(m['id'], f"Audit Alert: Asset {a_dict['tag']} confirmed missing during campaign.")

    conn.execute(
        "UPDATE audits SET status = 'Closed', discrepancies = ?, closed_by = ?, closed_date = ? WHERE id = ?",
        (json.dumps(discrepancies), closed_by, datetime.now().isoformat().split('T')[0], id)
    )
    conn.commit()
    conn.close()

    write_log(user_name, "Close Audit Cycle", f"Closed audit cycle campaign ID {id} with {len(discrepancies)} discrepancies")
    return jsonify({'status': 'success'})

# 11. Alerts & Notifications API
@app.route('/api/notifications/<user_id>', methods=['GET'])
def get_user_notifications(user_id):
    conn = get_db_connection()
    notifs = conn.execute("SELECT * FROM notifications WHERE employee_id = ? ORDER BY date DESC", (user_id,)).fetchall()
    conn.close()
    
    res = []
    for n in notifs:
        n_dict = dict(n)
        n_dict['isRead'] = bool(n_dict['is_read'])
        res.append(n_dict)
    return jsonify(res)

@app.route('/api/notifications/<id>/read', methods=['POST'])
def mark_notification_read(id):
    conn = get_db_connection()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

# 12. Global Audit Logs API
@app.route('/api/logs', methods=['GET'])
def get_logs():
    conn = get_db_connection()
    logs = conn.execute("SELECT * FROM logs ORDER BY date DESC").fetchall()
    conn.close()
    return jsonify([dict(l) for l in logs])

# 13. Reports API
@app.route('/api/reports', methods=['GET'])
def get_reports_data():
    conn = get_db_connection()
    assets = conn.execute("SELECT id, name, tag, category_id, acquisition_cost, status, allocated_to, history FROM assets").fetchall()
    bookings = conn.execute("SELECT resource_id, status FROM bookings").fetchall()
    maintenance = conn.execute("SELECT asset_id FROM maintenance").fetchall()
    depts = conn.execute("SELECT id, name FROM departments").fetchall()
    conn.close()

    # 1. Utilisation top 5: Count allocations + bookings
    util_scores = {}
    for a in assets:
        a_dict = dict(a)
        history = json.loads(a_dict['history']) if a_dict['history'] else []
        alloc_count = sum(1 for h in history if h['action'] in ('Allocation', 'Transfer'))
        book_count = sum(1 for b in bookings if b['resource_id'] == a_dict['id'] and b['status'] != 'Cancelled')
        util_scores[a_dict['tag']] = {
            'name': a_dict['name'],
            'score': alloc_count + book_count
        }
    
    top_util = sorted(util_scores.items(), key=lambda x: x[1]['score'], reverse=True)[:5]
    top_util_res = [{'tag': k, 'name': v['name'], 'score': v['score']} for k, v in top_util]

    # 2. Maintenance by category
    maint_counts = {}
    for m in maintenance:
        # Find asset category
        target_asset = next((a for a in assets if a['id'] == m['asset_id']), None)
        if target_asset:
            cat_id = target_asset['category_id']
            maint_counts[cat_id] = maint_counts.get(cat_id, 0) + 1
            
    maint_cat_res = []
    # Map category names
    cats_static = {"cat-1": "Electronics", "cat-2": "Vehicles", "cat-3": "Office Furniture", "cat-4": "Shared Spaces"}
    for cat_id, count in maint_counts.items():
        maint_cat_res.append({
            'category': cats_static.get(cat_id, cat_id),
            'count': count
        })

    # 3. Dept asset worth summaries
    dept_worth = []
    for d in depts:
        alloc_count = 0
        net_worth = 0.0
        for a in assets:
            a_dict = dict(a)
            alloc = json.loads(a_dict['allocated_to']) if a_dict['allocated_to'] else None
            if alloc and alloc['id'] == d['id']:
                alloc_count += 1
                net_worth += a_dict['acquisition_cost']
        dept_worth.append({
            'name': d['name'],
            'count': alloc_count,
            'worth': net_worth
        })

    return jsonify({
        'utilization': top_util_res,
        'maintenance': maint_cat_res,
        'departments': dept_worth
    })

if __name__ == '__main__':
    # Run the server on localhost port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)