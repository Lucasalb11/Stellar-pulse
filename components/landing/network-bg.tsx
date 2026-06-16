export function NetworkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 grid-bg opacity-70" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 420px at 78% 12%, rgba(0,212,255,0.05), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          background:
            "linear-gradient(180deg, transparent, var(--color-background))",
        }}
      />
    </div>
  );
}
