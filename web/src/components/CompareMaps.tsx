import { cellToBoundary } from "h3-js";
import {
  LngLatBounds,
  Map as MlMap,
  Popup,
  setWorkerUrl,
  type GeoJSONSourceSpecification,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef } from "react";
import type { CellCount, MapCells } from "../api/client";
import { plural } from "../lib/labels";

setWorkerUrl(workerUrl);

const BASEMAP = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const BLANK: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#f1f5f9" } }],
};

type Layer = { id: string; cells: CellCount[]; fill: [string, string]; dashed?: boolean };

function toGeoJson(cells: CellCount[]): GeoJSONSourceSpecification["data"] {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => {
      const ring = cellToBoundary(c.cell, true);
      return {
        type: "Feature",
        properties: { count: c.count },
        geometry: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
      };
    }),
  };
}

function bounds(groups: CellCount[][]): LngLatBounds | null {
  const b = new LngLatBounds();
  let any = false;
  for (const cells of groups)
    for (const c of cells)
      for (const p of cellToBoundary(c.cell, true)) {
        b.extend(p as [number, number]);
        any = true;
      }
  return any ? b : null;
}

function addLayers(map: MlMap, layers: Layer[]) {
  for (const l of layers) {
    if (map.getSource(l.id)) continue;
    map.addSource(l.id, { type: "geojson", data: toGeoJson(l.cells) });
    const max = Math.max(1, ...l.cells.map((c) => c.count));
    map.addLayer({
      id: `${l.id}-fill`,
      type: "fill",
      source: l.id,
      paint: {
        "fill-color": ["interpolate", ["linear"], ["get", "count"], 0, l.fill[0], max, l.fill[1]],
        "fill-opacity": l.dashed ? 0.35 : 0.75,
      },
    });
    map.addLayer({
      id: `${l.id}-line`,
      type: "line",
      source: l.id,
      paint: {
        "line-color": l.dashed ? "#64748b" : l.fill[1],
        "line-width": l.dashed ? 1.5 : 0.8,
        ...(l.dashed ? { "line-dasharray": [2, 2] } : {}),
      },
    });
  }
}

function createMap(container: HTMLDivElement, layers: Layer[], fit: LngLatBounds | null) {
  const map = new MlMap({
    container,
    style: BASEMAP,
    attributionControl: { compact: true },
    bounds: fit ?? undefined,
    fitBoundsOptions: { padding: 30 },
    center: fit ? undefined : [46.7, 24.7],
    zoom: fit ? undefined : 9,
  });
  let fellBack = false;
  map.on("error", () => {
    if (!fellBack && !map.isStyleLoaded()) {
      fellBack = true;
      map.setStyle(BLANK);
    }
  });
  map.on("style.load", () => addLayers(map, layers));

  const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 8 });
  for (const l of layers) {
    map.on("mousemove", `${l.id}-fill`, (e: MapLayerMouseEvent) => {
      const count = e.features?.[0]?.properties?.count;
      map.getCanvas().style.cursor = "default";
      popup.setLngLat(e.lngLat).setHTML(`<span style="font-size:12px">${l.id}: <b>${count}</b></span>`).addTo(map);
    });
    map.on("mouseleave", `${l.id}-fill`, () => popup.remove());
  }
  return map;
}

function link(a: MlMap, b: MlMap) {
  let syncing = false;
  const follow = (from: MlMap, to: MlMap) => () => {
    if (syncing) return;
    syncing = true;
    to.jumpTo({ center: from.getCenter(), zoom: from.getZoom(), bearing: from.getBearing(), pitch: from.getPitch() });
    syncing = false;
  };
  a.on("move", follow(a, b));
  b.on("move", follow(b, a));
}

type Props = { cells: MapCells; outcome: string };

export default function CompareMaps({ cells, outcome }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current) return;
    const fit = bounds([cells.input, cells.released, cells.suppressed]);
    const released: [string, string] = outcome === "Masked" ? ["#bae6fd", "#0369a1"] : ["#fde68a", "#b45309"];
    const left = createMap(leftRef.current, [{ id: "input rows", cells: cells.input, fill: ["#bfdbfe", "#1d4ed8"] }], fit);
    const right = createMap(
      rightRef.current,
      [
        { id: "suppressed", cells: cells.suppressed, fill: ["#cbd5e1", "#94a3b8"], dashed: true },
        { id: cells.released_kind === "unique_devices" ? "unique devices" : "released rows", cells: cells.released, fill: released },
      ],
      fit,
    );
    link(left, right);
    return () => {
      left.remove();
      right.remove();
    };
  }, [cells, outcome]);

  const releasedLabel =
    cells.released_kind === "unique_devices"
      ? "Unique devices per released cell (H3 res 7)"
      : cells.released_kind === "device_rows"
        ? "Released device rows per cell (H3 res 9)"
        : "Nothing released";

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <figure>
        <figcaption className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Input</span>
          <span className="text-slate-500">{plural(cells.input.length, "cell")}, rows per cell (H3 res 9)</span>
        </figcaption>
        <div ref={leftRef} className="h-80 overflow-hidden rounded-lg border border-slate-200" />
      </figure>
      <figure>
        <figcaption className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Released</span>
          <span className="text-slate-500">
            {plural(cells.released.length, "cell")}
            {cells.suppressed.length > 0 && <>, {cells.suppressed.length} suppressed (dashed)</>}
          </span>
        </figcaption>
        <div className="relative">
          <div ref={rightRef} className="h-80 overflow-hidden rounded-lg border border-slate-200" />
          {cells.released.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-rose-700 shadow">Nothing released</span>
            </div>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{releasedLabel}. Pan or zoom either map; they move together.</p>
      </figure>
    </div>
  );
}
