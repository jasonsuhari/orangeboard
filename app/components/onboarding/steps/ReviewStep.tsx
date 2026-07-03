"use client";

import type { CompanyBrief } from "../../../lib/types";
import { listToTextarea, textareaToList } from "../briefHelpers";
import type { CreativeResult } from "../constants";

export default function ReviewStep({
  brief,
  creative,
  creativePending,
  onRepaint,
  onShowZones,
  onRescan,
  patchBrief,
}: {
  brief: CompanyBrief;
  creative: CreativeResult | null;
  creativePending: boolean;
  onRepaint: () => void;
  onShowZones: () => void;
  onRescan: () => void;
  patchBrief: (patch: (current: CompanyBrief) => CompanyBrief) => void;
}) {
  return (
    <>
      <h2 id="pob-title" className="pob-title">Your campaign kit is ready!</h2>
      <p className="pob-body pob-review-body">Fix anything that reads wrong. This brief drives everything.</p>
      <div className="pob-kit pob-book">
        <div className="pob-book-spine" aria-hidden />
        <section className="pob-book-page pob-book-page-left" aria-label="Creative brief">
          <div className="pob-page-head">
            <span className="pob-page-kicker">Creative brief</span>
            <button
              type="button"
              onClick={onRepaint}
              disabled={creativePending}
              className="pob-btn pob-btn-mini"
            >
              {creativePending ? "Painting..." : "Repaint"}
            </button>
          </div>
          <div className="pob-creative">
            {creative ? (
              // Data-URL creatives can't go through next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creative.imageUrl} alt="Generated billboard creative" />
            ) : (
              <span className="pob-creative-wait">
                {creativePending ? "Painting your billboard..." : "Billboard creative unavailable"}
              </span>
            )}
          </div>
          <div className="pob-kit-grid">
            <div className="pob-field">
              <label htmlFor="pob-company">Company</label>
              <input
                id="pob-company"
                className="pob-edit pob-edit-name"
                value={brief.identity.companyName}
                onChange={(e) =>
                  patchBrief((b) => ({
                    ...b,
                    identity: { ...b.identity, companyName: e.target.value },
                  }))
                }
              />
            </div>
            <div className="pob-field">
              <label htmlFor="pob-cta">Call to action</label>
              <input
                id="pob-cta"
                className="pob-edit"
                value={brief.campaign.callToAction ?? ""}
                placeholder="Book a demo"
                onChange={(e) =>
                  patchBrief((b) => ({
                    ...b,
                    campaign: { ...b.campaign, callToAction: e.target.value },
                  }))
                }
              />
            </div>
          </div>
          <div className="pob-field">
            <label htmlFor="pob-message">Billboard message</label>
            <textarea
              id="pob-message"
              className="pob-edit pob-edit-message"
              rows={2}
              value={brief.campaign.coreMessage}
              onChange={(e) =>
                patchBrief((b) => ({
                  ...b,
                  campaign: { ...b.campaign, coreMessage: e.target.value },
                }))
              }
            />
          </div>
          <div className="pob-field">
            <label htmlFor="pob-mandatories">Creative direction</label>
            <textarea
              id="pob-mandatories"
              className="pob-edit pob-edit-list"
              rows={3}
              value={listToTextarea(brief.strategy?.creativeMandatories)}
              onChange={(e) =>
                patchBrief((b) => ({
                  ...b,
                  strategy: {
                    ...(b.strategy ?? {}),
                    creativeMandatories: textareaToList(e.target.value),
                  },
                }))
              }
            />
          </div>
        </section>
        <section className="pob-book-page pob-book-page-right" aria-label="ICP">
          <div className="pob-page-head">
            <span className="pob-page-kicker">ICP</span>
          </div>
          <div className="pob-field">
            <label htmlFor="pob-audience">Audience</label>
            <textarea
              id="pob-audience"
              className="pob-edit pob-edit-audience"
              rows={3}
              value={brief.audience.description}
              onChange={(e) =>
                patchBrief((b) => ({
                  ...b,
                  audience: { ...b.audience, description: e.target.value },
                }))
              }
            />
          </div>
          <div className="pob-field">
            <label htmlFor="pob-positioning">Positioning</label>
            <textarea
              id="pob-positioning"
              className="pob-edit pob-edit-compact"
              rows={2}
              value={brief.strategy?.positioning ?? ""}
              onChange={(e) =>
                patchBrief((b) => ({
                  ...b,
                  strategy: { ...(b.strategy ?? {}), positioning: e.target.value },
                }))
              }
            />
          </div>
          <div className="pob-field">
            <label htmlFor="pob-promise">Promise</label>
            <textarea
              id="pob-promise"
              className="pob-edit pob-edit-compact"
              rows={2}
              value={brief.strategy?.customerPromise ?? ""}
              onChange={(e) =>
                patchBrief((b) => ({
                  ...b,
                  strategy: { ...(b.strategy ?? {}), customerPromise: e.target.value },
                }))
              }
            />
          </div>
          {(brief.identity.brandAdjectives?.length ?? 0) > 0 && (
            <div className="pob-chips">
              {brief.identity.brandAdjectives.slice(0, 4).map((adjective) => (
                <span key={adjective} className="pob-chip">{adjective}</span>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="pob-actions pob-review-actions">
        <button type="button" onClick={onShowZones} className="pob-btn pob-btn-primary">
          Show my zones
        </button>
        <button type="button" onClick={onRescan} className="pob-btn pob-btn-ghost">
          Rescan
        </button>
      </div>
    </>
  );
}
