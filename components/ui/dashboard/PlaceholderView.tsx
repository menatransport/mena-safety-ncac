import { Activity, Truck, AlertTriangle, LucideIcon } from 'lucide-react';

interface PlaceholderViewProps {
  title: string;
  message: string;
  icon: 'activity' | 'truck' | 'alert';
}

export const PlaceholderView = ({ title, message, icon }: PlaceholderViewProps) => {
  let IconComponent: LucideIcon;
  let iconColor: string;

  switch (icon) {
    case 'activity':
      IconComponent = Activity;
      iconColor = 'text-blue-600';
      break;
    case 'truck':
      IconComponent = Truck;
      iconColor = 'text-green-600';
      break;
    case 'alert':
      IconComponent = AlertTriangle;
      iconColor = 'text-red-600';
      break;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <IconComponent className={`w-6 h-6 ${iconColor}`} />
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="text-center py-12 text-gray-500">
        <IconComponent className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">{message}</p>
      </div>
    </div>
  );
};
