import { NextResponse, type NextRequest } from "next/server";

// Schnelle Vorprüfung: Ohne Session-Cookie geht es direkt zum Login.
// Die eigentliche Prüfung (gültige Sitzung, aktives Konto, Rang) passiert
// serverseitig in jeder Seite und jeder Server Action.
const SESSION_COOKIE = "ur_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Statische Dateien, Bilder und das Logo nicht prüfen.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
