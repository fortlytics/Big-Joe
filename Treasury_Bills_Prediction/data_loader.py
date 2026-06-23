import pandas as pd
import numpy as np
import re

RAW_PRIMARY = "data/raw/Primary_Market_in_Excel.xlsx"
RAW_GOV_SEC = "data/raw/Government_Securities_in_Excel.xlsx"

def normalise_tenor(t):
    key = str(t).strip().lower()
    match = re.match(r'^(\d+)', key)
    if match:
        n = int(match.group(1))
        if 88  <= n <= 95:  return 91
        if 178 <= n <= 185: return 182
        if 340 <= n <= 366: return 364
    return None

def load_primary_market(path: str = RAW_PRIMARY) -> pd.DataFrame:
    df = pd.read_excel(path)
    df['auctionDate'] = pd.to_datetime(df['auctionDate'], format='mixed', dayfirst=False)
    return df.sort_values('auctionDate').reset_index(drop=True)

def load_gov_securities(path: str = RAW_GOV_SEC) -> pd.DataFrame:
    df = pd.read_excel(path)
    df.replace('-', pd.NA, inplace=True)
    df['auctionDate'] = pd.to_datetime(df['auctionDate'], format='mixed', dayfirst=False)
    return df

def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['tenor_days'] = df['tenor'].apply(normalise_tenor)
    df = df.dropna(subset=['tenor_days'])
    df['tenor_days'] = df['tenor_days'].astype(int)
    df = df[df['tenor_days'].isin([91, 182, 364])]

    # Resolve yield: trueYield where populated, else rate (stop rate)
    df['yield_pct'] = np.where(df['trueYield'] > 0, df['trueYield'], df['rate'])
    df = df[df['yield_pct'] > 0]

    # Demand ratios
    df['subscription_ratio'] = df['totalSubscription'] / df['amtOffered'].replace(0, np.nan)
    df['allotment_ratio']    = df['totalSuccessful']    / df['totalSubscription'].replace(0, np.nan)

    return df.sort_values(['auctionDate', 'tenor_days']).reset_index(drop=True)

def load_clean(path: str = RAW_PRIMARY) -> pd.DataFrame:
    return clean(load_primary_market(path))

if __name__ == "__main__":
    df = load_clean()
    print(f"Shape      : {df.shape}")
    print(f"Date range : {df['auctionDate'].min().date()} → {df['auctionDate'].max().date()}")
    print(f"Tenors     :\n{df['tenor_days'].value_counts().sort_index()}")
    df.to_csv("data/processed/tbill_clean.csv", index=False)
    print("Saved → data/processed/tbill_clean.csv")
