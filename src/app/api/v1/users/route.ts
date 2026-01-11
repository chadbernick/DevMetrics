import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        engineerLevel: true,
        role: true,
      },
      with: {
        team: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
