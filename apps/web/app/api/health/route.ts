import { NextResponse } from 'next/server';
import { checkHealth } from '../../../lib/health';

export function GET() {
  return NextResponse.json(checkHealth());
}
