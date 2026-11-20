const HTML_TYPE = "text/html; charset=utf-8";
const FOUND = 302;

export class HtmlReplies {
    page(html: string, status: number, headers = new Headers()): Response {
        headers.set("content-type", HTML_TYPE);
        return new Response(html, { status, headers });
    }

    redirect(location: string, headers = new Headers()): Response {
        headers.set("location", location);
        return new Response(null, { status: FOUND, headers });
    }
}
