"""Training pipeline for ApexStrategy AI Graph Attention Network (GAT).
 
Sincronizado con v5.1 (Correcciones):
- Fix #1: Split de validación con shuffle aleatorio (antes secuencial)
- Fix #2: Desglose por circuito ahora usa nombres con _Grand_Prix
- Target: deg_rate (Tasa de desgaste físico por vuelta continuo)
- Loss: Huber Loss (Robusta ante outliers climáticos y térmicos)
- Input: 13 Node Features (9 Base + 3 Track Features + 1 XGBoost Prior)
"""
 
import sys
sys.path.insert(0, ".")
 
import re
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from torch_geometric.data import Data
from torch_geometric.loader import DataLoader
from torch_geometric.nn import GATConv
from sklearn.metrics import mean_absolute_error, r2_score
import logging
 
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)
 
GRAPHS_DIR  = Path("data/graphs")
MODELS_DIR  = Path("models")
REPORTS_DIR = Path("reports/plots")
MODELS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
 
# ── Hiperparámetros v5.1 ────────────────────────────────────────────────────
IN_DIM       = 13
LR           = 1e-3
WEIGHT_DECAY = 5e-5
EPOCHS       = 500
PATIENCE     = 50
BATCH_SIZE   = 32
HEADS        = 8
HIDDEN_DIM   = 128
DROPOUT      = 0.2
 
# ── 1. Cargar y separar grafos por año ───────────────────────────────────────
def load_graphs(graphs_dir: Path):
    train_val_graphs, train_val_names = [], []
    test_graphs, test_names = [], []
 
    files = sorted(graphs_dir.glob("*.pt"))
    for f in files:
        match = re.search(r'_(202\d)_', f.stem)
        if not match:
            continue
        year = int(match.group(1))
 
        g = torch.load(f, weights_only=False)
        if not hasattr(g, "y") or g.y is None:
            continue
 
        g.y = g.y.view(-1, 1).to(torch.float32)
 
        if year in [2023, 2024]:
            train_val_graphs.append(g)
            train_val_names.append(f.stem)
        else:
            test_graphs.append(g)
            test_names.append(f.stem)
 
    log.info("Train+Val: %d grafos | Test 2025: %d grafos", len(train_val_graphs), len(test_graphs))
    return train_val_graphs, train_val_names, test_graphs, test_names
 
train_val_graphs, train_val_names, test_graphs, test_names = load_graphs(GRAPHS_DIR)
 
if not train_val_graphs:
    log.error("No se encontraron archivos .pt en data/graphs/. Ejecuta build_graphs.py primero.")
    sys.exit(1)
 
# ── FIX #1: Split con shuffle aleatorio (antes era secuencial) ───────────────
np.random.seed(42)
idx = np.random.permutation(len(train_val_graphs))
split = int(0.8 * len(idx))
train_graphs = [train_val_graphs[i] for i in idx[:split]]
val_graphs   = [train_val_graphs[i] for i in idx[split:]]
val_names    = [train_val_names[i] for i in idx[split:]]
 
log.info("Train: %d | Val: %d | Test: %d", len(train_graphs), len(val_graphs), len(test_graphs))
 
# ── 2. DataLoaders ───────────────────────────────────────────────────────────
train_loader = DataLoader(train_graphs, batch_size=BATCH_SIZE, shuffle=True)
val_loader   = DataLoader(val_graphs,   batch_size=BATCH_SIZE, shuffle=False)
test_loader  = DataLoader(test_graphs,  batch_size=BATCH_SIZE, shuffle=False)
 
# ── 3. Arquitectura GAT v5.1 ────────────────────────────────────────────────
class TrafficGATv5(torch.nn.Module):
    """3 capas GAT con proyección residual y salida lineal para regresión continua."""
    def __init__(self, in_dim=IN_DIM, hidden=HIDDEN_DIM, heads=HEADS):
        super().__init__()
        self.input_proj = torch.nn.Linear(in_dim, hidden * heads)
 
        self.conv1 = GATConv(in_dim, hidden, heads=heads, dropout=0.1, edge_dim=3)
        self.bn1   = torch.nn.BatchNorm1d(hidden * heads)
 
        self.conv2 = GATConv(hidden * heads, hidden, heads=heads, dropout=0.1, edge_dim=3)
        self.bn2   = torch.nn.BatchNorm1d(hidden * heads)
 
        self.conv3 = GATConv(hidden * heads, 64, heads=1, dropout=0.1, edge_dim=3)
 
        self.lin   = torch.nn.Linear(64, 1)
 
    def forward(self, x, edge_index, edge_attr, batch=None):
        input_res = self.input_proj(x)
        x = self.conv1(x, edge_index, edge_attr)
        x = x + input_res
        x = self.bn1(x)
        x = F.elu(x)
        x = F.dropout(x, p=DROPOUT, training=self.training)
 
        identity = x
        x = self.conv2(x, edge_index, edge_attr)
        x = x + identity
        x = self.bn2(x)
        x = F.elu(x)
        x = F.dropout(x, p=DROPOUT, training=self.training)
 
        x = self.conv3(x, edge_index, edge_attr)
        x = F.elu(x)
 
        return self.lin(x)
 
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
log.info("Dispositivo: %s", device)
 
model = TrafficGATv5().to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode="min", factor=0.7, patience=20)
 
log.info("Modelo: %s | Parámetros: %d", model.__class__.__name__, sum(p.numel() for p in model.parameters()))
 
# ── 4. Funciones de entrenamiento ────────────────────────────────────────────
def train_epoch(loader):
    model.train()
    total_loss = 0
    for batch in loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        out = model(batch.x, batch.edge_index, batch.edge_attr, batch.batch)
        loss = F.huber_loss(out, batch.y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item() * batch.num_graphs
    return total_loss / len(loader.dataset)
 
@torch.no_grad()
def evaluate(loader):
    model.eval()
    total_loss = 0
    all_preds, all_true = [], []
    for batch in loader:
        batch = batch.to(device)
        out = model(batch.x, batch.edge_index, batch.edge_attr, batch.batch)
        loss = F.huber_loss(out, batch.y)
        total_loss += loss.item() * batch.num_graphs
        all_preds.extend(out.cpu().view(-1).numpy())
        all_true.extend(batch.y.cpu().view(-1).numpy())
    avg_loss = total_loss / len(loader.dataset)
    mae = mean_absolute_error(all_true, all_preds)
    try:
        r2 = r2_score(all_true, all_preds)
    except:
        r2 = 0.0
    return avg_loss, mae, r2, np.array(all_true), np.array(all_preds)
 
# ── 5. Loop de entrenamiento ─────────────────────────────────────────────────
log.info("Iniciando entrenamiento — %d épocas máx, patience=%d", EPOCHS, PATIENCE)
 
history = {"train_loss": [], "val_loss": [], "val_mae": [], "val_r2": [], "lr": []}
best_mae = float("inf")
best_epoch = 0
patience_cnt = 0
 
for epoch in range(1, EPOCHS + 1):
    train_loss = train_epoch(train_loader)
    val_loss, val_mae, val_r2, _, _ = evaluate(val_loader)
 
    scheduler.step(val_loss)
    current_lr = optimizer.param_groups[0]["lr"]
 
    history["train_loss"].append(train_loss)
    history["val_loss"].append(val_loss)
    history["val_mae"].append(val_mae)
    history["val_r2"].append(val_r2)
    history["lr"].append(current_lr)
 
    if epoch % 5 == 0 or epoch == 1:
        log.info(
            "Época %3d | Train Loss: %.5f | Val Loss: %.5f | Val MAE: %.4f s/v | R²: %.3f | LR: %.1e",
            epoch, train_loss, val_loss, val_mae, val_r2, current_lr
        )
 
    if val_mae < best_mae:
        best_mae = val_mae
        best_epoch = epoch
        torch.save(model.state_dict(), MODELS_DIR / "gat_best.pt")
        log.info("  ✅ Nuevo mejor modelo (MAE = %.4f s/vuelta)", best_mae)
        patience_cnt = 0
    else:
        patience_cnt += 1
        if patience_cnt >= PATIENCE:
            log.info("Early stopping en época %d (patience=%d)", epoch, PATIENCE)
            break
 
log.info("Mejor época: %d | Mejor Val MAE: %.4f", best_epoch, best_mae)
 
# ── 6. Curvas de entrenamiento ───────────────────────────────────────────────
epochs_ran = len(history["train_loss"])
fig, axes  = plt.subplots(1, 3, figsize=(18, 4))
 
axes[0].plot(range(1, epochs_ran + 1), history["train_loss"], label="Train Loss", color="#E10600", linewidth=2)
axes[0].plot(range(1, epochs_ran + 1), history["val_loss"], label="Val Loss", color="#888888", linewidth=2, linestyle="--")
axes[0].axvline(best_epoch, color="#CCCCCC", linestyle=":", linewidth=1)
axes[0].set_xlabel("Época")
axes[0].set_ylabel("Huber Loss")
axes[0].set_title("Curvas de Loss — GAT v5.1")
axes[0].legend()
axes[0].grid(True, alpha=0.3)
 
axes[1].plot(range(1, epochs_ran + 1), history["val_mae"], label="Val MAE (s/v)", color="#E10600", linewidth=2)
axes[1].axvline(best_epoch, color="#CCCCCC", linestyle=":", linewidth=1)
axes[1].set_xlabel("Época")
axes[1].set_ylabel("MAE (Segundos)")
axes[1].set_title("Error Absoluto Medio")
axes[1].legend()
axes[1].grid(True, alpha=0.3)
 
axes[2].plot(range(1, epochs_ran + 1), history["lr"], label="Learning Rate", color="#1E90FF", linewidth=2)
axes[2].set_xlabel("Época")
axes[2].set_ylabel("LR")
axes[2].set_title("Learning Rate Schedule")
axes[2].set_yscale("log")
axes[2].grid(True, alpha=0.3)
 
plt.tight_layout()
fig.savefig(REPORTS_DIR / "gnn_training_curves.png", dpi=150, bbox_inches="tight")
plt.close()
 
# ── 7. Evaluación final ─────────────────────────────────────────────────────
model.load_state_dict(torch.load(MODELS_DIR / "gat_best.pt", map_location=device, weights_only=True))
_, final_mae, final_r2, _, _ = evaluate(val_loader)
 
log.info("=== Evaluación Final (Val) ===")
log.info("MAE: %.4f s/vuelta | R²: %.4f", final_mae, final_r2)
 
# ── FIX #2: Desglose por circuito con nombres _Grand_Prix ────────────────────
log.info("=== MAE por circuito (Val) ===")
circuit_results = []
 
# Detectar automáticamente los circuitos presentes en validación
circuit_set = set()
for name in val_names:
    # Extraer todo antes del _202X_
    match = re.match(r'^(.+?)_202\d_', name)
    if match:
        circuit_set.add(match.group(1))
 
for circ in sorted(circuit_set):
    circ_graphs = [g for g, name in zip(val_graphs, val_names) if name.startswith(circ + "_")]
 
    if not circ_graphs:
        continue
 
    loader_c = DataLoader(circ_graphs, batch_size=BATCH_SIZE)
    _, mae_c, r2_c, _, _ = evaluate(loader_c)
    circuit_results.append({"circuito": circ, "MAE": round(mae_c, 4), "R2": round(r2_c, 4), "n_graphs": len(circ_graphs)})
    log.info("  %-25s: MAE=%.4f s/v | R²=%.4f | Grafos=%d", circ, mae_c, r2_c, len(circ_graphs))
 
# ── 8. Guardar reporte ───────────────────────────────────────────────────────
pd.DataFrame(circuit_results).to_csv("reports/gnn_metrics.csv", index=False)
log.info("Reporte guardado en reports/gnn_metrics.csv")