import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
  Chip,
  Alert,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import { TrendingUp, TrendingDown, CheckCircle, Cancel, Pending, Warning, Schedule, Visibility, Edit, Delete } from '@mui/icons-material';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';

dayjs.extend(relativeTime);
dayjs.locale('ar');

// ===========================|| STATS CARD ||============================ //

export const StatsCard = ({ title, value, change, icon: Icon, color = 'primary', prefix = '', suffix = '' }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {prefix}
                {value?.toLocaleString('ar-SA') || 0}
                {suffix}
              </Typography>
            </Box>
            {Icon && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: `${color}.lighter`,
                  color: `${color}.main`
                }}
              >
                <Icon />
              </Box>
            )}
          </Box>

          {change !== undefined && change !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isPositive && <TrendingUp fontSize="small" color="success" />}
              {isNegative && <TrendingDown fontSize="small" color="error" />}
              <Typography
                variant="body2"
                color={isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.secondary'}
                fontWeight="medium"
              >
                {isPositive && '+'}
                {change}% من الشهر الماضي
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number,
  change: PropTypes.number,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  prefix: PropTypes.string,
  suffix: PropTypes.string
};

// ============================|| STATUS DISTRIBUTION PIE CHART ||============================ //

export const StatusDistributionChart = ({ data, loading }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="توزيع الحالات" />
        <CardContent>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <LinearProgress /> : <Typography color="text.secondary">لا توجد بيانات</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ApexCharts Options
  const theme = useTheme();
  const chartOptions = {
    chart: {
      type: 'pie',
      fontFamily: theme.typography.fontFamily
    },
    labels: data.map(item => statusLabels[item.status] || item.status),
    colors: data.map(item => statusColors[item.status] || '#757575'),
    legend: {
      position: 'bottom',
      fontFamily: theme.typography.fontFamily
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(1) + "%"
      }
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " طلب"
        }
      }
    }
  };

  const chartSeries = data.map(item => item.count || 0);

  return (
    <Card>
      <CardHeader title="توزيع الحالات" />
      <CardContent>
        <Box sx={{ height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="pie"
            height={300}
            width="100%"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

StatusDistributionChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired
    })
  ),
  loading: PropTypes.bool
};

// ============================|| HIGH PRIORITY QUEUE ||============================ //

export const HighPriorityQueue = ({ data, loading, onView, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader
        title="الطلبات العاجلة"
        subheader="الطلبات ذات الأولوية العالية (طارئ / عاجل)"
        action={<Chip label={`${data?.length || 0} طلب`} color="warning" size="small" />}
      />
      <CardContent>
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>الرقم المرجعي</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>المريض</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>الأولوية</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>المبلغ</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>تاريخ التقديم</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                    <LinearProgress />
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                    <Typography color="text.secondary">لا توجد طلبات عاجلة</Typography>
                  </td>
                </tr>
              ) : (
                data.slice(0, 5).map((row) => {
                  const priorityColor = row.priority === 'EMERGENCY' ? 'error' : 'warning';
                  const priorityLabel = row.priority === 'EMERGENCY' ? 'طارئ' : 'عاجل';

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2">{row.referenceNumber || '—'}</Typography>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2">{row.memberName || '—'}</Typography>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <Chip label={priorityLabel} color={priorityColor} size="small" />
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2">
                          {row.requestedAmount?.toLocaleString('ar-SA')} ر.س
                        </Typography>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2">
                          {dayjs(row.submittedDate).format('YYYY/MM/DD')}
                        </Typography>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="عرض">
                            <IconButton size="small" onClick={() => onView?.(row)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => onEdit?.(row)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error" onClick={() => onDelete?.(row)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Box>
      </CardContent>
    </Card>
  );
};

HighPriorityQueue.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  onView: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func
};

// ============================|| EXPIRING SOON ALERTS ||============================ //

export const ExpiringSoonAlerts = ({ data, loading, withinDays = 7 }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="تنبيهات الانتهاء" subheader={`الطلبات التي ستنتهي خلال ${withinDays} أيام`} />
        <CardContent>
          <Alert severity="info">لا توجد طلبات تنتهي قريباً</Alert>
        </CardContent>
      </Card>
    );
  }

  const calculateDaysLeft = (expiryDate) => {
    return Math.max(0, dayjs(expiryDate).diff(dayjs(), 'day'));
  };

  return (
    <Card>
      <CardHeader
        title="تنبيهات الانتهاء"
        subheader={`الطلبات التي ستنتهي خلال ${withinDays} أيام`}
        action={<Chip icon={<Warning />} label={`${data.length} تنبيه`} color="warning" size="small" />}
      />
      <CardContent>
        <Stack spacing={2}>
          {data.slice(0, 10).map((item) => {
            const daysLeft = calculateDaysLeft(item.expiryDate);
            const isUrgent = daysLeft <= 2;

            return (
              <Box
                key={item.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: isUrgent ? 'error.lighter' : 'warning.lighter',
                  border: 1,
                  borderColor: isUrgent ? 'error.light' : 'warning.light'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {item.referenceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.memberName}
                    </Typography>
                  </Box>
                  <Stack alignItems="center" spacing={0.5}>
                    <Chip icon={<Schedule />} label={`${daysLeft} يوم`} color={isUrgent ? 'error' : 'warning'} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      ينته يوم {dayjs(item.expiryDate).format('YYYY/MM/DD')}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

ExpiringSoonAlerts.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      referenceNumber: PropTypes.string,
      memberName: PropTypes.string,
      expiryDate: PropTypes.string
    })
  ),
  loading: PropTypes.bool,
  withinDays: PropTypes.number
};

// ============================|| TRENDS LINE CHART ||============================ //

export const TrendsChart = ({ data, loading, days = 30 }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title={`اتجاهات الطلبات (آخر ${days} يوم)`} />
        <CardContent>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <LinearProgress /> : <Typography color="text.secondary">لا توجد بيانات</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const theme = useTheme();
  const xLabels = data.map((item) => dayjs(item.date).format('MM/DD'));
  const requestedData = data.map((item) => item.requestedCount || 0);
  const approvedData = data.map((item) => item.approvedCount || 0);

  const chartOptions = {
    chart: {
      type: 'line',
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false }
    },
    xaxis: {
      categories: xLabels
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    colors: ['#2196f3', '#4caf50'],
    legend: {
      position: 'top'
    },
    grid: {
      borderColor: '#f1f1f1'
    }
  };

  const chartSeries = [
    { name: 'المطلوبة', data: requestedData },
    { name: 'المعتمدة', data: approvedData }
  ];

  return (
    <Card>
      <CardHeader title={`اتجاهات الطلبات (آخر ${days} يوم)`} />
      <CardContent>
        <Box sx={{ height: 320 }}>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="line"
            height={300}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

TrendsChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      requestedCount: PropTypes.number,
      approvedCount: PropTypes.number
    })
  ),
  loading: PropTypes.bool,
  days: PropTypes.number
};

// ============================|| TOP PROVIDERS BAR CHART ||============================ //

export const TopProvidersChart = ({ data, loading, limit = 10 }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title={`أكثر ${limit} مقدمي خدمات`} subheader="حسب عدد الطلبات" />
        <CardContent>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <LinearProgress /> : <Typography color="text.secondary">لا توجد بيانات</Typography>}
          </Box>
        </CardContent>
      </Card>
    );
  }

  const theme = useTheme();
  const xLabels = data.map((item) => item.providerName || 'غير محدد');
  const requestsData = data.map((item) => item.totalRequests || 0);
  const approvalRateData = data.map((item) => item.approvalRate || 0);

  const chartOptions = {
    chart: {
      type: 'bar',
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: xLabels,
      labels: {
        rotate: -45,
        style: {
          fontSize: '10px'
        }
      }
    },
    colors: ['#2196f3', '#4caf50'],
    legend: {
      position: 'top',
      horizontalAlign: 'right'
    }
  };

  const chartSeries = [
    { name: 'عدد الطلبات', data: requestsData },
    { name: 'نسبة الموافقة %', data: approvalRateData }
  ];

  return (
    <Card>
      <CardHeader title={`أكثر ${limit} مقدمي خدمات`} subheader="حسب عدد الطلبات ونسبة الموافقة" />
      <CardContent>
        <Box sx={{ height: 350 }}>
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={350}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

TopProvidersChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      providerName: PropTypes.string,
      totalRequests: PropTypes.number,
      approvalRate: PropTypes.number
    })
  ),
  loading: PropTypes.bool,
  limit: PropTypes.number
};

// ============================|| RECENT ACTIVITY TIMELINE ||============================ //

export const RecentActivityTimeline = ({ data, loading, limit = 10 }) => {
  if (loading || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader title="النشاط الأخير" subheader={`آخر ${limit} إجراءات`} />
        <CardContent>
          <Alert severity="info">لا يوجد نشاط حديث</Alert>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action) => {
    const icons = {
      CREATE: <Pending />,
      UPDATE: <Edit />,
      APPROVE: <CheckCircle />,
      REJECT: <Cancel />,
      CANCEL: <Cancel />,
      DELETE: <Delete />
    };
    return icons[action] || <Pending />;
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'info',
      UPDATE: 'warning',
      APPROVE: 'success',
      REJECT: 'error',
      CANCEL: 'secondary',
      DELETE: 'error'
    };
    return colors[action] || 'default';
  };

  const getActionLabel = (action) => {
    const labels = {
      CREATE: 'إنشاء',
      UPDATE: 'تحديث',
      APPROVE: 'موافقة',
      REJECT: 'رفض',
      CANCEL: 'إلغاء',
      DELETE: 'حذف'
    };
    return labels[action] || action;
  };

  return (
    <Card>
      <CardHeader title="النشاط الأخير" subheader={`آخر ${limit} إجراءات`} />
      <CardContent>
        <Stack spacing={2}>
          {data.map((activity, index) => (
            <Box
              key={activity.id || index}
              sx={{
                display: 'flex',
                gap: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'background.default',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Avatar
                sx={{
                  bgcolor: `${getActionColor(activity.action)}.lighter`,
                  color: `${getActionColor(activity.action)}.main`
                }}
              >
                {getActionIcon(activity.action)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2">{activity.referenceNumber}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {getActionLabel(activity.action)} بواسطة {activity.changedBy}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(activity.changeDate).fromNow()}
                </Typography>
              </Box>
              <Chip label={getActionLabel(activity.action)} color={getActionColor(activity.action)} size="small" />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

RecentActivityTimeline.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      referenceNumber: PropTypes.string,
      action: PropTypes.string,
      changedBy: PropTypes.string,
      changeDate: PropTypes.string
    })
  ),
  loading: PropTypes.bool,
  limit: PropTypes.number
};
