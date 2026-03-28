'use client';
import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 5000, suffix: '+', label: 'Phòng', icon: '🚪' },
  { value: 200, suffix: '+', label: 'Môi giới', icon: '🤝' },
  { value: 200, suffix: '+', label: 'Tòa nhà', icon: '🏢' },
  { value: 10000, suffix: '+', label: 'Khách thuê', icon: '👤' },
];

function useCountUp(target: number, started: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    let frame: number;
    const duration = 1500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, started]);

  return count;
}

function StatCard({ value, suffix, label, icon, started }: { value: number; suffix: string; label: string; icon: string; started: boolean }) {
  const count = useCountUp(value, started);

  return (
    <div className="text-center">
      <span className="text-3xl mb-2 block">{icon}</span>
      <div className="font-display text-4xl sm:text-5xl font-bold text-stone-900 mb-1">
        {count}{suffix}
      </div>
      <p className="text-sm text-stone-500 font-medium">{label}</p>
    </div>
  );
}

export function CountUpStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-16 sm:py-20 px-4 sm:px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-stone-50 via-white to-stone-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-50/40 rounded-full blur-[100px]" />

      <div className="max-w-4xl mx-auto relative">
        <div className="rounded-3xl bg-white/70 backdrop-blur border border-stone-200/60 p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} started={started} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
