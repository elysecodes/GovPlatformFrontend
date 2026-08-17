import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Register } from './Register';

const { register, api } = vi.hoisted(() => ({
  register: vi.fn(),
  api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../lib/auth', () => ({ useAuth: () => ({ register }) }));
vi.mock('../lib/api', () => ({ api, apiError: () => 'Request failed' }));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { items: [] } });
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

describe('Register', () => {
  it('submits the form and shows the pending approval confirmation', async () => {
    register.mockResolvedValue(undefined);
    renderRegister();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Full name/), 'New Citizen');
    await user.type(screen.getByLabelText(/Username/), 'newcitizen');
    await user.type(screen.getByLabelText(/Password/), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Registration submitted')).toBeInTheDocument();
    expect(screen.getByText(/pending approval/)).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'New Citizen', username: 'newcitizen', password: 'Password123!' }),
    );
  });

  it('loads districts from the catalog on mount', async () => {
    api.get.mockResolvedValue({ data: { items: [{ id: 1, name: 'Test District' }] } });
    renderRegister();

    expect(await screen.findByRole('option', { name: 'Test District' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/catalog/districts');
  });

  it('shows an error when registration fails', async () => {
    register.mockRejectedValue(new Error('already taken'));
    renderRegister();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Full name/), 'New Citizen');
    await user.type(screen.getByLabelText(/Username/), 'newcitizen');
    await user.type(screen.getByLabelText(/Password/), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Request failed')).toBeInTheDocument();
    expect(screen.queryByText('Registration submitted')).not.toBeInTheDocument();
  });
});
