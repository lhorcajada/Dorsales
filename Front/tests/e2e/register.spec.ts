import { expect, test, type Page } from '@playwright/test';

/**
 * Intercepts the Supabase child catalog request and returns a fake list
 * so the <select> element is populated and the submit button is enabled.
 */
async function mockChildCatalog(page: Page) {
  await page.route('**/rest/v1/child_name_catalog**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ full_name: 'Jugador de prueba' }]),
    });
  });
}

test.describe('Registro – jugador ya vinculado', () => {
  test('muestra un mensaje de error cuando el jugador ya está vinculado a otra cuenta', async ({ page }) => {
    // Mock the child catalog so the select field has an option to choose.
    await mockChildCatalog(page);

    // Mock the Supabase auth signup endpoint to return "User already registered".
    await page.route('**/auth/v1/signup**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'user_already_exists',
          message: 'User already registered',
        }),
      });
    });

    // Also mock the register_incident RPC so the test does not call the real DB.
    await page.route('**/rest/v1/rpc/register_incident**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/register');

    // Wait for the catalog to load so the select field has an option.
    await expect(page.getByLabel('Nombre del jugador')).not.toBeDisabled({ timeout: 5000 });

    // Fill in the registration form.
    await page.getByLabel('Nombre completo').fill('Usuario Test');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByLabel('Nombre del jugador').selectOption('Jugador de prueba');

    // Submit the form.
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    // The notification toast should be visible with the error message.
    const notification = page.getByRole('status');
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification.getByRole('heading', { name: 'No se ha podido completar el registro' })).toBeVisible();
    await expect(notification.getByText('El jugador ya ha sido vinculado con otra cuenta.')).toBeVisible();
  });

  test('muestra un mensaje de error cuando el nombre del jugador ya existe en la base de datos', async ({ page }) => {
    // Mock the child catalog so the select field has an option to choose.
    await mockChildCatalog(page);

    // Mock signup to fail with the child already linked error.
    // This simulates the scenario where: signup succeeds, but child insert fails
    // because the child name already exists (unique constraint violation).
    await page.route('**/auth/v1/signup**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'duplicate_child',
          message: 'duplicate key value violates unique constraint "children_full_name_unique"',
        }),
      });
    });

    // Also mock the register_incident RPC so the test does not call the real DB.
    await page.route('**/rest/v1/rpc/register_incident**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/register');

    // Wait for the catalog to load.
    await expect(page.getByLabel('Nombre del jugador')).not.toBeDisabled({ timeout: 5000 });

    // Fill in the registration form.
    await page.getByLabel('Nombre completo').fill('Otro Usuario');
    await page.getByLabel('Email').fill('nuevo@example.com');
    await page.getByLabel('Contraseña').fill('password123');
    await page.getByLabel('Nombre del jugador').selectOption('Jugador de prueba');

    // Submit the form.
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    // The notification toast should be visible with the error message.
    const notification = page.getByRole('status');
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification.getByRole('heading', { name: 'No se ha podido completar el registro' })).toBeVisible();
    await expect(notification.getByText('El jugador ya ha sido vinculado con otra cuenta.')).toBeVisible();
  });
});
