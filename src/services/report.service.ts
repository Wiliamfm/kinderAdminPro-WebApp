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

export const getBulletin = server$(async function(id: number) {
  const { data, error } = await getSupabase().from("bulletins").select("*").eq("id", id).single();
  if (error) {
    console.error("Unable to get bulletin: ", error);
    return null;
  }

  return data as Bulletin;
});

export const createBulletin = server$(async function(name: string, type: string) {
  const { data, error } = await getSupabase().from("bulletins").insert({
    name: name,
    type: type,
  }).select().single();
  if (error) {
    console.error("Unable to create bulletin.");
    return null;
  }

  return data as Bulletin;
});

export const updateBulletin = server$(async function(id: number, name: string, type: string) {
  const bulletin = await getBulletin(id);
  if (!bulletin) {
    return null;
  }

  const { data, error } = await getSupabase().from("bulletins").update({
    name: name,
    type: type,
  }).eq("id", id).select().single();
  if (error) {
    console.error("Unable to update bulletin: ", error);
    return null;
  }

  return data as Bulletin;
});
