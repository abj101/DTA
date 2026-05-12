"use client";

import { useEffect, useRef, useState } from "react";

import { DifferentiatorList } from "@/components/landing/differentiator-list";
import { Hero } from "@/components/landing/hero";
import { PricingBlock } from "@/components/landing/pricing-block";
import { ProblemCards } from "@/components/landing/problem-cards";

function SectionDivider() {
  return (
    <div className="w-full">
      <hr className="divider relative left-1/2 w-[calc(100vw-(2*clamp(1rem,3.5vw,3.125rem)))] max-w-none -translate-x-1/2 border-0 border-t border-dta-border" />
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LandingScrollStage() {
  const [progress, setProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [baseVerticalInset, setBaseVerticalInset] = useState(0);
  const [maxHeroScale, setMaxHeroScale] = useState(1.08);
  const heroMeasureRef = useRef<HTMLDivElement | null>(null);
  const heroFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setPrefersReducedMotion(media.matches);
    };

    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    let ticking = false;

    const updateProgress = () => {
      if (prefersReducedMotion) {
        setProgress(1);
        ticking = false;
        return;
      }

      const collapseDistance = window.innerHeight * 0.26;
      const nextProgress = clamp(window.scrollY / collapseDistance, 0, 1);
      setProgress(nextProgress);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      media.removeEventListener("change", updateMotionPreference);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const measureInset = () => {
      const heroNode = heroMeasureRef.current;
      const frameNode = heroFrameRef.current;
      if (!heroNode || !frameNode) {
        return;
      }

      const heroHeight = heroNode.offsetHeight;
      const viewportHeight = window.innerHeight;
      setBaseVerticalInset(Math.max(0, (viewportHeight - heroHeight) / 2));

      const availableWidth = frameNode.clientWidth;
      const heroWidth = heroNode.offsetWidth;
      const fittedScale = heroWidth > 0 ? availableWidth / heroWidth : 1;
      // Keep scale-up subtle; aggressive upscaling can soften text and edges.
      setMaxHeroScale(clamp(fittedScale * 0.99, 1, 1.08));
    };

    measureInset();
    window.addEventListener("resize", measureInset);

    return () => {
      window.removeEventListener("resize", measureInset);
    };
  }, []);

  const heroScale = prefersReducedMotion
    ? 1
    : maxHeroScale - progress * (maxHeroScale - 1);
  const heroTranslateY = prefersReducedMotion
    ? 0
    : Math.round((1 - progress) * 18);
  const heroTopInset = prefersReducedMotion
    ? 0
    : baseVerticalInset * (1 - progress);
  const heroBottomInset = prefersReducedMotion
    ? 0
    : baseVerticalInset * Math.pow(1 - progress, 2) * 0.45;
  const contentOffset = prefersReducedMotion ? 0 : (1 - progress) * 22;
  const contentOpacity = prefersReducedMotion ? 1 : 0.45 + progress * 0.55;

  return (
    <>
      <section className="relative bg-dta-base">
        <div
          ref={heroFrameRef}
          className="relative flex justify-center overflow-clip"
          style={{
            paddingLeft: "clamp(0.75rem,2.4vw,2.25rem)",
            paddingRight: "clamp(0.75rem,2.4vw,2.25rem)",
            paddingTop: `${heroTopInset}px`,
            paddingBottom: `${heroBottomInset}px`,
            transition:
              "padding-top 220ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="mx-auto"
            ref={heroMeasureRef}
            style={{
              width: "min(100%, 96rem)",
              transform: `translate3d(0, ${heroTranslateY}px, 0) scale(${heroScale})`,
              transformOrigin: "50% 50%",
              transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <Hero />
          </div>
        </div>
      </section>

      <div
        className="relative z-10 bg-dta-base transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          opacity: contentOpacity,
          transform: `translateY(${contentOffset}px)`,
        }}
      >
        <ProblemCards />
        <div className="my-dta-lg md:my-dta-xl">
          <SectionDivider />
        </div>
        <DifferentiatorList />
        <div className="my-dta-lg md:my-dta-xl">
          <SectionDivider />
        </div>
        <PricingBlock />
      </div>
    </>
  );
}
