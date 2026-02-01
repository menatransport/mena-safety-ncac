import { FileText, Calculator } from 'lucide-react';

interface ViewSelectorProps {
  activeView: string;
  setActiveView: (value: string) => void;
}

const menu = [
  { value: 'dashboard', name: 'เบื้องต้น', icon: FileText },
  { value: 'finance', name: 'การเงิน', icon: Calculator },
];

export const ViewSelector = ({ activeView, setActiveView }: ViewSelectorProps) => {
  return (
    <div className="relative flex flex-wrap rounded-lg bg-gray-200 p-1 w-full md:w-1/2 lg:w-1/3 text-sm shadow-sm">
      {menu.map((item) => {
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
