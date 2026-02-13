import { Card, CardContent, CardHeader, Typography, Box, Chip } from '@mui/material';
import Chart from 'react-apexcharts';

const STATUS_COLORS = {
  PENDING: '#FFA726',
  APPROVED: '#66BB6A',
  REJECTED: '#EF5350',
  CANCELLED: '#9E9E9E'
};

const STATUS_LABELS = {
  PENDING: 'قيد المراجعة',
  APPROVED: 'موافق عليه',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغي'
};

/**
 * Status distribution pie chart
 */
const StatusPieChart = ({ data, loading }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="توزيع الحالات" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            جاري التحميل...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Transform data for pie chart
  const series = [];
  const labels = [];
  const colors = [];

  Object.entries(data).forEach(([status, count]) => {
    series.push(count);
    labels.push(STATUS_LABELS[status] || status);
    colors.push(STATUS_COLORS[status] || '#757575');
  });

  const total = series.reduce((a, b) => a + b, 0);

  const chartOptions = {
    chart: {
      type: 'pie',
    },
    labels: labels,
    colors: colors,
    legend: {
      position: 'bottom',
      fontFamily: 'Tajawal, sans-serif'
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(0) + "%";
      },
      style: {
        fontFamily: 'Tajawal, sans-serif'
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " طلب" // "request"
        }
      },
      style: {
        fontFamily: 'Tajawal, sans-serif'
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  return (
    <Card>
      <CardHeader title="توزيع الحالات" subheader={`إجمالي: ${total.toLocaleString('ar-SA')}`} />
      <CardContent>
        <Box sx={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Chart options={chartOptions} series={series} type="pie" width="100%" height={300} />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatusPieChart;
