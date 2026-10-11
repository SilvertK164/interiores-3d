import { test as setup } from '@playwright/test'
import { createAccount, signInViaUi } from './support/user'

setup('crear usuario de prueba local e iniciar sesión', async ({ page }) => {
  await signInViaUi(page, await createAccount())
  await page.context().storageState({ path: 'e2e/.auth/state.json' })
})
