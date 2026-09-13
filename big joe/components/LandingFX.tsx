'use client';

import { useEffect } from 'react';

export function LandingFX() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    // --- Scroll reveal (.reveal -> .reveal.in-view via IntersectionObserver) ---
    const revealEls = document.querySelectorAll<HTMLElement>('.reveal');
    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add('in-view'));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              setTimeout(() => el.classList.add('in-view'), (i % 3) * 100);
              revealObserver.unobserve(el);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
      );
      revealEls.forEach((el) => revealObserver.observe(el));
      cleanups.push(() => revealObserver.disconnect());
    }

    // --- Stats counter ---
    const statEls = document.querySelectorAll<HTMLElement>('.stat-number');
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count ?? '0', 10);
          statObserver.unobserve(el);
          if (prefersReducedMotion) {
            el.textContent = String(target);
            return;
          }
          const duration = 1400;
          const start = performance.now();
          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = String(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach((el) => statObserver.observe(el));
    cleanups.push(() => statObserver.disconnect());

    // --- Particle system ---
    const canvas = document.getElementById('particles') as HTMLCanvasElement | null;

    if (canvas && !prefersReducedMotion) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let particles: Particle[] = [];
        let animationId = 0;

        function resizeCanvas() {
          if (!canvas) return;
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        class Particle {
          x = 0;
          y = 0;
          size = 0;
          speedX = 0;
          speedY = 0;
          color = '';
          opacity = 0;
          constructor() {
            this.reset();
          }
          reset() {
            this.x = Math.random() * (canvas?.width ?? 0);
            this.y = Math.random() * (canvas?.height ?? 0);
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.color = Math.random() > 0.5 ? 'rgba(220, 38, 38, ' : 'rgba(37, 99, 235, ';
            this.opacity = Math.random() * 0.5 + 0.1;
          }
          update() {
            if (!canvas) return;
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
          }
          draw() {
            if (!ctx) return;
            ctx.fillStyle = this.color + this.opacity + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        function initParticles() {
          particles = [];
          const count = window.innerWidth < 768 ? 25 : 50;
          for (let i = 0; i < count; i++) particles.push(new Particle());
        }

        function animate() {
          if (!canvas || !ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          particles.forEach((p) => {
            p.update();
            p.draw();
          });
          animationId = requestAnimationFrame(animate);
        }

        resizeCanvas();
        initParticles();
        animate();
        window.addEventListener('resize', resizeCanvas);

        cleanups.push(() => {
          window.removeEventListener('resize', resizeCanvas);
          cancelAnimationFrame(animationId);
        });
      }
    }

    // --- Parallax hero cars ---
    function onScroll() {
      const scrolled = window.scrollY;
      const car1 = document.querySelector<HTMLElement>('.hero-car-1');
      const car2 = document.querySelector<HTMLElement>('.hero-car-2');
      if (car1) car1.style.transform = `rotate(-15deg) translateY(${scrolled * 0.3}px)`;
      if (car2) car2.style.transform = `rotate(10deg) translateY(${scrolled * 0.2}px)`;
    }
    if (!prefersReducedMotion) {
      window.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener('scroll', onScroll));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
