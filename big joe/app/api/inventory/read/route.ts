import { NextResponse } from 'next/server';
import { getAllCars, InventoryUnavailableError } from '@/lib/inventory';

// Public, read-only — this returns exactly what the public catalog already
// shows, just as JSON for the admin panel's live list. No auth needed for
// reads; writes (POST /api/inventory/write) still require the admin token.
export async function GET() {
  try {
    const cars = await getAllCars();
    return NextResponse.json({ cars });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof InventoryUnavailableError ? err.message : 'Failed to load inventory.' },
      { status: 502 }
    );
  }
}
