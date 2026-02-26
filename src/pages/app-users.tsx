import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import SortableHeaderCell from '../components/SortableHeaderCell';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { toggleSort, type SortState } from '../lib/table/sorting';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  deleteAppUser,
  getAuthUserId,
  listAppUsersPage,
  requestAuthenticatedUserEmailChange,
  type AppUserListSortField,
  type AppUserRecord,
  updateAppUser,
} from '../lib/pocketbase/users';

type UserEditForm = {
  name: string;
  email: string;
  isAdmin: boolean;
};

const EDIT_FIELDS = ['name', 'email'] as const;
type EditField = (typeof EDIT_FIELDS)[number];

const emptyEditForm: UserEditForm = {
  name: '',
  email: '',
  isAdmin: false,
};

function validateEditForm(current: UserEditForm): FieldErrorMap<EditField> {
  const errors: FieldErrorMap<EditField> = {};
  const name = current.name.trim();
  const email = current.email.trim();

  if (name.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  }

  if (!email.includes('@')) {
    errors.email = 'Ingresa un correo válido.';
  }

  return errors;
}

function buildUpdatePayload(current: UserEditForm): UserEditForm {
  return {
    name: current.name.trim(),
    email: current.email.trim(),
    isAdmin: current.isAdmin,
  };
}

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

type UserSortKey = AppUserListSortField;

export default function AppUsersPage() {
  const navigate = useNavigate();
  const [userPage, setUserPage] = createSignal(1);

  const [editTarget, setEditTarget] = createSignal<AppUserRecord | null>(null);
  const [editForm, setEditForm] = createSignal<UserEditForm>(emptyEditForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(EDIT_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<AppUserRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [userSort, setUserSort] = createSignal<SortState<UserSortKey>>({
    key: 'name',
    direction: 'asc',
  });
  const [users, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;

      return {
        page: userPage(),
        sortField: userSort().key,
        sortDirection: userSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listAppUsersPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

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
    setEditTouched(createInitialTouchedMap(EDIT_FIELDS));
    setEditError(null);
    setActionError(null);
  };

  const closeEditModal = () => {
    if (editBusy()) return;
    setEditTarget(null);
    setEditForm(emptyEditForm);
    setEditTouched(createInitialTouchedMap(EDIT_FIELDS));
    setEditError(null);
  };

  const setEditField = <K extends keyof UserEditForm>(field: K, value: UserEditForm[K]) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (field === 'name' || field === 'email') {
      setEditTouched((current) => touchField(current, field));
    }
    setEditError(null);
  };

  const editFieldErrors = createMemo(() => validateEditForm(editForm()));
  const editNameError = () => (editTouched().name ? editFieldErrors().name : undefined);
  const editEmailError = () => (editTouched().email ? editFieldErrors().email : undefined);

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    const touched = touchAllFields(editTouched());
    setEditTouched(touched);
    if (hasAnyError(editFieldErrors())) return;
    const validated = buildUpdatePayload(editForm());

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
      const totalPages = users()?.totalPages ?? 1;
      if (userPage() > totalPages) {
        setUserPage(clampPage(userPage(), totalPages));
      }
      setEditTarget(null);
      setEditForm(emptyEditForm);
      setEditTouched(createInitialTouchedMap(EDIT_FIELDS));
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
      const totalPages = users()?.totalPages ?? 1;
      if (userPage() > totalPages) {
        setUserPage(clampPage(userPage(), totalPages));
      }
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const userRows = () => users()?.items ?? [];
  const userCurrentPage = () => users()?.page ?? 1;
  const userTotalPages = () => users()?.totalPages ?? 1;
  const handleUserSort = (key: UserSortKey) => {
    setUserSort((current) => toggleSort(current, key));
    setUserPage(1);
  };
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
                <SortableHeaderCell
                  class="px-3 py-2 font-medium text-gray-700"
                  label="Nombre"
                  columnKey="name"
                  sort={userSort()}
                  onSort={handleUserSort}
                />
                <SortableHeaderCell
                  class="px-3 py-2 font-medium text-gray-700"
                  label="Admin"
                  columnKey="isAdmin"
                  sort={userSort()}
                  onSort={handleUserSort}
                />
                <SortableHeaderCell
                  class="px-3 py-2 font-medium text-gray-700"
                  label="Correo"
                  columnKey="email"
                  sort={userSort()}
                  onSort={handleUserSort}
                />
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
        <PaginationControls
          class="mt-3 flex items-center justify-between"
          page={userCurrentPage()}
          totalPages={userTotalPages()}
          busy={users.loading || editBusy() || deleteBusy()}
          onPageChange={(nextPage) => setUserPage(nextPage)}
        />
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
            classList={{ 'field-input-invalid': !!editNameError() }}
            value={editForm().name}
            onInput={(event) => setEditField('name', event.currentTarget.value)}
            aria-invalid={!!editNameError()}
            aria-describedby={editNameError() ? 'edit-user-name-error' : undefined}
          />
          <InlineFieldAlert id="edit-user-name-error" message={editNameError()} />

          <label class="block text-sm text-gray-700" for="edit-user-email">
            Correo
          </label>
          <input
            id="edit-user-email"
            type="email"
            class="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm"
            classList={{ 'field-input-invalid': !!editEmailError() }}
            value={editForm().email}
            onInput={(event) => setEditField('email', event.currentTarget.value)}
            disabled={!isEditingSelf()}
            aria-invalid={!!editEmailError()}
            aria-describedby={editEmailError() ? 'edit-user-email-error' : undefined}
          />
          <InlineFieldAlert id="edit-user-email-error" message={editEmailError()} />
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
