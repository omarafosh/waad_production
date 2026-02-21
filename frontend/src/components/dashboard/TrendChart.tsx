import Chart from 'react-apexcharts';
import { useTheme } from '@mui/material';
import useConfig from 'hooks/useConfig';

/**
 * Trend chart for PreAuth submissions over time
 */
const TrendChart = ({ data, loading, days = 30 }) => {
  const theme = useTheme();
  const { state: { fontFamily } } = useConfig();
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
    new Date(item.date).toLocaleDateString('ar-SA-u-nu-latn', { month: 'short', day: 'numeric' })
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
      fontFamily: fontFamily
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
          fontFamily: fontFamily,
          fontSize: theme.typography.caption.fontSize
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontFamily: fontFamily,
          fontSize: theme.typography.caption.fontSize
        },
        formatter: (value) => value.toFixed(0)
      }
    },
    tooltip: {
      style: {
        fontFamily: fontFamily,
        fontSize: theme.typography.caption.fontSize
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
