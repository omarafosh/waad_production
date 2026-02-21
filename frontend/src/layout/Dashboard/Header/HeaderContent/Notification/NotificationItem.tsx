import PropTypes from 'prop-types';

// material-ui
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Avatar from 'components/@extended/Avatar';
import Dot from 'components/@extended/Dot';

// assets
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

// third-party
// third-party
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ==============================|| NOTIFICATION - ITEMS ||============================== //

export default function NotificationItem({ notification, onMarkAsRead }) {
  const { id, title, message, type, read, createdAt } = notification;

  const handleClick = () => {
    if (!read && onMarkAsRead) {
      onMarkAsRead(id);
    }
    // Future: Add navigation logic here
  };

  const getIcon = () => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircleOutlined />;
      case 'WARNING':
        return <WarningOutlined />;
      case 'ERROR':
        return <CloseCircleOutlined />;
      case 'INFO':
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'error';
      case 'INFO':
      default:
        return 'primary';
    }
  };

  return (
    <ListItemButton
      sx={{
        p: { xs: 1.25, sm: 2.25 },
        alignItems: 'flex-start',
        bgcolor: read ? 'transparent' : 'action.hover'
      }}
      divider
      onClick={handleClick}
    >
      <ListItemAvatar>
        <Avatar alt={type} type="combined" color={getColor()}>
          {getIcon()}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography variant="subtitle1">
            <Typography component="span" variant="subtitle1" fontWeight="bold">
              {title}
            </Typography>
          </Typography>
        }
        secondary={
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {createdAt ? dayjs(createdAt).fromNow() : 'Just now'}
            </Typography>
            <Typography variant="body2">{message}</Typography>
          </Stack>
        }
      />
      {!read && (
        <Box sx={{ ml: 2, mt: 1 }}>
          <Dot color="primary" />
        </Box>
      )}
    </ListItemButton>
  );
}

NotificationItem.propTypes = {
  notification: PropTypes.object,
  onMarkAsRead: PropTypes.func
};
