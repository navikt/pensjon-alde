import {authenticator, returnToCookie} from '~/auth/auth.server'
import {type ActionFunctionArgs} from "react-router";
import {isLocalEnv} from "~/utils/env.server";

export const loader = async ({request}: ActionFunctionArgs) => {
  if (!isLocalEnv) {
    throw new Error("OAuth 2.0 code flyt er kun tilgjengelig ved lokal utvikling")
  }

  let url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") as string | null;

  try {
    await authenticator!.authenticate('entra-id', request)
  } catch (error) {
    if (!returnTo) throw error;
    if (error instanceof Response && isRedirect(error)) {
      error.headers.append(
        "Set-Cookie",
        await returnToCookie!.serialize(returnTo)
      );
      return error;
    }
    throw error;
  }
}

function isRedirect(response: Response) {
  if (response.status < 300 || response.status >= 400) return false;
  return response.headers.has("Location");
}
