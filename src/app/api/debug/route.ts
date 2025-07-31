import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    };

    return NextResponse.json({
      status: "ok",
      env: envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: "error", 
        message: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}