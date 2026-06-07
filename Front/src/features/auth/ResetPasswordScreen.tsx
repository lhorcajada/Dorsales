import { useEffect, useState, type FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { appPaths } from '../../router/paths';
import { getSupabaseClient } from '../../shared/services/supabase';
import { getLocalizedAuthErrorMessage, signOut, updatePassword } from '../../shared/services/auth-service';

import styles from './ResetPasswordScreen.module.css';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (active) {
        setHasRecoverySession(Boolean(data.session));
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await updatePassword(password);
      await signOut();
      navigate(appPaths.login, { replace: true });
    } catch (updateError) {
      setMessage(
        getLocalizedAuthErrorMessage(
          updateError,
          'No se ha podido cambiar la contraseña. Revisa el enlace de recuperación e inténtalo de nuevo.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = password.trim() !== '' && confirmPassword.trim() !== '' && !submitting;

  return (
    <main className={styles['auth-screen']}>
      <section className={styles['auth-screen__card']}>
        <p className={styles['auth-screen__eyebrow']}>Nueva contraseña</p>
        <h1 className={styles['auth-screen__title']}>Crea una contraseña nueva.</h1>
        <p className={styles['auth-screen__copy']}>
          Usa el enlace que recibiste por correo para establecer una nueva contraseña segura.
        </p>

        {hasRecoverySession === false ? (
          <p className={styles['auth-screen__warning']}>
            Abre el enlace de recuperación que te hemos enviado para activar este formulario.
          </p>
        ) : null}
        {message ? <p className={styles['auth-screen__copy']}>{message}</p> : null}

        <form className={styles['auth-screen__form']} onSubmit={handleSubmit}>
          <label className={styles['auth-screen__field']}>
            <span>Nueva contraseña</span>
            <input
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>

          <label className={styles['auth-screen__field']}>
            <span>Confirmar contraseña</span>
            <input
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
            />
          </label>

          <button
            type="submit"
            className={styles['auth-screen__button']}
            disabled={!canSubmit || hasRecoverySession === false}
          >
            {submitting ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>

        <p className={styles['auth-screen__footer']}>
          <Link to={appPaths.login}>Volver al inicio de sesión</Link>
        </p>
      </section>
    </main>
  );
}