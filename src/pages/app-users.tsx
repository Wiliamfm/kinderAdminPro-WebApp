import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import Modal from '../components/Modal';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  deleteAppUser,
  getAuthUserId,
  listAppUsers,
  requestAuthenticatedUserEmailChange,
  type AppUserRecord,
  updateAppUser,
} from '../lib/pocketbase/users';

type UserEditForm = {
  name: string;
  email: string;
  isAdmin: boolean;
};

const emptyEditForm: UserEditForm = {
  name: '',
  email: '',
  isAdmin: false,
};

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

export default function AppUsersPage() {
  const navigate = useNavigate();
  const [users, { refetch }] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listAppUsers();
  });

  const [editTarget, setEditTarget] = createSignal<AppUserRecord | null>(null);
  const [editForm, setEditForm] = createSignal<UserEditForm>(emptyEditForm);
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<AppUserRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);

  const authUserId = () => getAuthUserId();

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/staff-management', { replace: true });
    }
  });

  const openEditModal = (user: AppUserRecord) => {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
    setEditError(null);
    setActionError(null);
  };

  const closeEditModal = () => {
    if (editBusy()) return;
    setEditTarget(null);
    setEditForm(emptyEditForm);
    setEditError(null);
  };

  const setEditField = <K extends keyof UserEditForm>(field: K, value: UserEditForm[K]) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateEditForm = (): UserEditForm | null => {
    const current = editForm();
    const name = current.name.trim();
    const email = current.email.trim();

    if (name.length < 2) {
      setEditError('El nombre debe tener al menos 2 caracteres.');
      return null;
    }

    if (!email.includes('@')) {
      setEditError('Ingresa un correo válido.');
      return null;
    }

    return {
      name,
      email,
      isAdmin: current.isAdmin,
    };
  };

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    const validated = validateEditForm();
    if (!validated) return;

    setEditBusy(true);
    setEditError(null);
    setActionError(null);

    try {
      const isSelf = target.id === authUserId();
      const emailChanged = validated.email !== target.email;

      await updateAppUser(target.id, {
        ...validated,
        email: target.email,
      });

      if (emailChanged) {
        if (!isSelf) {
          setActionError(
            'No se cambió el correo: el correo de otros usuarios se gestiona desde PocketBase Admin.',
          );
        } else {
          await requestAuthenticatedUserEmailChange(validated.email);
          setActionError(
            'Se envió una solicitud de cambio de correo. Debes confirmar el enlace recibido para completar el cambio.',
          );
        }
      }

      await refetch();
      setEditTarget(null);
      setEditForm(emptyEditForm);
      setEditError(null);
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setEditBusy(false);
    }
  };

  const openDeleteModal = (user: AppUserRecord) => {
    setDeleteTarget(user);
    setActionError(null);
  };

  const closeDeleteModal = () => {
    if (deleteBusy()) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;

    if (target.id === authUserId()) {
      setActionError('No puedes eliminar tu propio usuario.');
      setDeleteTarget(null);
      return;
    }

    setDeleteBusy(true);
    setActionError(null);

    try {
      await deleteAppUser(target.id);
      await refetch();
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const userRows = () => users() ?? [];
  const isEditingSelf = () => editTarget()?.id === authUserId();

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-6xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de usuarios</h1>
            <p class="mt-1 text-sm text-gray-600">
              Administra los usuarios de la aplicación y sus permisos.
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/staff-management')}
          >
            Volver
          </button>
        </div>

        <Show when={actionError()}>
          <p class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError()}
          </p>
        </Show>

        <div class="mt-5 overflow-x-auto">
          <table class="min-w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-yellow-200 text-left">
                <th class="px-3 py-2 font-medium text-gray-700">Nombre</th>
                <th class="px-3 py-2 font-medium text-gray-700">Admin</th>
                <th class="px-3 py-2 font-medium text-gray-700">Correo</th>
                <th class="px-3 py-2 font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!users.loading} fallback={<tr><td class="px-3 py-4 text-gray-500" colSpan={4}>Cargando usuarios...</td></tr>}>
                <Show
                  when={userRows().length > 0}
                  fallback={
                    <tr>
                      <td class="px-3 py-4 text-gray-500" colSpan={4}>
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  }
                >
                  <For each={userRows()}>
                    {(user) => {
                      const isSelf = () => user.id === authUserId();

                      return (
                        <tr class="border-b border-yellow-100">
                          <td class="px-3 py-2">{formatText(user.name)}</td>
                          <td class="px-3 py-2">
                            <span
                              class="inline-flex rounded-full px-2 py-1 text-xs font-medium"
                              classList={{
                                'bg-emerald-100 text-emerald-800': user.isAdmin,
                                'bg-gray-100 text-gray-700': !user.isAdmin,
                              }}
                            >
                              {user.isAdmin ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td class="px-3 py-2">{formatText(user.email)}</td>
                          <td class="px-3 py-2">
                            <div class="flex flex-wrap gap-2">
                              <button
                                type="button"
                                class="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                                onClick={() => openEditModal(user)}
                                aria-label={`Editar usuario ${user.name}`}
                              >
                                Editar
                              </button>

                              <Show
                                when={!isSelf()}
                                fallback={
                                  <span class="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500">
                                    Tu usuario
                                  </span>
                                }
                              >
                                <button
                                  type="button"
                                  class="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                                  onClick={() => openDeleteModal(user)}
                                  aria-label={`Eliminar usuario ${user.name}`}
                                >
                                  Eliminar
                                </button>
                              </Show>
                            </div>
                          </td>
                        </tr>
                      );
                    }}
                  </For>
                </Show>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={editTarget() !== null}
        title="Editar usuario"
        description="Actualiza los datos del usuario seleccionado."
        confirmLabel="Guardar cambios"
        busy={editBusy()}
        onConfirm={submitEdit}
        onClose={closeEditModal}
      >
        <div class="space-y-3">
          <Show when={editError()}>
            <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError()}
            </p>
          </Show>

          <label class="block text-sm text-gray-700" for="edit-user-name">
            Nombre
          </label>
          <input
            id="edit-user-name"
            type="text"
            class="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm"
            value={editForm().name}
            onInput={(event) => setEditField('name', event.currentTarget.value)}
          />

          <label class="block text-sm text-gray-700" for="edit-user-email">
            Correo
          </label>
          <input
            id="edit-user-email"
            type="email"
            class="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm"
            value={editForm().email}
            onInput={(event) => setEditField('email', event.currentTarget.value)}
            disabled={!isEditingSelf()}
          />
          <Show when={!isEditingSelf()}>
            <p class="text-xs text-gray-500">
              El correo de otros usuarios se gestiona desde PocketBase Admin.
            </p>
          </Show>

          <label class="flex items-center gap-2 text-sm text-gray-700" for="edit-user-is-admin">
            <input
              id="edit-user-is-admin"
              type="checkbox"
              checked={editForm().isAdmin}
              onInput={(event) => setEditField('isAdmin', event.currentTarget.checked)}
            />
            Es administrador
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Eliminar usuario"
        description={`Esta acción eliminará el usuario ${deleteTarget()?.name ?? ''}.`}
        confirmLabel="Eliminar"
        busy={deleteBusy()}
        variant="danger"
        onConfirm={confirmDelete}
        onClose={closeDeleteModal}
      />
    </section>
  );
}
