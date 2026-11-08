import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { redirect } from "next/navigation";
import type { FunctionReference, FunctionReturnType } from "convex/server";

export async function getAuthTokenOrRedirect() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/login");
  }
  return token;
}

export async function fetchAuthQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"] = {}
): Promise<FunctionReturnType<Query>> {
  const token = await getAuthTokenOrRedirect();
  return await fetchQuery(query, args, { token });
}

export async function fetchAuthMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  args: Mutation["_args"] = {}
): Promise<FunctionReturnType<Mutation>> {
  const token = await getAuthTokenOrRedirect();
  return await fetchMutation(mutation, args, { token });
}
