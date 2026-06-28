const PREMIUM_BBOXES = [
  { minLng: -122.424, maxLng: -122.386, minLat: 37.764, maxLat: 37.792 },
  { minLng: -122.434, maxLng: -122.405, minLat: 37.784, maxLat: 37.807 },
];

const CORE_BBOXES = [
  { minLng: -122.44, maxLng: -122.385, minLat: 37.748, maxLat: 37.807 },
  { minLng: -122.492, maxLng: -122.452, minLat: 37.742, maxLat: 37.785 },
];

function text(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function inBox(lng, lat, box) {
  return lng >= box.minLng && lng <= box.maxLng && lat >= box.minLat && lat <= box.maxLat;
}

function marketTier(lng, lat) {
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    if (PREMIUM_BBOXES.some((box) => inBox(lng, lat, box))) return "premium";
    if (CORE_BBOXES.some((box) => inBox(lng, lat, box))) return "core";
  }
  return "neighborhood";
}

function inferMediaType(props) {
  const joined = [
    props.record_type,
    props.record_type_subtype,
    props.record_name,
    props.description,
  ].map(lower).join(" ");

  if (/\b(digital|led|electronic|video|screen|display)\b/.test(joined)) return "Digital";
  return "Static";
}

function estimateDimensions(mediaType, tier) {
  if (mediaType === "Digital") return "Est. 14 ft x 48 ft digital bulletin; seller to confirm";
  if (tier === "premium") return "Est. 14 ft x 48 ft bulletin; seller to confirm";
  if (tier === "core") return "Est. 12 ft x 25 ft poster/bulletin; seller to confirm";
  return "Est. 10 ft x 22 ft neighborhood poster; seller to confirm";
}

function estimateRateCard(mediaType, tier) {
  const table = {
    Digital: {
      premium: "Est. $12k-$28k / 4 weeks",
      core: "Est. $8k-$18k / 4 weeks",
      neighborhood: "Est. $5k-$12k / 4 weeks",
    },
    Static: {
      premium: "Est. $7.5k-$18k / 4 weeks",
      core: "Est. $4k-$10k / 4 weeks",
      neighborhood: "Est. $2k-$6k / 4 weeks",
    },
  };
  return table[mediaType]?.[tier] ?? table.Static.neighborhood;
}

function estimateCpm(mediaType, tier) {
  const table = {
    Digital: {
      premium: "Est. $10-$24 CPM",
      core: "Est. $8-$18 CPM",
      neighborhood: "Est. $6-$14 CPM",
    },
    Static: {
      premium: "Est. $8-$18 CPM",
      core: "Est. $6-$14 CPM",
      neighborhood: "Est. $4-$10 CPM",
    },
  };
  return table[mediaType]?.[tier] ?? table.Static.neighborhood;
}

function inferLighting(props, mediaType) {
  if (mediaType === "Digital") return "Self-illuminated digital face; operating hours seller-confirmed";
  const joined = [props.record_type, props.record_name, props.description].map(lower).join(" ");
  if (/\b(light|lit|illuminated|electric|neon)\b/.test(joined)) {
    return "Illuminated static face indicated by permit text; seller to confirm";
  }
  return "Static face; lighting seller-confirmed";
}

function ownerSeller(props) {
  const plannerName = text(props.planner_name);
  if (plannerName) {
    return `Media owner to confirm; SF Planning permit contact: ${plannerName}`;
  }
  return "Media owner to confirm; SF Planning GASP permit record";
}

function bookingContact(props) {
  const parts = [text(props.planner_name), text(props.planner_email), text(props.planner_phone)].filter(Boolean);
  if (parts.length) {
    return `${parts.join(" / ")} (permit contact; media sales owner to confirm)`;
  }
  if (text(props.acalink)) {
    return "Use GASP permit link for inquiry trail; media sales owner to confirm";
  }
  return "Seller inquiry required";
}

function availability(props) {
  const status = text(props.record_status);
  const date = text(props.record_status_date);
  if (/permitted/i.test(status)) {
    return `Inquire - permitted inventory${date ? ` as of ${date}` : ""}; open flight dates seller-confirmed`;
  }
  if (status) {
    return `Inquire - permit status ${status}${date ? ` as of ${date}` : ""}; flight dates seller-confirmed`;
  }
  return "Inquire - availability and permit status seller-confirmed";
}

function restrictions(props) {
  const status = text(props.record_status);
  const permit = status ? `${status} SF GASP permit terms` : "SF GASP permit terms";
  return `${permit}; owner approval, creative specs, and regulated-category restrictions must be verified before booking`;
}

export function buyingDataForFeature(feature) {
  const props = feature?.properties ?? {};
  const [lng, lat] = feature?.geometry?.coordinates ?? [];
  const tier = marketTier(Number(lng), Number(lat));
  const mediaType = inferMediaType(props);

  return {
    owner_seller: ownerSeller(props),
    dimensions: estimateDimensions(mediaType, tier),
    facing: "Field verification required",
    rate_card: estimateRateCard(mediaType, tier),
    estimated_cpm: estimateCpm(mediaType, tier),
    availability: availability(props),
    lighting: inferLighting(props, mediaType),
    media_type: mediaType,
    restrictions: restrictions(props),
    booking_contact: bookingContact(props),
    buying_data_source: "Modeled from SF Planning GASP permit metadata; confirm with media owner before purchase",
    buying_data_confidence: "estimated",
  };
}

export function enrichGeoJson(geojson) {
  return {
    ...geojson,
    metadata: {
      ...(geojson.metadata ?? {}),
      buying_data: {
        fields: [
          "owner_seller",
          "dimensions",
          "facing",
          "rate_card",
          "estimated_cpm",
          "availability",
          "lighting",
          "media_type",
          "restrictions",
          "booking_contact",
        ],
        source: "Estimated from SF Planning GASP permit metadata",
        confidence: "estimated",
      },
    },
    features: (geojson.features ?? []).map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        ...buyingDataForFeature(feature),
      },
    })),
  };
}

export function csvCell(value) {
  if (value == null) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export function toCSV(geojson) {
  const rows = (geojson.features ?? []).map((feature) => ({
    lon: feature.geometry?.coordinates?.[0],
    lat: feature.geometry?.coordinates?.[1],
    ...(feature.properties ?? {}),
  }));
  if (rows.length === 0) return "";

  const columns = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) set.add(key);
      return set;
    }, new Set()),
  );
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return lines.join("\n");
}
