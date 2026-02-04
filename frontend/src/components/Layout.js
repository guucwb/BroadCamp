import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Container,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Send as SendIcon,
  Dashboard as DashboardIcon,
  Description as TemplateIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useColorMode } from '../theme/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 260;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu items dinâmicos baseados no role do usuário
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Disparo', icon: <SendIcon />, path: '/disparo' },
    { text: 'Templates', icon: <TemplateIcon />, path: '/template' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Configurações', icon: <SettingsIcon />, path: '/settings' },
    ...(user?.role === 'admin' ? [{ text: 'Usuários', icon: <PeopleIcon />, path: '/users' }] : []),
  ];

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#101C2C', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SendIcon sx={{ color: '#0263E0', fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700} color="white">
            BroadCamp
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {/* Navigation */}
      <List sx={{ px: 2, py: 2, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 1.5,
                  bgcolor: isActive ? 'rgba(2, 99, 224, 0.15)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(2, 99, 224, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                  },
                  '& .MuiListItemIcon-root': {
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    minWidth: 40,
                  },
                  transition: 'all 0.2s',
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.95rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* User Info */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1.5, py: 1, mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#0263E0', fontSize: '0.9rem' }}>
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} color="white" noWrap>
              {user?.name || 'Usuário'}
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>

        {/* Dark Mode Toggle */}
        <ListItemButton
          onClick={toggleColorMode}
          sx={{
            borderRadius: 1.5,
            py: 1.5,
            color: 'rgba(255,255,255,0.7)',
            mb: 0.5,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'white',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 40 }}>
            {theme.palette.mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText
            primary={theme.palette.mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            primaryTypographyProps={{
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          />
        </ListItemButton>

        {/* Logout Button */}
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1.5,
            py: 1.5,
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Sair"
            primaryTypographyProps={{
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile AppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { sm: 'none' },
          bgcolor: '#101C2C',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SendIcon sx={{ color: '#0263E0' }} />
            <Typography variant="h6" fontWeight={700}>
              BroadCamp
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: theme.palette.mode === 'light' ? '#ffffff' : 'background.default',
        }}
      >
        {/* Mobile toolbar spacer */}
        <Toolbar sx={{ display: { sm: 'none' } }} />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
