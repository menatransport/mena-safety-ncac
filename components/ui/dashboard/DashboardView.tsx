import { Activity, AlertTriangle, BarChart3, Calendar, FileText, Flame, PieChart, Siren, TrendingUp } from 'lucide-react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveBar } from '@nivo/bar';
import { dashboardColors } from './ColorPalette';

interface CalendarData {
  day: string;
  value: number;
}

interface PieData {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface BarData {
  date: string;
  Major: number;
  Minor: number;
  Crisis: number;
}

interface CauseAnalysis {
  cause: string;
  count: number;
  percentage: number;
}

interface SummaryStats {
  majorCount: number;
  minorCount: number;
  crisisCount: number;
  totalCount: number;
  ncMajor: number;
  ncMinor: number;
  ncCrisis: number;
  acMajor: number;
  acMinor: number;
  acCrisis: number;
  ncTotal: number;
  acTotal: number;
}

interface DashboardData {
  summaryStats: SummaryStats;
  calendarData: CalendarData[];
  ncPieData: PieData[];
  acPieData: PieData[];
  stackedBarData: BarData[];
  topCauses: CauseAnalysis[];
}

interface DashboardViewProps {
  data: DashboardData;
  selectedCaseType: string;
  selectedMonth: string;
  selectedYear: number;
}

export const DashboardView = ({ 
  data, 
  selectedCaseType, 
  selectedMonth, 
  selectedYear 
}: DashboardViewProps) => {

  return (
    <>
    {/* Summary Stats Cards */}
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="rounded-2xl shadow-lg p-6 text-white transform bg-gray-600 border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <Activity className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">จำนวนเคสทั้งหมด</h3>
        <p className="text-4xl font-bold">{data.summaryStats.totalCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex justify-between text-xs">
              <span>NC: {data.summaryStats.ncTotal}</span>
              <span>AC: {data.summaryStats.acTotal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Minor Cases Card */}
      <div className="rounded-2xl shadow-lg p-6 text-white transform bg-[#e4930a] border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Flame className="w-6 h-6" />
          </div>
          <Activity className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">Minor Cases</h3>
        <p className="text-4xl font-bold">{data.summaryStats.minorCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex justify-between text-xs">
              <span>NC: {data.summaryStats.ncMinor}</span>
              <span>AC: {data.summaryStats.acMinor}</span>
            </div>
          </div>
        )}
      </div>

      {/* Major Cases Card */}
      <div className="rounded-2xl shadow-lg p-6 text-white transform bg-[#df3f3f] border-4 border-white hover:scale-105 transition-transform" style={{ background: `linear-gradient(to bottom right, ${dashboardColors.red[600]}, ${dashboardColors.red[700]})` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl flex items-center justify-center gap-2">
            <Flame className="w-6 h-6" /><Flame className="w-6 h-6" />
          </div>
          <TrendingUp className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">Major Cases</h3>
        <p className="text-4xl font-bold">{data.summaryStats.majorCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex justify-between text-xs">
              <span>NC: {data.summaryStats.ncMajor}</span>
              <span>AC: {data.summaryStats.acMajor}</span>
            </div>
          </div>
        )}
      </div>

      {/* Crisis Cases Card */}
      <div className="rounded-2xl shadow-lg p-6 text-white transform bg-[#8156e5] border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl flex items-center justify-center gap-2">
            <Flame className="w-6 h-6" /><Flame className="w-6 h-6" /><Flame className="w-6 h-6" />
          </div>
          <TrendingUp className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-sm font-medium opacity-90 mb-1">Crisis Cases</h3>
        <p className="text-4xl font-bold">{data.summaryStats.crisisCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex justify-between text-xs">
              <span>NC: {data.summaryStats.ncCrisis}</span>
              <span>AC: {data.summaryStats.acCrisis}</span>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* CALENDAR CHART */}
     <div className="h-[500px] md:h-[300px] w-auto overflow-hidden">
        {data.calendarData.length > 0 ? (
          <div className="min-w-[800px] h-full">
            <ResponsiveCalendar
              data={data.calendarData}
              from={selectedMonth === 'all' ? `${selectedYear}-01-01` : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
              to={selectedMonth === 'all' ? `${selectedYear}-12-31` : new Date(selectedYear, parseInt(selectedMonth), 0).toISOString().split('T')[0]}
              emptyColor={dashboardColors.gray[100]}
              colors={[dashboardColors.green[200], dashboardColors.green[500], dashboardColors.green[900]]}
              margin={{ top: 40, right: 20, bottom: 40, left: 20 }}
              yearSpacing={40}
              monthSpacing={10}
              monthBorderColor="#ffffff"
              dayBorderWidth={2}
              dayBorderColor="#ffffff"
              direction="horizontal"
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'row',
                  translateY: 36,
                  itemCount: 4,
                  itemWidth: 42,
                  itemHeight: 36,
                  itemsSpacing: 14,
                  itemDirection: 'right-to-left'
                }
              ]}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            ไม่มีข้อมูล
          </div>
        )}
    </div>

    {/* PIE CHART */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* NC Pie Chart */}
      {(selectedCaseType === 'all' || selectedCaseType === 'nc') && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-6 h-6" style={{ color: dashboardColors.green[600] }} />
            <h2 className="text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>สัดส่วนความรุนแรง NC</h2>
          </div>
          <div className="h-[400px]">
            {data.ncPieData.length > 0 ? (
              <ResponsivePie
                data={data.ncPieData}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
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
                arcLabel={(d) => `${d.value} (${((d.value / data.ncPieData.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)`}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                colors={{ datum: 'data.color' }}
                enableArcLinkLabels={true}
                arcLinkLabel={(d) => `${d.id}`}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: '#999',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: 'circle'
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                ไม่มีข้อมูล NC
              </div>
            )}
          </div>
        </div>
      )}

      {/* AC Pie Chart */}
      {(selectedCaseType === 'all' || selectedCaseType === 'ac') && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-6 h-6" style={{ color: dashboardColors.green[600] }} />
            <h2 className="text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>สัดส่วนความรุนแรง AC</h2>
          </div>
          <div className="h-[400px]">
            {data.acPieData.length > 0 ? (
              <ResponsivePie
                data={data.acPieData}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
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
                arcLabel={(d) => `${d.value} (${((d.value / data.acPieData.reduce((acc, item) => acc + item.value, 0)) * 100).toFixed(1)}%)`}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                colors={{ datum: 'data.color' }}
                enableArcLinkLabels={true}
                arcLinkLabel={(d) => `${d.id}`}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: '#999',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: 'circle'
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                ไม่มีข้อมูล AC
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* STACKED เคสรายเดือน (Major/Minor/Crisis) */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-6 h-6" style={{ color: dashboardColors.green[600] }} />
              <h2 className="text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>
                จำนวนเหตุการณ์รายเดือน (Major/Minor/Crisis)
                {selectedCaseType === 'nc' && ' - NC'}
                {selectedCaseType === 'ac' && ' - AC'}
              </h2>
            </div>
            <div className="h-[400px]">
              {data.stackedBarData.length > 0 ? (
                <ResponsiveBar
                  data={data.stackedBarData as any[]}
                  keys={['Minor', 'Major', 'Crisis']}
                  indexBy="date"
                  margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={['#e4930a', '#df3f3f', '#8156e5']}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'จำนวนเหตุการณ์',
                    legendPosition: 'middle',
                    legendOffset: -40,
                    tickValues: 5
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'เดือน',
                    legendPosition: 'middle',
                    legendOffset: 45
                  }}
               
                  enableLabel={false}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#000000"
                  layers={[
                    'grid',
                    'axes',
                    'bars',
                    ({ bars, yScale, innerWidth }: any) => {
                      // เส้น Target: จำนวนเคสไม่เกิน 5
                      const targetValue = 5;
                      const targetY = yScale(targetValue);
                      
                      return (
                        <g key="target-line-layer">
                          {/* เส้น Target แบบ dashed */}
                          <line
                            x1={0}
                            y1={targetY}
                            x2={innerWidth}
                            y2={targetY}
                            stroke="#ef4444"
                            strokeWidth={2}
                            strokeDasharray="8 4"
                            opacity={0.8}
                          />
                          
                          {/* จุด marker ที่ปลายเส้น */}
                          <circle
                            cx={innerWidth - 10}
                            cy={targetY}
                            r={4}
                            fill="#ef4444"
                          />
                          
                          {/* Label "Target: 5 เคส" */}
                          <g>
                            {/* พื้นหลัง label */}
                            <rect
                              x={innerWidth - 50}
                              y={targetY - 18}
                              width={80}
                              height={22}
                              fill="#ef4444"
                              rx={4}
                              opacity={0.95}
                            />
                            
                            {/* ข้อความ */}
                            <text
                              x={innerWidth - 10}
                              y={targetY - 5}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{
                                fill: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}
                     
                            >
                                {`Target <= 5 เคส`}
                            </text>
                          </g>
                          
                         
                        </g>
                      );
                    },
                    'markers',
                    'legends',
                    'annotations',
                    ({ bars, xScale }: any) => {
                      return bars.map((bar: any) => {
                        if (bar.data.id === 'Crisis') {
                          const total = data.stackedBarData.find(item => item.date === bar.data.indexValue);
                          if (total) {
                            const sum = (total.Minor || 0) + (total.Major || 0) + (total.Crisis || 0);
                            return (
                              <text
                                key={bar.key}
                                x={bar.x + bar.width / 2}
                                y={bar.y - 8}
                                textAnchor="middle"
                                dominantBaseline="auto"
                                style={{
                                  fill: '#000000',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {sum}
                              </text>
                            );
                          }
                        }
                        return null;
                      });
                    }
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
                      symbolSize: 20
                    }
                  ]}
                  role="application"
                  ariaLabel="Stacked bar chart"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  ไม่มีข้อมูล
                </div>
              )}
            </div>
    </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* TOP CAUSES  */}  
       {(selectedCaseType === 'all' || selectedCaseType === 'nc') && ( <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-6 h-6" style={{ color: dashboardColors.red[600] }} />
        <h2 className="text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>
          สาเหตุที่เกิดขึ้นบ่อยที่สุด NC (Top 5)
          {selectedCaseType === 'nc' && ' - NC'}
        </h2>
      </div>
      <div className="space-y-4">
        {data.topCauses.length > 0 ? (
          data.topCauses.map((cause, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{
                background: index === 0 ? `linear-gradient(to bottom right, ${dashboardColors.red[600]}, ${dashboardColors.red[700]})` :
                index === 1 ? `linear-gradient(to bottom right, ${dashboardColors.red[500]}, ${dashboardColors.red[600]})` :
                index === 2 ? `linear-gradient(to bottom right, ${dashboardColors.red[400]}, ${dashboardColors.red[500]})` :
                `linear-gradient(to bottom right, ${dashboardColors.gray[400]}, ${dashboardColors.gray[500]})`
              }}>
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{cause.cause}</span>
                  <span className="text-sm text-gray-600">
                    {cause.count} เหตุการณ์ ({cause.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ backgroundColor: dashboardColors.gray[200] }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cause.percentage}%`,
                      background: index === 0 ? `linear-gradient(to right, ${dashboardColors.red[600]}, ${dashboardColors.red[700]})` :
                      index === 1 ? `linear-gradient(to right, ${dashboardColors.red[500]}, ${dashboardColors.red[600]})` :
                      index === 2 ? `linear-gradient(to right, ${dashboardColors.red[400]}, ${dashboardColors.red[500]})` :
                      `linear-gradient(to right, ${dashboardColors.gray[400]}, ${dashboardColors.gray[500]})`
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">
            ไม่มีข้อมูลสาเหตุ
          </div>
        )}
      </div>
    </div>
    )}

    {/* Bar chart Status */}

  
</div>
    </>
  );
};
