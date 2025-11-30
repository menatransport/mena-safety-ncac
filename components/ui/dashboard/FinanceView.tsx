import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { DollarSign, TrendingUp, AlertTriangle, Building2 } from 'lucide-react';
import { dashboardColors } from './ColorPalette';

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl shadow-lg p-6 text-white" style={{ background: `linear-gradient(to bottom right, ${dashboardColors.green[500]}, ${dashboardColors.green[600]})` }}>
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <div className="text-right">
              <p className="text-xs opacity-90">ค่าเสียหายจริงทั้งหมด</p>
              <p className="text-2xl font-bold">{formatCurrency(data.totalActualCost)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className=" grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - ค่าเสียหายตามศูนย์ปฏิบัติการ */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5" style={{ color: dashboardColors.green[600] }} />
            <h3 className="text-lg font-semibold" style={{ color: dashboardColors.gray[800] }}>ค่าเสียหายจริงตามศูนย์ปฏิบัติการ</h3>
          </div>
          <div className="h-80">
            {data.centerCosts.length > 0 ? (
              <ResponsivePie
                data={data.centerCosts}
                margin={{ top: 20, right: 120, bottom: 20, left: 20 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                valueFormat={(value) => `${formatCurrency(value)}`}
                legends={[
                  {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 100,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: '#999',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: 'circle',
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
          {/* Percentage Table */}
          <div className="hidden mt-4 space-y-2">
            {data.centerCosts.map((center) => (
              <div key={center.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
   
                  <span className="text-gray-700">{center.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold" style={{ color: dashboardColors.gray[800] }}>{formatCurrency(center.value)}</span>
                  <span className="font-medium" style={{ color: dashboardColors.green[600] }}>{center.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
         {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: dashboardColors.green[600] }} />
          <h3 className="text-lg font-semibold" style={{ color: dashboardColors.gray[800] }}>แนวโน้มค่าเสียหายรายเดือน</h3>
        </div>
        <div className="h-96">
          {data.monthlyCosts.length > 0 ? (
            <ResponsiveBar
              data={data.monthlyCosts}
              keys={['NC', 'AC']}
              indexBy="month"
              margin={{ top: 50, right: 130, bottom: 50, left: 80 }}
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
                legend: 'เดือน',
                legendPosition: 'middle',
                legendOffset: 40
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'จำนวนเงิน (บาท)',
                legendPosition: 'middle',
                legendOffset: -60,
                format: (value) => `${(value / 1000).toFixed(0)}K`
              }}
              enableLabel={false}
              tooltip={({ id, value, indexValue, color }) => (
                <div className="bg-white px-3 py-2 shadow-lg rounded border" style={{ borderColor: dashboardColors.gray[200] }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                    <span className="font-semibold" style={{ color: dashboardColors.gray[800] }}>{indexValue}</span>
                  </div>
                  <div className="text-sm">
                    <span style={{ color: dashboardColors.gray[600] }}>{id}: </span>
                    <span className="font-bold" style={{ color: dashboardColors.gray[800] }}>{formatCurrency(value)}</span>
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
                            fill: '#374151',
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
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
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
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
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
