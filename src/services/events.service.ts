import { server$ } from "@builder.io/qwik-city";
import { getSupabase } from "./supabase.service";
import { GuardianResponse } from "~/types/enrollment.types";

export const getGuardians = server$(async function() {
  const { data, error } = await getSupabase().from("guardians").select();
  if (error) {
    console.error(`Unable to get guardians:\n`, error);
    return [];
  }

  return data.map(guardian => {
    return {
      id: guardian.id,
      name: guardian.name,
      documentNumber: guardian.document_number,
      phone: guardian.phone,
      profession: guardian.profession,
      company: guardian.company,
      email: guardian.email,
      address: guardian.address,
      typeId: guardian.type_id,

    } as GuardianResponse;
  }) as GuardianResponse[];
});

export const sendNotification = server$(async function(to: string[], subject: string, body: string) {
  const url = "https://api.emailjs.com/api/v1.0/email/send";
  const token = this.env.get("EMAILJS_API_KEY");
  const userId = this.env.get("EMAILJS_USER_ID");
  if (!token || !userId) {
    throw new Error("EMAILJS_API_KEY not found");
  }


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'service_4jra50v',
        template_id: 'template_6wsrreq',
        user_id: userId,
        accessToken: token,
        template_params: {
          'body': body,
          'email': to,
          'subject': subject
        }
      }),
    });
    return await response.text();
  } catch (error) {
    console.error(error);
  }
});
