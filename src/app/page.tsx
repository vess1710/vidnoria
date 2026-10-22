import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';

/**
 * Root page redirects to the default locale (Turkish).
 * The middleware handles browser language detection for new visitors.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
