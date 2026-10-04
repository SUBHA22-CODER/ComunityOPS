"use client";

import React from "react";

export default function HeroHeading() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-[1.08]">
        High-Stakes Community Operations,{" "}
        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
          Mathematically Fair.
        </span>
      </h1>
    </div>
  );
}
