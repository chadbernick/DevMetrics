import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "install-hooks.sh");
    const content = fs.readFileSync(scriptPath, "utf-8");

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/x-shellscript",
        "Content-Disposition": 'attachment; filename="install-hooks.sh"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Script not found" },
      { status: 404 }
    );
  }
}
