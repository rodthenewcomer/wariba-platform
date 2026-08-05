import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AccountSelector, type AccountSelectorItem } from '../src/wariba/AccountSelector.js';

function FakeLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

const ACCOUNTS: AccountSelectorItem[] = [
  {
    id: 'acc-1',
    href: '/hub?account=acc-1',
    program: 'WARIBA ONE',
    nominalFormatted: '10 000 USD',
    publicId: 'DEMO-0001',
    statusLabel: 'Actif',
    statusVariant: 'success',
  },
  {
    id: 'acc-2',
    href: '/hub?account=acc-2',
    program: 'WARIBA ONE',
    nominalFormatted: '5 000 USD',
    publicId: 'DEMO-0002',
    statusLabel: 'Blocage temporaire',
    statusVariant: 'warning',
  },
];

describe('AccountSelector', () => {
  it('renders nothing for a single account (no switcher needed)', () => {
    const { container } = render(
      <AccountSelector
        LinkComponent={FakeLink}
        accounts={[ACCOUNTS[0] as AccountSelectorItem]}
        activeAccountId="acc-1"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every account with an explicit navigation link, never a silent switch', () => {
    render(
      <AccountSelector LinkComponent={FakeLink} accounts={ACCOUNTS} activeAccountId="acc-1" />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/hub?account=acc-1');
    expect(links[1]).toHaveAttribute('href', '/hub?account=acc-2');
  });

  it('marks the active account with aria-current', () => {
    render(
      <AccountSelector LinkComponent={FakeLink} accounts={ACCOUNTS} activeAccountId="acc-2" />,
    );
    expect(screen.getByText('DEMO-0001').closest('a')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('DEMO-0002').closest('a')).toHaveAttribute('aria-current', 'page');
  });

  it('never merges metrics across accounts — each status/nominal stays scoped to its own row', () => {
    render(
      <AccountSelector LinkComponent={FakeLink} accounts={ACCOUNTS} activeAccountId="acc-1" />,
    );
    expect(screen.getByText('10 000 USD')).toBeInTheDocument();
    expect(screen.getByText('5 000 USD')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('Blocage temporaire')).toBeInTheDocument();
  });
});
