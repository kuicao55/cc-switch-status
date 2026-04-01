type AppType = "claude" | "codex" | "gemini";

interface AppNavBarProps {
  active: AppType;
  onChange: (app: AppType) => void;
}

const tabs: { id: AppType; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini" },
];

export function AppNavBar({ active, onChange }: AppNavBarProps) {
  return (
    <div className="flex bg-[#1a1a1a] p-2 gap-2 border-b border-[#3d3d3d]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-1.5 rounded-md text-[12px] text-center transition-colors ${
            active === tab.id
              ? "bg-[#4a9eff] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}