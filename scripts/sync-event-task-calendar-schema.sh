#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
PB_URL="${VITE_PB_URL:-http://127.0.0.1:8090}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env file at ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  grep "^${key}=" "${ENV_FILE}" | cut -d= -f2-
}

BASE_ADMIN_EMAIL="$(read_env_value BASE_ADMIN_EMAIL)"
BASE_ADMIN_PASSWORD="$(read_env_value BASE_ADMIN_PASSWORD)"

if [[ -z "${BASE_ADMIN_EMAIL}" || -z "${BASE_ADMIN_PASSWORD}" ]]; then
  echo "BASE_ADMIN_EMAIL and BASE_ADMIN_PASSWORD must be set in .env." >&2
  exit 1
fi

auth_json="$(
  curl -sS \
    -H 'Content-Type: application/json' \
    -d "{\"identity\":\"${BASE_ADMIN_EMAIL}\",\"password\":\"${BASE_ADMIN_PASSWORD}\"}" \
    "${PB_URL}/api/collections/_superusers/auth-with-password"
)"

PB_TOKEN="$(echo "${auth_json}" | jq -r '.token // empty')"

if [[ -z "${PB_TOKEN}" ]]; then
  echo "Failed to authenticate against PocketBase." >&2
  exit 1
fi

pb_api() {
  local method="$1"
  local path="$2"
  local data="${3-}"

  if [[ -n "${data}" ]]; then
    curl -sS \
      -X "${method}" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${PB_TOKEN}" \
      -d "${data}" \
      "${PB_URL}${path}"
  else
    curl -sS \
      -X "${method}" \
      -H "Authorization: Bearer ${PB_TOKEN}" \
      "${PB_URL}${path}"
  fi
}

refresh_collections() {
  COLLECTIONS_JSON="$(pb_api GET '/api/collections?perPage=200')"
}

collection_id_by_name() {
  local collection_name="$1"
  echo "${COLLECTIONS_JSON}" | jq -r --arg name "${collection_name}" '.items[] | select(.name == $name) | .id' | head -n 1
}

ensure_collection_absent() {
  local collection_name="$1"
  if [[ -n "$(collection_id_by_name "${collection_name}")" ]]; then
    echo "Collection '${collection_name}' already exists. Skipping creation."
    return 1
  fi
  return 0
}

refresh_collections

EMPLOYEES_COLLECTION_ID="$(collection_id_by_name employees)"
USERS_COLLECTION_ID="_pb_users_auth_"

if [[ -z "${EMPLOYEES_COLLECTION_ID}" ]]; then
  echo "Could not resolve the employees collection id." >&2
  exit 1
fi

if ensure_collection_absent "events"; then
  EVENTS_PAYLOAD="$(
    jq -n --arg usersId "${USERS_COLLECTION_ID}" '
      {
        name: "events",
        type: "base",
        listRule: "@request.auth.is_admin = true",
        viewRule: "@request.auth.is_admin = true",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
        indexes: [
          "CREATE INDEX idx_events_start_datetime ON events (start_datetime)",
          "CREATE INDEX idx_events_end_datetime ON events (end_datetime)",
          "CREATE INDEX idx_events_kind_status ON events (kind, status)"
        ],
        fields: [
          {
            name: "title",
            type: "text",
            required: true,
            min: 2,
            max: 200,
            pattern: ""
          },
          {
            name: "description",
            type: "text",
            required: false,
            min: 0,
            max: 0,
            pattern: ""
          },
          {
            name: "start_datetime",
            type: "date",
            required: true,
            min: "",
            max: ""
          },
          {
            name: "end_datetime",
            type: "date",
            required: true,
            min: "",
            max: ""
          },
          {
            name: "is_all_day",
            type: "bool",
            required: false
          },
          {
            name: "kind",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["event", "task"]
          },
          {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["planned", "done", "cancelled"]
          },
          {
            name: "created_by",
            type: "relation",
            required: true,
            collectionId: $usersId,
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          },
          {
            name: "updated_by",
            type: "relation",
            required: true,
            collectionId: $usersId,
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          },
          {
            name: "created_at",
            type: "autodate",
            onCreate: true,
            onUpdate: false
          },
          {
            name: "updated_at",
            type: "autodate",
            onCreate: true,
            onUpdate: true
          },
          {
            name: "is_deleted",
            type: "bool",
            required: false
          }
        ]
      }
    '
  )"

  EVENTS_RESPONSE="$(pb_api POST '/api/collections' "${EVENTS_PAYLOAD}")"
  if ! echo "${EVENTS_RESPONSE}" | jq -e '.name == "events"' >/dev/null 2>&1; then
    echo "Failed to create collection 'events'." >&2
    echo "${EVENTS_RESPONSE}" >&2
    exit 1
  fi
  echo "Created collection 'events'."
  refresh_collections
fi

EVENTS_COLLECTION_ID="$(collection_id_by_name events)"

if [[ -z "${EVENTS_COLLECTION_ID}" ]]; then
  echo "Could not resolve the events collection id after creation." >&2
  exit 1
fi

if ensure_collection_absent "event_assignments"; then
  EVENT_ASSIGNMENTS_PAYLOAD="$(
    jq -n \
      --arg eventsId "${EVENTS_COLLECTION_ID}" \
      --arg employeesId "${EMPLOYEES_COLLECTION_ID}" '
      {
        name: "event_assignments",
        type: "base",
        listRule: "@request.auth.is_admin = true",
        viewRule: "@request.auth.is_admin = true",
        createRule: "@request.auth.is_admin = true",
        updateRule: "@request.auth.is_admin = true",
        deleteRule: "@request.auth.is_admin = true",
        indexes: [
          "CREATE UNIQUE INDEX idx_event_assignments_event_employee ON event_assignments (event_id, employee_id)",
          "CREATE INDEX idx_event_assignments_employee_id ON event_assignments (employee_id)",
          "CREATE INDEX idx_event_assignments_created_at ON event_assignments (created_at)"
        ],
        fields: [
          {
            name: "event_id",
            type: "relation",
            required: true,
            collectionId: $eventsId,
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          },
          {
            name: "employee_id",
            type: "relation",
            required: true,
            collectionId: $employeesId,
            cascadeDelete: false,
            minSelect: 1,
            maxSelect: 1,
            displayFields: null
          },
          {
            name: "created_at",
            type: "autodate",
            onCreate: true,
            onUpdate: false
          }
        ]
      }
    '
  )"

  EVENT_ASSIGNMENTS_RESPONSE="$(pb_api POST '/api/collections' "${EVENT_ASSIGNMENTS_PAYLOAD}")"
  if ! echo "${EVENT_ASSIGNMENTS_RESPONSE}" | jq -e '.name == "event_assignments"' >/dev/null 2>&1; then
    echo "Failed to create collection 'event_assignments'." >&2
    echo "${EVENT_ASSIGNMENTS_RESPONSE}" >&2
    exit 1
  fi
  echo "Created collection 'event_assignments'."
  refresh_collections
fi

echo "Event/task calendar schema is ready."
