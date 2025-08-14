import { server$ } from "@builder.io/qwik-city";
import { getSupabase } from "./supabase.service";
import { Bulletin } from "~/types/report.types";

export const getBulletins = server$(async function() {
  const { data, error } = await getSupabase().from("bulletins").select("*");
  if (error) {
    console.error("Unable to get bulletin data: ", error)
    return null;
  }
  console.log(data);;

  return data.map(bulletin => {
    return {
      id: bulletin.id,
      type: bulletin.type,
      name: bulletin.name
    } as Bulletin;
  });
});

export const deleteBulletin = server$(async function(id: number) {
  const response = await getSupabase().from("bulletins").delete().eq("id", id);
  if (response.error && response.status !== 204) {
    return false;
  }

  return true;
});
