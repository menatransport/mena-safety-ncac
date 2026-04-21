import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { DollarSign, TrendingUp, AlertTriangle, Building2 } from 'lucide-react';
import { dashboardColors } from './ColorPalette';
import { useMemo } from 'react';
import { useUiTheme } from '@/lib/useUiTheme';

interface FinanceData {
  centerCosts: CenterCostData[];
  totalActualCost: number;
  monthlyCosts: MonthlyCostData[];
}

interface CenterCostData {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface PriorityCostData {
  priority: string;
  actualCost: number;
  estimatedCost: number;
  [key: string]: string | number;
}

interface MonthlyCostData {
  month: string;
  NC: number;
  AC: number;
  total: number;
  [key: string]: string | number;
}


interface FinanceViewProps {
  data: FinanceData;
}

export const FinanceView = ({ data }: FinanceViewProps) => {
  const { theme } = useUiTheme();
  const isDark = theme === 'Dark';

  const panelClass = isDark
    ? 'bg-slate-900/55 border border-slate-700/80'
    : 'bg-white border border-gray-100';

  const chartTheme = useMemo(
    () => ({
      text: {
        fill: isDark ? '#e2e8f0' : '#374151',
        fontSize: 11,
      },
      axis: {
        domain: {
          line: {
            stroke: isDark ? '#475569' : '#d1d5db',
            strokeWidth: 1,
          },
        },
        ticks: {
          line: {
            stroke: isDark ? '#475569' : '#d1d5db',
            strokeWidth: 1,
          },
          text: {
            fill: isDark ? '#cbd5e1' : '#4b5563',
          },
        },
      },
      grid: {
        line: {
          stroke: isDark ? '#334155' : '#e5e7eb',
          strokeWidth: 1,
        },
      },
      legends: {
        text: {
          fill: isDark ? '#cbd5e1' : '#4b5563',
        },
      },
      tooltip: {
        container: {
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#1f2937',
          fontSize: 12,
          borderRadius: 8,
          boxShadow: isDark
            ? '0 8px 28px rgba(2, 6, 23, 0.5)'
            : '0 8px 28px rgba(15, 23, 42, 0.15)',
          border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
        },
      },
    }),
    [isDark]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl shadow-lg p-4 md:p-6 text-white" style={{ background: `linear-gradient(to bottom right, ${dashboardColors.green[500]}, ${dashboardColors.green[600]})` }}>
          <div className="flex items-center justify-between">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
            <div className="text-right">
              <p className="text-xs md:text-sm opacity-90">ค่าเสียหายจริงทั้งหมด</p>
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(data.totalActualCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pie Chart - ค่าเสียหายตามศูนย์ปฏิบัติการ */}
        <div className={`rounded-xl shadow-lg p-4 md:p-6 ${panelClass}`}>
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Building2 className="w-4 h-4 md:w-5 md:h-5" style={{ color: dashboardColors.green[600] }} />
            <h3 className="text-sm md:text-lg font-semibold" style={{ color: isDark ? '#f1f5f9' : dashboardColors.gray[800] }}>
              <span className="hidden md:inline">ค่าเสียหายจริงตามศูนย์ปฏิบัติการ</span>
              <span className="md:hidden">ค่าเสียหาย/ศูนย์</span>
            </h3>
          </div>
          <div className="h-64 md:h-80">
            {data.centerCosts.length > 0 ? (
              <ResponsivePie
                theme={chartTheme as any}
                data={data.centerCosts}
                margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={15}
                arcLinkLabelsTextColor={isDark ? '#e2e8f0' : '#333333'}
                arcLinkLabelsThickness={1}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={15}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                enableArcLinkLabels={false}
                valueFormat={(value) => `${(value / 1000).toFixed(0)}K`}
                legends={[
                  {
                    anchor: 'right',
                    direction: 'column',
                    justify: false,
                    translateX: 70,
                    translateY: 0,
                    itemsSpacing: 4,
                    itemWidth: 70,
                    itemHeight: 16,
                    itemTextColor: isDark ? '#cbd5e1' : '#666',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 12,
                    symbolShape: 'circle',
                  }
                ]}
              />
            ) : (
              <div className={`flex items-center justify-center h-full ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                ไม่มีข้อมูล
              </div>
            )}
          </div>
          {/* Percentage Table */}
          <div className="hidden mt-4 space-y-2">
            {data.centerCosts.map((center) => (
              <div key={center.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
   
                  <span className={isDark ? 'text-slate-200' : 'text-gray-700'}>{center.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold" style={{ color: isDark ? '#f8fafc' : dashboardColors.gray[800] }}>{formatCurrency(center.value)}</span>
                  <span className="font-medium" style={{ color: dashboardColors.green[600] }}>{center.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
         {/* Monthly Trend */}
      <div className={`rounded-xl shadow-lg p-4 md:p-6 ${panelClass}`}>
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5" style={{ color: dashboardColors.green[600] }} />
          <h3 className="text-sm md:text-lg font-semibold" style={{ color: isDark ? '#f1f5f9' : dashboardColors.gray[800] }}>
            <span className="hidden md:inline">แนวโน้มค่าเสียหายรายเดือน</span>
            <span className="md:hidden">แนวโน้ม/เดือน</span>
          </h3>
        </div>
        <div className="h-72 md:h-96 overflow-x-auto">
          {data.monthlyCosts.length > 0 ? (
            <div className="min-w-[400px] md:min-w-0 h-full">
            <ResponsiveBar
              theme={chartTheme as any}
              data={data.monthlyCosts}
              keys={['NC', 'AC']}
              indexBy="month"
              margin={{ top: 30, right: 80, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={[dashboardColors.red[500], dashboardColors.red[400]]}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 40
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -50,
                format: (value) => `${(value / 1000).toFixed(0)}K`
              }}
              enableLabel={false}
              tooltip={({ id, value, indexValue, color }) => (
                <div
                  className={`px-3 py-2 shadow-lg rounded border text-xs ${isDark ? 'bg-slate-900' : 'bg-white'}`}
                  style={{ borderColor: isDark ? '#334155' : dashboardColors.gray[200] }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
                    <span className="font-semibold" style={{ color: isDark ? '#f8fafc' : dashboardColors.gray[800] }}>{indexValue}</span>
                  </div>
                  <div>
                    <span style={{ color: isDark ? '#94a3b8' : dashboardColors.gray[600] }}>{id}: </span>
                    <span className="font-bold" style={{ color: isDark ? '#f8fafc' : dashboardColors.gray[800] }}>{formatCurrency(value)}</span>
                  </div>
                </div>
              )}
              layers={[
                'grid',
                'axes',
                'bars',
                'markers',
                'legends',
                ({ bars }) => (
                  <>
                    {bars.map((bar) => {
                      const monthData = data.monthlyCosts.find(d => d.month === bar.data.indexValue);
                      const total = monthData ? monthData.total : 0;
                      const isLastBar = bar.data.id === 'AC';
                      
                      if (!isLastBar) return null;
                      
                      return (
                        <text
                          key={`${bar.key}-total`}
                          x={bar.x + bar.width / 2}
                          y={bar.y - 8}
                          textAnchor="middle"
                          style={{
                            fill: isDark ? '#e2e8f0' : '#374151',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {(total / 1000).toFixed(0)}K
                        </text>
                      );
                    })}
                  </>
                )
              ]}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 70,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 60,
                  itemHeight: 18,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 14,
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              role="application"
              ariaLabel="Monthly cost trend"
            />
            </div>
          ) : (
            <div className={`flex items-center justify-center h-full text-sm ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
              ไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>

 
      </div>

     

      {/* Table */}
      
    </div>
  );
};
