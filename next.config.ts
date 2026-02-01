import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slot',
      '@nivo/bar',
      '@nivo/bump',
      '@nivo/calendar',
      '@nivo/core',
      '@nivo/line',
      '@nivo/pie',
      'date-fns',
      'recharts',
    ],
  },
}
 
export default nextConfig