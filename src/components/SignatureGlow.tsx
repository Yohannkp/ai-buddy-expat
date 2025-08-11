import { useEffect } from "react";

type Props = { selector?: string };

export default function SignatureGlow({ selector = ".ambient" }: Props) {
  useEffect(() => {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const onMove = (e: MouseEvent) => {
      roots.forEach((el) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--x", `${x}%`);
        el.style.setProperty("--y", `${y}%`);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [selector]);
  return null;
}
