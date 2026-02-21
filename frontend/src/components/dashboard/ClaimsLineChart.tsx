import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, Box, Skeleton, useTheme } from '@mui/material';
import ReactApexChart from 'react-apexcharts';
import { useColorScheme } from '@mui/material/styles';
import { ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { getAppLocale } from 'utils/locale-helper';

/**
 * Line Chart: تطور المطالبات شهريًا
 * Using ApexCharts
 */
const ClaimsLineChart = ({ data, loading }) => {
  const theme = useTheme();
  const { colorScheme } = useColorScheme();
  const {
    state: { fontFamily }
  } = useConfig();

  const [options, setOptions] = useState({
    chart: {
      id: 'claims-trend',
      toolbar: { show: true },
      fontFamily: fontFamily,
      background: 'transparent'
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 3
    },
    xaxis: {
      categories: [],
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontFamily: fontFamily,
          fontSize: theme.typography.caption.fontSize // Scalable unit
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: theme.palette.text.secondary,
          fontFamily: fontFamily,
          fontSize: theme.typography.caption.fontSize // Scalable unit
        },
        formatter: (val) => val.toLocaleString(getAppLocale())
      }
    },
    colors: [theme.palette.primary.main],
    tooltip: {
      theme: colorScheme === ThemeMode.DARK ? 'dark' : 'light',
      y: {
        formatter: (val) => val.toLocaleString('ar-SA-u-nu-latn')
      }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontFamily: fontFamily,
      fontSize: theme.typography.body2.fontSize // Scalable unit
    }
  });

  const [series, setSeries] = useState([
    {
      name: 'المطالبات',
      data: []
    }
  ]);

  useEffect(() => {
    if (data && data.length > 0) {
      // Transform data for chart
      const categories = data.map((item) => {
        const date = new Date(item.date || item.month);
        return date.toLocaleDateString(getAppLocale(), { month: 'short', year: 'numeric' });
      });
      const values = data.map((item) => item.count || item.value || 0);

      setOptions((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          categories
        }
      }));

      setSeries([
        {
          name: 'المطالبات',
          data: values
        }
      ]);
    }
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader title="تطور المطالبات شهريًا" />
        <CardContent>
          <Skeleton variant="rectangular" height={350} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="تطور المطالبات شهريًا" subheader="آخر 12 شهر" />
      <CardContent>
        <Box sx={{ direction: 'rtl' }}>
          <ReactApexChart options={options} series={series} type="line" height={350} />
        </Box>
      </CardContent>
    </Card>
  );
};

ClaimsLineChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      month: PropTypes.string,
      count: PropTypes.number,
      value: PropTypes.number
    })
  ),
  loading: PropTypes.bool
};

export default ClaimsLineChart;

