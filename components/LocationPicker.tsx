"use client";

import { useEffect, useRef, useState } from "react";
import {
  approximateBrowserLocation,
  fallbackLocationStatus,
  type LocationStatus,
} from "@/lib/location";
import { locationOptions, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { LoadingSpinner } from "./LoadingSpinner";
import { useLocationSelection } from "./LocationProvider";

export function LocationPicker({
  locale,
  messages: m,
  open,
  onClose,
}: {
  locale: Locale;
  messages: Messages;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { save } = useLocationSelection();
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [manualOpen, setManualOpen] = useState(false);
  const [city, setCity] = useState<string>(locationOptions[0].city);
  const [district, setDistrict] = useState<string>(locationOptions[0].districts[0]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  const useBrowserLocation = () => {
    setStatus("pending");
    if (!navigator.geolocation) {
      setStatus("error");
      setManualOpen(true);
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      () => {
        save(approximateBrowserLocation(locale));
        setStatus("found");
      },
      (error) => {
        setStatus(fallbackLocationStatus(error.code));
        setManualOpen(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const selectedCity = locationOptions.find((item) => item.city === city);

  return (
    <dialog
      className="location-dialog"
      ref={dialogRef}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <p className="eyebrow">{m.locationShort}</p>
            <h2>{m.locationDialogTitle}</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label={m.close}>
            <Icon name="close" />
          </button>
        </div>
        <p>{m.locationDialogText}</p>
        <button className="location-choice primary" type="button" onClick={useBrowserLocation} disabled={status === "loading"}>
          <strong>{m.useMyLocation}</strong>
          <span>{m.useMyLocationHint}</span>
        </button>
        {status !== "idle" ? (
          <div className={`location-status ${status}`} role="status">
            {status === "loading" ? (
              <LoadingSpinner compact label={m.locationGetting} />
            ) : (
              m.locationStatuses[status]
            )}
          </div>
        ) : null}
        <button className="text-button" type="button" onClick={() => setManualOpen((value) => !value)} aria-expanded={manualOpen}>
          {m.chooseManually}<Icon name="chevron" size={17} />
        </button>
        {manualOpen ? (
          <div className="manual-location">
            <div className="dialog-grid">
              <label>{m.city}
                <select
                  value={city}
                  onChange={(event) => {
                    const nextCity = event.target.value;
                    const next = locationOptions.find((item) => item.city === nextCity);
                    setCity(nextCity);
                    setDistrict(next?.districts[0] ?? "");
                  }}
                >
                  {locationOptions.map((item) => <option key={item.city}>{item.city}</option>)}
                </select>
              </label>
              <label>{m.district}
                <select value={district} onChange={(event) => setDistrict(event.target.value)}>
                  {selectedCity?.districts.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                save({ city, district, label: `${district}, ${city}`, source: "manual" });
                setStatus("manual");
                onClose();
              }}
            >
              {m.saveLocation}
            </button>
          </div>
        ) : null}
        <p className="dialog-privacy"><Icon name="shield" size={16} />{m.locationPrivacyShort}</p>
      </div>
    </dialog>
  );
}
