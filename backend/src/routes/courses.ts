import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

// GET /courses?lat=&lng=&radius_miles=
router.get("/", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius_miles ?? 25);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat_lng_required" });
    }
    // PostGIS: meters. 1 mile = 1609.344 m.
    const { data, error } = await supabaseAdmin.rpc("courses_within", {
      origin_lat: lat,
      origin_lng: lng,
      radius_meters: radius * 1609.344,
    });
    if (error) {
      // fallback: naive bbox
      const dLat = radius / 69;
      const dLng = radius / (69 * Math.cos((lat * Math.PI) / 180));
      const { data: rows, error: err2 } = await supabaseAdmin
        .from("courses")
        .select("*")
        .gte("lat", lat - dLat).lte("lat", lat + dLat)
        .gte("lng", lng - dLng).lte("lng", lng + dLng)
        .eq("active", true);
      if (err2) throw err2;
      return res.json({ courses: rows });
    }
    res.json({ courses: data });
  } catch (e) { next(e); }
});

export default router;
