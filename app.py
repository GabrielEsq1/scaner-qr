import os, re
from flask import Flask, jsonify, request, render_template
import pandas as pd

app = Flask(__name__)

PORT = int(os.getenv("PORT", "8000"))
DATA_FILE = os.getenv("DATA_FILE", "USUARIOS_SERTECPET.xlsx")
SHEET_NAME = os.getenv("SHEET_NAME", "").strip()
HEADER_ROW = int(os.getenv("HEADER_ROW", "1"))

# -------------------
# Utilidades
# -------------------
def normalize_op(s: str) -> str:
    if s is None:
        return ""
    s2 = str(s).strip().upper().replace(" ", "").replace("-", "").replace("_", "")
    if s2.isdigit():
        return "EX" + s2
    if not s2.startswith("EX") and any(ch.isdigit() for ch in s2):
        digits = "".join(ch for ch in s2 if ch.isdigit())
        return "EX" + digits if digits else s2
    return s2

def ok(data=None, **extra):
    base = {"ok": True}
    if data is not None:
        base["data"] = data
    base.update(extra)
    return jsonify(base)

def fail(msg, code=400):
    return jsonify({"ok": False, "error": msg}), code

# -------------------
# Carga de datos
# -------------------
DATA = []
LOADED = False
ERROR = None
SHEETS = []

def try_load_excel():
    global DATA, LOADED, ERROR, SHEETS

    if not os.path.exists(DATA_FILE):
        ERROR = f"No se encontró el archivo {DATA_FILE}"
        LOADED = False
        SHEETS = []
        return

    try:
        # CSV directo
        if DATA_FILE.lower().endswith(".csv"):
            df = pd.read_csv(DATA_FILE, header=HEADER_ROW, encoding="utf-8")
            SHEETS = ["<csv>"]
        else:
            # XLSX: listar hojas
            xl = pd.ExcelFile(DATA_FILE)
            SHEETS = list(xl.sheet_names)

            sheet_to_read = SHEET_NAME if SHEET_NAME in SHEETS else (SHEETS[0] if SHEETS else None)
            if sheet_to_read is None:
                ERROR = "El archivo no tiene hojas."
                LOADED = False
                return

            if SHEET_NAME and SHEET_NAME not in SHEETS:
                app.logger.warning(f"[WARN] Hoja '{SHEET_NAME}' no encontrada. Usando '{sheet_to_read}'.")

            df = pd.read_excel(DATA_FILE, header=HEADER_ROW, sheet_name=sheet_to_read)

        # Limpiar encabezados
        cols = []
        for c in df.columns:
            c = str(c)
            if c.lower().startswith("unnamed"):
                cols.append("")
            else:
                c = c.strip().upper()
                c = re.sub(r"\s+", " ", c)
                cols.append(c)
        df.columns = cols
        df = df.loc[:, [c for c in df.columns if c]]

        # DEBUG: Mostrar columnas disponibles
        app.logger.info(f"Columnas disponibles: {list(df.columns)}")

        # Normalizar nombres de columnas - MÁS FLEXIBLE
        column_mapping = {}
        
        # Buscar columnas por patrones
        for col in df.columns:
            col_upper = col.upper()
            if any(x in col_upper for x in ['OP', 'ORDEN', 'PEDIDO']):
                column_mapping[col] = 'op'
            elif any(x in col_upper for x in ['CLIENTE', 'EMPRESA', 'EMPRESA_OP']):
                column_mapping[col] = 'cliente'
            elif any(x in col_upper for x in ['NOMBRE', 'PERSONA', 'CONTACTO']):
                column_mapping[col] = 'nombre'
            elif any(x in col_upper for x in ['DESCRIPCION', 'DESCRIPCIÓN', 'TELA', 'PRODUCTO']):
                column_mapping[col] = 'descripcion'
            elif any(x in col_upper for x in ['CANTIDAD', 'CANT', 'QTY']):
                column_mapping[col] = 'cantidad'
            elif any(x in col_upper for x in ['TALLA', 'SIZE', 'MEDIDA']):
                column_mapping[col] = 'talla'
            elif any(x in col_upper for x in ['ENLACE', 'LINK', 'URL']):
                column_mapping[col] = 'enlace'
            elif any(x in col_upper for x in ['QR', 'CODIGO']):
                column_mapping[col] = 'qr'

        # Aplicar mapeo
        df = df.rename(columns=column_mapping)
        
        # Si no se encontró OP, usar la primera columna que tenga "EX"
        if 'op' not in df.columns:
            for col in df.columns:
                sample_values = df[col].astype(str).head(10).tolist()
                if any('EX' in str(val).upper() for val in sample_values):
                    df = df.rename(columns={col: 'op'})
                    app.logger.info(f"Usando columna '{col}' como OP")
                    break

        if 'op' not in df.columns:
            ERROR = f"No se encontró columna OP. Columnas disponibles: {list(df.columns)}"
            LOADED = False
            return

        # Normalizar OP
        df["op"] = df["op"].map(normalize_op)
        df = df[df["op"].notna() & (df["op"].astype(str).str.len() > 0)]

        # Rellenar columnas faltantes
        expected_columns = ['op', 'cliente', 'nombre', 'descripcion', 'cantidad', 'talla', 'enlace', 'qr']
        for col in expected_columns:
            if col not in df.columns:
                df[col] = ""

        DATA = df.fillna("").to_dict(orient="records")
        LOADED = True
        ERROR = None
        app.logger.info(f"[INFO] Cargadas {len(DATA)} filas desde {DATA_FILE}")
        app.logger.info(f"[INFO] Primera fila: {DATA[0] if DATA else 'No data'}")
        
    except Exception as e:
        ERROR = str(e)
        LOADED = False
        app.logger.error(f"[ERROR] {e}")

# -------------------
# Rutas
# -------------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/healthz')
def health():
    try_load_excel()
    return jsonify({
        "ok": LOADED,
        "file": DATA_FILE,
        "sheet_requested": SHEET_NAME or "(primera hoja)",
        "sheets_available": SHEETS,
        "header_row": HEADER_ROW,
        "rows": len(DATA),
        "error": ERROR
    })

@app.route('/api/promotores')
def api_promotores():
    op = request.args.get("op", "")
    if not op:
        return fail("Falta parámetro 'op'")
    try_load_excel()
    if not LOADED:
        return fail(f"No se pudo cargar el archivo: {ERROR}")
    needle = normalize_op(op)
    rows = [r for r in DATA if r["op"] == needle]
    if not rows:
        variants = {needle, f"EX-{needle[2:]}", f"EX {needle[2:]}", needle[2:]}
        norm = {normalize_op(v) for v in variants}
        rows = [r for r in DATA if r["op"] in norm]
    return ok({"records": rows, "count": len(rows)})

# -------------------
# MAIN
# -------------------
if __name__ == "__main__":
    print("===============================================")
    print(f"Servidor CCB en: http://127.0.0.1:{PORT}")
    print(f"Archivo: {DATA_FILE}  HeaderRow: {HEADER_ROW}")
    print("Health: /healthz")
    print("===============================================")
    from werkzeug.serving import run_simple
    run_simple(hostname="127.0.0.1", port=PORT, application=app, use_reloader=False, use_debugger=False)