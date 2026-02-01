import { Activity, AlertTriangle, BarChart3, Calendar, FileText, Flame, PieChart, Siren, TrendingUp } from 'lucide-react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveBar } from '@nivo/bar';
import { dashboardColors } from './ColorPalette';
import { useEffect } from 'react';

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
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      <div className="rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 text-white transform bg-gray-600 border-2 md:border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl">
            <FileText className="w-4 h-4 md:w-6 md:h-6" />
          </div>
          <Activity className="w-5 h-5 md:w-8 md:h-8 opacity-50" />
        </div>
        <h3 className="text-xs md:text-sm font-medium opacity-90 mb-0.5 md:mb-1">จำนวนเคสทั้งหมด</h3>
        <p className="text-2xl md:text-4xl font-bold">{data.summaryStats.totalCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/20">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span>NC: {data.summaryStats.ncTotal}</span>
              <span>AC: {data.summaryStats.acTotal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Minor Cases Card */}
      <div className="rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 text-white transform bg-[#e4930a] border-2 md:border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl">
            <Flame className="w-4 h-4 md:w-6 md:h-6" />
          </div>
          <TrendingUp className="w-5 h-5 md:w-8 md:h-8 opacity-50" />
        </div>
        <h3 className="text-xs md:text-sm font-medium opacity-90 mb-0.5 md:mb-1">Minor</h3>
        <p className="text-2xl md:text-4xl font-bold">{data.summaryStats.minorCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/20">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span>NC: {data.summaryStats.ncMinor}</span>
              <span>AC: {data.summaryStats.acMinor}</span>
            </div>
          </div>
        )}
      </div>

      {/* Major Cases Card */}
      <div className="rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 text-white transform bg-[#df3f3f] border-2 md:border-4 border-white hover:scale-105 transition-transform" style={{ background: `linear-gradient(to bottom right, ${dashboardColors.red[600]}, ${dashboardColors.red[700]})` }}>
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center gap-0.5 md:gap-2">
            <Flame className="w-3 h-3 md:w-6 md:h-6" /><Flame className="w-3 h-3 md:w-6 md:h-6" />
          </div>
          <TrendingUp className="w-5 h-5 md:w-8 md:h-8 opacity-50" />
        </div>
        <h3 className="text-xs md:text-sm font-medium opacity-90 mb-0.5 md:mb-1">Major</h3>
        <p className="text-2xl md:text-4xl font-bold">{data.summaryStats.majorCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/20">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span>NC: {data.summaryStats.ncMajor}</span>
              <span>AC: {data.summaryStats.acMajor}</span>
            </div>
          </div>
        )}
      </div>

      {/* Crisis Cases Card */}
      <div className="rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 text-white transform bg-[#8156e5] border-2 md:border-4 border-white hover:scale-105 transition-transform">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg md:rounded-xl flex items-center justify-center gap-0.5 md:gap-2">
            <Flame className="w-2.5 h-2.5 md:w-6 md:h-6" /><Flame className="w-2.5 h-2.5 md:w-6 md:h-6" /><Flame className="w-2.5 h-2.5 md:w-6 md:h-6" />
          </div>
          <TrendingUp className="w-5 h-5 md:w-8 md:h-8 opacity-50" />
        </div>
        <h3 className="text-xs md:text-sm font-medium opacity-90 mb-0.5 md:mb-1">Crisis</h3>
        <p className="text-2xl md:text-4xl font-bold">{data.summaryStats.crisisCount}</p>
        {selectedCaseType === 'all' && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-white/20">
            <div className="flex justify-between text-[10px] md:text-xs">
              <span>NC: {data.summaryStats.ncCrisis}</span>
              <span>AC: {data.summaryStats.acCrisis}</span>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* CALENDAR CHART */}
     <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-3 md:p-6 border border-gray-100">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <Calendar className="w-4 h-4 md:w-6 md:h-6" style={{ color: dashboardColors.green[600] }} />
          <h2 className="text-base md:text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>ปฏิทินเหตุการณ์</h2>
        </div>
        <div className="h-[200px] md:h-[250px] overflow-x-auto">
        {data.calendarData.length > 0 ? (
          <div className="min-w-[600px] md:min-w-[800px] h-full">
            <ResponsiveCalendar
              data={data.calendarData}
              from={selectedMonth === 'all' ? `${selectedYear}-01-01` : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
              to={selectedMonth === 'all' ? `${selectedYear}-12-31` : new Date(selectedYear, parseInt(selectedMonth), 0).toISOString().split('T')[0]}
              emptyColor={dashboardColors.gray[100]}
              colors={[dashboardColors.green[200], dashboardColors.green[500], dashboardColors.green[900]]}
              margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
              yearSpacing={40}
              monthSpacing={8}
              monthBorderColor="#ffffff"
              dayBorderWidth={2}
              dayBorderColor="#ffffff"
              direction="horizontal"
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'row',
                  translateY: 20,
                  itemCount: 3,
                  itemWidth: 36,
                  itemHeight: 28,
                  itemsSpacing: 8,
                  itemDirection: 'right-to-left'
                }
              ]}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            ไม่มีข้อมูล
          </div>
        )}
        </div>
    </div>

    {/* PIE CHART */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

      {/* NC Pie Chart */}
      {(selectedCaseType === 'all' || selectedCaseType === 'nc') && (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <PieChart className="w-5 h-5 md:w-6 md:h-6" style={{ color: dashboardColors.green[600] }} />
            <h2 className="text-base md:text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>สัดส่วนความรุนแรง NC</h2>
          </div>
          <div className="h-[280px] md:h-[400px]">
            {data.ncPieData.length > 0 ? (
              <ResponsivePie
                data={data.ncPieData}
                margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={15}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={1}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={15}
                arcLabel={(d) => `${d.value}`}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                colors={{ datum: 'data.color' }}
                enableArcLinkLabels={false}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 50,
                    itemsSpacing: 4,
                    itemWidth: 80,
                    itemHeight: 18,
                    itemTextColor: '#666',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 14,
                    symbolShape: 'circle'
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                ไม่มีข้อมูล NC
              </div>
            )}
          </div>
        </div>
      )}

      {/* AC Pie Chart */}
      {(selectedCaseType === 'all' || selectedCaseType === 'ac') && (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <PieChart className="w-5 h-5 md:w-6 md:h-6" style={{ color: dashboardColors.green[600] }} />
            <h2 className="text-base md:text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>สัดส่วนความรุนแรง AC</h2>
          </div>
          <div className="h-[280px] md:h-[400px]">
            {data.acPieData.length > 0 ? (
              <ResponsivePie
                data={data.acPieData}
                margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={15}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={1}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={15}
                arcLabel={(d) => `${d.value}`}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                colors={{ datum: 'data.color' }}
                enableArcLinkLabels={false}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 50,
                    itemsSpacing: 4,
                    itemWidth: 80,
                    itemHeight: 18,
                    itemTextColor: '#666',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 14,
                    symbolShape: 'circle'
                  }
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                ไม่มีข้อมูล AC
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* STACKED เคสรายเดือน (Major/Minor/Crisis) */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6" style={{ color: dashboardColors.green[600] }} />
              <h2 className="text-sm md:text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>
                <span className="hidden md:inline">จำนวนเหตุการณ์รายเดือน</span>
                <span className="md:hidden">เหตุการณ์/เดือน</span>
                {selectedCaseType === 'nc' && ' - NC'}
                {selectedCaseType === 'ac' && ' - AC'}
              </h2>
            </div>
            <div className="h-[280px] md:h-[400px] overflow-x-auto">
              {data.stackedBarData.length > 0 ? (
                <div className="min-w-[400px] md:min-w-0 h-full">
                <ResponsiveBar
                  data={data.stackedBarData as any[]}
                  keys={['Minor', 'Major', 'Crisis']}
                  indexBy="date"
                  margin={{ top: 30, right: 80, bottom: 50, left: 50 }}
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
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: -35,
                    tickValues: 5
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: 40
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
                      translateX: 70,
                      translateY: 0,
                      itemsSpacing: 2,
                      itemWidth: 60,
                      itemHeight: 18,
                      itemDirection: 'left-to-right',
                      itemOpacity: 0.85,
                      symbolSize: 14
                    }
                  ]}
                  role="application"
                  ariaLabel="Stacked bar chart"
                />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  ไม่มีข้อมูล
                </div>
              )}
            </div>
    </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
    {/* TOP CAUSES  */}  
       {(selectedCaseType === 'all' || selectedCaseType === 'nc') && ( <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" style={{ color: dashboardColors.red[600] }} />
        <h2 className="text-base md:text-xl font-bold" style={{ color: dashboardColors.gray[800] }}>
          <span className="hidden md:inline">สาเหตุที่เกิดขึ้นบ่อยที่สุด NC (Top 5)</span>
          <span className="md:hidden">สาเหตุ Top 5</span>
          {selectedCaseType === 'nc' && ' - NC'}
        </h2>
      </div>
      <div className="space-y-3 md:space-y-4">
        {data.topCauses.length > 0 ? (
          data.topCauses.map((cause, index) => (
            <div key={index} className="flex items-center gap-3 md:gap-4">
              <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm md:text-base" style={{
                background: index === 0 ? `linear-gradient(to bottom right, ${dashboardColors.red[600]}, ${dashboardColors.red[700]})` :
                index === 1 ? `linear-gradient(to bottom right, ${dashboardColors.red[500]}, ${dashboardColors.red[600]})` :
                index === 2 ? `linear-gradient(to bottom right, ${dashboardColors.red[400]}, ${dashboardColors.red[500]})` :
                `linear-gradient(to bottom right, ${dashboardColors.gray[400]}, ${dashboardColors.gray[500]})`
              }}>
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 md:mb-2 gap-2">
                  <span className="font-semibold text-gray-800 text-sm md:text-base truncate">{cause.cause}</span>
                  <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">
                    {cause.count} <span className="hidden sm:inline">เหตุการณ์</span> ({cause.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full rounded-full h-2 md:h-3 overflow-hidden" style={{ backgroundColor: dashboardColors.gray[200] }}>
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
          <div className="text-center text-gray-400 py-6 md:py-8 text-sm">
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
