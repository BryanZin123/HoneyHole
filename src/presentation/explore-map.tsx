"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShoreLocation } from "../domain/discovery";
export function ExploreMap({
  locations,
  selectedId,
  onSelect,
  label = "California shoreline map",
}: {
  locations: Pick<ShoreLocation, "id" | "name" | "coordinates">[];
  label?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [36.5, -121],
      6,
    );
    L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ??
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    )
      .on("tileerror", () => setTileError(true))
      .addTo(map);
    const icon = L.divIcon({
      className: "shore-marker",
      html: '<span aria-hidden="true">●</span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    for (const location of locations) {
      const marker = L.marker(
        [location.coordinates.latitude, location.coordinates.longitude],
        { icon, title: location.name, keyboard: true },
      ).addTo(map);
      const label = document.createElement("span");
      label.textContent = location.name;
      marker.bindTooltip(label);
      marker.on("click", () => onSelect(location.id));
    }
    const selected = locations.find((l) => l.id === selectedId);
    if (selected)
      map.setView(
        [selected.coordinates.latitude, selected.coordinates.longitude],
        13,
      );
    else if (locations.length)
      map.fitBounds(
        locations.map(
          (l) =>
            [l.coordinates.latitude, l.coordinates.longitude] as [
              number,
              number,
            ],
        ),
        { padding: [30, 30], maxZoom: 13 },
      );
    return () => {
      map.remove();
    };
  }, [locations, selectedId, onSelect]);
  return (
    <div>
      <div
        ref={container}
        className="explore-map"
        role="region"
        aria-label={label}
      />
      {tileError && (
        <p role="status">
          Basemap tiles unavailable. Location pins and the location list remain
          available.
        </p>
      )}
      <a
        href="https://www.openstreetmap.org/fixthemap"
        target="_blank"
        rel="noreferrer"
      >
        Report a basemap issue
      </a>
    </div>
  );
}
