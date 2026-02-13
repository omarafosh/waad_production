import { Card, CardContent, CardHeader, Box, Typography } from '@mui/material';
import Chart from 'react-apexcharts';

/**
 * Trend chart for PreAuth submissions over time
 */
const TrendChart = ({ data, loading, days = 30 }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title={`الاتجاهات (آخر ${days} يوم)`} />
        <CardContent>
          <Box sx={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">جاري التحميل...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const categories = data.map((item) =>
    new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  );
  const seriesData = data.map((item) => item.count || 0);

  const chartSeries = [{
    name: "عدد الطلبات",
    data: seriesData
  }];

  const chartOptions = {
    chart: {
      height: 350,
      type: 'line',
      zoom: {
        enabled: false
      },
      fontFamily: 'Tajawal, sans-serif'
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    colors: ['#1976d2'],
    grid: {
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        style: {
          fontFamily: 'Tajawal, sans-serif'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontFamily: 'Tajawal, sans-serif'
        },
        formatter: (value) => value.toFixed(0)
      }
    },
    tooltip: {
      style: {
        fontFamily: 'Tajawal, sans-serif'
      }
    }
  };

  return (
    <Card>
      <CardHeader title={`اتجاهات الطلبات (آخر ${days} يوم)`} />
      <CardContent>
        <Box sx={{ height: 350 }}>
          <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrendChart;
