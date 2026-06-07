import { useState } from 'react';
import type { FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { appPaths } from '../../router/paths';
import { useAuth } from '../../shared/hooks/useAuth';
import { useNotifications } from '../../shared/context/useNotifications';
import {
  getLocalizedAuthErrorMessage,
} from '../../shared/services/auth-service';

import styles from './LoginScreen.module.css';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const { pushNotification } = useNotifications();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

    try {
      await login({ email, password });
      navigate('/home');
    } catch (loginError) {
      pushNotification({
        tone: 'error',
        title: 'No se ha podido iniciar sesión',
        description: getLocalizedAuthErrorMessage(loginError),
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
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>

          <label className={styles['auth-screen__field']}>
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>

          <button type="submit" className={styles['auth-screen__button']} disabled={!canSubmit}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className={styles['auth-screen__footer']}>
          ¿No tienes cuenta? <Link to="/register">Crear acceso</Link>
        </p>

        <p className={styles['auth-screen__footer']}>
          ¿Has olvidado tu contraseña? <Link to={appPaths.forgotPassword}>Recuperarla</Link>
        </p>
      </section>
    </main>
  );
}