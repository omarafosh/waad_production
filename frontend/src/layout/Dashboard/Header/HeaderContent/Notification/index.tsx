import { useState, useRef, useEffect } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

// third-party
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// project imports
import NotificationContent from './NotificationContent';
import IconButton from 'components/@extended/IconButton';
import { notificationService } from 'services/api/notifications.service';

// assets
import BellOutlined from '@ant-design/icons/BellOutlined';

// ==============================|| HEADER CONTENT - NOTIFICATION ||============================== //

export default function NotificationMenu() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const anchorRef = useRef(null);

  // Fetch unread count (polls every 30 seconds)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await notificationService.getUnreadCount();
      return response.data;
    },
    refetchInterval: 30000 // Poll every 30s
  });

  // Fetch notifications list
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list', filter],
    queryFn: async () => {
      const params = {
        page: 0,
        size: 20,
        unreadOnly: filter === 'unread'
      };

      // If mock data is needed for demo, we can fallback here, but for now assuming API works
      const response = await notificationService.getAll(params);
      return response.data?.content || [];
    },
    // Only refetch when opening the drawer or filter changes
    enabled: open
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleMarkAsRead = (id) => {
    markAsReadMutation.mutate(id);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleFilterChange = (value) => {
    setFilter(value);
  };

  const iconBackColorOpen = theme.palette.mode === 'dark' ? 'background.default' : 'grey.100';

  return (
    <>
      <Box sx={{ flexShrink: 0, ml: 0.75 }}>
        <Tooltip title="Notifications">
          <IconButton
            color="secondary"
            variant="light"
            sx={{
              color: 'text.primary',
              bgcolor: open ? iconBackColorOpen : 'transparent'
            }}
            aria-label="open notifications"
            ref={anchorRef}
            aria-controls={open ? 'profile-grow' : undefined}
            aria-haspopup="true"
            onClick={handleToggle}
          >
            <Badge badgeContent={unreadCount} color="primary">
              <BellOutlined />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
      <Drawer
        sx={{ zIndex: 2001 }}
        anchor="right"
        onClose={handleToggle}
        open={open}
        PaperProps={{
          sx: {
            width: { xs: 340, sm: 440 }
          }
        }}
      >
        {open && (
          <NotificationContent
            notifications={notificationsData || []}
            filter={filter}
            setFilter={handleFilterChange}
            onMarkAllRead={handleMarkAllRead}
            onMarkAsRead={handleMarkAsRead}
            isLoading={isLoading}
          />
        )}
      </Drawer>
    </>
  );
}
