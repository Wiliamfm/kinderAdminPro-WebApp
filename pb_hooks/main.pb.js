routerAdd("POST", "/api/tesis/event-email-messaging/send", (e) => {
  function toStringValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function toBooleanValue(value) {
    return value === true;
  }

  function escapeHtml(value) {
    return toStringValue(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildBodyHtml(value) {
    const normalized = toStringValue(value).replace(/\r\n/g, "\n");
    if (!normalized) {
      return "<p></p>";
    }

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
      .join("");
  }

  function normalizeIdArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const seen = {};
    const result = [];
    for (let i = 0; i < value.length; i += 1) {
      const normalized = toStringValue(value[i]);
      if (!normalized || seen[normalized]) {
        continue;
      }

      seen[normalized] = true;
      result.push(normalized);
    }

    return result;
  }

  function normalizeSources(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const seen = {};
    const result = [];
    for (let i = 0; i < value.length; i += 1) {
      const current = value[i] || {};
      const kind = toStringValue(current.kind);
      const id = toStringValue(current.id);
      const label = toStringValue(current.label);
      if (!kind || !id) {
        continue;
      }

      const sourceKey = `${kind}:${id}`;
      if (seen[sourceKey]) {
        continue;
      }

      seen[sourceKey] = true;
      result.push({
        kind: kind === "student" || kind === "grade" ? kind : "employee",
        id: id,
        label: label || id,
      });
    }

    return result;
  }

  function deriveSourceKind(sources) {
    if (!sources.length) {
      return "mixed";
    }

    let currentKind = sources[0].kind;
    for (let i = 1; i < sources.length; i += 1) {
      if (sources[i].kind !== currentKind) {
        return "mixed";
      }
    }

    return currentKind;
  }

  function normalizeRecipient(input) {
    const recipientType = toStringValue(input.recipientType) === "father" ? "father" : "employee";
    const recipientId = toStringValue(input.recipientId);
    const recipientName = toStringValue(input.recipientName);
    const recipientEmail = toStringValue(input.recipientEmail);
    const sources = normalizeSources(input.sources);

    return {
      recipientType,
      recipientId,
      recipientName,
      recipientEmail,
      sources,
      studentIds: normalizeIdArray(
        sources.filter((source) => source.kind === "student").map((source) => source.id),
      ),
      gradeIds: normalizeIdArray(
        sources.filter((source) => source.kind === "grade").map((source) => source.id),
      ),
    };
  }

  function requireAdminAuth() {
    if (!e.auth || !toBooleanValue(e.auth.get("is_admin"))) {
      throw new ForbiddenError("Solo los administradores pueden enviar correos.");
    }

    return e.auth;
  }

  function createRecord(collectionName, data) {
    const collection = $app.findCollectionByNameOrId(collectionName);
    const record = new Record(collection);

    Object.keys(data).forEach((key) => {
      record.set(key, data[key]);
    });

    $app.save(record);
    return record;
  }

  function updateRecord(record, data) {
    Object.keys(data).forEach((key) => {
      record.set(key, data[key]);
    });

    $app.save(record);
    return record;
  }

  function findRecordById(collectionName, recordId) {
    try {
      return $app.findRecordById(collectionName, recordId);
    } catch {
      return null;
    }
  }

  function validateFatherSources(fatherId, studentIds, gradeIds) {
    if (!studentIds.length && !gradeIds.length) {
      return false;
    }

    let links = [];
    try {
      links = $app.findRecordsByFilter(
        "students_fathers",
        "father_id = {:fatherId}",
        "created_at,id",
        500,
        0,
        { fatherId },
      );
    } catch {
      return false;
    }

    for (let i = 0; i < links.length; i += 1) {
      const studentId = toStringValue(links[i].get("student_id"));
      if (!studentId) {
        continue;
      }

      const studentRecord = findRecordById("students", studentId);
      if (!studentRecord || !toBooleanValue(studentRecord.get("active"))) {
        continue;
      }

      const gradeId = toStringValue(studentRecord.get("grade_id"));
      if (studentIds.indexOf(studentId) !== -1 || gradeIds.indexOf(gradeId) !== -1) {
        return true;
      }
    }

    return false;
  }

  function resolveRecipientSnapshot(recipient) {
    const fallback = {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      recipientName: recipient.recipientName || recipient.recipientId,
      recipientEmail: recipient.recipientEmail,
      sourceKind: deriveSourceKind(recipient.sources),
      sourceContext: JSON.stringify(recipient.sources),
      status: "skipped",
      providerMessageId: "",
      errorMessage: "",
    };

    if (!recipient.recipientId) {
      return {
        ok: false,
        data: {
          ...fallback,
          errorMessage: "El destinatario no es válido.",
        },
      };
    }

    if (recipient.recipientType === "employee") {
      const employeeRecord = findRecordById("employees", recipient.recipientId);
      if (!employeeRecord || !toBooleanValue(employeeRecord.get("active"))) {
        return {
          ok: false,
          data: {
            ...fallback,
            errorMessage: "El empleado ya no está activo o no existe.",
          },
        };
      }

      return {
        ok: true,
        data: {
          ...fallback,
          recipientName: toStringValue(employeeRecord.get("name")) || fallback.recipientName,
          recipientEmail: toStringValue(employeeRecord.get("email")) || fallback.recipientEmail,
          status: "pending",
          errorMessage: "",
        },
      };
    }

    const fatherRecord = findRecordById("fathers", recipient.recipientId);
    if (!fatherRecord || !toBooleanValue(fatherRecord.get("is_active"))) {
      return {
        ok: false,
        data: {
          ...fallback,
          errorMessage: "El padre o tutor ya no está activo o no existe.",
        },
      };
    }

    if (!validateFatherSources(recipient.recipientId, recipient.studentIds, recipient.gradeIds)) {
      return {
        ok: false,
        data: {
          ...fallback,
          recipientName: toStringValue(fatherRecord.get("full_name")) || fallback.recipientName,
          recipientEmail: toStringValue(fatherRecord.get("email")) || fallback.recipientEmail,
          errorMessage: "El padre o tutor ya no coincide con los filtros seleccionados.",
        },
      };
    }

    return {
      ok: true,
      data: {
        ...fallback,
        recipientName: toStringValue(fatherRecord.get("full_name")) || fallback.recipientName,
        recipientEmail: toStringValue(fatherRecord.get("email")) || fallback.recipientEmail,
        status: "pending",
        errorMessage: "",
      },
    };
  }

  function sendWithResend(apiKey, fromValue, subject, bodyText, bodyHtml, recipientEmail) {
    const response = $http.send({
      url: "https://api.resend.com/emails",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromValue,
        to: [recipientEmail],
        subject: subject,
        text: bodyText,
        html: bodyHtml,
      }),
      timeout: 120,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = "Resend rechazó la solicitud.";

      if (response.json && typeof response.json.message === "string") {
        errorMessage = response.json.message;
      } else if (response.body) {
        errorMessage = toString(response.body) || errorMessage;
      }

      throw new Error(errorMessage);
    }

    return response.json && typeof response.json.id === "string" ? response.json.id : "";
  }

  const authRecord = requireAdminAuth();

  let body = {};
  try {
    const rawBody = toString(e.request.body) || "{}";
    body = JSON.parse(rawBody);
  } catch {
    throw new BadRequestError("El cuerpo de la solicitud es inválido.");
  }

  const subject = toStringValue(body.subject);
  const bodyText = toStringValue(body.bodyText);
  const bodyHtml = toStringValue(body.bodyHtml) || buildBodyHtml(bodyText);
  const inputRecipients = Array.isArray(body.recipients) ? body.recipients : [];

  if (subject.length < 3) {
    throw new BadRequestError("El asunto debe tener al menos 3 caracteres.");
  }

  if (!bodyText) {
    throw new BadRequestError("El cuerpo del correo es obligatorio.");
  }

  const normalizedRecipients = [];
  const seenRecipients = {};
  for (let i = 0; i < inputRecipients.length; i += 1) {
    const normalizedRecipient = normalizeRecipient(inputRecipients[i] || {});
    const recipientKey = `${normalizedRecipient.recipientType}:${normalizedRecipient.recipientId}`;
    if (!normalizedRecipient.recipientId || seenRecipients[recipientKey]) {
      continue;
    }

    seenRecipients[recipientKey] = true;
    normalizedRecipients.push(normalizedRecipient);
  }

  if (!normalizedRecipients.length) {
    throw new BadRequestError("Selecciona al menos un destinatario.");
  }

  const resendApiKey = toStringValue($os.getenv("RESEND_API_KEY"));
  const resendFromEmail = toStringValue($os.getenv("RESEND_FROM_EMAIL"));
  const resendFromName = toStringValue($os.getenv("RESEND_FROM_NAME"));

  if (!resendApiKey || !resendFromEmail) {
    throw new InternalServerError("La integración de correo no está configurada.");
  }

  const resendFrom = resendFromName
    ? `${resendFromName} <${resendFromEmail}>`
    : resendFromEmail;

  const messageRecord = createRecord("email_messages", {
    subject: subject,
    body_text: bodyText,
    body_html: bodyHtml,
    created_by: authRecord.id,
    total_resolved: normalizedRecipients.length,
    total_sendable: 0,
    total_missing_email: 0,
    total_sent: 0,
    total_failed: 0,
    total_skipped: 0,
  });

  let totalSendable = 0;
  let totalMissingEmail = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const responseRecipients = [];

  for (let i = 0; i < normalizedRecipients.length; i += 1) {
    const resolved = resolveRecipientSnapshot(normalizedRecipients[i]);
    const snapshot = resolved.data;

    let recipientRecord = createRecord("email_message_recipients", {
      message_id: messageRecord.id,
      recipient_type: snapshot.recipientType,
      recipient_id: snapshot.recipientId,
      recipient_name: snapshot.recipientName,
      recipient_email: snapshot.recipientEmail,
      source_kind: snapshot.sourceKind,
      source_context: snapshot.sourceContext,
      status: snapshot.status,
      provider_message_id: "",
      error_message: snapshot.errorMessage,
    });

    if (!resolved.ok) {
      totalSkipped += 1;
      responseRecipients.push({
        recipientType: snapshot.recipientType,
        recipientId: snapshot.recipientId,
        recipientName: snapshot.recipientName,
        recipientEmail: snapshot.recipientEmail,
        status: "skipped",
        errorMessage: snapshot.errorMessage,
        providerMessageId: "",
      });
      continue;
    }

    if (!snapshot.recipientEmail) {
      recipientRecord = updateRecord(recipientRecord, {
        status: "missing_email",
        error_message: "El destinatario no tiene correo registrado.",
      });

      totalMissingEmail += 1;
      responseRecipients.push({
        recipientType: snapshot.recipientType,
        recipientId: snapshot.recipientId,
        recipientName: snapshot.recipientName,
        recipientEmail: snapshot.recipientEmail,
        status: "missing_email",
        errorMessage: toStringValue(recipientRecord.get("error_message")),
        providerMessageId: "",
      });
      continue;
    }

    totalSendable += 1;

    try {
      const providerMessageId = sendWithResend(
        resendApiKey,
        resendFrom,
        subject,
        bodyText,
        bodyHtml,
        snapshot.recipientEmail,
      );

      recipientRecord = updateRecord(recipientRecord, {
        status: "sent",
        provider_message_id: providerMessageId,
        error_message: "",
      });
      totalSent += 1;
      responseRecipients.push({
        recipientType: snapshot.recipientType,
        recipientId: snapshot.recipientId,
        recipientName: snapshot.recipientName,
        recipientEmail: snapshot.recipientEmail,
        status: "sent",
        errorMessage: "",
        providerMessageId: providerMessageId,
      });
    } catch (err) {
      const errorMessage = err && err.message ? String(err.message) : "No se pudo enviar el correo.";

      recipientRecord = updateRecord(recipientRecord, {
        status: "failed",
        error_message: errorMessage,
      });
      totalFailed += 1;
      responseRecipients.push({
        recipientType: snapshot.recipientType,
        recipientId: snapshot.recipientId,
        recipientName: snapshot.recipientName,
        recipientEmail: snapshot.recipientEmail,
        status: "failed",
        errorMessage: errorMessage,
        providerMessageId: "",
      });
      $app.logger().error("Event email delivery failed", "messageId", messageRecord.id, "recipientId", snapshot.recipientId, "error", errorMessage);
    }
  }

  updateRecord(messageRecord, {
    total_sendable: totalSendable,
    total_missing_email: totalMissingEmail,
    total_sent: totalSent,
    total_failed: totalFailed,
    total_skipped: totalSkipped,
  });

  return e.json(200, {
    messageId: messageRecord.id,
    totalResolved: normalizedRecipients.length,
    totalSendable: totalSendable,
    totalMissingEmail: totalMissingEmail,
    totalSent: totalSent,
    totalFailed: totalFailed,
    totalSkipped: totalSkipped,
    recipients: responseRecipients,
  });
}, $apis.requireAuth());
