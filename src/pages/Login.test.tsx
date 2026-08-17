import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login';

const { navigate, auth } = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: {
    login: vi.fn(),
    completeMfaLogin: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    refreshMe: vi.fn(),
  },
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('../lib/auth', () => ({ useAuth: () => auth }));
vi.mock('../lib/api', () => ({ apiError: () => 'Request failed' }));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

async function submitCredentials() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Username or email/), 'citizen');
  await user.type(screen.getByLabelText(/Password/), 'Citizen@123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  it('signs in and navigates home when the account has no 2FA', async () => {
    auth.login.mockResolvedValue({ user: { id: 1 }, requiresTwoFactor: false });
    renderLogin();

    await submitCredentials();

    expect(auth.login).toHaveBeenCalledWith('citizen', 'Citizen@123');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the 2FA step and completes the challenge with a code', async () => {
    auth.login.mockResolvedValue({ user: null, requiresTwoFactor: true, mfaToken: 'mfa-token-1' });
    auth.completeMfaLogin.mockResolvedValue({ id: 1 });
    renderLogin();

    await submitCredentials();

    expect(await screen.findByText('Two-factor verification')).toBeInTheDocument();
    expect(auth.completeMfaLogin).not.toHaveBeenCalled();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Verification code/), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify & sign in' }));

    expect(auth.completeMfaLogin).toHaveBeenCalledWith('mfa-token-1', '123456');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('allows returning to the credentials step from 2FA', async () => {
    auth.login.mockResolvedValue({ user: null, requiresTwoFactor: true, mfaToken: 'mfa-token-2' });
    renderLogin();

    await submitCredentials();
    await screen.findByText('Two-factor verification');

    await userEvent.click(screen.getByRole('button', { name: '← Back to sign in' }));

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Two-factor verification')).not.toBeInTheDocument();
  });

  it('shows an error when the credentials are invalid', async () => {
    auth.login.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await submitCredentials();

    expect(await screen.findByText('Request failed')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
