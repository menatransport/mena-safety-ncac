export const ColorPalette = () => {
  const colorGroups = {
    green: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    red: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Color Palette</h2>
      <div className="space-y-8">
        {Object.entries(colorGroups).map(([groupName, shades]) => (
          <div key={groupName}>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 capitalize">{groupName}</h3>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Object.entries(shades).map(([shade, color]) => (
                <div key={`${groupName}-${shade}`} className="flex flex-col items-center">
                  <div
                    className="w-full h-16 rounded-lg shadow-md transition-transform hover:scale-105 cursor-pointer border border-gray-200"
                    style={{ backgroundColor: color }}
                    title={`${groupName}-${shade}: ${color}`}
                  />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-medium text-gray-700">{shade}</p>
                    <p className="text-xs text-gray-500 font-mono">{color}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export the color palette for use in other components
export const dashboardColors = {
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
