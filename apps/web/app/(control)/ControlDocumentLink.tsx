import type { ComponentPropsWithoutRef } from 'react';

type ControlDocumentLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string;
};

/**
 * A navigation boundary for authenticated operational pages.
 *
 * Next's client router can receive a valid RSC response for these dynamic
 * routes and still abort it before committing the URL. A normal anchor keeps
 * one owner for the transition — the browser — and replaces the complete
 * operator context. It also preserves keyboard use, middle-click and opening
 * a case in a new tab without client code.
 */
export function ControlDocumentLink({ href, ...props }: ControlDocumentLinkProps) {
  return <a href={href} {...props} />;
}
