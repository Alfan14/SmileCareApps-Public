/** Full-page navigation to another site (Stripe). Kept in its own file so tests can replace it. */
export const redirectTo = (url: string) => {
  window.location.assign(url);
};
