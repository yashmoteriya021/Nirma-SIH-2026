export default function StatChip({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3 bg-offwhite-0 rounded-xl border border-navy-100 px-4 py-3 shadow-sm">
      <div className="w-10 h-10 rounded-lg bg-navy-900 text-accent-gold flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-navy-900 font-semibold text-sm">{value}</p>
        <p className="text-navy-700 text-xs">{label}</p>
      </div>
    </div>
  );
}
