import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import PaginationControls from '../../components/PaginationControls';
import SortableHeaderCell from '../../components/SortableHeaderCell';
import Modal from '../../components/Modal';
import { toggleSort, type SortState } from '../../lib/table/sorting';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../../lib/table/pagination';
import { canAccessModule } from '../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../lib/pocketbase/errors';
import {
  listPendingEnrollmentRequests,
  acceptEnrollmentRequest,
  rejectEnrollmentRequest,
  type EnrollmentRequestSortField,
  type EnrollmentRequestRecord,
} from '../../lib/pocketbase/students';

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

function formatNames(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

type RequestSortKey = EnrollmentRequestSortField;

export default function EnrollmentRequestsPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = createSignal(1);
  const [sort, setSort] = createSignal<SortState<RequestSortKey>>({
    key: 'name',
    direction: 'asc',
  });
  const [actionBusy, setActionBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [rejectTarget, setRejectTarget] = createSignal<EnrollmentRequestRecord | null>(null);
  const [rejectBusy, setRejectBusy] = createSignal(false);

  const [requests, { refetch }] = createResource(
    () => {
      if (!canAccessModule('enrollment')) return undefined;
      console.log("enabled");

      return {
        page: currentPage(),
        sortField: sort().key,
        sortDirection: sort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listPendingEnrollmentRequests(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  createEffect(() => {
    if (!canAccessModule('enrollment')) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const rows = () => requests()?.items ?? [];
  const pageCurrent = () => requests()?.page ?? 1;
  const totalPages = () => requests()?.totalPages ?? 1;

  const handleSort = (key: RequestSortKey) => {
    setSort((current) => toggleSort(current, key));
    setCurrentPage(1);
  };

  const handleAccept = async (request: EnrollmentRequestRecord) => {
    setActionBusy(true);
    setActionError(null);

    try {
      await acceptEnrollmentRequest(request.id);
      await refetch();
      const total = requests()?.totalPages ?? 1;
      if (currentPage() > total) {
        setCurrentPage(clampPage(currentPage(), total));
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  };

  const confirmReject = async () => {
    const target = rejectTarget();
    if (!target) return;

    setRejectBusy(true);
    setActionError(null);

    try {
      await rejectEnrollmentRequest(target.id);
      await refetch();
      const total = requests()?.totalPages ?? 1;
      if (currentPage() > total) {
        setCurrentPage(clampPage(currentPage(), total));
      }
      setRejectTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setRejectBusy(false);
    }
  };

  const closeRejectModal = () => {
    if (rejectBusy()) return;
    setRejectTarget(null);
  };

  const busy = () => requests.loading || actionBusy() || rejectBusy();

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-[1280px] rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Solicitudes de inscripción</h1>
            <p class="mt-1 text-sm text-gray-600">
              Revisa y gestiona las solicitudes de inscripción pendientes.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/enrollment-management')}
            >
              Volver
            </button>
          </div>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[1100px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Nombre"
                  columnKey="name"
                  sort={sort()}
                  onSort={handleSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Documento"
                  columnKey="document_id"
                  sort={sort()}
                  onSort={handleSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Grado"
                  columnKey="grade_name"
                  sort={sort()}
                  onSort={handleSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Lugar de nacimiento"
                  columnKey="birth_place"
                  sort={sort()}
                  onSort={handleSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Departamento"
                  columnKey="department"
                  sort={sort()}
                  onSort={handleSort}
                />
                <th class="px-4 py-3 font-semibold">Tutor</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!requests.loading} fallback={
                <tr>
                  <td class="px-4 py-4 text-gray-600" colSpan={7}>
                    Cargando solicitudes...
                  </td>
                </tr>
              }>
                <Show when={!requests.error} fallback={
                  <tr>
                    <td class="px-4 py-4 text-red-700" colSpan={7}>
                      {getErrorMessage(requests.error)}
                    </td>
                  </tr>
                }>
                  <Show
                    when={rows().length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={7}>
                          No hay solicitudes pendientes.
                        </td>
                      </tr>
                    }
                  >
                    <For each={rows()}>
                      {(request) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{formatText(request.name)}</td>
                          <td class="px-4 py-3">{formatText(request.document_id)}</td>
                          <td class="px-4 py-3">{formatText(request.grade_name)}</td>
                          <td class="px-4 py-3">{formatText(request.birth_place)}</td>
                          <td class="px-4 py-3">{formatText(request.department)}</td>
                          <td class="px-4 py-3">{formatNames(request.father_names)}</td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Aceptar solicitud de ${request.name}`}
                                disabled={busy()}
                                onClick={() => handleAccept(request)}
                              >
                                <i class="bi bi-check-lg" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Rechazar solicitud de ${request.name}`}
                                disabled={busy()}
                                onClick={() => setRejectTarget(request)}
                              >
                                <i class="bi bi-x-lg" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </Show>
              </Show>
            </tbody>
          </table>
        </div>
        <PaginationControls
          class="mt-3 flex items-center justify-between"
          page={pageCurrent()}
          totalPages={totalPages()}
          busy={busy()}
          onPageChange={(nextPage) => setCurrentPage(nextPage)}
        />
      </div>

      <Modal
        open={rejectTarget() !== null}
        title="Rechazar solicitud"
        description={`Esta acción rechazará la solicitud de inscripción de ${rejectTarget()?.name || ''}. Esta acción no se puede deshacer.`}
        confirmLabel="Rechazar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={rejectBusy()}
        onConfirm={confirmReject}
        onClose={closeRejectModal}
      />
    </section>
  );
}
