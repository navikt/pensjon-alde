import type {LoaderFunctionArgs} from 'react-router'
import {redirect} from 'react-router'
import {authenticator, returnToCookie, sessionStorage} from '~/auth/auth.server'
import {env} from "~/utils/env.server";

export const loader = async ({request}: LoaderFunctionArgs) => {
  if (!env.localDevelopment) {
    throw new Error("OAuth 2.0 code flyt er kun tilgjengelig ved lokal utvikling")
  }

  try {
    let returnTo = (await returnToCookie!.parse(request.headers.get("Cookie"))) ?? "/home";

    let user = await authenticator!.authenticate('entra-id', request)

    let session = await sessionStorage!.getSession(request.headers.get('cookie'))

    session.set('user', user)

    return redirect(returnTo, {
      headers: {'Set-Cookie': await sessionStorage!.commitSession(session)},
    })
  } catch (error) {
    console.error('Feil ved autentisering', error)

    throw error
  }
}
