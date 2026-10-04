"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const Particles = dynamic(() => import("@/components/Particles"), {
  ssr: false,
});

export default function HeroParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-[calc(1.875rem-0.375rem)] opacity-60">
      <Particles
        particleCount={70}
        particleSpread={8}
        speed={0.12}
        particleColors={["#6366f1", "#a855f7", "#38bdf8", "#818cf8"]}
        particleBaseSize={100}
        sizeRandomness={0.7}
        cameraDistance={22}
        moveParticlesOnHover={true}
        particleHoverFactor={1.5}
        alphaParticles={true}
        className="w-full h-full"
      />
    </div>
  );
}
