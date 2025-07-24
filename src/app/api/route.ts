import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'welcome to lha-donate api service' });
}