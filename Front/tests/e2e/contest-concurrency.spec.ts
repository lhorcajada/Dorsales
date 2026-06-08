import { expect, test, type BrowserContext, type Page } from '@playwright/test';

type UserFixture = {
  id: string;
  email: string;
  name: string;
  childId: string;
  childName: string;
};

type SharedContestState = {
  assignedChildId: string | null;
};

const CONTESTED_DORSAL = 7;

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

function buildCatalog(sharedState: SharedContestState, users: UserFixture[]) {
  const assignedUser = users.find((user) => user.childId === sharedState.assignedChildId) ?? null;

  return [
    {
      number: CONTESTED_DORSAL,
      status: assignedUser ? 'assigned' : 'available',
      assigned_child_id: assignedUser?.childId ?? null,
      assigned_child_name: assignedUser?.childName ?? null,
      is_locked: false,
      locked_reason: null,
      locked_by_parent_id: null,
      locked_by_child_id: null,
      locked_at: null,
    },
    {
      number: CONTESTED_DORSAL + 1,
      status: 'available',
      assigned_child_id: null,
      assigned_child_name: null,
      is_locked: false,
      locked_reason: null,
      locked_by_parent_id: null,
      locked_by_child_id: null,
      locked_at: null,
    },
  ];
}

async function mockSupabaseForUser(
  context: BrowserContext,
  user: UserFixture,
  sharedState: SharedContestState,
  users: UserFixture[],
) {
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
        body: JSON.stringify(buildCatalog(sharedState, users)),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/reserve_dorsal') && method === 'POST') {
      const payload = request.postDataJSON() as { p_child_id: string; p_dorsal_number: number };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          number: payload.p_dorsal_number,
          status: 'available',
          assigned_child_id: null,
          assigned_child_name: null,
          is_locked: true,
          locked_reason: user.name,
          locked_by_parent_id: user.id,
          locked_by_child_id: payload.p_child_id,
          locked_at: new Date().toISOString(),
        }),
      });
      return;
    }

    if (url.pathname.endsWith('/rpc/claim_dorsal') && method === 'POST') {
      const payload = request.postDataJSON() as { p_child_id: string; p_dorsal_number: number };

      if (sharedState.assignedChildId === null) {
        sharedState.assignedChildId = payload.p_child_id;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dorsal_number: payload.p_dorsal_number,
            child_id: payload.p_child_id,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '409',
          message: 'Dorsal already assigned',
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
}

async function createUserContestPage(
  browserContext: BrowserContext,
  user: UserFixture,
  sharedState: SharedContestState,
  allUsers: UserFixture[],
) {
  await bootstrapAuthenticatedSession(browserContext, user);
  await mockSupabaseForUser(browserContext, user, sharedState, allUsers);

  const page = await browserContext.newPage();
  await page.goto('/contest');
  await expect(page.getByRole('heading', { name: 'Selecciona un dorsal' })).toBeVisible();

  return page;
}

async function confirmContestedDorsal(page: Page) {
  await page.getByRole('button', { name: /Dorsal 07:/ }).click();
  await expect(page.getByRole('dialog', { name: 'Confirma el dorsal' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar dorsal' }).click();
}

async function readOutcome(page: Page) {
  const successHeading = page.getByRole('heading', { name: 'Dorsal confirmado' });
  const errorHeading = page.getByRole('heading', { name: 'No se pudo guardar' });

  const successVisible = await successHeading
    .waitFor({ state: 'visible', timeout: 6000 })
    .then(() => true)
    .catch(() => false);

  if (successVisible) {
    return 'success' as const;
  }

  await expect(errorHeading).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(/Ese dorsal ya est[aá] asignado\./)).toBeVisible();

  return 'error' as const;
}

test('solo un usuario guarda el mismo dorsal cuando varios confirman al mismo tiempo', async ({ browser }) => {
  const users: UserFixture[] = [
    {
      id: 'user-a',
      email: 'user-a@example.com',
      name: 'Usuario A',
      childId: 'child-a',
      childName: 'Jugador A',
    },
    {
      id: 'user-b',
      email: 'user-b@example.com',
      name: 'Usuario B',
      childId: 'child-b',
      childName: 'Jugador B',
    },
    {
      id: 'user-c',
      email: 'user-c@example.com',
      name: 'Usuario C',
      childId: 'child-c',
      childName: 'Jugador C',
    },
  ];

  const sharedState: SharedContestState = {
    assignedChildId: null,
  };

  const contexts = await Promise.all(users.map(() => browser.newContext()));

  try {
    const pages = await Promise.all(
      contexts.map((context, index) => createUserContestPage(context, users[index]!, sharedState, users)),
    );

    await Promise.all(pages.map((page) => confirmContestedDorsal(page)));

    const outcomes = await Promise.all(pages.map((page) => readOutcome(page)));
    const successCount = outcomes.filter((outcome) => outcome === 'success').length;
    const errorCount = outcomes.filter((outcome) => outcome === 'error').length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(2);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
