import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

const Preloader = ({ onComplete }) => {
  const containerRef = useRef(null);
  const preInnerRef = useRef(null);
  const leftBlockRef = useRef(null);
  const rightBlockRef = useRef(null);
  const headingRef = useRef(null);
  const progressRef = useRef(null);
  const timeoutIdsRef = useRef([]);
  const timelinesRef = useRef({ entry: null });

  useEffect(() => {
    document.body.classList.add("preloader-body");
    return () => {
      document.body.classList.remove("preloader-body");
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const preInner = preInnerRef.current;
    const leftBlock = leftBlockRef.current;
    const rightBlock = rightBlockRef.current;
    const textLines = headingRef.current
      ? headingRef.current.querySelectorAll("span")
      : [];
    const metaItems = preInner?.querySelectorAll("[data-meta-item]") ?? [];

    const ctx = gsap.context(() => {
      const entryTl = gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .set(preInner, { autoAlpha: 0, y: 80, scale: 0.94 })
        .set([leftBlock, rightBlock], { autoAlpha: 0, scale: 0.82 })
        .set(textLines, { yPercent: 110, autoAlpha: 0 })
        .set(metaItems, { y: 30, autoAlpha: 0 })
        .to(preInner, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.1,
          delay: 0.15,
        })
        .to(
          [leftBlock, rightBlock],
          { autoAlpha: 1, scale: 1, duration: 0.9 },
          "-=0.6"
        )
        .to(
          textLines,
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.12,
          },
          "-=0.35"
        )
        .to(
          metaItems,
          { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.08 },
          "-=0.4"
        );

      timelinesRef.current.entry = entryTl;
    }, container);

    const scheduleTimeout = (cb, delay) => {
      const id = setTimeout(cb, delay);
      timeoutIdsRef.current.push(id);
      return id;
    };

    const clearScheduled = () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };

    const simulateProgress = () => {
      let val = 0;

      const step = () => {
        const inc =
          val < 50
            ? gsap.utils.random(2, 5)
            : val < 85
            ? gsap.utils.random(1, 3)
            : gsap.utils.random(0.5, 1.5);
        val = Math.min(100, Math.round(val + inc));

        if (progressRef.current) {
          progressRef.current.textContent = String(val).padStart(2, "0");
        }

        if (val < 100) {
          scheduleTimeout(step, 45 + Math.random() * 90);
        } else {
          scheduleTimeout(() => {
            const exitTl = gsap.timeline({
              defaults: { ease: "power2.inOut" },
              onComplete: onComplete,
            });

            exitTl
              .to(
                metaItems,
                { autoAlpha: 0, y: -15, duration: 0.4, stagger: 0.05 },
                0
              )
              .to(
                textLines,
                { autoAlpha: 0, yPercent: -30, duration: 0.5, stagger: 0.08 },
                "-=0.25"
              )
              .to(
                preInner,
                { autoAlpha: 0, scale: 0.9, duration: 0.6 },
                "-=0.35"
              )
              .to(
                container,
                { yPercent: -100, duration: 1.1, ease: "power4.inOut" },
                "-=0.15"
              );
          }, 280);
        }
      };

      step();
    };

    simulateProgress();

    return () => {
      clearScheduled();
      ctx.revert();
      timelinesRef.current.entry?.kill();
    };
  }, [onComplete]);

  return (
    <div id="preloader" ref={containerRef} role="status" aria-live="polite">
      <div className="pre-inner" ref={preInnerRef}>
        <span data-left-side>
          <span ref={leftBlockRef} />
        </span>
        <span data-right-side>
          <span ref={rightBlockRef} />
        </span>
        
        <h1 className="big-heading" ref={headingRef}>
          <span>Nuvora</span>
          <span>Next-gen school operations</span>
          <span>Engineered with ERP</span>
        </h1>
        <div className="pre-footer" data-meta-item>
          <div className="pre-footer__label" data-meta-item>
            Loading workspace
          </div>
          <div className="progress" data-meta-item>
            <span id="progressValue" ref={progressRef}>
              00
            </span>
            %
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preloader;

