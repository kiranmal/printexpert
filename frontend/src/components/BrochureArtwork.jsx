import { useEffect, useState } from "react";
import { fetchFileBlob } from "../services/fileApi";
import "./BrochureArtwork.css";

function BrochureArtworkImage({ element, style }) {
  const source = String(element.src || "");
  const fileId = element.fileId || (source.startsWith("file:") ? source.slice(5) : "");
  const [resolvedSource, setResolvedSource] = useState(source.startsWith("file:") ? "" : source);

  useEffect(() => {
    if (!fileId) return undefined;

    let active = true;
    let objectUrl = "";
    fetchFileBlob(fileId).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedSource(objectUrl);
    }).catch(() => {
      if (active) setResolvedSource("");
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!resolvedSource) return null;

  return (
    <img
      src={resolvedSource}
      alt={element.label || "Brochure artwork"}
      style={{ ...style, height: "auto", objectFit: "contain" }}
    />
  );
}

export default function BrochureArtwork({ item, large = false }) {
  const designs = item?.designs || item?.customization?.designs || {};
  const size = item?.size || item?.customization?.size || "A4 Tri-fold";
  const panelCount = /bi.fold/i.test(size) ? 2 : 3;
  const sides = large ? ["front", "back"] : ["front"];
  const scale = large ? 0.46 : 0.23;

  return (
    <div className={`brochure-artwork${large ? " brochure-artwork-large" : ""}`}>
      {sides.map((side) => (
        <div className="brochure-artwork-side" key={side}>
          {large && (
            <span className="brochure-artwork-label">
              {side === "front" ? "OUTSIDE" : "INSIDE"}
            </span>
          )}
          <div className="brochure-artwork-sheet">
            {(designs?.[side] || []).filter((element) => !element.hidden).map((element) => {
              const common = {
                position: "absolute",
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width || 10}%`,
                opacity: element.opacity ?? 1,
                transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
                zIndex: element.type === "shape" ? 1 : 2,
              };

              if (element.type === "shape") {
                return (
                  <div
                    key={element.id}
                    style={{
                      ...common,
                      height: element.shape === "line"
                        ? `${Math.max(1, (element.height || 2) * scale)}px`
                        : `${element.height || element.width}%`,
                      background: element.color,
                      borderRadius: element.shape === "circle" ? "50%" : element.shape === "line" ? 2 : 3,
                    }}
                  />
                );
              }

              if (element.type === "image" || element.type === "qr") {
                return (
                  <BrochureArtworkImage
                    key={element.id}
                    element={element}
                    style={common}
                  />
                );
              }

              return (
                <div
                  key={element.id}
                  style={{
                    ...common,
                    minHeight: `${element.height || 10}%`,
                    color: element.color || "#153553",
                    fontFamily: element.fontFamily || "Poppins",
                    fontSize: `${Math.max(2, (Number(element.fontSize) || 9) * scale)}px`,
                    fontWeight: element.bold ? 700 : 400,
                    fontStyle: element.italic ? "italic" : "normal",
                    textDecoration: element.underline ? "underline" : "none",
                    letterSpacing: `${(element.letterSpacing || 0) * scale}px`,
                    lineHeight: element.lineHeight || 1.18,
                    textAlign: element.align || "center",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {element.text}
                </div>
              );
            })}
            <div className="brochure-artwork-folds" aria-hidden="true">
              {Array.from({ length: panelCount - 1 }, (_, index) => (
                <span key={index} style={{ left: `${((index + 1) / panelCount) * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
