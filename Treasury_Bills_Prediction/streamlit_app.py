"""
Nigerian Treasury Bill Investment Predictor

"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import re
import warnings
import os
import joblib
from datetime import datetime

warnings.filterwarnings("ignore")

# ─── Page config ────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="NTB Predictor",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Theme CSS ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .main { background-color: #0f1117; }
    .block-container { padding-top: 1.5rem; }
    .metric-card {
        background: #1e2130;
        border-radius: 10px;
        padding: 1rem 1.2rem;
        border-left: 4px solid;
        margin-bottom: 0.5rem;
    }
    .metric-card.green  { border-color: #00c48c; }
    .metric-card.orange { border-color: #ff9f43; }
    .metric-card.blue   { border-color: #54a0ff; }
    .metric-card.red    { border-color: #ff6b6b; }
    .metric-label { font-size: 0.78rem; color: #8a8f9d; margin-bottom: 2px; }
    .metric-value { font-size: 1.5rem; font-weight: 700; color: #ffffff; }
    .metric-sub   { font-size: 0.75rem; color: #8a8f9d; margin-top: 2px; }
    .section-header {
        font-size: 1.05rem; font-weight: 600;
        color: #c8cdd8; border-bottom: 1px solid #2d3148;
        padding-bottom: 4px; margin: 1rem 0 0.6rem 0;
    }
    .verdict-box {
        border-radius: 8px; padding: 0.9rem 1.2rem;
        margin-top: 0.5rem; font-size: 0.95rem;
    }
    .verdict-up   { background: #0d2b1f; border: 1px solid #00c48c; color: #00c48c; }
    .verdict-down { background: #2b1010; border: 1px solid #ff6b6b; color: #ff6b6b; }
    .verdict-flat { background: #1e1e10; border: 1px solid #ffa502; color: #ffa502; }
    footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

COLORS = {"91": "#54a0ff", "182": "#ff9f43", "364": "#00c48c"}

# ─── Helpers ────────────────────────────────────────────────────────────────
@st.cache_data
def normalise_tenor(t):
    key = str(t).strip().lower()
    match = re.match(r"^(\d+)", key)
    if match:
        n = int(match.group(1))
        if 88  <= n <= 95:  return 91
        if 178 <= n <= 185: return 182
        if 340 <= n <= 366: return 364
    return None

@st.cache_data
def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_excel(path)
    df["auctionDate"] = pd.to_datetime(df["auctionDate"], format="mixed", dayfirst=False)
    df["tenor_days"]  = df["tenor"].apply(normalise_tenor)
    df = df.dropna(subset=["tenor_days"])
    df["tenor_days"]  = df["tenor_days"].astype(int)
    df = df[df["tenor_days"].isin([91, 182, 364])]
    df["yield_pct"]   = np.where(df["trueYield"] > 0, df["trueYield"], df["rate"])
    df = df[df["yield_pct"] > 0]
    df["subscription_ratio"] = df["totalSubscription"] / df["amtOffered"].replace(0, np.nan)
    df["allotment_ratio"]    = df["totalSuccessful"]    / df["totalSubscription"].replace(0, np.nan)
    return df.sort_values(["auctionDate","tenor_days"]).reset_index(drop=True)

def build_features(df: pd.DataFrame, tenor: int) -> pd.DataFrame:
    grp = df[df["tenor_days"] == tenor].copy().sort_values("auctionDate").reset_index(drop=True)
    y   = grp["yield_pct"]
    pivot = df.pivot_table(index="auctionDate", columns="tenor_days", values="yield_pct")
    pivot.columns = [f"yield_{int(c)}" for c in pivot.columns]
    grp = grp.merge(pivot, on="auctionDate", how="left")

    for lag in [1, 2, 3, 6, 12]:
        grp[f"yield_lag_{lag}"] = y.shift(lag)

    grp["roll_mean_3"]  = y.rolling(3).mean()
    grp["roll_mean_6"]  = y.rolling(6).mean()
    grp["roll_mean_12"] = y.rolling(12).mean()
    grp["roll_std_3"]   = y.rolling(3).std()
    grp["roll_std_6"]   = y.rolling(6).std()
    grp["momentum_1"]   = y.diff(1)
    grp["momentum_3"]   = y.diff(3)
    grp["sub_ratio_lag1"]  = grp["subscription_ratio"].shift(1)
    grp["allotment_lag1"]  = grp["allotment_ratio"].shift(1)

    if "yield_364" in grp.columns and "yield_91" in grp.columns:
        grp["spread_364_91"]  = grp["yield_364"] - grp["yield_91"]
        grp["spread_182_91"]  = grp.get("yield_182", np.nan) - grp["yield_91"]
    grp["month"]   = grp["auctionDate"].dt.month
    grp["quarter"] = grp["auctionDate"].dt.quarter
    grp["year"]    = grp["auctionDate"].dt.year
    grp["target"]  = y.shift(-1)
    return grp.dropna(subset=["target"])

def train_model(feat_df: pd.DataFrame):
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    EXCLUDE = {"target","yield_pct","rate","trueYield","auctionDate","maturityDate",
               "tenor","securityType","rangeBid","successfulBidRates","netValue",
               "tenor_days","tenor_label","subscription_ratio","allotment_ratio"}

    feature_cols = [c for c in feat_df.columns
                    if c not in EXCLUDE and feat_df[c].dtype in ["float64","int64","int32","float32"]]
    X = feat_df[feature_cols]
    y = feat_df["target"]

    scaler = make_pipeline(SimpleImputer(strategy="constant", fill_value=0), StandardScaler())
    tscv   = TimeSeriesSplit(n_splits=5)
    scores = {"RMSE": [], "MAE": [], "R2": []}

    for tr_idx, te_idx in tscv.split(X):
        X_tr_sc = scaler.fit_transform(X.iloc[tr_idx])
        X_te_sc = scaler.transform(X.iloc[te_idx])
        m = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
        m.fit(X_tr_sc, y.iloc[tr_idx])
        preds = m.predict(X_te_sc)
        scores["RMSE"].append(np.sqrt(mean_squared_error(y.iloc[te_idx], preds)))
        scores["MAE"].append(mean_absolute_error(y.iloc[te_idx], preds))
        scores["R2"].append(r2_score(y.iloc[te_idx], preds))

    # Final fit
    X_sc  = scaler.fit_transform(X)
    model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    model.fit(X_sc, y)
    return model, scaler, feature_cols, {k: float(np.mean(v)) for k, v in scores.items()}

def predict_next(model, scaler, feature_cols, feat_df):
    last = feat_df[feature_cols].iloc[[-1]]
    pred = model.predict(scaler.transform(last))[0]
    return round(pred, 4)

def plot_yield_history(df: pd.DataFrame, tenor: int, pred: float = None):
    grp = df[df["tenor_days"] == tenor].copy().sort_values("auctionDate")
    fig, ax = plt.subplots(figsize=(11, 3.5))
    fig.patch.set_facecolor("#0f1117")
    ax.set_facecolor("#0f1117")

    color = COLORS[str(tenor)]
    ax.plot(grp["auctionDate"], grp["yield_pct"], color=color,
            linewidth=1.3, alpha=0.9, label=f"{tenor}-Day Yield")
    ax.fill_between(grp["auctionDate"], grp["yield_pct"],
                    grp["yield_pct"].min(), alpha=0.08, color=color)

    # Rolling mean
    roll = grp["yield_pct"].rolling(6).mean()
    ax.plot(grp["auctionDate"], roll, color="white", linewidth=1,
            linestyle="--", alpha=0.4, label="6-Auction MA")

    if pred:
        ax.axhline(pred, color="#ff6b6b", linewidth=1.4, linestyle=":",
                   label=f"Prediction: {pred:.2f}%")

    ax.set_title(f"{tenor}-Day NTB Yield History", color="white",
                 fontsize=11, fontweight="bold")
    ax.tick_params(colors="white", labelsize=8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.xaxis.set_major_locator(mdates.YearLocator(3))
    for spine in ax.spines.values():
        spine.set_edgecolor("#2d3148")
    ax.grid(alpha=0.12, color="white")
    ax.legend(fontsize=8, labelcolor="white", framealpha=0)
    plt.tight_layout()
    return fig

def plot_feature_importance(model, feature_cols):
    imp = pd.Series(model.feature_importances_, index=feature_cols)
    top = imp.nlargest(12).sort_values()
    fig, ax = plt.subplots(figsize=(7, 4))
    fig.patch.set_facecolor("#1e2130")
    ax.set_facecolor("#1e2130")
    bars = ax.barh(top.index, top.values, color="#54a0ff", alpha=0.8, edgecolor="none")
    ax.set_title("Top 12 Feature Importances", color="white", fontsize=10, fontweight="bold")
    ax.tick_params(colors="white", labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor("#2d3148")
    ax.grid(alpha=0.1, axis="x", color="white")
    plt.tight_layout()
    return fig

def plot_recent_auctions(df: pd.DataFrame, tenor: int, n: int = 20):
    grp = df[df["tenor_days"] == tenor].sort_values("auctionDate").tail(n)
    fig, ax = plt.subplots(figsize=(11, 3))
    fig.patch.set_facecolor("#1e2130")
    ax.set_facecolor("#1e2130")
    color = COLORS[str(tenor)]
    ax.bar(range(len(grp)), grp["yield_pct"].values, color=color, alpha=0.8, edgecolor="none")
    ax.set_xticks(range(len(grp)))
    ax.set_xticklabels(
        [d.strftime("%b-%y") for d in grp["auctionDate"]], rotation=45, ha="right", fontsize=7
    )
    ax.set_title(f"Last {n} Auction Yields — {tenor}-Day", color="white",
                 fontsize=10, fontweight="bold")
    ax.tick_params(colors="white", labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor("#2d3148")
    ax.grid(alpha=0.1, axis="y", color="white")
    plt.tight_layout()
    return fig

# ─── Sidebar ────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📂 Data Source")
    data_path = st.text_input(
        "Excel file path",
        value="data/raw/Primary_Market_in_Excel.xlsx",
        help="Relative path from project root"
    )

    st.markdown("---")
    st.markdown("### ⚙️ Model Settings")
    tenor_choice = st.selectbox("Forecast Tenor", [91, 182, 364],
                                format_func=lambda x: f"{x}-Day NTB",
                                index=2)
    show_fi = st.checkbox("Show Feature Importances", value=True)
    n_recent = st.slider("Recent auctions to display", 10, 40, 20)

    st.markdown("---")
    run_btn = st.button("🚀 Run Prediction", use_container_width=True, type="primary")

    st.markdown("---")
    st.markdown("""
    <div style='font-size:0.75rem; color:#5a607a; line-height:1.6'>
    <br>
  
    <i>Powered by Data. Driven by Insight.</i>
    </div>
    """, unsafe_allow_html=True)

# ─── Header ─────────────────────────────────────────────────────────────────
col_logo, col_title = st.columns([1, 8])
with col_title:
    st.markdown("""
    <h1 style='margin:0; font-size:1.6rem; color:#ffffff'>
        📈 Nigerian Treasury Bill Investment Predictor
    </h1>
    <p style='margin:0; color:#5a607a; font-size:0.85rem'>
        CBN Primary Market Auction Data · Random Forest + Time-Series CV · 
    </p>
    """, unsafe_allow_html=True)

st.markdown("---")

# ─── Main ───────────────────────────────────────────────────────────────────
# Resolve path
paths_to_try = [
    data_path,
    os.path.join(os.path.dirname(__file__), "..", data_path),
    os.path.join(os.path.dirname(__file__), "..", "data", "raw", "Primary_Market_in_Excel.xlsx"),
]
resolved = next((p for p in paths_to_try if os.path.exists(p)), None)

if not resolved:
    st.error(f"❌ Could not find data file. Tried:\n" + "\n".join(paths_to_try))
    st.stop()

# Load data always (for overview)
df = load_and_clean(resolved)

# ── Overview metrics ─────────────────────────────────────────────────────────
st.markdown('<div class="section-header">📊 Dataset Overview</div>', unsafe_allow_html=True)

latest = df.sort_values("auctionDate").groupby("tenor_days").last().reset_index()
m1, m2, m3, m4, m5 = st.columns(5)

with m1:
    st.markdown(f"""
    <div class="metric-card blue">
        <div class="metric-label">Total Auction Records</div>
        <div class="metric-value">{len(df):,}</div>
        <div class="metric-sub">2002 – 2026</div>
    </div>""", unsafe_allow_html=True)

with m2:
    r91 = latest[latest["tenor_days"] == 91]["yield_pct"].values
    val = f"{r91[0]:.2f}%" if len(r91) else "N/A"
    st.markdown(f"""
    <div class="metric-card blue">
        <div class="metric-label">Latest 91-Day Rate</div>
        <div class="metric-value">{val}</div>
        <div class="metric-sub">Most recent auction</div>
    </div>""", unsafe_allow_html=True)

with m3:
    r182 = latest[latest["tenor_days"] == 182]["yield_pct"].values
    val  = f"{r182[0]:.2f}%" if len(r182) else "N/A"
    st.markdown(f"""
    <div class="metric-card orange">
        <div class="metric-label">Latest 182-Day Rate</div>
        <div class="metric-value">{val}</div>
        <div class="metric-sub">Most recent auction</div>
    </div>""", unsafe_allow_html=True)

with m4:
    r364 = latest[latest["tenor_days"] == 364]["yield_pct"].values
    val  = f"{r364[0]:.2f}%" if len(r364) else "N/A"
    st.markdown(f"""
    <div class="metric-card green">
        <div class="metric-label">Latest 364-Day Rate</div>
        <div class="metric-value">{val}</div>
        <div class="metric-sub">Most recent auction</div>
    </div>""", unsafe_allow_html=True)

with m5:
    last_date = df["auctionDate"].max().strftime("%d %b %Y")
    st.markdown(f"""
    <div class="metric-card green">
        <div class="metric-label">Last Auction Date</div>
        <div class="metric-value" style='font-size:1.1rem'>{last_date}</div>
        <div class="metric-sub">CBN Primary Market</div>
    </div>""", unsafe_allow_html=True)

# ── Historical chart ─────────────────────────────────────────────────────────
st.markdown('<div class="section-header">📉 Yield History</div>', unsafe_allow_html=True)

tab1, tab2, tab3 = st.tabs(["91-Day", "182-Day", "364-Day"])
with tab1:
    st.pyplot(plot_yield_history(df, 91))
with tab2:
    st.pyplot(plot_yield_history(df, 182))
with tab3:
    st.pyplot(plot_yield_history(df, 364))

# ── Recent auctions ──────────────────────────────────────────────────────────
st.markdown('<div class="section-header">🗓️ Recent Auction Results</div>', unsafe_allow_html=True)
st.pyplot(plot_recent_auctions(df, tenor_choice, n=n_recent))

# ── Prediction ───────────────────────────────────────────────────────────────
st.markdown('<div class="section-header">🤖 ML Prediction Engine</div>', unsafe_allow_html=True)

if run_btn:
    with st.spinner(f"Training Random Forest on {tenor_choice}-Day NTB data..."):
        feat_df = build_features(df, tenor_choice)
        model, scaler, feature_cols, cv_scores = train_model(feat_df)
        prediction = predict_next(model, scaler, feature_cols, feat_df)

        last_yield  = feat_df["yield_pct"].iloc[-1]
        last_date_s = feat_df["auctionDate"].iloc[-1].strftime("%d %b %Y")
        delta       = prediction - last_yield

    # Metrics row
    p1, p2, p3, p4 = st.columns(4)
    with p1:
        st.markdown(f"""
        <div class="metric-card green">
            <div class="metric-label">Predicted Next Yield</div>
            <div class="metric-value">{prediction:.2f}%</div>
            <div class="metric-sub">{tenor_choice}-Day NTB</div>
        </div>""", unsafe_allow_html=True)
    with p2:
        arrow = "▲" if delta > 0 else "▼"
        col   = "#ff6b6b" if delta > 0 else "#00c48c"
        st.markdown(f"""
        <div class="metric-card {'red' if delta > 0 else 'green'}">
            <div class="metric-label">Change from Last</div>
            <div class="metric-value" style='color:{col}'>{arrow} {abs(delta):.2f}%</div>
            <div class="metric-sub">Last auction: {last_yield:.2f}% on {last_date_s}</div>
        </div>""", unsafe_allow_html=True)
    with p3:
        st.markdown(f"""
        <div class="metric-card blue">
            <div class="metric-label">CV R² Score</div>
            <div class="metric-value">{cv_scores['R2']:.4f}</div>
            <div class="metric-sub">5-Fold TimeSeriesSplit</div>
        </div>""", unsafe_allow_html=True)
    with p4:
        st.markdown(f"""
        <div class="metric-card orange">
            <div class="metric-label">CV RMSE</div>
            <div class="metric-value">{cv_scores['RMSE']:.4f}%</div>
            <div class="metric-sub">MAE: {cv_scores['MAE']:.4f}%</div>
        </div>""", unsafe_allow_html=True)

    # Investment verdict
    if abs(delta) < 0.10:
        verdict_cls = "verdict-flat"
        verdict_txt = f"⚡ Rates expected to remain <b>stable</b> (~{prediction:.2f}%). Monitor next auction before committing."
    elif delta > 0:
        verdict_cls = "verdict-up"
        verdict_txt = f"📈 Rates expected to <b>RISE</b> by {delta:.2f}%. Consider investing <b>now</b> at current {last_yield:.2f}% before rates compress discount prices."
    else:
        verdict_cls = "verdict-down"
        verdict_txt = f"📉 Rates expected to <b>FALL</b> by {abs(delta):.2f}%. Lock in the <b>current {last_yield:.2f}%</b> now — next auction may offer lower yields."

    st.markdown(f'<div class="verdict-box {verdict_cls}">{verdict_txt}</div>', unsafe_allow_html=True)

    # Updated chart with prediction line
    st.markdown('<div class="section-header">📈 Yield Trend with Prediction</div>', unsafe_allow_html=True)
    st.pyplot(plot_yield_history(df, tenor_choice, pred=prediction))

    # Feature importance
    if show_fi:
        st.markdown('<div class="section-header">🔍 Feature Importances</div>', unsafe_allow_html=True)
        fi_col, tbl_col = st.columns([1.2, 1])
        with fi_col:
            st.pyplot(plot_feature_importance(model, feature_cols))
        with tbl_col:
            imp = pd.Series(model.feature_importances_, index=feature_cols)
            imp_df = imp.nlargest(12).reset_index()
            imp_df.columns = ["Feature", "Importance"]
            imp_df["Importance"] = imp_df["Importance"].round(4)
            st.dataframe(imp_df, use_container_width=True, hide_index=True)

    # Raw feature table
    with st.expander("🔎 View Feature Dataset (last 10 rows)"):
        show_cols = ["auctionDate","yield_pct"] + [c for c in feature_cols if "lag" in c or "roll" in c or "momentum" in c]
        st.dataframe(feat_df[show_cols].tail(10), use_container_width=True)

else:
    st.info("👆 Configure settings in the sidebar, then click **Run Prediction** to train the model and generate forecasts.")

# ── Raw data explorer ────────────────────────────────────────────────────────
with st.expander("📋 Raw CBN Auction Data Explorer"):
    col_filter, col_tenor = st.columns(2)
    with col_filter:
        yr_min = int(df["auctionDate"].dt.year.min())
        yr_max = int(df["auctionDate"].dt.year.max())
        yr_range = st.slider("Year range", yr_min, yr_max, (2020, yr_max))
    with col_tenor:
        tenor_filter = st.multiselect("Tenor", [91, 182, 364],
                                      default=[91, 182, 364],
                                      format_func=lambda x: f"{x}-Day")
    filtered = df[
        df["auctionDate"].dt.year.between(*yr_range) &
        df["tenor_days"].isin(tenor_filter)
    ][["auctionDate","tenor_days","yield_pct","totalSubscription",
       "amtOffered","subscription_ratio","allotment_ratio"]].copy()
    filtered["auctionDate"] = filtered["auctionDate"].dt.strftime("%d %b %Y")
    filtered.columns = ["Auction Date","Tenor (Days)","Yield (%)","Total Subscription",
                        "Amt Offered","Sub Ratio","Allotment Ratio"]
    st.dataframe(filtered.sort_values("Auction Date", ascending=False),
                 use_container_width=True, hide_index=True)
