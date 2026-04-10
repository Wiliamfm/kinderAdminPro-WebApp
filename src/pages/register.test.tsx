import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from './register';

const mocks = vi.hoisted(() => ({
  listPublicGrades: vi.fn(),
  submitPublicRegistration: vi.fn(),
}));

vi.mock('../lib/pocketbase/public', () => ({
  listPublicGrades: mocks.listPublicGrades,
  submitPublicRegistration: mocks.submitPublicRegistration,
}));

vi.mock('../lib/pocketbase/students-fathers', () => ({
  STUDENT_FATHER_RELATIONSHIPS: ['father', 'mother', 'other'],
  formatRelationshipLabel: (relationship: string) => ({
    father: 'Padre',
    mother: 'Madre',
    other: 'Otro',
  }[relationship] ?? relationship),
}));

const gradesFixture = [
  { id: 'g1', name: 'Primero A' },
  { id: 'g2', name: 'Segundo A' },
];

async function fillValidForm() {
  fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Perez' } });
  fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
  fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
  fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
  fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
  fireEvent.input(screen.getAllByLabelText('Documento')[0], { target: { value: '1001' } });
  fireEvent.input(screen.getByLabelText('Peso'), { target: { value: '20.5' } });
  fireEvent.input(screen.getByLabelText('Altura'), { target: { value: '115' } });
  fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'O+' } });
  fireEvent.input(screen.getByLabelText('Seguridad social'), { target: { value: 'EPS 01' } });
  fireEvent.input(screen.getByLabelText('Alergias'), { target: { value: 'Ninguna' } });

  fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Laura Perez' } });
  fireEvent.input(screen.getAllByLabelText('Documento')[1], { target: { value: '9001' } });
  fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '3001234567' } });
  fireEvent.input(screen.getByLabelText('Ocupación'), { target: { value: 'Ingeniera' } });
  fireEvent.input(screen.getByLabelText('Empresa'), { target: { value: 'ACME' } });
  fireEvent.input(screen.getByLabelText('Correo electrónico'), { target: { value: 'laura@example.com' } });
  fireEvent.input(screen.getByLabelText('Dirección'), { target: { value: 'Calle 1 # 2-3' } });
  fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Password123' } });
  fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Password123' } });
  fireEvent.change(screen.getByLabelText('Relación con el estudiante'), { target: { value: 'mother' } });
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPublicGrades.mockResolvedValue(gradesFixture);
    mocks.submitPublicRegistration.mockResolvedValue(undefined);
  });

  it('shows required-field validation on empty submit', async () => {
    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Grado es obligatorio.')).toBeInTheDocument();
    expect(screen.getAllByText('Documento es obligatorio.')).toHaveLength(2);
    expect(screen.getByText('Correo electrónico es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Contraseña es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Confirmación de contraseña es obligatoria.')).toBeInTheDocument();
    expect(mocks.submitPublicRegistration).not.toHaveBeenCalled();
  });

  it('shows a validation error when passwords do not match', async () => {
    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    await fillValidForm();
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mocks.submitPublicRegistration).not.toHaveBeenCalled();
  });

  it('shows a validation error when password is too short', async () => {
    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    await fillValidForm();
    fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'Short7' } });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Short7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(mocks.submitPublicRegistration).not.toHaveBeenCalled();
  });

  it('sanitizes document inputs and validates invalid weight and height values', async () => {
    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Perez' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Peso'), { target: { value: '20.5.1' } });
    fireEvent.input(screen.getByLabelText('Altura'), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'O+' } });
    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Laura Perez' } });
    fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '3001234567' } });
    fireEvent.input(screen.getByLabelText('Ocupación'), { target: { value: 'Ingeniera' } });
    fireEvent.input(screen.getByLabelText('Correo electrónico'), { target: { value: 'laura@example.com' } });
    fireEvent.input(screen.getByLabelText('Dirección'), { target: { value: 'Calle 1' } });

    const numericInputs = screen
      .getAllByRole('textbox')
      .filter((element) => (element as HTMLInputElement).inputMode === 'numeric') as HTMLInputElement[];

    fireEvent.input(numericInputs[0], { target: { value: 'ABC123' } });
    fireEvent.input(numericInputs[1], { target: { value: 'ID-9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(numericInputs[0].value).toBe('123');
    expect(numericInputs[1].value).toBe('9');
    expect(screen.getByText('El peso debe ser un número válido mayor o igual a 0.')).toBeInTheDocument();
    expect(screen.getByText('La altura debe ser un número válido mayor o igual a 0.')).toBeInTheDocument();
    expect(mocks.submitPublicRegistration).not.toHaveBeenCalled();
  });

  it('submits the public registration flow and shows the pending approval message', async () => {
    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => {
      expect(mocks.submitPublicRegistration).toHaveBeenCalledWith({
        father: {
          full_name: 'Laura Perez',
          document_id: '9001',
          phone_number: '3001234567',
          occupation: 'Ingeniera',
          company: 'ACME',
          email: 'laura@example.com',
          address: 'Calle 1 # 2-3',
        },
        student: expect.objectContaining({
          name: 'Ana Perez',
          grade_id: 'g1',
          document_id: '1001',
          blood_type: 'O+',
          date_of_birth: expect.stringMatching(/Z$/),
        }),
        relationship: 'mother',
        password: 'Password123',
        passwordConfirm: 'Password123',
      });
    });

    expect(await screen.findByText('Tu solicitud está pendiente de aprobación')).toBeInTheDocument();
    expect(screen.getByText(/puedes iniciar sesión con el correo y la contraseña/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument();
  });

  it('rolls back father and student records when link creation fails', async () => {
    mocks.submitPublicRegistration.mockRejectedValue({ message: 'No se pudo crear el vínculo.' });

    render(() => <RegisterPage />);
    await screen.findByText('Solicitud de inscripción estudiantil');

    await fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('No se pudo crear el vínculo.')).toBeInTheDocument();
    expect(mocks.submitPublicRegistration).toHaveBeenCalledTimes(1);
  });
});
