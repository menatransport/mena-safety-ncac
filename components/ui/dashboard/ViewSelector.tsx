
interface ViewSelectorProps {
  activeView: string;
  setActiveView: (value: string) => void;
  menu?: { value: string; name: string; icon: React.ComponentType<{ size: number }> }[];
}

export const ViewSelector = ({ activeView, setActiveView, menu }: ViewSelectorProps) => {
  return (
    <div className="relative flex flex-wrap rounded-lg bg-indigo-200/10 p-1 w-full text-sm shadow-sm">
      {menu?.map((item) => {
        const IconComponent = item.icon;
        return (
          <label key={item.value} className="flex-1 text-center cursor-pointer">
            <input
              type="radio"
              name="viewType"
              value={item.value}
              checked={activeView === item.value}
              onChange={(e) => setActiveView(e.target.value)}
              className="hidden"
            />
            <span className={`flex items-center justify-center gap-1.5 md:gap-2 rounded-md border-none py-2 px-3 md:px-4 transition-all duration-150 ease-in-out ${
              activeView === item.value
                ? 'bg-white font-semibold text-slate-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-700'
            }`}>
              <IconComponent size={16} />
              <span className="text-xs sm:text-sm">{item.name}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
};
