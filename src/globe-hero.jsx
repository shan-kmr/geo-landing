import React, { useEffect, useRef } from "react";
import { initGlobe } from "./globe-engine.js";

/* The globe hero background — replaces ManhattanLattice. Copy stays DOM. */
export function GlobeLattice(){
  const stageRef = useRef(null), canvasRef = useRef(null);
  useEffect(() => {
    if(!canvasRef.current) return;
    const cleanup = initGlobe(canvasRef.current, stageRef.current);
    return cleanup;
  }, []);
  return (
    <div className="globe-stage" ref={stageRef}>
      <canvas ref={canvasRef} width={2000} height={1200} />
      <div className="globe-scrimL" />
      <div className="globe-scrimR" />
    </div>
  );
}
