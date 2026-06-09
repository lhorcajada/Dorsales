import { expect, test, type BrowserContext } from '@playwright/test';

type UserFixture = {
  id: string;
  email: string;
  name: string;
  childId: string;
};

function buildSession(user: UserFixture) {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    access_token: `access-token-${user.id}`,
    refresh_token: `refresh-token-${user.id}`,
    token_type: 'bearer',
    expires_in: 60 * 60,
    expires_at: nowSeconds + 60 * 60,
    user: {
      id: user.id,
      email: user.email,
      role: 'authenticated',
      aud: 'authenticated',
    },
  };
}

async function bootstrapAuthenticatedSession(context: BrowserContext, user: UserFixture) {
  const session = buildSession(user);

  await context.addInitScript(({ seededSession }) => {
    const sessionJson = JSON.stringify(seededSession);
    const originalGetItem = Storage.prototype.getItem;

    Storage.prototype.getItem = function patchedGetItem(key: string) {
      if (key === 'supabase.auth.token' || key.endsWith('-auth-token')) {
        return sessionJson;
      }

      return originalGetItem.call(this, key);
    };

    window.localStorage.setItem('supabase.auth.token', sessionJson);
  }, { seededSession: session });
}

test('bloquea un intento directo de entrar al concurso antes de que se abra la ventana', async ({ browser }) => {
  const user: UserFixture = {
    id: 'malicious-user',
    email: 'malicious@example.com',
    name: 'Usuario Malicioso',
    childId: 'child-malicious',
  };

  const context = await browser.newContext();
  let reserveDorsalCallCount = 0;

  await bootstrapAuthenticatedSession(context, user);

  await context.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.endsWith('/profiles') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          display_name: user.name,
          role: 'user',
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/children') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: user.childId }]),
      });
      return;
    }

    if (url.pathname.endsWith('/contest_settings') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contest_name: 'Asignacion de dorsales',
          is_enabled: false,
          is_paused: false,
          opens_at: '2026-06-09T16:00:00.000Z',
          closes_at: '2026-06-09T18:00:00.000Z',
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/dorsal_catalog') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            number: 7,
            status: 'available',
            assigned_child_id: null,
            assigned_child_name: null,
            is_locked: false,
            locked_reason: null,
            locked_by_parent_id: null,
            locked_by_child_id: null,
            locked_at: null,
          },
        ]),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/reserve_dorsal') && method === 'POST') {
      reserveDorsalCallCount += 1;

      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '403',
          message: 'Contest not open',
        }),
      });
      return;
    }

    await route.continue();
  });

  const page = await context.newPage();

  try {
    await page.goto('/contest');

    await page.waitForURL('**/home');
    await expect(page.getByRole('heading', { name: 'Cuenta atrás para la asignación de dorsales' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selecciona un dorsal' })).toHaveCount(0);

    expect(reserveDorsalCallCount).toBe(0);
  } finally {
    await context.close();
  }
});

test('muestra error cuando un usuario fuerza la confirmacion pero el backend bloquea claim_dorsal', async ({ browser }) => {
  const user: UserFixture = {
    id: 'malicious-claimer',
    email: 'malicious-claimer@example.com',
    name: 'Usuario Forzado',
    childId: 'child-forzado',
  };

  const context = await browser.newContext();
  let claimDorsalCallCount = 0;

  await bootstrapAuthenticatedSession(context, user);

  await context.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.endsWith('/profiles') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          display_name: user.name,
          role: 'user',
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/children') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: user.childId }]),
      });
      return;
    }

    if (url.pathname.endsWith('/contest_settings') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contest_name: 'Asignacion de dorsales',
          is_enabled: true,
          is_paused: false,
          opens_at: null,
          closes_at: null,
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/dorsal_catalog') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            number: 7,
            status: 'available',
            assigned_child_id: null,
            assigned_child_name: null,
            is_locked: false,
            locked_reason: null,
            locked_by_parent_id: null,
            locked_by_child_id: null,
            locked_at: null,
          },
        ]),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/reserve_dorsal') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          number: 7,
          status: 'locked',
          assigned_child_id: null,
          assigned_child_name: null,
          is_locked: true,
          locked_reason: user.name,
          locked_by_parent_id: user.id,
          locked_by_child_id: user.childId,
          locked_at: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/claim_dorsal') && method === 'POST') {
      claimDorsalCallCount += 1;

      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '403',
          message: 'Contest not open',
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/release_dorsal_lock') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
      return;
    }

    await route.continue();
  });

  const page = await context.newPage();

  try {
    await page.goto('/contest');

    await expect(page.getByRole('heading', { name: 'Selecciona un dorsal' })).toBeVisible();
    await page.getByRole('button', { name: 'Dorsal 07: Disponible' }).click();
    await expect(page.getByRole('dialog', { name: 'Confirma el dorsal' })).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar dorsal' }).click();

    const failedSaveDialog = page.getByRole('dialog').filter({ hasText: 'No se pudo guardar' });
    await expect(failedSaveDialog).toBeVisible();
    await expect(failedSaveDialog.getByText('Contest not open')).toBeVisible();
    expect(claimDorsalCallCount).toBe(1);
  } finally {
    await context.close();
  }
});
