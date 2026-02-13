import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import useConfig from 'hooks/useConfig';

// ==============================|| CUSTOMIZATION - FONT FAMILY ||============================== //

export default function ThemeFont() {
  const { state, setField } = useConfig();

  const handleFontChange = (event) => {
    setField('fontFamily', event.target.value);
  };

  const handleFontSizeChange = (event) => {
    setField('fontSize', Number(event.target.value));
  };

  const fonts = [
    {
      id: 'inter',
      value: `'Inter', sans-serif`,
      label: 'Inter'
    },
    {
      id: 'roboto',
      value: `'Roboto', sans-serif`,
      label: 'Roboto'
    },
    {
      id: 'poppins',
      value: `'Poppins', sans-serif`,
      label: 'Poppins'
    },
    {
      id: 'public-sans',
      value: `'Public Sans', sans-serif`,
      label: 'Public Sans'
    }
  ];

  const fontSizes = [
    {
      id: 'small',
      value: 12,
      label: 'صغير (12px)'
    },
    {
      id: 'medium',
      value: 14,
      label: 'متوسط (14px)'
    },
    {
      id: 'large',
      value: 16,
      label: 'كبير (16px)'
    },
    {
      id: 'extra',
      value: 18,
      label: 'ضخم (18px)'
    }
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>نوع الخط</Typography>
        <RadioGroup row aria-label="theme-font" name="theme-font" value={state.fontFamily} onChange={handleFontChange}>
          <Grid container rowSpacing={2} columnSpacing={2.5}>
            {fonts.map((item, index) => (
              <Grid key={index} item>
                <FormControlLabel
                  control={<Radio value={item.value} sx={{ display: 'none' }} />}
                  label={
                    <MainCard
                      content={false}
                      border={false}
                      boxShadow
                      sx={(theme) => ({
                        bgcolor: 'secondary.lighter',
                        p: 1,
                        cursor: 'pointer',
                        ...(state.fontFamily === item.value && {
                          bgcolor: 'primary.lighter',
                          boxShadow: theme.vars.customShadows.primary,
                          '&:hover': { boxShadow: theme.vars.customShadows.primary }
                        })
                      })}
                    >
                      <Box sx={{ minWidth: 60, bgcolor: 'background.paper', p: 1, '&:hover': { bgcolor: 'background.paper' } }}>
                        <Stack sx={{ gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="h5" color="text.primary" sx={{ fontFamily: item.value }}>
                            Aa
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                        </Stack>
                      </Box>
                    </MainCard>
                  }
                  sx={{ m: 0 }}
                />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>حجم  نصوص و عناصر النظام</Typography>
        <RadioGroup row aria-label="theme-font-size" name="theme-font-size" value={state.fontSize || 12} onChange={handleFontSizeChange}>
          <Grid container rowSpacing={2} columnSpacing={2.5}>
            {fontSizes.map((item, index) => (
              <Grid key={index} item>
                <FormControlLabel
                  control={<Radio value={item.value} sx={{ display: 'none' }} />}
                  label={
                    <MainCard
                      content={false}
                      border={false}
                      boxShadow
                      sx={(theme) => ({
                        bgcolor: 'secondary.lighter',
                        p: 1,
                        cursor: 'pointer',
                         minWidth: 80,
                        ...( (state.fontSize || 12) === item.value && {
                          bgcolor: 'primary.lighter',
                          boxShadow: theme.vars.customShadows.primary,
                          '&:hover': { boxShadow: theme.vars.customShadows.primary }
                        })
                      })}
                    >
                      <Box sx={{ bgcolor: 'background.paper', p: 1, '&:hover': { bgcolor: 'background.paper' }, textAlign: 'center' }}>
                        <Stack sx={{ gap: 0.5, alignItems: 'center' }}>
                          <Typography variant="body1" color="text.primary" sx={{ fontSize: item.value }}>
                            Aa
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.label}
                          </Typography>
                        </Stack>
                      </Box>
                    </MainCard>
                  }
                  sx={{ m: 0 }}
                />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </Box>
    </Stack>
  );
}
