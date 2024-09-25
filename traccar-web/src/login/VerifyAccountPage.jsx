import React, { useState } from 'react';
import {
  useMediaQuery, Select, MenuItem, FormControl, Button, TextField, Snackbar, IconButton, Tooltip, Box, Link,
} from '@mui/material';
import ReactCountryFlag from 'react-country-flag';
import makeStyles from '@mui/styles/makeStyles';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import LogoImage from './LogoImage';

const useStyles = makeStyles((theme) => ({
  options: {
    position: 'fixed',
    top: theme.spacing(2),
    right: theme.spacing(2),
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  link: {
    cursor: 'pointer',
  },
  message: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
    fontSize: '1.2rem',
    textAlign: 'center',
  },
}));

const VerifyAccountPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();
  const dispatch = useDispatch();

  const { languages, language, setLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({ code: values[0], country: values[1].country, name: values[1].name }));

  const languageEnabled = useSelector((state) => !state.session.server.attributes['ui.disableLoginLanguage']);
  const announcement = useSelector((state) => state.session.server.announcement);

  const [code, setCode] = useState('');
  const [announcementShown, setAnnouncementShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  const handleVerifyCode = async () => {
    setFailed(false);
    setErrorMessage('');
    try {
      const verificationCodeHash = localStorage.getItem('verificationCodeHash');
      const jsessionIdHash = localStorage.getItem('JSESSIONIDhash');
  
      if (!verificationCodeHash || !jsessionIdHash) {
        throw new Error("Missing verificationCodeHash or JSESSIONIDhash");
      }
  
      const response = await fetch('http://4.242.18.200:2020/api/v1/check_code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, verificationCodeHash, JSESSIONIDhash: jsessionIdHash }),
      });
  
      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          // Reemplaza la cookie JSESSIONID con el valor original que se envió inicialmente
          document.cookie = `JSESSIONID=${data.JSESSIONID}; path=/;`;
  
          // Elimina los datos temporales de localStorage
          localStorage.removeItem('verificationCodeHash');
          localStorage.removeItem('JSESSIONIDhash');
  
          // Redirigir al usuario a la página principal
          navigate('/');
        } else {
          throw new Error('Verification failed');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }
    } catch (error) {
      console.log(error.message);
      setFailed(true);
    }
  };
  
  
  
  
  

  return (
    <LoginLayout>
      <div className={classes.options}>
        {languageEnabled && (
          <FormControl>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <Box component="span" sx={{ mr: 1 }}>
                    <ReactCountryFlag countryCode={it.country} svg />
                  </Box>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>
      <div className={classes.container}>
        {useMediaQuery(theme.breakpoints.down('lg')) && <LogoImage color={theme.palette.primary.main} />}
        <div className={classes.message}>
          Please check your mailbox for the verification code.
        </div>
        <TextField
          required
          label={t('userVerificationCode')}
          name="code"
          value={code}
          type="number"
          onChange={(e) => setCode(e.target.value)}
        />
        <Button
          onClick={handleVerifyCode}
          variant="contained"
          color="secondary"
          disabled={!code}
        >
          {t('verify')}
        </Button>
        {failed && (
          <Snackbar
            open={failed}
            message={`${errorMessage} (${t('attemptsLeft')}: ${attemptsLeft})`}
            action={(
              <IconButton size="small" color="inherit" onClick={() => setFailed(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          />
        )}
        {attemptsLeft === 0 && (
          <Snackbar
            open
            message={t('No more attempts left. Redirecting to login...')}
            action={(
              <IconButton size="small" color="inherit" onClick={() => navigate('/login')}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          />
        )}
        <Link
          onClick={() => navigate('/login')}
          className={classes.link}
          underline="none"
          variant="caption"
        >
          {t('loginReturn')}
        </Link>
      </div>
      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={(
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      />
    </LoginLayout>
  );
};

export default VerifyAccountPage;
