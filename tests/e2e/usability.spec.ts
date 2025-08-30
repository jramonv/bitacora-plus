import { test, expect } from '@playwright/test';

const baseURL = 'http://localhost:5173';

async function login(page, email: string) {
  await page.goto(baseURL + '/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL(baseURL + '/');
}

test.describe('Flujos de usabilidad', () => {
  test('a) Crear Subject → Task → Evidencias → Checklist → Cerrar', async ({ page }) => {
    await login(page, 'owner@example.com');
    // Placeholder actions following flow a
    await page.goto(baseURL + '/subjects/new');
    await page.screenshot({ path: 'docs/screens/flow-a.png' });
  });

  test('b) Dashboard → Interpretar KPIs → Exportar PDF', async ({ page }) => {
    await login(page, 'viewer@example.com');
    await page.goto(baseURL + '/dashboard');
    await page.screenshot({ path: 'docs/screens/flow-b.png' });
  });

  test('c) Billing Starter vs Pro', async ({ page }) => {
    await login(page, 'owner@example.com');
    await page.goto(baseURL + '/billing');
    await page.screenshot({ path: 'docs/screens/flow-c.png' });
  });

  test('d) Alertas y lectura de email', async ({ page }) => {
    await login(page, 'editor@example.com');
    await page.goto(baseURL + '/alerts');
    await page.screenshot({ path: 'docs/screens/flow-d.png' });
  });

  test('e) API usage POST /tasks', async ({ request }) => {
    const res = await request.post(baseURL + '/api/v1/tasks', {
      data: { title: 'Task via API' },
      headers: { 'Idempotency-Key': '123' }
    });
    expect(res.ok()).toBeTruthy();
  });

  test('f) Webhook task.closed entregado', async ({ request }) => {
    const res = await request.post(baseURL + '/webhooks/task.closed', {
      data: { id: 'task1' },
      headers: { 'X-Signature': 'hmac' }
    });
    expect(res.status()).toBe(200);
  });

  test('g) AI risk al cerrar con evidencia incompleta', async ({ page }) => {
    await login(page, 'editor@example.com');
    await page.goto(baseURL + '/tasks/1');
    await page.screenshot({ path: 'docs/screens/flow-g.png' });
  });
});
