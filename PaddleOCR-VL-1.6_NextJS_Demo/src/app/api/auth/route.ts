import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const expectedUser = process.env.DEMO_USER || "demo";
    const expectedPass = process.env.DEMO_PASS || "demo";

    if (username === expectedUser && password === expectedPass) {
      const response = NextResponse.json({ success: true });
      
      // Set HttpOnly cookie for session tracking
      response.cookies.set("session_token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  
  // Clear cookie on logout
  response.cookies.set("session_token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
