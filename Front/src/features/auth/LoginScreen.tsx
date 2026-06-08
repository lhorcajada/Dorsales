import { useState } from 'react';
import type { FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { appPaths } from '../../router/paths';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNotifications } from '../../shared/context/useNotifications';
import {
  getAuthErrorPageMessage,
  getLocalizedAuthErrorMessage,
  shouldRedirectAuthErrorToErrorPage,
} from '../../shared/services/auth-service';

import styles from './LoginScreen.module.css';

const INVALID_CREDENTIALS_MESSAGE = 'El email o la contraseña no son correctos.';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const { pushNotification } = useNotifications();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [highlightRegisterLink, setHighlightRegisterLink] = useState(false);
  const canSubmit = email.trim() !== '' && password.trim() !== '' && !submitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      pushNotification({
        tone: 'error',
        title: 'Faltan datos para iniciar sesión',
        description: 'Escribe tu email y tu contraseña para continuar.',
      });
      return;
    }

    setSubmitting(true);
    clearError();
    setHighlightRegisterLink(false);

    try {
      await login({ email, password });
      navigate('/home');
    } catch (loginError) {
      if (shouldRedirectAuthErrorToErrorPage(loginError)) {
        const params = new URLSearchParams({
          status: '500',
          message: getAuthErrorPageMessage(loginError),
        });

        navigate(`${appPaths.error}?${params.toString()}`, { replace: true });
        return;
      }

      const localizedMessage = getLocalizedAuthErrorMessage(loginError);

      if (localizedMessage === INVALID_CREDENTIALS_MESSAGE) {
        setHighlightRegisterLink(true);
      }

      pushNotification({
        tone: 'error',
        title: 'No se ha podido iniciar sesión',
        description: localizedMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles['auth-screen']}>
      <section className={styles['auth-screen__card']}>
        <p className={styles['auth-screen__eyebrow']}>Acceso de usuarios</p>
        <h1 className={styles['auth-screen__title']}>Entra y prepárate para elegir el dorsal.</h1>
        <p className={styles['auth-screen__copy']}>
          Crea tu cuenta y accede a todas las funcionalidades.
        </p>

        {error ? <p className={styles['auth-screen__copy']}>{error}</p> : null}

        <form className={styles['auth-screen__form']} onSubmit={handleSubmit}>
          <label className={styles['auth-screen__field']}>
            <span>Email</span>
            <input
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setHighlightRegisterLink(false);
              }}
              type="email"
            />
          </label>

          <label className={styles['auth-screen__field']}>
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setHighlightRegisterLink(false);
              }}
              type="password"
            />
          </label>

          <button type="submit" className={styles['auth-screen__button']} disabled={!canSubmit}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p
          className={styles['auth-screen__footer']}
          data-highlighted={highlightRegisterLink ? 'true' : undefined}
        >
          ¿No tienes cuenta?{' '}
          <Link
            className={highlightRegisterLink ? styles['auth-screen__register-link--highlighted'] : ''}
            to="/register"
          >
            Regístrate
          </Link>
        </p>

        <p className={styles['auth-screen__footer']}>
          ¿Has olvidado tu contraseña? <Link to={appPaths.forgotPassword}>Recuperar contraseña</Link>
        </p>
      </section>
    </main>
  );
}