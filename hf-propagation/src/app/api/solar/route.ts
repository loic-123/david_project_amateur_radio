import { fetchSolarData } from "@/lib/solar-fetch";

export async function GET() {
  try {
    const data = await fetchSolarData();
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch solar data" },
      { status: 502 }
    );
  }
}
