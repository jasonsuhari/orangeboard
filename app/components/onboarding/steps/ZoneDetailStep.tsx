"use client";

import type { OpportunityWithPolygon } from "../../../lib/opportunityBlobs";

export default function ZoneDetailStep({
  zone,
  position,
  businesses,
  onSelectAdjacent,
  onSelectZone,
  onLaunch,
}: {
  zone: OpportunityWithPolygon;
  position: string;
  businesses: NonNullable<OpportunityWithPolygon["matchedBusinesses"]>;
  onSelectAdjacent: (direction: -1 | 1) => void;
  onSelectZone: (id: string | null) => void;
  onLaunch: () => void;
}) {
  return (
    <>
      <div className="pob-zone-detail-head">
        <button
          type="button"
          className="pob-zone-nav"
          onClick={() => onSelectAdjacent(-1)}
          aria-label="Previous zone"
        >
          &lt;
        </button>
        <div className="pob-zone-title-wrap">
          <span className="pob-zone-counter">{position}</span>
          <h2 id="pob-title" className="pob-title">{zone.title}</h2>
          <p className="pob-meta">{zone.area} / {zone.timing}</p>
        </div>
        <button
          type="button"
          className="pob-zone-nav"
          onClick={() => onSelectAdjacent(1)}
          aria-label="Next zone"
        >
          &gt;
        </button>
      </div>
      <p className="pob-body">{zone.summary}</p>
      <div className="pob-stats">
        <div className="pob-stat">
          <b>{zone.accounts}</b>
          <span>Accounts</span>
        </div>
        <div className="pob-stat">
          <b>{zone.placements}</b>
          <span>Placements</span>
        </div>
        <div className="pob-stat">
          <b>{zone.score}</b>
          <span>Fit score</span>
        </div>
      </div>
      {businesses.length > 0 && (
        <div className="pob-business-panel">
          <div className="pob-business-heading">
            <span>Business locations</span>
            <b>{businesses.length}</b>
          </div>
          <div className="pob-business-list">
            {businesses.map((business, index) => (
              <button
                key={`${zone.id}:${business.name}:${index}`}
                type="button"
                className="pob-business-row"
                onClick={() => onSelectZone(zone.id)}
              >
                <span className="pob-business-pin" aria-hidden />
                <span className="pob-business-main">
                  <span className="pob-business-name">{business.name}</span>
                  <span className="pob-business-meta">
                    {(business.type || "Business")} - {business.reason}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="pob-actions">
        <button type="button" onClick={onLaunch} className="pob-btn pob-btn-primary">
          Launch campaign here
        </button>
      </div>
    </>
  );
}
