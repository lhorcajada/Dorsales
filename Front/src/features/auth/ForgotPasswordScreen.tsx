import { useState, type FormEvent } from 'react';

import { Link } from 'react-router-dom';

import { appPaths } from '../../router/paths';
import { useNotifications } from '../../shared/context/useNotifications';
import {
  getLocalizedAuthErrorMessage,
  requestPasswordReset,
} from '../../shared/services/auth-service';

import styles from './ForgotPasswordScreen.module.css';

export default function ForgotPasswordScreen() {
  const { pushNotification } = useNotifications();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function getRecoveryErrorMessage(requestError: unknown) {
    if (
      requestError &&
      typeof requestError === 'object' &&
      'code' in requestError &&
      typeof requestError.code === 'string' &&
      requestError.code.trim().toLowerCase() === 'over_email_send_rate_limit'
    ) {
      return 'Has pedido demasiados correos seguidos. Espera unos minutos e inténtalo de nuevo.';
    }

    return getLocalizedAuthErrorMessage(
      requestError,
      'No se ha podido enviar el correo de recuperación. Inténtalo de nuevo en unos minutos.',
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      pushNotification({
        tone: 'warning',
        title: 'Falta el email',
        description: 'Escribe tu email para recibir el enlace de recuperación.',
      });
      return;
    }

    setSubmitting(true);
    setSent(false);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      pushNotification({
        tone: 'success',
        title: 'Correo enviado',
        description: 'Revisa tu correo para continuar con la recuperación.',
      });
    } catch (requestError) {
      pushNotification({
        tone: 'error',
        title: 'No se ha podido enviar el correo',
        description: getRecoveryErrorMessage(requestError),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles['auth-screen']}>
      <section className={styles['auth-screen__card']}>
        <p className={styles['auth-screen__eyebrow']}>Recuperación</p>
        <h1 className={styles['auth-screen__title']}>Recupera tu contraseña.</h1>
        <p className={styles['auth-screen__copy']}>
          Te enviaremos un enlace seguro para crear una nueva contraseña desde tu correo.
        </p>

        {sent ? (
          <p className={styles['auth-screen__success']} role="status" aria-live="polite">
            Revisa tu correo para continuar.
          </p>
        ) : null}

        <form className={styles['auth-screen__form']} onSubmit={handleSubmit}>
          <label className={styles['auth-screen__field']}>
            <span>Email</span>
            <input
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>

          <button type="submit" className={styles['auth-screen__button']} disabled={submitting || sent}>
            {submitting ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <p className={styles['auth-screen__footer']}>
          <Link to={appPaths.login}>Volver al inicio de sesión</Link>
        </p>
      </section>
    </main>
  );
}