import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { SelectField } from '../../shared/components/SelectField/SelectField';
import { useAuth } from '../../shared/hooks/useAuth';
import { fetchChildCatalogOptions, type ChildCatalogOption } from '../../shared/services/child-catalog-service';

import styles from './RegisterScreen.module.css';

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [childOptions, setChildOptions] = useState<ChildCatalogOption[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadChildren = async () => {
      try {
        setChildrenError(null);
        setChildrenLoading(true);
        const options = await fetchChildCatalogOptions();

        if (active) {
          setChildOptions(options);
        }
      } catch (loadError) {
        if (active) {
          setChildrenError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo de niños.');
          setChildOptions([]);
        }
      } finally {
        if (active) {
          setChildrenLoading(false);
        }
      }
    };

    void loadChildren();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    clearError();

    try {
      const result = await register({ name, email, password, childName });
      navigate(result.authenticated ? '/home' : '/login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles['auth-screen']}>
      <section className={styles['auth-screen__card']}>
        <p className={styles['auth-screen__eyebrow']}>Registro</p>
        <h1 className={styles['auth-screen__title']}>Regístrate como usuario y vincúlate con tu hijo.</h1>
        <p className={styles['auth-screen__copy']}>
          El registro crea tu cuenta y vincula a tu hijo desde el catálogo guardado en la base de datos.
        </p>

        {error ? <p className={styles['auth-screen__copy']}>{error}</p> : null}
        {childrenError ? <p className={styles['auth-screen__copy']}>{childrenError}</p> : null}

        <form className={styles['auth-screen__form']} onSubmit={handleSubmit}>
          <label className={styles['auth-screen__field']}>
            <span>Nombre completo</span>
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
            />
          </label>

          <label className={styles['auth-screen__field']}>
            <span>Email</span>
            <input
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
            />
          </label>

          <label className={styles['auth-screen__field']}>
            <span>Contraseña</span>
            <input
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>

          <SelectField
            label="Nombre del niño"
            value={childName}
            onChange={setChildName}
            options={childOptions}
            placeholder={childrenLoading ? 'Cargando catálogo...' : 'Selecciona un niño'}
            hint="El catálogo sale de la base de datos y evita nombres escritos a mano."
            disabled={submitting || childrenLoading || childOptions.length === 0}
            required
          />

          <button
            type="submit"
            className={styles['auth-screen__button']}
            disabled={submitting || childrenLoading || childOptions.length === 0}
          >
            {submitting ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles['auth-screen__footer']}>
          ¿Ya tienes acceso? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}